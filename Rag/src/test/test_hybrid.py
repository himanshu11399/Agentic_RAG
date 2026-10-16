
from rag.hybrid_retrieval import (
    build_hybrid_retriever,
    hybrid_search,
)


def main():
    dense, bm25 = build_hybrid_retriever()

    question = input("Enter your question: ")

    results = hybrid_search(
        question=question,
        dense_retriever=dense,
        bm25_retriever=bm25,
        top_n=4,
    )

    print("\nHybrid retrieval results:")

    for rank, doc in enumerate(results, start=1):
        print(f"\n--- Rank {rank} ---")
        print("Source:", doc.metadata.get("source"))
        print(doc.page_content)


if __name__ == "__main__":
    main()
