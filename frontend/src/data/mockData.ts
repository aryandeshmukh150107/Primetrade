import { OrderResponse, LogEntry } from '../types';

export const mockOrderResponse: OrderResponse = {
  orderId: 283946271,
  symbol: 'BTCUSDT',
  status: 'FILLED',
  clientOrderId: 'x-HNA2TXFJ-1718145678901',
  price: '0.00000000',
  avgPrice: '104235.50000000',
  origQty: '0.001',
  executedQty: '0.001',
  type: 'MARKET',
  side: 'BUY',
  transactTime: Date.now(),
};

export const mockLimitOrderResponse: OrderResponse = {
  orderId: 283946285,
  symbol: 'ETHUSDT',
  status: 'NEW',
  clientOrderId: 'x-HNA2TXFJ-1718145679102',
  price: '3450.00000000',
  avgPrice: '0.00000000',
  origQty: '0.05',
  executedQty: '0.00',
  type: 'LIMIT',
  side: 'SELL',
  transactTime: Date.now(),
};

export const mockInitialLogs: LogEntry[] = [
  {
    id: 'log-1',
    timestamp: new Date(Date.now() - 120000),
    level: 'info',
    message: 'Trading bot initialized. Connecting to Testnet...',
  },
  {
    id: 'log-2',
    timestamp: new Date(Date.now() - 115000),
    level: 'success',
    message: 'Successfully connected to wss://testnet.binancefuture.com',
  },
  {
    id: 'log-3',
    timestamp: new Date(Date.now() - 90000),
    level: 'info',
    message: 'API credentials validated. Account balance: 10,000.00 USDT',
  },
  {
    id: 'log-4',
    timestamp: new Date(Date.now() - 60000),
    level: 'info',
    message: 'Subscribing to BTCUSDT order book stream...',
  },
  {
    id: 'log-5',
    timestamp: new Date(Date.now() - 45000),
    level: 'success',
    message: 'Order book stream active. Receiving real-time updates.',
  },
  {
    id: 'log-6',
    timestamp: new Date(Date.now() - 30000),
    level: 'warning',
    message: 'Rate limit: 847/1200 requests used in current window.',
  },
  {
    id: 'log-7',
    timestamp: new Date(Date.now() - 15000),
    level: 'info',
    message: 'Awaiting order submission from dashboard...',
  },
];

export function generateOrderId(): number {
  return Math.floor(Math.random() * 900000000) + 100000000;
}

export function generateClientOrderId(): string {
  return `x-HNA2TXFJ-${Date.now()}`;
}

export function simulateOrderResponse(
  symbol: string,
  side: string,
  orderType: string,
  quantity: string,
  price: string
): OrderResponse {
  const isMarket = orderType === 'MARKET';
  const mockPrice = isMarket
    ? symbol.includes('BTC')
      ? '104235.50'
      : symbol.includes('ETH')
      ? '3892.75'
      : '172.30'
    : price;

  return {
    orderId: generateOrderId(),
    symbol,
    status: isMarket ? 'FILLED' : 'NEW',
    clientOrderId: generateClientOrderId(),
    price: isMarket ? '0.00000000' : parseFloat(price).toFixed(8),
    avgPrice: isMarket ? `${mockPrice}00000` : '0.00000000',
    origQty: quantity,
    executedQty: isMarket ? quantity : '0.00',
    type: orderType,
    side,
    transactTime: Date.now(),
  };
}
