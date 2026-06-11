import { useState, useCallback, useEffect } from 'react';
import Header from './components/Header';
import OrderEntryPanel from './components/OrderEntryPanel';
import OrderSummaryCard from './components/OrderSummaryCard';
import ResponseCard from './components/ResponseCard';
import OrderHistoryCard from './components/OrderHistoryCard';
import LogsPanel from './components/LogsPanel';
import ToastContainer from './components/ToastContainer';
import ConnectionModal from './components/ConnectionModal';
import MarketWatchPanel from './components/MarketWatchPanel';
import { OrderFormData, OrderResponse, LogEntry, Toast, ConnectionStatus } from './types';
import { simulateOrderResponse, mockInitialLogs } from './data/mockData';

function App() {
  // Connection state
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [isConnectionModalOpen, setIsConnectionModalOpen] = useState(false);

  useEffect(() => {
    if (connectionStatus === 'connected') {
      setIsConnectionModalOpen(false);
    }
  }, [connectionStatus]);

  // Order form state
  const [formData, setFormData] = useState<OrderFormData>({
    symbol: 'BTCUSDT',
    side: 'BUY',
    orderType: 'MARKET',
    quantity: '',
    price: '',
  });
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Response state
  const [orderResponse, setOrderResponse] = useState<OrderResponse | null>(null);
  const [orderHistory, setOrderHistory] = useState<OrderResponse[]>([]);

  // Market Price Mock
  const [marketPrices] = useState<Record<string, number>>({
    'BTCUSDT': 65432.10,
    'ETHUSDT': 3456.78,
    'BNBUSDT': 601.25,
    'SOLUSDT': 145.50,
  });
  const currentMarketPrice = marketPrices[formData.symbol] || null;

  // Logs state
  const [logs, setLogs] = useState<LogEntry[]>(mockInitialLogs);

  // Toast state
  const [toasts, setToasts] = useState<Toast[]>([]);

  // Helpers
  const addLog = useCallback((level: LogEntry['level'], message: string) => {
    setLogs((prev) => [
      ...prev,
      {
        id: `log-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        timestamp: new Date(),
        level,
        message,
      },
    ]);
  }, []);

  const addToast = useCallback((type: Toast['type'], title: string, message: string) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    setToasts((prev) => [...prev, { id, type, title, message }]);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Handlers
  const handleTestConnection = useCallback(async () => {
    setIsTestingConnection(true);
    setConnectionStatus('connecting');
    addLog('info', 'Testing connection to Testnet...');

    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1500));
      
      setConnectionStatus('connected');
      addLog('success', 'Connection established successfully. Testnet API is reachable.');
      addToast('success', 'Connected', 'Successfully connected to Testnet.');
    } catch (err) {
      setConnectionStatus('disconnected');
      addLog('error', 'Connection failed. Unable to reach Testnet.');
      addToast('error', 'Connection Failed', 'Could not connect to the API.');
    } finally {
      setIsTestingConnection(false);
    }
  }, [addLog, addToast]);

  // --- Validation logic ---
  const SYMBOL_REGEX = /^[A-Z0-9]+USDT$/;

  const validateField = useCallback(
    (field: string, value: string, currentForm: OrderFormData): string | null => {
      switch (field) {
        case 'symbol': {
          const v = value.trim();
          if (!v) return 'Symbol is required';
          if (!/^[A-Z0-9]+$/.test(v)) return 'Only uppercase letters and numbers allowed';
          if (!SYMBOL_REGEX.test(v)) return 'Symbol must end with USDT (e.g. BTCUSDT)';
          return null;
        }
        case 'quantity': {
          if (!value) return 'Quantity is required';
          if (isNaN(Number(value))) return 'Quantity must be a number';
          if (Number(value) <= 0) return 'Quantity must be greater than 0';
          return null;
        }
        case 'price': {
          if (currentForm.orderType !== 'LIMIT') return null;
          if (!value) return 'Price is required for limit orders';
          if (isNaN(Number(value))) return 'Price must be a number';
          if (Number(value) <= 0) return 'Price must be greater than 0';
          return null;
        }
        case 'side': {
          if (value !== 'BUY' && value !== 'SELL') return 'Side must be BUY or SELL';
          return null;
        }
        case 'orderType': {
          if (value !== 'MARKET' && value !== 'LIMIT') return 'Order type must be MARKET or LIMIT';
          return null;
        }
        default:
          return null;
      }
    },
    [],
  );

  const runFullValidation = useCallback(
    (form: OrderFormData): Record<string, string> => {
      const errors: Record<string, string> = {};
      const fields: (keyof OrderFormData)[] = ['symbol', 'quantity', 'side', 'orderType'];
      if (form.orderType === 'LIMIT') fields.push('price');

      for (const field of fields) {
        const err = validateField(field, form[field], form);
        if (err) errors[field] = err;
      }
      return errors;
    },
    [validateField],
  );

  const handleFormChange = useCallback(
    (data: Partial<OrderFormData>) => {
      setFormData((prev) => {
        const next = { ...prev, ...data };

        // Re-validate all touched / changed fields + dependent fields
        setValidationErrors((prevErrors) => {
          const updated = { ...prevErrors };

          // Validate each changed field
          for (const key of Object.keys(data) as (keyof OrderFormData)[]) {
            const err = validateField(key, next[key], next);
            if (err) {
              updated[key] = err;
            } else {
              delete updated[key];
            }
          }

          // If orderType changed, re-validate price
          if ('orderType' in data) {
            if (next.orderType === 'LIMIT') {
              const priceErr = validateField('price', next.price, next);
              if (priceErr) updated.price = priceErr;
              else delete updated.price;
            } else {
              delete updated.price;
            }
          }

          return updated;
        });

        return next;
      });
    },
    [validateField],
  );

  // Removed isFormValid since disabled state no longer relies on it

  const validateForm = useCallback((): boolean => {
    const errors = runFullValidation(formData);
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  }, [formData, runFullValidation]);

  const handlePlaceOrder = useCallback(async () => {
    if (connectionStatus !== 'connected') {
      setIsConnectionModalOpen(true);
      return;
    }

    if (!validateForm()) {
      addToast('error', 'Validation Error', 'Please fix the form errors before submitting.');
      addLog('error', 'Order validation failed. Check form inputs.');
      return;
    }

    setIsSubmitting(true);
    addLog(
      'info',
      `Submitting ${formData.side} ${formData.orderType} order: ${formData.quantity} ${formData.symbol}${
        formData.orderType === 'LIMIT' ? ` @ ${formData.price}` : ' @ Market'
      }`
    );

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1200));

    const response = simulateOrderResponse(
      formData.symbol,
      formData.side,
      formData.orderType,
      formData.quantity,
      formData.price
    );

    setOrderResponse(response);
    setOrderHistory((prev) => [response, ...prev]);
    setIsSubmitting(false);

    if (response.status === 'FILLED') {
      addLog(
        'success',
        `Order ${response.orderId} FILLED: ${response.executedQty} ${response.symbol} @ ${parseFloat(response.avgPrice).toLocaleString()}`
      );
      addToast(
        'success',
        'Order Filled',
        `${response.side} ${response.executedQty} ${response.symbol} executed at ${parseFloat(response.avgPrice).toLocaleString()} USDT`
      );
    } else {
      addLog(
        'info',
        `Order ${response.orderId} placed with status: ${response.status}. Limit price: ${response.price}`
      );
      addToast(
        'info',
        'Order Placed',
        `${response.side} LIMIT order for ${response.origQty} ${response.symbol} at ${parseFloat(response.price).toLocaleString()} USDT`
      );
    }
  }, [formData, connectionStatus, validateForm, addLog, addToast]);

  return (
    <div className="h-screen bg-trade-bg flex flex-col overflow-hidden">
      <Header
        connectionStatus={connectionStatus}
        onTestConnection={handleTestConnection}
        isTestingConnection={isTestingConnection}
      />

      <main className="flex-1 max-w-[1600px] w-full mx-auto px-4 sm:px-6 py-4 overflow-hidden flex flex-col min-h-0">
        {/* Three-column layout */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 h-full min-h-0">
          {/* Left Column: Order Entry & Market Watch */}
          <div className="lg:col-span-3 h-full flex flex-col gap-4 overflow-y-auto pr-1 min-h-0">
            <OrderEntryPanel
              formData={formData}
              onFormChange={handleFormChange}
              onSubmit={handlePlaceOrder}
              isSubmitting={isSubmitting}
              validationErrors={validationErrors}
              isConnected={connectionStatus === 'connected'}
            />
            <MarketWatchPanel />
          </div>

          {/* Center Workspace: Order Summary and Response */}
          <div className="lg:col-span-5 h-full overflow-y-auto space-y-4 pr-1">
            <OrderSummaryCard formData={formData} marketPrice={currentMarketPrice} />
            <ResponseCard response={orderResponse} />
          </div>

          {/* Right Panel: Activity Logs & Order History */}
          <div className="lg:col-span-4 h-full flex flex-col gap-4 min-h-0">
            <LogsPanel logs={logs} />
            <OrderHistoryCard history={orderHistory} />
          </div>
        </div>
      </main>

      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      {/* Connection Modal */}
      <ConnectionModal
        isOpen={isConnectionModalOpen}
        onClose={() => setIsConnectionModalOpen(false)}
        onConnect={() => {
          handleTestConnection().then(() => {
            // Modal will close automatically via useEffect if connection succeeds
          });
        }}
        isConnecting={isTestingConnection}
      />
    </div>
  );
}

export default App;
