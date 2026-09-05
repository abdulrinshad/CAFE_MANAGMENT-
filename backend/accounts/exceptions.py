from rest_framework.views import exception_handler
from rest_framework.response import Response
from rest_framework import status
import logging

logger = logging.getLogger(__name__)

def custom_exception_handler(exc, context):
    response = exception_handler(exc, context)

    if response is None:
        logger.exception(f"Unhandled Exception: {type(exc).__name__}: {exc}")
        return Response(
            {"detail": f"Server Error: {str(exc)}"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

    return response
