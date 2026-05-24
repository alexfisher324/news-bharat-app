#!/usr/bin/env python3
"""
Backend API Tests for THE BHARAT News App
Tests all backend endpoints as specified in the review request
"""

import requests
import json
import sys
from typing import Dict, Any

# Backend URL from environment
BACKEND_URL = "https://news-bharat-2.preview.emergentagent.com/api"

# Test results tracking
test_results = {
    "passed": [],
    "failed": [],
    "total": 0
}

def print_test_header(test_name: str):
    """Print test header"""
    print(f"\n{'='*80}")
    print(f"TEST: {test_name}")
    print(f"{'='*80}")

def print_result(success: bool, message: str, details: Any = None):
    """Print test result"""
    status = "✅ PASS" if success else "❌ FAIL"
    print(f"{status}: {message}")
    if details:
        print(f"Details: {json.dumps(details, indent=2)}")
    return success

def test_news_fetching():
    """Test 1: News Fetching"""
    print_test_header("Test News Fetching - GET /api/news")
    
    try:
        # Test with default parameters
        url = f"{BACKEND_URL}/news?language=english&state=National&limit=10"
        print(f"Request URL: {url}")
        
        response = requests.get(url, timeout=30)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code != 200:
            return print_result(False, f"Expected status 200, got {response.status_code}", response.text)
        
        data = response.json()
        
        # Verify response structure
        if "news" not in data:
            return print_result(False, "Response missing 'news' field", data)
        
        if "total" not in data:
            return print_result(False, "Response missing 'total' field", data)
        
        # Verify news items structure
        if len(data["news"]) > 0:
            news_item = data["news"][0]
            required_fields = ["id", "title", "description", "content", "language", "state"]
            missing_fields = [field for field in required_fields if field not in news_item]
            
            if missing_fields:
                return print_result(False, f"News item missing fields: {missing_fields}", news_item)
        
        return print_result(True, f"News fetching works! Got {len(data['news'])} news items, total: {data['total']}", 
                          {"sample_news": data["news"][0] if data["news"] else None})
    
    except Exception as e:
        return print_result(False, f"Exception occurred: {str(e)}")

def test_ads_fetching():
    """Test 2: Ads Fetching"""
    print_test_header("Test Ads Fetching - GET /api/ads")
    
    try:
        url = f"{BACKEND_URL}/ads"
        print(f"Request URL: {url}")
        
        response = requests.get(url, timeout=30)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code != 200:
            return print_result(False, f"Expected status 200, got {response.status_code}", response.text)
        
        data = response.json()
        
        if "ads" not in data:
            return print_result(False, "Response missing 'ads' field", data)
        
        if not isinstance(data["ads"], list):
            return print_result(False, "Ads field is not an array", data)
        
        return print_result(True, f"Ads fetching works! Got {len(data['ads'])} ads", data)
    
    except Exception as e:
        return print_result(False, f"Exception occurred: {str(e)}")

def test_admin_login_success():
    """Test 3a: Admin Login - Success"""
    print_test_header("Test Admin Login (Success) - POST /api/admin/login")
    
    try:
        url = f"{BACKEND_URL}/admin/login"
        payload = {"password": "sunil@123"}
        print(f"Request URL: {url}")
        print(f"Payload: {payload}")
        
        response = requests.post(url, json=payload, timeout=30)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code != 200:
            return print_result(False, f"Expected status 200, got {response.status_code}", response.text)
        
        data = response.json()
        
        if not data.get("success"):
            return print_result(False, "Login did not return success=true", data)
        
        if "message" not in data:
            return print_result(False, "Response missing 'message' field", data)
        
        return print_result(True, "Admin login successful!", data)
    
    except Exception as e:
        return print_result(False, f"Exception occurred: {str(e)}")

def test_admin_login_failure():
    """Test 3b: Admin Login - Failure"""
    print_test_header("Test Admin Login (Failure) - POST /api/admin/login")
    
    try:
        url = f"{BACKEND_URL}/admin/login"
        payload = {"password": "wrongpassword"}
        print(f"Request URL: {url}")
        print(f"Payload: {payload}")
        
        response = requests.post(url, json=payload, timeout=30)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code != 401:
            return print_result(False, f"Expected status 401 for wrong password, got {response.status_code}", response.text)
        
        return print_result(True, "Admin login correctly rejects wrong password with 401", response.json())
    
    except Exception as e:
        return print_result(False, f"Exception occurred: {str(e)}")

def test_create_ad():
    """Test 4: Create Ad"""
    print_test_header("Test Create Ad - POST /api/admin/ads")
    
    try:
        url = f"{BACKEND_URL}/admin/ads"
        payload = {
            "title": "Test Ad 1",
            "media": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
            "mediaType": "image",
            "position": 1,
            "duration": 3600
        }
        print(f"Request URL: {url}")
        print(f"Payload: {json.dumps(payload, indent=2)}")
        
        response = requests.post(url, json=payload, timeout=30)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code != 200:
            return print_result(False, f"Expected status 200, got {response.status_code}", response.text)
        
        data = response.json()
        
        if not data.get("success"):
            return print_result(False, "Ad creation did not return success=true", data)
        
        if "id" not in data:
            return print_result(False, "Response missing 'id' field", data)
        
        # Verify ad was created by fetching ads
        ads_response = requests.get(f"{BACKEND_URL}/ads", timeout=30)
        ads_data = ads_response.json()
        
        ad_found = any(ad.get("id") == data["id"] for ad in ads_data.get("ads", []))
        
        if not ad_found:
            return print_result(False, "Ad was not found in ads list after creation", data)
        
        return print_result(True, f"Ad created successfully with id: {data['id']}", data)
    
    except Exception as e:
        return print_result(False, f"Exception occurred: {str(e)}")

def test_create_news():
    """Test 5: Create News"""
    print_test_header("Test Create News - POST /api/admin/news")
    
    try:
        url = f"{BACKEND_URL}/admin/news"
        payload = {
            "title": "Breaking: Test News Article",
            "description": "This is a test news description",
            "content": "This is the full content of the test news article for THE BHARAT app.",
            "language": "english",
            "state": "National"
        }
        print(f"Request URL: {url}")
        print(f"Payload: {json.dumps(payload, indent=2)}")
        
        response = requests.post(url, json=payload, timeout=30)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code != 200:
            return print_result(False, f"Expected status 200, got {response.status_code}", response.text)
        
        data = response.json()
        
        if not data.get("success"):
            return print_result(False, "News creation did not return success=true", data)
        
        if "id" not in data:
            return print_result(False, "Response missing 'id' field", data)
        
        # Verify news was created by fetching news list
        news_response = requests.get(f"{BACKEND_URL}/news?language=english&state=National&limit=100", timeout=30)
        news_data = news_response.json()
        
        news_found = any(news.get("id") == data["id"] for news in news_data.get("news", []))
        
        if not news_found:
            return print_result(False, "News was not found in news list after creation", data)
        
        return print_result(True, f"News created successfully with id: {data['id']}", data)
    
    except Exception as e:
        return print_result(False, f"Exception occurred: {str(e)}")

def test_state_filter():
    """Test 6: State Filter"""
    print_test_header("Test State Filter - GET /api/news?state=International")
    
    try:
        url = f"{BACKEND_URL}/news?language=english&state=International&limit=10"
        print(f"Request URL: {url}")
        
        response = requests.get(url, timeout=30)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code != 200:
            return print_result(False, f"Expected status 200, got {response.status_code}", response.text)
        
        data = response.json()
        
        if "news" not in data:
            return print_result(False, "Response missing 'news' field", data)
        
        # Check if news items have correct state
        if len(data["news"]) > 0:
            for news_item in data["news"]:
                if news_item.get("state") != "International":
                    return print_result(False, f"News item has wrong state: {news_item.get('state')}", news_item)
        
        return print_result(True, f"State filter works! Got {len(data['news'])} international news items", 
                          {"total": data["total"], "sample": data["news"][0] if data["news"] else None})
    
    except Exception as e:
        return print_result(False, f"Exception occurred: {str(e)}")

def test_language_filter():
    """Test 7: Language Filter"""
    print_test_header("Test Language Filter - GET /api/news?language=hindi")
    
    try:
        url = f"{BACKEND_URL}/news?language=hindi&state=National&limit=10"
        print(f"Request URL: {url}")
        
        response = requests.get(url, timeout=30)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code != 200:
            return print_result(False, f"Expected status 200, got {response.status_code}", response.text)
        
        data = response.json()
        
        if "news" not in data:
            return print_result(False, "Response missing 'news' field", data)
        
        # Check if news items have correct language
        if len(data["news"]) > 0:
            for news_item in data["news"]:
                if news_item.get("language") != "hindi":
                    return print_result(False, f"News item has wrong language: {news_item.get('language')}", news_item)
        
        return print_result(True, f"Language filter works! Got {len(data['news'])} Hindi news items", 
                          {"total": data["total"], "sample": data["news"][0] if data["news"] else None})
    
    except Exception as e:
        return print_result(False, f"Exception occurred: {str(e)}")

def test_states_list():
    """Test 8: States List"""
    print_test_header("Test States List - GET /api/states")
    
    try:
        url = f"{BACKEND_URL}/states"
        print(f"Request URL: {url}")
        
        response = requests.get(url, timeout=30)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code != 200:
            return print_result(False, f"Expected status 200, got {response.status_code}", response.text)
        
        data = response.json()
        
        if "states" not in data:
            return print_result(False, "Response missing 'states' field", data)
        
        if not isinstance(data["states"], list):
            return print_result(False, "States field is not an array", data)
        
        if len(data["states"]) < 36:
            return print_result(False, f"Expected at least 36 states, got {len(data['states'])}", data)
        
        return print_result(True, f"States list works! Got {len(data['states'])} states/UTs", 
                          {"count": len(data["states"]), "sample": data["states"][:5]})
    
    except Exception as e:
        return print_result(False, f"Exception occurred: {str(e)}")

def test_languages_list():
    """Test 9: Languages List"""
    print_test_header("Test Languages List - GET /api/languages")
    
    try:
        url = f"{BACKEND_URL}/languages"
        print(f"Request URL: {url}")
        
        response = requests.get(url, timeout=30)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code != 200:
            return print_result(False, f"Expected status 200, got {response.status_code}", response.text)
        
        data = response.json()
        
        if "languages" not in data:
            return print_result(False, "Response missing 'languages' field", data)
        
        if not isinstance(data["languages"], list):
            return print_result(False, "Languages field is not an array", data)
        
        if len(data["languages"]) == 0:
            return print_result(False, "Languages list is empty", data)
        
        return print_result(True, f"Languages list works! Got {len(data['languages'])} languages", data)
    
    except Exception as e:
        return print_result(False, f"Exception occurred: {str(e)}")

def run_all_tests():
    """Run all tests"""
    print("\n" + "="*80)
    print("STARTING BACKEND API TESTS FOR THE BHARAT NEWS APP")
    print("="*80)
    print(f"Backend URL: {BACKEND_URL}")
    
    tests = [
        ("News Fetching", test_news_fetching),
        ("Ads Fetching", test_ads_fetching),
        ("Admin Login (Success)", test_admin_login_success),
        ("Admin Login (Failure)", test_admin_login_failure),
        ("Create Ad", test_create_ad),
        ("Create News", test_create_news),
        ("State Filter", test_state_filter),
        ("Language Filter", test_language_filter),
        ("States List", test_states_list),
        ("Languages List", test_languages_list),
    ]
    
    for test_name, test_func in tests:
        test_results["total"] += 1
        try:
            result = test_func()
            if result:
                test_results["passed"].append(test_name)
            else:
                test_results["failed"].append(test_name)
        except Exception as e:
            print(f"❌ FAIL: {test_name} - Unexpected error: {str(e)}")
            test_results["failed"].append(test_name)
    
    # Print summary
    print("\n" + "="*80)
    print("TEST SUMMARY")
    print("="*80)
    print(f"Total Tests: {test_results['total']}")
    print(f"Passed: {len(test_results['passed'])} ✅")
    print(f"Failed: {len(test_results['failed'])} ❌")
    
    if test_results["passed"]:
        print("\n✅ PASSED TESTS:")
        for test in test_results["passed"]:
            print(f"  - {test}")
    
    if test_results["failed"]:
        print("\n❌ FAILED TESTS:")
        for test in test_results["failed"]:
            print(f"  - {test}")
    
    print("\n" + "="*80)
    
    # Return exit code
    return 0 if len(test_results["failed"]) == 0 else 1

if __name__ == "__main__":
    exit_code = run_all_tests()
    sys.exit(exit_code)
