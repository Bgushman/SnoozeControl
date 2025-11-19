import os
from datetime import datetime
from fastapi import FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv()
API_KEY = os.getenv("API_KEY", "")
MONGODB_URI = os.getenv("MONGODB_URI")
DB_NAME = os.getenv("MONGODB_DB", "drowsy")

app = FastAPI(title="Drowsiness App API", version="1.0.0")

# Allow your Expo LAN / emulator
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], allow_credentials=True,
    allow_methods=["*"], allow_headers=["*"],
)

client = AsyncIOMotorClient(MONGODB_URI)
db = client[DB_NAME]
sessions = db["sessions"]

class SessionIn(BaseModel):
    id: str
    user_id: str | None = None
    startedAt: int = Field(..., description="epoch ms")
    durationSec: int
    alerts: int
    sensitivity: str
    avgEar: float | None = None
    deviceConnected: bool | None = None
    createdAt: datetime | None = None

class SessionOut(SessionIn):
    _id: str | None = None

def check_key(x_api_key: str | None):
    if not API_KEY or x_api_key != API_KEY:
        raise HTTPException(status_code=401, detail="Unauthorized")

@app.get("/health")
async def health():
    return {"ok": True}

@app.post("/sessions", response_model=SessionOut)
async def create_session(payload: SessionIn, x_api_key: str | None = Header(default=None)):
    check_key(x_api_key)
    doc = payload.model_dump()
    doc["createdAt"] = payload.createdAt or datetime.utcnow()
    await sessions.insert_one(doc)
    doc["_id"] = str(doc.get("_id", ""))
    return doc

@app.get("/sessions")
async def list_sessions(x_api_key: str | None = Header(default=None), limit: int = 50):
    check_key(x_api_key)
    cur = sessions.find().sort("startedAt", -1).limit(limit)
    out = []
    async for d in cur:
        d["_id"] = str(d["_id"])
        out.append(d)
    return out
