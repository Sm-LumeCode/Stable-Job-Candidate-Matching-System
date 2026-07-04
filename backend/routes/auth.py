"""
Authentication Routes
======================
POST /api/auth/login    — validate credentials, return JWT
POST /api/auth/register — self-register as recruiter or candidate
GET  /api/auth/me       — return current user profile
"""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from auth import (
    create_access_token,
    get_current_user,
    hash_password,
    verify_password,
)
from database import get_db
from models.user import User

router = APIRouter(prefix="/auth", tags=["auth"])


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------

class LoginPayload(BaseModel):
    username: str = Field(min_length=1)
    password: str = Field(min_length=1)
    role: str = Field(min_length=1)  # expected role from the selector


class RegisterPayload(BaseModel):
    username: str = Field(min_length=3, max_length=80)
    email: str | None = None
    password: str = Field(min_length=6, max_length=128)
    role: str  # "recruiter" | "candidate"


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    username: str
    user_id: int


class UserResponse(BaseModel):
    id: int
    username: str
    email: str | None
    role: str


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.post("/login", response_model=TokenResponse)
def login(payload: LoginPayload, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == payload.username).first()
    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(401, "Invalid username or password")
    # Ensure the user is actually in the role they selected
    if user.role != payload.role:
        raise HTTPException(403, f"This account is not registered as a {payload.role}")
    token = create_access_token({"sub": str(user.id), "role": user.role})
    return TokenResponse(
        access_token=token,
        role=user.role,
        username=user.username,
        user_id=user.id,
    )


@router.post("/register", response_model=TokenResponse, status_code=201)
def register(payload: RegisterPayload, db: Session = Depends(get_db)):
    if payload.role not in ("recruiter", "candidate"):
        raise HTTPException(400, "Self-registration is only allowed for recruiter or candidate roles")
    if db.query(User).filter(User.username == payload.username).first():
        raise HTTPException(409, "Username already taken")
    if payload.email and db.query(User).filter(User.email == payload.email).first():
        raise HTTPException(409, "Email already registered")
    user = User(
        username=payload.username,
        email=payload.email or None,
        hashed_password=hash_password(payload.password),
        role=payload.role,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    token = create_access_token({"sub": str(user.id), "role": user.role})
    return TokenResponse(
        access_token=token,
        role=user.role,
        username=user.username,
        user_id=user.id,
    )


@router.get("/me", response_model=UserResponse)
def me(current_user: User = Depends(get_current_user)):
    return UserResponse(
        id=current_user.id,
        username=current_user.username,
        email=current_user.email,
        role=current_user.role,
    )
