import logging

logger = logging.getLogger(__name__)

class RequestLoggingMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        # We must read body before get_response if we want to log it for 400s
        # because sometimes get_response consumes it and it's not available
        req_body = ""
        try:
            req_body = request.body.decode('utf-8')
        except Exception:
            req_body = "<could not decode body>"

        response = self.get_response(request)
        
        if response.status_code == 400:
            import json
            safe_body = req_body
            try:
                body_json = json.loads(req_body)
                if 'password' in body_json:
                    body_json['password'] = '***REDACTED***'
                if 'pin' in body_json:
                    body_json['pin'] = '***REDACTED***'
                safe_body = json.dumps(body_json)
            except Exception:
                pass

            logger.error(f"400 Bad Request encountered!")
            logger.error(f"Path: {request.path}")
            logger.error(f"Method: {request.method}")
            logger.error(f"Headers: {dict(request.headers)}")
            logger.error(f"Request Body: {safe_body}")
                
            try:
                if hasattr(response, 'rendered_content'):
                    logger.error(f"Response Content: {response.rendered_content.decode('utf-8', errors='replace')}")
                else:
                    logger.error(f"Response Content: {response.content.decode('utf-8', errors='replace')}")
            except Exception as e:
                logger.error(f"Could not read response content: {e}")
                
        return response
