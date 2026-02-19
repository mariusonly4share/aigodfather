"""
AIGodfather SDK for Python
Official SDK for AI Agent Monitoring & EU AI Act Compliance

https://aigodfather.ai/docs
"""

from __future__ import annotations

import logging
from typing import Any, Dict, List, Optional

import requests

__version__ = "1.0.0"
__all__ = ["AIGodfather"]

logger = logging.getLogger("aigodfather")


class AIGodfather:
    """AIGodfather Python SDK client.

    Args:
        api_key: Your API key (starts with agf_live_ or agf_test_).
        base_url: Base URL override (default: https://api.aigodfather.ai).
        debug: Enable debug logging (default: False).
        timeout: Request timeout in seconds (default: 10).
        default_tags: Tags applied to every event.
        default_metadata: Metadata merged into every event.
    """

    def __init__(
        self,
        api_key: str,
        base_url: str = "https://api.aigodfather.ai",
        debug: bool = False,
        timeout: int = 10,
        default_tags: Optional[List[str]] = None,
        default_metadata: Optional[Dict[str, Any]] = None,
    ) -> None:
        if not api_key:
            raise ValueError("[AIGodfather] api_key is required")

        self.api_key = api_key
        self.base_url = base_url.rstrip("/")
        self.debug = debug
        self.timeout = timeout
        self.default_tags: List[str] = default_tags or []
        self.default_metadata: Dict[str, Any] = default_metadata or {}

        if self.debug:
            logging.basicConfig(level=logging.DEBUG)
            logger.setLevel(logging.DEBUG)

    # ── Public Methods ────────────────────────────────

    def ping(self) -> Dict[str, Any]:
        """Test connectivity and retrieve agent info + usage limits."""
        return self._request("GET", "/v1/ping")

    def track(
        self,
        event_type: str,
        severity: str = "low",
        message: str = "",
        metadata: Optional[Dict[str, Any]] = None,
        user_id: Optional[str] = None,
        tags: Optional[List[str]] = None,
    ) -> Dict[str, Any]:
        """Track a custom event.

        Args:
            event_type: Type/name of the event.
            severity: One of 'low', 'medium', 'high', 'critical'.
            message: Human-readable message.
            metadata: Arbitrary metadata dict.
            user_id: Associated user ID.
            tags: Tags for filtering.
        """
        merged_metadata = {**self.default_metadata, **(metadata or {})}
        merged_tags = [*self.default_tags, *(tags or [])]

        body = {
            "eventType": event_type,
            "severity": severity,
            "message": message,
            "metadata": merged_metadata,
            "userId": user_id,
            "tags": merged_tags,
        }
        return self._request("POST", "/v1/events", body)

    def info(self, message: str, metadata: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Track an info-level event."""
        return self.track("info", severity="low", message=message, metadata=metadata)

    def warning(self, message: str, metadata: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Track a warning-level event."""
        return self.track("warning", severity="medium", message=message, metadata=metadata)

    def error(self, message: str, metadata: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Track an error-level event."""
        return self.track("error", severity="high", message=message, metadata=metadata)

    def critical(self, message: str, metadata: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Track a critical-level event."""
        return self.track("critical", severity="critical", message=message, metadata=metadata)

    # ── Private Helpers ───────────────────────────────

    def _log(self, *args: Any) -> None:
        if self.debug:
            logger.debug(" ".join(str(a) for a in args))

    def _request(self, method: str, path: str, body: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        url = f"{self.base_url}{path}"
        self._log(f"{method} {url}")

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
            "User-Agent": f"aigodfather-python/{__version__}",
        }

        try:
            if method == "GET":
                resp = requests.get(url, headers=headers, timeout=self.timeout)
            else:
                self._log("Body:", body)
                resp = requests.post(url, headers=headers, json=body, timeout=self.timeout)

            resp.raise_for_status()
            data: Dict[str, Any] = resp.json()
            self._log("Response:", data)
            return data

        except requests.exceptions.Timeout:
            raise TimeoutError(f"[AIGodfather] Request timed out after {self.timeout}s")
        except requests.exceptions.HTTPError as e:
            status = e.response.status_code if e.response is not None else None
            text = e.response.text if e.response is not None else "Unknown error"
            raise RuntimeError(f"[AIGodfather] HTTP {status}: {text}") from e
        except requests.exceptions.ConnectionError as e:
            raise ConnectionError(f"[AIGodfather] Connection failed: {e}") from e
