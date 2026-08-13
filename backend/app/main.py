from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import engine, Base
from app.routers import users, meetings, signaling

# Ensure tables exist on startup (seed script handles full table creation/reset)
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="MeetRoom API",
    description="Backend API for MeetRoom Video Meeting Platform with REST endpoints and WebSocket WebRTC signaling.",
    version="1.0.0",
)

import os

# Configurable CORS origins (reads ALLOWED_ORIGINS env var with fallback)
raw_origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000,*")
origins = [origin.strip() for origin in raw_origins.split(",") if origin.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API routers
app.include_router(users.router)
app.include_router(meetings.router)
app.include_router(signaling.router)


@app.get("/")
def read_root():
    return {
        "status": "online",
        "service": "MeetRoom API",
        "docs_url": "/docs"
    }
