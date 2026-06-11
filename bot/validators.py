"""Input validation helpers for Binance Futures orders."""

from __future__ import annotations

from dataclasses import dataclass
from decimal import Decimal, InvalidOperation
from typing import Any
import re


VALID_SIDES = {"BUY", "SELL"}
VALID_ORDER_TYPES = {"MARKET", "LIMIT"}


class ValidationError(ValueError):
    """Raised when one or more user supplied order fields are invalid."""

    def __init__(self, errors: list[str]) -> None:
        self.errors = errors
        super().__init__("; ".join(errors))


@dataclass(frozen=True)
class OrderRequest:
    """Validated user order details."""

    symbol: str
    side: str
    order_type: str
    quantity: Decimal
    price: Decimal | None = None

    def as_log_dict(self) -> dict[str, str | None]:
        """Return a safe, serializable representation for logs."""

        return {
            "symbol": self.symbol,
            "side": self.side,
            "type": self.order_type,
            "quantity": decimal_to_plain(self.quantity),
            "price": decimal_to_plain(self.price) if self.price else None,
        }


def decimal_to_plain(value: Decimal) -> str:
    """Render a Decimal without scientific notation for Binance parameters."""

    normalized = value.normalize()
    text = format(normalized, "f")
    if "." in text:
        text = text.rstrip("0").rstrip(".")
    return text or "0"


def normalize_symbol(symbol: str | None) -> str:
    """Validate and normalize the trading symbol."""

    if symbol is None or not str(symbol).strip():
        raise ValidationError(["symbol is required."])
    
    normalized = str(symbol).strip().upper()
    if not re.match(r"^[A-Z0-9]+USDT$", normalized):
        raise ValidationError(["symbol must end with USDT (e.g. BTCUSDT) and contain only uppercase letters and numbers."])
    
    return normalized


def normalize_side(side: str | None) -> str:
    """Validate and normalize BUY or SELL side."""

    if side is None or not str(side).strip():
        raise ValidationError(["side is required. Use BUY or SELL."])

    normalized = str(side).strip().upper()
    if normalized not in VALID_SIDES:
        raise ValidationError(["side must be BUY or SELL."])
    return normalized


def normalize_order_type(order_type: str | None) -> str:
    """Validate and normalize MARKET or LIMIT order type."""

    if order_type is None or not str(order_type).strip():
        raise ValidationError(["type is required. Use MARKET or LIMIT."])

    normalized = str(order_type).strip().upper()
    if normalized not in VALID_ORDER_TYPES:
        raise ValidationError(["type must be MARKET or LIMIT."])
    return normalized


def parse_positive_decimal(value: Any, field_name: str) -> Decimal:
    """Parse a required positive decimal field."""

    if value is None or not str(value).strip():
        raise ValidationError([f"{field_name} is required."])

    try:
        parsed = Decimal(str(value).strip())
    except (InvalidOperation, ValueError):
        raise ValidationError([f"{field_name} must be a valid number."]) from None

    if not parsed.is_finite():
        raise ValidationError([f"{field_name} must be a finite number."])
    if parsed <= 0:
        raise ValidationError([f"{field_name} must be greater than 0."])
    return parsed


def validate_order_inputs(
    *,
    symbol: str | None,
    side: str | None,
    order_type: str | None,
    quantity: Any,
    price: Any = None,
) -> OrderRequest:
    """Validate CLI fields and return an OrderRequest.

    All validation errors are collected so command-line users get a complete
    set of corrections in one response.
    """

    errors: list[str] = []
    normalized_symbol: str | None = None
    normalized_side: str | None = None
    normalized_type: str | None = None
    parsed_quantity: Decimal | None = None
    parsed_price: Decimal | None = None

    try:
        normalized_symbol = normalize_symbol(symbol)
    except ValidationError as exc:
        errors.extend(exc.errors)

    try:
        normalized_side = normalize_side(side)
    except ValidationError as exc:
        errors.extend(exc.errors)

    try:
        normalized_type = normalize_order_type(order_type)
    except ValidationError as exc:
        errors.extend(exc.errors)

    try:
        parsed_quantity = parse_positive_decimal(quantity, "quantity")
    except ValidationError as exc:
        errors.extend(exc.errors)

    if normalized_type == "LIMIT":
        try:
            parsed_price = parse_positive_decimal(price, "price")
        except ValidationError as exc:
            errors.extend(exc.errors)
    elif price is not None and str(price).strip():
        try:
            parse_positive_decimal(price, "price")
        except ValidationError as exc:
            errors.extend(exc.errors)

    if errors:
        raise ValidationError(errors)

    return OrderRequest(
        symbol=normalized_symbol or "",
        side=normalized_side or "",
        order_type=normalized_type or "",
        quantity=parsed_quantity or Decimal("0"),
        price=parsed_price,
    )
