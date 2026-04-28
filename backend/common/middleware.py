"""
Loyallia — Common Middleware
B-011: Request ID middleware for distributed tracing.
"""

import uuid


class RequestIDMiddleware:
    """Attach a unique X-Request-ID to every request and response.

    If the incoming request already carries an X-Request-ID header
    (e.g. from an upstream load balancer or API gateway), it is reused.
    Otherwise a new UUID4 is generated.

    The ID is stored on ``request.request_id`` and echoed back in the
    response header so clients can correlate logs.
    """

    HEADER = "X-Request-ID"

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        request_id = request.META.get(
            f"HTTP_{self.HEADER.upper().replace('-', '_')}", ""
        )
        if not request_id:
            request_id = uuid.uuid4().hex

        request.request_id = request_id

        response = self.get_response(request)
        response[self.HEADER] = request_id
        return response
