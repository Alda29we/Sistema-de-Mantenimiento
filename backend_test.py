import requests
import sys
import json
from datetime import datetime, timedelta

class EquipmentMaintenanceAPITester:
    def __init__(self, base_url="https://user-login-excel.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.admin_token = None
        self.user_token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.created_user_id = None
        self.created_equipment_id = None

    def run_test(self, name, method, endpoint, expected_status, data=None, token=None, files=None):
        """Run a single API test"""
        url = f"{self.api_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        if token:
            headers['Authorization'] = f'Bearer {token}'

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers)
            elif method == 'POST':
                if files:
                    del headers['Content-Type']  # Let requests set it for multipart
                    response = requests.post(url, json=data, headers=headers, files=files)
                else:
                    response = requests.post(url, json=data, headers=headers)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    return success, response.json() if response.content else {}
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

    def test_admin_login(self):
        """Test admin login"""
        success, response = self.run_test(
            "Admin Login",
            "POST",
            "login",
            200,
            data={"username": "admin", "password": "admin123"}
        )
        if success and 'access_token' in response:
            self.admin_token = response['access_token']
            print(f"   Admin user: {response['user']['full_name']} (Role: {response['user']['role']})")
            return True
        return False

    def test_user_registration(self):
        """Test normal user registration"""
        test_user_data = {
            "username": f"testuser_{datetime.now().strftime('%H%M%S')}",
            "password": "TestPass123!",
            "email": f"test_{datetime.now().strftime('%H%M%S')}@test.com",
            "full_name": "Test User",
            "role": "user"
        }
        
        success, response = self.run_test(
            "User Registration",
            "POST",
            "register",
            200,
            data=test_user_data
        )
        
        if success:
            print(f"   Created user: {response['username']} (Role: {response['role']})")
            # Try to login with the new user
            login_success, login_response = self.run_test(
                "New User Login",
                "POST",
                "login",
                200,
                data={"username": test_user_data["username"], "password": test_user_data["password"]}
            )
            if login_success:
                self.user_token = login_response['access_token']
                return True
        return False

    def test_admin_user_creation(self):
        """Test admin creating a new user"""
        if not self.admin_token:
            print("❌ Admin token not available")
            return False
            
        new_admin_data = {
            "username": f"newadmin_{datetime.now().strftime('%H%M%S')}",
            "email": f"admin_{datetime.now().strftime('%H%M%S')}@test.com",
            "full_name": "New Admin User",
            "role": "admin",
            "temporary_password": "TempPass123!"
        }
        
        success, response = self.run_test(
            "Admin Create User",
            "POST",
            "admin/users",
            200,
            data=new_admin_data,
            token=self.admin_token
        )
        
        if success:
            self.created_user_id = response['id']
            print(f"   Created admin user: {response['username']} (Must change password: {response['must_change_password']})")
            return True
        return False

    def test_get_all_users(self):
        """Test getting all users (admin only)"""
        if not self.admin_token:
            print("❌ Admin token not available")
            return False
            
        success, response = self.run_test(
            "Get All Users",
            "GET",
            "admin/users",
            200,
            token=self.admin_token
        )
        
        if success:
            print(f"   Found {len(response)} users")
            return True
        return False

    def test_user_management(self):
        """Test user update and password reset"""
        if not self.admin_token or not self.created_user_id:
            print("❌ Admin token or created user ID not available")
            return False
            
        # Test user update
        update_data = {
            "full_name": "Updated Admin User",
            "is_active": False
        }
        
        success, response = self.run_test(
            "Update User",
            "PUT",
            f"admin/users/{self.created_user_id}",
            200,
            data=update_data,
            token=self.admin_token
        )
        
        if not success:
            return False
            
        # Test password reset
        reset_data = {
            "new_password": "NewTempPass123!"
        }
        
        success, response = self.run_test(
            "Reset User Password",
            "POST",
            f"admin/users/{self.created_user_id}/reset-password",
            200,
            data=reset_data,
            token=self.admin_token
        )
        
        return success

    def test_equipment_creation(self):
        """Test equipment creation"""
        if not self.user_token:
            print("❌ User token not available")
            return False
            
        equipment_data = {
            "area": "Oficina Principal",
            "equipment_type": "cpu",
            "nombre_pc": "PC-TEST-001",
            "marca": "Dell",
            "modelo": "OptiPlex 7090",
            "serie": "TEST123456",
            "tipo_mantenimiento": "preventivo",
            "observaciones": "Mantenimiento de prueba automatizado",
            "estado_equipo": "operativo"
        }
        
        success, response = self.run_test(
            "Create Equipment",
            "POST",
            "equipment",
            200,
            data=equipment_data,
            token=self.user_token
        )
        
        if success:
            self.created_equipment_id = response['id']
            print(f"   Created equipment: {response['marca']} {response['modelo']} (ID: {response['id']})")
            print(f"   Date assigned automatically: {response['fecha']}")
            return True
        return False

    def test_equipment_list(self):
        """Test getting equipment list"""
        if not self.user_token:
            print("❌ User token not available")
            return False
            
        success, response = self.run_test(
            "Get Equipment List",
            "GET",
            "equipment",
            200,
            token=self.user_token
        )
        
        if success:
            print(f"   Found {len(response)} equipment items")
            return True
        return False

    def test_equipment_filters(self):
        """Test equipment filtering"""
        if not self.user_token:
            print("❌ User token not available")
            return False
            
        filter_data = {
            "equipment_type": "cpu",
            "estado_equipo": "operativo"
        }
        
        success, response = self.run_test(
            "Filter Equipment",
            "POST",
            "equipment/filter",
            200,
            data=filter_data,
            token=self.user_token
        )
        
        if success:
            print(f"   Filtered results: {len(response)} items")
            return True
        return False

    def test_equipment_update(self):
        """Test equipment update (admin only)"""
        if not self.admin_token or not self.created_equipment_id:
            print("❌ Admin token or equipment ID not available")
            return False
            
        update_data = {
            "observaciones": "Observaciones actualizadas por admin",
            "estado_equipo": "en_reparacion"
        }
        
        success, response = self.run_test(
            "Update Equipment",
            "PUT",
            f"equipment/{self.created_equipment_id}",
            200,
            data=update_data,
            token=self.admin_token
        )
        
        if success:
            print(f"   Updated equipment status to: {response['estado_equipo']}")
            return True
        return False

    def test_dashboard_stats(self):
        """Test dashboard statistics"""
        if not self.user_token:
            print("❌ User token not available")
            return False
            
        success, response = self.run_test(
            "Get Dashboard Stats",
            "GET",
            "dashboard",
            200,
            token=self.user_token
        )
        
        if success:
            print(f"   Total equipments: {response['total_equipments']}")
            print(f"   Equipment types: {response['equipments_by_type']}")
            print(f"   Equipment status: {response['equipments_by_status']}")
            print(f"   Recent maintenances: {len(response['recent_maintenances'])}")
            return True
        return False

    def test_excel_export(self):
        """Test Excel export functionality"""
        if not self.user_token:
            print("❌ User token not available")
            return False
            
        filter_data = {}  # Export all
        
        success, response = self.run_test(
            "Export to Excel",
            "POST",
            "export/excel",
            200,
            data=filter_data,
            token=self.user_token
        )
        
        return success

    def test_unauthorized_access(self):
        """Test unauthorized access to admin endpoints"""
        if not self.user_token:
            print("❌ User token not available")
            return False
            
        # Try to access admin users endpoint with user token
        success, response = self.run_test(
            "Unauthorized Access Test",
            "GET",
            "admin/users",
            403,  # Should be forbidden
            token=self.user_token
        )
        
        return success

    def cleanup(self):
        """Clean up created test data"""
        if self.admin_token and self.created_user_id:
            self.run_test(
                "Delete Test User",
                "DELETE",
                f"admin/users/{self.created_user_id}",
                200,
                token=self.admin_token
            )
            
        if self.admin_token and self.created_equipment_id:
            self.run_test(
                "Delete Test Equipment",
                "DELETE",
                f"equipment/{self.created_equipment_id}",
                200,
                token=self.admin_token
            )

def main():
    print("🚀 Starting Equipment Maintenance System API Tests")
    print("=" * 60)
    
    tester = EquipmentMaintenanceAPITester()
    
    # Test sequence
    tests = [
        ("Admin Login", tester.test_admin_login),
        ("User Registration", tester.test_user_registration),
        ("Admin User Creation", tester.test_admin_user_creation),
        ("Get All Users", tester.test_get_all_users),
        ("User Management", tester.test_user_management),
        ("Equipment Creation", tester.test_equipment_creation),
        ("Equipment List", tester.test_equipment_list),
        ("Equipment Filters", tester.test_equipment_filters),
        ("Equipment Update", tester.test_equipment_update),
        ("Dashboard Stats", tester.test_dashboard_stats),
        ("Excel Export", tester.test_excel_export),
        ("Unauthorized Access", tester.test_unauthorized_access)
    ]
    
    failed_tests = []
    
    for test_name, test_func in tests:
        try:
            if not test_func():
                failed_tests.append(test_name)
        except Exception as e:
            print(f"❌ {test_name} failed with exception: {str(e)}")
            failed_tests.append(test_name)
    
    # Cleanup
    print("\n🧹 Cleaning up test data...")
    tester.cleanup()
    
    # Print results
    print("\n" + "=" * 60)
    print("📊 TEST RESULTS")
    print("=" * 60)
    print(f"Tests passed: {tester.tests_passed}/{tester.tests_run}")
    
    if failed_tests:
        print(f"\n❌ Failed tests:")
        for test in failed_tests:
            print(f"   - {test}")
        return 1
    else:
        print("\n✅ All tests passed!")
        return 0

if __name__ == "__main__":
    sys.exit(main())