import React, { useEffect, useRef } from 'react';
import { LogEntry } from '../types';
import { Terminal, Trash2 } from 'lucide-react';

interface ConsoleLogProps {
  logs: LogEntry[];
  onClear: () => void;
}

export const ConsoleLog: React.FC<ConsoleLogProps> = ({ logs, onClear }) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  const getColor = (type: LogEntry['type']) => {
    switch (type) {
      case 'success': return 'text-green-400';
      case 'error': return 'text-red-400';
      case 'warning': return 'text-yellow-400';
      default: return 'text-zinc-400';
    }
  };

  return (
    <div className="flex flex-col h-full bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden shadow-xl">
      <div className="flex items-center justify-between px-4 py-2 bg-zinc-800 border-b border-zinc-700">
        <div className="flex items-center gap-2">
          <Terminal size={16} className="text-zinc-400" />
          <span className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">System Logs</span>
        </div>
        <button 
          onClick={onClear}
          className="p-1 hover:bg-zinc-700 rounded text-zinc-400 hover:text-white transition-colors"
          title="Clear Logs"
        >
          <Trash2 size={14} />
        </button>
      </div>
      
      <div 
        ref={scrollRef}
        className="flex-1 p-4 overflow-y-auto font-mono text-xs md:text-sm custom-scrollbar bg-black"
      >
        {logs.length === 0 ? (
          <div className="text-zinc-600 italic">Waiting for operations...</div>
        ) : (
          logs.map((log) => (
            <div key={log.id} className="mb-1 leading-relaxed">
              <span className="text-zinc-600 mr-2">[{log.timestamp}]</span>
              <span className={getColor(log.type)}>{log.message}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
};