import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.chat import router as chat_router
from app.api.conversations import router as conversations_router

logging.basicConfig(level=logging.INFO)

app=FastAPI(
    title="Powerful AI Assistant",
    version="1.0.0",
    description="A modular AI assistant built with FastAPI and LangGraph.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=False,
    allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

app.include_router(chat_router)
app.include_router(conversations_router)

@app.get("/health",tags=["Health"])
def health_check()->dict[str,str]:
    return {"status": "ok"}

@app.get("/", tags=["Root"])
def root() -> dict[str, str]:
    return {
        "name": "Powerful AI Assistant",
        "version": "1.0.0",
        "status": "running",
    }