import logging
from typing import Literal

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from langchain_core.messages import HumanMessage,AIMessage

from app.agent.graph import chatbot_graph

logger=logging.getLogger(__name__)

router=APIRouter(prefix="/api/v1/chat",tags=["Chat"])

class ChatTurn(BaseModel):
    role:Literal["user","assistant"]
    content:str=Field(min_length=1,max_length=10_000)


class ChatRequest(BaseModel):
    message:str=Field(min_length=1,max_length=10_000,description="The user's message",)
    history:list[ChatTurn]=Field(default_factory=list,description="Message history",max_length=20)
    
class ChatResponse(BaseModel):
    reply:str
    
@router.post("",response_model=ChatResponse)
def chat(request:ChatRequest)->ChatResponse:
    message=request.message.strip()
    
    if not message:
        raise HTTPException(
            status_code=422,
            detail="Message cannot be empty."
        )
    try:
        messages=[]
        for turn in request.history:
            content=turn.content.strip()
            
            if not content:
                continue
            if turn.role=="user":
                messages.append(HumanMessage(content=content))
            elif turn.role=="assistant":
                messages.append(AIMessage(content=content))
            else:
                logger.warning("Unknown role {}".format(turn.role))
        
        messages.append(HumanMessage(content=message))
        

        result=chatbot_graph.invoke(
            {
                "messages":messages
            }
        )
        
        reply=result["messages"][-1].content
        
        if not isinstance(reply,str):
            raise ValueError("The model returned an unexpected response.")
        
        return ChatResponse(reply=reply)
    except Exception as  e:
        logger.exception("Chat request failed due to internal error")
        raise HTTPException(
            status_code=502,
            detail=f"Sorry, I'm having trouble connecting right now. Please try again later.{e}"
        ) from None
                    