"""Issue browser-safe, short-lived WebRTC ICE server configuration."""

import asyncio
import json
import os
from urllib.request import urlopen

from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse

router = APIRouter(tags=["turn"])


def fetch_turn_servers(credentials_url: str) -> list[dict]:
    """Fetch the provider response without ever exposing the provider API key."""
    with urlopen(credentials_url, timeout=10) as response:  # nosec B310 - URL is deployment-controlled env config
        payload = json.loads(response.read().decode("utf-8"))

    if not isinstance(payload, list) or not payload:
        raise ValueError("TURN provider returned no ICE servers")

    ice_servers = []
    for server in payload:
        if not isinstance(server, dict) or not server.get("urls"):
            continue
        # Return only fields understood by RTCPeerConnection. This prevents a
        # provider response from accidentally leaking unrelated metadata.
        ice_servers.append(
            {
                key: server[key]
                for key in ("urls", "username", "credential", "credentialType")
                if key in server
            }
        )

    if not ice_servers:
        raise ValueError("TURN provider returned invalid ICE servers")
    return ice_servers


@router.get("/api/turn-credentials")
async def get_turn_credentials():
    """Return temporary TURN credentials for a browser joining a meeting."""
    credentials_url = os.getenv("TURN_CREDENTIALS_URL")
    if not credentials_url:
        raise HTTPException(
            status_code=503,
            detail="TURN is not configured. Set TURN_CREDENTIALS_URL on the backend.",
        )

    try:
        ice_servers = await asyncio.to_thread(fetch_turn_servers, credentials_url)
    except Exception:
        # Do not expose provider URLs, API keys, or credentials in a client error.
        raise HTTPException(status_code=503, detail="TURN credentials are temporarily unavailable.")

    return JSONResponse(
        content={"iceServers": ice_servers},
        headers={"Cache-Control": "no-store"},
    )
