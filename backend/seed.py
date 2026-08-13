import sys
import os
from datetime import datetime, timedelta, timezone

# Ensure backend folder is in Python path for app imports
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.database import engine, Base, SessionLocal
from app.models import User, Meeting, Participant


def seed_database():
    """
    Re-runnable database seed script.
    Drops existing tables, creates fresh schema, and inserts realistic sample data.
    """
    print("Resetting database schema...")
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()

    try:
        print("Seeding default user...")
        now = datetime.now(timezone.utc)

        default_user = User(
            id=1,
            name="Default User",
            email="user@example.com",
            avatar_url="https://api.dicebear.com/7.x/avataaars/svg?seed=Default",
            created_at=now - timedelta(days=30)
        )
        db.add(default_user)
        db.commit()
        db.refresh(default_user)

        print("Seeding upcoming meetings...")
        
        upcoming_1 = Meeting(
            meeting_code="sync-team-101",
            host_id=default_user.id,
            title="Weekly Engineering Standup",
            description="Regular team sync for active sprint progress and blockers.",
            meeting_type="scheduled",
            scheduled_at=now + timedelta(days=1, hours=2),
            duration_minutes=30,
            status="scheduled"
        )
        
        upcoming_2 = Meeting(
            meeting_code="arch-review-202",
            host_id=default_user.id,
            title="System Architecture Review",
            description="Discussion on database schemas and WebRTC scaling.",
            meeting_type="scheduled",
            scheduled_at=now + timedelta(days=3, hours=5),
            duration_minutes=60,
            status="scheduled"
        )

        db.add_all([upcoming_1, upcoming_2])
        db.commit()

        print("Seeding past/ended meetings...")
        past_1_start = now - timedelta(days=1, hours=4)
        past_1_end = past_1_start + timedelta(minutes=45)
        
        past_meeting_1 = Meeting(
            meeting_code="sprint-plan-303",
            host_id=default_user.id,
            title="Sprint Planning Meeting",
            description="Planning user stories for Q3 roadmap release.",
            meeting_type="scheduled",
            scheduled_at=past_1_start,
            started_at=past_1_start,
            ended_at=past_1_end,
            duration_minutes=45,
            status="ended"
        )

        past_2_start = now - timedelta(days=2, hours=6)
        past_2_end = past_2_start + timedelta(minutes=30)
        
        past_meeting_2 = Meeting(
            meeting_code="design-demo-404",
            host_id=default_user.id,
            title="UX/UI Design Review",
            description="Reviewing high-fidelity mocks for MeetRoom video room view.",
            meeting_type="instant",
            started_at=past_2_start,
            ended_at=past_2_end,
            duration_minutes=30,
            status="ended"
        )

        db.add_all([past_meeting_1, past_meeting_2])
        db.commit()

        print("Seeding participants for ended meetings...")
        p1 = Participant(
            meeting_id=past_meeting_1.id,
            user_id=default_user.id,
            display_name="Default User (Host)",
            role="host",
            joined_at=past_1_start,
            left_at=past_1_end,
            is_muted=False,
            is_video_on=True
        )

        p2 = Participant(
            meeting_id=past_meeting_1.id,
            user_id=None,  # Guest participant
            display_name="Alice (Guest)",
            role="participant",
            joined_at=past_1_start + timedelta(minutes=2),
            left_at=past_1_end - timedelta(minutes=1),
            is_muted=True,
            is_video_on=True
        )

        p3 = Participant(
            meeting_id=past_meeting_2.id,
            user_id=default_user.id,
            display_name="Default User (Host)",
            role="host",
            joined_at=past_2_start,
            left_at=past_2_end,
            is_muted=False,
            is_video_on=True
        )

        db.add_all([p1, p2, p3])
        db.commit()

        print("Database successfully seeded!")
        print(f"Default User ID: {default_user.id} ({default_user.email})")
        print(f"Upcoming meetings seeded: {upcoming_1.meeting_code}, {upcoming_2.meeting_code}")
        print(f"Past meetings seeded: {past_meeting_1.meeting_code}, {past_meeting_2.meeting_code}")

    except Exception as e:
        db.rollback()
        print(f"Error seeding database: {e}")
        raise e
    finally:
        db.close()


if __name__ == "__main__":
    seed_database()
