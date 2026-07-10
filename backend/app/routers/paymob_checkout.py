import logging

from fastapi import APIRouter, Depends, HTTPException, Request, status

from app.dependencies.auth import get_current_user
from app.models import User
from app.schemas.paymob_checkout_schema import (
    PaymobCheckoutRequest,
    PaymobCheckoutResponse,
    PaymobWebhookPayload,
)
from app.services.paymob_iframe_service import (
    create_iframe_checkout,
    mark_legacy_checkout_paid_placeholder,
    PaymobNetworkError,
    PaymobProviderError,
    verify_paymob_hmac,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/payments", tags=["paymob iframe checkout"])


@router.post("/checkout", response_model=PaymobCheckoutResponse)
async def create_paymob_checkout(
    payload: PaymobCheckoutRequest,
    current_user: User = Depends(get_current_user),
) -> PaymobCheckoutResponse:
    if current_user.status == "suspended":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Suspended users cannot create payments.")

    try:
        checkout = await create_iframe_checkout(payload)
    except PaymobProviderError as exc:
        logger.exception("Paymob checkout provider error: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Paymob rejected the checkout request. Check Paymob credentials and integration settings.",
        ) from exc
    except PaymobNetworkError as exc:
        logger.exception("Paymob checkout network error: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Could not reach Paymob. Please try again.",
        ) from exc
    except RuntimeError as exc:
        logger.warning("Paymob checkout configuration error: %s", exc)
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc

    return PaymobCheckoutResponse(**checkout)


@router.post("/webhook")
async def paymob_iframe_webhook(request: Request) -> dict[str, str]:
    received_hmac = request.query_params.get("hmac", "")
    body = await request.json()
    payload = PaymobWebhookPayload.model_validate(body)
    obj = payload.obj or body.get("obj") or body

    if not isinstance(obj, dict):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid Paymob webhook payload.")

    if not verify_paymob_hmac(obj, received_hmac):
        logger.warning("Rejected Paymob iframe webhook because HMAC validation failed")
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Invalid HMAC signature.")

    if obj.get("success") is True:
        mark_legacy_checkout_paid_placeholder(obj)
        return {"status": "success"}

    logger.info("Paymob iframe webhook received unsuccessful transaction_id=%s", obj.get("id"))
    return {"status": "failed"}
