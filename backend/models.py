"""SQLAlchemy ORM models for the Todo application."""
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Float
from database import Base


class Todo(Base):
    """Represents a single todo item in the database."""
    __tablename__ = "todos"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    description = Column(String, default="")
    completed = Column(Boolean, default=False)
    position = Column(Float, nullable=False, default=0.0)
    created_at = Column(DateTime, nullable=False)
    completed_at = Column(DateTime, nullable=True)
    reminder_at = Column(DateTime, nullable=True)
    category = Column(String, default="general")
    priority = Column(String, default="medium")  # low, medium, high
    recurrence = Column(String, default="none")  # none, daily, weekly, monthly
