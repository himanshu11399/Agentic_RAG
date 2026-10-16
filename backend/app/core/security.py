import logging
from functools import lru_cache
from typing import Any

import jwt
from jwt import PyJWKClient, PyJWTError

from app.core.config import settings

logger = logging.getLogger(__name__)

class AuthenticationError(Exception):
    """Raised when access token cannot be authenticated."""

@lru_cache(maxsize=1)
def get_jwks_client()->PyJWKClient:
    if not settings.CLERK_JWKS_URL:
        raise RuntimeError("CLERK_JWKS_URL is not configured") 
    return PyJWKClient(settings.CLERK_JWKS_URL)

def verify_clerk_token(token:str)->dict[str,Any]:
    if not settings.CLERK_ISSUER:
        raise RuntimeError("CLERK_ISSUER is not configured") 
    
    if not token or len(token)>16_384:
        raise AuthenticationError("Invalid or malformed token")
      
    try:
        signing_key=get_jwks_client().get_signing_key_from_jwt(token)
        
        options:dict[str,Any]={
            "require":["exp","sub","iss"],
            "verify_signature":True,
            "verify_exp":True,
            "verify_iss":True,
            "verify_aud":bool(settings.CLERK_AUDIENCE),
        }

        # Allow issuer with or without trailing slash
        clean_issuer = settings.CLERK_ISSUER.rstrip("/")
        valid_issuers = [clean_issuer, f"{clean_issuer}/"]
        
        decode_args: dict[str, Any] = {
            "key": signing_key.key,
            "algorithms": ["RS256"],
            "issuer": valid_issuers,
            "options": options,
            "leeway": 60,
        }
        if settings.CLERK_AUDIENCE:
            decode_args["audience"] = settings.CLERK_AUDIENCE
            
        claims = jwt.decode(token, **decode_args)
        
        if not isinstance(claims.get("sub"), str) or not claims["sub"]:
            raise AuthenticationError("Token has no valid user identity")

        return claims

    except AuthenticationError:
        raise
    except (PyJWTError, ValueError) as exc:
        logger.warning("Clerk token verification failed: %s - %s", type(exc).__name__, exc)
        raise AuthenticationError(f"Invalid or expired access token: {exc}") from exc
    except Exception as exc:
        # Includes JWKS retrieval failures. Never accept a token if
        # its signature could not be verified.
        logger.exception("Unexpected error during Clerk token verification: %s", exc)
        raise AuthenticationError("Unable to verify access token") from exc

    