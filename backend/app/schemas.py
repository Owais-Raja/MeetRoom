from datetime import datetime, timezone
from typing import Optional, List
from pydantic import BaseModel, Field, ConfigDict, field_validator


# -----------------------------------------------------------------------------
# User Schemas
# -----------------------------------------------------------------------------

class UserBase(BaseModel):
    name: str
    email: str
    avatar_url: Optional[str] = None


class UserCreate(UserBase):
    pass


class UserUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    avatar_url: Optional[str] = None


class UserResponse(UserBase):
    id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)



# -----------------------------------------------------------------------------
# Participant Schemas
# -----------------------------------------------------------------------------

class ParticipantBase(BaseModel):
    display_name: str
    role: str = "participant"
    is_muted: bool = False
    is_video_on: bool = True


class ParticipantCreate(ParticipantBase):
    meeting_id: int
    user_id: Optional[int] = None


class JoinMeetingRequest(BaseModel):
    display_name: str
    host_token: Optional[str] = None


class ParticipantResponse(ParticipantBase):
    id: int
    meeting_id: int
    user_id: Optional[int] = None
    joined_at: Optional[datetime] = None
    left_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


# -----------------------------------------------------------------------------
# Meeting Schemas
# -----------------------------------------------------------------------------

class MeetingBase(BaseModel):
    title: str
    description: Optional[str] = None
    duration_minutes: int = 30


class InstantMeetingCreate(MeetingBase):
    title: str = "Instant Meeting"


class ScheduledMeetingCreate(MeetingBase):
    scheduled_at: datetime


class MeetingResponse(MeetingBase):
    id: int
    meeting_code: str
    host_id: int
    host_token: Optional[str] = None
    meeting_type: str
    status: str
    scheduled_at: Optional[datetime] = None

    started_at: Optional[datetime] = None
    ended_at: Optional[datetime] = None
    created_at: datetime
    host: Optional[UserResponse] = None
    participants: List[ParticipantResponse] = []

    model_config = ConfigDict(from_attributes=True)

    @field_validator("started_at", "ended_at", "created_at", mode="after")
    @classmethod
    def serialize_utc_times(cls, value: Optional[datetime]) -> Optional[datetime]:
        """SQLite returns naive datetimes for real UTC fields. Stamp them as UTC
        so the frontend can correctly convert them to local time."""
        if value is not None and value.tzinfo is None:
            return value.replace(tzinfo=timezone.utc)
        return value

    @field_validator("scheduled_at", mode="after")
    @classmethod
    def preserve_scheduled_at_as_local(cls, value: Optional[datetime]) -> Optional[datetime]:
        """scheduled_at is stored as the user's local time (naive, no timezone).
        Do NOT stamp it as UTC — leave tzinfo=None so FastAPI serializes it
        without any offset, and the frontend can display it as-is."""
        return value
