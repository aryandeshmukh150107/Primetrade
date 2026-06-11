"""Order construction and execution service."""

from __future__ import annotations

import logging
from dataclasses import dataclass
from decimal import Decimal, InvalidOperation
from typing import Any

from bot.client import (
    BinanceFuturesClient,
    ConfigurationError,
    build_authentication_error_message,
    is_authentication_error,
)
from bot.validators import OrderRequest, decimal_to_plain


DEFAULT_RECV_WINDOW_MS = 60_000


class OrderExecutionError(RuntimeError):
    """Raised when an order cannot be placed successfully."""


class _NeverRaisedBinanceException(Exception):
    """Fallback exception class used when python-binance is unavailable."""


@dataclass(frozen=True)
class OrderResult:
    """Normalized order placement response shown to the user."""

    order_id: str
    status: str
    executed_quantity: str
    average_price: str
    client_order_id: str
    raw_response: dict[str, Any]

    @classmethod
    def from_binance_response(cls, response: dict[str, Any]) -> "OrderResult":
        """Build a display-friendly result from Binance's response payload."""

        return cls(
            order_id=str(response.get("orderId", "N/A")),
            status=str(response.get("status", "N/A")),
            executed_quantity=str(response.get("executedQty", "0")),
            average_price=_extract_average_price(response),
            client_order_id=str(response.get("clientOrderId", "N/A")),
            raw_response=response,
        )


def build_order_params(order: OrderRequest) -> dict[str, Any]:
    """Translate a validated OrderRequest into Binance Futures parameters."""

    params: dict[str, Any] = {
        "symbol": order.symbol,
        "side": order.side,
        "type": order.order_type,
        "quantity": decimal_to_plain(order.quantity),
        "newOrderRespType": "RESULT",
        "recvWindow": DEFAULT_RECV_WINDOW_MS,
    }

    if order.order_type == "LIMIT":
        params["timeInForce"] = "GTC"
        params["price"] = decimal_to_plain(order.price or Decimal("0"))

    return params


class OrderService:
    """Coordinates validation-ready order requests with Binance."""

    def __init__(
        self,
        client: BinanceFuturesClient,
        logger: logging.Logger | None = None,
    ) -> None:
        self.client = client
        self.logger = logger or logging.getLogger("trading_bot")

    def place_order(self, order: OrderRequest) -> OrderResult:
        """Submit a MARKET or LIMIT order to Binance Futures Testnet."""

        params = build_order_params(order)
        self.logger.info(
            "Submitting Binance Futures Testnet order",
            extra={"event": "order.submit", "request": params},
        )

        (
            binance_api_exception,
            binance_request_exception,
            binance_order_exception,
        ) = _load_binance_exception_classes()
        network_exceptions = _load_network_exception_classes()

        try:
            response = self.client.create_order(params)
        except ConfigurationError:
            self.logger.exception(
                "Configuration error while placing order",
                extra={"event": "order.configuration_error", "request": params},
            )
            raise
        except binance_order_exception as exc:
            self.logger.exception(
                "Binance order exception",
                extra={"event": "order.binance_order_error", "request": params},
            )
            raise OrderExecutionError(
                f"Binance rejected the order details: {_exception_message(exc)}"
            ) from exc
        except binance_api_exception as exc:
            status_code = getattr(exc, "status_code", None)
            code = getattr(exc, "code", None)
            self.logger.exception(
                "Binance API exception",
                extra={
                    "event": "order.binance_api_error",
                    "request": params,
                    "api_response_code": status_code,
                    "binance_error_code": code,
                    "binance_error_message": _exception_message(exc),
                    "auth_status": (
                        "failed" if is_authentication_error(exc) else "unknown"
                    ),
                },
            )
            if is_authentication_error(exc):
                raise OrderExecutionError(
                    build_authentication_error_message(
                        exc=exc,
                        client_diagnostics=self.client.get_client_diagnostics(),
                        environment_diagnostics=(
                            self.client.environment_diagnostics
                        ),
                    )
                ) from exc
            raise OrderExecutionError(_friendly_binance_api_error(exc)) from exc
        except binance_request_exception as exc:
            self.logger.exception(
                "Binance request exception",
                extra={"event": "order.binance_request_error", "request": params},
            )
            raise OrderExecutionError(
                "Could not reach Binance Futures Testnet. Check your network "
                "connection and try again."
            ) from exc
        except network_exceptions as exc:
            self.logger.exception(
                "Network error while placing order",
                extra={"event": "order.network_error", "request": params},
            )
            raise OrderExecutionError(
                "A network error occurred while contacting Binance Futures "
                "Testnet. Please retry after checking your connection."
            ) from exc
        except Exception as exc:
            self.logger.exception(
                "Unexpected exception while placing order",
                extra={"event": "order.unexpected_error", "request": params},
            )
            raise OrderExecutionError(
                "An unexpected error occurred while placing the order. See "
                "logs/app.log for details."
            ) from exc

        self.logger.info(
            "Received Binance order response",
            extra={"event": "order.response", "response": response},
        )
        return OrderResult.from_binance_response(response)


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


def _friendly_binance_api_error(exc: Exception) -> str:
    """Map Binance API exceptions to safe end-user messages."""

    code = getattr(exc, "code", None)
    message = _exception_message(exc)

    suffix = f" (code {code})." if code is not None else "."
    return f"Binance rejected the order: {message}{suffix}"


def _exception_message(exc: Exception) -> str:
    """Extract a clean message from third-party exceptions."""

    for attribute in ("message", "msg"):
        value = getattr(exc, attribute, None)
        if value:
            return str(value)
    return str(exc)


def _extract_average_price(response: dict[str, Any]) -> str:
    """Extract or compute the average fill price from a Binance response."""

    for key in ("avgPrice", "averagePrice"):
        value = response.get(key)
        if value not in (None, ""):
            return str(value)

    executed_qty = _safe_decimal(response.get("executedQty"))
    cum_quote = _safe_decimal(
        response.get("cumQuote", response.get("cummulativeQuoteQty"))
    )

    if executed_qty and cum_quote:
        return decimal_to_plain(cum_quote / executed_qty)

    return "0"


def _safe_decimal(value: Any) -> Decimal | None:
    """Convert a value to Decimal when possible."""

    if value in (None, ""):
        return None
    try:
        parsed = Decimal(str(value))
    except (InvalidOperation, ValueError):
        return None
    if not parsed.is_finite() or parsed <= 0:
        return None
    return parsed
