import os
import requests
from django.core.mail.backends.base import BaseEmailBackend
from django.conf import settings

class ResendEmailBackend(BaseEmailBackend):
    """
    A Django Email backend that uses the Resend HTTPS API.
    """
    def __init__(self, fail_silently=False, **kwargs):
        super().__init__(fail_silently=fail_silently, **kwargs)
        self.api_key = os.getenv('RESEND_API_KEY')
        if not self.api_key and not self.fail_silently:
            raise ValueError("RESEND_API_KEY environment variable is not set.")

    def send_messages(self, email_messages):
        if not email_messages:
            return 0

        sent_count = 0
        for message in email_messages:
            try:
                self._send(message)
                sent_count += 1
            except Exception:
                if not self.fail_silently:
                    raise
        return sent_count

    def _send(self, email_message):
        if not self.api_key:
            return False

        headers = {
            'Authorization': f'Bearer {self.api_key}',
            'Content-Type': 'application/json'
        }

        # Django EmailMessage allows multiple recipients in 'to', 'cc', 'bcc'
        payload = {
            'from': email_message.from_email or getattr(settings, 'DEFAULT_FROM_EMAIL', 'admin@example.com'),
            'to': email_message.to,
            'subject': email_message.subject,
        }
        
        # If the email is HTML, pass it in the html key. Else text.
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

        response = requests.post(
            'https://api.resend.com/emails',
            json=payload,
            headers=headers,
            timeout=10
        )
        
        response.raise_for_status()
        return True
