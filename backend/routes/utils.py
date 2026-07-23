from typing import Optional
from fastapi import Header, HTTPException, Depends, status
import jwt
from sqlalchemy.orm import Session
from config import Config
from models import User
from database import get_db

def get_current_user(authorization: Optional[str] = Header(None), db: Session = Depends(get_db)) -> User:
    if not authorization:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token is missing!"
        )
    
    token = None
    if authorization.startswith("Bearer "):
        token = authorization.split(" ")[1]
    else:
        token = authorization  # fallback if no Bearer prefix is used in tests/client
        
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token is missing!"
        )
        
    try:
        data = jwt.decode(token, Config.SECRET_KEY, algorithms=["HS256"])
        user_id = data.get("user_id")
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token is invalid!"
            )
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found!"
            )
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired!"
        )
    except jwt.InvalidTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token is invalid!"
        )
