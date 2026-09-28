"""Pydantic schemas for request/response validation."""
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


class TodoCreate(BaseModel):
    """Schema for creating a new todo item."""
    title: str = Field(..., min_length=1, max_length=200)
    description: str = Field(default="", max_length=1000)
    category: str = Field(default="general")
    priority: str = Field(default="medium")
    reminder_at: Optional[datetime] = None
    recurrence: str = Field(default="none")  # none, daily, weekly, monthly


class TodoUpdate(BaseModel):
    """Schema for updating an existing todo item."""
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = Field(None, max_length=1000)
    completed: Optional[bool] = None
    category: Optional[str] = None
    priority: Optional[str] = None
    reminder_at: Optional[datetime] = None
    recurrence: Optional[str] = None


class TodoReorder(BaseModel):
    """Schema for reordering a todo item."""
    id: int
    position: float


class TodoResponse(BaseModel):
    """Schema for todo item responses."""
    id: int
    title: str
    description: str
    completed: bool
    position: float
    created_at: datetime
    completed_at: Optional[datetime] = None
    reminder_at: Optional[datetime] = None
    category: str
    priority: str
    recurrence: str = "none"

    model_config = {"from_attributes": True}
