from fastapi import FastAPI, APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import calendar
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
from passlib.context import CryptContext
from jose import jwt as jose_jwt, JWTError

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

SECRET_KEY = os.environ.get('SECRET_KEY', 'yube1-stays-2024-secret-key')
ALGORITHM = "HS256"

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()

app = FastAPI()
api_router = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


# ======================== MODELS ========================

class LoginRequest(BaseModel):
    email: str
    password: str

class CreateUserRequest(BaseModel):
    email: str
    password: str
    name: str

class UpdateUserRequest(BaseModel):
    name: Optional[str] = None
    password: Optional[str] = None

class BulkOccupancyRequest(BaseModel):
    date: str
    entries: List[dict]  # [{property_id, occupancy_percentage}]

class AssignManagerRequest(BaseModel):
    manager_id: str
    property_id: str
    start_date: str
    end_current: bool = True

class CreateManagerRequest(BaseModel):
    name: str
    phone: str

class UpdatePropertyRequest(BaseModel):
    total_beds: Optional[int] = None
    is_active: Optional[bool] = None
    name: Optional[str] = None


# ======================== AUTH HELPERS ========================

def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(hours=24)
    to_encode["exp"] = expire
    return jose_jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jose_jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")
        user = await db.users.find_one({"id": user_id}, {"_id": 0, "password_hash": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

async def require_admin(current_user=Depends(get_current_user)):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user


# ======================== AUTH ENDPOINTS ========================

@api_router.post("/auth/login")
async def login(request: LoginRequest):
    user = await db.users.find_one({"email": request.email})
    if not user or not pwd_context.verify(request.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    token = create_access_token({"sub": user["id"]})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {"id": user["id"], "email": user["email"], "name": user["name"], "role": user["role"]}
    }

@api_router.get("/auth/me")
async def get_me(current_user=Depends(get_current_user)):
    return current_user


# ======================== PROPERTIES ========================

@api_router.get("/properties")
async def get_properties(current_user=Depends(get_current_user)):
    properties = await db.properties.find({}, {"_id": 0}).sort("name", 1).to_list(1000)
    for prop in properties:
        assignment = await db.assignments.find_one({"property_id": prop["id"], "end_date": None}, {"_id": 0})
        if assignment:
            manager = await db.managers.find_one({"id": assignment["manager_id"]}, {"_id": 0})
            prop["current_manager"] = manager
            prop["assignment_id"] = assignment["id"]
            prop["assignment_start"] = assignment["start_date"]
        else:
            prop["current_manager"] = None
    return properties

@api_router.put("/properties/{property_id}")
async def update_property(property_id: str, request: UpdatePropertyRequest, current_user=Depends(require_admin)):
    update_data = {k: v for k, v in request.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")
    result = await db.properties.update_one({"id": property_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Property not found")
    return {"message": "Property updated"}


# ======================== MANAGERS ========================

@api_router.get("/managers")
async def get_managers(current_user=Depends(get_current_user)):
    managers = await db.managers.find({}, {"_id": 0}).sort("name", 1).to_list(1000)
    for manager in managers:
        current_assignments = await db.assignments.find(
            {"manager_id": manager["id"], "end_date": None}, {"_id": 0}
        ).to_list(100)
        properties = []
        for a in current_assignments:
            prop = await db.properties.find_one({"id": a["property_id"]}, {"_id": 0})
            if prop:
                properties.append({"id": prop["id"], "name": prop["name"], "total_beds": prop["total_beds"]})
        manager["current_properties"] = properties
    return managers

@api_router.post("/managers")
async def create_manager(request: CreateManagerRequest, current_user=Depends(require_admin)):
    manager = {
        "id": str(uuid.uuid4()),
        "name": request.name,
        "phone": request.phone,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.managers.insert_one(manager)
    manager.pop("_id", None)
    return manager

@api_router.put("/managers/{manager_id}")
async def update_manager(manager_id: str, request: CreateManagerRequest, current_user=Depends(require_admin)):
    await db.managers.update_one({"id": manager_id}, {"$set": {"name": request.name, "phone": request.phone}})
    return {"message": "Manager updated"}

@api_router.get("/managers/{manager_id}/assignments")
async def get_manager_assignments(manager_id: str, current_user=Depends(get_current_user)):
    assignments = await db.assignments.find({"manager_id": manager_id}, {"_id": 0}).sort("start_date", -1).to_list(100)
    for a in assignments:
        prop = await db.properties.find_one({"id": a["property_id"]}, {"_id": 0})
        if prop:
            a["property_name"] = prop["name"]
            a["total_beds"] = prop["total_beds"]
    return assignments


# ======================== ASSIGNMENTS ========================

@api_router.post("/assignments")
async def create_assignment(request: AssignManagerRequest, current_user=Depends(require_admin)):
    if request.end_current:
        today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        await db.assignments.update_many(
            {"property_id": request.property_id, "end_date": None},
            {"$set": {"end_date": today}}
        )
    assignment = {
        "id": str(uuid.uuid4()),
        "manager_id": request.manager_id,
        "property_id": request.property_id,
        "start_date": request.start_date,
        "end_date": None,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.assignments.insert_one(assignment)
    assignment.pop("_id", None)
    return assignment


# ======================== OCCUPANCY ========================

@api_router.get("/occupancy")
async def get_occupancy(date: str, current_user=Depends(get_current_user)):
    properties = await db.properties.find({"is_active": True}, {"_id": 0}).sort("name", 1).to_list(1000)
    result = []
    for prop in properties:
        entry = await db.occupancy.find_one({"property_id": prop["id"], "date": date}, {"_id": 0})
        assignment = await db.assignments.find_one({"property_id": prop["id"], "end_date": None}, {"_id": 0})
        manager_name = None
        if assignment:
            manager = await db.managers.find_one({"id": assignment["manager_id"]}, {"_id": 0})
            if manager:
                manager_name = manager["name"]
        result.append({
            "property_id": prop["id"],
            "property_name": prop["name"],
            "total_beds": prop["total_beds"],
            "manager_name": manager_name,
            "occupancy_percentage": entry["occupancy_percentage"] if entry else None,
            "occupied_beds": entry["occupied_beds"] if entry else None,
            "entry_id": entry["id"] if entry else None
        })
    return result

@api_router.post("/occupancy/bulk")
async def save_bulk_occupancy(request: BulkOccupancyRequest, current_user=Depends(require_admin)):
    saved = 0
    for entry_data in request.entries:
        property_id = entry_data.get("property_id")
        occupancy_pct = float(entry_data.get("occupancy_percentage", 0))
        if not property_id:
            continue
        prop = await db.properties.find_one({"id": property_id}, {"_id": 0})
        if not prop:
            continue
        if occupancy_pct < 0 or occupancy_pct > 100:
            continue
        occupied_beds = round(prop["total_beds"] * occupancy_pct / 100)
        existing = await db.occupancy.find_one({"property_id": property_id, "date": request.date})
        if existing:
            await db.occupancy.update_one(
                {"property_id": property_id, "date": request.date},
                {"$set": {
                    "occupancy_percentage": occupancy_pct,
                    "occupied_beds": occupied_beds,
                    "recorded_by": current_user["id"],
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }}
            )
        else:
            await db.occupancy.insert_one({
                "id": str(uuid.uuid4()),
                "property_id": property_id,
                "date": request.date,
                "occupancy_percentage": occupancy_pct,
                "occupied_beds": occupied_beds,
                "total_beds_at_time": prop["total_beds"],
                "recorded_by": current_user["id"],
                "created_at": datetime.now(timezone.utc).isoformat()
            })
        saved += 1
    return {"message": f"Saved {saved} entries for {request.date}"}


# ======================== REPORTS ========================

@api_router.get("/reports/daily")
async def get_daily_report(date: str, current_user=Depends(get_current_user)):
    properties = await db.properties.find({"is_active": True}, {"_id": 0}).sort("name", 1).to_list(1000)
    property_data = []
    total_beds = 0
    total_occupied = 0

    for prop in properties:
        entry = await db.occupancy.find_one({"property_id": prop["id"], "date": date}, {"_id": 0})
        assignment = await db.assignments.find_one({"property_id": prop["id"], "end_date": None}, {"_id": 0})
        manager_name = None
        if assignment:
            manager = await db.managers.find_one({"id": assignment["manager_id"]}, {"_id": 0})
            if manager:
                manager_name = manager["name"]
        occupied = entry["occupied_beds"] if entry else 0
        occ_pct = entry["occupancy_percentage"] if entry else 0
        property_data.append({
            "property_id": prop["id"],
            "property_name": prop["name"],
            "total_beds": prop["total_beds"],
            "manager_name": manager_name,
            "occupancy_percentage": occ_pct,
            "occupied_beds": occupied,
            "has_entry": entry is not None
        })
        total_beds += prop["total_beds"]
        if entry:
            total_occupied += occupied

    reporting_count = sum(1 for p in property_data if p["has_entry"])
    overall_occ = (total_occupied / total_beds * 100) if total_beds > 0 and reporting_count > 0 else 0
    return {
        "date": date,
        "total_beds": total_beds,
        "total_occupied": total_occupied,
        "overall_occupancy_percentage": round(overall_occ, 2),
        "reporting_properties": reporting_count,
        "total_properties": len(properties),
        "properties": property_data
    }

@api_router.get("/reports/monthly")
async def get_monthly_report(year: int, month: int, current_user=Depends(get_current_user)):
    _, days_in_month = calendar.monthrange(year, month)
    month_str = f"{year}-{month:02d}"
    entries = await db.occupancy.find({"date": {"$regex": f"^{month_str}"}}, {"_id": 0}).to_list(10000)
    properties = await db.properties.find({"is_active": True}, {"_id": 0}).to_list(1000)
    total_beds = sum(p["total_beds"] for p in properties)

    entries_by_date = {}
    for entry in entries:
        d = entry["date"]
        entries_by_date.setdefault(d, []).append(entry)

    daily_trend_list = []
    for d in sorted(entries_by_date.keys()):
        day_entries = entries_by_date[d]
        total_occ = sum(e["occupied_beds"] for e in day_entries)
        occ_pct = round(total_occ / total_beds * 100, 2) if total_beds > 0 else 0
        daily_trend_list.append({"date": d, "occupancy": occ_pct, "day": int(d.split("-")[2])})

    entries_by_property = {}
    for entry in entries:
        entries_by_property.setdefault(entry["property_id"], []).append(entry)

    property_summary = []
    for prop in properties:
        prop_entries = entries_by_property.get(prop["id"], [])
        assignment = await db.assignments.find_one({"property_id": prop["id"], "end_date": None}, {"_id": 0})
        manager_name = None
        if assignment:
            manager = await db.managers.find_one({"id": assignment["manager_id"]}, {"_id": 0})
            if manager:
                manager_name = manager["name"]
        avg_occ = sum(e["occupancy_percentage"] for e in prop_entries) / len(prop_entries) if prop_entries else 0
        property_summary.append({
            "property_id": prop["id"],
            "property_name": prop["name"],
            "total_beds": prop["total_beds"],
            "manager_name": manager_name,
            "avg_occupancy_percentage": round(avg_occ, 2),
            "days_with_data": len(prop_entries)
        })

    overall_avg = 0
    if entries_by_date:
        day_avgs = [sum(e["occupied_beds"] for e in v) / total_beds * 100 if total_beds > 0 else 0 for v in entries_by_date.values()]
        overall_avg = sum(day_avgs) / len(day_avgs)

    return {
        "year": year, "month": month,
        "month_name": calendar.month_name[month],
        "days_in_month": days_in_month,
        "total_beds": total_beds,
        "overall_avg_occupancy": round(overall_avg, 2),
        "days_with_data": len(entries_by_date),
        "daily_trend": daily_trend_list,
        "properties": property_summary
    }

@api_router.get("/reports/yearly-trend")
async def get_yearly_trend(year: int, current_user=Depends(get_current_user)):
    properties = await db.properties.find({"is_active": True}, {"_id": 0}).to_list(1000)
    total_beds = sum(p["total_beds"] for p in properties)
    monthly_data = []
    for month in range(1, 13):
        month_str = f"{year}-{month:02d}"
        entries = await db.occupancy.find({"date": {"$regex": f"^{month_str}"}}, {"_id": 0}).to_list(10000)
        avg = 0
        if entries:
            entries_by_date = {}
            for e in entries:
                entries_by_date.setdefault(e["date"], []).append(e)
            day_avgs = [sum(ev["occupied_beds"] for ev in v) / total_beds * 100 if total_beds > 0 else 0 for v in entries_by_date.values()]
            avg = sum(day_avgs) / len(day_avgs) if day_avgs else 0
        monthly_data.append({"month": month, "month_name": calendar.month_abbr[month], "avg_occupancy": round(avg, 2)})
    return {"year": year, "monthly_trend": monthly_data}

@api_router.get("/dashboard/overview")
async def get_dashboard_overview(current_user=Depends(get_current_user)):
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    properties = await db.properties.find({"is_active": True}, {"_id": 0}).to_list(1000)
    total_beds = sum(p["total_beds"] for p in properties)

    # Today's data
    today_entries = await db.occupancy.find({"date": today}, {"_id": 0}).to_list(1000)
    today_occupied = sum(e["occupied_beds"] for e in today_entries)
    today_occ_pct = round(today_occupied / total_beds * 100, 2) if total_beds > 0 and today_entries else 0

    # Last 30 days trend
    trend = []
    for i in range(29, -1, -1):
        d = (datetime.now(timezone.utc) - timedelta(days=i)).strftime("%Y-%m-%d")
        day_entries = await db.occupancy.find({"date": d}, {"_id": 0}).to_list(1000)
        if day_entries:
            occ = sum(e["occupied_beds"] for e in day_entries) / total_beds * 100 if total_beds > 0 else 0
            trend.append({"date": d, "occupancy": round(occ, 2), "day": d[8:]})
        else:
            trend.append({"date": d, "occupancy": None, "day": d[8:]})

    return {
        "total_properties": len(properties),
        "total_beds": total_beds,
        "today_occupancy_percentage": today_occ_pct,
        "today_occupied_beds": today_occupied,
        "reporting_today": len(today_entries),
        "trend": trend
    }


# ======================== PM PERFORMANCE ========================

@api_router.get("/performance/managers")
async def get_managers_performance(current_user=Depends(get_current_user)):
    managers = await db.managers.find({}, {"_id": 0}).sort("name", 1).to_list(1000)
    result = []
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")

    for manager in managers:
        assignments = await db.assignments.find({"manager_id": manager["id"]}, {"_id": 0}).to_list(100)
        if not assignments:
            continue

        total_weighted = 0
        total_days = 0
        property_performance = []

        for assignment in assignments:
            prop = await db.properties.find_one({"id": assignment["property_id"]}, {"_id": 0})
            if not prop:
                continue
            start = assignment["start_date"]
            end = assignment["end_date"] or today
            entries = await db.occupancy.find(
                {"property_id": assignment["property_id"], "date": {"$gte": start, "$lte": end}}, {"_id": 0}
            ).to_list(10000)
            prop_avg = sum(e["occupancy_percentage"] for e in entries) / len(entries) if entries else 0
            total_weighted += prop_avg * len(entries)
            total_days += len(entries)
            property_performance.append({
                "property_id": prop["id"],
                "property_name": prop["name"],
                "total_beds": prop["total_beds"],
                "start_date": start,
                "end_date": assignment["end_date"],
                "is_current": assignment["end_date"] is None,
                "days_with_data": len(entries),
                "avg_occupancy": round(prop_avg, 2)
            })

        lifetime_avg = total_weighted / total_days if total_days > 0 else 0
        current_props = [p["property_name"] for p in property_performance if p["is_current"]]

        result.append({
            "manager_id": manager["id"],
            "manager_name": manager["name"],
            "manager_phone": manager["phone"],
            "current_properties": current_props,
            "properties_count": len(current_props),
            "lifetime_avg_occupancy": round(lifetime_avg, 2),
            "total_days_tracked": total_days,
            "property_performance": property_performance
        })

    result.sort(key=lambda x: x["lifetime_avg_occupancy"], reverse=True)
    return result

@api_router.get("/performance/managers/{manager_id}")
async def get_manager_performance(manager_id: str, current_user=Depends(get_current_user)):
    manager = await db.managers.find_one({"id": manager_id}, {"_id": 0})
    if not manager:
        raise HTTPException(status_code=404, detail="Manager not found")
    assignments = await db.assignments.find({"manager_id": manager_id}, {"_id": 0}).sort("start_date", -1).to_list(100)
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    detailed = []
    total_days = 0
    total_weighted = 0
    for a in assignments:
        prop = await db.properties.find_one({"id": a["property_id"]}, {"_id": 0})
        if not prop:
            continue
        start = a["start_date"]
        end = a["end_date"] or today
        entries = await db.occupancy.find(
            {"property_id": a["property_id"], "date": {"$gte": start, "$lte": end}}, {"_id": 0}
        ).to_list(10000)
        avg_occ = sum(e["occupancy_percentage"] for e in entries) / len(entries) if entries else 0
        total_weighted += avg_occ * len(entries)
        total_days += len(entries)
        detailed.append({
            "property_name": prop["name"],
            "total_beds": prop["total_beds"],
            "start_date": start,
            "end_date": a["end_date"],
            "is_current": a["end_date"] is None,
            "days_with_data": len(entries),
            "avg_occupancy": round(avg_occ, 2)
        })
    lifetime_avg = total_weighted / total_days if total_days > 0 else 0
    return {"manager": manager, "lifetime_avg_occupancy": round(lifetime_avg, 2), "total_days_tracked": total_days, "assignments": detailed}


# ======================== USER MANAGEMENT ========================

@api_router.get("/users")
async def get_users(current_user=Depends(require_admin)):
    users = await db.users.find({"role": "cluster_manager"}, {"_id": 0, "password_hash": 0}).to_list(1000)
    return users

@api_router.post("/users")
async def create_user(request: CreateUserRequest, current_user=Depends(require_admin)):
    existing = await db.users.find_one({"email": request.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already exists")
    user = {
        "id": str(uuid.uuid4()),
        "email": request.email,
        "password_hash": pwd_context.hash(request.password),
        "name": request.name,
        "role": "cluster_manager",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(user)
    return {"id": user["id"], "email": user["email"], "name": user["name"], "role": user["role"], "created_at": user["created_at"]}

@api_router.put("/users/{user_id}")
async def update_user(user_id: str, request: UpdateUserRequest, current_user=Depends(require_admin)):
    update_data = {}
    if request.name:
        update_data["name"] = request.name
    if request.password:
        update_data["password_hash"] = pwd_context.hash(request.password)
    if update_data:
        await db.users.update_one({"id": user_id}, {"$set": update_data})
    return {"message": "User updated"}

@api_router.delete("/users/{user_id}")
async def delete_user(user_id: str, current_user=Depends(require_admin)):
    result = await db.users.delete_one({"id": user_id, "role": "cluster_manager"})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    return {"message": "User deleted"}


# ======================== ALERTS ========================

@api_router.get("/alerts/low-occupancy")
async def get_low_occupancy_alerts(threshold: int = 50, current_user=Depends(get_current_user)):
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    properties = await db.properties.find({"is_active": True}, {"_id": 0}).to_list(1000)

    low_today = []
    not_reported = []
    consecutive_low = []

    for prop in properties:
        entry = await db.occupancy.find_one({"property_id": prop["id"], "date": today}, {"_id": 0})
        assignment = await db.assignments.find_one({"property_id": prop["id"], "end_date": None}, {"_id": 0})
        manager_name = None
        if assignment:
            manager = await db.managers.find_one({"id": assignment["manager_id"]}, {"_id": 0})
            if manager:
                manager_name = manager["name"]

        if entry:
            if entry["occupancy_percentage"] < threshold:
                low_today.append({
                    "property_id": prop["id"],
                    "property_name": prop["name"],
                    "total_beds": prop["total_beds"],
                    "manager_name": manager_name,
                    "occupancy_percentage": entry["occupancy_percentage"],
                    "occupied_beds": entry["occupied_beds"]
                })
        else:
            not_reported.append({
                "property_id": prop["id"],
                "property_name": prop["name"],
                "total_beds": prop["total_beds"],
                "manager_name": manager_name
            })

        # Check 3 consecutive days below threshold (exclude today)
        days_low = 0
        total_occ = 0
        for i in range(1, 4):
            d = (datetime.now(timezone.utc) - timedelta(days=i)).strftime("%Y-%m-%d")
            e = await db.occupancy.find_one({"property_id": prop["id"], "date": d}, {"_id": 0})
            if e and e["occupancy_percentage"] < threshold:
                days_low += 1
                total_occ += e["occupancy_percentage"]
            else:
                break  # streak broken

        if days_low >= 3:
            consecutive_low.append({
                "property_id": prop["id"],
                "property_name": prop["name"],
                "total_beds": prop["total_beds"],
                "manager_name": manager_name,
                "consecutive_days": days_low,
                "avg_occupancy": round(total_occ / days_low, 2)
            })

    return {
        "date": today,
        "threshold": threshold,
        "low_today": low_today,
        "not_reported_today": not_reported,
        "consecutive_low": consecutive_low,
        "total_alerts": len(low_today) + len(consecutive_low)
    }


# ======================== SEED DATA ========================

PROPERTIES_SEED = [
    {"name": "Yube1 Alpha League", "total_beds": 87, "manager_name": "Nagarjun", "manager_phone": "9361379912"},
    {"name": "Yube1 Aura League", "total_beds": 57, "manager_name": "Murali", "manager_phone": "9786535597"},
    {"name": "Yube1 Campus View", "total_beds": 40, "manager_name": "Tharshan", "manager_phone": "9976789128"},
    {"name": "Yube1 Capital League", "total_beds": 101, "manager_name": "Udhayan", "manager_phone": "8098244940"},
    {"name": "Yube1 Castle", "total_beds": 32, "manager_name": "Vignesh", "manager_phone": "7339367327"},
    {"name": "Yube1 Continental League", "total_beds": 116, "manager_name": "Samaran", "manager_phone": "6374127672"},
    {"name": "Yube1 Empire League", "total_beds": 85, "manager_name": "Bene", "manager_phone": "7867961331"},
    {"name": "Yube1 Glory", "total_beds": 46, "manager_name": "Chaudhary", "manager_phone": "9361590437"},
    {"name": "Yube1 Greenhouse", "total_beds": 334, "manager_name": "Subash", "manager_phone": "8940595565"},
    {"name": "Yube1 Haven", "total_beds": 25, "manager_name": "Surya", "manager_phone": "8608985225"},
    {"name": "Yube1 Lakshmi", "total_beds": 30, "manager_name": "Gopal", "manager_phone": "9585344653"},
    {"name": "Yube1 Liberty League", "total_beds": 63, "manager_name": "Rajasekar", "manager_phone": "7390704386"},
    {"name": "Yube1 Madras League", "total_beds": 118, "manager_name": "Manikandan", "manager_phone": "99432232125"},
    {"name": "Yube1 Meadows 1", "total_beds": 49, "manager_name": "Udhayan", "manager_phone": "8098244940"},
    {"name": "Yube1 Meadows 2", "total_beds": 38, "manager_name": "Udhayan", "manager_phone": "8098244940"},
    {"name": "Yube1 Metro", "total_beds": 32, "manager_name": "Avinash", "manager_phone": "7095343443"},
    {"name": "Yube1 Millennial Campus", "total_beds": 61, "manager_name": "Nowfel", "manager_phone": "9789251686"},
    {"name": "Yube1 Premier League", "total_beds": 80, "manager_name": "Sathish", "manager_phone": "7845280633"},
    {"name": "Yube1 Prodigy", "total_beds": 106, "manager_name": "Abilash", "manager_phone": "8220638528"},
    {"name": "Yube1 Pushkar", "total_beds": 38, "manager_name": "Charan", "manager_phone": "9600123908"},
    {"name": "Yube1 Sarmani", "total_beds": 56, "manager_name": "Dhanush", "manager_phone": "9361836651"},
    {"name": "Yube1 Sarovar", "total_beds": 20, "manager_name": "Bene", "manager_phone": "7867961331"},
    {"name": "Yube1 Serenity", "total_beds": 50, "manager_name": "Anitha", "manager_phone": "9551667141"},
    {"name": "Yube1 Sigma League", "total_beds": 118, "manager_name": "Gopi", "manager_phone": "6380459580"},
    {"name": "Yube1 Temple Tower", "total_beds": 95, "manager_name": "Kesava Raman", "manager_phone": "9047842180"},
    {"name": "Yube1 Tranquil", "total_beds": 38, "manager_name": "Arun", "manager_phone": "6385681614"},
    {"name": "Yube1 Transit", "total_beds": 39, "manager_name": "Abdul", "manager_phone": "8124786154"},
    {"name": "Yube1 Tyro Campus", "total_beds": 47, "manager_name": "Sarath Kumar", "manager_phone": "6384435801"},
    {"name": "Yube1 United League", "total_beds": 107, "manager_name": "Thirumalai", "manager_phone": "63838671049"},
    {"name": "Yube1 Uptown", "total_beds": 39, "manager_name": "Vijay", "manager_phone": "9365063141"},
    {"name": "Yube1 Urban Square", "total_beds": 44, "manager_name": "Vijay", "manager_phone": "8525843041"},
    {"name": "Yube1 Villas", "total_beds": 43, "manager_name": "Pravin", "manager_phone": "8838619887"},
    {"name": "Yube1 Vintage League", "total_beds": 45, "manager_name": "Venkatesh", "manager_phone": "8220965475"},
    {"name": "Yube1 Zen League", "total_beds": 136, "manager_name": "Anto", "manager_phone": "9942279305"},
]

async def seed_database():
    existing = await db.properties.count_documents({})
    if existing > 0:
        logger.info("Database already seeded, skipping")
        return
    logger.info("Seeding database...")
    admin_hash = pwd_context.hash("Qwerty@789")
    await db.users.insert_one({
        "id": str(uuid.uuid4()), "email": "dharun@yube1.in",
        "password_hash": admin_hash, "name": "Dharun", "role": "admin",
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    manager_map = {}
    for prop_data in PROPERTIES_SEED:
        key = f"{prop_data['manager_name']}_{prop_data['manager_phone']}"
        if key not in manager_map:
            mid = str(uuid.uuid4())
            await db.managers.insert_one({
                "id": mid, "name": prop_data["manager_name"],
                "phone": prop_data["manager_phone"],
                "created_at": datetime.now(timezone.utc).isoformat()
            })
            manager_map[key] = mid
        prop_id = str(uuid.uuid4())
        await db.properties.insert_one({
            "id": prop_id, "name": prop_data["name"],
            "total_beds": prop_data["total_beds"], "is_active": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        await db.assignments.insert_one({
            "id": str(uuid.uuid4()), "manager_id": manager_map[key],
            "property_id": prop_id, "start_date": "2024-01-01",
            "end_date": None, "created_at": datetime.now(timezone.utc).isoformat()
        })
    logger.info(f"Seeded {len(PROPERTIES_SEED)} properties, {len(manager_map)} managers")


# ======================== APP LIFECYCLE ========================

app.include_router(api_router)
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup():
    await seed_database()

@app.on_event("shutdown")
async def shutdown():
    client.close()
