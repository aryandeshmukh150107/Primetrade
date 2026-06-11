# Primetrade Assignment by Aryan

## Overview

This project is a Python-based Binance Futures Testnet Trading Bot developed as part of the internship assignment.

The application allows users to place MARKET and LIMIT orders on Binance USDT-M Futures Testnet through a CLI interface. It includes input validation, logging, and error handling.

## Features

* Place MARKET orders
* Place LIMIT orders
* BUY and SELL support
* CLI-based user input
* Input validation
* Binance Futures Testnet integration
* API request/response logging
* Error handling for API, validation, and network issues
* Connection testing utility

## Project Structure

trading_bot/
│
├── bot/
│   ├── client.py
│   ├── orders.py
│   ├── validators.py
│   └── logging_config.py
│
├── logs/
├── cli.py
├── requirements.txt
└── README.md


## Setup

### 1. Create Virtual Environment

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
```

### 2. Install Dependencies

```powershell
pip install -r requirements.txt
```

### 3. Configure API Keys

Create a `.env` file:

```env
BINANCE_API_KEY=your_testnet_api_key
BINANCE_API_SECRET=your_testnet_api_secret
```

## Binance Futures Testnet

Base URL:

```text
https://testnet.binancefuture.com
```

Generate API credentials from Binance Futures Testnet and add them to the `.env` file.

## Usage

### Test Connection

```powershell
python cli.py --test-connection
```

### Market Order

```powershell
python cli.py --symbol BTCUSDT --side BUY --type MARKET --quantity 0.01
```

### Limit Order

```powershell
python cli.py --symbol BTCUSDT --side SELL --type LIMIT --quantity 0.01 --price 100000
```

## Example Output

```text
Order ID: 123456789
Status: FILLED
Executed Quantity: 0.01
Average Price: 100245.50

Order placed successfully.
```

## Logging

Application logs are stored in:

```text
logs/app.log
```

Logs include:

* API requests
* API responses
* Errors and exceptions

## Validation

The application validates:

* Symbol
* Side (BUY/SELL)
* Order Type (MARKET/LIMIT)
* Quantity
* Price (required for LIMIT orders)

## Assumptions

* One order is placed per execution.
* Testnet credentials are used.
* LIMIT orders use GTC (Good Till Cancelled).

## Author

Aryan Deshmukh
