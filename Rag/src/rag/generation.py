from langchain_groq import ChatGroq
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser

from rag.config import GROQ_API_KEY, GROQ_MODEL

def get_llm():
    """Initialize the Groq chat model."""

    return ChatGroq(
        api_key=GROQ_API_KEY,
        model=GROQ_MODEL,
        temperature=0,
    )

def get_generation_chain():
    """Create a chain that answers using retrieved context."""

    prompt = ChatPromptTemplate.from_template(
        """
You are a helpful assistant answering questions using retrieved documents.

Instructions:
- Answer using only the information in the provided context.
- If the context does not contain the answer, say you do not know
  based on the available documents.
- Do not invent facts.
- Include source filenames when possible.

Context:
{context}

Question:
{question}

Answer:
"""
    )

    return prompt | get_llm() | StrOutputParser()

def generate_answer(question:str,documents:list):
    """
    Generate an answer for the given question using retrieved documents.
    """
    context = "\n\n".join(doc.page_content for doc in documents)
    return get_generation_chain().invoke({"question":question,"context":context})
