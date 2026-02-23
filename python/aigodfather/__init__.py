"""
AIGodfather SDK for Python
Official SDK for AI Agent Monitoring & EU AI Act Compliance

https://aigodfather.ai/docs
"""

from __future__ import annotations

import logging
import time
from typing import Any, Callable, Dict, List, Optional

import requests

__version__ = "2.0.0"
__all__ = [
    "AIGodfather",
    "BlockedError",
    "ApprovalRequiredError",
    "PlanLimitError",
    "AgentPausedError",
]

logger = logging.getLogger("aigodfather")


# ── Error Classes ─────────────────────────────────────


class BlockedError(Exception):
    """Raised when a rule blocks the action (HTTP 403)."""

    def __init__(self, message: str) -> None:
        super().__init__(message)
        self.status = 403
        self.blocked = True


class ApprovalRequiredError(Exception):
    """Raised when an action requires human approval (HTTP 202)."""

    def __init__(self, approval_id: str, poll_url: str) -> None:
        super().__init__(f"Action requires human approval ({approval_id})")
        self.status = 202
        self.approval_id = approval_id
        self.poll_url = poll_url


class PlanLimitError(Exception):
    """Raised when the plan event limit is reached (HTTP 429)."""

    def __init__(self, message: str, upgrade_required: str = "growth") -> None:
        super().__init__(message)
        self.status = 429
        self.upgrade_required = upgrade_required


class AgentPausedError(Exception):
    """Raised when the agent is paused (HTTP 503)."""

    def __init__(self) -> None:
        super().__init__("Agent is paused. Resume from the AIGodfather dashboard.")
        self.status = 503


# ── SDK Class ─────────────────────────────────────────


class AIGodfather:
    """AIGodfather Python SDK client.

    Args:
        api_key: Your API key (starts with agf_live_ or agf_test_).
        base_url: Base URL override (default: https://api.aigodfather.ai).
        debug: Enable debug logging (default: False).
        timeout: Request timeout in seconds (default: 10).
        max_retries: Max retries on 429/5xx errors (default: 3).
        default_tags: Tags applied to every event.
        default_metadata: Metadata merged into every event.
        on_block: Callback when a rule blocks an action.
        on_approval_required: Callback when an action requires approval.
    """

    def __init__(
        self,
        api_key: str,
        base_url: str = "https://api.aigodfather.ai",
        debug: bool = False,
        timeout: int = 10,
        max_retries: int = 3,
        default_tags: Optional[List[str]] = None,
        default_metadata: Optional[Dict[str, Any]] = None,
        on_block: Optional[Callable[[BlockedError], None]] = None,
        on_approval_required: Optional[Callable[[Dict[str, Any]], None]] = None,
    ) -> None:
        if not api_key:
            raise ValueError("[AIGodfather] api_key is required")

        self.api_key = api_key
        self.base_url = base_url.rstrip("/")
        self.debug = debug
        self.timeout = timeout
        self.max_retries = max_retries
        self.default_tags: List[str] = default_tags or []
        self.default_metadata: Dict[str, Any] = default_metadata or {}
        self.on_block = on_block
        self.on_approval_required = on_approval_required

        if self.debug:
            logging.basicConfig(level=logging.DEBUG)
            logger.setLevel(logging.DEBUG)

    # ── Public Methods ────────────────────────────────

    def ping(self) -> Dict[str, Any]:
        """Test connectivity and retrieve agent info + usage limits.
        Also updates the agent's connection status on the platform.
        """
        return self._request("POST", "/v1/ping", {
            "sdk_version": __version__,
            "integration_type": "python-sdk",
        })

    def track(
        self,
        event_type: str,
        severity: str = "low",
        message: str = "",
        metadata: Optional[Dict[str, Any]] = None,
        user_id: Optional[str] = None,
        tags: Optional[List[str]] = None,
    ) -> Dict[str, Any]:
        """Track a custom event (maps to event_type on the platform).

        Args:
            event_type: Type/name of the event.
            severity: One of 'low', 'medium', 'high', 'critical'.
            message: Human-readable message.
            metadata: Arbitrary metadata dict.
            user_id: Associated user ID.
            tags: Tags for filtering.
        """
        body = {
            "event_type": event_type,
            "severity": severity,
            "message": message,
            "metadata": {**self.default_metadata, **(metadata or {})},
            "user_id": user_id,
            "tags": [*self.default_tags, *(tags or [])],
            "source": "python-sdk",
        }
        return self._send_event(body)

    def action(
        self,
        action_name: str,
        resource: Optional[str] = None,
        severity: str = "low",
        message: str = "",
        metadata: Optional[Dict[str, Any]] = None,
        user_id: Optional[str] = None,
        tags: Optional[List[str]] = None,
        requires_approval: bool = False,
        callback_url: Optional[str] = None,
        amount: Optional[float] = None,
        currency: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Track an explicit action (maps to `action` on the platform).
        Use this for actions the rule engine should evaluate.

        Args:
            action_name: Action identifier (e.g. "payment", "delete", "export").
            resource: Target resource (e.g. "database", "user:123").
            severity: One of 'low', 'medium', 'high', 'critical'.
            message: Human-readable message.
            metadata: Arbitrary metadata dict.
            user_id: Associated user ID.
            tags: Tags for filtering.
            requires_approval: Flag this action as requiring human approval.
            callback_url: Webhook URL for approval notification.
            amount: Monetary amount (for payment rules).
            currency: Currency code (for payment rules).
        """
        payload = {**self.default_metadata, **(metadata or {})}
        if message:
            payload["_message"] = message
        if amount is not None:
            payload["amount"] = amount
        if currency:
            payload["currency"] = currency

        body = {
            "action": action_name,
            "resource": resource,
            "risk_level": severity,
            "payload": payload,
            "user_id": user_id,
            "tags": [*self.default_tags, *(tags or [])],
            "requires_approval": requires_approval,
            "callback_url": callback_url,
            "source": "python-sdk",
        }
        return self._send_event(body)

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

    def wait_for_approval(
        self,
        approval_id: str,
        interval_seconds: float = 2.0,
        timeout_seconds: float = 300.0,
    ) -> Dict[str, Any]:
        """Poll an approval request until it resolves.

        Args:
            approval_id: The approval ID from an event response.
            interval_seconds: Polling interval (default: 2s).
            timeout_seconds: Max wait time (default: 300s = 5 min).

        Returns:
            Dict with keys: status, reason, decided_at
        """
        deadline = time.time() + timeout_seconds
        self._log(f"Waiting for approval {approval_id} (timeout: {timeout_seconds}s)")

        while time.time() < deadline:
            result = self.check_approval(approval_id)
            if result["status"] != "pending":
                self._log(f"Approval {approval_id} resolved: {result['status']}")
                return result
            time.sleep(interval_seconds)

        return {"status": "expired", "reason": "SDK polling timeout", "decided_at": None}

    def check_approval(self, approval_id: str) -> Dict[str, Any]:
        """Check the current status of an approval request (single poll).

        Returns:
            Dict with keys: status, reason, decided_at
        """
        return self._request("GET", f"/v1/approvals/{approval_id}")

    # ── Private Helpers ───────────────────────────────

    def _log(self, *args: Any) -> None:
        if self.debug:
            logger.debug(" ".join(str(a) for a in args))

    def _send_event(self, body: Dict[str, Any]) -> Dict[str, Any]:
        """Send event to /v1/events with full response handling."""
        url = f"{self.base_url}/v1/events"
        self._log(f"POST {url}")
        self._log("Body:", body)

        resp = self._fetch_with_retry("POST", url, body)
        data: Dict[str, Any] = resp.json()

        # 403 — Blocked by rule
        if resp.status_code == 403:
            err = BlockedError(data.get("message", "Action blocked by rule"))
            if self.on_block:
                self.on_block(err)
            raise err

        # 429 — Plan limit
        if resp.status_code == 429:
            raise PlanLimitError(
                data.get("error", "Plan event limit reached"),
                data.get("upgradeRequired", "growth"),
            )

        # 503 — Agent paused
        if resp.status_code == 503:
            raise AgentPausedError()

        # Other errors
        if resp.status_code >= 400:
            raise RuntimeError(f"[AIGodfather] HTTP {resp.status_code}: {resp.text}")

        # 202 — Pending approval
        if resp.status_code == 202:
            approval_info = {
                "approval_id": data.get("approval_id"),
                "poll_url": data.get("poll_url"),
                "blocking": data.get("blocking", True),
                "rules_matched": data.get("rules_matched", 0),
            }
            if self.on_approval_required:
                self.on_approval_required(approval_info)

            return {
                "success": True,
                "status": "pending_approval",
                "event_id": None,
                "agent_id": None,
                "rules_matched": approval_info["rules_matched"],
                "incident_created": False,
                "incident_id": None,
                "ai_classification": None,
                "warning": None,
                "approval_id": approval_info["approval_id"],
                "poll_url": approval_info["poll_url"],
            }

        # 201 — Success
        result = {
            "success": data.get("success", True),
            "status": "recorded",
            "event_id": data.get("event_id"),
            "agent_id": data.get("agent_id"),
            "rules_matched": data.get("rules_matched", 0),
            "incident_created": data.get("incident_created", False),
            "incident_id": data.get("incident_id"),
            "ai_classification": data.get("ai_classification"),
            "warning": data.get("warning"),
            "timestamp": data.get("timestamp"),
        }
        self._log("Response:", result)
        return result

    def _fetch_with_retry(self, method: str, url: str, body: Optional[Dict[str, Any]] = None) -> requests.Response:
        """Fetch with exponential backoff retry on 429 and 5xx errors."""
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
            "User-Agent": f"aigodfather-python/{__version__}",
        }

        last_error: Optional[Exception] = None

        for attempt in range(self.max_retries + 1):
            if attempt > 0:
                delay = min(2 ** (attempt - 1), 10)
                self._log(f"Retry {attempt}/{self.max_retries} after {delay}s")
                time.sleep(delay)

            try:
                if method == "GET":
                    resp = requests.get(url, headers=headers, timeout=self.timeout)
                else:
                    resp = requests.post(url, headers=headers, json=body, timeout=self.timeout)

                # Don't retry on 4xx (except 429) — those are intentional
                if resp.status_code == 429 or resp.status_code >= 500:
                    if attempt < self.max_retries:
                        self._log(f"HTTP {resp.status_code} — will retry")
                        continue

                return resp

            except requests.exceptions.Timeout:
                last_error = TimeoutError(f"[AIGodfather] Request timed out after {self.timeout}s")
                if attempt == self.max_retries:
                    break
            except requests.exceptions.ConnectionError as e:
                last_error = ConnectionError(f"[AIGodfather] Connection failed: {e}")
                if attempt == self.max_retries:
                    break

        raise last_error or RuntimeError("[AIGodfather] Request failed after retries")

    def _request(self, method: str, path: str, body: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Generic request helper for non-event endpoints."""
        url = f"{self.base_url}{path}"
        self._log(f"{method} {url}")
        if body:
            self._log("Body:", body)

        resp = self._fetch_with_retry(method, url, body)

        if not resp.ok:
            raise RuntimeError(f"[AIGodfather] HTTP {resp.status_code}: {resp.text}")

        data: Dict[str, Any] = resp.json()
        self._log("Response:", data)
        return data
