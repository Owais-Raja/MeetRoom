from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app import models, schemas

router = APIRouter(prefix="/api/users", tags=["users"])


@router.get("/me", response_model=schemas.UserResponse)
def get_current_user(db: Session = Depends(get_db)):
    """
    Returns the default logged-in user.
    For this assignment, auth is simplified: user with ID 1 is returned as the single default user.
    """
    user = db.query(models.User).filter(models.User.id == 1).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Default user not found. Please run the database seed script (seed.py)."
        )
    return user
