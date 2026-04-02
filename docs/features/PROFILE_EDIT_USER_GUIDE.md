# Profile Edit Feature - User Guide

## Overview

The Profile Edit page (`/profil`) has been enhanced with new features for managing your account information, including WhatsApp number editing, real-time availability checking, and profile picture management.

## Features

### 1. Profile Picture Management

#### Display
- Your profile picture is displayed prominently, covering ~90% of the page width
- The picture is displayed in a square format with rounded corners
- If no picture has been uploaded, your initials will be shown instead

#### Uploading a New Picture
1. Hover over your profile picture
2. A camera icon will appear with "Ubah Foto" (Change Photo) text
3. Click anywhere on the picture to open the file selector
4. Choose an image file from your device (JPG, PNG, WebP, etc.)
5. The image will upload automatically
6. A loading spinner will show while uploading
7. Once complete, the new picture will display immediately

#### Requirements
- File format: JPG, PNG, WebP, or similar image formats
- The image should be relatively square for best appearance
- File size: System will handle optimization automatically

### 2. Full Name (Nama Lengkap)

#### Rules
- **Required**: You must provide a full name
- **Minimum**: At least 2 characters
- **Maximum**: No practical limit, but keep it reasonable

#### How to Edit
1. Click on the Full Name field
2. Clear the current name if needed
3. Type your complete name
4. Save to apply changes

### 3. Username (Username)

#### Rules
- **Optional**: You don't need a username if you have a WhatsApp number
- **Minimum**: At least 3 characters
- **Maximum**: 30 characters
- **Allowed Characters**: Letters (A-Z, a-z), numbers (0-9), and underscore (_)
- **Not Allowed**: Spaces, special characters (@, #, $, etc.)
- **Unique**: Each username must be unique across the system - no two users can have the same username

#### Real-time Availability Checking
When you type or modify your username:
- A loading spinner will appear briefly next to the username field
- You'll see one of three statuses:
  - **Tersedia** (Available) - Green checkmark, you can use this username
  - **Sudah dipakai** (Already taken) - Red text, another user has this username
  - Empty - Checking is in progress or username hasn't changed

#### Validation Feedback
- If the username has invalid characters or wrong length, an error appears when you try to save
- If another user has taken the username, the status will show "Sudah dipakai" and you won't be able to save

#### Examples
- ✅ Valid: `budi_santoso`, `siti123`, `Ahmad_Rapi`
- ❌ Invalid: `budi santoso` (space), `@budi` (special char), `bd` (too short)

### 4. WhatsApp Number (Nomor WhatsApp)

#### Rules
- **Optional**: You don't need a WhatsApp number if you have a username
- **Format**: Indonesian WhatsApp numbers (e.g., 08xxxxxxxxxx or 6281xxxxxxxxx)
- **Unique**: Each WhatsApp number must be unique - no two users can have the same number
- **Validation**: The system automatically normalizes the format for consistency

#### Real-time Availability Checking
When you type or modify your WhatsApp number:
- A loading spinner will appear next to the field
- You'll see one of three statuses:
  - **Tersedia** (Available) - Green checkmark, you can use this number
  - **Sudah dipakai** (Already taken) - Red text, another user registered with this number
  - Empty - Checking is in progress or number hasn't changed

#### Number Format Examples
- ✅ Valid: `08123456789`, `6281234567890`, `+628123456789`
- ❌ Invalid: `123456789` (too short), `08abc123456` (contains letters)

#### Important Note
- Your WhatsApp number is always masked in the display for privacy (e.g., "+62 ***-****-5678")
- The full number is only stored securely on our servers

### 5. Email (Email)

#### Rules
- **Optional**: Email is not required
- **Format**: Standard email format (example@domain.com)
- **Unique**: Each email address must be unique if provided

#### How to Edit
1. Click on the Email field
2. Type your email address or leave it empty
3. Save to apply changes

### 6. Date of Birth (Tanggal Lahir)

#### Rules
- **Optional**: Date of birth is not required
- **Format**: Automatically selected from calendar picker

#### How to Edit
1. Click on the Date of Birth field
2. A calendar picker will appear
3. Select your birth date
4. Save to apply changes

## Validation Rules

### The Golden Rule: Username OR WhatsApp Required

You must provide **at least one** of the following:
- A valid username, OR
- A valid WhatsApp number

You **cannot** have both empty. The system will prevent you from saving if both are left blank.

### Examples
- ✅ **Allowed**: Username = "budi_santoso", WhatsApp = empty
- ✅ **Allowed**: Username = empty, WhatsApp = "08123456789"
- ✅ **Allowed**: Username = "budi_santoso", WhatsApp = "08123456789"
- ❌ **Not Allowed**: Username = empty, WhatsApp = empty

## Saving Your Changes

### Before You Save
1. Make sure at least one of Username or WhatsApp is filled in
2. Check that the availability status shows "Tersedia" (Available) or is empty
3. Verify your Full Name is valid (at least 2 characters)

### Submitting
1. Click the "Simpan" (Save) button at the bottom
2. The button will show a loading spinner while saving
3. If successful: The page will return to the main view with your updated information
4. If there's an error: You'll see a red error message explaining what went wrong

### What if Save Fails?
- **Availability Issue**: Another user registered with your chosen username or WhatsApp before you
  - Solution: Choose a different username or WhatsApp number
  
- **Validation Error**: Some information didn't meet the requirements
  - Solution: Check the error message and correct the highlighted field
  
- **Network Error**: Your connection was interrupted
  - Solution: Check your internet connection and try again

## Canceling Edits

### Before Saving
- Click the "Batal" (Cancel) button
- All your changes will be discarded
- The form will reset to your currently saved information

## Tips and Best Practices

### Username Tips
- Make it memorable and easy to spell
- Use lowercase for consistency
- Consider using underscore instead of trying to include spaces
- Examples: `john_doe`, `sarah_2024`, `ahmad_rt`

### WhatsApp Tips
- Use your primary WhatsApp number for faster contact
- Make sure your WhatsApp account is active
- The number will be used by the community for important notifications
- You can update it anytime if you change your number

### Profile Picture Tips
- Use a clear, well-lit photo
- Keep it professional or friendly (this is a community platform)
- Square images work best
- The picture will be visible to other community members
- You can change it anytime by hovering and clicking "Ubah Foto"

## Common Questions

### Q: Can I use the same username as someone else?
**A**: No. Each username must be unique. If someone already has your chosen username, you'll see "Sudah dipakai" when the availability check runs.

### Q: Can I use the same WhatsApp number as someone else?
**A**: No. Each WhatsApp number must be unique. If someone registered with your number first, you'll need to use a different number.

### Q: What if I don't have a WhatsApp?
**A**: That's fine! You can use just a username instead. Make sure your username is valid and available.

### Q: What if I want to use WhatsApp but don't need a username?
**A**: Absolutely possible. Just enter your WhatsApp number and leave the username blank. At least one must be filled.

### Q: How is my WhatsApp number displayed to others?
**A**: Your WhatsApp number is always masked in the system (e.g., "+62 ***-****-5678") to protect your privacy. Only administrators and authorized personnel can see full numbers.

### Q: Can I change my profile picture multiple times?
**A**: Yes, you can change it as many times as you want. Just hover over your current picture and click "Ubah Foto".

### Q: What image formats are supported?
**A**: JPG, PNG, WebP, and other common image formats. The system will automatically optimize the image.

### Q: What happens if my username or WhatsApp check shows an error?
**A**: An error typically means there was a connection issue with the availability check. Try typing again - the check will retry automatically. If it persists, refresh the page and try again.

### Q: How long does the availability check take?
**A**: Usually less than a second. You'll see a loading spinner while it checks. If it seems stuck, there might be a connection issue.

## Troubleshooting

### Issue: "Sudah dipakai" appears for my current username/WhatsApp
**Solution**: This shouldn't happen - your current values should always show as "idle" (no status). Refresh the page if this occurs.

### Issue: Can't click the Save button
**Solution**: Check that:
- At least one of Username or WhatsApp is filled in
- The availability checks show "Tersedia" or are empty (not "Sudah dipakai")
- The full name has at least 2 characters
- No other form field has an error

### Issue: Upload image doesn't appear
**Solution**: 
- Check that your image file is a valid format (JPG, PNG, WebP)
- Try a different image
- Refresh the page and try again
- Check your internet connection

### Issue: Availability check keeps showing "Sudah dipakai" for my new choice
**Solution**: 
- Verify the username/number is spelled correctly
- Try a different variation (e.g., add underscore or number)
- Wait a moment and try a completely different choice
- Contact support if the issue persists

## Need Help?

If you encounter any issues:
1. Check this guide for your specific question
2. Verify all validation requirements are met
3. Try refreshing the page
4. Check your internet connection
5. Contact your community administrator if problems persist

---

**Last Updated**: 2024
**Version**: 1.0