from typing import Literal, TypedDict
from langchain_core.documents import Document
from langgraph.graph import END, START, StateGraph
from rag.config import TOP_K
from rag.evaluation import evaluate_grounding
from rag.generation import generate_answer
from rag.grading import grade_retrieved_context
from rag.grounding_repair import repair_chain
from rag.hybrid_retrieval import build_hybrid_retriever, hybrid_search
from rag.query_rewrite import rewrite_query
from rag.reranking import get_reranker, rerank_documents

MAX_QUESTION_RETRIES = 2
MAX_ANSWER_RETRIES = 2

dense_retriever, bm25_retriever = build_hybrid_retriever()
reranker = get_reranker()


class RAGState(TypedDict):
    question: str
    documents: list[Document]
    answer: str
    context_relevance: Literal["relevant", "irrelevant"]
    rewrite_question_retry_count: int
    answer_verdict: Literal["supported", "unsupported", "abstained"]
    answer_retry_count: int


def retrieve_node(state: RAGState) -> dict:
    candidates = hybrid_search(
        question=state["question"],
        dense_retriever=dense_retriever,
        bm25_retriever=bm25_retriever,
        top_n=20,
    )
    documents = rerank_documents(
        state["question"],
        candidates,
        reranker,
        top_n=TOP_K,
    )
    return {"documents": documents}


def grade_node(state: RAGState) -> dict:
    relevance = grade_retrieved_context(state["question"], state["documents"])
    return {"context_relevance": relevance}


def route_after_grade(state: RAGState) -> str:
    if state["context_relevance"] == "relevant":
        return "generate"
    if state["rewrite_question_retry_count"] < MAX_QUESTION_RETRIES:
        return "rewrite"
    return "no_evidence"


def rewrite_node(state: RAGState) -> dict:
    new_question = rewrite_query(state["question"])
    return {
        "question": new_question,
        "rewrite_question_retry_count": state["rewrite_question_retry_count"] + 1,
    }


def get_context(state: RAGState) -> str:
    return "\n\n".join(doc.page_content for doc in state["documents"])


def generate_node(state: RAGState) -> dict:
    answer = generate_answer(state["question"], state["documents"])
    return {"answer": answer}


def grounding_eval_node(state: RAGState) -> dict:
    verdict = evaluate_grounding(
        state["question"],
        get_context(state),
        state["answer"],
    )
    return {"answer_verdict": verdict}


def route_after_evaluation(state: RAGState) -> str:
    verdict = state.get("answer_verdict")

    # If the answer is verified or an intentional refusal, terminate cleanly
    if verdict in ("supported", "abstained"):
        return "finish"

    if state["answer_retry_count"] < MAX_ANSWER_RETRIES:
        return "repair_answer"

    return "answer_fallback"


def repair_answer_node(state: RAGState) -> dict:
    previous_answer = state.get("answer", "") or ""
    repaired_answer = repair_chain.invoke(
        {
            "question": state["question"],
            "context": get_context(state),
            "previous_answer": previous_answer,
        }
    ).strip()

    return {
        "answer": repaired_answer,
        "answer_retry_count": state["answer_retry_count"] + 1,
    }


def answer_fallback(state: RAGState) -> dict:
    return {
        "answer": (
            "I couldn't verify a reliable answer from the retrieved "
            "documents, so I won't present an unsupported claim."
        ),
        "answer_verdict": "abstained",
    }


def no_evidence(state: RAGState) -> dict:
    return {
        "answer": (
            "I couldn't find enough relevant information in the indexed "
            "documents to answer reliably."
        ),
        "answer_verdict": "abstained",
    }


def build_rag_graph():
    workflow = StateGraph(RAGState)

    workflow.add_node("retrieve", retrieve_node)
    workflow.add_node("grade", grade_node)
    workflow.add_node("rewrite", rewrite_node)
    workflow.add_node("generate", generate_node)
    workflow.add_node("no_evidence", no_evidence)
    workflow.add_node("answer_fallback", answer_fallback)
    workflow.add_node("repair_answer", repair_answer_node)
    workflow.add_node("grounding_eval", grounding_eval_node)

    workflow.add_edge(START, "retrieve")
    workflow.add_edge("retrieve", "grade")
    workflow.add_conditional_edges(
        "grade",
        route_after_grade,
        {
            "generate": "generate",
            "rewrite": "rewrite",
            "no_evidence": "no_evidence",
        },
    )
    workflow.add_edge("rewrite", "retrieve")
    workflow.add_edge("generate", "grounding_eval")
    workflow.add_conditional_edges(
        "grounding_eval",
        route_after_evaluation,
        {
            "finish": END,
            "repair_answer": "repair_answer",
            "answer_fallback": "answer_fallback",
        },
    )
    workflow.add_edge("repair_answer", "grounding_eval")
    workflow.add_edge("answer_fallback", END)
    workflow.add_edge("no_evidence", END)

    return workflow.compile()


if __name__ == "__main__":
    app = build_rag_graph()
    initial_state: RAGState = {
        "question": "What are the standard working hours?",
        "documents": [],
        "answer": "",
        "context_relevance": "irrelevant",
        "rewrite_question_retry_count": 0,
        "answer_verdict": "unsupported",
        "answer_retry_count": 0,
    }
    result = app.invoke(initial_state)
    print("\nAnswer:", result["answer"])
    print("Verdict:", result.get("answer_verdict"))