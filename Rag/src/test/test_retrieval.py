
from rag.vector_store import load_vector_store, get_retriever


def main():
    vector_store = load_vector_store()

    retriever = get_retriever(
        vector_store,
        top_k=4,
    )

    question = "What is RAG and how does it work?"

    documents = retriever.invoke(question)

    for rank, document in enumerate(documents, start=1):
        print(f"\n--- Retrieved document {rank} ---")
        print("Metadata:", document.metadata)
        print(document.page_content)


if __name__ == "__main__":
    main()
