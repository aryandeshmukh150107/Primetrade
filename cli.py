"""Command-line interface for manual Binance Futures Testnet orders."""

from __future__ import annotations

import argparse
import logging
import sys
from decimal import Decimal
from typing import Any, Callable, Sequence, TypeVar

from bot.client import (
    AuthenticationError,
    BinanceFuturesClient,
    ConfigurationError,
    ConnectionTestResult,
    EnvironmentDiagnostics,
    load_environment,
)
from bot.logging_config import LOG_FILE, configure_logging
from bot.orders import OrderExecutionError, OrderResult, OrderService
from bot.validators import (
    OrderRequest,
    ValidationError,
    decimal_to_plain,
    normalize_order_type,
    normalize_side,
    normalize_symbol,
    parse_positive_decimal,
    validate_order_inputs,
)


T = TypeVar("T")


def build_parser() -> argparse.ArgumentParser:
    """Create the CLI argument parser."""

    parser = argparse.ArgumentParser(
        description=(
            "Place manual MARKET and LIMIT orders on Binance Futures Testnet."
        )
    )
    parser.add_argument("--symbol", help="Trading pair, for example BTCUSDT")
    parser.add_argument("--side", help="BUY or SELL")
    parser.add_argument("--type", dest="order_type", help="MARKET or LIMIT")
    parser.add_argument("--quantity", help="Order quantity, for example 0.01")
    parser.add_argument(
        "--price",
        help="Limit price. Required only when --type LIMIT is used.",
    )
    parser.add_argument(
        "--test-connection",
        action="store_true",
        help=(
            "Verify dotenv loading, Futures Testnet endpoint configuration, "
            "public connectivity, and signed API authentication."
        ),
    )
    return parser


def main(argv: Sequence[str] | None = None) -> int:
    """Run the CLI application."""

    parser = build_parser()
    args = parser.parse_args(argv)
    logger = configure_logging()
    environment_diagnostics = load_environment(logger=logger)
    print_startup_diagnostic(environment_diagnostics)

    if args.test_connection:
        return run_connection_test(environment_diagnostics, logger)

    try:
        order = collect_order_request(args, logger)
    except KeyboardInterrupt:
        print("\nCancelled by user.")
        return 130
    except ValidationError as exc:
        _log_validation_failure(logger, exc.errors)
        print_validation_errors(exc.errors)
        return 2

    print_order_summary(order)

    try:
        client = BinanceFuturesClient.from_env(
            diagnostics=environment_diagnostics,
            logger=logger,
        )
        service = OrderService(client=client, logger=logger)
        result = service.place_order(order)
    except ConfigurationError as exc:
        logger.error(
            "Configuration failure",
            extra={"event": "cli.configuration_failure", "detail": str(exc)},
        )
        print_failure(str(exc))
        return 1
    except OrderExecutionError as exc:
        print_failure(str(exc))
        return 1
    except KeyboardInterrupt:
        print("\nCancelled by user.")
        return 130
    except Exception:
        logger.exception("Unhandled CLI exception", extra={"event": "cli.error"})
        print_failure(
            f"Unexpected failure. See {LOG_FILE.as_posix()} for details."
        )
        return 1

    print_order_response(result)
    print("\nOrder placed successfully.")
    return 0


def run_connection_test(
    environment_diagnostics: EnvironmentDiagnostics,
    logger: logging.Logger,
) -> int:
    """Run the Binance Futures Testnet connectivity check."""

    print("\n## CONNECTION TEST\n")

    try:
        client = BinanceFuturesClient.from_env(
            diagnostics=environment_diagnostics,
            logger=logger,
        )
        result = client.test_connection()
    except ConfigurationError as exc:
        logger.error(
            "Connection test configuration failure",
            extra={
                "event": "connection_test.configuration_failure",
                "detail": str(exc),
            },
        )
        print_connection_failure(str(exc))
        return 1
    except AuthenticationError as exc:
        logger.warning(
            "Connection test authentication failure",
            extra={
                "event": "connection_test.authentication_failure",
                "detail": str(exc),
            },
        )
        print_connection_failure(str(exc))
        return 1
    except Exception as exc:
        logger.exception(
            "Connection test failed",
            extra={"event": "connection_test.failure"},
        )
        print_connection_failure(
            "Unable to complete the Binance Futures Testnet connection test. "
            f"Reason: {exc}. See {LOG_FILE.as_posix()} for details."
        )
        return 1

    print_connection_test_result(result)
    print("\nConnection test successful.")
    return 0


def collect_order_request(
    args: argparse.Namespace,
    logger: logging.Logger,
) -> OrderRequest:
    """Return a validated order from arguments or interactive prompts."""

    if _requires_interactive_mode(args):
        print("Missing order details. Enter values below.")
        return prompt_for_order(args, logger)

    return validate_order_inputs(
        symbol=args.symbol,
        side=args.side,
        order_type=args.order_type,
        quantity=args.quantity,
        price=args.price,
    )


def prompt_for_order(
    args: argparse.Namespace,
    logger: logging.Logger,
) -> OrderRequest:
    """Prompt for missing or invalid values until the order is valid."""

    symbol = _prompt_field(
        prompt="Enter symbol: ",
        current=args.symbol,
        validator=normalize_symbol,
        logger=logger,
    )
    side = _prompt_field(
        prompt="Enter side (BUY/SELL): ",
        current=args.side,
        validator=normalize_side,
        logger=logger,
    )
    order_type = _prompt_field(
        prompt="Enter order type (MARKET/LIMIT): ",
        current=args.order_type,
        validator=normalize_order_type,
        logger=logger,
    )
    quantity = _prompt_field(
        prompt="Enter quantity: ",
        current=args.quantity,
        validator=lambda value: parse_positive_decimal(value, "quantity"),
        logger=logger,
    )

    price: Decimal | None = None
    if order_type == "LIMIT":
        price = _prompt_field(
            prompt="Enter price: ",
            current=args.price,
            validator=lambda value: parse_positive_decimal(value, "price"),
            logger=logger,
        )
    elif args.price is not None and str(args.price).strip():
        try:
            parse_positive_decimal(args.price, "price")
        except ValidationError as exc:
            _log_validation_failure(logger, exc.errors)
            print_validation_errors(exc.errors)
            price = None

    return validate_order_inputs(
        symbol=symbol,
        side=side,
        order_type=order_type,
        quantity=quantity,
        price=price,
    )


def print_order_summary(order: OrderRequest) -> None:
    """Print the order summary before submission."""

    print("\n## ORDER SUMMARY\n")
    print(f"Symbol: {order.symbol}")
    print(f"Side: {order.side}")
    print(f"Type: {order.order_type}")
    print(f"Quantity: {decimal_to_plain(order.quantity)}")
    price = decimal_to_plain(order.price) if order.price is not None else "N/A"
    print(f"Price: {price}")


def print_order_response(result: OrderResult) -> None:
    """Print the normalized Binance order response."""

    print("\n## ORDER RESPONSE\n")
    print(f"Order ID: {result.order_id}")
    print(f"Status: {result.status}")
    print(f"Executed Quantity: {result.executed_quantity}")
    print(f"Average Price: {result.average_price}")
    print(f"Client Order ID: {result.client_order_id}")


def print_startup_diagnostic(
    diagnostics: EnvironmentDiagnostics,
) -> None:
    """Print startup diagnostics without exposing credentials."""

    print("\n## STARTUP DIAGNOSTIC\n")
    print(f"API key loaded: {_yes_no(diagnostics.api_key_loaded)}")
    print(f"Secret loaded: {_yes_no(diagnostics.api_secret_loaded)}")
    print(f".env file found: {_yes_no(diagnostics.env_file_exists)}")
    print(f"dotenv loaded: {_yes_no(diagnostics.dotenv_loaded)}")
    print(f"API key source: {diagnostics.api_key_source}")
    print(f"Secret source: {diagnostics.api_secret_source}")


def print_connection_test_result(result: ConnectionTestResult) -> None:
    """Print a readable connection test report."""

    diagnostics = result.client_diagnostics
    print(f"Futures Testnet Base URL: {diagnostics.futures_testnet_base_url}")
    print(f"Futures API URL: {diagnostics.futures_api_url}")
    print(f"Futures ping endpoint: {diagnostics.futures_ping_endpoint}")
    print(f"Futures order endpoint: {diagnostics.futures_order_endpoint}")
    print(f"Spot API URL: {diagnostics.spot_api_url}")
    print(f"Testnet enabled: {_yes_no(diagnostics.testnet_enabled)}")
    print(
        "Using Futures Testnet: "
        f"{_yes_no(diagnostics.using_futures_testnet)}"
    )
    print(
        "Using Futures API endpoints: "
        f"{_yes_no(diagnostics.using_futures_endpoints)}"
    )
    print(
        "Public connectivity: "
        f"{_pass_fail(result.public_connectivity_ok)}"
        f" (HTTP {result.public_status_code})"
    )
    print(
        "Authentication status: "
        f"{_pass_fail(result.authenticated_ok)}"
        f" (HTTP {result.authenticated_status_code})"
    )
    print(f"Server time: {result.server_time or 'N/A'}")
    print(f"Balance assets returned: {result.balance_asset_count or 0}")


def print_validation_errors(errors: list[str]) -> None:
    """Display validation errors without exposing implementation details."""

    print("\nOrder validation failed:")
    for error in errors:
        print(f"- {error}")


def print_failure(message: str) -> None:
    """Print a safe failure message."""

    print(f"\nOrder failed: {message}")


def print_connection_failure(message: str) -> None:
    """Print a safe connection test failure message."""

    print(f"Connection test failed: {message}")


def _requires_interactive_mode(args: argparse.Namespace) -> bool:
    """Return true when required command-line arguments are missing."""

    required_values = [args.symbol, args.side, args.order_type, args.quantity]
    if any(value is None or not str(value).strip() for value in required_values):
        return True

    if str(args.order_type).strip().upper() == "LIMIT":
        return args.price is None or not str(args.price).strip()

    return False


def _prompt_field(
    *,
    prompt: str,
    current: Any,
    validator: Callable[[Any], T],
    logger: logging.Logger,
) -> T:
    """Validate an existing value or prompt until a valid one is entered."""

    value = current
    while True:
        if value is None or not str(value).strip():
            value = input(prompt)

        try:
            return validator(value)
        except ValidationError as exc:
            _log_validation_failure(logger, exc.errors)
            print_validation_errors(exc.errors)
            value = None


def _log_validation_failure(logger: logging.Logger, errors: list[str]) -> None:
    """Log validation failures in a consistent structured shape."""

    logger.warning(
        "Order validation failed",
        extra={"event": "validation.failure", "errors": errors},
    )


def _yes_no(value: bool) -> str:
    """Return YES or NO for user-facing diagnostics."""

    return "YES" if value else "NO"


def _pass_fail(value: bool) -> str:
    """Return PASS or FAIL for user-facing diagnostics."""

    return "PASS" if value else "FAIL"


if __name__ == "__main__":
    sys.exit(main())
