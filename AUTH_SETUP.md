# Authentication System Setup Guide

## Installation

### 1. Install Backend Dependencies

```bash
cd server
npm install cookie-parser express-rate-limit express-session nodemailer passport passport-google-oauth20
```

### 2. Configure Environment Variables

Update your `server/.env` file with the following new variables:

```env
# Session Secret (generate a random string)
SESSION_SECRET=your_random_session_secret_here

# Frontend URL (for CORS and OAuth redirects)
FRONTEND_URL=http://localhost:5173

# Email Service Configuration (Option 1: Gmail)
EMAIL_SERVICE=gmail
EMAIL_USER=your_email@gmail.com
EMAIL_APP_PASSWORD=your_gmail_app_password

# Email Service Configuration (Option 2: SMTP - comment out Gmail options above)
# EMAIL_SERVICE=
# SMTP_HOST=smtp.example.com
# SMTP_PORT=587
# EMAIL_USER=your_email@example.com
# EMAIL_APP_PASSWORD=your_smtp_password

# Google OAuth 2.0 Credentials
GOOGLE_CLIENT_ID=your_google_client_id_here
GOOGLE_CLIENT_SECRET=your_google_client_secret_here
```

## Google OAuth Setup

### Step 1: Create Google OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Navigate to **APIs & Services** → **Credentials**
4. Click **Create Credentials** → **OAuth 2.0 Client ID**
5. If prompted, configure the OAuth consent screen:
   - User Type: **External** (for testing) or **Internal** (for organization only)
   - App name: **NexusBoard**
   - User support email: Your email
   - Developer contact: Your email
6. Select Application Type: **Web application**
7. Add **Authorized redirect URIs**:
   - `http://localhost:5000/api/auth/google/callback`
   - `https://yourdomain.com/api/auth/google/callback` (for production)
8. Click **Create**
9. Copy the **Client ID** and **Client Secret**
10. Paste them into your `.env` file:
    ```env
    GOOGLE_CLIENT_ID=your_client_id_here.apps.googleusercontent.com
    GOOGLE_CLIENT_SECRET=your_client_secret_here
    ```

### Step 2: Add Test Users (if using External OAuth)

1. In Google Cloud Console, go to **OAuth consent screen**
2. Scroll to **Test users**
3. Click **Add Users** and add email addresses that can test the login

## Email Service Setup

### Option 1: Gmail (Recommended for Development)

1. **Enable 2-Factor Authentication** on your Google Account:
   - Go to [Google Account Security](https://myaccount.google.com/security)
   - Enable **2-Step Verification**

2. **Generate App Password**:
   - Go to [App Passwords](https://myaccount.google.com/apppasswords)
   - Select app: **Mail**
   - Select device: **Other** (enter "NexusBoard")
   - Click **Generate**
   - Copy the 16-character password (remove spaces)

3. **Update .env**:
   ```env
   EMAIL_SERVICE=gmail
   EMAIL_USER=your_email@gmail.com
   EMAIL_APP_PASSWORD=abcdefghijklmnop
   ```

### Option 2: Custom SMTP Server

```env
SMTP_HOST=smtp.example.com
SMTP_PORT=587
EMAIL_USER=no-reply@example.com
EMAIL_APP_PASSWORD=your_smtp_password
```

## Session Secret Generation

Generate a secure random session secret:

```bash
# Using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Copy the output and paste it as `SESSION_SECRET` in your `.env` file.

## Running the Application

### Start Backend

```bash
cd server
npm run dev
```

The server will run on `http://localhost:5000`

### Start Frontend

```bash
cd client
npm run dev
```

The client will run on `http://localhost:5173`

## Testing Authentication Features

### 1. OTP Login

1. Navigate to `http://localhost:5173/login`
2. Select **Login with OTP**
3. Enter your email
4. Check your email for the 6-digit OTP code
5. Enter the OTP (and name if first-time user)
6. You'll be redirected to the dashboard

### 2. Password Login

1. Navigate to `http://localhost:5173/login`
2. Select **Login with Password**
3. Enter email and password
4. Click Login

### 3. Google OAuth Login

1. Navigate to `http://localhost:5173/login`
2. Click **Continue with Google**
3. Select your Google account
4. You'll be redirected to the dashboard

### 4. Register New Account

1. Navigate to `http://localhost:5173/register`
2. Enter name, email, and password
3. You'll receive an OTP via email
4. Verify OTP to complete registration

### 5. Forgot Password

1. Navigate to `http://localhost:5173/login`
2. Click **Forgot Password?**
3. Enter your email
4. Check email for reset link
5. Click the link and set a new password

## Authentication Flow

### HTTP-Only Cookies + JWT

- JWT tokens are stored in **HTTP-only cookies** for security
- Cookies have a **7-day expiration**
- The `withCredentials: true` flag is set on axios requests
- Backend middleware checks both `Authorization` header and cookies for backward compatibility

### Rate Limiting

- All auth routes are rate-limited to **10 requests per 15 minutes** per IP
- Prevents brute force attacks on OTP/password endpoints

### OTP Security

- OTPs are **6-digit numeric codes**
- Valid for **5 minutes**
- Maximum **5 verification attempts** before OTP expires
- Stored as **bcrypt hash** in MongoDB
- Auto-deleted after expiration (MongoDB TTL index)

### Password Reset Security

- Reset tokens are **cryptographically secure** (crypto.randomBytes)
- Valid for **15 minutes**
- Single-use tokens (deleted after password reset)
- Tokens stored as **bcrypt hash**
- Auto-deleted after expiration (MongoDB TTL index)

## Troubleshooting

### "Google OAuth Error: redirect_uri_mismatch"

- Ensure the redirect URI in Google Cloud Console exactly matches:
  `http://localhost:5000/api/auth/google/callback`
- Check that FRONTEND_URL in .env is correct
- Verify the OAuth Client ID is correct

### "Failed to send OTP"

- Check EMAIL_USER and EMAIL_APP_PASSWORD in .env
- Verify Gmail App Password is correct (16 characters, no spaces)
- Ensure 2FA is enabled on Gmail account
- Check server logs for detailed error messages

### "Session expired" errors

- Verify SESSION_SECRET is set in .env
- Check that cookies are enabled in your browser
- Ensure FRONTEND_URL matches your client URL
- Check CORS configuration allows credentials

### "Rate limit exceeded"

- Wait 15 minutes before trying again
- This is a security feature to prevent brute force attacks
- In development, you can restart the server to reset rate limits

## Production Deployment

When deploying to production:

1. **Update Environment Variables**:
   ```env
   NODE_ENV=production
   FRONTEND_URL=https://yourdomain.com
   SESSION_SECRET=<strong-random-secret>
   ```

2. **Update Google OAuth Redirect URI**:
   - Add `https://yourdomain.com/api/auth/google/callback` to Google Cloud Console

3. **Enable Secure Cookies**:
   - Cookies will automatically use `secure: true` and `sameSite: 'none'` in production

4. **CORS Configuration**:
   - Update CORS origin in `server.js` to match your production frontend URL

5. **Email Service**:
   - Consider using a professional SMTP service (SendGrid, AWS SES, Mailgun)
   - Update SMTP configuration accordingly

## API Endpoints

### Authentication Routes

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/send-otp` | Send OTP to email |
| POST | `/api/auth/verify-otp` | Verify OTP and login/register |
| POST | `/api/auth/login` | Login with email/password |
| POST | `/api/auth/register` | Register with email/password |
| POST | `/api/auth/forgot-password` | Send password reset email |
| POST | `/api/auth/reset-password` | Reset password with token |
| GET | `/api/auth/google` | Initiate Google OAuth |
| GET | `/api/auth/google/callback` | Google OAuth callback |
| POST | `/api/auth/logout` | Logout and clear cookie |
| GET | `/api/auth/me` | Get current user |

## Security Features

✅ **JWT with HTTP-only cookies** - Prevents XSS attacks  
✅ **Rate limiting** - Prevents brute force attacks  
✅ **Bcrypt password hashing** - Secure password storage  
✅ **Bcrypt OTP hashing** - Secure OTP storage  
✅ **Cryptographically secure tokens** - For password reset  
✅ **TTL indexes** - Auto-delete expired OTPs/tokens  
✅ **Session management** - Passport.js with express-session  
✅ **CORS configured** - Only allows specified origins  
✅ **Input validation** - All user inputs validated  
✅ **Attempt limiting** - Max 5 OTP attempts  
✅ **Time-limited tokens** - OTP: 5 min, Reset: 15 min  

## Support

If you encounter any issues:

1. Check the console logs (browser and server)
2. Verify all environment variables are set correctly
3. Ensure MongoDB is running and connected
4. Check that all npm packages are installed
5. Review the troubleshooting section above

---

**Your authentication system is now complete!** 🎉
