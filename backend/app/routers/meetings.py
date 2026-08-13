from typing import List, Optional
from datetime import datetime, timezone
import secrets
import string
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app import models, schemas

router = APIRouter(prefix="/api/meetings", tags=["meetings"])


def generate_meeting_code() -> str:
    """
    Generates a 9-character hyphenated meeting code (e.g. 'abc-defg-hij').
    Uses cryptographically safe random choices for URL safety.
    """
    letters = string.ascii_lowercase
    part1 = "".join(secrets.choice(letters) for _ in range(3))
    part2 = "".join(secrets.choice(letters) for _ in range(4))
    part3 = "".join(secrets.choice(letters) for _ in range(3))
    return f"{part1}-{part2}-{part3}"


@router.post("/instant", response_model=schemas.MeetingResponse, status_code=status.HTTP_201_CREATED)
def create_instant_meeting(
    payload: Optional[schemas.InstantMeetingCreate] = None,
    db: Session = Depends(get_db)
):
    """
    Create & start a new instant meeting.
    - Generates a unique meeting code (e.g. 'abc-defg-hij').
    - Sets host_id=1 (Default User), status='ongoing', started_at=now.
    - Automatically adds host as first participant row.
    """
    meeting_title = payload.title if payload and payload.title else "Instant Meeting"
    meeting_desc = payload.description if payload else None
    
    # Ensure meeting code uniqueness
    meeting_code = generate_meeting_code()
    while db.query(models.Meeting).filter(models.Meeting.meeting_code == meeting_code).first():
        meeting_code = generate_meeting_code()

    now = datetime.now(timezone.utc)

    # 1. Create Meeting DB record
    meeting = models.Meeting(
        meeting_code=meeting_code,
        host_id=1,  # Default seeded user
        title=meeting_title,
        description=meeting_desc,
        meeting_type="instant",
        status="ongoing",
        started_at=now,
        created_at=now
    )
    db.add(meeting)
    db.commit()
    db.refresh(meeting)

    # 2. Automatically register host as first participant row
    host_user = db.query(models.User).filter(models.User.id == 1).first()
    host_display_name = host_user.name if host_user else "Default User (Host)"

    host_participant = models.Participant(
        meeting_id=meeting.id,
        user_id=1,
        display_name=host_display_name,
        role="host",
        joined_at=now,
        is_muted=False,
        is_video_on=True
    )
    db.add(host_participant)
    db.commit()
    db.refresh(meeting)

    return meeting


@router.post("/schedule", response_model=schemas.MeetingResponse, status_code=status.HTTP_201_CREATED)
def create_scheduled_meeting(
    payload: schemas.ScheduledMeetingCreate,
    db: Session = Depends(get_db)
):
    """
    Schedule a new meeting for a future date/time.
    - Generates a unique meeting_code.
    - Sets host_id=1 (Default User), status='scheduled', meeting_type='scheduled'.
    """
    # Ensure meeting code uniqueness
    meeting_code = generate_meeting_code()
    while db.query(models.Meeting).filter(models.Meeting.meeting_code == meeting_code).first():
        meeting_code = generate_meeting_code()

    now = datetime.now(timezone.utc)

    meeting = models.Meeting(
        meeting_code=meeting_code,
        host_id=1,  # Default seeded user
        title=payload.title,
        description=payload.description,
        meeting_type="scheduled",
        scheduled_at=payload.scheduled_at,
        duration_minutes=payload.duration_minutes,
        status="scheduled",
        created_at=now
    )
    db.add(meeting)
    db.commit()
    db.refresh(meeting)

    return meeting


@router.get("/upcoming", response_model=List[schemas.MeetingResponse])
def get_upcoming_meetings(db: Session = Depends(get_db)):
    """
    Fetch all upcoming scheduled meetings.
    Filter criteria: status == 'scheduled' and scheduled_at >= current UTC time (or all scheduled).
    """
    meetings = (
        db.query(models.Meeting)
        .filter(models.Meeting.status == "scheduled")
        .order_by(models.Meeting.scheduled_at.asc())
        .all()
    )
    return meetings


@router.get("/recent", response_model=List[schemas.MeetingResponse])
def get_recent_meetings(db: Session = Depends(get_db)):
    """
    Fetch past/ended meetings.
    Filter criteria: status == 'ended', ordered by ended_at descending.
    """
    meetings = (
        db.query(models.Meeting)
        .filter(models.Meeting.status == "ended")
        .order_by(models.Meeting.ended_at.desc())
        .all()
    )
    return meetings


@router.get("/{meeting_code}", response_model=schemas.MeetingResponse)
def get_meeting_by_code(meeting_code: str, db: Session = Depends(get_db)):
    """
    Fetch meeting details by its public URL slug/code (e.g. 'abc-defg-hij').
    Used by pre-join lobby to validate meeting code existence.
    """
    meeting = (
        db.query(models.Meeting)
        .filter(models.Meeting.meeting_code == meeting_code)
        .first()
    )
    if not meeting:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Meeting with code '{meeting_code}' not found."
        )
    return meeting


@router.post("/{meeting_code}/join", response_model=schemas.ParticipantResponse, status_code=status.HTTP_201_CREATED)
def join_meeting(
    meeting_code: str,
    payload: schemas.JoinMeetingRequest,
    db: Session = Depends(get_db)
):
    """
    Validate meeting code existence & status, and create a participant record for the joining user/guest.
    Returns the created participant object (including participant_id).
    """
    meeting = (
        db.query(models.Meeting)
        .filter(models.Meeting.meeting_code == meeting_code)
        .first()
    )

    if not meeting:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Meeting '{meeting_code}' does not exist."
        )

    if meeting.status in ["ended", "cancelled"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot join. This meeting has already {meeting.status}."
        )

    # Determine if user is host or guest participant
    now = datetime.now(timezone.utc)
    
    # Check if a host participant already exists for this meeting
    existing_host = (
        db.query(models.Participant)
        .filter(models.Participant.meeting_id == meeting.id, models.Participant.role == "host")
        .first()
    )

    host_user = db.query(models.User).filter(models.User.id == meeting.host_id).first()
    host_name = host_user.name.strip().lower() if host_user else ""
    user_display = payload.display_name.strip().lower()

    # User is assigned 'host' if:
    # 1. No host participant exists in DB yet for this meeting, OR
    # 2. Display name matches host name or starts with 'default user'
    is_host = False
    if not existing_host:
        is_host = True
    elif host_name and user_display == host_name:
        is_host = True
    elif user_display.startswith("default user"):
        is_host = True

    role = "host" if is_host else "participant"

    participant = models.Participant(
        meeting_id=meeting.id,
        user_id=1 if is_host else None,
        display_name=payload.display_name,
        role=role,
        joined_at=now,
        is_muted=False,
        is_video_on=True
    )


    # Transition scheduled meeting to ongoing if host joins
    if meeting.status == "scheduled" and is_host:
        meeting.status = "ongoing"
        meeting.started_at = now

    db.add(participant)
    db.commit()
    db.refresh(participant)

    return participant


@router.post("/{meeting_code}/end", response_model=schemas.MeetingResponse)
def end_meeting(
    meeting_code: str,
    db: Session = Depends(get_db)
):
    """
    Host ends the meeting for all participants.
    Sets status='ended', ended_at=now, and updates left_at for active participant rows.
    """
    meeting = (
        db.query(models.Meeting)
        .filter(models.Meeting.meeting_code == meeting_code)
        .first()
    )

    if not meeting:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Meeting '{meeting_code}' not found."
        )

    now = datetime.now(timezone.utc)
    meeting.status = "ended"
    meeting.ended_at = now

    # Update left_at for participants who have not left yet
    for participant in meeting.participants:
        if participant.left_at is None:
            participant.left_at = now

    db.commit()
    db.refresh(meeting)

    return meeting


@router.delete("/{meeting_code}/participants/{participant_id}", status_code=status.HTTP_200_OK)
def remove_participant(
    meeting_code: str,
    participant_id: int,
    db: Session = Depends(get_db)
):
    """
    Host removes a participant from an active meeting.
    Updates participant's left_at timestamp in the database.
    """
    participant = (
        db.query(models.Participant)
        .filter(models.Participant.id == participant_id)
        .first()
    )

    if not participant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Participant with ID {participant_id} not found."
        )

    participant.left_at = datetime.now(timezone.utc)
    db.commit()

    return {"message": f"Participant {participant_id} successfully removed from meeting."}
