"""Backend API tests for THE BHARAT admin panel + news/ads endpoints."""
import os
import pytest
import requests

BASE_URL = os.environ.get("EXPO_PUBLIC_BACKEND_URL", "https://news-bharat-2.preview.emergentagent.com").rstrip("/")
ADMIN_PASSWORD = "sunil@123"

# Tiny base64 PNG (1x1 transparent)
TINY_IMAGE_B64 = (
    "data:image/png;base64,"
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII="
)


@pytest.fixture(scope="module")
def api():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


# -------- Health / public --------
class TestPublic:
    def test_root(self, api):
        r = api.get(f"{BASE_URL}/api/")
        assert r.status_code == 200
        assert "BHARAT" in r.json().get("message", "")

    def test_states(self, api):
        r = api.get(f"{BASE_URL}/api/states")
        assert r.status_code == 200
        assert "National" in r.json()["states"]

    def test_languages(self, api):
        r = api.get(f"{BASE_URL}/api/languages")
        assert r.status_code == 200
        assert "english" in r.json()["languages"]

    def test_get_news(self, api):
        r = api.get(f"{BASE_URL}/api/news?language=english&state=National&limit=10")
        assert r.status_code == 200
        body = r.json()
        assert "news" in body and "total" in body
        assert isinstance(body["news"], list)

    def test_get_ads(self, api):
        r = api.get(f"{BASE_URL}/api/ads")
        assert r.status_code == 200
        assert "ads" in r.json()


# -------- Admin login --------
class TestAdminLogin:
    def test_login_success(self, api):
        r = api.post(f"{BASE_URL}/api/admin/login", json={"password": ADMIN_PASSWORD})
        assert r.status_code == 200
        assert r.json()["success"] is True

    def test_login_invalid(self, api):
        r = api.post(f"{BASE_URL}/api/admin/login", json={"password": "wrong"})
        assert r.status_code == 401


# -------- Admin News + Ad CRUD --------
class TestAdminContent:
    created_news_id = None
    created_ad_id = None

    def test_create_admin_news(self, api):
        payload = {
            "title": "TEST_ADMIN_NEWS_TITLE",
            "description": "TEST_ADMIN_NEWS_DESC",
            "content": "TEST content body",
            "imageUrl": TINY_IMAGE_B64,
            "language": "english",
            "state": "National",
        }
        r = api.post(f"{BASE_URL}/api/admin/news", json=payload)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["success"] is True
        assert "id" in data
        TestAdminContent.created_news_id = data["id"]

    def test_admin_news_appears_in_feed_first(self, api):
        # Verify persistence and ordering: isAdminNews should sort to top
        r = api.get(f"{BASE_URL}/api/news?language=english&state=National&limit=50")
        assert r.status_code == 200
        items = r.json()["news"]
        assert any(n["id"] == TestAdminContent.created_news_id for n in items), \
            "Newly created admin news not found in feed"
        # top item should be admin news
        assert items[0].get("isAdminNews") is True, "Admin news not sorted to top"
        assert items[0]["title"] == "TEST_ADMIN_NEWS_TITLE"

    def test_create_ad(self, api):
        payload = {
            "title": "TEST_AD_TITLE",
            "media": TINY_IMAGE_B64,
            "mediaType": "image",
            "position": 1,
            "duration": 3600,
        }
        r = api.post(f"{BASE_URL}/api/admin/ads", json=payload)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["success"] is True
        TestAdminContent.created_ad_id = data["id"]

    def test_ad_appears_in_ads_list(self, api):
        r = api.get(f"{BASE_URL}/api/ads")
        assert r.status_code == 200
        ids = [a["id"] for a in r.json()["ads"]]
        assert TestAdminContent.created_ad_id in ids

    def test_create_news_missing_required_fields(self, api):
        # Missing description/content -> 422
        r = api.post(f"{BASE_URL}/api/admin/news", json={"title": "only"})
        assert r.status_code in (400, 422)

    def test_create_ad_missing_required_fields(self, api):
        r = api.post(f"{BASE_URL}/api/admin/ads", json={"title": "only"})
        assert r.status_code in (400, 422)

    def test_cleanup_news(self, api):
        if TestAdminContent.created_news_id:
            r = api.delete(f"{BASE_URL}/api/admin/news/{TestAdminContent.created_news_id}")
            assert r.status_code == 200

    def test_cleanup_ad(self, api):
        if TestAdminContent.created_ad_id:
            r = api.delete(f"{BASE_URL}/api/admin/ads/{TestAdminContent.created_ad_id}")
            assert r.status_code == 200
