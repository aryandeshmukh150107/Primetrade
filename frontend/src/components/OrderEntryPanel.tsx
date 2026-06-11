import { OrderFormData, OrderSide, OrderType } from '../types';

interface OrderEntryPanelProps {
  formData: OrderFormData;
  onFormChange: (data: Partial<OrderFormData>) => void;
  onSubmit: () => void;
  isSubmitting: boolean;
  validationErrors: Record<string, string>;
  isConnected: boolean;
}

export default function OrderEntryPanel({
  formData,
  onFormChange,
  onSubmit,
  isSubmitting,
  validationErrors,
  isConnected,
}: OrderEntryPanelProps) {
  const sides: OrderSide[] = ['BUY', 'SELL'];
  const orderTypes: OrderType[] = ['MARKET', 'LIMIT'];
  const isLimit = formData.orderType === 'LIMIT';
  const isDisabled = isSubmitting;

  // Extract base currency suffix (e.g. "BTC" from "BTCUSDT")
  const baseAsset = formData.symbol.endsWith('USDT') 
    ? formData.symbol.slice(0, -4) 
    : formData.symbol;

  return (
    <div className="trade-card flex flex-col" id="order-entry-panel">
      {/* Tab Header */}
      <div className="flex border-b border-trade-border">
        {sides.map((side) => (
          <button
            key={side}
            className={`flex-1 py-3 text-xs font-bold tracking-wider transition-colors duration-150 ${
              formData.side === side
                ? side === 'BUY'
                  ? 'text-trade-buy border-b-2 border-trade-buy'
                  : 'text-trade-sell border-b-2 border-trade-sell'
                : 'text-trade-text-secondary hover:text-trade-text hover:bg-trade-bg/30 border-b-2 border-transparent'
            }`}
            onClick={() => onFormChange({ side })}
          >
            {side}
          </button>
        ))}
      </div>

      <div className="trade-card-body flex-1 overflow-y-auto space-y-6">
        {/* Order Type Toggle */}
        <div className="space-y-2">
          <label className="trade-field-label text-[10px]">Order Type</label>
          <div className="flex bg-trade-bg p-1 rounded-md border border-trade-border">
            {orderTypes.map((type) => (
              <button
                key={type}
                className={`flex-1 py-1.5 text-xs font-bold rounded transition-all duration-150 ${
                  formData.orderType === type
                    ? 'bg-white text-trade-text shadow-sm border border-trade-border/50'
                    : 'text-trade-text-secondary hover:text-trade-text'
                }`}
                onClick={() => onFormChange({ orderType: type, price: type === 'MARKET' ? '' : formData.price })}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        {/* Symbol Input */}
        <div className="space-y-1">
          <div
            className={`trade-field-group ${
              validationErrors.symbol ? 'trade-field-group-error' : ''
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <label htmlFor="symbol-input" className="trade-field-label">
                  Symbol
                </label>
                <input
                  id="symbol-input"
                  type="text"
                  className="trade-field-input uppercase"
                  value={formData.symbol}
                  onChange={(e) => onFormChange({ symbol: e.target.value.toUpperCase() })}
                  placeholder="BTCUSDT"
                />
              </div>
              <span className="text-xs font-bold text-trade-text-light select-none ml-2">
                USDT
              </span>
            </div>
          </div>
          {validationErrors.symbol && (
            <p className="text-[11px] text-trade-sell font-medium animate-fade-in pl-1">
              {validationErrors.symbol}
            </p>
          )}
        </div>

        {/* Quantity Input */}
        <div className="space-y-1">
          <div
            className={`trade-field-group ${
              validationErrors.quantity ? 'trade-field-group-error' : ''
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <label htmlFor="quantity-input" className="trade-field-label">
                  Quantity
                </label>
                <input
                  id="quantity-input"
                  type="number"
                  step="any"
                  className="trade-field-input"
                  value={formData.quantity}
                  onChange={(e) => onFormChange({ quantity: e.target.value })}
                  placeholder="0.000"
                />
              </div>
              <span className="text-xs font-bold text-trade-text-light select-none ml-2 min-w-[32px] text-right">
                {baseAsset || 'ASSET'}
              </span>
            </div>
          </div>
          {validationErrors.quantity && (
            <p className="text-[11px] text-trade-sell font-medium animate-fade-in pl-1">
              {validationErrors.quantity}
            </p>
          )}
        </div>

        {/* Price Input (LIMIT only) */}
        {isLimit && (
          <div className="space-y-1 animate-slide-down">
            <div
              className={`trade-field-group ${
                validationErrors.price ? 'trade-field-group-error' : ''
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <label htmlFor="price-input" className="trade-field-label">
                    Limit Price
                  </label>
                  <input
                    id="price-input"
                    type="number"
                    step="any"
                    className="trade-field-input"
                    value={formData.price}
                    onChange={(e) => onFormChange({ price: e.target.value })}
                    placeholder="0.00"
                  />
                </div>
                <span className="text-xs font-bold text-trade-text-light select-none ml-2">
                  USDT
                </span>
              </div>
            </div>
            {validationErrors.price && (
              <p className="text-[11px] text-trade-sell font-medium animate-fade-in pl-1">
                {validationErrors.price}
              </p>
            )}
          </div>
        )}

        {/* Main Submit Button */}
        <button
          id="place-order-btn"
          onClick={onSubmit}
          disabled={isDisabled}
          className={`w-full py-2.5 rounded-md text-sm font-bold transition-all duration-150 flex items-center justify-center gap-2 text-white focus:outline-none ${
            !isConnected
              ? 'bg-trade-border text-trade-text-muted hover:bg-trade-border/80'
              : formData.side === 'BUY'
              ? 'bg-trade-buy hover:bg-trade-buy-hover hover:shadow-md hover:shadow-trade-buy/10 active:scale-[0.99]'
              : 'bg-trade-sell hover:bg-trade-sell-hover hover:shadow-md hover:shadow-trade-sell/10 active:scale-[0.99]'
          } ${isDisabled ? 'opacity-40 cursor-not-allowed scale-100 shadow-none' : ''}`}
        >
          {isSubmitting ? (
            <>
              <svg className="animate-spin w-4 h-4 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <span>Placing Order...</span>
            </>
          ) : (
            <span>
              {formData.side === 'BUY' ? 'BUY' : 'SELL'} {formData.symbol || 'ASSET'}
            </span>
          )}
        </button>
      </div>
    </div>
  );
}
