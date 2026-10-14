from datetime import datetime
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field, field_validator

from app.api.dependencies import get_current_user
from app.db.repository import (
    create_conversation,
    delete_conversation,
    list_conversations,
    list_messages,
    rename_conversation,
)
from time import perf_counter

router = APIRouter(
    prefix="/api/v1/conversations",
    tags=["Conversations"],
)

class CreateConversationRequest(BaseModel):
    title: str = Field(default="New Chat", min_length=1, max_length=200)

    @field_validator("title")
    @classmethod
    def validate_title(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Title cannot be empty")
        return value

class ConversationResponse(BaseModel):
    id: str
    title: str
    created_at: datetime
    updated_at: datetime
    
class MessageResponse(BaseModel):
    id: str
    role: str
    content: str
    created_at: datetime

class RenameConversationRequest(BaseModel):
    title: str = Field(min_length=1, max_length=200)

    @field_validator("title")
    @classmethod
    def validate_title(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Title cannot be empty")
        return value
    
@router.patch("/{conversation_id}", response_model=ConversationResponse)
def update_conversation_title(
    conversation_id: str,
    request: RenameConversationRequest,
    current_user: Annotated[dict, Depends(get_current_user)],
):
    conversation = rename_conversation(
        user_id=current_user["user_id"],
        conversation_id=conversation_id,
        title=request.title,
    )

    if conversation is None:
        raise HTTPException(
            status_code=404,
            detail="Conversation not found",
        )

    return conversation
    
@router.post("", response_model=ConversationResponse, status_code=201)
def create_new_conversation(
    request: CreateConversationRequest,
    current_user: Annotated[dict, Depends(get_current_user)],
):
    return create_conversation(
        user_id=current_user["user_id"],
        title=request.title,
    )


@router.get("", response_model=list[ConversationResponse])
def get_user_conversations(
    current_user: Annotated[dict, Depends(get_current_user)],
):
    return list_conversations(user_id=current_user["user_id"])


@router.get(
    "/{conversation_id}/messages",
    response_model=list[MessageResponse],
)
def get_conversation_messages(
    conversation_id: str,
    current_user: Annotated[dict, Depends(get_current_user)],
):
    started = perf_counter()

    messages = list_messages(
        user_id=current_user["user_id"],
        conversation_id=conversation_id,
    )

    elapsed = perf_counter() - started
    print(
        f"[PERF] list_messages DB/repository time: "
        f"{elapsed:.3f}s; messages: "
        f"{len(messages) if messages is not None else 'not found'}"
    )

    if messages is None:
        raise HTTPException(
            status_code=404,
            detail="Conversation not found",
        )

    return messages



@router.delete("/{conversation_id}", status_code=204)
def remove_conversation(
    conversation_id: str,
    current_user: Annotated[dict, Depends(get_current_user)],
):
    deleted = delete_conversation(
        user_id=current_user["user_id"],
        conversation_id=conversation_id,
    )

    if not deleted:
        raise HTTPException(
            status_code=404,
            detail="Conversation not found",
        )

    return None
     
