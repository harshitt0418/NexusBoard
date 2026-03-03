# 🚀 QUICK START GUIDE - AFTER FIXES

## ✅ FIXES APPLIED - YOU'RE READY TO TEST

---

## 🧪 TEST THE FIXES NOW

### 1. Restart the servers
```bash
# Kill all Node processes
Get-Process -Name node -ErrorAction SilentlyContinue | Stop-Process -Force

# Start servers
cd c:\Users\Harshit Mittal\Desktop\NexusBoard\server
node server.js

# In another terminal
cd c:\Users\Harshit Mittal\Desktop\NexusBoard\client
npm run dev
```

### 2. Test OTP Signup (NEW USER)
1. Go to http://localhost:5173/login
2. Enter NEW email → Click "Send OTP"
3. Check your email for 6-digit OTP
4. Enter OTP
5. **CHECK the "I'm a new user" checkbox**
6. Enter your name + create password
7. Click Verify
8. ✅ You should be logged in and redirected to home page

### 3. Test Password Login (RETURNING USER)
1. Go to http://localhost:5173/login
2. Enter the SAME email + password you created
3. Click "Sign In"
4. ✅ You should be logged in

### 4. Test OTP Login (RETURNING USER)
1. Go to http://localhost:5173/login
2. Enter your email → Click "Use email verification"
3. Enter the OTP from email
4. **UNCHECK the "I'm a new user" checkbox** (or leave it unchecked)
5. Click Verify
6. ✅ You should be logged in WITHOUT entering password

---

## 🔍 VERIFY DATABASE INDEXES

Run this command in the server directory:
```bash
cd c:\Users\Harshit Mittal\Desktop\NexusBoard\server
node src/utils/verifyDatabase.js
```

Expected output:
```
✅ Connected to MongoDB
✅ Email index exists
✅ TTL index exists
✅ User created successfully
✅ Test user cleaned up
🎉 All database checks passed!
```

If you see errors, the script will create missing indexes automatically.

---

## 📊 WHAT WAS FIXED

1. ✅ Existing users can now request OTP for login
2. ✅ OTP expiration time is now consistent (5 minutes)
3. ✅ Cookies work properly with correct sameSite setting
4. ✅ Login properly sets JWT cookie
5. ✅ Register properly sets JWT cookie
6. ✅ Email normalization (lowercase) everywhere
7. ✅ Better error messages

---

## 🐛 IF SOMETHING DOESN'T WORK

### OTP not received?
```bash
# Test email config
cd c:\Users\Harshit Mittal\Desktop\NexusBoard\server
node -e "
require('dotenv').config();
const nodemailer = require('nodemailer');
const t = nodemailer.createTransport({
  service: 'gmail',
  auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_APP_PASSWORD }
});
t.verify((e, s) => console.log(e || 'Email config is correct!'));
"
```

### Can't login after creating account?
1. Check browser DevTools → Application → Cookies
2. Should see a cookie named "token"
3. Check console for errors
4. Try clearing browser cache + cookies

### Test with API directly (Postman/curl):
```powershell
# 1. Send OTP
$body = @{ email = 'test@example.com' } | ConvertTo-Json
Invoke-RestMethod -Uri 'http://localhost:5000/api/auth/send-otp' -Method POST -Body $body -ContentType 'application/json'

# 2. Check your email for OTP, then verify (replace OTP_HERE)
$body = @{ email = 'test@example.com'; otp = 'OTP_HERE'; name = 'Test User'; password = 'test123' } | ConvertTo-Json
Invoke-RestMethod -Uri 'http://localhost:5000/api/auth/verify-otp' -Method POST -Body $body -ContentType 'application/json' -SessionVariable session

# 3. Login with password
$body = @{ email = 'test@example.com'; password = 'test123' } | ConvertTo-Json
Invoke-RestMethod -Uri 'http://localhost:5000/api/auth/login' -Method POST -Body $body -ContentType 'application/json'
```

---

## ✅ CONFIRMATION CHECKLIST

Test these and check them off:

- [ ] New user can signup with OTP + password
- [ ] Same user can login with email + password
- [ ] Same user can login with OTP (without password)
- [ ] Cookie is set (check DevTools)
- [ ] User stays logged in after page refresh
- [ ] Logout works and clears cookie
- [ ] Can't create two accounts with same email
- [ ] Wrong password shows correct error
- [ ] Invalid OTP shows correct error
- [ ] Expired OTP (wait 5+ min) shows correct error

---

## 📞 NEED HELP?

1. Check server terminal for errors
2. Check browser DevTools Console for errors
3. Run database verification script
4. Check [AUTH_FIXES_SUMMARY.md](./AUTH_FIXES_SUMMARY.md) for detailed info

---

**STATUS: ✅ ALL FIXES APPLIED**  
**ACTION: Test the flows above**  
**TIME TO TEST: 5 minutes**
