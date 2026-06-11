import { ConnectionStatus } from '../types';

interface HeaderProps {
  connectionStatus: ConnectionStatus;
  onTestConnection: () => void;
  isTestingConnection: boolean;
}

export default function Header({
  connectionStatus,
  onTestConnection,
  isTestingConnection,
}: HeaderProps) {
  const isConnected = connectionStatus === 'connected';
  const isConnecting = connectionStatus === 'connecting';

  return (
    <header className="bg-white border-b border-trade-border sticky top-0 z-50 px-4 select-none h-14">
      <div className="max-w-[1600px] mx-auto h-full flex items-center justify-between">
        {/* Left: Title */}
        <div className="flex items-center gap-3">
          <div className="flex items-baseline gap-1.5">
            <span className="text-lg font-bold tracking-tight text-trade-text">Primetrade Assignment by Aryan</span>
          </div>
        </div>

        {/* Right: Connection Actions & Status */}
        <div className="flex items-center gap-5">
          {/* Status Indicator */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <div
                className={`w-2 h-2 rounded-full ${
                  isConnected
                    ? 'bg-trade-buy'
                    : isConnecting
                    ? 'bg-trade-orange animate-pulse'
                    : 'bg-trade-sell'
                }`}
              />
              {isConnecting && (
                <div className="absolute inset-0 w-2 h-2 rounded-full bg-trade-orange animate-ping opacity-75" />
              )}
            </div>
            <span className="text-[11px] font-bold text-trade-text-secondary uppercase tracking-wide">
              {isConnected ? 'Connected' : isConnecting ? 'Connecting' : 'Disconnected'}
            </span>
          </div>

          {/* Testnet Badge */}
          <div className="hidden sm:flex items-center">
            <span className="trade-badge bg-trade-orange-light text-trade-orange border border-trade-orange/10 uppercase tracking-widest text-[9px] font-bold">
              Testnet
            </span>
          </div>

          <div className="w-px h-4 bg-trade-border" />

          {/* Test Connection Button */}
          <button
            id="test-connection-btn"
            onClick={onTestConnection}
            disabled={isTestingConnection || isConnecting}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded transition-all duration-150 border focus:outline-none ${
              isConnected
                ? 'bg-trade-buy-light text-trade-buy border-trade-buy/20 hover:bg-trade-buy/10'
                : 'bg-transparent text-trade-text-secondary border-trade-border hover:bg-trade-bg hover:text-trade-text hover:border-trade-border-hover'
            } disabled:opacity-50`}
          >
            {isTestingConnection ? (
              <>
                <svg className="animate-spin w-3 h-3 text-current" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                <span>Testing...</span>
              </>
            ) : isConnected ? (
              <span>Recheck API</span>
            ) : (
              <span>Test Connection</span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
