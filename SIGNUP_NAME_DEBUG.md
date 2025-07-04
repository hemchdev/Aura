# Sign-up Name Issue Debug Guide

## Issue: Name not being saved during sign-up but works in profile settings

### Changes Made:

1. **Enhanced sendOTP function**:
   - Now accepts a `name` parameter
   - Includes name in user metadata when creating new users
   - Data is stored in both `name` and `full_name` fields in user metadata

2. **Improved verifyOTP function**:
   - Added detailed logging for debugging
   - Better handling of profile creation and updates
   - Updates existing profiles if name is different
   - More robust error handling

3. **Updated ensureProfile function**:
   - Now checks user metadata for name information
   - Falls back to email prefix only if no metadata is found
   - Better logging for debugging

4. **Modified sign-up component**:
   - Now passes the name to sendOTP function
   - This ensures the name is included in the initial OTP request

### Debugging Steps:

1. **Open browser developer tools** (F12) before testing
2. **Go to Console tab** to see debug logs
3. **Try creating a new account** with a test email
4. **Watch the console** for these log messages:
   - "Creating new profile with name: [name]"
   - "Profile created successfully: [profile object]"
   - "Final profile state: [profile object]"

### Testing:

1. **Create a new test account**:
   - Use a fresh email address
   - Enter a name like "Test User"
   - Complete the OTP verification

2. **Check the results**:
   - The app should show the correct name immediately
   - Check Supabase dashboard to verify the profile was created with the correct name
   - The console should show the creation process

3. **If it still shows email prefix**:
   - Check the console logs to see where the process failed
   - Check if there are any error messages in the console
   - Verify that the name is being passed correctly through all functions

### Common Issues & Solutions:

1. **Name still shows email prefix**:
   - Check console for "Creating new profile with name:" log
   - If the log shows email prefix instead of the entered name, the issue is in sendOTP
   - If the log shows correct name but profile creation fails, it's a database issue

2. **Profile not created**:
   - Check for "Profile creation error:" in console
   - This could be a database permissions issue
   - Check Supabase RLS policies for the profiles table

3. **Name not updating**:
   - Check for "Profile updated successfully:" in console
   - If this appears but the UI doesn't update, it's a state management issue

### Supabase Dashboard Check:

1. Go to your Supabase dashboard
2. Navigate to Table Editor → profiles
3. Find the newly created user profile
4. Check if the `name` field contains the entered name or email prefix

### Next Steps if Issue Persists:

1. **Check RLS Policies**: Ensure the profiles table has proper Row Level Security policies
2. **Check Database Schema**: Verify the profiles table structure matches the expected format
3. **Test with different names**: Try with different types of names (with spaces, special characters, etc.)
4. **Clear browser cache**: Sometimes cached auth state can cause issues

The enhanced logging should help identify exactly where in the process the name is being lost or overwritten.
