"""
Loyallia — SSRF Protection (LYL-H-SEC-009)
Validates URLs before fetching external resources to prevent Server-Side Request Forgery.
Blocks requests to private, loopback, link-local, and reserved IP ranges.
"""

import ipaddress
import logging
import socket
from urllib.parse import urlparse

logger = logging.getLogger(__name__)

# Networks that MUST NOT be reachable from the server (SSRF targets)
BLOCKED_NETWORKS = [
    # IPv4 private/reserved ranges
    ipaddress.ip_network("10.0.0.0/8"),          # RFC 1918 — Private
    ipaddress.ip_network("172.16.0.0/12"),        # RFC 1918 — Private
    ipaddress.ip_network("192.168.0.0/16"),       # RFC 1918 — Private
    ipaddress.ip_network("169.254.0.0/16"),       # RFC 3927 — Link-local
    ipaddress.ip_network("127.0.0.0/8"),          # RFC 1122 — Loopback
    ipaddress.ip_network("0.0.0.0/8"),            # RFC 1122 — "This" network
    ipaddress.ip_network("100.64.0.0/10"),        # RFC 6598 — Carrier-grade NAT
    ipaddress.ip_network("192.0.0.0/24"),         # RFC 6890 — IETF Protocol
    ipaddress.ip_network("192.0.2.0/24"),         # RFC 5737 — TEST-NET-1
    ipaddress.ip_network("198.51.100.0/24"),      # RFC 5737 — TEST-NET-2
    ipaddress.ip_network("203.0.113.0/24"),       # RFC 5737 — TEST-NET-3
    ipaddress.ip_network("224.0.0.0/4"),          # RFC 5735 — Multicast
    # IPv6 private/reserved ranges
    ipaddress.ip_network("::1/128"),              # Loopback
    ipaddress.ip_network("fc00::/7"),             # RFC 4193 — Unique local
    ipaddress.ip_network("fe80::/10"),            # RFC 4291 — Link-local
]


class SSRFError(ValueError):
    """Raised when a URL fails SSRF validation."""

    pass


def validate_external_url(url: str, allow_http: bool = True) -> str:
    """
    Validate a URL is safe to fetch (not SSRF).

    Checks:
    1. Scheme must be HTTPS (or HTTP if explicitly allowed)
    2. Hostname must resolve to a public IP
    3. Resolved IP must not be in any blocked/private range

    Args:
        url: The URL to validate
        allow_http: Whether to allow HTTP scheme (default True for dev compat)

    Returns:
        The validated URL (unchanged)

    Raises:
        SSRFError: If the URL fails any validation check
    """
    parsed = urlparse(url)
    scheme = parsed.scheme.lower()

    # 1. Scheme validation
    allowed_schemes = ("https",) if not allow_http else ("https", "http")
    if scheme not in allowed_schemes:
        raise SSRFError(f"URL must use {'HTTPS' if not allow_http else 'HTTPS or HTTP'}. Got: {scheme}")

    # 2. Hostname required
    if not parsed.hostname:
        raise SSRFError("URL has no hostname")

    # 3. Resolve hostname to IP and check against blocked ranges
    try:
        addr_info = socket.getaddrinfo(
            parsed.hostname, None, socket.AF_UNSPEC, socket.SOCK_STREAM
        )
    except socket.gaierror:
        raise SSRFError(f"Cannot resolve hostname: {parsed.hostname}")

    for family, _, _, _, sockaddr in addr_info:
        ip = ipaddress.ip_address(sockaddr[0])
        for network in BLOCKED_NETWORKS:
            if ip in network:
                logger.warning(
                    "SSRF blocked: URL %s resolves to %s (in %s)",
                    url, ip, network,
                )
                raise SSRFError(f"URL resolves to blocked IP: {ip}")

    return url
