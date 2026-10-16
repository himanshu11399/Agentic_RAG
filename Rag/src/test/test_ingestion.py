from rag.ingestion import ingest_documents

def main():
    chunks = ingest_documents()

    for chunk in chunks[:3]:
        print("\n--- Chunk ---")
        print("Metadata:", chunk.metadata)
        print("Content:", chunk.page_content[:300])

if __name__ == "__main__":
    main()
