import sys

from rag.hybrid_retrieval import (
    build_hybrid_retriever,
    hybrid_search,
)

from rag.reranking import (
    get_reranker,
    rerank_documents,
)

if sys.stdout.encoding and sys.stdout.encoding.lower() != "utf-8":
    sys.stdout.reconfigure(encoding="utf-8")

def main():

    dense_retriever, bm25_retriever = (
        build_hybrid_retriever()
    )

    reranker = get_reranker()

    question = input("Enter your question: ")

    # Stage 1: Broad candidate retrieval
    candidates = hybrid_search(
        question=question,
        dense_retriever=dense_retriever,
        bm25_retriever=bm25_retriever,
        top_n=20,
    )

    print(f"\nHybrid candidates: {len(candidates)}")

    # Stage 2: Query-specific reranking
    final_documents = rerank_documents(
        question=question,
        documents=candidates,
        reranker=reranker,
        top_n=4,
    )

    print("\nTop reranked documents:")

    for rank, doc in enumerate(final_documents, start=1):
        print(f"\n--- Rank {rank} ---")
        print("Rerank score:", doc.metadata["rerank_score"])
        print("Source:", doc.metadata.get("source"))
        print(doc.page_content)


if __name__ == "__main__":
    main()
