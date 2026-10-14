import logging
from typing import Any, Annotated, Literal

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from langchain_core.messages import HumanMessage, AIMessage

from app.api.dependencies import get_current_user
from app.agent.graph import chatbot_graph
from app.db.repository import (
    create_conversation,
    get_conversation,
    save_message,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/chat", tags=["Chat"])


class ChatTurn(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(min_length=1, max_length=10_000)


class ChatRequest(BaseModel):
    message: str = Field(
        min_length=1,
        max_length=10_000,
        description="The user's message",
    )
    history: list[ChatTurn] = Field(
        default_factory=list,
        max_length=20,
        description="Message history",
    )
    conversation_id: str | None = None


class ChatResponse(BaseModel):
    reply: str
    conversation_id: str


@router.post("", response_model=ChatResponse)
def chat(
    request: ChatRequest,
    current_user: Annotated[dict[str, Any], Depends(get_current_user)],
) -> ChatResponse:
    user_id = current_user["user_id"]
    message = request.message.strip()

    if not message:
        raise HTTPException(
            status_code=422,
            detail="Message cannot be empty.",
        )

    # Verify ownership before processing an existing conversation.
    if request.conversation_id:
        conversation = get_conversation(
            user_id=user_id,
            conversation_id=request.conversation_id,
        )

        if conversation is None:
            raise HTTPException(
                status_code=404,
                detail="Conversation not found.",
            )

    # Build the LangGraph message history.
    messages = []

    for turn in request.history:
        content = turn.content.strip()

        if not content:
            continue

        if turn.role == "user":
            messages.append(HumanMessage(content=content))
        else:
            messages.append(AIMessage(content=content))

    messages.append(HumanMessage(content=message))

    # Generate the assistant reply.
    try:
        result = chatbot_graph.invoke({"messages": messages})
        reply = result["messages"][-1].content

        if not isinstance(reply, str) or not reply.strip():
            raise ValueError("The model returned an invalid response.")

    except Exception as exc:
        logger.exception("Chat generation failed")
        raise HTTPException(
            status_code=502,
            detail="Sorry, I'm having trouble connecting right now. Please try again later.",
        ) from exc

    # Create a conversation only after a reply has been generated.
    try:
        conversation_id = request.conversation_id

        if conversation_id is None:
            conversation = create_conversation(
                user_id=user_id,
                title=message[:60],
            )
            conversation_id = conversation["id"]

        user_message = save_message(
            user_id=user_id,
            conversation_id=conversation_id,
            role="user",
            content=message,
        )

        assistant_message = save_message(
            user_id=user_id,
            conversation_id=conversation_id,
            role="assistant",
            content=reply,
        )

        if user_message is None or assistant_message is None:
            raise RuntimeError("Unable to persist chat messages.")

    except Exception as exc:
        logger.exception("Failed to persist conversation messages")
        raise HTTPException(
            status_code=500,
            detail="The reply was generated, but saving the conversation failed.",
        ) from exc

    return ChatResponse(
        reply=reply,
        conversation_id=conversation_id,
    )