import requests
import sys
from datetime import datetime
import json

class ItalianCommunityAPITester:
    def __init__(self, base_url="https://members-hub-7.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.session = requests.Session()
        self.tests_run = 0
        self.tests_passed = 0
        self.admin_user_id = None
        self.test_user_id = None
        self.test_post_id = None

    def run_test(self, name, method, endpoint, expected_status, data=None, params=None):
        """Run a single API test"""
        url = f"{self.api_url}/{endpoint}"
        
        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        
        try:
            if method == 'GET':
                response = self.session.get(url, params=params)
            elif method == 'POST':
                response = self.session.post(url, json=data)
            elif method == 'PUT':
                response = self.session.put(url, json=data)
            elif method == 'DELETE':
                response = self.session.delete(url)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    return success, response.json()
                except:
                    return success, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    error_detail = response.json()
                    print(f"   Error: {error_detail}")
                except:
                    print(f"   Response: {response.text}")
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_login_admin(self):
        """Test admin login"""
        success, response = self.run_test(
            "Admin Login",
            "POST",
            "auth/login",
            200,
            data={"username": "admin", "password": "admin"}
        )
        if success and 'id' in response:
            self.admin_user_id = response['id']
            print(f"   Admin user ID: {self.admin_user_id}")
            return True
        return False

    def test_get_current_user(self):
        """Test getting current user info"""
        success, response = self.run_test(
            "Get Current User",
            "GET",
            "auth/me",
            200
        )
        return success and response.get('username') == 'admin' and response.get('is_admin') == True

    def test_create_user(self):
        """Test creating a new user"""
        test_username = f"testuser_{datetime.now().strftime('%H%M%S')}"
        success, response = self.run_test(
            "Create User",
            "POST",
            "users",
            200,
            data={"username": test_username, "password": "testpass123"}
        )
        if success and 'id' in response:
            self.test_user_id = response['id']
            print(f"   Created user ID: {self.test_user_id}")
            return True
        return False

    def test_get_users(self):
        """Test getting all users"""
        success, response = self.run_test(
            "Get Users List",
            "GET",
            "users",
            200
        )
        return success and isinstance(response, list) and len(response) >= 2

    def test_change_user_password(self):
        """Test changing user password"""
        if not self.test_user_id:
            print("❌ No test user ID available for password change")
            return False
            
        success, response = self.run_test(
            "Change User Password",
            "PUT",
            f"users/{self.test_user_id}/password",
            200,
            data={"new_password": "newpass123"}
        )
        return success

    def test_create_post(self):
        """Test creating a post"""
        success, response = self.run_test(
            "Create Post",
            "POST",
            "posts",
            200,
            data={"content": "Questo è un post di test per la community italiana!"}
        )
        if success and 'id' in response:
            self.test_post_id = response['id']
            print(f"   Created post ID: {self.test_post_id}")
            return True
        return False

    def test_get_posts(self):
        """Test getting all posts"""
        success, response = self.run_test(
            "Get Posts",
            "GET",
            "posts",
            200
        )
        return success and isinstance(response, list)

    def test_search_posts(self):
        """Test searching posts"""
        success, response = self.run_test(
            "Search Posts",
            "GET",
            "posts/search",
            200,
            params={"q": "test"}
        )
        return success and isinstance(response, list)

    def test_get_user_posts(self):
        """Test getting posts by user"""
        success, response = self.run_test(
            "Get User Posts",
            "GET",
            f"posts/user/{self.admin_user_id}",
            200
        )
        return success and isinstance(response, list)

    def test_delete_post(self):
        """Test deleting a post"""
        if not self.test_post_id:
            print("❌ No test post ID available for deletion")
            return False
            
        success, response = self.run_test(
            "Delete Post",
            "DELETE",
            f"posts/{self.test_post_id}",
            200
        )
        return success

    def test_delete_user(self):
        """Test deleting a user"""
        if not self.test_user_id:
            print("❌ No test user ID available for deletion")
            return False
            
        success, response = self.run_test(
            "Delete User",
            "DELETE",
            f"users/{self.test_user_id}",
            200
        )
        return success

    def test_logout(self):
        """Test logout"""
        success, response = self.run_test(
            "Logout",
            "POST",
            "auth/logout",
            200
        )
        return success

    def test_unauthorized_access(self):
        """Test accessing protected endpoints without authentication"""
        # Clear session cookies
        self.session.cookies.clear()
        
        success, response = self.run_test(
            "Unauthorized Access to Posts",
            "GET",
            "posts",
            401
        )
        return success

def main():
    print("🚀 Starting Italian Community API Tests")
    print("=" * 50)
    
    tester = ItalianCommunityAPITester()
    
    # Test sequence
    tests = [
        ("Admin Login", tester.test_login_admin),
        ("Get Current User", tester.test_get_current_user),
        ("Create User", tester.test_create_user),
        ("Get Users List", tester.test_get_users),
        ("Change User Password", tester.test_change_user_password),
        ("Create Post", tester.test_create_post),
        ("Get Posts", tester.test_get_posts),
        ("Search Posts", tester.test_search_posts),
        ("Get User Posts", tester.test_get_user_posts),
        ("Delete Post", tester.test_delete_post),
        ("Delete User", tester.test_delete_user),
        ("Logout", tester.test_logout),
        ("Unauthorized Access", tester.test_unauthorized_access),
    ]
    
    failed_tests = []
    
    for test_name, test_func in tests:
        try:
            if not test_func():
                failed_tests.append(test_name)
        except Exception as e:
            print(f"❌ {test_name} - Exception: {str(e)}")
            failed_tests.append(test_name)
    
    # Print results
    print("\n" + "=" * 50)
    print(f"📊 Test Results: {tester.tests_passed}/{tester.tests_run} passed")
    
    if failed_tests:
        print(f"❌ Failed tests: {', '.join(failed_tests)}")
        return 1
    else:
        print("✅ All tests passed!")
        return 0

if __name__ == "__main__":
    sys.exit(main())