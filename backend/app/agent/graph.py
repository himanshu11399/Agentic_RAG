from langchain_groq import ChatGroq
from langchain_core.messages import SystemMessage
from langgraph.graph import StateGraph, END, START
from app.agent.state import ChatState
from app.core.config import settings


llm=ChatGroq(
    model=settings.GROQ_MODEL,
    api_key=settings.GROQ_API_KEY,
    temperature=0.7,
    max_retries=2,
    timeout=60,
)

SYSTEM_PROMPT = """
You are a helpful AI assistant.

Instructions:
- Answer clearly and accurately.
- Use simple language when appropriate.
- If you do not know something, say so honestly.
- Do not claim to have used tools that are not available.
"""

def Chatbot_node(state:ChatState)->dict:
    message=[SystemMessage(content=SYSTEM_PROMPT), *state["messages"]]
    response=llm.invoke(message)
    return {"messages":[response]}

builder=StateGraph(ChatState)
builder.add_node("chatbot",Chatbot_node)

builder.add_edge(START, "chatbot")
builder.add_edge("chatbot",END)

chatbot_graph=builder.compile()