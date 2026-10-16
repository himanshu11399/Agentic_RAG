from multiprocessing.util import abstract_sockets_supported
from typing import Literal

from langchain_groq import ChatGroq
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser

from rag.config import GROQ_API_KEY, GROQ_MODEL

llm = ChatGroq(
    api_key=GROQ_API_KEY,
    model=GROQ_MODEL,
    temperature=0,
)

evaluation_prompt = ChatPromptTemplate.from_messages(
    [
        (
            "system",
            """
You are checking whether an answer is grounded in the provided context.

Return exactly one label:
- supported: the answer's factual claims are supported by the context.
- unsupported: the answer contains claims that the context does not support.

Do not use outside knowledge. Judge only the supplied context.
""",
        ),
        (
            "human",
            """
Question:
{question}

Context:
{context}

Generated answer:
{answer}

Label:
""",
        ),
    ]
)

evaluation_chain = evaluation_prompt | llm | StrOutputParser()

def evaluate_grounding(
    question: str,
    context: str,
    answer: str,
) -> Literal["supported","unsupported","abstained"]:
    """Evaluate if the answer is grounded in the context."""
    
    abstention_phrases = (
        "couldn't find enough relevant information",
        "could not find enough relevant information",
        "not enough information in the provided context",
        "cannot answer from the provided context",
        "don't have enough information",
    )

    normalized_answer = answer.strip().lower()

    if any(phrase in normalized_answer for phrase in abstention_phrases):
        return "abstained"

    result=evaluation_chain.invoke({
        "question":question,
        "context":context,
        "answer":answer
    })
    
    label=result.strip().lower()

    if label=="supported":
        return "supported"
    elif label=="abstained":
        return "abstained"    
    
    # Treat unexpected output conservatively.
    return "unsupported"

