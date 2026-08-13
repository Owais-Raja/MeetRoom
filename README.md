# MeetRoom — WebRTC Video Meeting Platform

A full-stack video meeting platform built for high-quality real-time peer-to-peer video calls using WebRTC mesh topology, FastAPI WebSocket signaling server, and Next.js (App Router).

---

## 🌐 Live Deployment Links

- **Frontend Web Application (Vercel)**: [https://meetroom-scaler.vercel.app](https://meetroom-scaler.vercel.app)
- **Backend API & WebSocket Server (Render)**: [https://meetroom-77y7.onrender.com](https://meetroom-77y7.onrender.com)
- **GitHub Repository**: [https://github.com/Owais-Raja/MeetRoom](https://github.com/Owais-Raja/MeetRoom)

---

## 🛠️ Tech Stack & Features

- **Frontend**: Next.js 14+ (App Router, TypeScript, Tailwind CSS, Lucide React icons)
- **Backend**: FastAPI (Python 3.10+), Uvicorn ASGI Web Server
- **Database**: SQLite with SQLAlchemy 2.0 ORM & Pydantic v2 data validation
- **Real-Time Communication**: Native Browser WebRTC (`RTCPeerConnection`, `MediaStream`) with FastAPI WebSocket Signaling (`/ws/meetings/{code}`)
- **NAT Traversal & Relaying**: [Metered TURN / Open Relay](https://www.metered.ca/turn-server) — provides authenticated, short-lived TURN credentials that relay audio/video traffic when participants are on **different networks** (separate Wi-Fi, mobile data, corporate firewalls). Without TURN, WebRTC can only connect peers on the same local network via STUN.
- **In-Call Screen Sharing**: Real-time browser display capture (`getDisplayMedia`) with seamless WebRTC video track replacement.
- **In-Call Real-Time Chat**: Slide-over chat drawer with unread message counter badge and WebSocket messaging relay.
- **Host Authorization (`host_token`)**: Cryptographic secret token generated on meeting creation to enforce host privileges regardless of user display name.
- **Landing Page Settings**: Modal for viewing, updating, and persisting custom display names in SQLite and `localStorage`.
- **Share Meeting Modal**: Copy link, copy code, native share, and instant join triggers.
- **Schedule & Cancel Meetings**: Schedule future meetings with title, description, date/time, and duration. Cancel any scheduled meeting before it starts.

---

## 📁 Folder Structure Overview

```
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py          # FastAPI entrypoint, CORS middleware, TURN credentials proxy
│   │   ├── database.py      # SQLAlchemy SQLite engine & session setup
│   │   ├── models.py        # ORM models (User, Meeting, Participant)
│   │   ├── schemas.py       # Pydantic input/output schemas
│   │   └── routers/
│   │       ├── __init__.py
│   │       ├── users.py     # GET /me, PUT /me (Profile update)
│   │       ├── meetings.py  # Full meeting lifecycle: instant, schedule, cancel, join, end
│   │       └── signaling.py # WS /ws/meetings/{code} WebSocket signaling router
│   ├── seed.py              # Re-runnable DB seed script (creates default user id=1)
│   └── requirements.txt     # Python dependencies
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── globals.css  # Global Tailwind styles
│   │   │   ├── layout.tsx   # Root layout & page metadata
│   │   │   ├── page.tsx     # Landing Dashboard page
│   │   │   ├── join/        # Join meeting page
│   │   │   ├── schedule/    # Schedule meeting page
│   │   │   └── meeting/[code]/
│   │   │       ├── page.tsx      # Pre-Join Lobby page
│   │   │       └── room/page.tsx # Active Meeting Room (Video grid, Chat, Host controls)
│   │   ├── components/
│   │   │   ├── Navbar.tsx             # Top navigation bar & Settings trigger
│   │   │   ├── ActionButtons.tsx      # Dashboard action cards
│   │   │   ├── UpcomingMeetings.tsx   # Tabbed upcoming/recent meeting list with cancel button
│   │   │   ├── SettingsModal.tsx      # Profile display name modal
│   │   │   └── ShareMeetingModal.tsx  # Share meeting link & code modal
│   │   └── lib/
│   │       ├── api.ts       # Typed API client wrapper for all FastAPI routes
│   │       ├── signaling.ts # WebSocket signaling client
│   │       └── webrtc.ts    # STUN/TURN ICE configuration & RTCPeerConnection factory
│   └── package.json
├── meetroom-architecture.md # Architecture specification document
└── README.md                # Project documentation
```

---

## 🗄️ Database Schema Summary

| Table | Purpose |
|-------|---------|
| `users` | Stores registered platform users (seeded with single default user `id=1`). |
| `meetings` | Tracks instant & scheduled meetings, host user ID, meeting codes (`abc-defg-hij`), secret `host_token`, status (`scheduled`, `ongoing`, `ended`, `cancelled`), and timestamps. |
| `participants` | Presence table connecting meetings and users/guests with presence state (`joined_at`, `left_at`, `role`, `is_muted`, `is_video_on`). |

---

## 📡 API Endpoint List

### REST Endpoints (FastAPI)
| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/` | API status health check |
| `GET` | `/api/users/me` | Fetch current default logged-in user (`id=1`) |
| `PUT` | `/api/users/me` | Update default user profile name |
| `GET` | `/api/meetings/upcoming` | List upcoming scheduled meetings |
| `GET` | `/api/meetings/recent` | List past/ended meetings ordered by ended date |
| `GET` | `/api/meetings/{meeting_code}` | Get details for a specific meeting by URL code |
| `POST` | `/api/meetings/instant` | Create & start a new instant meeting |
| `POST` | `/api/meetings/schedule` | Schedule a future meeting |
| `POST` | `/api/meetings/{meeting_code}/join` | Validate code and register participant join |
| `POST` | `/api/meetings/{meeting_code}/end` | Host ends meeting for all participants |
| `POST` | `/api/meetings/{meeting_code}/cancel` | Cancel a scheduled meeting before it starts |
| `DELETE` | `/api/meetings/{meeting_code}/participants/{id}` | Host removes a participant |
| `GET` | `/api/turn-credentials` | Returns short-lived Metered TURN ICE server config (API key stays on backend) |

### WebSocket Endpoint
| Protocol | Path | Purpose |
|----------|------|---------|
| `WS` | `/ws/meetings/{meeting_code}?participant_id={id}` | WebRTC signaling relay channel (SDP offer/answer, ICE candidates, Chat, Host signals) |

---

## 🚀 Setup & Execution Instructions

### Prerequisites
- Python 3.10+
- Node.js 18+ & npm

### 1. Backend Setup & Running
```bash
# Navigate to backend directory
cd backend

# Create virtual environment (optional but recommended)
python -m venv venv
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
# source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Seed database with sample data (creates default user id=1)
python seed.py

# Start FastAPI development server on http://localhost:8000
uvicorn app.main:app --reload --port 8000
```

### 2. Frontend Setup & Running
```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Start Next.js development server
npm run dev
```

### 3. Environment Variables

#### Backend (`backend/.env` or Render Environment Variables)

| Variable | Required | Description |
|----------|----------|-------------|
| `TURN_CREDENTIALS_URL` | **Yes (production)** | Metered API URL to fetch TURN credentials. See section below. |
| `ALLOWED_ORIGINS` | Optional | Comma-separated list of allowed CORS origins (e.g. `https://meetroom-scaler.vercel.app`). |

#### Frontend (`.env.local` or Vercel Environment Variables)

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_API_URL` | **Yes (production)** | Full URL of the deployed backend, e.g. `https://meetroom-77y7.onrender.com` |
| `NEXT_PUBLIC_WS_HOST` | Optional | WebSocket host override, e.g. `meetroom-77y7.onrender.com` |

> ⚠️ `NEXT_PUBLIC_*` variables are baked into the frontend **at build time** by Next.js. If you change them on Vercel, you must trigger a new deployment (not just redeploy the cached build).

---

## 📡 Cross-Network Audio & Video — Metered TURN Setup

### Why Metered TURN is required

WebRTC uses **STUN** servers to discover a peer's public IP address and attempt a direct peer-to-peer connection. However, direct connections **fail** when participants are on:
- Different home Wi-Fi networks
- Mobile data (4G/5G)
- Corporate or university firewalls / symmetric NAT

In these cases, a **TURN (Traversal Using Relays around NAT) server** acts as a media relay — it forwards encrypted audio and video packets between peers when a direct path cannot be established.

MeetRoom uses **[Metered TURN / Open Relay](https://www.metered.ca/turn-server)** as its TURN provider. The backend fetches short-lived TURN credentials from Metered and exposes them to the browser via `/api/turn-credentials` — the API key **never leaves the backend**.

### How to configure it

1. **Sign up** at [metered.ca](https://www.metered.ca) → create a TURN server application → copy your **API key**.

2. **Set the following environment variable** on your Render backend service:
   ```
   TURN_CREDENTIALS_URL=https://<your-app-name>.metered.live/api/v1/turn/credentials?apiKey=<your-api-key>
   ```

3. **Redeploy** the Render service. The backend will proxy the credentials from Metered and serve them to the browser.

4. **Verify** by visiting:
   ```
   https://meetroom-77y7.onrender.com/api/turn-credentials
   ```
   You should see an `iceServers` JSON array — not a `503` error.

> ⚠️ Do **not** add `TURN_CREDENTIALS_URL` or your Metered API key to any `NEXT_PUBLIC_*` Vercel variable. It must remain server-side only.

### ICE Server priority in the browser

MeetRoom's [`webrtc.ts`](frontend/src/lib/webrtc.ts) loads servers in this order:
1. **Google STUN** (`stun.l.google.com:19302`) — for direct LAN/same-network calls
2. **Twilio STUN** (`global.stun.twilio.com:3478`) — secondary STUN fallback
3. **Metered TURN** (UDP + TCP + TLS) — relay for cross-network participants

---

## ⏰ Timezone Handling

Scheduled meeting times are entered and stored in the **user's local time zone**. There is no UTC conversion — the time you enter (e.g. `9:35 PM`) is exactly what gets stored and displayed back. This avoids offset errors for users in IST and other non-UTC zones.

---

## 🧪 How to Verify Core Features

1. **Display Name Settings**: On the dashboard, click the Settings gear icon → change your display name → click **Save Changes**.
2. **Instant Meeting & Share Modal**: Click **New Meeting** → observe the Share Meeting modal → copy the invite link → click **Join Meeting Now**.
3. **Schedule & Cancel a Meeting**: Click **Schedule Meeting** → fill in a future date/time → click **Schedule Meeting**. On the dashboard, click the **Cancel** button (×) next to any scheduled meeting to remove it.
4. **In-Call Screen Sharing**: Inside an active call, click **Share Screen** → select a browser tab or desktop screen. Click **Stop Share** to revert to camera feed.
5. **In-Call Real-Time Chat**: Open the Chat drawer → type a message → observe real-time delivery across peers.
6. **Host Mute & Kick Controls**: As Host, open the Participants drawer → click the Mic icon to mute a participant → click Remove (`UserX`) to disconnect them.
7. **Cross-Network Video Call**: Join from two devices on **different networks** (e.g. phone on mobile data, laptop on Wi-Fi) — audio and video should relay through Metered TURN. Verify TURN is active by checking `https://meetroom-77y7.onrender.com/api/turn-credentials` returns ICE server data.
