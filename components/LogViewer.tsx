import React, { useState, useEffect, useRef } from 'react';
import { LogEntry, LogLevel, LogSourceType } from '../types';
import { ApiService } from '../services/api';
import { Search, Filter, RefreshCw, AlertTriangle, Info, XCircle, Terminal } from 'lucide-react';

interface LogViewerProps {
  type: LogSourceType;
  sourceId?: string | null; // e.g., container ID or 'nginx'
}

export const LogViewer: React.FC<LogViewerProps> = ({ type, sourceId }) => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [autoScroll, setAutoScroll] = useState(true);
  const logsEndRef = useRef<HTMLDivElement>(null);
  
  const fetchLogs = async () => {
    setLoading(true);
    try {
      const data = await ApiService.getLogs(type, sourceId || undefined, searchQuery);
      setLogs(data);
    } catch (error) {
      console.error("Failed to fetch logs", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
    const interval = setInterval(() => {
        if(autoScroll) fetchLogs(); // Simple polling for "live" feel
    }, 5000);
    return () => clearInterval(interval);
  }, [type, sourceId, searchQuery, autoScroll]);

  useEffect(() => {
    if (autoScroll && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, autoScroll]);

  const getLevelColor = (level: LogLevel) => {
    switch (level) {
      case LogLevel.ERROR: return 'text-red-400';
      case LogLevel.WARN: return 'text-yellow-400';
      case LogLevel.INFO: return 'text-blue-400';
      case LogLevel.DEBUG: return 'text-slate-400';
      default: return 'text-slate-500';
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 border border-slate-700 rounded-lg overflow-hidden shadow-lg">
      {/* Toolbar */}
      <div className="bg-slate-800 p-4 border-b border-slate-700 flex flex-wrap gap-4 items-center justify-between">
        <div className="flex items-center gap-2">
            <h2 className="text-white font-semibold flex items-center gap-2">
                <Terminal size={18} className="text-slate-400"/>
                {sourceId ? `${sourceId} Logs` : 'All Logs'}
            </h2>
            {loading && <RefreshCw size={14} className="animate-spin text-slate-500 ml-2" />}
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500" size={14} />
            <input
              type="text"
              placeholder="Filter logs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-slate-900 border border-slate-600 text-slate-200 text-sm rounded px-3 pl-9 py-1.5 focus:border-primary-500 focus:outline-none w-64"
            />
          </div>
          
          <button 
            onClick={() => setAutoScroll(!autoScroll)}
            className={`text-xs font-medium px-3 py-1.5 rounded border ${autoScroll ? 'bg-primary-600 border-primary-500 text-white' : 'bg-slate-800 border-slate-600 text-slate-400'}`}
          >
            {autoScroll ? 'Live: ON' : 'Live: OFF'}
          </button>

          <button className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 text-white text-xs font-medium px-3 py-1.5 rounded transition-colors">
            <span className="text-purple-400">✨</span> Analyze w/ AI
          </button>
        </div>
      </div>

      {/* Log Console */}
      <div className="flex-1 overflow-y-auto bg-slate-950 font-mono text-sm p-4 custom-scrollbar">
        {logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-500">
            <Terminal size={48} className="mb-4 opacity-50" />
            <p>No logs found matching your criteria.</p>
          </div>
        ) : (
          <div className="space-y-1">
            {logs.map((log) => (
              <div key={log.id} className="flex items-start gap-3 hover:bg-slate-900 p-1 rounded group">
                <span className="text-slate-500 w-36 flex-shrink-0 text-xs select-none">
                  {new Date(log.timestamp).toLocaleTimeString()} 
                  <span className="ml-1 opacity-50 text-[10px]">{new Date(log.timestamp).toLocaleDateString()}</span>
                </span>
                <span className={`w-16 font-bold text-xs ${getLevelColor(log.level)}`}>
                  {log.level}
                </span>
                <span className="text-slate-300 break-all leading-snug font-light">
                  <span className="text-slate-500 mr-2">[{log.source}]</span>
                  {log.message}
                </span>
              </div>
            ))}
            <div ref={logsEndRef} />
          </div>
        )}
      </div>
    </div>
  );
};