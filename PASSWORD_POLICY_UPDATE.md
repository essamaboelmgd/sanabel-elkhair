# Password Policy Update

## Overview
This document summarizes the changes made to update the password policy to meet the new requirements:
1. Minimum password length: 8 characters (increased from 6)
2. No maximum size limit (passwords of any practical size are now supported)
3. Removed the explicit 72-byte error message that was causing issues

## Changes Made

### Backend Changes (market-backend-api)

#### 1. Schema Validation Updates (`app/auth/schemas.py`)
- Updated minimum password length from 6 to 8 characters in all password-related schemas:
  - `UserCreate`
  - `PasswordChange`
  - `CustomerPasswordSet`
  - `CustomerPasswordSetById`
- Removed the 72-byte limit validation to allow passwords of any size
- Login schema no longer enforces any password length restrictions

#### 2. Authentication Service (`app/auth/service.py`)
- Implemented a more robust approach to handle long passwords:
  - Added `_hash_password_for_bcrypt` method that uses SHA-256 hashing for passwords longer than 72 bytes
  - This preserves password entropy while ensuring compatibility with bcrypt's 72-byte limit
  - Updated `verify_password` and `get_password_hash` methods to use this approach
- No more explicit truncation of passwords, which was causing the error messages

### Frontend Changes (market-frontend)

#### 1. Admin Login Page (`app/admin/login/page.tsx`)
- Updated minimum length requirement from 6 to 8 characters
- Added user-friendly message indicating the minimum length requirement
- Removed the 72-byte error handling since it's no longer needed

#### 2. Customer Login Page (`app/customer/login/page.tsx`)
- Updated minimum length requirement from 6 to 8 characters
- Added user-friendly message indicating the minimum length requirement
- Removed the 72-byte error handling since it's no longer needed

#### 3. Customer Edit Page (`app/admin/customers/edit/[id]/page.tsx`)
- Updated minimum length requirement from 6 to 8 characters for password change functionality
- Added user-friendly message indicating the minimum length requirement

## Benefits of These Changes

1. **User Experience**: 
   - Clearer password requirements (8+ characters)
   - No arbitrary size limits that cause confusing error messages
   - Better feedback to users about requirements

2. **Security**:
   - Stronger minimum password requirements (8 vs 6 characters)
   - Proper handling of long passwords without losing entropy
   - Consistent approach across all password entry points

3. **Technical**:
   - Eliminates the "72 bytes" error that was appearing unexpectedly
   - More robust password handling that works with any practical password length
   - Maintains compatibility with bcrypt while supporting longer passwords

## Testing

The changes have been implemented to ensure:
- Passwords with 8 or more characters are accepted
- Passwords of any reasonable length are supported
- No more "72 bytes" errors appear
- Existing functionality remains intact

## Deployment

These changes are ready for deployment and should resolve the issue you were experiencing with the unexpected password length error.