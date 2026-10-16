from pathlib import Path

from langchain_community.document_loaders import (
    DirectoryLoader,
    PyPDFLoader,
    TextLoader,
)
from langchain_text_splitters import RecursiveCharacterTextSplitter

from rag.config import DATA_DIR, CHUNK_SIZE, CHUNK_OVERLAP

def load_documents():
    """Load PDFs and text files from the documents directory."""
    if not DATA_DIR.exists():
        raise FileNotFoundError(
            f"Document directory not found: {DATA_DIR}"
        )

    documents = []

    # Load PDFs
    pdf_loader = DirectoryLoader(
        str(DATA_DIR),
        glob="**/*.pdf",
        loader_cls=PyPDFLoader,
        show_progress=True,
    )
    documents.extend(pdf_loader.load())

     # Load text files
    txt_loader = DirectoryLoader(
        str(DATA_DIR),
        glob="**/*.txt",
        loader_cls=TextLoader,
        loader_kwargs={"encoding": "utf-8"},
        show_progress=True,
    )
    documents.extend(txt_loader.load())

    return documents

def split_documents(documents):
    """Split documents while retaining their metadata."""

    splitter = RecursiveCharacterTextSplitter(
        chunk_size=CHUNK_SIZE,
        chunk_overlap=CHUNK_OVERLAP,
        add_start_index=True,
    )

    return splitter.split_documents(documents)

def ingest_documents():
    """Load and chunk documents."""
    documents = load_documents()
    chunks = split_documents(documents)

    print(f"Loaded {len(documents)} documents")
    print(f"Created {len(chunks)} chunks")

    return chunks

if __name__=="__main__":
    ingest_documents()
