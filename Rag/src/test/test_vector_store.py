
from rag.vector_store import create_vector_store


def main():
    vector_store = create_vector_store()

    query = "What is retrieval augmented generation?"

    results = vector_store.similarity_search(
        query,
        k=4,
    )

    print("\nRetrieved chunks:")

    for i, document in enumerate(results, start=1):
        print(f"\n--- Result {i} ---")
        print("Source:", document.metadata.get("source"))
        print("Content:", document.page_content)


if __name__ == "__main__":
    main()
