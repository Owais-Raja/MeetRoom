# Zoom Clone — Architecture & Schema

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
- **REST API** — CRUD for users/meetings/participants, backed by SQLite.
- **WebSocket signaling** — a thin relay so peers can exchange SDP offers/answers and ICE candidates. FastAPI never touches media itself; it just passes signaling messages between browsers in the same meeting "room". Actual audio/video travels peer-to-peer (or via TURN if NAT blocks direct connection).

For >2 participants, use a **mesh topology** (each peer connects to every other peer). It's the correct choice for a mesh call limited to small group sizes (say 4–6 max) and is the standard approach without an SFU. Mention in your README that a production version would use an SFU (LiveKit/mediasoup) for scaling beyond ~6 participants — this is a great thing to say out loud in the interview.

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

**Design notes to be ready to explain:**
- `meeting_code` is separate from the numeric PK — it's the public-facing, URL-safe, unguessable-ish identifier (Zoom does the same with its 9–11 digit meeting IDs). Never expose the raw `id` in URLs.
- `participants` is a join table with *extra attributes* (joined_at, role, mute state) — not a plain many-to-many, because you need per-meeting per-user state.
- `status` transitions: `scheduled → ongoing → ended` (or `→ cancelled`). Driven by host actions (start/end meeting) and instant meetings skip straight to `ongoing`.
- Soft state like `is_muted`/`is_video_on` lives in DB for host-control features (mute all) but in a real-time call the source of truth during the call is actually the WebSocket/WebRTC layer — DB is for persistence/history, not live sync.

---

## 3. REST API (FastAPI)

```
GET    /api/users/me                     → default seeded user

POST   /api/meetings/instant             → create + start instant meeting, returns meeting_code
POST   /api/meetings/schedule             → create scheduled meeting
GET    /api/meetings/upcoming             → scheduled, status='scheduled', scheduled_at >= now
GET    /api/meetings/recent               → status='ended', ordered by ended_at desc
GET    /api/meetings/{meeting_code}        → meeting details (for join validation)
POST   /api/meetings/{meeting_code}/join   → validate + create participant row, returns join token
POST   /api/meetings/{meeting_code}/end     → host ends meeting (sets status/ended_at)
DELETE /api/meetings/{meeting_code}/participants/{participant_id}  → host removes participant

WS     /ws/meetings/{meeting_code}?participant_id=...   → signaling channel
```

**Signaling message shape (over the WebSocket), keep it minimal:**
```json
{ "type": "join" | "offer" | "answer" | "ice-candidate" | "leave" | "mute-toggle",
  "from": "participant_id",
  "to": "participant_id | null",   // null = broadcast to room (e.g. join/leave)
  "payload": { ... }               // SDP or ICE candidate data
}
```
Server logic is intentionally dumb: track which participant_ids are connected to which meeting_code room (in-memory dict, not DB), and relay messages to the right socket(s). This is the whole "signaling server" — no media logic.

---

## 4. Frontend Structure (Next.js App Router)

```
app/
  page.tsx                    → Dashboard (New/Join/Schedule buttons, upcoming/recent lists)
  join/page.tsx                → Join by code/link + display name entry
  schedule/page.tsx            → Schedule meeting form
  meeting/[code]/page.tsx      → Pre-join lobby (camera/mic preview, name confirm)
  meeting/[code]/room/page.tsx → Actual meeting room (video grid, controls)

components/
  dashboard/{Navbar, MeetingCard, NewMeetingModal}
  meeting/{VideoTile, ControlBar, ParticipantList, ChatPanel(optional)}
  shared/{Button, Modal, TimePicker}

lib/
  api.ts          → typed fetch wrapper for FastAPI REST endpoints
  webrtc.ts        → PeerConnection manager (createPeerConnection, handleOffer/Answer/ICE)
  signaling.ts     → WebSocket client wrapper
```

**Key UX flow to replicate Zoom:**
1. Dashboard → click "New Meeting" → POST instant → redirect to `/meeting/[code]` (lobby, camera preview, mic test) → "Join" → `/meeting/[code]/room` (grid + control bar: mute, video, participants, leave).
2. "Join Meeting" → modal asks for code/link + display name → validates via GET before allowing join.
3. "Schedule Meeting" → form → POST → appears in dashboard's Upcoming list with a "Copy invite link" button.

---

## 5. WebRTC Flow (per new participant joining an active room)

1. New participant connects to `/ws/meetings/{code}`, sends `join`.
2. Server broadcasts `join` to existing participants.
3. Each existing peer creates an `RTCPeerConnection`, creates an SDP `offer`, sends via WS to the new peer.
4. New peer receives offer(s), creates its own `RTCPeerConnection` per peer, sets remote description, creates `answer`, sends back.
5. Both sides exchange ICE candidates as they're discovered (`onicecandidate`).
6. `ontrack` fires on each side → attach incoming MediaStream to a `<video>` tile.
7. Local media via `navigator.mediaDevices.getUserMedia({video:true, audio:true})`, attached to local tile.
8. On leave/tab close: send `leave`, close all peer connections, stop local tracks.

For NAT traversal beyond simple cases, note in your README that you're using public STUN servers (e.g. Google's `stun:stun.l.google.com:19302`) for ICE — good enough for most local/demo network conditions; a TURN server would be the production add-on for restrictive NATs.

---

## 6. Deployment Notes
- Frontend → Vercel (Next.js native fit)
- Backend (FastAPI + WebSocket) → Render or Railway (Vercel serverless functions don't hold persistent WebSocket connections well — this is worth knowing/explaining)
- SQLite file needs a persistent disk on whichever backend host you pick (Render/Railway both support a persistent volume) — SQLite on ephemeral storage will reset on redeploy.

---

## 7. Suggested Build Order (vertical slices, each independently demoable)
1. FastAPI + SQLAlchemy models + seed script → confirm schema with a few curl calls.
2. Dashboard UI (static, then wired to `/upcoming` and `/recent`).
3. Instant meeting create + redirect flow (no video yet — just the room shell).
4. Schedule meeting form + list.
5. Join flow + validation.
6. WebRTC 1:1 call (get two browser tabs talking before worrying about >2 peers).
7. Extend to mesh for 3+ participants.
8. Host controls (mute all / remove participant) — bonus.
9. Responsive polish + Zoom-accurate styling pass.
