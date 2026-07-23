from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from database import get_db
from models import User
from schemas import SignupRequest, LoginRequest
from routes.utils import get_current_user
import jwt
from datetime import datetime, timedelta
from config import Config

auth_router = APIRouter()

@auth_router.post('/signup', status_code=status.HTTP_201_CREATED)
def signup(req: SignupRequest, db: Session = Depends(get_db)):
    if db.query(User).filter(User.username == req.username).first():
        raise HTTPException(status_code=409, detail="Username already exists")
        
    if db.query(User).filter(User.email == req.email).first():
        raise HTTPException(status_code=409, detail="Email already exists")
        
    user = User(
        username=req.username,
        email=req.email,
        role=req.role
    )
    user.set_password(req.password)
    db.add(user)
    db.commit()
    db.refresh(user)
    
    return {'message': 'User registered successfully', 'user': user.to_dict()}

@auth_router.post('/login')
def login(req: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == req.username).first()
    if not user or not user.check_password(req.password):
        raise HTTPException(status_code=401, detail="Invalid username or password")
        
    token = jwt.encode({
        'user_id': user.id,
        'exp': datetime.utcnow() + timedelta(hours=24)
    }, Config.SECRET_KEY, algorithm='HS256')
    
    return {
        'message': 'Login successful',
        'token': token,
        'user': user.to_dict()
    }

@auth_router.get('/me')
def get_me(current_user: User = Depends(get_current_user)):
    return current_user.to_dict()
