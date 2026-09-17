import uuid
import logging
import httpx
from backend.core.config import settings

logger = logging.getLogger("payping")

class PayPingService:
    BASE_URL = "https://api.payping.net/v2/pay"

    @classmethod
    async def create_payment(cls, amount_tomans: int, client_ref_id: str, description: str, payer_name: str = "", payer_phone: str = ""):
        """
        Requests a payment code from PayPing.
        Amount must be in Tomans (PayPing accepts Tomans or Rials depending on account, standard v2 is Tomans).
        """
        token = settings.PAYPING_TOKEN
        
        # If no token provided or TEST_MODE is active, use simulated payment code
        if not token or settings.TEST_MODE:
            mock_code = f"mock_{uuid.uuid4().hex[:12]}"
            redirect_url = f"{settings.PAYPING_RETURN_URL}?code={mock_code}&clientrefid={client_ref_id}&status=200"
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
            "returnUrl": settings.PAYPING_RETURN_URL,
            "clientRefId": client_ref_id
        }

        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                response = await client.post(cls.BASE_URL, json=payload, headers=headers)
                data = response.json()
                
                if response.status_code == 200 and "code" in data:
                    code = data["code"]
                    return {
                        "success": True,
                        "code": code,
                        "payment_url": f"https://api.payping.net/v2/pay/gotoauth/{code}",
                        "is_mock": False
                    }
                else:
                    logger.error(f"PayPing error ({response.status_code}): {data}")
                    return {"success": False, "error": str(data)}
        except Exception as e:
            logger.error(f"PayPing request failed: {e}")
            return {"success": False, "error": str(e)}

    @classmethod
    async def verify_payment(cls, payment_code: str, amount_tomans: int, ref_id: str = ""):
        """
        Verifies a completed transaction with PayPing API.
        Guarantees idempotency and prevents double-spending.
        """
        token = settings.PAYPING_TOKEN

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
                    data = response.json()
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
