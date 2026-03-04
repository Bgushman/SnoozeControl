import os
import time
import random
from datetime import datetime
from typing import Optional

from dotenv import load_dotenv
from fastapi import FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field

# Load .env from the SAME folder as this file (src/cloud-api/.env)
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
load_dotenv(os.path.join(BASE_DIR, ".env"))

API_KEY = os.getenv("API_KEY", "")
MONGODB_URI = os.getenv("MONGODB_URI", "")
DB_NAME = os.getenv("MONGODB_DB", "drowsy")

if not MONGODB_URI:
    raise RuntimeError("Missing MONGODB_URI in environment (.env)")

app = FastAPI(title="Drowsiness App API", version="1.0.0")

# Allow Expo / local dev
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

client = AsyncIOMotorClient(MONGODB_URI)
db = client[DB_NAME]
sessions = db["sessions"]

# ---------- POC telemetry endpoint ----------
@app.get("/data")
def data():
    # TEMP POC: fake telemetry that occasionally dips under threshold
    ear = random.choice([0.28, 0.27, 0.26, 0.18, 0.17])  # includes low values
    mar = random.choice([0.35, 0.40, 0.55])
    stage = 2 if ear < 0.20 else 0  # 2=ALERT, 0=NORMAL

    return {
        "timestamp": int(time.time() * 1000),
        "ear": ear,
        "mar": mar,
        "stage": stage,
        "drowsy_reason": ["POC"] if stage == 2 else [],
        "blinks": 0,
        "yawns": 0,
        "head_pitch": 0,
        "head_nods": 0,
    }

# ---------- auth + sessions ----------
class SessionIn(BaseModel):
    id: str
    user_id: Optional[str] = None
    startedAt: int = Field(..., description="epoch ms")
    durationSec: int
    alerts: int
    sensitivity: str
    avgEar: Optional[float] = None
    deviceConnected: Optional[bool] = None
    createdAt: Optional[datetime] = None

class SessionOut(SessionIn):
    _id: Optional[str] = None

def check_key(x_api_key: Optional[str]):
    if not API_KEY or x_api_key != API_KEY:
        raise HTTPException(status_code=401, detail="Unauthorized")

@app.get("/health")
async def health():
    return {"ok": True}

@app.post("/sessions", response_model=SessionOut)
async def create_session(payload: SessionIn, x_api_key: Optional[str] = Header(default=None)):
    check_key(x_api_key)

    doc = payload.model_dump()
    doc["createdAt"] = payload.createdAt or datetime.utcnow()

    result = await sessions.insert_one(doc)
    doc["_id"] = str(result.inserted_id)
    return doc

@app.get("/sessions")
async def list_sessions(x_api_key: Optional[str] = Header(default=None), limit: int = 50):
    check_key(x_api_key)

    cur = sessions.find().sort("startedAt", -1).limit(limit)
    out = []
    async for d in cur:
        d["_id"] = str(d["_id"])
        out.append(d)
    return out