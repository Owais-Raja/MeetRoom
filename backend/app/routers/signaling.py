import json
import logging
from typing import Dict
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

logger = logging.getLogger("signaling")

router = APIRouter(tags=["signaling"])


class ConnectionManager:
    """
    In-memory WebSocket Room Manager for WebRTC Signaling.
    
    Design Note:
    - Tracks active WebSockets grouped by `meeting_code`.
    - `active_rooms`: Dict[meeting_code, Dict[participant_id, WebSocket]]
    - Server logic is a transparent relay: peers exchange SDP offers, SDP answers,
      and ICE candidates directly without the server inspecting or decoding media.
    """

    def __init__(self):
        self.active_rooms: Dict[str, Dict[str, WebSocket]] = {}

    async def connect(self, meeting_code: str, participant_id: str, websocket: WebSocket):
        """Accepts WebSocket connection and registers participant in meeting room."""
        await websocket.accept()
        if meeting_code not in self.active_rooms:
            self.active_rooms[meeting_code] = {}

        self.active_rooms[meeting_code][participant_id] = websocket
        logger.info(f"Participant '{participant_id}' connected to room '{meeting_code}'.")

        # Notify existing participants in the room that a new peer joined
        await self.broadcast(
            meeting_code=meeting_code,
            sender_id=participant_id,
            message={
                "type": "join",
                "from": participant_id,
                "to": None,
                "payload": {"participant_id": participant_id},
            },
        )

    def disconnect(self, meeting_code: str, participant_id: str):
        """Removes participant socket on disconnect or call leave."""
        if meeting_code in self.active_rooms:
            if participant_id in self.active_rooms[meeting_code]:
                del self.active_rooms[meeting_code][participant_id]
                logger.info(f"Participant '{participant_id}' removed from room '{meeting_code}'.")
            if not self.active_rooms[meeting_code]:
                del self.active_rooms[meeting_code]

    async def send_personal_message(self, message: dict, websocket: WebSocket):
        """Sends JSON payload to a specific participant's socket."""
        await websocket.send_text(json.dumps(message))

    async def relay_message(self, meeting_code: str, sender_id: str, target_id: str, message: dict):
        """Relays message directly to target peer socket if target_id specified, otherwise broadcasts."""
        if meeting_code in self.active_rooms:
            if target_id and target_id in self.active_rooms[meeting_code]:
                target_ws = self.active_rooms[meeting_code][target_id]
                await target_ws.send_text(json.dumps(message))
            else:
                await self.broadcast(meeting_code, sender_id, message)

    async def broadcast(self, meeting_code: str, sender_id: str, message: dict):
        """Broadcasts JSON payload to all participants in room except sender."""
        if meeting_code in self.active_rooms:
            message_json = json.dumps(message)
            for pid, ws in list(self.active_rooms[meeting_code].items()):
                if pid != sender_id:
                    try:
                        await ws.send_text(message_json)
                    except Exception as e:
                        logger.error(f"Error broadcasting to participant '{pid}': {e}")


manager = ConnectionManager()


@router.websocket("/ws/meetings/{meeting_code}")
async def websocket_signaling_endpoint(
    websocket: WebSocket,
    meeting_code: str,
    participant_id: str,
):
    """
    WebSocket endpoint for WebRTC signaling.
    Relays SDP offers, answers, and ICE candidates between peers in room.
    """
    await manager.connect(meeting_code, participant_id, websocket)

    try:
        while True:
            data_str = await websocket.receive_text()
            try:
                data = json.loads(data_str)
                msg_type = data.get("type")
                target_id = data.get("to")
                payload = data.get("payload", {})

                logger.debug(f"Relaying [{msg_type}] from '{participant_id}' to '{target_id}'")

                await manager.relay_message(
                    meeting_code=meeting_code,
                    sender_id=participant_id,
                    target_id=target_id,
                    message={
                        "type": msg_type,
                        "from": participant_id,
                        "to": target_id,
                        "payload": payload,
                    },
                )
            except json.JSONDecodeError:
                logger.warning("Received non-JSON message over signaling WebSocket.")

    except WebSocketDisconnect:
        manager.disconnect(meeting_code, participant_id)
        await manager.broadcast(
            meeting_code=meeting_code,
            sender_id=participant_id,
            message={
                "type": "leave",
                "from": participant_id,
                "to": None,
                "payload": {"participant_id": participant_id},
            },
        )
