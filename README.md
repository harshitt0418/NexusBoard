<div align="center">

# NexusBoard

**Real-Time Collaborative Whiteboard & Video Platform**

[![Live Demo](https://img.shields.io/badge/Frontend-Vercel-black?logo=vercel)](https://nexusboard.vercel.app)
[![Backend](https://img.shields.io/badge/Backend-Render-46e3b7?logo=render)](https://nexusboard-poz9.onrender.com)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D18-brightgreen?logo=node.js)](https://nodejs.org)
[![React](https://img.shields.io/badge/React-18-61dafb?logo=react)](https://react.dev)

A production-grade, full-stack **MERN** application for real-time whiteboard collaboration with live video, chat, and granular drawing permissions — built with **Socket.io** and **WebRTC**.

</div>

---

---

## ✨ Features

### Whiteboard & Canvas
| Feature | Details |
|---|---|
| 🎨 **Freehand Drawing** | Smooth Bézier curves, 9 colors, 4 stroke widths |
| 🖌 **Temporary Brush** | Strokes that auto-fade and disappear after a few seconds |
| 🧹 **Segment-Aware Eraser** | Erases only the touched portion of a stroke — not the entire stroke |
| ↩️ **Undo / Redo** | Per-user undo stack synced to all participants |
| 📄 **PDF Import** | Upload a PDF — pages render as canvas background |
| 🔒 **Board Lock** | Host can lock the whiteboard for all participants |
| 🔄 **Zoom & Pan** | Pinch-to-zoom and drag-to-pan on the canvas |

### Collaboration
| Feature | Details |
|---|---|
| 👥 **Multi-User Sessions** | Real-time cursor sync and stroke broadcasts via Socket.io |
| 🎥 **Live Video** | Mesh WebRTC — video/audio for every participant |
| 💬 **Chat Panel** | Real-time chat with typing indicators and system messages |
| 🔐 **Draw Permissions** | Participants request access; host approves / revokes individually |
| 🔗 **Easy Sharing** | QR code + copyable Room ID generated on room creation |
| 👤 **Guest Access** | Join without an account — just enter a display name |

### Authentication
| Feature | Details |
|---|---|
| 📧 **Magic Link Verification** | Email verification via JWT magic link (no OTP) |
| 🔑 **Magic Link Password Reset** | Stateless password reset via time-limited JWT link |
| 🔵 **Google OAuth 2.0** | One-click sign-in with Google |
| 🍪 **JWT + Cookie Auth** | HttpOnly cookie with localStorage fallback |

---

## 🛠 Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 18, Vite 7, React Router v6, Tailwind CSS |
| **Backend** | Node.js, Express 5, Socket.io 4 |
| **Database** | MongoDB Atlas, Mongoose 8 |
| **Real-time** | Socket.io (WebSocket) |
| **Video** | WebRTC (mesh topology) |
| **Auth** | JWT, Passport.js (Google OAuth), express-session |
| **Email** | Brevo REST API (transactional email) |
| **Security** | Helmet, express-rate-limit, bcryptjs, HttpOnly cookies |
| **Deployment** | Vercel (frontend), Render (backend) |

---

## 📁 Project Structure

```
NexusBoard/
├── server/
│   ├── server.js                  # Express + Socket.io entry point
│   ├── package.json
│   └── src/
│       ├── config/
│       │   └── passport.js        # Google OAuth strategy
│       ├── controllers/
│       │   ├── authController.js  # register, login, magic links, Google OAuth
│       │   └── roomController.js  # create, join, end room
│       ├── middleware/
│       │   ├── auth.js            # JWT authentication middleware
│       │   └── errorHandler.js    # Centralized error handler
│       ├── models/
│       │   ├── User.js            # User schema (name, email, googleId, isVerified)
│       │   ├── Room.js            # Room schema
│       │   └── SessionLog.js      # Session activity log
│       ├── routes/
│       │   ├── auth.js            # Auth routes
│       │   └── rooms.js           # Room routes
│       ├── sockets/
│       │   └── index.js           # All Socket.io event handlers
│       └── utils/
│           ├── sendEmail.js       # Brevo REST API email sender
│           └── verifyDatabase.js  # DB connection check
│
└── client/
    ├── index.html
    ├── vite.config.js
    └── src/
        ├── App.jsx
        ├── pages/
        │   ├── LandingPage.jsx
        │   ├── DashboardPage.jsx
        │   ├── RegisterPage.jsx
        │   ├── NewLoginPage.jsx
        │   ├── VerifyEmailPage.jsx    # Magic link handler
        │   ├── ForgotPasswordPage.jsx
        │   ├── ResetPasswordPage.jsx
        │   ├── CreateRoomPage.jsx
        │   ├── JoinRoomPage.jsx
        │   ├── LobbyPage.jsx
        │   └── RoomPage.jsx
        ├── components/
        │   ├── canvas/
        │   │   ├── WhiteboardCanvas.jsx
        │   │   └── ToolPalette.jsx
        │   ├── chat/ChatPanel.jsx
        │   ├── video/VideoStrip.jsx
        │   ├── participants/ParticipantsPanel.jsx
        │   └── ui/                    # AuthLayout, Button, Input, Toast, Icons…
        ├── context/
        │   ├── AuthContext.jsx
        │   ├── RoomContext.jsx
        │   └── SocketContext.jsx
        ├── services/
        │   ├── api.js                 # Axios instance
        │   └── roomService.js
        └── utils/
            ├── recentRooms.js
            └── pdfToImage.js
```

---

## 🚀 Quick Start (Local Development)

### Prerequisites
- Node.js ≥ 18
- MongoDB (local or Atlas)
- A [Brevo](https://brevo.com) account (free tier) for email

### 1. Clone & Install

```bash
git clone https://github.com/harshitt0418/NexusBoard.git
cd NexusBoard

# Install root dependencies
npm install

# Install server dependencies
cd server && npm install && cd ..

# Install client dependencies
cd client && npm install && cd ..
```

### 2. Configure Backend Environment

Create `server/.env`:

```env
NODE_ENV=development
PORT=5000

MONGO_URI=mongodb://localhost:27017/nexusboard
# or Atlas: mongodb+srv://<user>:<pass>@cluster.mongodb.net/nexusboard

JWT_SECRET=your-64-char-random-secret-here
SESSION_SECRET=your-32-char-random-secret-here

# Magic link emails — points to your frontend
FRONTEND_URL=http://localhost:5173

# CORS — restrict to your frontend origin
CLIENT_URL=http://localhost:5173

# Google OAuth (optional — leave blank to disable)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
SERVER_URL=http://localhost:5000

# Brevo email service
BREVO_API_KEY=your-brevo-api-key
BREVO_SENDER_EMAIL=your-verified-sender@example.com
```

### 3. Configure Frontend Environment

Create `client/.env.local`:

```env
VITE_API_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
```

### 4. Run

```bash
# From project root — starts both server and client concurrently
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

---

## 🌐 Production Deployment

### Frontend → Vercel

1. Import the repository on [vercel.com](https://vercel.com)
2. Set **Root Directory** to `client`
3. Set **Build Command** to `npm run build`
4. Add environment variables:

```env
VITE_API_URL=https://your-backend.onrender.com/api
VITE_SOCKET_URL=https://your-backend.onrender.com
```

### Backend → Render

1. Create a new **Web Service** on [render.com](https://render.com)
2. Set **Root Directory** to `server`
3. Set **Build Command** to `npm install`
4. Set **Start Command** to `node server.js`
5. Add all environment variables from the table below:

| Variable | Description |
|---|---|
| `NODE_ENV` | `production` |
| `PORT` | `5000` (Render sets this automatically) |
| `MONGO_URI` | MongoDB Atlas connection string |
| `JWT_SECRET` | 64-char random hex string |
| `SESSION_SECRET` | 32-char random hex string |
| `FRONTEND_URL` | Your Vercel frontend URL |
| `CLIENT_URL` | Same as `FRONTEND_URL` |
| `SERVER_URL` | Your Render backend URL |
| `GOOGLE_CLIENT_ID` | Google Cloud Console OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Google Cloud Console OAuth client secret |
| `BREVO_API_KEY` | Brevo transactional email API key |
| `BREVO_SENDER_EMAIL` | Verified sender email in Brevo |

> **Generate secrets:**
> ```bash
> node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
> ```

---

## 🔌 API Reference

### Auth Routes

| Method | Route | Auth | Description |
|---|---|---|---|
| `POST` | `/api/auth/register` | — | Register → sends verification magic link |
| `GET` | `/api/auth/verify-email?token=` | — | Verify email from magic link |
| `POST` | `/api/auth/login` | — | Login → sets JWT cookie |
| `GET` | `/api/auth/me` | JWT | Get current user |
| `POST` | `/api/auth/forgot-password` | — | Send password reset magic link |
| `POST` | `/api/auth/reset-password` | — | Reset password with JWT token |
| `GET` | `/api/auth/google` | — | Initiate Google OAuth |
| `GET` | `/api/auth/google/callback` | — | Google OAuth callback |
| `POST` | `/api/auth/logout` | JWT | Clear auth cookie |

### Room Routes

| Method | Route | Auth | Description |
|---|---|---|---|
| `POST` | `/api/rooms` | Optional | Create room |
| `GET` | `/api/rooms/:id` | — | Get room info |
| `POST` | `/api/rooms/:id/join` | Optional | Join room |
| `POST` | `/api/rooms/:id/end` | Host | End session |

---

## 🔌 Socket.io Events

| Event | Direction | Description |
|---|---|---|
| `join_room` | Client → Server | Join a room session |
| `leave_room` | Client → Server | Leave and clean up |
| `board_draw` | Bidirectional | Stroke start / move / end broadcast |
| `board_clear` | Host → All | Clear the entire canvas |
| `board_undo` | Bidirectional | Undo last stroke |
| `stroke_partial_erase` | Bidirectional | Erase only a segment of a stroke |
| `cursor_move` | Bidirectional | Cursor position broadcast |
| `request_draw_access` | Participant → Host | Request drawing permission |
| `approve_draw_access` | Host → Participant | Grant drawing permission |
| `reject_draw_access` | Host → Participant | Deny drawing permission |
| `revoke_draw_access` | Host → Participant | Remove drawing permission |
| `lock_board` | Host → All | Toggle board lock |
| `chat_message` | Bidirectional | Send / receive chat message |
| `user_typing` | Bidirectional | Typing indicator |
| `end_session` | Host → All | End the session |
| `webrtc_offer` | Peer → Peer | WebRTC SDP offer |
| `webrtc_answer` | Peer → Peer | WebRTC SDP answer |
| `webrtc_ice` | Peer → Peer | ICE candidate exchange |

---

## 🖋 Authentication Flow

### Magic Link (Email/Password)

```
Register → email sent with JWT link (/verify-email?token=...)
           → user clicks link → isVerified = true → can now login
Login    → JWT cookie set (HttpOnly, Secure in production)
           → localStorage fallback for cross-origin
```

### Password Reset

```
Forgot Password → email sent with JWT link (/reset-password?token=...)
                → user clicks link → enters new password → saved
```

### Google OAuth

```
/api/auth/google → Google consent screen
                 → /api/auth/google/callback
                 → JWT cookie set → redirect to frontend /
```

---

## 🔒 Security

- **HTTP-only cookies** — JWT never accessible via JavaScript
- **CORS** — locked to known origins in production
- **Helmet** — security headers on all responses
- **Rate limiting** — 10 req/min on auth, 30 logins/hour
- **bcryptjs** — passwords hashed with salt rounds
- **JWT magic links** — short-lived (10 min expiry), single-purpose (`purpose` claim)
- **Input validation** — on all API endpoints
- **Express 5** — async errors auto-forwarded to error handler

---

## 📄 License

MIT © 2026 [Harshit Mittal](https://github.com/harshitt0418)

