from datetime import datetime, timezone
from sqlalchemy import (
    Column,
    Integer,
    String,
    Text,
    DateTime,
    Boolean,
    ForeignKey,
    CheckConstraint,
    Index,
)
from sqlalchemy.orm import relationship

from app.database import Base


def utc_now():
    """Returns timezone-aware UTC datetime."""
    return datetime.now(timezone.utc)


class User(Base):
    """
    User model representing registered app users (or default single user).
    Schema supports multi-user setup if expanded later.
    """
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, nullable=False, index=True)
    avatar_url = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now)


    # Relationships
    hosted_meetings = relationship("Meeting", back_populates="host", cascade="all, delete-orphan")
    participant_history = relationship("Participant", back_populates="user")


class Meeting(Base):
    """
    Meeting model for instant and scheduled meetings.
    
    Design Note:
    - `meeting_code` is the public, unguessable URL slug (e.g., 'abc-defg-hij'), separate from internal numeric primary key `id`.
      This prevents enumeration attacks and mimics standard video platform URLs.
    - `status` transitions: scheduled -> ongoing -> ended (or cancelled).
    """
    __tablename__ = "meetings"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    
    # URL-friendly meeting code used in join links
    meeting_code = Column(String, unique=True, nullable=False, index=True)
    
    # Foreign key referencing the host user
    host_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    
    # Unique host secret token for host authorization
    host_token = Column(String, nullable=True)
    
    title = Column(String, nullable=False)

    description = Column(Text, nullable=True)
    
    # Discriminator for meeting creation type
    meeting_type = Column(String, nullable=False)
    
    scheduled_at = Column(DateTime, nullable=True)
    duration_minutes = Column(Integer, default=30)
    
    # Status lifecycle tracking
    status = Column(String, nullable=False, default="scheduled")
    
    started_at = Column(DateTime(timezone=True), nullable=True)
    ended_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now)

    # Constraints enforcing allowed values
    __table_args__ = (
        CheckConstraint(meeting_type.in_(["instant", "scheduled"]), name="check_meeting_type"),
        CheckConstraint(status.in_(["scheduled", "ongoing", "ended", "cancelled"]), name="check_meeting_status"),
        Index("idx_meetings_code", "meeting_code"),
        Index("idx_meetings_host", "host_id"),
    )

    # Relationships
    host = relationship("User", back_populates="hosted_meetings")
    participants = relationship("Participant", back_populates="meeting", cascade="all, delete-orphan")


class Participant(Base):
    """
    Participant model representing a user's presence in a specific meeting room.
    
    Design Note:
    - This is a join table with extra attributes (joined_at, left_at, role, audio/video status).
    - `user_id` is NULLABLE to allow guest users who join by display name without logging in.
    - Soft state (`is_muted`, `is_video_on`) stored here allows host controls (e.g., mute all)
      and historical logging, while live WebSocket events stream immediate state changes.
    """
    __tablename__ = "participants"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    
    # Cascade delete participant entries if meeting is deleted
    meeting_id = Column(Integer, ForeignKey("meetings.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # Nullable FK for registered vs guest participants
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    
    display_name = Column(String, nullable=False)
    role = Column(String, nullable=False, default="participant")
    
    joined_at = Column(DateTime, nullable=True)
    left_at = Column(DateTime, nullable=True)
    
    is_muted = Column(Boolean, default=False)
    is_video_on = Column(Boolean, default=True)

    __table_args__ = (
        CheckConstraint(role.in_(["host", "participant"]), name="check_participant_role"),
        Index("idx_participants_meeting", "meeting_id"),
    )

    # Relationships
    meeting = relationship("Meeting", back_populates="participants")
    user = relationship("User", back_populates="participant_history")
