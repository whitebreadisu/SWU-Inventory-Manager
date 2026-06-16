from typing import Optional

import firebase_admin
from fastapi import Header, HTTPException
from firebase_admin import auth, credentials, exceptions

_firebase_app: Optional[firebase_admin.App] = None


def _get_firebase_app() -> firebase_admin.App:
    """Lazily initialize the Firebase Admin app using Application Default
    Credentials. On Cloud Run this is the runtime service account's identity
    automatically -- no Secret Manager entry needed. Never called during
    tests, which override get_current_identity directly."""
    global _firebase_app
    if _firebase_app is None:
        _firebase_app = firebase_admin.initialize_app(credentials.ApplicationDefault())
    return _firebase_app


def verify_firebase_token(authorization: Optional[str]) -> tuple[str, str]:
    """Verify a 'Bearer <Firebase ID token>' Authorization header.

    Returns (firebase_uid, email). Raises HTTPException(401) if the header
    is missing or the token doesn't verify.
    """
    if authorization is None or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=401, detail="Missing or invalid Authorization header"
        )

    token = authorization.removeprefix("Bearer ")
    try:
        decoded = auth.verify_id_token(token, app=_get_firebase_app())
    except (ValueError, exceptions.FirebaseError):
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    return decoded["uid"], decoded.get("email", "")


def get_current_identity(
    authorization: Optional[str] = Header(default=None),
) -> tuple[str, str]:
    """FastAPI dependency: the verified (firebase_uid, email) of the caller.

    Tests override this dependency via app.dependency_overrides, so the real
    Firebase Admin app is never initialized outside a deployment.
    """
    return verify_firebase_token(authorization)
