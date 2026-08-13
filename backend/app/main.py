from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import engine, Base
from app.routers import users, meetings, signaling

# Ensure tables exist on startup (seed script handles full table creation/reset)
Base.metadata.create_all(bind=engine)

# Auto-seed default user (id=1) on startup if missing (for production deployments)
def ensure_default_user():
    from app.database import SessionLocal
    from app.models import User
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.id == 1).first()
        if not user:
            default_u = User(
                id=1,
                name="Default User",
                email="user@example.com",
                avatar_url="https://api.dicebear.com/7.x/avataaars/svg?seed=Default"
            )
            db.add(default_u)
            db.commit()
            print("Auto-seeded default user (id=1) on startup.")
    except Exception as e:
        db.rollback()
        print(f"Startup auto-seed warning: {e}")
    finally:
        db.close()

ensure_default_user()

app = FastAPI(
    title="MeetRoom API",
    description="Backend API for MeetRoom Video Meeting Platform with REST endpoints and WebSocket WebRTC signaling.",
    version="1.0.0",
)

import os

# Configurable CORS origins (always includes Vercel app domain and local dev)
raw_origins = os.getenv("ALLOWED_ORIGINS", "")
origins = [origin.strip() for origin in raw_origins.split(",") if origin.strip()]
default_origins = [
    "https://meetroom-scaler.vercel.app",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]
for o in default_origins:
    if o not in origins:
        origins.append(o)

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_origin_regex=r"https://.*\.vercel\.app",
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
