from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routers import (
    admin,
    applications,
    auth,
    group_requests,
    instant_requests,
    messages,
    notifications,
    paymob_checkout,
    payments,
    reports,
    requests,
    reviews,
    sessions,
    users,
    wallet,
)
from app.services.paymob_iframe_service import validate_paymob_iframe_runtime

app = FastAPI(title="EduMatch API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(users.router)
app.include_router(requests.router)
app.include_router(group_requests.router)
app.include_router(instant_requests.router)
app.include_router(applications.router)
app.include_router(sessions.router)
app.include_router(sessions.test_router)
app.include_router(messages.router)
app.include_router(paymob_checkout.router)
app.include_router(payments.router)
app.include_router(wallet.router)
app.include_router(reviews.router)
app.include_router(notifications.router)
app.include_router(reports.router)
app.include_router(admin.router)


@app.on_event("startup")
def validate_optional_integrations() -> None:
    validate_paymob_iframe_runtime()


@app.get("/")
def root() -> dict[str, str]:
    return {"message": "EduMatch API is running"}


@app.get("/health")
def health_check() -> dict[str, str]:
    return {"status": "ok", "app": "EduMatch API"}
