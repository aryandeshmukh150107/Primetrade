import { OrderResponse } from '../types';

interface OrderHistoryCardProps {
  history: OrderResponse[];
}

export default function OrderHistoryCard({ history }: OrderHistoryCardProps) {
  const statusBadgeStyle = (status: string) => {
    switch (status) {
      case 'FILLED':
        return 'bg-trade-buy-light text-trade-buy border-trade-buy/10';
      case 'NEW':
        return 'bg-trade-accent-light text-trade-accent border-trade-accent/10';
      case 'CANCELED':
      case 'REJECTED':
        return 'bg-trade-sell-light text-trade-sell border-trade-sell/10';
      default:
        return 'bg-trade-orange-light text-trade-orange border-trade-orange/10';
    }
  };

  const formatTime = (dateNum: number) => {
    return new Date(dateNum).toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  return (
    <div className="trade-card flex-1 flex flex-col overflow-hidden min-h-0" id="order-history-card">
      <div className="trade-card-header">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-trade-text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h2 className="text-xs font-bold text-trade-text uppercase tracking-wider">Order History</h2>
        </div>
        <span className="px-2 py-0.5 rounded bg-trade-bg border border-trade-border text-[10px] font-bold text-trade-text-secondary">
          {history.length} Orders
        </span>
      </div>

      <div className="overflow-y-auto flex-1 p-0">
        {history.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-trade-text-secondary select-none p-6 text-center">
            <svg className="w-8 h-8 text-trade-text-muted mb-2 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            <span className="text-[11px] uppercase tracking-wider font-semibold">No Order History</span>
          </div>
        ) : (
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-trade-surface/95 backdrop-blur z-10">
              <tr className="border-b border-trade-border text-[10px] text-trade-text-secondary text-left select-none uppercase tracking-wider">
                <th className="py-2 px-4 font-semibold">Time</th>
                <th className="py-2 px-3 font-semibold">Symbol</th>
                <th className="py-2 px-3 font-semibold">Side</th>
                <th className="py-2 px-3 font-semibold">Type</th>
                <th className="py-2 px-3 font-semibold text-right">Quantity</th>
                <th className="py-2 px-3 font-semibold text-right">Price</th>
                <th className="py-2 px-4 font-semibold text-right">Status</th>
              </tr>
            </thead>
            <tbody>
              {history.map((order, index) => (
                <tr 
                  key={order.orderId} 
                  className={`border-b border-trade-border/50 last:border-0 hover:bg-trade-bg/40 transition-colors duration-100 ${
                    index === 0 ? 'animate-fade-in' : ''
                  }`}
                >
                  <td className="py-2.5 px-4 text-trade-text-secondary font-mono text-[11px] whitespace-nowrap">
                    {formatTime(order.transactTime)}
                  </td>
                  <td className="py-2.5 px-3 font-bold text-trade-text whitespace-nowrap">
                    {order.symbol}
                  </td>
                  <td className="py-2.5 px-3 font-semibold whitespace-nowrap">
                    <span className={order.side === 'BUY' ? 'text-trade-buy' : 'text-trade-sell'}>
                      {order.side}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 font-medium text-trade-text-secondary whitespace-nowrap">
                    {order.type}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-trade-text">
                    {order.origQty}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-trade-text">
                    {parseFloat(order.price) > 0 
                      ? parseFloat(order.price).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 }) 
                      : (parseFloat(order.avgPrice) > 0 
                          ? parseFloat(order.avgPrice).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })
                          : 'Market')}
                  </td>
                  <td className="py-2.5 px-4 text-right whitespace-nowrap">
                    <span className={`inline-flex px-1.5 py-0.5 rounded text-[9px] font-bold border ${statusBadgeStyle(order.status)}`}>
                      {order.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
