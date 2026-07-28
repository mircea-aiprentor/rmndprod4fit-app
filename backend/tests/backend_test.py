"""Backend tests for Panou Antrenor (ElvisPro Cut)."""
import os
import io
import uuid
import time
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://antrenor-upgrade.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

DEMO_EMAIL = "antrenor@elvisprocut.ro"
DEMO_PASS = "Antrenor2025!"


@pytest.fixture(scope="session")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="session")
def demo_token(session):
    r = session.post(f"{API}/auth/login", json={"email": DEMO_EMAIL, "password": DEMO_PASS})
    assert r.status_code == 200, f"Demo login failed: {r.status_code} {r.text}"
    return r.json()["token"]


@pytest.fixture(scope="session")
def auth_headers(demo_token):
    return {"Authorization": f"Bearer {demo_token}"}


# ---------------- Auth ----------------
class TestAuth:
    def test_root(self, session):
        r = session.get(f"{API}/")
        assert r.status_code == 200

    def test_register_new(self, session):
        email = f"test_{uuid.uuid4().hex[:10]}@example.com"
        r = session.post(f"{API}/auth/register", json={"name": "Test User", "email": email, "password": "pass1234"})
        assert r.status_code == 200, r.text
        d = r.json()
        assert "token" in d and d["user"]["email"] == email
        assert d["user"]["role"] == "coach"

    def test_login_demo(self, session):
        r = session.post(f"{API}/auth/login", json={"email": DEMO_EMAIL, "password": DEMO_PASS})
        assert r.status_code == 200
        assert r.json()["user"]["email"] == DEMO_EMAIL

    def test_login_wrong_pass(self, session):
        r = session.post(f"{API}/auth/login", json={"email": DEMO_EMAIL, "password": "wrong-xxxx"})
        assert r.status_code == 401

    def test_me(self, session, auth_headers):
        r = session.get(f"{API}/auth/me", headers=auth_headers)
        assert r.status_code == 200
        assert r.json()["user"]["email"] == DEMO_EMAIL

    def test_me_no_token(self, session):
        r = requests.get(f"{API}/auth/me")
        assert r.status_code == 401


# ---------------- Plans ----------------
class TestPlans:
    def test_list_plans(self, session):
        r = session.get(f"{API}/plans")
        assert r.status_code == 200
        plans = r.json()
        assert len(plans) == 3
        by_key = {p["lookup_key"]: p for p in plans}
        for k in ("coach_monthly", "coach_plus_monthly", "gym_studio_monthly"):
            assert k in by_key
        # Amount check (should be 89/339/799 RON)
        expected = {"coach_monthly": 89, "coach_plus_monthly": 339, "gym_studio_monthly": 799}
        for k, exp in expected.items():
            amt = by_key[k].get("amount")
            assert amt == exp, f"{k} amount={amt} expected={exp}"


# ---------------- Upload & Projects ----------------
class TestProjectsFlow:
    project_id = None
    storage_path = None

    def test_upload(self, session, auth_headers):
        files = {"file": ("dummy.mp4", io.BytesIO(b"\x00\x00\x00\x18ftypmp42" + b"0" * 2048), "video/mp4")}
        r = requests.post(f"{API}/upload", headers=auth_headers, files=files, timeout=60)
        assert r.status_code == 200, r.text
        d = r.json()
        assert "storage_path" in d
        TestProjectsFlow.storage_path = d["storage_path"]

    def test_create_project(self, session, auth_headers):
        assert TestProjectsFlow.storage_path
        data = {
            "title": "TEST_Video_Antrenament",
            "theme": "Forta",
            "notes": "Test notes",
            "storage_path": TestProjectsFlow.storage_path,
            "filename": "dummy.mp4",
            "size": "2056",
        }
        r = requests.post(f"{API}/projects", headers=auth_headers, data=data, timeout=30)
        assert r.status_code == 200, r.text
        proj = r.json()
        assert proj["title"] == "TEST_Video_Antrenament"
        assert proj["status"] == "uploaded"
        assert proj.get("size") == 2056
        assert "_id" not in proj
        TestProjectsFlow.project_id = proj["id"]

    def test_list_projects(self, session, auth_headers):
        r = session.get(f"{API}/projects", headers=auth_headers)
        assert r.status_code == 200
        arr = r.json()
        assert any(p["id"] == TestProjectsFlow.project_id for p in arr)

    def test_get_project(self, session, auth_headers):
        r = session.get(f"{API}/projects/{TestProjectsFlow.project_id}", headers=auth_headers)
        assert r.status_code == 200
        assert r.json()["id"] == TestProjectsFlow.project_id

    def test_generate_plan(self, session, auth_headers):
        r = requests.post(f"{API}/projects/{TestProjectsFlow.project_id}/generate-plan",
                          headers=auth_headers, timeout=90)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["status"] == "review"
        plan = d.get("plan") or {}
        for f in ("hook", "subtitles", "caption", "cta", "hashtags", "music_theme", "suggested_cuts"):
            assert f in plan, f"missing plan field {f}"
        assert isinstance(plan["hashtags"], list)
        assert isinstance(plan["suggested_cuts"], list)

    def test_update_plan(self, session, auth_headers):
        r = session.put(f"{API}/projects/{TestProjectsFlow.project_id}/plan",
                        headers=auth_headers,
                        json={"hook": "TEST hook updated"})
        assert r.status_code == 200
        # verify persisted
        g = session.get(f"{API}/projects/{TestProjectsFlow.project_id}", headers=auth_headers)
        assert g.json()["plan"]["hook"] == "TEST hook updated"

    def test_approve(self, session, auth_headers):
        r = session.post(f"{API}/projects/{TestProjectsFlow.project_id}/approve", headers=auth_headers)
        assert r.status_code == 200
        g = session.get(f"{API}/projects/{TestProjectsFlow.project_id}", headers=auth_headers)
        assert g.json()["status"] == "approved"

    def test_delete(self, session, auth_headers):
        r = session.delete(f"{API}/projects/{TestProjectsFlow.project_id}", headers=auth_headers)
        assert r.status_code == 200
        g = session.get(f"{API}/projects/{TestProjectsFlow.project_id}", headers=auth_headers)
        assert g.status_code == 404


# ---------------- Mode selector (prompt vs subtitle) ----------------
class TestGenerateModes:
    """Verify ?mode=subtitle and ?mode=prompt produce correct plan shapes and persist mode."""

    def _upload_and_create(self, auth_headers, title):
        files = {"file": ("dummy.mp4", io.BytesIO(b"\x00\x00\x00\x18ftypmp42" + b"0" * 2048), "video/mp4")}
        r = requests.post(f"{API}/upload", headers=auth_headers, files=files, timeout=60)
        assert r.status_code == 200, r.text
        sp = r.json()["storage_path"]
        data = {"title": title, "theme": "Forta", "notes": "test",
                "storage_path": sp, "filename": "dummy.mp4", "size": "2056"}
        r = requests.post(f"{API}/projects", headers=auth_headers, data=data, timeout=30)
        assert r.status_code == 200
        return r.json()["id"]

    def test_generate_subtitle_mode(self, auth_headers):
        pid = self._upload_and_create(auth_headers, "TEST_Subtitle_Mode")
        try:
            r = requests.post(f"{API}/projects/{pid}/generate-plan?mode=subtitle",
                              headers=auth_headers, timeout=90)
            assert r.status_code == 200, r.text
            d = r.json()
            assert d["status"] == "review"
            assert d.get("mode") == "subtitle"
            plan = d.get("plan") or {}
            # subtitle mode: must have subtitles + subtitle_segments
            assert "subtitles" in plan
            assert "subtitle_segments" in plan
            assert isinstance(plan["subtitle_segments"], list)
            assert len(plan["subtitle_segments"]) > 0
            # subtitle mode: MUST NOT include hook/caption/cta/hashtags
            for banned in ("hook", "caption", "cta", "hashtags"):
                assert banned not in plan or not plan.get(banned), (
                    f"subtitle mode plan should NOT contain '{banned}' but got: {plan.get(banned)!r}"
                )
        finally:
            requests.delete(f"{API}/projects/{pid}", headers=auth_headers)

    def test_generate_prompt_mode(self, auth_headers):
        pid = self._upload_and_create(auth_headers, "TEST_Prompt_Mode")
        try:
            r = requests.post(f"{API}/projects/{pid}/generate-plan?mode=prompt",
                              headers=auth_headers, timeout=90)
            assert r.status_code == 200, r.text
            d = r.json()
            assert d.get("mode") == "prompt"
            plan = d.get("plan") or {}
            for f in ("hook", "caption", "cta", "hashtags", "subtitles", "subtitle_segments"):
                assert f in plan and plan[f], f"prompt mode missing '{f}'"
        finally:
            requests.delete(f"{API}/projects/{pid}", headers=auth_headers)


# ---------------- Create-time mode form field ----------------
class TestCreateModeFormField:
    """New: POST /api/projects accepts 'mode' form field and stores it on the project."""

    def _upload(self, auth_headers):
        files = {"file": ("dummy.mp4", io.BytesIO(b"\x00\x00\x00\x18ftypmp42" + b"0" * 1024), "video/mp4")}
        r = requests.post(f"{API}/upload", headers=auth_headers, files=files, timeout=60)
        assert r.status_code == 200
        return r.json()["storage_path"]

    def _create(self, auth_headers, mode_value):
        sp = self._upload(auth_headers)
        data = {"title": f"TEST_UploadMode_{mode_value or 'none'}", "theme": "General",
                "notes": "", "storage_path": sp, "filename": "dummy.mp4", "size": "1032"}
        if mode_value is not None:
            data["mode"] = mode_value
        r = requests.post(f"{API}/projects", headers=auth_headers, data=data, timeout=30)
        return r

    def test_create_with_subtitle_mode(self, auth_headers):
        r = self._create(auth_headers, "subtitle")
        assert r.status_code == 200, r.text
        proj = r.json()
        pid = proj["id"]
        try:
            assert proj.get("mode") == "subtitle"
            # verify persisted via GET
            g = requests.get(f"{API}/projects/{pid}", headers=auth_headers, timeout=30)
            assert g.status_code == 200
            assert g.json().get("mode") == "subtitle"
        finally:
            requests.delete(f"{API}/projects/{pid}", headers=auth_headers)

    def test_create_with_prompt_mode(self, auth_headers):
        r = self._create(auth_headers, "prompt")
        assert r.status_code == 200
        proj = r.json()
        pid = proj["id"]
        try:
            assert proj.get("mode") == "prompt"
        finally:
            requests.delete(f"{API}/projects/{pid}", headers=auth_headers)

    def test_create_default_mode_is_prompt(self, auth_headers):
        r = self._create(auth_headers, None)
        assert r.status_code == 200
        proj = r.json()
        pid = proj["id"]
        try:
            assert proj.get("mode") == "prompt", f"default should be prompt, got {proj.get('mode')!r}"
        finally:
            requests.delete(f"{API}/projects/{pid}", headers=auth_headers)

    def test_create_invalid_mode_falls_back_to_prompt(self, auth_headers):
        r = self._create(auth_headers, "bogus_mode")
        assert r.status_code == 200
        proj = r.json()
        pid = proj["id"]
        try:
            assert proj.get("mode") == "prompt"
        finally:
            requests.delete(f"{API}/projects/{pid}", headers=auth_headers)


# ---------------- Dashboard ----------------
class TestDashboard:
    def test_stats(self, session, auth_headers):
        r = session.get(f"{API}/dashboard/stats", headers=auth_headers)
        assert r.status_code == 200
        d = r.json()
        for k in ("total_projects", "this_month", "approved", "quota", "quota_used",
                  "credits_remaining", "storage_bytes", "storage_gb_limit", "time_saved_min"):
            assert k in d, f"missing dashboard field: {k}"
        assert isinstance(d["credits_remaining"], int)
        assert isinstance(d["storage_bytes"], int)
        assert d["storage_gb_limit"] == 25


# ---------------- Billing ----------------
class TestCheckout:
    def test_checkout_coach_monthly(self, session, auth_headers):
        r = session.post(f"{API}/payments/checkout",
                         headers=auth_headers,
                         json={"lookup_key": "coach_monthly", "origin_url": BASE_URL})
        assert r.status_code == 200, r.text
        d = r.json()
        assert d.get("checkout_url", "").startswith("http")
        assert d.get("session_id", "").startswith("cs_")
