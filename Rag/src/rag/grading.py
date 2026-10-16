from typing import Literal

from langchain_groq import ChatGroq
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser

from rag.config import GROQ_API_KEY, GROQ_MODEL

grader_llm = ChatGroq(
    api_key=GROQ_API_KEY,
    model=GROQ_MODEL,
    temperature=0,
)

grader_prompt = ChatPromptTemplate.from_messages(
    [
        (
            "system",
            """
You are a retrieval-quality grader.

Decide whether the supplied documents contain information that can help
answer the user's question.

Return exactly one word:
- relevant
- not_relevant

Do not answer the question. Judge only the evidence in the documents.
""",
        ),
        (
            "human",
            """
Question:
{question}

Retrieved documents:
{context}
""",
        ),
    ]
)
grader_chain = grader_prompt | grader_llm | StrOutputParser()

def grade_retrieved_context(
    question:str,
    documents:list,
)->Literal["relevant","not_relevant"]:
    context = "\n\n".join(doc.page_content for doc in documents)
    result=grader_chain.invoke({"question":question,"context":context})
    normalized=result.strip().lower()

    if normalized=="relevant":
        return "relevant"

    return "not_relevant"    
