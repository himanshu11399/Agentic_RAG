from langchain_community.vectorstores import FAISS
from langchain_huggingface import HuggingFaceEmbeddings

from rag.config import EMBEDDING_MODEL, VECTOR_STORE_DIR
from rag.ingestion import ingest_documents


def get_embeddings():
    """Initialize the local embedding model."""

    return HuggingFaceEmbeddings(
        model_name=EMBEDDING_MODEL,
        model_kwargs={"device": "cpu"},
        encode_kwargs={"normalize_embeddings": True},
    )

def create_vector_store():
    """Ingest documents, embed chunks, and build a FAISS index."""
    chunks = ingest_documents()
    if not chunks:
        raise ValueError(
            "No document chunks found. Add files to data/documents."
        )
    embeddings = get_embeddings()

    vector_store = FAISS.from_documents(
        documents=chunks,
        embedding=embeddings,
    )

    VECTOR_STORE_DIR.mkdir(parents=True, exist_ok=True)
    vector_store.save_local(str(VECTOR_STORE_DIR))

    print(f"FAISS index saved to: {VECTOR_STORE_DIR}")
    print(f"Indexed {len(chunks)} chunks")

    return vector_store

def load_vector_store():
    """Load an existing local FAISS index."""
    if not (VECTOR_STORE_DIR / "index.faiss").exists():
        raise FileNotFoundError(
            "FAISS index not found. Run create_vector_store() first."
        )

    embeddings = get_embeddings()
    
    # Only load an index you created and trust.
    return FAISS.load_local(
        str(VECTOR_STORE_DIR),
        embeddings,
        allow_dangerous_deserialization=True,
    )

def get_retriever(vector_store, top_k: int = 4):
    """Return a LangChain retriever."""
    return vector_store.as_retriever(
        search_type="similarity",
        search_kwargs={"k": top_k},
    )   

if __name__=="__main__":
    create_vector_store()