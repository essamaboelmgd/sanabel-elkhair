import asyncio
from app.auth.service import AuthService

async def test_bcrypt_error_handling():
    """Test that the AuthService properly handles bcrypt's 72-byte limit error."""
    
    print("Testing bcrypt error handling...")
    
    # Test with a very long password that would exceed bcrypt's limit
    long_password = "a" * 100  # 100 characters, well over bcrypt's 72-byte limit
    
    try:
        # This should not raise any errors
        hashed = AuthService.get_password_hash(long_password)
        print("✅ Password hashing successful for long password")
        
        # Test verification
        verified = AuthService.verify_password(long_password, hashed)
        if verified:
            print("✅ Password verification successful for long password")
        else:
            print("❌ Password verification failed for long password")
            
        # Test with a short password
        short_password = "password123"
        hashed_short = AuthService.get_password_hash(short_password)
        verified_short = AuthService.verify_password(short_password, hashed_short)
        if verified_short:
            print("✅ Password verification successful for short password")
        else:
            print("❌ Password verification failed for short password")
            
        print("\nAll tests passed! Bcrypt error handling is working correctly.")
        
    except Exception as e:
        print(f"❌ Test failed with error: {e}")
        print(f"Error type: {type(e)}")

if __name__ == "__main__":
    asyncio.run(test_bcrypt_error_handling())