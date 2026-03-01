# How to run NexusBoard

Backend code is in the **server/** folder. Frontend is in **client/**.

## Option 1: One command (backend + frontend)

From the **project root** (NexusBoard folder):

```bash
npm install
npm run dev:all
```

Then open **http://localhost:5173** in your browser.  
If the backend prints a different port (e.g. 5001), edit `client/.env` and set:

- `VITE_API_URL=http://localhost:5001/api`
- `VITE_SOCKET_URL=http://localhost:5001`

Restart the client (Ctrl+C then run `npm run dev:all` again).

---

## Option 2: Two terminals

**Terminal 1 – backend**

```bash
cd NexusBoard
npm install
cd server && npm install
npm run dev
```

Wait until you see: `Server running on http://localhost:5000` (or 5001 if 5000 is in use).

**Terminal 2 – frontend**

```bash
cd NexusBoard/client
npm install
npm run dev
```

Open the URL Vite prints (usually **http://localhost:5173**).

---

## Important

- **Do not** open `client/dist/index.html` by double‑clicking. Use the dev server (`npm run dev` in client) or `npm run dev:all`.
- If you see “Backend unreachable”, start the backend with `npm run dev` (from root) or run `npm run dev` inside **server/**.
- Backend env vars (MONGO_URI, JWT_SECRET, PORT) go in **server/.env**.
- If you see “Open the app via a server”, you’re viewing the app from disk; use one of the run options above.
