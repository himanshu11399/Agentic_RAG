
from collections import defaultdict
from langchain_core.documents import Document


def reciprocal_rank_fusion(
    ranked_lists: list[list[Document]],
    k: int = 60,
    top_n: int = 4,
) -> list[Document]:

    scores = defaultdict(float)
    documents_by_id = {}

    for ranked_docs in ranked_lists:
        for rank, doc in enumerate(ranked_docs, start=1):

            doc_id = (
                doc.page_content,
                str(sorted(doc.metadata.items())),
            )

            scores[doc_id] += 1 / (k + rank)
            documents_by_id[doc_id] = doc

    fused_ids = sorted(
        scores,
        key=lambda doc_id: scores[doc_id],
        reverse=True,
    )

    return [
        documents_by_id[doc_id]
        for doc_id in fused_ids[:top_n]
    ]


# Our knowledge base: four chunks
D1 = Document(
    page_content="LangGraph supports persistent state using a checkpointer.",
    metadata={"source": "langgraph.md"},
)

D2 = Document(
    page_content="LangChain can split documents into smaller text chunks.",
    metadata={"source": "langchain.md"},
)

D3 = Document(
    page_content="A checkpointer saves the graph state so a workflow can resume later.",
    metadata={"source": "langgraph.md"},
)

D4 = Document(
    page_content="FAISS retrieves semantically similar documents using vector embeddings.",
    metadata={"source": "faiss.md"},
)


# Simulated output of FAISS
dense_results = [D4, D3, D1]

# Simulated output of BM25
bm25_results = [D3, D1, D2]


# Fuse the two rankings
final_docs = reciprocal_rank_fusion(
    ranked_lists=[dense_results, bm25_results],
    k=60,
    top_n=4,
)

print("\nFinal fused ranking:")

for rank, doc in enumerate(final_docs, start=1):
    print(f"\nRank {rank}:")
    print(doc.page_content)
