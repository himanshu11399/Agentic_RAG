from rag.ingestion import ingest_documents
from rag.vector_store import load_vector_store
from rag.hybrid_retrieval import build_hybrid_retriever,hybrid_search
from rag.grading import grade_retrieved_context
from rag.reranking import get_reranker,rerank_documents
from rag.config import TOP_K


def main():
    question=input("Ask a question: ")

    dense_retriever,bm25_retriever=build_hybrid_retriever()

    candidates=hybrid_search(
        question,
        dense_retriever,
        bm25_retriever,
        top_n=20,
    )
    reranker = get_reranker()
    documents = rerank_documents(
        question,
        candidates,
        reranker,
        top_n=TOP_K,
    )

    grade = grade_retrieved_context(question, documents)

    print("\nRelevance grade:", grade)

    for i, doc in enumerate(documents, start=1):
        print(f"\n--- Document {i} ---")
        print(doc.metadata.get("source", "Unknown source"))
        print(doc.page_content[:500])


if __name__ == "__main__":
    main()
    