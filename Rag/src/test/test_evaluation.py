from rag.graph import build_rag_graph
from rag.evaluation import evaluate_grounding


def main():
    question = input("Ask a question: ")

    result = build_rag_graph().invoke(
        {
            "question": question,
            "documents": [],
            "answer": "",
            "relevance": "",
            "retry_count": 0,
        }
    )

    answer = result["answer"]

    context = "\n\n".join(
        doc.page_content for doc in result["documents"]
    )

    verdict = evaluate_grounding(
        question=question,
        context=context,
        answer=answer,
    )

    print("\nGenerated answer:\n", answer)
    print("\nGrounding verdict:", verdict)


if __name__ == "__main__":
    main()