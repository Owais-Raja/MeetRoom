# MeetRoom — Architecture & Schema

## 1. System Overview

```
┌─────────────────┐        REST (JSON)        ┌──────────────────┐
│   Next.js App    │ ────────────────────────▶ │   FastAPI (REST)  │
│  (App Router)     │ ◀──────────────────────── │  meetings, users  │
│                    │                            └──────────────────┘
│                    │        WebSocket                     │
│                    │ ◀────────────────────────▶ Signaling Server
│                    │      (SDP/ICE relay)        (FastAPI WS)
└─────────────────┘                                        │
        │                                                    │
        └─────────────── WebRTC P2P media ───────────────────┘
                (audio/video flows directly between browsers)
```

Two separate transports, both served by the same FastAPI app:
- **REST API** — CRUD for users/meetings/participants, backed by SQLite (`meetroom.db`).
- **WebSocket signaling** — a thin relay so peers can exchange SDP offers/answers, ICE candidates, and host signals. FastAPI never touches media itself; it just passes signaling messages between browsers in the same meeting "room". Actual audio/video travels peer-to-peer (or via TURN if NAT blocks direct connection).

For >2 participants, MeetRoom uses a **mesh topology** (each peer connects to every other peer). It's the optimal choice for a peer-to-peer video call limited to small group sizes (4–6 max) and is standard without an SFU. In production, an SFU (LiveKit/mediasoup) would scale beyond ~6 participants.

---

## 2. Database Schema (SQLite / SQLAlchemy)

```sql
-- Single default user is seeded; schema still supports multiple users
CREATE TABLE users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    name          TEXT NOT NULL,
    email         TEXT UNIQUE NOT NULL,
    avatar_url    TEXT,
    created_at    DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE meetings (
    id                INTEGER PRIMARY KEY AUTOINCREMENT,
    meeting_code      TEXT UNIQUE NOT NULL,      -- e.g. "abc-defg-hij", used in join URL
    host_id           INTEGER NOT NULL REFERENCES users(id),
    title             TEXT NOT NULL,
    description       TEXT,
    meeting_type      TEXT NOT NULL CHECK(meeting_type IN ('instant','scheduled')),
    scheduled_at      DATETIME,                   -- NULL for instant meetings
    duration_minutes  INTEGER DEFAULT 30,
    status            TEXT NOT NULL DEFAULT 'scheduled'
                        CHECK(status IN ('scheduled','ongoing','ended','cancelled')),
    started_at        DATETIME,
    ended_at          DATETIME,
    created_at        DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE participants (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    meeting_id    INTEGER NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
    user_id       INTEGER REFERENCES users(id),   -- NULL if guest joined by display name only
    display_name  TEXT NOT NULL,
    role          TEXT NOT NULL DEFAULT 'participant' CHECK(role IN ('host','participant')),
    joined_at     DATETIME,
    left_at       DATETIME,
    is_muted      BOOLEAN DEFAULT 0,
    is_video_on   BOOLEAN DEFAULT 1
);

CREATE INDEX idx_meetings_code ON meetings(meeting_code);
CREATE INDEX idx_meetings_host ON meetings(host_id);
CREATE INDEX idx_participants_meeting ON participants(meeting_id);
```

**Design notes:**
- `meeting_code` is separate from the numeric PK — it's the public-facing, URL-safe identifier (e.g., `abc-defg-hij`). Raw numeric `id` is never exposed in URLs.
- `participants` is a join table with *extra attributes* (`joined_at`, `role`, `is_muted`, `is_video_on`) to maintain per-meeting per-user presence state.
- `status` transitions: `scheduled → ongoing → ended` (or `→ cancelled`). Driven by host actions (start/end meeting), while instant meetings start as `ongoing`.
- Soft state like `is_muted`/`is_video_on` lives in DB for host-control persistence and audit logging, while WebSocket events provide zero-latency live sync during call sessions.

---

## 3. REST API (FastAPI)

```
GET    /api/users/me                     → default seeded user (id=1)

POST   /api/meetings/instant             → create + start instant meeting, returns meeting_code
POST   /api/meetings/schedule             → create scheduled meeting
GET    /api/meetings/upcoming             → scheduled, status='scheduled'
GET    /api/meetings/recent               → status='ended', ordered by ended_at desc
GET    /api/meetings/{meeting_code}        → meeting details (for join validation)
POST   /api/meetings/{meeting_code}/join   → validate + create participant row, returns server-assigned role
POST   /api/meetings/{meeting_code}/end     → host ends meeting for all (sets status='ended')
DELETE /api/meetings/{meeting_code}/participants/{participant_id}  → host removes participant

WS     /ws/meetings/{meeting_code}?participant_id=...   → signaling channel
```

**Signaling message shape (over WebSocket):**
```json
{ 
  "type": "join" | "offer" | "answer" | "ice-candidate" | "leave" | "mute-toggle" | "mute-all" | "end-meeting" | "kick-participant",
  "from": "participant_id",
  "to": "participant_id | null",   // null = broadcast to room
  "payload": { ... }               // SDP, ICE candidate data, or host command payload
}
```
Server logic tracks active WebSockets grouped by `meeting_code` in memory (`ConnectionManager.active_rooms`) and relays signaling payloads transparently.

---

## 4. Frontend Structure (Next.js App Router)

```
app/
  layout.tsx                   → Root layout & metadata ("MeetRoom")
  page.tsx                     → Landing Dashboard (Live ticking clock, Action grid, Upcoming/Recent tabs)
  join/page.tsx                → Join page (code/URL input, display name entry, code extraction)
  schedule/page.tsx            → Schedule meeting form (title, description, date/time, duration)
  meeting/[code]/page.tsx      → Pre-join lobby (camera/mic preview, name confirm, role fetch)
  meeting/[code]/room/page.tsx → Meeting room (dynamic mesh video grid, controls, host participant drawer)

components/
  Navbar.tsx                   → Navigation bar with MeetRoom brand and user profile badge
  ActionButtons.tsx            → Quick meeting action cards (New Meeting, Join, Schedule, Share Screen)
  UpcomingMeetings.tsx         → Tabbed upcoming and recent meeting history cards with copy link

lib/
  api.ts                       → Typed fetch wrapper for FastAPI REST endpoints
  webrtc.ts                    → PeerConnection manager (createPeerConnection, handleOffer/Answer/ICE)
  signaling.ts                 → WebSocket client wrapper (SignalingClient)
```

**Key UX Flows:**
1. **Instant Meeting**: Dashboard → "New Meeting" → `POST /instant` → `/meeting/[code]` (Lobby: live camera preview, audio/video toggles) → "Join Meeting" → `/meeting/[code]/room` (Mesh video grid, Control Bar: Mute, Video, Participants, Leave).
2. **Join Meeting**: Dashboard → "Join" → `/join` → paste code/link + display name → `POST /join` (validates code & returns server-assigned role) → Redirect to `/meeting/[code]`.
3. **Schedule Meeting**: Dashboard → "Schedule" → `/schedule` form → `POST /schedule` → Redirect to dashboard → Meeting appears under **Upcoming** with "Copy Link".
4. **Host Controls**: Host opens Participants slide-over drawer → can trigger **Mute All**, **Remove Participant**, or **End Meeting for All**.

---

## 5. WebRTC Flow (Mesh Topology)

1. New participant connects to `/ws/meetings/{code}`, sends `join`.
2. Server broadcasts `join` to existing room members.
3. Each existing peer creates an `RTCPeerConnection`, creates an SDP `offer`, and sends via WS to the new peer.
4. New peer receives offer(s), creates its own `RTCPeerConnection` per peer, sets remote description, creates `answer`, and sends back.
5. Both sides exchange ICE candidates as discovered (`onicecandidate`).
6. `ontrack` fires on each peer → attaches incoming MediaStream to a dynamic video tile.
7. Local media obtained via `navigator.mediaDevices.getUserMedia({video: true, audio: true})`.
8. On leave/disconnect: sends `leave`, closes all peer connections, stops local media tracks.

NAT traversal utilizes public STUN servers (`stun:stun.l.google.com:19302`).

---

## 6. Deployment Notes
- **Frontend**: Vercel (Next.js App Router fit).
- **Backend (FastAPI + WebSockets)**: Render / Railway (persistent WebSocket connections & configurable CORS via `ALLOWED_ORIGINS`).
- **Database**: SQLite file (`meetroom.db`) on persistent volume.

---

## 7. Vertical Slice Status Matrix

| Slice | Description | Status |
|-------|-------------|--------|
| **1** | FastAPI + SQLAlchemy models + DB seed script + REST endpoints | ✅ COMPLETED |
| **2** | Next.js Dashboard UI (Navbar, Action Cards, Upcoming/Recent list) | ✅ COMPLETED |
| **3** | Instant meeting creation & Pre-Join Lobby | ✅ COMPLETED |
| **4** | Schedule meeting form & Dashboard integration | ✅ COMPLETED |
| **5** | Join flow with URL code extraction & validation | ✅ COMPLETED |
| **6** | WebRTC 1:1 Live Video Call over WebSocket signaling | ✅ COMPLETED |
| **7** | Multi-Participant WebRTC Mesh Call (3–6 grid layout) | ✅ COMPLETED |
| **8** | Host Controls (Mute All, Remove Participant, End Meeting) | ✅ COMPLETED |
| **9** | MeetRoom Rebranding, Live Clock, Server-Assigned Host Role, `.gitignore` & `.env.example` | ✅ COMPLETED |
