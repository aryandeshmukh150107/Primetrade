"""Binance Futures Testnet client wrapper."""

from __future__ import annotations

import logging
import os
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Mapping


PROJECT_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_ENV_FILE = PROJECT_ROOT / ".env"


class ConfigurationError(RuntimeError):
    """Raised when environment or dependency configuration is invalid."""


class AuthenticationError(RuntimeError):
    """Raised when Binance rejects the supplied API credentials."""


@dataclass(frozen=True)
class EnvironmentDiagnostics:
    """Non-secret diagnostic details about credential loading."""

    env_file: Path
    env_file_exists: bool
    dotenv_available: bool
    dotenv_loaded: bool
    api_key_loaded: bool
    api_secret_loaded: bool
    api_key_source: str
    api_secret_source: str

    def as_log_dict(self) -> dict[str, str | bool]:
        """Return safe diagnostics for structured logs."""

        return {
            "env_file": str(self.env_file),
            "env_file_exists": self.env_file_exists,
            "dotenv_available": self.dotenv_available,
            "dotenv_loaded": self.dotenv_loaded,
            "api_key_loaded": self.api_key_loaded,
            "api_secret_loaded": self.api_secret_loaded,
            "api_key_source": self.api_key_source,
            "api_secret_source": self.api_secret_source,
        }


@dataclass(frozen=True)
class ClientDiagnostics:
    """Non-secret diagnostic details about the Binance client."""

    futures_testnet_base_url: str
    futures_api_url: str
    futures_ping_endpoint: str
    futures_order_endpoint: str
    spot_api_url: str
    testnet_enabled: bool
    using_futures_testnet: bool
    using_futures_endpoints: bool

    def as_log_dict(self) -> dict[str, str | bool]:
        """Return safe diagnostics for structured logs."""

        return {
            "futures_testnet_base_url": self.futures_testnet_base_url,
            "futures_api_url": self.futures_api_url,
            "futures_ping_endpoint": self.futures_ping_endpoint,
            "futures_order_endpoint": self.futures_order_endpoint,
            "spot_api_url": self.spot_api_url,
            "testnet_enabled": self.testnet_enabled,
            "using_futures_testnet": self.using_futures_testnet,
            "using_futures_endpoints": self.using_futures_endpoints,
        }


@dataclass(frozen=True)
class ConnectionTestResult:
    """Result of a Binance Futures Testnet connectivity check."""

    client_diagnostics: ClientDiagnostics
    public_connectivity_ok: bool
    public_status_code: int | None
    authenticated_ok: bool
    authenticated_status_code: int | None
    server_time: int | None
    balance_asset_count: int | None


@dataclass(frozen=True)
class TimeSyncResult:
    """Details from synchronizing local time with Binance server time."""

    local_time_ms: int
    binance_server_time_ms: int
    calculated_offset_ms: int
    recv_window_ms: int

    def as_log_dict(self) -> dict[str, int]:
        """Return structured time synchronization details for logs."""

        return {
            "local_time_ms": self.local_time_ms,
            "binance_server_time_ms": self.binance_server_time_ms,
            "calculated_offset_ms": self.calculated_offset_ms,
            "recv_window_ms": self.recv_window_ms,
        }


class BinanceFuturesClient:
    """Lazy python-binance client configured for USDT-M Futures Testnet."""

    FUTURES_TESTNET_BASE_URL = "https://testnet.binancefuture.com"
    FUTURES_TESTNET_API_URL = f"{FUTURES_TESTNET_BASE_URL}/fapi"
    RECV_WINDOW_MS = 60_000

    def __init__(
        self,
        api_key: str,
        api_secret: str,
        *,
        request_timeout_seconds: int = 10,
        logger: logging.Logger | None = None,
        environment_diagnostics: EnvironmentDiagnostics | None = None,
    ) -> None:
        self.api_key = api_key
        self.api_secret = api_secret
        self.request_timeout_seconds = request_timeout_seconds
        self.logger = logger or logging.getLogger("trading_bot")
        self.environment_diagnostics = environment_diagnostics
        self._client: Any | None = None
        self._last_time_sync: TimeSyncResult | None = None

    @classmethod
    def from_env(
        cls,
        env_file: Path | None = None,
        *,
        diagnostics: EnvironmentDiagnostics | None = None,
        logger: logging.Logger | None = None,
    ) -> "BinanceFuturesClient":
        """Load credentials from .env or the current environment."""

        diagnostics = diagnostics or load_environment(env_file, logger=logger)

        if not diagnostics.dotenv_available:
            raise ConfigurationError(
                "python-dotenv is not installed. Run: pip install -r "
                "requirements.txt"
            )

        api_key = os.getenv("BINANCE_API_KEY", "").strip()
        api_secret = os.getenv("BINANCE_API_SECRET", "").strip()

        missing = []
        if not api_key:
            missing.append("BINANCE_API_KEY")
        if not api_secret:
            missing.append("BINANCE_API_SECRET")

        if missing:
            joined = ", ".join(missing)
            raise ConfigurationError(
                f"Missing environment variable(s): {joined}. Create a .env "
                "file from .env.example and add Binance Futures Testnet "
                "credentials."
            )

        return cls(
            api_key=api_key,
            api_secret=api_secret,
            logger=logger,
            environment_diagnostics=diagnostics,
        )

    def create_order(self, params: Mapping[str, Any]) -> dict[str, Any]:
        """Submit a futures order and return Binance's response."""

        client = self._get_client()
        self.synchronize_server_time()
        order_params = dict(params)
        order_params["recvWindow"] = self.RECV_WINDOW_MS
        response = client.futures_create_order(**order_params)

        if not isinstance(response, dict):
            raise ConfigurationError(
                "Binance returned an unexpected response format."
            )

        self.logger.info(
            "Authenticated Binance Futures request succeeded",
            extra={
                "event": "authentication.status",
                "auth_status": "success",
                "endpoint": "futures_create_order",
                "api_response_code": self._last_response_status_code(),
                "recv_window_ms": self.RECV_WINDOW_MS,
            },
        )
        return response

    def test_connection(self) -> ConnectionTestResult:
        """Test public and authenticated Binance Futures Testnet connectivity."""

        client = self._get_client()
        diagnostics = self.get_client_diagnostics()
        self.logger.info(
            "Starting Binance Futures Testnet connection test",
            extra={
                "event": "connection_test.start",
                **diagnostics.as_log_dict(),
            },
        )

        (
            binance_api_exception,
            binance_request_exception,
            _binance_order_exception,
        ) = _load_binance_exception_classes()
        network_exceptions = _load_network_exception_classes()

        public_status_code: int | None = None
        authenticated_status_code: int | None = None
        server_time: int | None = None
        balance_asset_count: int | None = None

        try:
            client.futures_ping()
            public_status_code = self._last_response_status_code()
            self.logger.info(
                "Futures public ping succeeded",
                extra={
                    "event": "connection_test.public_ping",
                    "api_response_code": public_status_code,
                },
            )

            time_sync = self.synchronize_server_time(force=True)
            server_time = time_sync.binance_server_time_ms

            balance_response = client.futures_account_balance(
                recvWindow=self.RECV_WINDOW_MS,
            )
            authenticated_status_code = self._last_response_status_code()
            balance_asset_count = (
                len(balance_response)
                if isinstance(balance_response, list)
                else None
            )
            self.logger.info(
                "Futures authenticated balance request succeeded",
                extra={
                    "event": "authentication.status",
                    "auth_status": "success",
                    "endpoint": "futures_account_balance",
                    "api_response_code": authenticated_status_code,
                    "balance_asset_count": balance_asset_count,
                    "recv_window_ms": self.RECV_WINDOW_MS,
                },
            )
        except binance_api_exception as exc:
            status_code = getattr(exc, "status_code", None)
            code = getattr(exc, "code", None)
            self.logger.warning(
                "Binance API error during connection test",
                extra={
                    "event": "connection_test.binance_api_error",
                    "auth_status": (
                        "failed" if is_authentication_error(exc) else "unknown"
                    ),
                    "api_response_code": status_code,
                    "binance_error_code": code,
                    "binance_error_message": _exception_message(exc),
                },
            )
            if is_authentication_error(exc):
                raise AuthenticationError(
                    build_authentication_error_message(
                        exc=exc,
                        client_diagnostics=diagnostics,
                        environment_diagnostics=self.environment_diagnostics,
                    )
                ) from exc
            raise
        except binance_request_exception:
            self.logger.exception(
                "Binance request error during connection test",
                extra={"event": "connection_test.binance_request_error"},
            )
            raise
        except network_exceptions:
            self.logger.exception(
                "Network error during connection test",
                extra={"event": "connection_test.network_error"},
            )
            raise

        return ConnectionTestResult(
            client_diagnostics=diagnostics,
            public_connectivity_ok=True,
            public_status_code=public_status_code,
            authenticated_ok=True,
            authenticated_status_code=authenticated_status_code,
            server_time=server_time,
            balance_asset_count=balance_asset_count,
        )

    def get_client_diagnostics(self) -> ClientDiagnostics:
        """Return safe diagnostics proving Futures Testnet endpoint usage."""

        client = self._get_client()
        futures_ping_endpoint = client._create_futures_api_uri(  # noqa: SLF001
            "ping",
            version=1,
        )
        futures_order_endpoint = client._create_futures_api_uri(  # noqa: SLF001
            "order",
            version=1,
        )
        spot_api_url = str(getattr(client, "API_URL", ""))
        futures_testnet_url = str(getattr(client, "FUTURES_TESTNET_URL", ""))
        testnet_enabled = bool(getattr(client, "testnet", False))

        return ClientDiagnostics(
            futures_testnet_base_url=self.FUTURES_TESTNET_BASE_URL,
            futures_api_url=futures_testnet_url,
            futures_ping_endpoint=futures_ping_endpoint,
            futures_order_endpoint=futures_order_endpoint,
            spot_api_url=spot_api_url,
            testnet_enabled=testnet_enabled,
            using_futures_testnet=(
                testnet_enabled
                and futures_testnet_url == self.FUTURES_TESTNET_API_URL
            ),
            using_futures_endpoints=(
                futures_ping_endpoint.startswith(self.FUTURES_TESTNET_API_URL)
                and futures_order_endpoint.startswith(
                    self.FUTURES_TESTNET_API_URL
                )
            ),
        )

    def synchronize_server_time(self, *, force: bool = False) -> TimeSyncResult:
        """Synchronize python-binance signed timestamps with server time."""

        if self._last_time_sync is not None and not force:
            self.logger.info(
                "Using cached Binance server time offset",
                extra={
                    "event": "time_sync.cached",
                    **self._last_time_sync.as_log_dict(),
                },
            )
            return self._last_time_sync

        client = self._get_client()
        local_time_before_ms = _current_time_ms()
        response = client.futures_time()
        local_time_after_ms = _current_time_ms()
        server_time_ms = _extract_server_time(response)

        if server_time_ms is None:
            raise ConfigurationError(
                "Binance Futures Testnet did not return serverTime."
            )

        local_time_midpoint_ms = (
            local_time_before_ms + local_time_after_ms
        ) // 2
        offset_ms = server_time_ms - local_time_midpoint_ms
        client.timestamp_offset = offset_ms

        result = TimeSyncResult(
            local_time_ms=local_time_midpoint_ms,
            binance_server_time_ms=server_time_ms,
            calculated_offset_ms=offset_ms,
            recv_window_ms=self.RECV_WINDOW_MS,
        )
        self._last_time_sync = result

        self.logger.info(
            "Synchronized local time with Binance Futures server time",
            extra={
                "event": "time_sync.completed",
                "api_response_code": self._last_response_status_code(),
                **result.as_log_dict(),
            },
        )
        return result

    def close(self) -> None:
        """Close the underlying HTTP session when python-binance supports it."""

        if self._client is not None and hasattr(self._client, "close_connection"):
            self._client.close_connection()

    def _get_client(self) -> Any:
        """Create the underlying python-binance client on first use."""

        if self._client is not None:
            return self._client

        try:
            from binance.client import Client
        except ImportError as exc:
            raise ConfigurationError(
                "python-binance is not installed. Run: pip install -r "
                "requirements.txt"
            ) from exc

        requests_params = {"timeout": self.request_timeout_seconds}
        self._client = Client(
            self.api_key,
            self.api_secret,
            requests_params=requests_params,
            testnet=True,
            ping=False,
        )

        # Keep this explicit because the hiring task requires this base URL.
        self._client.FUTURES_TESTNET_URL = self.FUTURES_TESTNET_API_URL
        self._client.FUTURES_URL = self.FUTURES_TESTNET_API_URL
        self._client.REQUEST_RECVWINDOW = self.RECV_WINDOW_MS

        diagnostics = self.get_client_diagnostics()
        self.logger.info(
            "Binance client configured",
            extra={
                "event": "binance.client.configured",
                **diagnostics.as_log_dict(),
            },
        )
        return self._client

    def _last_response_status_code(self) -> int | None:
        """Return the last HTTP status code exposed by python-binance."""

        if self._client is None:
            return None
        response = getattr(self._client, "response", None)
        return getattr(response, "status_code", None)


def load_environment(
    env_file: Path | None = None,
    *,
    logger: logging.Logger | None = None,
) -> EnvironmentDiagnostics:
    """Load .env and return non-secret credential diagnostics."""

    logger = logger or logging.getLogger("trading_bot")
    resolved_env_file = env_file or DEFAULT_ENV_FILE
    existing_api_key = bool(os.getenv("BINANCE_API_KEY", "").strip())
    existing_api_secret = bool(os.getenv("BINANCE_API_SECRET", "").strip())

    dotenv_available = True
    dotenv_loaded = False
    file_api_key = False
    file_api_secret = False

    try:
        from dotenv import dotenv_values, load_dotenv
    except ImportError:
        dotenv_available = False
    else:
        if resolved_env_file.exists():
            file_values = dotenv_values(resolved_env_file)
            file_api_key = bool(
                str(file_values.get("BINANCE_API_KEY", "") or "").strip()
            )
            file_api_secret = bool(
                str(file_values.get("BINANCE_API_SECRET", "") or "").strip()
            )
        dotenv_loaded = load_dotenv(
            dotenv_path=resolved_env_file,
            override=False,
        )

    api_key_loaded = bool(os.getenv("BINANCE_API_KEY", "").strip())
    api_secret_loaded = bool(os.getenv("BINANCE_API_SECRET", "").strip())
    diagnostics = EnvironmentDiagnostics(
        env_file=resolved_env_file,
        env_file_exists=resolved_env_file.exists(),
        dotenv_available=dotenv_available,
        dotenv_loaded=dotenv_loaded,
        api_key_loaded=api_key_loaded,
        api_secret_loaded=api_secret_loaded,
        api_key_source=_credential_source(
            loaded=api_key_loaded,
            existed_before=existing_api_key,
            present_in_file=file_api_key,
        ),
        api_secret_source=_credential_source(
            loaded=api_secret_loaded,
            existed_before=existing_api_secret,
            present_in_file=file_api_secret,
        ),
    )

    logger.info(
        "Environment loaded",
        extra={"event": "environment.loaded", **diagnostics.as_log_dict()},
    )
    return diagnostics


def is_authentication_error(exc: Exception) -> bool:
    """Return true when a Binance API error is credential-related."""

    return getattr(exc, "code", None) in {-2014, -2015, -1022}


def build_authentication_error_message(
    *,
    exc: Exception,
    client_diagnostics: ClientDiagnostics,
    environment_diagnostics: EnvironmentDiagnostics | None,
) -> str:
    """Build a detailed, safe authentication error message."""

    code = getattr(exc, "code", None)
    status_code = getattr(exc, "status_code", None)
    message = _exception_message(exc)
    checks: list[str] = []

    if environment_diagnostics is not None:
        if not environment_diagnostics.api_key_loaded:
            checks.append("Missing credentials: BINANCE_API_KEY is not loaded.")
        if not environment_diagnostics.api_secret_loaded:
            checks.append(
                "Missing credentials: BINANCE_API_SECRET is not loaded."
            )

    if code == -2014:
        checks.append(
            "Invalid API key: Binance says the API key format is invalid."
        )
    elif code == -1022:
        checks.append(
            "Invalid secret: Binance says the request signature is not valid."
        )
    elif code == -2015:
        checks.append(
            "Invalid API key, IP restriction, permission, or wrong "
            "environment."
        )

    if not client_diagnostics.using_futures_testnet:
        checks.append(
            "Wrong environment: the Binance client is not configured for "
            "Futures Testnet."
        )
    else:
        checks.append(
            "Environment check: client is using Binance Futures Testnet at "
            f"{client_diagnostics.futures_testnet_base_url}."
        )

    if environment_diagnostics is not None:
        if (
            environment_diagnostics.api_key_source == "process environment"
            or environment_diagnostics.api_secret_source == "process environment"
        ):
            checks.append(
                "Credential source check: a process environment variable is "
                "taking precedence over .env. Confirm it is a Futures Testnet "
                "credential, not a mainnet credential."
            )
        elif (
            environment_diagnostics.api_key_source == ".env"
            or environment_diagnostics.api_secret_source == ".env"
        ):
            checks.append(
                "Credential source check: credentials were loaded from .env."
            )

    checks.append(
        "Wrong environment check: mainnet Binance keys do not authenticate "
        "against Binance Futures Testnet."
    )

    response_part = (
        f" Binance response: HTTP {status_code}, code {code}, message: "
        f"{message}."
    )
    return "Authentication failed." + response_part + " " + " ".join(checks)


def _load_binance_exception_classes() -> tuple[type[Exception], ...]:
    """Return python-binance exception classes, or harmless fallbacks."""

    try:
        from binance.exceptions import (
            BinanceAPIException,
            BinanceOrderException,
            BinanceRequestException,
        )
    except ImportError:
        return (
            _NeverRaisedBinanceException,
            _NeverRaisedBinanceException,
            _NeverRaisedBinanceException,
        )

    return BinanceAPIException, BinanceRequestException, BinanceOrderException


def _load_network_exception_classes() -> tuple[type[BaseException], ...]:
    """Return network exception classes available in this environment."""

    classes: list[type[BaseException]] = [ConnectionError, TimeoutError]
    try:
        from requests.exceptions import RequestException
    except ImportError:
        return tuple(classes)

    classes.append(RequestException)
    return tuple(classes)


class _NeverRaisedBinanceException(Exception):
    """Fallback exception class used when python-binance is unavailable."""


def _credential_source(
    *,
    loaded: bool,
    existed_before: bool,
    present_in_file: bool,
) -> str:
    """Describe where a credential came from without exposing it."""

    if not loaded:
        return "missing"
    if existed_before:
        return "process environment"
    if present_in_file:
        return ".env"
    return "process environment"


def _exception_message(exc: Exception) -> str:
    """Extract a clean message from third-party exceptions."""

    for attribute in ("message", "msg"):
        value = getattr(exc, attribute, None)
        if value:
            return str(value)
    return str(exc)


def _extract_server_time(response: Any) -> int | None:
    """Extract Binance server time from a response payload."""

    if not isinstance(response, dict):
        return None
    server_time = response.get("serverTime")
    if isinstance(server_time, int):
        return server_time
    try:
        return int(str(server_time))
    except (TypeError, ValueError):
        return None


def _current_time_ms() -> int:
    """Return local Unix time in milliseconds."""

    return int(time.time() * 1000)
