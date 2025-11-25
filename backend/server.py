from fastapi import FastAPI, APIRouter, HTTPException, Cookie, Response
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import bcrypt

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Session expiry time (24 hours)
SESSION_EXPIRY_HOURS = 24

# Models
class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    username: str
    is_admin: bool
    created_at: str

class UserCreate(BaseModel):
    username: str
    password: str

class UserLogin(BaseModel):
    username: str
    password: str

class UserPasswordUpdate(BaseModel):
    new_password: str

class Post(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    author_id: str
    author_username: str
    content: str
    created_at: str

class PostCreate(BaseModel):
    content: str

# Helper functions
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

async def get_user_from_session(session_id: Optional[str]) -> Optional[dict]:
    if not session_id:
        return None
    
    session = await db.sessions.find_one({"session_id": session_id})
    if not session:
        return None
    
    # Check if session expired
    expires_at = datetime.fromisoformat(session['expires_at'])
    if expires_at < datetime.now(timezone.utc):
        await db.sessions.delete_one({"session_id": session_id})
        return None
    
    user = await db.users.find_one({"id": session['user_id']}, {"_id": 0, "password": 0})
    return user

async def create_default_admin():
    """Create default admin user if it doesn't exist"""
    existing_admin = await db.users.find_one({"username": "admin"})
    if not existing_admin:
        admin_user = {
            "id": str(uuid.uuid4()),
            "username": "admin",
            "password": hash_password("admin"),
            "is_admin": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.users.insert_one(admin_user)
        logger.info("Default admin user created: username='admin', password='admin'")

# Auth endpoints
@api_router.post("/auth/login")
async def login(credentials: UserLogin, response: Response):
    user = await db.users.find_one({"username": credentials.username})
    
    if not user or not verify_password(credentials.password, user['password']):
        raise HTTPException(status_code=401, detail="Credenziali non valide")
    
    # Create session
    session_id = str(uuid.uuid4())
    expires_at = datetime.now(timezone.utc) + timedelta(hours=SESSION_EXPIRY_HOURS)
    
    session = {
        "session_id": session_id,
        "user_id": user['id'],
        "created_at": datetime.now(timezone.utc).isoformat(),
        "expires_at": expires_at.isoformat()
    }
    await db.sessions.insert_one(session)
    
    # Set cookie
    response.set_cookie(
        key="session_id",
        value=session_id,
        httponly=True,
        max_age=SESSION_EXPIRY_HOURS * 3600,
        samesite="lax"
    )
    
    return {
        "id": user['id'],
        "username": user['username'],
        "is_admin": user['is_admin']
    }

@api_router.post("/auth/logout")
async def logout(response: Response, session_id: Optional[str] = Cookie(None)):
    if session_id:
        await db.sessions.delete_one({"session_id": session_id})
    
    response.delete_cookie(key="session_id")
    return {"message": "Logout effettuato con successo"}

@api_router.get("/auth/me")
async def get_current_user(session_id: Optional[str] = Cookie(None)):
    user = await get_user_from_session(session_id)
    if not user:
        raise HTTPException(status_code=401, detail="Non autenticato")
    return user

# User management endpoints (admin only)
@api_router.get("/users", response_model=List[User])
async def get_users(session_id: Optional[str] = Cookie(None)):
    user = await get_user_from_session(session_id)
    if not user or not user.get('is_admin'):
        raise HTTPException(status_code=403, detail="Accesso negato")
    
    users = await db.users.find({}, {"_id": 0, "password": 0}).to_list(1000)
    return users

@api_router.post("/users", response_model=User)
async def create_user(user_data: UserCreate, session_id: Optional[str] = Cookie(None)):
    user = await get_user_from_session(session_id)
    if not user or not user.get('is_admin'):
        raise HTTPException(status_code=403, detail="Accesso negato")
    
    # Check if username already exists
    existing = await db.users.find_one({"username": user_data.username})
    if existing:
        raise HTTPException(status_code=400, detail="Nome utente già esistente")
    
    new_user = {
        "id": str(uuid.uuid4()),
        "username": user_data.username,
        "password": hash_password(user_data.password),
        "is_admin": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(new_user)
    
    # Return without password
    new_user.pop('password')
    new_user.pop('_id', None)
    return new_user

@api_router.delete("/users/{user_id}")
async def delete_user(user_id: str, session_id: Optional[str] = Cookie(None)):
    user = await get_user_from_session(session_id)
    if not user or not user.get('is_admin'):
        raise HTTPException(status_code=403, detail="Accesso negato")
    
    # Prevent deleting admin user
    target_user = await db.users.find_one({"id": user_id})
    if target_user and target_user.get('username') == 'admin':
        raise HTTPException(status_code=400, detail="Impossibile eliminare l'utente admin")
    
    result = await db.users.delete_one({"id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Utente non trovato")
    
    # Delete user's sessions and posts
    await db.sessions.delete_many({"user_id": user_id})
    await db.posts.delete_many({"author_id": user_id})
    
    return {"message": "Utente eliminato con successo"}

@api_router.put("/users/{user_id}/password")
async def update_user_password(user_id: str, password_data: UserPasswordUpdate, session_id: Optional[str] = Cookie(None)):
    user = await get_user_from_session(session_id)
    if not user or not user.get('is_admin'):
        raise HTTPException(status_code=403, detail="Accesso negato")
    
    result = await db.users.update_one(
        {"id": user_id},
        {"$set": {"password": hash_password(password_data.new_password)}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Utente non trovato")
    
    # Invalidate all sessions for this user
    await db.sessions.delete_many({"user_id": user_id})
    
    return {"message": "Password aggiornata con successo"}

# Post endpoints
@api_router.get("/posts", response_model=List[Post])
async def get_posts(session_id: Optional[str] = Cookie(None)):
    user = await get_user_from_session(session_id)
    if not user:
        raise HTTPException(status_code=401, detail="Non autenticato")
    
    posts = await db.posts.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return posts

@api_router.post("/posts", response_model=Post)
async def create_post(post_data: PostCreate, session_id: Optional[str] = Cookie(None)):
    user = await get_user_from_session(session_id)
    if not user:
        raise HTTPException(status_code=401, detail="Non autenticato")
    
    new_post = {
        "id": str(uuid.uuid4()),
        "author_id": user['id'],
        "author_username": user['username'],
        "content": post_data.content,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.posts.insert_one(new_post)
    
    new_post.pop('_id', None)
    return new_post

@api_router.delete("/posts/{post_id}")
async def delete_post(post_id: str, session_id: Optional[str] = Cookie(None)):
    user = await get_user_from_session(session_id)
    if not user:
        raise HTTPException(status_code=401, detail="Non autenticato")
    
    post = await db.posts.find_one({"id": post_id})
    if not post:
        raise HTTPException(status_code=404, detail="Post non trovato")
    
    # Check if user is author or admin
    if post['author_id'] != user['id'] and not user.get('is_admin'):
        raise HTTPException(status_code=403, detail="Accesso negato")
    
    await db.posts.delete_one({"id": post_id})
    return {"message": "Post eliminato con successo"}

@api_router.get("/posts/search", response_model=List[Post])
async def search_posts(q: str, session_id: Optional[str] = Cookie(None)):
    user = await get_user_from_session(session_id)
    if not user:
        raise HTTPException(status_code=401, detail="Non autenticato")
    
    # Search for partial matches in content
    posts = await db.posts.find(
        {"content": {"$regex": q, "$options": "i"}},
        {"_id": 0}
    ).sort("created_at", -1).to_list(1000)
    return posts

@api_router.get("/posts/user/{user_id}", response_model=List[Post])
async def get_user_posts(user_id: str, session_id: Optional[str] = Cookie(None)):
    user = await get_user_from_session(session_id)
    if not user:
        raise HTTPException(status_code=401, detail="Non autenticato")
    
    posts = await db.posts.find(
        {"author_id": user_id},
        {"_id": 0}
    ).sort("created_at", -1).to_list(1000)
    return posts

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("startup")
async def startup_event():
    await create_default_admin()
    logger.info("Application started")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
