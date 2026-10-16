from langchain_groq import ChatGroq
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser

from rag.config import GROQ_API_KEY, GROQ_MODEL

llm = ChatGroq(
    api_key=GROQ_API_KEY,
    model=GROQ_MODEL,
    temperature=0,
)

rewrite_prompt = ChatPromptTemplate.from_messages(
    [
        (
            "system",
            """
Rewrite the user's question to make it clearer for document retrieval.
Keep the original meaning. Do not answer it.
Return only the rewritten question.
""",
        ),
        ("human", "{question}"),
    ]
)

rewrite_chain = rewrite_prompt | llm | StrOutputParser()

def rewrite_query(question: str) -> str:
    """Rewrite a user's question for better retrieval."""
    return rewrite_chain.invoke({"question": question}).strip()