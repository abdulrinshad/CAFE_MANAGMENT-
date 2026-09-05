import os
import requests
import logging
from django.core.mail.backends.base import BaseEmailBackend
from django.conf import settings

logger = logging.getLogger(__name__)

class BrevoEmailBackend(BaseEmailBackend):
    """
    Primary Django Email backend that uses the Brevo (Sendinblue) HTTPS API.
    Sends 300 free emails per day over Port 443 HTTPS without SMTP blocking.
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
                logger.error(f"Brevo send_messages exception: {type(e).__name__}: {e}")
                if not self.fail_silently:
                    raise
        return sent_count

    def _send(self, email_message):
        if not self.api_key:
            err_msg = "BREVO_API_KEY environment variable is not configured on server."
            logger.error(err_msg)
            if not self.fail_silently:
                raise ValueError(err_msg)
            return False

        headers = {
            'api-key': self.api_key,
            'accept': 'application/json',
            'content-type': 'application/json'
        }

        # Resolve sender address
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

        # Check for HTML content alternative
        if hasattr(email_message, 'alternatives'):
            for alt in email_message.alternatives:
                if alt[1] == 'text/html':
                    payload['htmlContent'] = alt[0]
                    break
        elif getattr(email_message, 'content_subtype', '') == 'html':
            payload['htmlContent'] = email_message.body

        try:
            response = requests.post(
                'https://api.brevo.com/v3/smtp/email',
                json=payload,
                headers=headers,
                timeout=10
            )
            if response.status_code in (200, 201, 202):
                logger.info(f"Brevo email sent successfully to {email_message.to}")
                return True

            res_text = response.text
            logger.error(f"Brevo API Error (HTTP {response.status_code}): {res_text}")
            if not self.fail_silently:
                raise Exception(f"Brevo API Error (HTTP {response.status_code}): {res_text}")
            return False

        except requests.exceptions.RequestException as e:
            res_status = getattr(e.response, 'status_code', 'Unknown')
            res_text = getattr(e.response, 'text', str(e))
            logger.error(f"Brevo Request Error (HTTP {res_status}): {res_text}")
            if not self.fail_silently:
                raise Exception(f"Brevo API Connection Error: {res_text}")
            return False
