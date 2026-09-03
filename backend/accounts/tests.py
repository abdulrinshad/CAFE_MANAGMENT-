import os
from unittest.mock import patch, MagicMock
from django.test import TestCase
from django.core.mail import EmailMessage
import requests

from .email_backend import ResendEmailBackend

class ResendEmailBackendTestCase(TestCase):

    def test_missing_api_key_raises_error(self):
        with patch.dict(os.environ, {}, clear=True):
            if 'RESEND_API_KEY' in os.environ:
                del os.environ['RESEND_API_KEY']
            with self.assertRaises(ValueError):
                ResendEmailBackend(fail_silently=False)

    @patch('accounts.email_backend.requests.post')
    def test_authorization_header_and_payload(self, mock_post):
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.raise_for_status.return_value = None
        mock_post.return_value = mock_response

        with patch.dict(os.environ, {'RESEND_API_KEY': 're_test_key_123'}, clear=False):
            backend = ResendEmailBackend(fail_silently=False)
            email = EmailMessage(
                subject='Test Subject',
                body='Test Body',
                from_email='onboarding@resend.dev',
                to=['recipient@example.com']
            )
            count = backend.send_messages([email])
            self.assertEqual(count, 1)

            mock_post.assert_called_once()
            args, kwargs = mock_post.call_args
            self.assertEqual(args[0], 'https://api.resend.com/emails')
            self.assertEqual(kwargs['headers']['Authorization'], 'Bearer re_test_key_123')
            self.assertEqual(kwargs['json']['from'], 'onboarding@resend.dev')
            self.assertEqual(kwargs['json']['to'], ['recipient@example.com'])
            self.assertEqual(kwargs['json']['subject'], 'Test Subject')
            self.assertEqual(kwargs['json']['text'], 'Test Body')

    @patch('accounts.email_backend.requests.post')
    def test_resend_http_403_error_handling(self, mock_post):
        mock_response = MagicMock()
        mock_response.status_code = 403
        mock_response.text = '{"statusCode": 403, "name": "validation_error", "message": "Unverified sender"}'
        
        http_error = requests.exceptions.HTTPError('403 Client Error: Forbidden')
        http_error.response = mock_response
        mock_post.side_effect = http_error

        with patch.dict(os.environ, {'RESEND_API_KEY': 're_test_key_123'}, clear=False):
            backend = ResendEmailBackend(fail_silently=False)
            email = EmailMessage(
                subject='Test Subject',
                body='Test Body',
                from_email='admin@artisanbrew.com',
                to=['recipient@example.com']
            )
            with self.assertRaises(Exception) as ctx:
                backend.send_messages([email])
            self.assertIn("Resend API Error (HTTP 403)", str(ctx.exception))
