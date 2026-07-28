from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

import os
import uuid
import json
import logging
from datetime import datetime, timezone, timedelta
from typing import List, Optional

import bcrypt
import jwt
import requests
import stripe
from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, UploadFile, File, Form, Header, Query
from fastapi.responses import Response
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, EmailStr

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger("panou-antrenor")

# ---------------------------------------------------------------- DB
mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

# ---------------------------------------------------------------- Stripe
stripe.api_key = os.environ.get("STRIPE_SECRET_KEY") or "sk_test_emergent"
STRIPE_WEBHOOK_SECRET = os.environ.get("STRIPE_WEBHOOK_SECRET", "")

# ---------------------------------------------------------------- Object storage
STORAGE_URL = "https://integrations.emergentagent.com/objstore/api/v1/storage"
EMERGENT_KEY = os.environ.get("EMERGENT_LLM_KEY")
APP_NAME = "panou-antrenor"
_storage_key = None


def init_storage():
    global _storage_key
    if _storage_key:
        return _storage_key
    resp = requests.post(f"{STORAGE_URL}/init", json={"emergent_key": EMERGENT_KEY}, timeout=30)
    resp.raise_for_status()
    _storage_key = resp.json()["storage_key"]
    return _storage_key


def put_object(path: str, data: bytes, content_type: str) -> dict:
    key = init_storage()
    resp = requests.put(f"{STORAGE_URL}/objects/{path}",
                        headers={"X-Storage-Key": key, "Content-Type": content_type},
                        data=data, timeout=180)
    resp.raise_for_status()
    return resp.json()


def get_object(path: str):
    key = init_storage()
    resp = requests.get(f"{STORAGE_URL}/objects/{path}", headers={"X-Storage-Key": key}, timeout=120)
    resp.raise_for_status()
    return resp.content, resp.headers.get("Content-Type", "application/octet-stream")


# ---------------------------------------------------------------- Auth helpers
JWT_ALGORITHM = "HS256"


def get_jwt_secret() -> str:
    return os.environ["JWT_SECRET"]


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
    except Exception:
        return False


def create_access_token(user_id: str, email: str) -> str:
    payload = {"sub": user_id, "email": email,
               "exp": datetime.now(timezone.utc) + timedelta(days=7), "type": "access"}
    return jwt.encode(payload, get_jwt_secret(), algorithm=JWT_ALGORITHM)


security = HTTPBearer(auto_error=False)


async def get_current_user(creds: Optional[HTTPAuthorizationCredentials] = Depends(security)) -> dict:
    if not creds or not creds.credentials:
        raise HTTPException(status_code=401, detail="Neautentificat")
    token = creds.credentials
    try:
        payload = jwt.decode(token, get_jwt_secret(), algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Token invalid")
        user = await db.users.find_one({"id": payload["sub"]})
        if not user:
            raise HTTPException(status_code=401, detail="Utilizator inexistent")
        user.pop("password_hash", None)
        user.pop("_id", None)
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Sesiune expirată")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Token invalid")


# ---------------------------------------------------------------- Models
class RegisterInput(BaseModel):
    name: str
    email: EmailStr
    password: str = Field(min_length=6)


class LoginInput(BaseModel):
    email: EmailStr
    password: str


class ProjectCreate(BaseModel):
    title: str
    theme: Optional[str] = "General"
    notes: Optional[str] = ""


class PlanUpdate(BaseModel):
    hook: Optional[str] = None
    caption: Optional[str] = None
    cta: Optional[str] = None
    hashtags: Optional[List[str]] = None
    subtitles: Optional[str] = None
    music_theme: Optional[str] = None
    suggested_cuts: Optional[List[dict]] = None


class CheckoutRequest(BaseModel):
    lookup_key: str
    origin_url: str


# ---------------------------------------------------------------- App
app = FastAPI(title="Panou Antrenor API")
api = APIRouter(prefix="/api")

PLAN_META = {
    "coach_monthly": {"name": "Coach", "quota": 9, "coaches": 1},
    "coach_plus_monthly": {"name": "Coach +", "quota": 25, "coaches": 1},
    "gym_studio_monthly": {"name": "Gym / Studio", "quota": 25, "coaches": 5},
}


def public_user(u: dict) -> dict:
    return {"id": u["id"], "name": u.get("name"), "email": u.get("email"),
            "role": u.get("role", "coach"), "plan": u.get("plan"),
            "plan_name": u.get("plan_name"), "avatar": u.get("avatar"),
            "created_at": u.get("created_at")}


# ---------------------------------------------------------------- Auth routes
@api.post("/auth/register")
async def register(inp: RegisterInput):
    email = inp.email.lower()
    if await db.users.find_one({"email": email}):
        raise HTTPException(status_code=400, detail="Există deja un cont cu acest email")
    user = {
        "id": str(uuid.uuid4()), "name": inp.name, "email": email,
        "password_hash": hash_password(inp.password), "role": "coach",
        "plan": None, "plan_name": None, "avatar": None,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.users.insert_one(user)
    token = create_access_token(user["id"], email)
    return {"token": token, "user": public_user(user)}


@api.post("/auth/login")
async def login(inp: LoginInput):
    email = inp.email.lower()
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(inp.password, user.get("password_hash", "")):
        raise HTTPException(status_code=401, detail="Email sau parolă incorectă")
    token = create_access_token(user["id"], email)
    return {"token": token, "user": public_user(user)}


@api.get("/auth/me")
async def me(user: dict = Depends(get_current_user)):
    return {"user": public_user(user)}


# ---------------------------------------------------------------- Upload
@api.post("/upload")
async def upload_video(file: UploadFile = File(...), user: dict = Depends(get_current_user)):
    ext = file.filename.split(".")[-1].lower() if "." in file.filename else "mp4"
    path = f"{APP_NAME}/uploads/{user['id']}/{uuid.uuid4()}.{ext}"
    data = await file.read()
    if len(data) > 200 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="Fișierul depășește 200MB")
    try:
        result = put_object(path, data, file.content_type or "video/mp4")
    except Exception as e:
        logger.error(f"Upload failed: {e}")
        raise HTTPException(status_code=500, detail="Încărcarea a eșuat. Încearcă din nou.")
    return {"storage_path": result["path"], "size": result.get("size", len(data)),
            "filename": file.filename, "content_type": file.content_type}


@api.get("/files/{path:path}")
async def download_file(path: str, auth: str = Query(None),
                        authorization: Optional[str] = Header(None)):
    token = None
    if authorization and authorization.startswith("Bearer "):
        token = authorization[7:]
    elif auth:
        token = auth
    if not token:
        raise HTTPException(status_code=401, detail="Neautentificat")
    try:
        jwt.decode(token, get_jwt_secret(), algorithms=[JWT_ALGORITHM])
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Token invalid")
    try:
        data, ct = get_object(path)
    except Exception:
        raise HTTPException(status_code=404, detail="Fișier inexistent")
    return Response(content=data, media_type=ct)


# ---------------------------------------------------------------- Projects
@api.post("/projects")
async def create_project(
    title: str = Form(...), theme: str = Form("General"), notes: str = Form(""),
    storage_path: str = Form(...), filename: str = Form(""),
    user: dict = Depends(get_current_user),
):
    project = {
        "id": str(uuid.uuid4()), "user_id": user["id"], "title": title,
        "theme": theme, "notes": notes, "storage_path": storage_path,
        "filename": filename, "status": "uploaded", "plan": None,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.projects.insert_one(project)
    project.pop("_id", None)
    return project


@api.get("/projects")
async def list_projects(user: dict = Depends(get_current_user)):
    docs = await db.projects.find({"user_id": user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(500)
    return docs


@api.get("/projects/{project_id}")
async def get_project(project_id: str, user: dict = Depends(get_current_user)):
    doc = await db.projects.find_one({"id": project_id, "user_id": user["id"]}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Proiect inexistent")
    return doc


@api.delete("/projects/{project_id}")
async def delete_project(project_id: str, user: dict = Depends(get_current_user)):
    res = await db.projects.delete_one({"id": project_id, "user_id": user["id"]})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Proiect inexistent")
    return {"ok": True}


async def generate_ai_plan(title: str, theme: str, notes: str) -> dict:
    from emergentintegrations.llm.chat import LlmChat, UserMessage
    system = (
        "Ești un editor video expert specializat în conținut short-form (Reels 9:16) pentru "
        "antrenori și profesioniști din fitness. Generezi un plan de editare complet în limba română. "
        "Răspunzi DOAR cu JSON valid, fără text suplimentar, folosind exact această structură: "
        '{"hook": "string (primele 3 secunde, captivant)", '
        '"subtitles": "string (transcriere/subtitrări sugerate, 2-4 propoziții)", '
        '"caption": "string (descriere pentru postare)", '
        '"cta": "string (call to action)", '
        '"hashtags": ["#tag1", "#tag2", ...5-8 hashtag-uri], '
        '"music_theme": "string (gen muzical/mood recomandat)", '
        '"suggested_cuts": [{"time": "0:00-0:03", "note": "descriere tăietură"}, ...3-5 tăieturi]}'
    )
    prompt = f"Titlu video: {title}\nTemă: {theme}\nNote antrenor: {notes or 'niciuna'}\n\nGenerează planul de editare în JSON."
    chat = LlmChat(api_key=EMERGENT_KEY, session_id=f"plan-{uuid.uuid4()}", system_message=system).with_model("anthropic", "claude-sonnet-4-6")
    resp = await chat.send_message(UserMessage(text=prompt))
    text = resp if isinstance(resp, str) else str(resp)
    text = text.strip()
    if "```" in text:
        text = text.split("```")[1]
        if text.startswith("json"):
            text = text[4:]
    start, end = text.find("{"), text.rfind("}")
    if start != -1 and end != -1:
        text = text[start:end + 1]
    return json.loads(text)


@api.post("/projects/{project_id}/generate-plan")
async def generate_plan(project_id: str, user: dict = Depends(get_current_user)):
    doc = await db.projects.find_one({"id": project_id, "user_id": user["id"]})
    if not doc:
        raise HTTPException(status_code=404, detail="Proiect inexistent")
    await db.projects.update_one({"id": project_id}, {"$set": {"status": "processing"}})
    try:
        plan = await generate_ai_plan(doc["title"], doc.get("theme", ""), doc.get("notes", ""))
    except Exception as e:
        logger.error(f"AI plan failed: {e}")
        await db.projects.update_one({"id": project_id}, {"$set": {"status": "uploaded"}})
        raise HTTPException(status_code=502, detail="Generarea planului AI a eșuat. Încearcă din nou.")
    await db.projects.update_one(
        {"id": project_id},
        {"$set": {"plan": plan, "status": "review", "updated_at": datetime.now(timezone.utc).isoformat()}},
    )
    doc = await db.projects.find_one({"id": project_id}, {"_id": 0})
    return doc


@api.put("/projects/{project_id}/plan")
async def update_plan(project_id: str, upd: PlanUpdate, user: dict = Depends(get_current_user)):
    doc = await db.projects.find_one({"id": project_id, "user_id": user["id"]})
    if not doc:
        raise HTTPException(status_code=404, detail="Proiect inexistent")
    plan = doc.get("plan") or {}
    for k, v in upd.model_dump(exclude_none=True).items():
        plan[k] = v
    await db.projects.update_one({"id": project_id}, {"$set": {"plan": plan, "updated_at": datetime.now(timezone.utc).isoformat()}})
    return {"ok": True, "plan": plan}


@api.post("/projects/{project_id}/approve")
async def approve_project(project_id: str, user: dict = Depends(get_current_user)):
    doc = await db.projects.find_one({"id": project_id, "user_id": user["id"]})
    if not doc:
        raise HTTPException(status_code=404, detail="Proiect inexistent")
    await db.projects.update_one({"id": project_id}, {"$set": {"status": "approved", "updated_at": datetime.now(timezone.utc).isoformat()}})
    return {"ok": True}


# ---------------------------------------------------------------- Dashboard
@api.get("/dashboard/stats")
async def dashboard_stats(user: dict = Depends(get_current_user)):
    now = datetime.now(timezone.utc)
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0).isoformat()
    total = await db.projects.count_documents({"user_id": user["id"]})
    approved = await db.projects.count_documents({"user_id": user["id"], "status": "approved"})
    this_month = await db.projects.count_documents({"user_id": user["id"], "created_at": {"$gte": month_start}})
    in_review = await db.projects.count_documents({"user_id": user["id"], "status": "review"})
    plan_key = user.get("plan")
    quota = PLAN_META.get(plan_key, {}).get("quota", 3)
    return {"total_projects": total, "approved": approved, "this_month": this_month,
            "in_review": in_review, "quota": quota, "quota_used": this_month,
            "plan": plan_key, "plan_name": user.get("plan_name")}


# ---------------------------------------------------------------- Billing
@api.get("/plans")
async def list_plans():
    out = []
    for lk, meta in PLAN_META.items():
        prices = stripe.Price.list(lookup_keys=[lk], active=True, limit=1).data
        price = prices[0] if prices else None
        out.append({
            "lookup_key": lk, "name": meta["name"], "quota": meta["quota"],
            "coaches": meta["coaches"],
            "amount": (price.unit_amount / 100) if price else None,
            "currency": (price.currency.upper() if price else "RON"),
        })
    return out


@api.get("/subscription")
async def subscription(user: dict = Depends(get_current_user)):
    return {"plan": user.get("plan"), "plan_name": user.get("plan_name")}


@api.post("/payments/checkout")
async def checkout(req: CheckoutRequest, user: dict = Depends(get_current_user)):
    prices = stripe.Price.list(lookup_keys=[req.lookup_key], active=True, limit=1).data
    if not prices:
        raise HTTPException(status_code=500, detail=f"Plan indisponibil: {req.lookup_key}")
    price = prices[0]
    kwargs = dict(
        line_items=[{"price": price.id, "quantity": 1}],
        mode="subscription",
        success_url=f"{req.origin_url}/payment/success?session_id={{CHECKOUT_SESSION_ID}}",
        cancel_url=f"{req.origin_url}/billing",
        metadata={"user_id": user["id"], "lookup_key": req.lookup_key},
    )
    try:
        session = stripe.checkout.Session.create(**kwargs, managed_payments={"enabled": True})
    except stripe.error.InvalidRequestError as e:
        msg = (getattr(e, "user_message", "") or "").lower()
        if "managed payments" in msg or "ineligible" in msg:
            session = stripe.checkout.Session.create(**kwargs, automatic_tax={"enabled": True}, billing_address_collection="required")
        else:
            raise
    await db.payment_transactions.insert_one({
        "session_id": session.id, "user_id": user["id"], "lookup_key": req.lookup_key,
        "amount": (price.unit_amount or 0) / 100, "currency": price.currency,
        "status": "initiated", "payment_status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    return {"checkout_url": session.url, "session_id": session.id}


async def apply_paid_subscription(session_id: str, lookup_key: str, user_id: str, subscription_id):
    meta = PLAN_META.get(lookup_key, {})
    await db.users.update_one({"id": user_id}, {"$set": {
        "plan": lookup_key, "plan_name": meta.get("name"),
        "stripe_subscription_id": subscription_id,
    }})


@api.get("/payments/status/{session_id}")
async def payment_status(session_id: str):
    record = await db.payment_transactions.find_one({"session_id": session_id})
    if not record:
        raise HTTPException(status_code=404, detail="Tranzacție inexistentă")
    if record.get("payment_status") != "paid":
        try:
            s = stripe.checkout.Session.retrieve(session_id)
            if s.payment_status == "paid" or s.status == "complete":
                await db.payment_transactions.update_one(
                    {"session_id": session_id, "payment_status": {"$ne": "paid"}},
                    {"$set": {"status": "completed", "payment_status": "paid",
                              "stripe_subscription_id": s.subscription}})
                await apply_paid_subscription(session_id, record["lookup_key"], record["user_id"], s.subscription)
                record = await db.payment_transactions.find_one({"session_id": session_id})
        except stripe.error.StripeError:
            pass
    return {"session_id": record["session_id"], "status": record["status"], "payment_status": record["payment_status"]}


@api.post("/stripe/webhook")
async def stripe_webhook(request: Request):
    payload = await request.body()
    sig = request.headers.get("stripe-signature", "")
    try:
        event = stripe.Webhook.construct_event(payload, sig, STRIPE_WEBHOOK_SECRET)
    except Exception:
        raise HTTPException(status_code=400, detail="Semnătură invalidă")
    obj, t = event["data"]["object"], event["type"]
    if t == "checkout.session.completed":
        await db.payment_transactions.update_one(
            {"session_id": obj["id"], "payment_status": {"$ne": "paid"}},
            {"$set": {"status": "completed", "payment_status": obj.get("payment_status", "paid"),
                      "stripe_subscription_id": obj.get("subscription")}})
        rec = await db.payment_transactions.find_one({"session_id": obj["id"]})
        if rec:
            await apply_paid_subscription(obj["id"], rec["lookup_key"], rec["user_id"], obj.get("subscription"))
    return {"status": "ok"}


# ---------------------------------------------------------------- Startup
@api.get("/")
async def root():
    return {"message": "Panou Antrenor API", "status": "ok"}


app.include_router(api)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup():
    try:
        await db.users.create_index("email", unique=True)
        await db.users.create_index("id", unique=True)
        await db.projects.create_index("user_id")
    except Exception as e:
        logger.warning(f"Index setup: {e}")
    try:
        init_storage()
        logger.info("Storage initialized")
    except Exception as e:
        logger.error(f"Storage init failed: {e}")
    # seed admin/demo coach
    admin_email = os.environ.get("ADMIN_EMAIL", "antrenor@elvisprocut.ro").lower()
    admin_password = os.environ.get("ADMIN_PASSWORD", "Antrenor2025!")
    existing = await db.users.find_one({"email": admin_email})
    if not existing:
        await db.users.insert_one({
            "id": str(uuid.uuid4()), "name": "Elvis Antrenor", "email": admin_email,
            "password_hash": hash_password(admin_password), "role": "coach",
            "plan": "coach_plus_monthly", "plan_name": "Coach +", "avatar": None,
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
    elif not verify_password(admin_password, existing.get("password_hash", "")):
        await db.users.update_one({"email": admin_email}, {"$set": {"password_hash": hash_password(admin_password)}})


@app.on_event("shutdown")
async def shutdown():
    client.close()
