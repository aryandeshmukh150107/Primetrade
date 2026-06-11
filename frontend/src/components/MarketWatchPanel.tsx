import { useState, useEffect } from 'react';

interface TickerData {
  symbol: string;
  lastPrice: string;
  priceChangePercent: string;
}

export default function MarketWatchPanel() {
  const [tickers, setTickers] = useState<Record<string, TickerData | null>>({
    BTCUSDT: null,
    ETHUSDT: null,
  });
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    let isMounted = true;
    
    const fetchPrices = async () => {
      try {
        const response = await fetch('https://fapi.binance.com/fapi/v1/ticker/24hr?symbols=["BTCUSDT","ETHUSDT"]');
        if (!response.ok) throw new Error('API Error');
        const data: TickerData[] = await response.json();
        
        if (isMounted) {
          const newTickers = { ...tickers };
          data.forEach(t => {
            if (t.symbol === 'BTCUSDT' || t.symbol === 'ETHUSDT') {
              newTickers[t.symbol] = t;
            }
          });
          setTickers(newTickers);
          setHasError(false);
        }
      } catch (err) {
        if (isMounted) {
          setHasError(true);
        }
      }
    };

    fetchPrices();
    const interval = setInterval(fetchPrices, 5000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  const renderTicker = (symbol: string) => {
    const data = tickers[symbol];
    if (hasError || !data) {
      return (
        <div className="flex justify-between items-center py-2.5 border-b border-trade-border/50 last:border-0">
          <span className="font-bold text-xs text-trade-text">{symbol}</span>
          <span className="text-[10px] font-medium text-trade-text-muted bg-trade-bg px-2 py-0.5 rounded border border-trade-border/50">Data unavailable</span>
        </div>
      );
    }

    const price = parseFloat(data.lastPrice);
    const percent = parseFloat(data.priceChangePercent);
    const isPositive = percent >= 0;
    const colorClass = isPositive ? 'text-trade-buy' : 'text-trade-sell';
    
    return (
      <div className="flex justify-between items-center py-2.5 border-b border-trade-border/50 last:border-0 group cursor-default">
        <span className="font-bold text-xs text-trade-text group-hover:text-trade-accent transition-colors">{symbol}</span>
        <div className="text-right">
          <div className={`font-mono font-bold text-[13px] ${colorClass}`}>
            {price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className={`flex items-center justify-end gap-0.5 text-[10px] font-bold mt-0.5 ${colorClass}`}>
            {isPositive ? (
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
              </svg>
            ) : (
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            )}
            {isPositive ? '+' : ''}{percent.toFixed(2)}%
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="trade-card flex flex-col shadow-sm" id="market-watch-panel">
      <div className="trade-card-header">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-trade-text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
          </svg>
          <h2 className="text-xs font-bold text-trade-text uppercase tracking-wider">Market Watch</h2>
        </div>
        <div className="flex items-center gap-1.5" title={hasError ? "Disconnected from market feed" : "Live data feed active"}>
          <span className="relative flex h-2 w-2">
            {!hasError && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-trade-buy opacity-75"></span>}
            <span className={`relative inline-flex rounded-full h-2 w-2 ${hasError ? 'bg-trade-text-muted' : 'bg-trade-buy'}`}></span>
          </span>
          <span className="text-[9px] font-bold text-trade-text-secondary uppercase">Live</span>
        </div>
      </div>
      <div className="trade-card-body px-5 py-1.5 flex flex-col justify-center">
        {renderTicker('BTCUSDT')}
        {renderTicker('ETHUSDT')}
      </div>
    </div>
  );
}
