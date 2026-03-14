"""Backend API tests for Yube1 Stays Occupancy Dashboard"""
import pytest
import requests
import os
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
TODAY = datetime.now().strftime("%Y-%m-%d")
NOW = datetime.now()

# ============ AUTH TESTS ============

class TestAuth:
    """Authentication endpoint tests"""

    def test_login_admin_success(self):
        resp = requests.post(f"{BASE_URL}/api/auth/login", json={"email": "dharun@yube1.in", "password": "Qwerty@789"})
        assert resp.status_code == 200, f"Login failed: {resp.text}"
        data = resp.json()
        assert "access_token" in data
        assert data["user"]["role"] == "admin"
        assert data["user"]["email"] == "dharun@yube1.in"

    def test_login_wrong_password(self):
        resp = requests.post(f"{BASE_URL}/api/auth/login", json={"email": "dharun@yube1.in", "password": "wrongpass"})
        assert resp.status_code == 401

    def test_login_unknown_user(self):
        resp = requests.post(f"{BASE_URL}/api/auth/login", json={"email": "unknown@test.com", "password": "pass"})
        assert resp.status_code == 401

    def test_get_me(self, admin_token):
        resp = requests.get(f"{BASE_URL}/api/auth/me", headers={"Authorization": f"Bearer {admin_token}"})
        assert resp.status_code == 200
        assert resp.json()["role"] == "admin"

    def test_no_token_rejected(self):
        resp = requests.get(f"{BASE_URL}/api/properties")
        assert resp.status_code == 403


# ============ PROPERTIES TESTS ============

class TestProperties:
    """Properties endpoint tests"""

    def test_get_properties(self, admin_token):
        resp = requests.get(f"{BASE_URL}/api/properties", headers={"Authorization": f"Bearer {admin_token}"})
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) == 34, f"Expected 34 properties, got {len(data)}"

    def test_sarovar_assigned_to_bene(self, admin_token):
        resp = requests.get(f"{BASE_URL}/api/properties", headers={"Authorization": f"Bearer {admin_token}"})
        props = resp.json()
        sarovar = next((p for p in props if "Sarovar" in p["name"]), None)
        assert sarovar is not None, "Sarovar property not found"
        assert sarovar["current_manager"] is not None
        assert sarovar["current_manager"]["name"] == "Bene", f"Expected Bene, got {sarovar['current_manager']}"

    def test_transit_assigned_to_abdul(self, admin_token):
        resp = requests.get(f"{BASE_URL}/api/properties", headers={"Authorization": f"Bearer {admin_token}"})
        props = resp.json()
        transit = next((p for p in props if "Transit" in p["name"]), None)
        assert transit is not None, "Transit property not found"
        assert transit["current_manager"] is not None
        assert transit["current_manager"]["name"] == "Abdul", f"Expected Abdul, got {transit['current_manager']}"


# ============ DASHBOARD ============

class TestDashboard:
    """Dashboard overview endpoint"""

    def test_dashboard_overview(self, admin_token):
        resp = requests.get(f"{BASE_URL}/api/dashboard/overview", headers={"Authorization": f"Bearer {admin_token}"})
        assert resp.status_code == 200
        data = resp.json()
        assert data["total_properties"] == 34
        assert "total_beds" in data
        assert "today_occupancy_percentage" in data
        assert "reporting_today" in data
        assert "trend" in data


# ============ OCCUPANCY ============

class TestOccupancy:
    """Occupancy entry tests"""

    def test_get_occupancy(self, admin_token):
        resp = requests.get(f"{BASE_URL}/api/occupancy?date={TODAY}", headers={"Authorization": f"Bearer {admin_token}"})
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) == 34

    def test_save_bulk_occupancy(self, admin_token):
        resp = requests.get(f"{BASE_URL}/api/occupancy?date={TODAY}", headers={"Authorization": f"Bearer {admin_token}"})
        props = resp.json()
        entries = [{"property_id": p["property_id"], "occupancy_percentage": 75} for p in props[:3]]
        save_resp = requests.post(f"{BASE_URL}/api/occupancy/bulk",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"date": TODAY, "entries": entries})
        assert save_resp.status_code == 200
        assert "Saved" in save_resp.json()["message"]

    def test_cluster_manager_cannot_save_occupancy(self, cm_token):
        resp = requests.post(f"{BASE_URL}/api/occupancy/bulk",
            headers={"Authorization": f"Bearer {cm_token}"},
            json={"date": TODAY, "entries": []})
        assert resp.status_code == 403


# ============ REPORTS ============

class TestReports:
    """Report endpoints"""

    def test_daily_report(self, admin_token):
        resp = requests.get(f"{BASE_URL}/api/reports/daily?date={TODAY}", headers={"Authorization": f"Bearer {admin_token}"})
        assert resp.status_code == 200
        data = resp.json()
        assert "total_beds" in data
        assert "properties" in data
        assert len(data["properties"]) == 34

    def test_monthly_report(self, admin_token):
        resp = requests.get(f"{BASE_URL}/api/reports/monthly?year={NOW.year}&month={NOW.month}",
            headers={"Authorization": f"Bearer {admin_token}"})
        assert resp.status_code == 200
        data = resp.json()
        assert "month_name" in data
        assert "properties" in data

    def test_performance_managers(self, admin_token):
        resp = requests.get(f"{BASE_URL}/api/performance/managers", headers={"Authorization": f"Bearer {admin_token}"})
        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data, list)
        assert len(data) > 0


# ============ USER MANAGEMENT ============

class TestUserManagement:
    """User management tests"""

    def test_get_users_admin(self, admin_token):
        resp = requests.get(f"{BASE_URL}/api/users", headers={"Authorization": f"Bearer {admin_token}"})
        assert resp.status_code == 200

    def test_get_users_cluster_manager_forbidden(self, cm_token):
        resp = requests.get(f"{BASE_URL}/api/users", headers={"Authorization": f"Bearer {cm_token}"})
        assert resp.status_code == 403

    def test_create_and_delete_user(self, admin_token):
        # Create
        resp = requests.post(f"{BASE_URL}/api/users",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"email": "TEST_cm_api@test.com", "password": "Test@1234", "name": "TEST CM API"})
        assert resp.status_code == 200
        user_id = resp.json()["id"]
        # Delete
        del_resp = requests.delete(f"{BASE_URL}/api/users/{user_id}", headers={"Authorization": f"Bearer {admin_token}"})
        assert del_resp.status_code == 200


# ============ FIXTURES ============

@pytest.fixture(scope="session")
def admin_token():
    resp = requests.post(f"{BASE_URL}/api/auth/login", json={"email": "dharun@yube1.in", "password": "Qwerty@789"})
    if resp.status_code != 200:
        pytest.skip("Admin login failed")
    return resp.json()["access_token"]

@pytest.fixture(scope="session")
def cm_token():
    """Create a cluster manager user and return token"""
    # Login as admin first
    admin_resp = requests.post(f"{BASE_URL}/api/auth/login", json={"email": "dharun@yube1.in", "password": "Qwerty@789"})
    if admin_resp.status_code != 200:
        pytest.skip("Admin login failed")
    admin_tok = admin_resp.json()["access_token"]

    # Create CM user
    create_resp = requests.post(f"{BASE_URL}/api/users",
        headers={"Authorization": f"Bearer {admin_tok}"},
        json={"email": "TEST_cm_session@test.com", "password": "Test@1234", "name": "TEST Session CM"})
    
    if create_resp.status_code not in (200, 400):  # 400 means already exists
        pytest.skip("Could not create CM user")

    # Login as CM
    cm_resp = requests.post(f"{BASE_URL}/api/auth/login", json={"email": "TEST_cm_session@test.com", "password": "Test@1234"})
    if cm_resp.status_code != 200:
        pytest.skip("CM login failed")
    return cm_resp.json()["access_token"]
