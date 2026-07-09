from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models.notification import Notification
from models.user import User
from auth import get_current_user
from schemas import NotificationResponse
from typing import List

router = APIRouter(prefix="/notifications", tags=["notifications"])

@router.get("", response_model=List[NotificationResponse])
def get_notifications(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get all notifications for the current user."""
    identifiers = [current_user.username]
    if current_user.email:
        identifiers.append(current_user.email)
    
    if current_user.role == "candidate":
        from models.candidate import Candidate
        candidate = db.query(Candidate).filter(Candidate.email == current_user.email).first()
        if not candidate:
            candidate = db.query(Candidate).filter(Candidate.name.ilike(current_user.username)).first()
        if candidate:
            identifiers.append(candidate.candidate_id)

    return db.query(Notification).filter(
        Notification.user_identifier.in_(identifiers)
    ).order_by(Notification.created_at.desc()).all()


@router.put("/{notification_id}/read", response_model=NotificationResponse)
def read_notification(
    notification_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Mark a notification as read."""
    notif = db.get(Notification, notification_id)
    if not notif:
        raise HTTPException(404, "Notification not found")
        
    identifiers = [current_user.username]
    if current_user.email:
        identifiers.append(current_user.email)
    
    if current_user.role == "candidate":
        from models.candidate import Candidate
        candidate = db.query(Candidate).filter(Candidate.email == current_user.email).first()
        if not candidate:
            candidate = db.query(Candidate).filter(Candidate.name.ilike(current_user.username)).first()
        if candidate:
            identifiers.append(candidate.candidate_id)

    if notif.user_identifier not in identifiers:
        raise HTTPException(403, "Not your notification")
        
    notif.is_read = True
    db.commit()
    db.refresh(notif)
    return notif
