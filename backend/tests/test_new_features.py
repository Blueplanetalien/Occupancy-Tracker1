"""Tests for new features: Property Performance, Property Detail, YoY comparison"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

def login():
    res = requests.post(f"{BASE_URL}/api/auth/login", json={"email": "dharun@yube1.in", "password": "Qwerty@789"})
    if res.status_code == 200:
        return res.json().get("access_token")
    return None

@pytest.fixture(scope="module")
def auth_headers():
    token = login()
    if not token:
        pytest.skip("Login failed")
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}

class TestPropertyPerformance:
    """GET /api/performance/properties - leaderboard of all properties"""

    def test_returns_200(self, auth_headers):
        res = requests.get(f"{BASE_URL}/api/performance/properties", headers=auth_headers)
        assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text[:200]}"

    def test_returns_34_properties(self, auth_headers):
        res = requests.get(f"{BASE_URL}/api/performance/properties", headers=auth_headers)
        data = res.json()
        assert isinstance(data, list), "Response should be a list"
        assert len(data) == 34, f"Expected 34 properties, got {len(data)}"

    def test_properties_sorted_by_all_time_avg(self, auth_headers):
        res = requests.get(f"{BASE_URL}/api/performance/properties", headers=auth_headers)
        data = res.json()
        avgs = [p.get('all_time_avg', 0) for p in data]
        # Check descending order (properties with data first)
        tracked = [p for p in data if p.get('total_days_tracked', 0) > 0]
        if len(tracked) > 1:
            for i in range(len(tracked) - 1):
                assert tracked[i]['all_time_avg'] >= tracked[i+1]['all_time_avg'], "Properties should be sorted descending by all_time_avg"
        print(f"PASS: {len(data)} properties, top avg: {avgs[0] if avgs else 'N/A'}%")

    def test_property_fields(self, auth_headers):
        res = requests.get(f"{BASE_URL}/api/performance/properties", headers=auth_headers)
        data = res.json()
        assert len(data) > 0
        prop = data[0]
        for field in ['property_id', 'property_name', 'total_beds', 'all_time_avg', 'current_month_avg', 'total_days_tracked', 'trend']:
            assert field in prop, f"Missing field: {field}"
        print(f"PASS: All required fields present in property: {prop['property_name']}")


class TestPropertyDetail:
    """GET /api/performance/properties/{id} - heatmap + monthly data"""

    def get_first_property_id(self, auth_headers):
        res = requests.get(f"{BASE_URL}/api/performance/properties", headers=auth_headers)
        return res.json()[0]['property_id']

    def test_returns_200(self, auth_headers):
        pid = self.get_first_property_id(auth_headers)
        res = requests.get(f"{BASE_URL}/api/performance/properties/{pid}?year=2026", headers=auth_headers)
        assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text[:200]}"

    def test_response_structure(self, auth_headers):
        pid = self.get_first_property_id(auth_headers)
        res = requests.get(f"{BASE_URL}/api/performance/properties/{pid}?year=2026", headers=auth_headers)
        data = res.json()
        for field in ['property', 'heatmap', 'monthly_averages', 'assignment_history', 'all_time_avg', 'total_days_tracked']:
            assert field in data, f"Missing field: {field}"
        print(f"PASS: Property detail structure correct for {data['property']['name']}")

    def test_heatmap_is_dict(self, auth_headers):
        pid = self.get_first_property_id(auth_headers)
        res = requests.get(f"{BASE_URL}/api/performance/properties/{pid}?year=2026", headers=auth_headers)
        data = res.json()
        assert isinstance(data['heatmap'], dict), "heatmap should be a dict"
        print(f"PASS: Heatmap is dict with {len(data['heatmap'])} entries")

    def test_monthly_averages_has_12_months(self, auth_headers):
        pid = self.get_first_property_id(auth_headers)
        res = requests.get(f"{BASE_URL}/api/performance/properties/{pid}?year=2026", headers=auth_headers)
        data = res.json()
        assert len(data['monthly_averages']) == 12, f"Expected 12 monthly entries, got {len(data['monthly_averages'])}"
        m = data['monthly_averages'][0]
        for field in ['month', 'month_name', 'avg_occupancy', 'days_with_data']:
            assert field in m, f"Missing field in monthly_averages: {field}"
        print("PASS: 12 monthly average entries with correct structure")

    def test_property_sub_object(self, auth_headers):
        pid = self.get_first_property_id(auth_headers)
        res = requests.get(f"{BASE_URL}/api/performance/properties/{pid}?year=2026", headers=auth_headers)
        data = res.json()
        prop = data['property']
        for field in ['name', 'total_beds']:
            assert field in prop, f"Missing field in property sub-object: {field}"

    def test_404_for_invalid_id(self, auth_headers):
        res = requests.get(f"{BASE_URL}/api/performance/properties/invalid_fake_id_12345?year=2026", headers=auth_headers)
        assert res.status_code == 404, f"Expected 404, got {res.status_code}"
        print("PASS: Invalid property ID returns 404")


class TestTrendComparison:
    """GET /api/reports/trend-comparison?year=2026"""

    def test_returns_200(self, auth_headers):
        res = requests.get(f"{BASE_URL}/api/reports/trend-comparison?year=2026", headers=auth_headers)
        assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text[:200]}"

    def test_response_structure(self, auth_headers):
        res = requests.get(f"{BASE_URL}/api/reports/trend-comparison?year=2026", headers=auth_headers)
        data = res.json()
        assert 'comparison' in data, "Response should have 'comparison' key"
        assert isinstance(data['comparison'], list), "comparison should be a list"
        assert len(data['comparison']) == 12, f"Expected 12 months, got {len(data['comparison'])}"
        print(f"PASS: Trend comparison has {len(data['comparison'])} months")

    def test_comparison_fields(self, auth_headers):
        res = requests.get(f"{BASE_URL}/api/reports/trend-comparison?year=2026", headers=auth_headers)
        data = res.json()
        m = data['comparison'][0]
        for field in ['month', 'month_name', 'y2025', 'y2026']:
            assert field in m, f"Missing field: {field}"
        print(f"PASS: Comparison fields present. Jan 2025: {m.get('y2025')}, Jan 2026: {m.get('y2026')}")
