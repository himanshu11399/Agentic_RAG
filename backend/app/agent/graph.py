from langchain_groq import ChatGroq
from langchain_core.messages import SystemMessage
from langgraph.graph import StateGraph, END, START
from langgraph.prebuilt import ToolNode, tools_condition

from app.agent.state import ChatState
from app.core.config import settings

# pyrefly: ignore[missing-import]
from rag.rag_tool import rag_tool


llm = ChatGroq(
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
- Use rag_tool for questions requiring information from
  the user's indexed documents.
- Use the tool's result to answer document-based questions.
- For general questions, answer directly.
- Never claim to have used a tool unless you actually used it.
"""

tools=[rag_tool]
llm_with_tools=llm.bind_tools(tools)

def Chatbot_node(state:ChatState)->dict:
    message=[SystemMessage(content=SYSTEM_PROMPT), *state["messages"]]
    response=llm_with_tools.invoke(message)
    return {"messages":[response]}

builder=StateGraph(ChatState)
builder.add_node("chatbot", Chatbot_node)
builder.add_node("tools",ToolNode(tools))

builder.add_edge(START, "chatbot")
builder.add_conditional_edges(
    "chatbot",
    tools_condition,
    {
        "tools":"tools",
        END:END
    },
)
builder.add_edge("tools","chatbot")

chatbot_graph=builder.compile()