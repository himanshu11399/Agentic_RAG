from rag.graph import build_rag_graph


def main():
    app = build_rag_graph()

    question = input("Ask a question about your documents: ")

    result = app.invoke(
        {
            "question": question,
            "documents": [],
            "answer": "",
            "context_relevance": "",
            "rewrite_question_retry_count": 0,
            "answer_verdict": "",
            "answer_retry_count": 0,
        }
    )

    print("\nAnswer:")
    print(result["answer"])

    print("\nRetrieved sources:")

    for doc in result["documents"]:
        source = doc.metadata.get("source", "unknown")
        page = doc.metadata.get("page")

        if page is not None:
            print(f"- {source}, page {page + 1}")
        else:
            print(f"- {source}")
    print("*******************************************************")
    print(result)        


if __name__ == "__main__":
    main()
