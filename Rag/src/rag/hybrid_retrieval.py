
from collections import defaultdict

from langchain_core.documents import Document
from langchain_community.retrievers import BM25Retriever

from rag.vector_store import load_vector_store
from rag.config import TOP_K


def reciprocal_rank_fusion(
    ranked_lists: list[list[Document]],
    k: int = 60,
    top_n: int = 4,
) -> list[Document]:
    """
    Fuse ranked document lists using Reciprocal Rank Fusion.

    Each document receives a score:
        score = sum(1 / (k + rank))

    Ranks start from 1.
    """

    scores = defaultdict(float)
    documents_by_id = {}

    for ranked_docs in ranked_lists:
        for rank, doc in enumerate(ranked_docs, start=1):

            # Use content + metadata as a simple document identity.
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


def build_hybrid_retriever():
    """
    Build a hybrid retriever from the persisted FAISS index.

    BM25 is constructed from the FAISS index's stored documents.
    """

    vector_store = load_vector_store()

    # FAISS docstore contains the chunks previously indexed.
    documents = list(
        vector_store.docstore._dict.values()
    )

    if not documents:
        raise ValueError("FAISS index contains no documents.")

    dense_retriever = vector_store.as_retriever(
        search_type="similarity",
        search_kwargs={"k": TOP_K},
    )

    bm25_retriever = BM25Retriever.from_documents(
        documents,
        k=TOP_K,
    )

    return dense_retriever, bm25_retriever


def hybrid_search(
    question: str,
    dense_retriever,
    bm25_retriever,
    top_n: int = 4,
) -> list[Document]:
    """Run dense and keyword retrieval, then fuse their rankings."""

    dense_docs = dense_retriever.invoke(question)
    keyword_docs = bm25_retriever.invoke(question)

    return reciprocal_rank_fusion(
        ranked_lists=[dense_docs, keyword_docs],
        top_n=top_n,
    )
