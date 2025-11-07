# Supabase Setup Guide for In-Vento

This guide will help you set up Supabase authentication for the In-Vento application.

## Prerequisites

- A Supabase account (sign up at [supabase.com](https://supabase.com) if you don't have one)
- Node.js and npm installed
- The project dependencies already installed (`npm install`)

## Step 1: Create a Supabase Project

1. Go to [https://supabase.com](https://supabase.com) and sign in (or create an account)
2. Click "New Project"
3. Fill in your project details:
   - **Name**: Choose a name for your project (e.g., "in-vento")
   - **Database Password**: Create a strong password (save this securely!)
   - **Region**: Choose the region closest to your users
   - **Pricing Plan**: Select the free tier if you're starting out
4. Click "Create new project" and wait for the project to be created (this takes a few minutes)

## Step 2: Get Your Supabase Credentials

1. Once your project is created, go to **Settings** (gear icon in the sidebar)
2. Click on **API** in the settings menu
3. You'll find two important values:
   - **Project URL**: This is your `SUPABASE_URL`
   - **anon/public key**: This is your `SUPABASE_ANON_KEY`

   Copy both of these values - you'll need them in the next step.

## Step 3: Configure Supabase in Your App

You have two options to configure your Supabase credentials:

### Option A: Using app.json (Recommended for Expo)

1. Open `app.json` in the root of your project
2. Add the following to the `expo` object:

```json
{
  "expo": {
    ...existing config...
    "extra": {
      "supabaseUrl": "YOUR_SUPABASE_URL",
      "supabaseAnonKey": "YOUR_SUPABASE_ANON_KEY"
    }
  }
}
```

Replace `YOUR_SUPABASE_URL` and `YOUR_SUPABASE_ANON_KEY` with the values from Step 2.

### Option B: Using Environment Variables (Alternative)

1. Create a `.env` file in the root of your project (if it doesn't exist)
2. Add the following lines:

```
EXPO_PUBLIC_SUPABASE_URL=YOUR_SUPABASE_URL
EXPO_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
```

Replace the placeholder values with your actual credentials.

**Note**: For environment variables to work with Expo, you may need to install `expo-constants` and restart your development server.

## Step 4: Configure Authentication in Supabase Dashboard

1. In your Supabase dashboard, go to **Authentication** in the sidebar
2. Click on **Providers** 
3. Ensure **Email** provider is enabled (it's enabled by default)
4. **Optional**: Configure email templates, email confirmation settings, etc.

### Email Confirmation Settings

By default, Supabase requires email confirmation. You can adjust this:

1. Go to **Authentication** > **Settings**
2. Under **Email Auth**, you can:
   - Enable/disable "Enable email confirmations"
   - Configure "Redirect URL" for email confirmation links
   - Customize email templates

For development, you might want to disable email confirmation temporarily:
- Set **Enable email confirmations** to OFF
- Users will be able to sign in immediately after sign up

## Step 5: Test the Integration

1. Make sure your development server is running:
   ```bash
   npm start
   ```

2. Navigate to the login screen in your app

3. Try signing up with a new account:
   - Click "Don't have an account? Sign Up"
   - Enter a valid email and password (min 6 characters)
   - Click "Sign Up"

4. Try logging in:
   - Enter the email and password you just created
   - Click "Login"

## Step 6: Verify in Supabase Dashboard

1. Go to **Authentication** > **Users** in your Supabase dashboard
2. You should see the user you just created listed there
3. You can view user details, manually verify emails, reset passwords, etc.

## Troubleshooting

### Error: "Supabase URL and Anon Key are required"

- Make sure you've configured the credentials in `app.json` or `.env` file
- Restart your Expo development server after making changes
- Verify the credentials are correct (no extra spaces or quotes)

### Error: "Invalid login credentials"

- Verify the email and password are correct
- Check if email confirmation is required (see Step 4)
- Verify the user exists in Supabase Dashboard > Authentication > Users

### Error: "Email rate limit exceeded"

- Supabase has rate limits on free tier
- Wait a few minutes and try again
- Consider upgrading your plan if you need higher limits

### App crashes or shows connection errors

- Verify your Supabase project is active (not paused)
- Check your internet connection
- Verify the Supabase URL is correct and accessible

## Security Notes

⚠️ **Important Security Considerations**:

1. **Never commit your Supabase credentials to public repositories**
   - The `anon key` in your client is public by default, but it's good practice to use environment variables
   - Your `service_role` key (found in API settings) should NEVER be exposed in client code

2. **Row Level Security (RLS)**: 
   - Supabase enables RLS by default on new tables
   - Make sure to set up proper RLS policies for any tables you create
   - Go to **Authentication** > **Policies** to configure

3. **Email Verification**:
   - For production apps, always enable email verification
   - This prevents fake accounts and improves security

## Next Steps

After setting up authentication, you might want to:

1. **Store user profiles**: Create a `profiles` table linked to `auth.users`
2. **Add password reset functionality**: Use Supabase's password reset feature
3. **Implement session management**: Check if user is logged in on app start
4. **Add social authentication**: Enable OAuth providers (Google, GitHub, etc.) in Supabase Dashboard

## Additional Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase Auth Guide](https://supabase.com/docs/guides/auth)
- [Expo + Supabase Guide](https://supabase.com/docs/guides/getting-started/tutorials/with-expo-react-native)

## Support

If you encounter issues:
1. Check the Supabase dashboard logs (Logs > API Logs)
2. Review the error messages in your app's console
3. Consult the [Supabase Discord](https://discord.supabase.com/) or [GitHub Issues](https://github.com/supabase/supabase/issues)

---

**Setup completed!** Your In-Vento app is now integrated with Supabase authentication. 🎉
