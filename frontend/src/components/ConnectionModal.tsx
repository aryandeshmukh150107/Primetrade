interface ConnectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConnect: () => void;
  isConnecting: boolean;
}

export default function ConnectionModal({
  isOpen,
  onClose,
  onConnect,
  isConnecting,
}: ConnectionModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-trade-bg/60 backdrop-blur-sm animate-fade-in">
      <div 
        className="trade-card w-full max-w-sm overflow-hidden shadow-2xl animate-slide-down"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        <div className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2.5 rounded-full bg-trade-orange-light text-trade-orange">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h3 id="modal-title" className="text-lg font-bold text-trade-text">
              Connection Required
            </h3>
          </div>
          
          <div className="space-y-3 text-sm text-trade-text-secondary leading-relaxed">
            <p>
              Please connect to the Testnet before placing orders.
            </p>
            <p className="font-medium text-trade-text">
              Your trading session is currently disconnected.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 bg-trade-surface border-t border-trade-border">
          <button
            onClick={onClose}
            disabled={isConnecting}
            className="px-4 py-2 text-sm font-bold text-trade-text-secondary hover:text-trade-text transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConnect}
            disabled={isConnecting}
            className="px-4 py-2 text-sm font-bold text-white bg-trade-accent hover:bg-trade-accent-hover rounded transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2"
          >
            {isConnecting ? (
              <>
                <svg className="animate-spin w-4 h-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Connecting...
              </>
            ) : (
              'Connect Now'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
