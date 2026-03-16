"""Tests for new features: CM Performance, Change Password, Occupancy Entry (occupied_beds), Properties CM assignment"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

def get_token(email, password):
    r = requests.post(f"{BASE_URL}/api/auth/login", json={"email": email, "password": password})
    if r.status_code == 200:
        return r.json().get("access_token")
    return None

@pytest.fixture(scope="module")
def admin_token():
    token = get_token("dharun@yube1.in", "Qwerty@789")
    if not token:
        pytest.skip("Admin login failed")
    return token

@pytest.fixture(scope="module")
def rogan_token():
    token = get_token("rogan@yube1.in", "Qwerty@123")
    if not token:
        pytest.skip("Rogan login failed")
    return token

@pytest.fixture(scope="module")
def admin_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}"}

@pytest.fixture(scope="module")
def rogan_headers(rogan_token):
    return {"Authorization": f"Bearer {rogan_token}"}

# ── Auth: Login tests ──
class TestLogin:
    def test_dharun_login(self):
        r = requests.post(f"{BASE_URL}/api/auth/login", json={"email": "dharun@yube1.in", "password": "Qwerty@789"})
        assert r.status_code == 200
        data = r.json()
        assert "access_token" in data
        assert data["user"]["role"] == "admin"
        print("PASS: dharun login")

    def test_rogan_login(self):
        r = requests.post(f"{BASE_URL}/api/auth/login", json={"email": "rogan@yube1.in", "password": "Qwerty@123"})
        assert r.status_code == 200
        data = r.json()
        assert "access_token" in data
        assert data["user"]["role"] == "admin"
        print("PASS: rogan login")

# ── CM Performance ──
class TestCMPerformance:
    def test_get_lifetime(self, admin_headers):
        r = requests.get(f"{BASE_URL}/api/performance/cluster-managers", headers=admin_headers)
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        print(f"PASS: CM lifetime - {len(data)} CMs")

    def test_get_monthly(self, admin_headers):
        r = requests.get(f"{BASE_URL}/api/performance/cluster-managers/monthly?year=2026&month=3", headers=admin_headers)
        assert r.status_code == 200
        data = r.json()
        assert "data" in data
        assert isinstance(data["data"], list)
        print(f"PASS: CM monthly - {len(data['data'])} CMs")

# ── Occupancy Entry (occupied_beds) ──
class TestOccupancyEntry:
    def test_get_occupancy(self, admin_headers):
        r = requests.get(f"{BASE_URL}/api/occupancy?date=2026-02-01", headers=admin_headers)
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        assert len(data) > 0
        first = data[0]
        assert "property_id" in first
        assert "total_beds" in first
        print(f"PASS: occupancy get - {len(data)} properties")

    def test_save_bulk_occupied_beds(self, admin_headers):
        r = requests.get(f"{BASE_URL}/api/occupancy?date=2026-01-15", headers=admin_headers)
        assert r.status_code == 200
        props = r.json()
        assert len(props) > 0
        prop = props[0]
        beds = min(50, prop["total_beds"])
        payload = {"date": "2026-01-15", "entries": [{"property_id": prop["property_id"], "occupied_beds": beds}]}
        r2 = requests.post(f"{BASE_URL}/api/occupancy/bulk", json=payload, headers=admin_headers)
        assert r2.status_code == 200
        data = r2.json()
        assert "message" in data or data.get("saved", 1) >= 1
        print(f"PASS: bulk save occupied_beds={beds}")

    def test_occupied_beds_percentage_calculation(self, admin_headers):
        r = requests.get(f"{BASE_URL}/api/occupancy?date=2026-01-15", headers=admin_headers)
        props = r.json()
        prop = next((p for p in props if p.get("occupied_beds") is not None), None)
        if prop:
            expected_pct = round(prop["occupied_beds"] / prop["total_beds"] * 100, 2)
            assert abs(prop.get("occupancy_percentage", 0) - expected_pct) < 0.1
            print(f"PASS: pct calculation {prop['occupied_beds']}/{prop['total_beds']} = {prop['occupancy_percentage']}%")
        else:
            print("SKIP: no occupied_beds data found for date")

# ── Change Password ──
class TestChangePassword:
    def test_wrong_current_password(self, rogan_headers):
        r = requests.put(f"{BASE_URL}/api/auth/change-password",
                         json={"current_password": "WrongPass123", "new_password": "NewPass@456"},
                         headers=rogan_headers)
        assert r.status_code in [400, 401, 422]
        print(f"PASS: wrong current pwd returns {r.status_code}")

    def test_change_password_success(self, rogan_headers):
        r = requests.put(f"{BASE_URL}/api/auth/change-password",
                         json={"current_password": "Qwerty@123", "new_password": "Qwerty@123Temp"},
                         headers=rogan_headers)
        assert r.status_code == 200
        new_token = get_token("rogan@yube1.in", "Qwerty@123Temp")
        assert new_token is not None, "Login with new password failed"
        r2 = requests.put(f"{BASE_URL}/api/auth/change-password",
                          json={"current_password": "Qwerty@123Temp", "new_password": "Qwerty@123"},
                          headers={"Authorization": f"Bearer {new_token}"})
        assert r2.status_code == 200
        print("PASS: change password and revert")

# ── Properties CM assignment ──
class TestPropertiesCM:
    def test_assign_cluster_manager(self, admin_headers):
        r = requests.get(f"{BASE_URL}/api/properties", headers=admin_headers)
        assert r.status_code == 200
        props = r.json()
        assert len(props) > 0
        prop_id = props[0]["id"]
        r2 = requests.get(f"{BASE_URL}/api/users", headers=admin_headers)
        assert r2.status_code == 200
        users = r2.json()
        cms = [u for u in users if u.get("role") == "cluster_manager"]
        if not cms:
            print("SKIP: no CMs available to assign")
            return
        cm_id = cms[0]["id"]
        r3 = requests.put(f"{BASE_URL}/api/properties/{prop_id}/cluster-manager",
                          json={"cm_id": cm_id}, headers=admin_headers)
        assert r3.status_code in [200, 201, 204]
        print(f"PASS: CM assigned to property {prop_id}")
