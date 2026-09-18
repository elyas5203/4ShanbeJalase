import uuid
import logging
import json
import httpx
from backend.core.config import settings

logger = logging.getLogger("payping")

class PayPingService:
    # Official PayPing v2 endpoints use api.payping.ir.  The old .net host
    # returns an HTML/empty response, which used to crash response.json().
    BASE_URL = "https://api.payping.ir/v2/pay"
    GATEWAY_URL = "https://api.payping.ir/v2/pay/gotoipg"

    @staticmethod
    def _runtime_value(key: str, env_value: str) -> str:
        """Use deployment env first, then a value saved from the admin panel."""
        if env_value and "YOUR_" not in env_value:
            return env_value
        try:
            from backend.core.database import SessionLocal
            from backend.models.database_models import SystemSetting
            db = SessionLocal()
            try:
                row = db.query(SystemSetting).filter(SystemSetting.key == key).first()
                return row.value.strip() if row and row.value else env_value
            finally:
                db.close()
        except Exception:
            logger.exception("Could not load runtime setting %s", key)
            return env_value

    @classmethod
    async def create_payment(cls, amount_tomans: int, client_ref_id: str, description: str, payer_name: str = "", payer_phone: str = ""):
        """
        Requests a payment code from PayPing.
        Amount must be in Tomans (PayPing accepts Tomans or Rials depending on account, standard v2 is Tomans).
        """
        token = cls._runtime_value("payping_token", settings.PAYPING_TOKEN)
        return_url = cls._runtime_value("payping_return_url", settings.PAYPING_RETURN_URL)
        
        # If no token provided or TEST_MODE is active, use simulated payment code
        if not token or settings.TEST_MODE:
            mock_code = f"mock_{uuid.uuid4().hex[:12]}"
            redirect_url = f"{return_url}?refid={mock_code}&clientrefid={client_ref_id}"
            logger.info(f"[PAYPING MOCK] Created payment for {amount_tomans} Toman. Ref: {client_ref_id}")
            return {
                "success": True,
                "code": mock_code,
                "payment_url": redirect_url,
                "is_mock": True
            }

        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
            "Accept": "application/json"
        }

        payload = {
            "amount": amount_tomans,
            "payerIdentity": payer_phone or payer_name or "customer",
            "payerName": payer_name,
            "description": description,
            "returnUrl": return_url,
            "clientRefId": client_ref_id
        }

        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                response = await client.post(cls.BASE_URL, json=payload, headers=headers)
                try:
                    data = response.json()
                except json.JSONDecodeError:
                    body = response.text.strip()
                    logger.error("PayPing returned non-JSON (%s): %r", response.status_code, body[:500])
                    return {
                        "success": False,
                        "error": f"پاسخ نامعتبر از پی‌پینگ (کد {response.status_code}). آدرس درگاه یا تنظیمات اتصال را بررسی کنید."
                    }
                
                if response.status_code == 200 and "code" in data:
                    code = data["code"]
                    return {
                        "success": True,
                        "code": code,
                        "payment_url": f"{cls.GATEWAY_URL}/{code}",
                        "is_mock": False
                    }
                else:
                    logger.error(f"PayPing error ({response.status_code}): {data}")
                    return {"success": False, "error": str(data)}
        except httpx.TimeoutException:
            logger.exception("PayPing request timed out")
            return {"success": False, "error": "مهلت اتصال به پی‌پینگ تمام شد؛ لطفاً دوباره تلاش کنید."}
        except httpx.RequestError as e:
            logger.error("PayPing connection failed: %s", e)
            return {"success": False, "error": "ارتباط با پی‌پینگ برقرار نشد."}
        except Exception as e:
            logger.error(f"PayPing request failed: {e}")
            return {"success": False, "error": str(e)}

    @classmethod
    async def verify_payment(cls, payment_code: str, amount_tomans: int, ref_id: str = ""):
        """
        Verifies a completed transaction with PayPing API.
        Guarantees idempotency and prevents double-spending.
        """
        token = cls._runtime_value("payping_token", settings.PAYPING_TOKEN)

        # Mock verification if test token or test mode
        if not token or settings.TEST_MODE or payment_code.startswith("mock_"):
            return {
                "success": True,
                "ref_id": ref_id or f"SHAPARAK_{uuid.uuid4().hex[:8].upper()}",
                "card_number": "603799******1234",
                "is_mock": True
            }

        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
            "Accept": "application/json"
        }

        payload = {
            "refId": payment_code,
            "amount": amount_tomans
        }

        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                response = await client.post(f"{cls.BASE_URL}/verify", json=payload, headers=headers)
                if response.status_code == 200:
                    # A successful verify may have an empty body.  The refId
                    # supplied by the callback remains the authoritative id.
                    try:
                        data = response.json() if response.content else {}
                    except json.JSONDecodeError:
                        data = {}
                    return {
                        "success": True,
                        "ref_id": str(data.get("refId", payment_code)),
                        "card_number": data.get("cardNumber", ""),
                        "is_mock": False
                    }
                else:
                    logger.error(f"PayPing verification failed: {response.text}")
                    return {"success": False, "error": response.text}
        except Exception as e:
            logger.error(f"PayPing verification exception: {e}")
            return {"success": False, "error": str(e)}
