"""
JWT Authentication & Role Guards
=================================
Handles password hashing, token creation/verification, and FastAPI
dependency-injection guards for admin / recruiter / candidate roles.

Admin account
-------------
The `admin` user (password: qwerty) is seeded via seed_admin() which is
called at application startup.  The password is stored as a bcrypt hash
only — it is never transmitted to the frontend.
"""

import os
from datetime import datetime, timedelta, timezone
from typing import Literal

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from database import get_db
from models.user import User

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
# In production replace SECRET_KEY with a long random value from env vars.
SECRET_KEY = os.getenv("SECRET_KEY", "stablehire-secret-key-change-in-production-2024")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 8  # 8 hours

ADMIN_USERNAME = "admin"
ADMIN_PASSWORD = "qwerty"  # used only during seeding; never sent to frontend

import bcrypt

Role = Literal["admin", "recruiter", "candidate"]

_bearer = HTTPBearer(auto_error=False)

def hash_password(plain: str) -> str:
    # bcrypt requires bytes and returns bytes; we store as string
    return bcrypt.hashpw(plain.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode('utf-8'), hashed.encode('utf-8'))


# ---------------------------------------------------------------------------
# JWT helpers
# ---------------------------------------------------------------------------

def create_access_token(data: dict) -> str:
    payload = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    payload["exp"] = expire
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc


# ---------------------------------------------------------------------------
# FastAPI dependency: get current user
# ---------------------------------------------------------------------------

def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer),
    db: Session = Depends(get_db),
) -> User:
    if not credentials:
        raise HTTPException(status_code=401, detail="Not authenticated")
    payload = decode_token(credentials.credentials)
    user_id: int | None = payload.get("sub")
    if user_id is None:
        raise HTTPException(status_code=401, detail="Invalid token payload")
    user = db.get(User, int(user_id))
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user


# ---------------------------------------------------------------------------
# Role guards (use as FastAPI dependencies)
# ---------------------------------------------------------------------------

def _role_guard(*allowed_roles: Role):
    """Factory that returns a FastAPI dependency enforcing one of allowed_roles."""
    def guard(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access restricted. Required role(s): {', '.join(allowed_roles)}",
            )
        return current_user
    return guard


require_admin = _role_guard("admin")
require_recruiter = _role_guard("recruiter")
require_candidate = _role_guard("candidate")
require_admin_or_recruiter = _role_guard("admin", "recruiter")
require_any_role = _role_guard("admin", "recruiter", "candidate")


# ---------------------------------------------------------------------------
# Admin seeding
# ---------------------------------------------------------------------------

def seed_admin(db: Session) -> None:
    """Create or repair the admin account on startup."""
    # First: fix any existing admin row that has a blank email (legacy migration artifact)
    stale = db.query(User).filter(User.role == "admin", User.email == "").first()
    if stale:
        # Check if a proper admin already exists separately
        proper = db.query(User).filter(User.email == "admin@stablehire.com").first()
        if proper:
            # Two admin rows — remove the stale blank one
            db.delete(stale)
        else:
            # Patch the blank one with the correct email
            stale.email = "admin@stablehire.com"
            stale.username = "Admin"
        db.commit()
        print("[StableHire] Admin account email repaired.")
        return

    existing = db.query(User).filter(User.email == "admin@stablehire.com").first()
    if not existing:
        admin = User(
            username="Admin",
            email="admin@stablehire.com",
            hashed_password=hash_password(ADMIN_PASSWORD),
            role="admin",
        )
        db.add(admin)
        db.commit()
        print("[StableHire] Admin account created.")
    else:
        print("[StableHire] Admin account ready.")
