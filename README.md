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
- **NAT Traversal & Relaying**: Redundant Public STUN & TURN Servers (`stun:stun.l.google.com:19302`, `turn:openrelay.metered.ca`) for cross-network and mobile connectivity.
- **In-Call Screen Sharing**: Real-time browser display capture (`getDisplayMedia`) with seamless WebRTC video track replacement.
- **In-Call Real-Time Chat**: Slide-over chat drawer with unread message counter badge and WebSocket messaging relay.
- **Host Authorization (`host_token`)**: Cryptographic secret token generated on meeting creation to enforce host privileges regardless of user display name.
- **Landing Page Settings**: Modal for viewing, updating, and persisting custom display names in SQLite and `localStorage`.
- **Share Meeting Modal**: Copy link, copy code, native share, and instant join triggers.

---

## 📁 Folder Structure Overview

```
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py          # FastAPI entrypoint & CORS middleware
│   │   ├── database.py      # SQLAlchemy SQLite engine & session setup
│   │   ├── models.py        # ORM models (User, Meeting, Participant)
│   │   ├── schemas.py       # Pydantic input/output schemas
│   │   └── routers/
│   │       ├── __init__.py
│   │       ├── users.py     # GET /me, PUT /me (Profile update)
│   │       ├── meetings.py  # GET /upcoming, /recent, POST /instant, /schedule, /join, /end
│   │       └── signaling.py # WS /ws/meetings/{code} WebSocket signaling router
│   ├── seed.py              # Re-runnable DB seed script
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
│   │   │       ├── page.tsx # Pre-Join Lobby page
│   │   │       └── room/page.tsx # Active Meeting Room (Video grid, Chat, Host controls)
│   │   ├── components/
│   │   │   ├── Navbar.tsx           # Top navigation bar & Settings trigger
│   │   │   ├── ActionButtons.tsx    # Dashboard action cards
│   │   │   ├── UpcomingMeetings.tsx # Tabbed upcoming/recent meeting list
│   │   │   ├── SettingsModal.tsx    # Profile display name modal
│   │   │   └── ShareMeetingModal.tsx # Share meeting link & code modal
│   │   └── lib/
│   │       ├── api.ts       # Typed API client wrapper for FastAPI
│   │       ├── signaling.ts # WebSocket signaling client
│   │       └── webrtc.ts    # STUN/TURN configuration & RTCPeerConnection factory
│   └── package.json
├── meetroom-architecture.md # Architecture specification document
└── README.md                # Project documentation
```

---

## 🗄️ Database Schema Summary

| Table | Purpose |
|-------|---------|
| `users` | Stores registered platform users (seeded with single default user `id=1`). |
| `meetings` | Tracks instant & scheduled meetings, host user ID, meeting codes (`abc-defg-hij`), secret `host_token`, status (`scheduled`, `ongoing`, `ended`), and timestamps. |
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
| `DELETE` | `/api/meetings/{meeting_code}/participants/{id}` | Host removes a participant |

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

# Seed database with sample data
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

---

## 🧪 How to Verify Core Features

1. **Display Name Settings**: On the dashboard (`http://localhost:3000`), click the Settings gear icon in the top right → change your display name → click **Save Changes**. Verify your name updates instantly.
2. **Instant Meeting & Share Modal**: Click **New Meeting** → observe the Share Meeting modal displaying full invite link and code → click **Copy Link** → click **Join Meeting Now**.
3. **In-Call Screen Sharing**: Inside an active call, click **Share Screen** → select a browser tab or desktop screen → observe the live screen stream. Click **Stop Share** to revert to camera feed.
4. **In-Call Real-Time Chat**: Open the Chat drawer (speech bubble icon) → type a message and press Enter → observe real-time message delivery across connected peers.
5. **Host Mute & Kick Controls**: As Host, open the Participants drawer (users icon) → click the Mic icon next to a participant to mute them (icon turns red `MicOff`) → click the Remove icon (`UserX`) to disconnect them.
