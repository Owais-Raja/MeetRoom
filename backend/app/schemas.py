from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field, ConfigDict


# -----------------------------------------------------------------------------
# User Schemas
# -----------------------------------------------------------------------------

class UserBase(BaseModel):
    name: str
    email: str
    avatar_url: Optional[str] = None


class UserCreate(UserBase):
    pass


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
    meeting_type: str
    status: str
    scheduled_at: Optional[datetime] = None
    started_at: Optional[datetime] = None
    ended_at: Optional[datetime] = None
    created_at: datetime
    host: Optional[UserResponse] = None
    participants: List[ParticipantResponse] = []

    model_config = ConfigDict(from_attributes=True)
