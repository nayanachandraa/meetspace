# MeetSpace — Video Communication & Collaboration Platform

A working WebRTC mesh video-call app with chat, file sharing, whiteboard,
JWT auth, and post-meeting reports. Built as MVP versions of the three
project parts (WebRTC core, backend services, frontend/deployment).

## Stack
- **Frontend:** React + Vite, react-router, socket.io-client
- **Backend:** Node.js, Express, Socket.io, MongoDB (Mongoose), JWT, bcrypt, Multer
- **Realtime:** Native `RTCPeerConnection` mesh (good for up to ~6-8 people per room)

## What's included vs. what to extend
Included: signaling, mesh WebRTC, screen share, mute/camera toggle, JWT auth
with refresh tokens, room create/join/end, real-time chat with file upload,
typing indicators, collaborative whiteboard, participant list, attendance
tracking (join/leave timestamps per user), and a downloadable **PDF session
report** (duration, attendance, full chat transcript, whiteboard note).

Not included (noted in the original spec as advanced/optional — add later
if you need them): simulcast/SVC bandwidth adaptation, server-side
recording (mediasoup/kurento), emailing the report automatically, Redux
state management (plain React state is used instead), Cypress/Jest test
suites, Sentry/LogRocket monitoring. The code is structured so each of
these can be dropped in without restructuring.

---

## 1. Local Setup

### Prerequisites
- Node.js 18+
- A MongoDB database — either local (`mongodb://localhost:27017`) or a free
  [MongoDB Atlas](https://www.mongodb.com/cloud/atlas/register) cluster (recommended, works from anywhere)

### Backend
```bash
cd server
npm install
cp .env.example .env
# edit .env: set MONGO_URI, JWT_SECRET, JWT_REFRESH_SECRET
npm run dev        # starts on http://localhost:5000
```

### Frontend
```bash
cd client
npm install
cp .env.example .env
# defaults already point to http://localhost:5000, edit if needed
npm run dev         # starts on http://localhost:5173
```

Open two browser windows/tabs at `http://localhost:5173`, sign up two
different accounts, create a meeting in one, join with the room code in
the other.

---

## 2. Deployment

### Step 1 — Database: MongoDB Atlas
1. Create a free cluster at mongodb.com/cloud/atlas
2. Add a database user (username/password)
3. Network Access → Allow access from anywhere (`0.0.0.0/0`) for simplicity,
   or restrict to your backend host's IP later
4. Copy the connection string into `MONGO_URI`

### Step 2 — Backend: Render (or Railway/Heroku/EC2)
Using [Render](https://render.com) as the easiest path:
1. Push this repo to GitHub
2. New → Web Service → connect the repo, root directory = `server`
3. Build command: `npm install`
4. Start command: `npm start`
5. Add environment variables from `.env.example` (use real secrets,
   generate them with `openssl rand -hex 32`)
6. Set `CLIENT_URL` to your deployed frontend URL (Step 3) once you have it
7. Deploy — note the resulting URL, e.g. `https://meetspace-api.onrender.com`

### Step 3 — Frontend: Vercel or Netlify
1. New Project → import the same repo, root directory = `client`
2. Build command: `npm run build`, output directory: `dist`
3. Environment variables:
   - `VITE_API_URL=https://meetspace-api.onrender.com`
   - `VITE_SOCKET_URL=https://meetspace-api.onrender.com`
4. Deploy — you'll get a URL like `https://meetspace.vercel.app`
5. Go back to the backend's `CLIENT_URL` env var and set it to this exact
   URL, then redeploy the backend (needed for CORS + Socket.io to accept
   requests from your frontend)

### Step 4 — TURN server (important for real-world deployment)
The STUN server in `useWebRTC.js` (`stun:stun.l.google.com:19302`) is
enough for testing on the same network, but many real users are behind
NATs/firewalls that require a TURN relay, or calls will fail to connect.
Use a free tier from [Metered](https://www.metered.ca/tools/openrelay/) or
run your own with [coturn](https://github.com/coturn/coturn), then add it
to the `iceServers` array in `client/src/hooks/useWebRTC.js`:
```js
{ urls: 'turn:your-turn-host:3478', username: 'user', credential: 'pass' }
```

### Step 5 — Verify
- Visit your frontend URL, sign up, create a meeting, open the room link
  in another device/network to confirm the TURN server kicks in properly.

---

## 3. Project Structure
```
server/
  server.js              # entry point, mounts routes + Socket.io
  models/                # Mongoose schemas: User, Room, Message, Session
  controllers/           # auth + room business logic
  routes/                # /api/auth, /api/rooms, /api/upload
  middleware/verifyToken.js
  sockets/                # signaling.js (WebRTC), chatSocket.js, whiteboardSocket.js
client/
  src/
    pages/               # Login, Dashboard, Lobby, Room, Reports
    components/          # VideoGrid, ChatPanel, ControlsBar, Whiteboard, UserList
    hooks/                # useWebRTC.js (peer mesh logic), useSocket.js
    context/AuthContext.jsx
```

## 4. API Reference

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | /api/auth/register | — | Create account |
| POST | /api/auth/login | — | Log in |
| POST | /api/auth/refresh | — | Rotate access token |
| GET | /api/auth/me | ✓ | Current user |
| POST | /api/rooms | ✓ | Create a room |
| GET | /api/rooms/:id | ✓ | Get room by id or room code |
| DELETE | /api/rooms/:id | ✓ (host only) | End meeting, generate session |
| GET | /api/rooms/reports/:sessionId | ✓ | Get session report (JSON) |
| GET | /api/rooms/reports/:sessionId/pdf | ✓ | Download session report as PDF |
| POST | /api/upload | ✓ | Upload a chat file (multipart, field `file`) |

**Socket.io events:** `join-room`, `send-offer`/`receive-offer`,
`send-answer`/`receive-answer`, `ice-candidate`, `user-joined`/`user-left`,
`chat-message`, `typing-start`/`typing-stop`, `draw-start`/`draw-move`/`draw-end`,
`whiteboard-clear`.
