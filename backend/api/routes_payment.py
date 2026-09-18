import logging
from fastapi import APIRouter, Depends, Request
from fastapi.responses import HTMLResponse
from sqlalchemy.orm import Session
from backend.core.database import get_db
from backend.services.subscription_service import SubscriptionService

logger = logging.getLogger("payment_routes")
router = APIRouter(prefix="/api/payment", tags=["Payment"])

@router.get("/callback")
@router.post("/callback")
async def payping_callback(request: Request, db: Session = Depends(get_db)):
    """
    Callback endpoint called by PayPing gateway after payment attempt.
    """
    params = dict(request.query_params)
    
    # In POST callbacks, read body as well
    if request.method == "POST":
        try:
            body = await request.json()
            params.update(body)
        except:
            form = await request.form()
            params.update(dict(form))

    # PayPing returns refid/clientrefid (casing varies between integrations).
    normalized = {str(k).lower(): v for k, v in params.items()}
    ref_id = normalized.get("refid") or normalized.get("ref_id")
    client_ref_id = normalized.get("clientrefid") or normalized.get("client_ref_id")
    
    if not ref_id or not client_ref_id:
        return HTMLResponse(
            content="<h2 style='text-align:center;color:red;font-family:sans-serif;margin-top:50px;'>پارامترهای بازگشت از درگاه پرداخت ناقص است.</h2>",
            status_code=400
        )

    success, msg = await SubscriptionService.process_successful_payment(
        db=db,
        client_ref_id=client_ref_id,
        payment_code=ref_id
    )

    if success:
        html = f"""
        <!DOCTYPE html>
        <html lang="fa" dir="rtl">
        <head>
            <meta charset="UTF-8">
            <title>پرداخت موفق</title>
            <style>
                body {{ font-family: Tahoma, sans-serif; background: #0f172a; color: #f8fafc; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; }}
                .card {{ background: #1e293b; padding: 35px 30px; border-radius: 16px; border: 1px solid #334155; text-align: center; max-width: 420px; box-shadow: 0 10px 25px rgba(0,0,0,0.3); }}
                .icon {{ font-size: 55px; margin-bottom: 10px; color: #10b981; }}
                h2 {{ margin: 0 0 12px; color: #10b981; font-size: 22px; }}
                p {{ color: #94a3b8; font-size: 14px; line-height: 1.6; margin-bottom: 20px; }}
                .code {{ background: #0f172a; padding: 8px 12px; border-radius: 8px; font-family: monospace; color: #38bdf8; font-size: 15px; border: 1px solid #334155; }}
            </style>
        </head>
        <body>
            <div class="card">
                <div class="icon">✓</div>
                <h2>پرداخت شما با موفقیت انجام شد!</h2>
                <p>سفارش شما در سیستم ثبت شد و به زودی پس از فعال‌سازی دسترسی توسط ادمین، از طریق ربات اطلاع‌رسانی خواهد شد.</p>
                <div class="code">کد پیگیری سفارش: {client_ref_id}</div>
                <p style="margin-top:20px; font-size:12px; color:#64748b;">اکنون می‌توانید این برگه را ببندید و به ربات برگردید.</p>
            </div>
        </body>
        </html>
        """
        return HTMLResponse(content=html)
    else:
        html = f"""
        <!DOCTYPE html>
        <html lang="fa" dir="rtl">
        <head>
            <meta charset="UTF-8">
            <title>خطا در پرداخت</title>
            <style>
                body {{ font-family: Tahoma, sans-serif; background: #0f172a; color: #f8fafc; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; }}
                .card {{ background: #1e293b; padding: 35px 30px; border-radius: 16px; border: 1px solid #ef4444; text-align: center; max-width: 420px; }}
                .icon {{ font-size: 55px; margin-bottom: 10px; color: #ef4444; }}
                h2 {{ margin: 0 0 12px; color: #ef4444; font-size: 22px; }}
                p {{ color: #94a3b8; font-size: 14px; line-height: 1.6; }}
            </style>
        </head>
        <body>
            <div class="card">
                <div class="icon">✕</div>
                <h2>تراکنش ناموفق بود یا تایید نشد!</h2>
                <p>{msg}</p>
            </div>
        </body>
        </html>
        """
        return HTMLResponse(content=html, status_code=400)
