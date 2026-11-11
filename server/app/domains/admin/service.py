from app.core.config import settings
from fastapi import HTTPException
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
def _require_action_password(password: str) -> None:
    """Raise 403 when the supplied password does not match the env secret."""
    if password != settings.ADMIN_ACTION_PASSWORD:
        raise HTTPException(status_code=403, detail="Invalid action password")


def _send_project_email(owner_email: str, owner_name: str, project_name: str, reason: str) -> None:
    """
    ส่ง email แจ้งเจ้าของโปรเจคผ่าน Gmail SMTP (smtplib built-in)
    ฟรีไม่จำกัด — ใช้ Gmail App Password
    ถ้ายังไม่ได้ตั้งค่า GMAIL_USER จะ skip โดยไม่ error
    """
    if not settings.GMAIL_USER or not settings.GMAIL_APP_PASSWORD:
        print("[Email] GMAIL_USER / GMAIL_APP_PASSWORD ยังไม่ได้ตั้งค่า — ข้าม")
        return

    html_body = f"""
    <div style="font-family: 'Inter', sans-serif; max-width: 600px; margin: 0 auto;
                background: #131313; color: #e2e2e2; padding: 40px; border-radius: 16px;
                border: 1px solid rgba(255,255,255,0.1);">
      <div style="margin-bottom: 32px;">
        <h1 style="font-size: 24px; font-weight: 700; color: #ffb1c5; margin: 0 0 8px 0;">
          Latent Precision
        </h1>
        <p style="margin: 0; color: #9a9a9a; font-size: 13px;">System Notification</p>
      </div>
      <h2 style="font-size: 18px; color: #ffffff; margin: 0 0 16px 0;">
        โปรเจคของคุณถูกลบออกจากระบบ
      </h2>
      <p style="color: #c2c2c2; line-height: 1.6; margin: 0 0 24px 0;">
        สวัสดี <strong style="color: #fff;">{owner_name}</strong>,<br/><br/>
        ทีมผู้ดูแลระบบได้ลบโปรเจค
        <strong style="color: #ffb1c5;">"{project_name}"</strong>
        ออกจากแพลตฟอร์ม Latent Precision แล้ว
      </p>
      <div style="background: rgba(255,255,255,0.05); border-left: 3px solid #ff0080;
                  border-radius: 8px; padding: 16px 20px; margin-bottom: 24px;">
        <p style="margin: 0; font-size: 13px; color: #9a9a9a; text-transform: uppercase;
                  letter-spacing: 0.08em; margin-bottom: 8px;">เหตุผล</p>
        <p style="margin: 0; color: #e2e2e2; line-height: 1.6;">{reason}</p>
      </div>
      <p style="color: #6a6a6a; font-size: 12px; margin: 0; line-height: 1.6;">
        หากคิดว่าเป็นข้อผิดพลาด กรุณาติดต่อทีมสนับสนุน<br/>
        © 2026 Latent Precision. สงวนลิขสิทธิ์
      </p>
    </div>
    """

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = f'[Latent Precision] โปรเจค "{project_name}" ถูกลบออกจากระบบ'
        msg["From"]    = settings.GMAIL_USER
        msg["To"]      = owner_email
        msg.attach(MIMEText(html_body, "html", "utf-8"))

        # ใช้ port 587 (TLS) ซึ่งเป็นมาตรฐานที่แนะนำมากกว่า
        with smtplib.SMTP("smtp.gmail.com", 587) as server:
            server.starttls()  # Upgrade connection to TLS
            server.login(settings.GMAIL_USER, settings.GMAIL_APP_PASSWORD)
            server.sendmail(settings.GMAIL_USER, owner_email, msg.as_string())

        print(f"[Email] ส่งสำเร็จไปยัง {owner_email}")
    except smtplib.SMTPAuthenticationError:
        print(f"[Email] ERROR: Username หรือ App Password ไม่ถูกต้อง (535 5.7.8)")
        print(f"       กรุณาตรวจสอบ GMAIL_USER และ GMAIL_APP_PASSWORD ในไฟล์ .env")
    except Exception as exc:
        print(f"[Email] ส่งไม่สำเร็จ: {exc}")
