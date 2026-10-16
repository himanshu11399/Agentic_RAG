
import sys
from pathlib import Path

# Support UTF-8 encoding in Windows console
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

# Ensure backend root is on sys.path when running script directly
backend_root = Path(__file__).resolve().parent.parent
if str(backend_root) not in sys.path:
    sys.path.insert(0, str(backend_root))

from langchain_core.messages import HumanMessage
from app.agent.graph import chatbot_graph

question = (
    "According to my indexed documents, what are the "
    "standard working hours? Please search the documents."
)

result = chatbot_graph.invoke({
    "messages": [HumanMessage(content=question)]
})

print("\n========== TOOL CALL TEST ==========")

tool_called = False

for message in result["messages"]:
    print(f"\nMessage type: {type(message).__name__}")

    if getattr(message, "tool_calls", None):
        for call in message.tool_calls:
            print("Tool called:", call["name"])
            print("Tool arguments:", call["args"])

            if call["name"] == "rag_tool":
                tool_called = True

    if getattr(message, "type", "") == "tool":
        print("Tool result:", message.content)

print("\n========== FINAL RESULT ==========")
print("RAG tool called:", tool_called)
print("Final answer:", result["messages"][-1].content)
