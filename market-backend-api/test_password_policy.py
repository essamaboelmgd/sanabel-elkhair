import asyncio
from app.auth.service import AuthService
from app.auth.schemas import UserCreate
from pydantic import ValidationError

async def test_password_policy():
    """Test the updated password policy."""
    
    print("Testing password policy updates...")
    
    # Test 1: Password with less than 8 characters should fail
    print("\n1. Testing password with less than 8 characters:")
    try:
        user = UserCreate(
            name="Test User",
            phone="12345678901",
            password="1234567",  # 7 characters - should fail
            role="admin"
        )
        print("❌ FAILED: Should have raised validation error")
    except ValidationError as e:
        if "8 characters" in str(e):
            print("✅ PASSED: Correctly rejected password with less than 8 characters")
        else:
            print(f"❌ FAILED: Wrong error message: {e}")
    
    # Test 2: Password with exactly 8 characters should pass
    print("\n2. Testing password with exactly 8 characters:")
    try:
        user = UserCreate(
            name="Test User",
            phone="12345678901",
            password="12345678",  # 8 characters - should pass
            role="admin"
        )
        print("✅ PASSED: Correctly accepted password with 8 characters")
    except ValidationError as e:
        print(f"❌ FAILED: Should have passed but got error: {e}")
    
    # Test 3: Password with more than 8 characters should pass
    print("\n3. Testing password with more than 8 characters:")
    try:
        user = UserCreate(
            name="Test User",
            phone="12345678901",
            password="ThisIsALongPassword123",  # More than 8 characters - should pass
            role="admin"
        )
        print("✅ PASSED: Correctly accepted password with more than 8 characters")
    except ValidationError as e:
        print(f"❌ FAILED: Should have passed but got error: {e}")
    
    # Test 4: Very long password should be handled correctly
    print("\n4. Testing very long password (100 characters):")
    long_password = "a" * 100
    try:
        # This should not raise any errors related to bcrypt limits
        hashed = AuthService.get_password_hash(long_password)
        verified = AuthService.verify_password(long_password, hashed)
        if verified:
            print("✅ PASSED: Very long password handled correctly")
        else:
            print("❌ FAILED: Very long password verification failed")
    except Exception as e:
        print(f"❌ FAILED: Error with long password: {e}")
    
    print("\nPassword policy tests completed!")

if __name__ == "__main__":
    asyncio.run(test_password_policy())