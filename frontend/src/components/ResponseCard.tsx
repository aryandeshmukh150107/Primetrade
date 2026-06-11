import { OrderResponse } from '../types';

interface ResponseCardProps {
  response: OrderResponse | null;
}

export default function ResponseCard({ response }: ResponseCardProps) {
  if (!response) {
    return (
      <div className="trade-card h-full flex flex-col justify-between" id="response-card">
        <div className="trade-card-header">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-trade-text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h2 className="text-xs font-bold text-trade-text uppercase tracking-wider">Last Execution</h2>
          </div>
        </div>
        <div className="trade-card-body flex-1 flex flex-col items-center justify-center py-10 text-center select-none">
          <div className="w-12 h-12 rounded-full bg-trade-bg flex items-center justify-center text-trade-text-muted mb-3 border border-trade-border">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 3.75H6A2.25 2.25 0 003.75 6v1.5M16.5 3.75H18A2.25 2.25 0 0120.25 6v1.5m0 9V18a2.25 2.25 0 01-2.25 2.25h-1.5m-9 0H6A2.25 2.25 0 013.75 18v-1.5M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <p className="text-xs font-bold text-trade-text-secondary uppercase tracking-wide">No Orders Placed Yet</p>
          <p className="text-[11px] text-trade-text-muted max-w-[200px] mt-1 leading-relaxed">
            Submit an order from the entry panel on the left to see transaction details.
          </p>
        </div>
      </div>
    );
  }

  const isFilled = response.status === 'FILLED';
  const isNew = response.status === 'NEW';
  
  // Dynamic status styling
  const statusConfig = isFilled
    ? {
        borderClass: 'border-l-4 border-l-trade-buy bg-trade-buy/[0.01]',
        badgeClass: 'bg-trade-buy-light text-trade-buy border border-trade-buy/10',
      }
    : isNew
    ? {
        borderClass: 'border-l-4 border-l-trade-accent bg-trade-accent/[0.01]',
        badgeClass: 'bg-trade-accent-light text-trade-accent border border-trade-accent/10',
      }
    : {
        borderClass: 'border-l-4 border-l-trade-orange bg-trade-orange/[0.01]',
        badgeClass: 'bg-trade-orange-light text-trade-orange border border-trade-orange/10',
      };

  const formattedAvgPrice = parseFloat(response.avgPrice) > 0
    ? parseFloat(response.avgPrice).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })
    : '—';

  const orderValue = parseFloat(response.avgPrice) > 0 && parseFloat(response.executedQty) > 0
    ? (parseFloat(response.avgPrice) * parseFloat(response.executedQty)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : parseFloat(response.price) > 0 && parseFloat(response.origQty) > 0
    ? (parseFloat(response.price) * parseFloat(response.origQty)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : '—';

  return (
    <div className={`trade-card animate-fade-in ${statusConfig.borderClass}`} id="response-card">
      <div className="trade-card-header">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-trade-text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h2 className="text-xs font-bold text-trade-text uppercase tracking-wider">Last Order Execution</h2>
        </div>
        <span className={`trade-badge ${statusConfig.badgeClass}`}>{response.status}</span>
      </div>

      <div className="trade-card-body space-y-4">
        {/* Important Numbers Layout */}
        <div className="grid grid-cols-3 gap-2 p-3 bg-trade-bg/40 rounded-lg border border-trade-border">
          {/* Average Price */}
          <div className="text-center">
            <span className="block text-[9px] font-bold text-trade-text-secondary uppercase tracking-widest mb-1 select-none">
              Avg. Price
            </span>
            <span className="text-sm sm:text-base font-extrabold text-trade-text font-mono truncate block">
              {formattedAvgPrice}
            </span>
            <span className="text-[9px] text-trade-text-light font-bold">USDT</span>
          </div>

          {/* Executed Qty */}
          <div className="text-center border-x border-trade-border">
            <span className="block text-[9px] font-bold text-trade-text-secondary uppercase tracking-widest mb-1 select-none">
              Filled Qty
            </span>
            <span className="text-sm sm:text-base font-extrabold text-trade-text font-mono truncate block">
              {parseFloat(response.executedQty)} / {parseFloat(response.origQty)}
            </span>
            <span className="text-[9px] text-trade-text-light font-bold uppercase">
              {response.symbol.endsWith('USDT') ? response.symbol.slice(0, -4) : 'QTY'}
            </span>
          </div>

          {/* Order Value */}
          <div className="text-center">
            <span className="block text-[9px] font-bold text-trade-text-secondary uppercase tracking-widest mb-1 select-none">
              Est. Value
            </span>
            <span className={`text-sm sm:text-base font-extrabold font-mono truncate block ${isFilled ? 'text-trade-buy' : 'text-trade-accent'}`}>
              {orderValue}
            </span>
            <span className="text-[9px] text-trade-text-light font-bold">USDT</span>
          </div>
        </div>

        {/* Detailed Rows */}
        <table className="w-full text-xs">
          <tbody>
            <tr className="border-b border-trade-border py-1.5 hover:bg-trade-bg/10 transition-colors duration-100">
              <td className="py-2 px-2 text-trade-text-secondary">Order ID</td>
              <td className="py-2 px-2 text-right font-mono font-medium text-trade-text select-all">
                {response.orderId}
              </td>
            </tr>
            <tr className="border-b border-trade-border py-1.5 hover:bg-trade-bg/10 transition-colors duration-100">
              <td className="py-2 px-2 text-trade-text-secondary">Client Order ID</td>
              <td className="py-2 px-2 text-right font-mono text-[11px] text-trade-text truncate max-w-[180px] select-all" title={response.clientOrderId}>
                {response.clientOrderId}
              </td>
            </tr>
            <tr className="border-b border-trade-border py-1.5 hover:bg-trade-bg/10 transition-colors duration-100">
              <td className="py-2 px-2 text-trade-text-secondary">Symbol</td>
              <td className="py-2 px-2 text-right font-bold text-trade-text">{response.symbol}</td>
            </tr>
            <tr className="border-b border-trade-border py-1.5 hover:bg-trade-bg/10 transition-colors duration-100">
              <td className="py-2 px-2 text-trade-text-secondary">Side / Type</td>
              <td className="py-2 px-2 text-right font-bold text-trade-text flex items-center justify-end gap-1.5">
                <span className={response.side === 'BUY' ? 'text-trade-buy' : 'text-trade-sell'}>{response.side}</span>
                <span className="text-trade-text-light">/</span>
                <span>{response.type}</span>
              </td>
            </tr>
            <tr className="hover:bg-trade-bg/10 transition-colors duration-100">
              <td className="py-2 px-2 text-trade-text-secondary">Execution Time</td>
              <td className="py-2 px-2 text-right font-mono text-trade-text-secondary">
                {new Date(response.transactTime).toLocaleTimeString('en-US', { hour12: false })}.{response.transactTime % 1000}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
