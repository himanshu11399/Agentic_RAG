from sentence_transformers import CrossEncoder
from langchain_core.documents import Document

RERANKER_MODEL = "cross-encoder/ms-marco-MiniLM-L-6-v2"

def get_reranker():
    """Load the cross-encoder on CPU."""
    return CrossEncoder(
        RERANKER_MODEL,
        device="cpu",
    )

def rerank_documents(
    question:str,
    documents:list[Document],
    reranker:CrossEncoder,
    top_n:int=4,
)->list[Document]:
    """
    Score each question-document pair and return the
    highest-scoring documents.
    """
    if not documents or not question:
        return [] 

    pairs=[
        (question,doc.page_content) for doc in documents
    ] 

    scores=reranker.predict(pairs)

    ranked=sorted(
        zip(documents,scores),
        key=lambda item:float(item[1]),
        reverse=True
    )   

    result=[]

    for doc,score in ranked[:top_n]:
        ranked_doc=Document(
            page_content=doc.page_content,
            metadata={
                **doc.metadata,
                "rerank_score": float(score),
            },
        )

        result.append(ranked_doc)

    return result