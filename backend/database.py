"""Database configuration and session management."""
import os

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

DATABASE_URL = os.environ.get("DATABASE_URL")

if not DATABASE_URL:
    # On Vercel Serverless, the filesystem is read-only outside of the temp directory
    if os.environ.get("VERCEL"):
        import tempfile
        tmp_db = os.path.join(tempfile.gettempdir(), "todos.db").replace("\\", "/")
        SQLALCHEMY_DATABASE_URL = f"sqlite:///{tmp_db}"
    else:
        SQLALCHEMY_DATABASE_URL = "sqlite:///./todos.db"
elif DATABASE_URL.startswith("postgres://"):
    # SQLAlchemy 1.4+ requires postgresql:// instead of legacy postgres://
    SQLALCHEMY_DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)
else:
    SQLALCHEMY_DATABASE_URL = DATABASE_URL

# SQLite requires check_same_thread=False
connect_args = {"check_same_thread": False} if SQLALCHEMY_DATABASE_URL.startswith("sqlite") else {}

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args=connect_args,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    """Yield a database session and ensure it's closed after use."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

