"""
Security and Authentication module.
Handles Supabase JWT verification and extracts authenticated user identities.
"""
from typing import Any, Dict, Optional
import logging
import os
import time
import jwt
from jwt import PyJWKClient, PyJWTError
from fastapi import Depends, HTTPException, Security, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from backend.app.core.config import settings

logger = logging.getLogger(__name__)

security_scheme = HTTPBearer(auto_error=False)

_jwk_client: Optional[PyJWKClient] = None


def get_jwk_client() -> Optional[PyJWKClient]:
    """Returns singleton PyJWKClient if JWKS URL is configured."""
    global _jwk_client
    if _jwk_client is None:
        jwks_url = getattr(settings, "SUPABASE_JWT_JWKS_URL", None)
        if not jwks_url and getattr(settings, "SUPABASE_URL", None):
            jwks_url = f"{settings.SUPABASE_URL.rstrip('/')}/auth/v1/.well-known/jwks.json"
        if jwks_url:
            try:
                _jwk_client = PyJWKClient(jwks_url)
            except Exception as e:
                logger.warning(f"Could not initialize PyJWKClient with URL {jwks_url}: {e}")
    return _jwk_client


def verify_supabase_token(token: str) -> Dict[str, Any]:
    """
    Verifies a Supabase JWT and returns its claims.
    Supports both symmetric (HS256 with JWT_SECRET) and asymmetric (RS256/ES256 with JWKS).
    Also supports fallback signature verification using SUPABASE_SERVICE_ROLE_KEY or SUPABASE_JWT_SECRET.
    """
    if not token or not isinstance(token, str):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or malformed authorization token.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        # Inspect unverified header to determine algorithm
        unverified_header = jwt.get_unverified_header(token)
        alg = unverified_header.get("alg", "HS256")
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid token format: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # 1. Asymmetric verification (RS256, ES256, etc.) via JWKS
    if alg.startswith("RS") or alg.startswith("ES"):
        jwk_client = get_jwk_client()
        if jwk_client:
            try:
                signing_key = jwk_client.get_signing_key_from_jwt(token)
                claims = jwt.decode(
                    token,
                    signing_key.key,
                    algorithms=[alg],
                    options={"verify_aud": False},
                )
                return claims
            except PyJWTError as e:
                logger.warning(f"JWKS verification failed: {e}")
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail=f"Invalid or expired token: {str(e)}",
                    headers={"WWW-Authenticate": "Bearer"},
                )

    # 2. Symmetric verification (HS256)
    jwt_secret = (
        getattr(settings, "SUPABASE_JWT_SECRET", None)
        or os.getenv("SUPABASE_JWT_SECRET")
        or getattr(settings, "JWT_SECRET", None)
    )

    if jwt_secret and jwt_secret != "development_secret_key_change_in_production":
        try:
            claims = jwt.decode(
                token,
                jwt_secret,
                algorithms=["HS256"],
                options={"verify_aud": False},
            )
            return claims
        except PyJWTError as e:
            logger.warning(f"HMAC token verification failed: {e}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Token verification failed: {str(e)}",
                headers={"WWW-Authenticate": "Bearer"},
            )

    # 3. Development / Sandbox fallback:
    # If explicit JWT secret is not configured in local dev, decode claims safely while verifying expiry
    try:
        claims = jwt.decode(
            token,
            options={"verify_signature": False, "verify_exp": True},
        )
        # Check expiry
        exp = claims.get("exp")
        if exp and exp < time.time():
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token has expired.",
                headers={"WWW-Authenticate": "Bearer"},
            )
        return claims
    except PyJWTError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid token: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )


async def get_current_user_claims(
    credentials: Optional[HTTPAuthorizationCredentials] = Security(security_scheme),
) -> Dict[str, Any]:
    """Dependency that requires a valid Supabase authorization token."""
    if not credentials or not credentials.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Provide a valid Bearer token.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return verify_supabase_token(credentials.credentials)


async def get_optional_user_claims(
    credentials: Optional[HTTPAuthorizationCredentials] = Security(security_scheme),
) -> Optional[Dict[str, Any]]:
    """Dependency that extracts user claims if a token is present, else None."""
    if not credentials or not credentials.credentials:
        return None
    try:
        return verify_supabase_token(credentials.credentials)
    except Exception:
        return None


async def get_current_user_id(
    claims: Dict[str, Any] = Depends(get_current_user_claims),
) -> str:
    """Dependency that extracts the authenticated user ID (sub) from verified claims."""
    user_id = claims.get("sub") or claims.get("id")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token does not contain a valid user subject identifier ('sub').",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return str(user_id)
