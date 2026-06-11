"""Application logging setup."""

from __future__ import annotations

import json
import logging
from logging.handlers import RotatingFileHandler
from pathlib import Path
from typing import Any


PROJECT_ROOT = Path(__file__).resolve().parents[1]
LOG_DIR = PROJECT_ROOT / "logs"
LOG_FILE = LOG_DIR / "app.log"

_RESERVED_RECORD_KEYS = set(
    logging.LogRecord(
        name="",
        level=0,
        pathname="",
        lineno=0,
        msg="",
        args=(),
        exc_info=None,
    ).__dict__
)


class JsonLogFormatter(logging.Formatter):
    """Format log records as one readable JSON object per line."""

    def format(self, record: logging.LogRecord) -> str:
        payload: dict[str, Any] = {
            "timestamp": self.formatTime(record, self.datefmt),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
        }

        for key, value in record.__dict__.items():
            if key not in _RESERVED_RECORD_KEYS and not key.startswith("_"):
                payload[key] = value

        if record.exc_info:
            payload["exception"] = self.formatException(record.exc_info)

        return json.dumps(payload, default=str, ensure_ascii=True)


def configure_logging(log_file: Path = LOG_FILE) -> logging.Logger:
    """Configure and return the application logger."""

    log_file.parent.mkdir(parents=True, exist_ok=True)

    logger = logging.getLogger("trading_bot")
    logger.setLevel(logging.INFO)
    logger.propagate = False

    resolved_log_file = str(log_file.resolve())
    existing_handler = next(
        (
            handler
            for handler in logger.handlers
            if isinstance(handler, RotatingFileHandler)
            and handler.baseFilename == resolved_log_file
        ),
        None,
    )

    if existing_handler is None:
        handler = RotatingFileHandler(
            resolved_log_file,
            maxBytes=1_000_000,
            backupCount=3,
            encoding="utf-8",
        )
        formatter = JsonLogFormatter(datefmt="%Y-%m-%dT%H:%M:%S%z")
        handler.setFormatter(formatter)
        logger.addHandler(handler)

    return logger
