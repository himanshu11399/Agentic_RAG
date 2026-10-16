
from functools import lru_cache

from langchain_core.tools import tool

from rag.graph import build_rag_graph


@lru_cache(maxsize=1)
def get_rag_app():
    """Compile the RAG graph once and reuse it."""
    return build_rag_graph()


@tool
def rag_tool(question: str) -> dict:
    """Answer questions using information from the indexed documents.

    Use this tool when a user asks about information that may be
    contained in the documents indexed by the RAG pipeline.
    """
    app = get_rag_app()

    result = app.invoke(
        {
            "question": question,
            "documents": [],
            "answer": "",
            "context_relevance": "irrelevant",
            "rewrite_question_retry_count": 0,
            "answer_verdict": "unsupported",
            "answer_retry_count": 0,
        }
    )

    sources = []

    for doc in result.get("documents", []):
        source = doc.metadata.get("source", "unknown")
        page = doc.metadata.get("page")

        if page is not None:
            sources.append(f"{source}, page {page + 1}")
        else:
            sources.append(source)

    return {
        "answer": result.get("answer", ""),
        "sources": list(dict.fromkeys(sources)),
        "answer_verdict": result.get("answer_verdict", "unsupported"),
    }
