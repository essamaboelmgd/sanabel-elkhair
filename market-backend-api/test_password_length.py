import asyncio
from app.auth.service import AuthService

async def test_password_handling():
    """Test password handling with different lengths."""
    
    # Test short password (should work)
    short_password = "short123"
    hashed = AuthService.get_password_hash(short_password)
    verified = AuthService.verify_password(short_password, hashed)
    print(f"Short password test: {'PASS' if verified else 'FAIL'}")
    
    # Test 72-byte password (maximum allowed)
    max_password = "a" * 72
    hashed = AuthService.get_password_hash(max_password)
    verified = AuthService.verify_password(max_password, hashed)
    print(f"72-byte password test: {'PASS' if verified else 'FAIL'}")
    
    # Test password longer than 72 bytes (should be truncated)
    long_password = "a" * 80
    hashed = AuthService.get_password_hash(long_password)
    # Verification should work with truncated version
    truncated_password = long_password[:72]
    verified = AuthService.verify_password(truncated_password, hashed)
    print(f"Long password test (truncated): {'PASS' if verified else 'FAIL'}")
    
    # Test that original long password doesn't work
    verified_original = AuthService.verify_password(long_password, hashed)
    print(f"Long password test (original): {'PASS' if not verified_original else 'FAIL'} (should fail)")

if __name__ == "__main__":
    asyncio.run(test_password_handling())