import { useEffect, useRef } from 'react';
import { LogEntry } from '../types';

interface LogsPanelProps {
  logs: LogEntry[];
}

export default function LogsPanel({ logs }: LogsPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  const levelBadgeStyle = {
    info: 'bg-trade-accent-light text-trade-accent border-trade-accent/10',
    success: 'bg-trade-buy-light text-trade-buy border-trade-buy/10',
    error: 'bg-trade-sell-light text-trade-sell border-trade-sell/10',
    warning: 'bg-trade-orange-light text-trade-orange border-trade-orange/10',
  };

  const levelLabel = {
    info: 'INFO',
    success: 'SUCCESS',
    error: 'ERROR',
    warning: 'WARN',
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  return (
    <div className="trade-card flex-1 flex flex-col overflow-hidden min-h-0" id="logs-panel">
      {/* Light Theme Header */}
      <div className="trade-card-header">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-trade-text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h2 className="text-xs font-bold text-trade-text uppercase tracking-wider">Activity Log</h2>
        </div>
        <span className="px-2 py-0.5 rounded bg-trade-bg border border-trade-border text-[10px] font-bold text-trade-text-secondary">
          {logs.length} events
        </span>
      </div>

      {/* Logs Table */}
      <div ref={scrollRef} className="overflow-y-auto flex-1 p-0">
        {logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-trade-text-secondary select-none p-6 text-center">
            <svg className="w-8 h-8 text-trade-text-muted mb-2 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-[11px] uppercase tracking-wider font-semibold">No activity recorded</span>
          </div>
        ) : (
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-trade-surface/95 backdrop-blur z-10">
              <tr className="border-b border-trade-border text-[10px] text-trade-text-secondary text-left select-none uppercase tracking-wider">
                <th className="py-2 px-4 font-semibold w-24">Time</th>
                <th className="py-2 px-2 font-semibold w-20">Status</th>
                <th className="py-2 px-4 font-semibold">Message</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log, index) => (
                <tr 
                  key={log.id} 
                  className={`border-b border-trade-border/50 last:border-0 hover:bg-trade-bg/40 transition-colors duration-100 ${
                    index === logs.length - 1 ? 'animate-fade-in' : ''
                  }`}
                >
                  {/* Timestamp */}
                  <td className="py-2.5 px-4 text-trade-text-secondary select-none font-mono text-[11px] whitespace-nowrap">
                    {formatTime(log.timestamp)}
                  </td>
                  {/* Badge */}
                  <td className="py-2.5 px-2 whitespace-nowrap">
                    <span className={`inline-flex px-1.5 py-0.5 rounded text-[9px] font-bold border ${levelBadgeStyle[log.level]}`}>
                      {levelLabel[log.level]}
                    </span>
                  </td>
                  {/* Message */}
                  <td className="py-2.5 px-4 text-trade-text leading-relaxed select-text font-medium">
                    {log.message}
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
