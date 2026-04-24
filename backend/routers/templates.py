from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db
from auth_utils import get_current_user
import models

router = APIRouter(prefix="/api/templates", tags=["templates"])


@router.get("")
def list_templates(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    return db.query(models.Template).filter(models.Template.is_public == True).all()


@router.get("/{template_id}")
def get_template(template_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    t = db.query(models.Template).filter(models.Template.id == template_id).first()
    if not t:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Template not found")
    return t
