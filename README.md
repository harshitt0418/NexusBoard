# NexusBoard

A production-level **Real-Time Whiteboard + Video Collaboration** web app built with **MERN stack**, **Socket.io**, and **WebRTC**.

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- MongoDB (local or Atlas)

### 1. Backend Setup

```bash
cd NexusBoard
npm install
# Edit .env with your MongoDB URI
npm run dev       # Starts on port 5000
```

### 2. Frontend Setup

```bash
cd client
npm install
# Edit .env with your API URL if needed
npm run dev       # Starts on port 5173
```

Open `http://localhost:5173`

---

## 📁 Project Structure

```
NexusBoard/
├── server.js              # Express + Socket.io entry
├── .env                   # Backend env vars
├── src/
│   ├── controllers/       # authController, roomController
│   ├── middleware/        # auth.js (JWT), errorHandler.js
│   ├── models/            # User, Room, SessionLog
│   ├── routes/            # auth.js, rooms.js
│   └── sockets/           # index.js (all socket events)
└── client/
    └── src/
        ├── pages/         # LandingPage, AuthPage, CreateRoom, JoinRoom, Lobby, RoomPage
        ├── components/
        │   ├── canvas/    # WhiteboardCanvas, ToolPalette
        │   ├── chat/      # ChatPanel
        │   ├── video/     # VideoStrip
        │   └── participants/  # ParticipantsPanel
        ├── context/       # AuthContext, RoomContext, SocketContext
        ├── services/      # api.js (axios), roomService.js
        └── hooks/         # (extendable)
```

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| 🎨 Whiteboard | Infinite canvas, smooth Bézier strokes, eraser, undo/redo |
| 🖌 Tools | Pen, eraser, color picker (9 colors), 4 stroke widths |
| 👥 Multi-user | Real-time cursor sync, stroke broadcasts via Socket.io |
| 🔐 Permissions | Host can grant/revoke draw access; participants request it |
| 🔒 Board lock | Host can lock the board for all participants |
| 💬 Chat | Real-time chat with typing indicators and system messages |
| 🎥 Video | WebRTC peer connections with mute/camera toggle |
| 🔗 Share | QR code + copyable Room ID on creation |
| 👤 Guest | No registration needed to join rooms |
| ⌨️ Shortcuts | `F` = focus mode, `Ctrl+Z` = undo |

---

## 🔌 Socket Events

| Event | Description |
|-------|-------------|
| `join_room` | Join a socket.io room |
| `leave_room` | Leave and cleanup |
| `board_draw` | Stroke/move/end broadcast |
| `board_clear` | Host clears the canvas |
| `board_undo` | Undo last stroke |
| `cursor_move` | Cursor position broadcast |
| `request_draw_access` | Participant asks to draw |
| `approve_draw_access` | Host approves |
| `reject_draw_access` | Host rejects |
| `revoke_draw_access` | Host revokes |
| `lock_board` | Toggle board lock |
| `chat_message` | Real-time chat |
| `user_typing` | Typing indicator |
| `end_session` | Host ends session |
| `webrtc_offer/answer/ice` | WebRTC signaling |

---

## 🌐 API Routes

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| POST | `/api/auth/register` | — | Register |
| POST | `/api/auth/login` | — | Login → JWT |
| GET  | `/api/auth/me` | JWT | Get current user |
| POST | `/api/rooms` | Optional | Create room |
| GET  | `/api/rooms/:id` | — | Get room info |
| POST | `/api/rooms/:id/join` | Optional | Join room |
| POST | `/api/rooms/:id/end` | Host | End session |

---

## 🎨 Design System

Light theme with CSS custom properties:
- Background: `#F8FAFC`
- Accent: `#3B82F6` (Blue-500)
- Surface: `#FFFFFF`
- Soft shadows, rounded corners (8–24px)
- Inter font, smooth transitions

---

## 📱 Responsiveness

| Breakpoint | Layout |
|-----------|--------|
| Desktop ≥1280px | Full multi-panel layout |
| Tablet 768–1279px | Side panels as collapsible drawers |
| Mobile <768px | Full-screen canvas, bottom FAB |
