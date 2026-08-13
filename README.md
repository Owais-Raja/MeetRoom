# MeetRoom — WebRTC Video Meeting Platform

A full-stack video meeting platform built for high-quality real-time peer-to-peer video calls using WebRTC mesh topology, FastAPI WebSocket signaling server, and Next.js (App Router).

---

## 🛠️ Tech Stack

- **Frontend**: Next.js 14+ (App Router, TypeScript, Tailwind CSS, Lucide React icons)
- **Backend**: FastAPI (Python 3.10+), Uvicorn ASGI Web Server
- **Database**: SQLite with SQLAlchemy 2.0 ORM & Pydantic v2 data validation
- **Real-Time Communication**: Native Browser WebRTC (RTCPeerConnection, MediaStreams) with FastAPI WebSocket Signaling (`/ws/meetings/{code}`)
- **NAT Traversal**: Public STUN Servers (`stun:stun.l.google.com:19302`)

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
│   │       ├── users.py     # GET /api/users/me
│   │       └── meetings.py  # GET /upcoming, /recent, /{meeting_code}
│   ├── seed.py              # Re-runnable DB seed script
│   └── requirements.txt     # Python dependencies
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── globals.css  # Global Tailwind styles
│   │   │   ├── layout.tsx   # Root layout
│   │   │   └── page.tsx     # Landing Dashboard page
│   │   ├── components/
│   │   │   ├── Navbar.tsx           # Navigation bar with user badge
│   │   │   ├── ActionButtons.tsx    # Meeting action cards
│   │   │   └── UpcomingMeetings.tsx # Tabbed upcoming/recent list
│   │   └── lib/
│   │       └── api.ts       # Typed API client wrapper for FastAPI
│   └── package.json
├── meetroom-architecture.md   # Architecture specification document
└── README.md                # Project documentation
```

---

## 🗄️ Database Schema Summary

| Table | Purpose |
|-------|---------|
| `users` | Stores registered platform users (seeded with single default user `id=1`). |
| `meetings` | Tracks instant & scheduled meetings, host user ID, meeting codes (`abc-defg-hij`), lifecycle status (`scheduled`, `ongoing`, `ended`), and timestamps. |
| `participants` | Join table connecting meetings and users/guests with presence state (`joined_at`, `left_at`, `role`, `is_muted`, `is_video_on`). |

---

## 📡 API Endpoint List

### REST Endpoints (FastAPI)
| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/` | API status health check |
| `GET` | `/api/users/me` | Fetch current default logged-in user (`id=1`) |
| `GET` | `/api/meetings/upcoming` | List upcoming scheduled meetings |
| `GET` | `/api/meetings/recent` | List past/ended meetings ordered by ended date |
| `GET` | `/api/meetings/{meeting_code}` | Get details for a specific meeting by URL code |
| `POST` | `/api/meetings/instant` | Create & start a new instant meeting *(Slice 3)* |
| `POST` | `/api/meetings/schedule` | Schedule a future meeting *(Slice 4)* |
| `POST` | `/api/meetings/{meeting_code}/join` | Validate and register participant join *(Slice 5)* |
| `POST` | `/api/meetings/{meeting_code}/end` | Host ends meeting *(Slice 8)* |
| `DELETE` | `/api/meetings/{meeting_code}/participants/{id}` | Host removes a participant *(Slice 8)* |

### WebSocket Endpoint
| Protocol | Path | Purpose |
|----------|------|---------|
| `WS` | `/ws/meetings/{meeting_code}?participant_id={id}` | WebRTC signaling relay channel (SDP offer/answer, ICE candidates, state sync) |

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

# Install dependencies (Next.js, Tailwind, Lucide React, date-fns)
npm install

# Start Next.js development server
npm run dev
```

---

## 🧪 How to Verify Core Features

### Verify Slice 1 (Backend REST API & Seed Data)
1. Run the seed script: `python backend/seed.py`
2. Start FastAPI backend: `uvicorn app.main:app --reload --port 8000` (from `backend/` folder)
3. Open Swagger UI at [http://localhost:8000/docs](http://localhost:8000/docs)

### Verify Slice 2 (Next.js Landing Dashboard)
1. Start FastAPI backend on port 8000: `uvicorn app.main:app --reload --port 8000` (from `backend/` folder)
2. Start Next.js frontend dev server: `npm run dev` (from `frontend/` folder)
3. Open [http://localhost:3000](http://localhost:3000) in your browser:
   - Check navbar displays `Default User`.
   - Click between **Upcoming** and **Recent / History** tabs to test backend fetch.

### Verify Slice 3 (Instant Meeting & Pre-Join Lobby)
1. On the dashboard (`http://localhost:3000`), click **New Meeting**.
2. Verify instant meeting creation and redirect to `/meeting/abc-defg-hij` (Pre-Join Lobby).
3. Test live camera preview, mic toggle, and camera toggle buttons.
4. Click **Join Meeting** to enter the meeting room shell (`/meeting/abc-defg-hij/room`).
5. Click **Leave** to return to dashboard.

### Verify Slice 4 (Schedule Meeting Form & Upcoming Meetings)
1. On the dashboard (`http://localhost:3000`), click **Schedule**.
2. Fill out the meeting title, optional description, date/time, and duration.
3. Click **Schedule Meeting**.
4. Verify auto-redirection back to `/` dashboard and verify your newly scheduled meeting appears in the **Upcoming Meetings** list.
5. Click **Copy Link** on the newly scheduled meeting card to verify invite URL copying.

### Verify Slice 5 (Join Flow & Code Validation)
1. On the dashboard (`http://localhost:3000`), click **Join** (or navigate to `http://localhost:3000/join`).
2. Paste a meeting code (e.g. `sync-team-101`) or full URL (`http://localhost:3000/meeting/sync-team-101`).
3. Enter your display name and click **Join Meeting**.
4. Verify validation success and automatic redirection to the Pre-Join Lobby (`/meeting/sync-team-101`).

### Verify Slice 6 (WebRTC 1:1 Live Video Call)
1. Start FastAPI backend and Next.js frontend (`http://localhost:8000` & `http://localhost:3000`).
2. Open **Tab 1** (`http://localhost:3000`), click **New Meeting**, and click **Join Meeting** in lobby to enter room.
3. Copy the meeting code (e.g. `abc-defg-hij`).
4. Open **Tab 2** (an Incognito tab or second browser window), navigate to `http://localhost:3000/join`, paste the meeting code, and click **Join Meeting**.
5. Observe live P2P audio and video stream flowing between Tab 1 and Tab 2!

### Verify Slice 7 (WebRTC Multi-Participant Mesh Call)
1. In the same active meeting room from Slice 6, open a **Tab 3** and **Tab 4** (using additional browser windows / private windows).
2. Join the meeting code from Tab 3 and Tab 4.
3. Observe all 3 or 4 video tiles scaling and arranging dynamically into a responsive grid layout!
4. Close one tab and verify its video tile is cleanly removed from all remaining connected peers.

### Verify Slice 8 (Host Controls & Room Management)
1. Start an instant meeting as Host (Tab 1) and join as Guest (Tab 2).
2. On Tab 1 (Host), open the Participants drawer (click `Users` icon).
3. Test **Mute All**: Click **Mute All Participants** and observe Tab 2 automatically mutes audio.
4. Test **Remove Participant**: Click the remove icon next to Guest on Tab 1 and observe Tab 2 is disconnected and redirected to home.
5. Test **End Meeting for All**: Click **End Meeting for All** on Tab 1 and observe all participants are disconnected and meeting status is updated to `ended` in SQLite database.

### Verify Slice 9 (Final Polish & UX Pass)
1. Verify live real-time updating clock and date on Dashboard (`http://localhost:3000`).
2. Test responsive layout on mobile, tablet, and desktop viewports.
3. Confirm 0 build errors across all routes via `npm run build` in `frontend/`.

---

## 🧠 Assumptions Made
1. **Simplified Auth**: Single default user (`id=1`) seeded for seamless demo without full JWT/OAuth auth overhead.
2. **Mesh Topology**: P2P mesh connection where every client establishes a peer connection with every other client (optimal for 2–6 participants).
3. **STUN Only**: Uses Google public STUN servers for NAT traversal. Relies on non-symmetric NATs typical of home/office networks.

---

## ⚠️ Known Limitations & Production Enhancements
- **Mesh Scalability**: Mesh topology bandwidth scales $O(N^2)$. Production systems for >6 participants use a Selective Forwarding Unit (SFU) like LiveKit or Mediasoup.
- **NAT Traversal**: Strict corporate firewalls require a TURN server (relay) with authentication (Coturn / Twilio Network Traversal).
- **Persistent Signaling**: Current WebSocket connections use in-memory room tracking; production calls use Redis Pub/Sub for multi-instance backend scaling.
