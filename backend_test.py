import requests
import sys
import os
from datetime import datetime
import base64
import json

class FashionAPITester:
    def __init__(self, base_url="https://stylesage-2.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.tests_run = 0
        self.tests_passed = 0

    def run_test(self, name, method, endpoint, expected_status, data=None, files=None):
        """Run a single API test"""
        url = f"{self.api_url}/{endpoint}"
        headers = {}
        
        if files is None:
            headers['Content-Type'] = 'application/json'

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers)
            elif method == 'POST':
                if files:
                    response = requests.post(url, files=files)
                else:
                    response = requests.post(url, json=data, headers=headers)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    response_data = response.json()
                    print(f"Response: {json.dumps(response_data, indent=2)[:200]}...")
                except:
                    print(f"Response: {response.text[:200]}...")
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                print(f"Response: {response.text[:200]}...")

            return success, response.json() if success and response.content else {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_root_endpoint(self):
        """Test the root API endpoint"""
        return self.run_test("Root API Endpoint", "GET", "", 200)

    def test_status_create(self):
        """Test creating a status check"""
        test_data = {
            "client_name": f"test_client_{datetime.now().strftime('%H%M%S')}"
        }
        return self.run_test("Create Status Check", "POST", "status", 200, data=test_data)

    def test_status_get(self):
        """Test getting status checks"""
        return self.run_test("Get Status Checks", "GET", "status", 200)

    def create_test_image_file(self):
        """Create a simple test image file for fashion analysis"""
        # Create a simple 1x1 pixel PNG image in base64
        # This is a minimal valid PNG file
        png_data = base64.b64decode(
            'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=='
        )
        
        # Write to a temporary file
        with open('/tmp/test_fashion.png', 'wb') as f:
            f.write(png_data)
        
        return '/tmp/test_fashion.png'

    def test_fashion_analysis_invalid_file(self):
        """Test fashion analysis with invalid file type"""
        # Create a text file instead of image
        with open('/tmp/test.txt', 'w') as f:
            f.write('This is not an image')
        
        with open('/tmp/test.txt', 'rb') as f:
            files = {'file': ('test.txt', f, 'text/plain')}
            success, response = self.run_test(
                "Fashion Analysis - Invalid File Type", 
                "POST", 
                "analyze-fashion", 
                400,  # Expecting 400 for invalid file type
                files=files
            )
        
        os.remove('/tmp/test.txt')
        return success, response

    def test_fashion_analysis_valid_image(self):
        """Test fashion analysis with valid image"""
        image_path = self.create_test_image_file()
        
        try:
            with open(image_path, 'rb') as f:
                files = {'file': ('test_fashion.png', f, 'image/png')}
                success, response = self.run_test(
                    "Fashion Analysis - Valid Image", 
                    "POST", 
                    "analyze-fashion", 
                    200,
                    files=files
                )
            
            if success and response:
                print("✅ Fashion analysis response structure:")
                if 'analysis' in response:
                    analysis = response['analysis']
                    print(f"  - Clothing pieces: {len(analysis.get('clothing_pieces', []))}")
                    print(f"  - Styling tips: {len(analysis.get('styling_tips', []))}")
                    print(f"  - Color palette: {len(analysis.get('color_palette', []))}")
                    print(f"  - Overall analysis: {bool(analysis.get('overall_analysis'))}")
                    
                    # CRITICAL: Check styling tips content for raw JSON
                    styling_tips = analysis.get('styling_tips', [])
                    print("\n🔍 CRITICAL CHECK - Styling Tips Content:")
                    for i, tip in enumerate(styling_tips):
                        print(f"  Tip {i+1}: {tip}")
                        # Check if tip contains JSON-like content
                        if '{' in tip or '}' in tip or '"' in tip:
                            print(f"  ⚠️  WARNING: Tip {i+1} may contain raw JSON content!")
                        else:
                            print(f"  ✅ Tip {i+1} looks like proper styling advice")
            
            return success, response
            
        finally:
            if os.path.exists(image_path):
                os.remove(image_path)

    def test_recent_analyses(self):
        """Test getting recent analyses"""
        return self.run_test("Get Recent Analyses", "GET", "recent-analyses", 200)

def main():
    print("🧪 Starting AI Fashion Stylist API Tests")
    print("=" * 50)
    
    # Setup
    tester = FashionAPITester()
    
    # Run basic API tests
    print("\n📡 Testing Basic API Endpoints...")
    tester.test_root_endpoint()
    tester.test_status_create()
    tester.test_status_get()
    
    # Test fashion analysis endpoints
    print("\n👗 Testing Fashion Analysis Endpoints...")
    tester.test_fashion_analysis_invalid_file()
    
    # Test with valid image - this is the core functionality
    print("\n🎯 Testing Core Fashion Analysis...")
    success, response = tester.test_fashion_analysis_valid_image()
    
    if not success:
        print("❌ CRITICAL: Core fashion analysis failed!")
        print("This is the main feature of the app and needs to work.")
    
    # Test recent analyses
    tester.test_recent_analyses()
    
    # Print final results
    print("\n" + "=" * 50)
    print(f"📊 Final Results: {tester.tests_passed}/{tester.tests_run} tests passed")
    
    if tester.tests_passed == tester.tests_run:
        print("🎉 All tests passed! Backend is working correctly.")
        return 0
    else:
        failed_tests = tester.tests_run - tester.tests_passed
        print(f"⚠️  {failed_tests} test(s) failed. Check the issues above.")
        return 1

if __name__ == "__main__":
    sys.exit(main())