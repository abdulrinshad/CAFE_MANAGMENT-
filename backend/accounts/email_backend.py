import os
import requests
import logging
from django.core.mail.backends.base import BaseEmailBackend
from django.conf import settings

logger = logging.getLogger(__name__)

class BrevoEmailBackend(BaseEmailBackend):
    """
    A Django Email backend that uses the Brevo (Sendinblue) HTTPS API.
    Sends 300 free emails per day to ANY recipient address without requiring a custom domain.
    """
    def __init__(self, fail_silently=False, **kwargs):
        super().__init__(fail_silently=fail_silently, **kwargs)
        raw_key = os.getenv('BREVO_API_KEY')
        self.api_key = raw_key.strip().strip('\'"') if raw_key else None

    def send_messages(self, email_messages):
        if not email_messages:
            return 0

        sent_count = 0
        for message in email_messages:
            try:
                if self._send(message):
                    sent_count += 1
            except Exception as e:
                logger.error(f"Brevo send_messages error: {type(e).__name__}: {e}")
                if not self.fail_silently:
                    raise
        return sent_count

    def _send(self, email_message):
        if not self.api_key:
            if not self.fail_silently:
                raise ValueError("BREVO_API_KEY environment variable is not configured.")
            return False

        headers = {
            'api-key': self.api_key,
            'accept': 'application/json',
            'content-type': 'application/json'
        }

        from_addr = getattr(settings, 'DEFAULT_FROM_EMAIL', None) or os.getenv('EMAIL_HOST_USER') or email_message.from_email
        if not from_addr or 'localhost' in from_addr:
            from_addr = 'cafemanagment6@gmail.com'

        from_addr = from_addr.strip().strip('\'"')

        payload = {
            'sender': {'name': 'Cafe Manager', 'email': from_addr},
            'to': [{'email': recipient} for recipient in email_message.to],
            'subject': email_message.subject,
            'textContent': email_message.body
        }

        try:
            response = requests.post(
                'https://api.brevo.com/v3/smtp/email',
                json=payload,
                headers=headers,
                timeout=10
            )
            response.raise_for_status()
            return True
        except requests.exceptions.RequestException as e:
            res_status = getattr(e.response, 'status_code', 'Unknown')
            res_text = getattr(e.response, 'text', str(e))
            logger.error(f"Brevo HTTP Status: {res_status} | Error Response: {res_text}")
            if not self.fail_silently:
                raise Exception(f"Brevo API Error (HTTP {res_status}): {res_text}")
            return False


class ResendEmailBackend(BaseEmailBackend):
    """
    A Django Email backend that uses the Resend HTTPS API.
    """
    def __init__(self, fail_silently=False, **kwargs):
        super().__init__(fail_silently=fail_silently, **kwargs)
        raw_key = os.getenv('RESEND_API_KEY')
        self.api_key = raw_key.strip().strip('\'"') if raw_key else None
        if not self.api_key and not self.fail_silently:
            raise ValueError("RESEND_API_KEY environment variable is not set.")

    def send_messages(self, email_messages):
        if not email_messages:
            return 0

        sent_count = 0
        for message in email_messages:
            try:
                if self._send(message):
                    sent_count += 1
            except Exception as e:
                logger.error(f"Resend send_messages error: {type(e).__name__}: {e}")
                if not self.fail_silently:
                    raise
        return sent_count

    def _send(self, email_message):
        if not self.api_key:
            if not self.fail_silently:
                raise ValueError("RESEND_API_KEY environment variable is not configured.")
            return False

        headers = {
            'Authorization': f'Bearer {self.api_key}',
            'Content-Type': 'application/json'
        }

        from_addr = email_message.from_email or getattr(settings, 'DEFAULT_FROM_EMAIL', None)
        if not from_addr or 'localhost' in from_addr or 'gmail.com' in from_addr:
            from_addr = 'onboarding@resend.dev'

        payload = {
            'from': from_addr,
            'to': email_message.to,
            'subject': email_message.subject,
        }
        
        # Check if the message has HTML alternatives
        html_body = None
        if hasattr(email_message, 'alternatives'):
            for alt in email_message.alternatives:
                if alt[1] == 'text/html':
                    html_body = alt[0]
                    break

        if html_body:
            payload['html'] = html_body
            if email_message.body:
                payload['text'] = email_message.body
        elif email_message.content_subtype == 'html':
            payload['html'] = email_message.body
        else:
            payload['text'] = email_message.body

        if email_message.cc:
            payload['cc'] = email_message.cc
        if email_message.bcc:
            payload['bcc'] = email_message.bcc
        if email_message.reply_to:
            payload['reply_to'] = email_message.reply_to

        try:
            response = requests.post(
                'https://api.resend.com/emails',
                json=payload,
                headers=headers,
                timeout=10
            )
            response.raise_for_status()
            return True
        except requests.exceptions.RequestException as e:
            res_status = getattr(e.response, 'status_code', 'Unknown')
            res_text = getattr(e.response, 'text', str(e))
            logger.error(f"Resend HTTP Status: {res_status} | Resend Error Response: {res_text}")
            if not self.fail_silently:
                raise Exception(f"Resend API Error (HTTP {res_status}): {res_text}")
            return False
