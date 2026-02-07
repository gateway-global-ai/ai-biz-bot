import React, { useRef, useEffect } from 'react';
import { LogEntry } from '../types';
import { Terminal } from 'lucide-react';

interface LoggerProps {
  logs: LogEntry[];
}

const Logger: React.FC<LoggerProps> = ({ logs }) => {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  return (
    <div className="flex flex-col h-full bg-black rounded-xl border border-gray-800 overflow-hidden font-mono text-xs">
      <div className="px-4 py-2 bg-gray-900 border-b border-gray-800 flex items-center gap-2">
        <Terminal size={14} className="text-gray-400" />
        <span className="text-gray-400 font-semibold uppercase">Live Session Logs</span>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {logs.length === 0 && (
          <div className="text-gray-600 italic">Waiting for connection...</div>
        )}
        {logs.map((log, i) => (
          <div key={i} className="flex gap-3">
            <span className="text-gray-500 shrink-0">{log.timestamp}</span>
            <span className={`${
              log.type === 'error' ? 'text-red-400' :
              log.type === 'info' ? 'text-blue-300' :
              'text-green-300'
            }`}>
              [{log.type.toUpperCase()}]
            </span>
            <span className="text-gray-300 break-all">{log.message}</span>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  );
};

export default Logger;