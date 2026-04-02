# Implementation Summary: Profile Edit with WhatsApp Number and Availability Checking

## Overview
Enhanced the profile edit functionality in `/profil` page with:
1. WhatsApp number editing capability
2. Username and WhatsApp number availability checking
3. Validation ensuring username OR WhatsApp number must be present (at least one required)
4. Large profile picture display covering ~90% of page width
5. Profile picture editing with visual feedback

## Files Created

### 1. `/src/app/api/profile/check/username/route.ts`
- **Purpose**: Check if a username is available for use
- **Endpoint**: `POST /api/profile/check/username`
- **Request Body**: `{ username: string }`
- **Response**: `{ available: boolean }`
- **Features**:
  - Validates username format (3-30 chars, alphanumeric + underscore only)
  - Case-insensitive lookup using PostgreSQL `ilike`
  - Excludes current user's own username from availability check
  - Returns error messages for invalid formats

### 2. `/src/app/api/profile/check/wa-number/route.ts`
- **Purpose**: Check if a WhatsApp number is available for use
- **Endpoint**: `POST /api/profile/check/wa-number`
- **Request Body**: `{ waNumber: string }`
- **Response**: `{ available: boolean }`
- **Features**:
  - Uses `normalizeWaNumber()` utility from phone-utils
  - Validates WhatsApp number format
  - Excludes current user's own number from availability check
  - Prevents duplicate registration

## Files Modified

### 1. `/src/app/api/profile/route.ts`
**Changes**:
- Added `import { normalizeWaNumber } from "@/lib/phone-utils"`
- Added `"wa_number"` to `ALLOWED_KEYS` array
- Added WhatsApp number validation and normalization in PATCH handler:
  - Normalizes the number using `normalizeWaNumber()`
  - Stores normalized format in database
- Added validation logic ensuring username OR wa_number must not both be empty:
  - Checks if updating either field
  - Retrieves current user data to determine final state
  - Returns 400 error if both would be empty
- Updated error messages to include WhatsApp number duplication detection
- Returns masked WhatsApp number in PATCH response using `maskWaNumber()`
- Updated SELECT statement to include `wa_number` field

### 2. `/src/app/profil/page.tsx`
**State Variables Added**:
- `editWaNumber`: Stores edited WhatsApp number
- `usernameCheckLoading`: Loading state for username availability check
- `usernameCheckStatus`: Status of username check ("idle" | "available" | "taken" | "error")
- `waNumberCheckLoading`: Loading state for WhatsApp number check
- `waNumberCheckStatus`: Status of WhatsApp check ("idle" | "available" | "taken" | "error")
- `validationError`: Stores validation errors

**Functions Added**:
- `checkUsernameAvailability(username)`: Async function to check username availability via API
- `checkWaNumberAvailability(waNumber)`: Async function to check WhatsApp availability via API

**Updated Functions**:
- `handleSave()`: 
  - Added validation to ensure username OR WhatsApp number is present
  - Checks availability status before saving
  - Sends `wa_number` to API in request body
  - Updates profile state with masked WhatsApp number from response
- Profile initialization in useEffect hooks updated to include WhatsApp number

**UI/UX Enhancements**:
- **Large Profile Picture Section**:
  - Covers ~90% of page width (max 500px)
  - Square aspect ratio (1:1)
  - Rounded corners with shadow effect
  - Uses Next.js `Image` component for optimization
  - Falls back to Avatar component if no picture uploaded
  - Hover overlay with camera icon and "Ubah Foto" text
  
- **Username Field**:
  - Shows availability status ("Tersedia" or "Sudah dipakai")
  - Loading spinner during availability check
  - Red border when username is taken
  - Real-time checking as user types
  - Debounced to avoid excessive API calls
  
- **WhatsApp Number Field**:
  - Similar availability checking as username
  - Formatted input field (tel type)
  - Validation with placeholder "08xxxxxxxxxx"
  - Real-time checking with visual feedback
  - Red border when number is taken

- **Form Validation**:
  - Button disabled when:
    - Saving in progress
    - Availability checks in progress
    - Either username or WhatsApp is marked as "taken"
  - Error message displayed for validation failures
  - Clear feedback on what needs to be corrected

**Imports Added**:
- `import Image from "next/image"`

## Database Considerations

The implementation works with existing database schema:
- `users.wa_number`: Stores normalized WhatsApp number as plain text
- `users.username`: Stored as-is, lookup by LOWER() function
- Both fields have UNIQUE constraints to prevent duplicates
- Index `idx_users_wa_number_unique` ensures WhatsApp uniqueness

## Validation Rules

### Username
- **Required**: If WhatsApp is not provided
- **Format**: 3-30 characters, alphanumeric + underscore only
- **Uniqueness**: Case-insensitive (using PostgreSQL `ilike`)
- **Error Messages**:
  - "Username harus 3–30 karakter"
  - "Username hanya huruf, angka, dan underscore"
  - "Username sudah dipakai"

### WhatsApp Number
- **Required**: If username is not provided
- **Format**: Valid Indonesian WhatsApp number (normalized)
- **Uniqueness**: Exact match on normalized format
- **Error Messages**:
  - "Nomor WhatsApp tidak valid"
  - "Nomor WhatsApp sudah dipakai"

### Combined Validation
- **At least one required**: "Username atau nomor WhatsApp wajib diisi (minimal satu harus aktif)"

## User Experience Flow

1. **Viewing Edit Page**:
   - Large profile picture dominates the view
   - Hover over picture to reveal camera icon and edit button
   - Click to upload new picture

2. **Editing Username**:
   - Type username and real-time availability check starts
   - Visual feedback with spinner, checkmark (available), or error (taken)
   - Cannot submit if taken

3. **Editing WhatsApp Number**:
   - Type WhatsApp number with similar real-time checking
   - Format validation happens before availability check
   - Cannot submit if taken or invalid

4. **Editing Other Fields**:
   - Full name (required, min 2 chars)
   - Email (optional)
   - Date of birth (optional)

5. **Saving**:
   - All validations must pass
   - Submit button disabled during save
   - Success: Profile updated with confirmation
   - Error: Displays error message with retry option

## API Response Formats

### GET `/api/profile`
```json
{
  "fullName": "string",
  "username": "string | null",
  "waNumberMasked": "string | null",  // Masked format like "+62 ***-****-5678"
  "email": "string | null",
  ...
}
```

### PATCH `/api/profile`
```json
{
  "success": true,
  "profile": {
    "fullName": "string",
    "username": "string | null",
    "waNumber": "string | null",  // Masked format
    "email": "string | null",
    ...
  }
}
```

### POST `/api/profile/check/username`
```json
{
  "available": boolean
}
```

### POST `/api/profile/check/wa-number`
```json
{
  "available": boolean
}
```

## Security Considerations

1. **Session Required**: All endpoints require valid user session
2. **User Isolation**: Availability checks exclude current user
3. **Input Validation**: All inputs validated both client and server-side
4. **Normalization**: WhatsApp numbers normalized before storage to ensure consistency
5. **Unique Constraints**: Database-level unique constraints prevent duplicates
6. **SQL Injection**: Using parameterized queries via Supabase

## Performance Optimizations

1. **Debounced Checks**: Availability checks trigger only when value changes
2. **Image Optimization**: Using Next.js `Image` component for automatic optimization
3. **Conditional Rendering**: Loading spinners only shown when actually checking
4. **Error Handling**: Graceful fallback to Avatar component if image fails

## Testing Recommendations

1. Test username availability with:
   - Valid username (3-30 chars)
   - Invalid characters in username
   - Already taken username
   - User's own current username

2. Test WhatsApp availability with:
   - Valid Indonesian numbers (08xxx, 6281xxx)
   - Invalid number formats
   - Already registered numbers
   - User's own current number

3. Test validation with:
   - Both fields empty (should fail)
   - Only username provided (should work)
   - Only WhatsApp provided (should work)
   - Both provided (should work)
   - One taken, one available (should fail)

4. Test profile picture with:
   - Various image formats (JPG, PNG, WebP)
   - Different image sizes
   - No existing picture (Avatar fallback)
   - Upload failure scenarios