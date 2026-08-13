import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# SQLite database file path stored locally inside the backend folder
DB_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "meetroom.db")
SQLALCHEMY_DATABASE_URL = f"sqlite:///{DB_PATH}"

# check_same_thread=False is needed ONLY for SQLite because FastAPI routes handle requests
# in multi-threaded contexts, and by default SQLite restricts connection sharing across threads.
engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False}
)

# Create a scoped session factory for DB transactions
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Declarative base class that all ORM models will inherit from
Base = declarative_base()


def get_db():
    """
    FastAPI Dependency that provides a database session to API route handlers.
    Yields the session and guarantees cleanup/close when the HTTP request finishes.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
