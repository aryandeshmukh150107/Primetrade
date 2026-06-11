import { OrderFormData } from '../types';

interface OrderSummaryCardProps {
  formData: OrderFormData;
  marketPrice?: number | null;
}

export default function OrderSummaryCard({ formData, marketPrice }: OrderSummaryCardProps) {
  const isLimit = formData.orderType === 'LIMIT';

  // Format estimated value
  let estValue = null;
  if (formData.quantity && !isNaN(Number(formData.quantity))) {
    const qty = parseFloat(formData.quantity);
    if (isLimit && formData.price && !isNaN(Number(formData.price))) {
      estValue = (parseFloat(formData.price) * qty).toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
    } else if (!isLimit && marketPrice) {
      estValue = (marketPrice * qty).toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
    }
  }

  return (
    <div className="trade-card" id="order-summary-card">
      <div className="trade-card-header">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-trade-text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
          </svg>
          <h2 className="text-xs font-bold text-trade-text uppercase tracking-wider">Order Summary</h2>
        </div>
      </div>
      
      <div className="trade-card-body p-0">
        <table className="w-full text-xs">
          <tbody>
            {/* Symbol Row */}
            <tr className="border-b border-trade-border hover:bg-trade-bg/10 transition-colors duration-100">
              <td className="py-2.5 px-4 font-semibold text-trade-text-secondary">Symbol</td>
              <td className="py-2.5 px-4 text-right">
                <span className="px-2 py-0.5 rounded bg-trade-accent/5 text-trade-accent font-bold tracking-wide border border-trade-accent/10">
                  {formData.symbol || '—'}
                </span>
              </td>
            </tr>

            {/* Side Row */}
            <tr className="border-b border-trade-border hover:bg-trade-bg/10 transition-colors duration-100">
              <td className="py-2.5 px-4 font-semibold text-trade-text-secondary">Side</td>
              <td className="py-2.5 px-4 text-right">
                <span
                  className={`trade-badge ${
                    formData.side === 'BUY'
                      ? 'bg-trade-buy-light text-trade-buy border border-trade-buy/10'
                      : 'bg-trade-sell-light text-trade-sell border border-trade-sell/10'
                  }`}
                >
                  {formData.side}
                </span>
              </td>
            </tr>

            {/* Type Row */}
            <tr className="border-b border-trade-border hover:bg-trade-bg/10 transition-colors duration-100">
              <td className="py-2.5 px-4 font-semibold text-trade-text-secondary">Order Type</td>
              <td className="py-2.5 px-4 text-right font-bold text-trade-text">
                {formData.orderType}
              </td>
            </tr>

            {/* Quantity Row */}
            <tr className="border-b border-trade-border hover:bg-trade-bg/10 transition-colors duration-100">
              <td className="py-2.5 px-4 font-semibold text-trade-text-secondary">Quantity</td>
              <td className="py-2.5 px-4 text-right font-extrabold text-trade-text text-[13px]">
                {formData.quantity || '—'}
              </td>
            </tr>

            {/* Price Row (if Limit) */}
            {isLimit && (
              <tr className="border-b border-trade-border hover:bg-trade-bg/10 transition-colors duration-100">
                <td className="py-2.5 px-4 font-semibold text-trade-text-secondary">Limit Price</td>
                <td className="py-2.5 px-4 text-right font-extrabold text-trade-text text-[13px]">
                  {formData.price ? `${parseFloat(formData.price).toLocaleString()} USDT` : '—'}
                </td>
              </tr>
            )}

            {/* Est Value Row */}
            <tr className="hover:bg-trade-bg/10 transition-colors duration-100">
              <td className="py-3 px-4 font-semibold text-trade-text-secondary">Est. Total Value</td>
              <td className="py-3 px-4 text-right">
                {estValue ? (
                  <span className="px-2 py-1 rounded bg-trade-accent-light text-trade-accent font-extrabold text-[13px] border border-trade-accent/10">
                    {estValue} USDT
                  </span>
                ) : !isLimit && formData.quantity ? (
                  <span className="text-trade-text-muted font-medium italic">
                    Market Price Execution
                  </span>
                ) : (
                  <span className="text-trade-text-light font-medium">—</span>
                )}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
