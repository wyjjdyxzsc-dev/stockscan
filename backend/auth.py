from jose import JWTError, jwt
from passlib.context import CryptContext
from datetime import datetime, timedelta
from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from database import get_db
import models

SECRET_KEY = "stockscan-secret-key-change-in-production-please-2024"
ALGORITHM  = "HS256"
EXPIRE_DAYS = 30

pwd_context   = CryptContext(schemes=["bcrypt"], deprecated="auto")
bearer_scheme = HTTPBearer()

def hash_pin(pin: str) -> str:
    return pwd_context.hash(pin)

def verify_pin(pin: str, hashed: str) -> bool:
    return pwd_context.verify(pin, hashed)

def create_token(employee_id: str) -> str:
    exp = datetime.utcnow() + timedelta(days=EXPIRE_DAYS)
    return jwt.encode({"sub": employee_id, "exp": exp}, SECRET_KEY, algorithm=ALGORITHM)

def get_current_employee(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: Session = Depends(get_db),
):
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        eid = payload.get("sub")
        if not eid:
            raise HTTPException(status_code=401, detail="Invalid token")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

    emp = db.query(models.Employee).filter(models.Employee.id == eid).first()
    if not emp:
        raise HTTPException(status_code=401, detail="Employee not found")
    return emp

def verify_admin_pin_db(db: Session, admin_pin: str):
    admins = db.query(models.Employee).filter(models.Employee.role == "admin").all()
    found  = next((a for a in admins if verify_pin(admin_pin, a.pin_hash)), None)
    if not found:
        raise HTTPException(status_code=403, detail="Invalid admin PIN")
    return found
