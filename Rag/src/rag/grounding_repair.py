from langchain_groq import ChatGroq
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser

from rag.config import GROQ_API_KEY, GROQ_MODEL

repair_llm = ChatGroq(
    api_key=GROQ_API_KEY,
    model=GROQ_MODEL,
    temperature=0,
)

repair_prompt = ChatPromptTemplate.from_messages(
    [
        (
            "system",
            """
Answer the question using ONLY the provided context.

Every factual claim must be supported by the context.
If the context does not contain enough information, say:
"I couldn't find enough relevant information in the indexed documents to answer reliably."

Do not guess. Do not add outside knowledge.
""",
        ),
        (
            "human",
            """
Question:
{question}

Context:
{context}

Previous answer (may contain unsupported claims):
{previous_answer}

Write a corrected answer:
""",
        ),
    ]
)
repair_chain = repair_prompt | repair_llm | StrOutputParser()


