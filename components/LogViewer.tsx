import React, { useState, useEffect, useRef } from 'react';
import { LogEntry, LogLevel, LogSourceType } from '../types';
import { ApiService } from '../services/api';
import { Search, RefreshCw, Terminal, Maximize2, Minimize2, Calendar, Filter, X, Check } from 'lucide-react';

interface LogViewerProps {
  type: LogSourceType;
  sourceId?: string | null;
  isFullScreen?: boolean;
  onToggleFullScreen?: () => void;
}

export const LogViewer: React.FC<LogViewerProps> = ({ type, sourceId, isFullScreen, onToggleFullScreen }) => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Input State (User typing/selecting)
  const [inputQuery, setInputQuery] = useState('');
  const [inputLevel, setInputLevel] = useState<LogLevel | 'ALL'>('ALL');
  const [inputStartDate, setInputStartDate] = useState('');

  // Active Filter State (Applied to API calls)
  const [activeFilters, setActiveFilters] = useState({
    query: '',
    level: 'ALL' as LogLevel | 'ALL',
    startDate: ''
  });
  
  const [autoScroll, setAutoScroll] = useState(true);
  const logsEndRef = useRef<HTMLDivElement>(null);
  
  const fetchLogs = async () => {
    setLoading(true);
    try {
      // Use activeFilters for fetching
      const data = await ApiService.getLogs(
          type, 
          sourceId || undefined, 
          activeFilters.query, 
          activeFilters.level === 'ALL' ? undefined : activeFilters.level,
          activeFilters.startDate || undefined
      );
      setLogs(data);
    } catch (error) {
      console.error("Failed to fetch logs", error);
    } finally {
      setLoading(false);
    }
  };

  // Re-fetch when source changes, applied filters change, or auto-scroll is on (polling)
  useEffect(() => {
    fetchLogs();
    
    // Only set up interval if we are in "Live" mode
    let interval: NodeJS.Timeout;
    if (autoScroll) {
        interval = setInterval(() => {
            fetchLogs(); 
        }, 5000);
    }
    return () => clearInterval(interval);
  }, [type, sourceId, activeFilters, autoScroll]);

  // Scroll to bottom when logs update, if autoScroll is enabled
  useEffect(() => {
    if (autoScroll && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, autoScroll]);

  // Handle Apply Filters
  const applyFilters = () => {
    setActiveFilters({
        query: inputQuery,
        level: inputLevel,
        startDate: inputStartDate
    });
    // If user is searching/filtering specific history, we often want to turn off auto-scroll to read results
    if (inputQuery || inputStartDate) {
        setAutoScroll(false);
    }
  };

  // Handle Clear Filters
  const clearFilters = () => {
      setInputQuery('');
      setInputLevel('ALL');
      setInputStartDate('');
      
      setActiveFilters({
          query: '',
          level: 'ALL',
          startDate: ''
      });
      setAutoScroll(true); // Re-enable live mode on clear
  };

  const getLevelColor = (level: LogLevel) => {
    switch (level) {
      case LogLevel.ERROR: return 'text-red-400 bg-red-400/10 border border-red-400/20 px-1.5 py-0.5 rounded';
      case LogLevel.WARN: return 'text-yellow-400 bg-yellow-400/10 border border-yellow-400/20 px-1.5 py-0.5 rounded';
      case LogLevel.INFO: return 'text-blue-400';
      case LogLevel.DEBUG: return 'text-slate-400';
      default: return 'text-slate-500';
    }
  };

  return (
    <div className={`flex flex-col h-full bg-slate-900 border border-slate-700 rounded-lg overflow-hidden shadow-lg ${isFullScreen ? 'fixed inset-4 z-50' : 'relative'}`}>
      
      {/* Top Toolbar: Title & View Controls */}
      <div className="bg-slate-800 p-3 border-b border-slate-700 flex items-center justify-between">
        <div className="flex items-center gap-2">
            <h2 className="text-white font-semibold flex items-center gap-2 text-sm">
                <Terminal size={16} className="text-slate-400"/>
                {sourceId ? `${sourceId} Logs` : 'All Logs'}
            </h2>
            {loading && <RefreshCw size={14} className="animate-spin text-slate-500 ml-2" />}
        </div>
        <div className="flex items-center gap-2">
            <button 
                onClick={() => setAutoScroll(!autoScroll)}
                className={`text-xs font-medium px-3 py-1.5 rounded transition-colors border ${autoScroll ? 'bg-primary-600 border-primary-500 text-white' : 'bg-slate-800 border-slate-600 text-slate-400'}`}
            >
                {autoScroll ? 'Live: ON' : 'Live: OFF'}
            </button>
            {onToggleFullScreen && (
                <button 
                    onClick={onToggleFullScreen}
                    className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded transition-colors"
                    title={isFullScreen ? "Exit Full Screen" : "Full Screen"}
                >
                    {isFullScreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                </button>
            )}
        </div>
      </div>

      {/* Filter Bar: Inputs for searching, date, and level */}
      <div className="bg-slate-850 p-3 border-b border-slate-700 flex flex-wrap gap-3 items-center">
         {/* Text Search */}
         <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500" size={14} />
            <input
              type="text"
              placeholder="Search in logs..."
              value={inputQuery}
              onChange={(e) => setInputQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
              className="w-full bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded px-3 pl-9 py-2 focus:border-primary-500 focus:outline-none"
            />
          </div>

          {/* Log Level Filter */}
          <div className="relative">
             <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500 pointer-events-none">
                <Filter size={14} />
             </div>
             <select 
                value={inputLevel}
                onChange={(e) => setInputLevel(e.target.value as LogLevel | 'ALL')}
                className="bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded pl-9 pr-8 py-2 focus:border-primary-500 focus:outline-none appearance-none cursor-pointer hover:bg-slate-800"
             >
                <option value="ALL">All Levels</option>
                <option value={LogLevel.INFO}>INFO</option>
                <option value={LogLevel.WARN}>WARN</option>
                <option value={LogLevel.ERROR}>ERROR</option>
             </select>
          </div>

          {/* Date Filter (Start Time) */}
          <div className="relative">
             <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500 pointer-events-none">
                <Calendar size={14} />
             </div>
             <input 
                type="datetime-local" 
                value={inputStartDate}
                onChange={(e) => setInputStartDate(e.target.value)}
                className="bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded pl-9 pr-3 py-1.5 focus:border-primary-500 focus:outline-none [color-scheme:dark]"
             />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 border-l border-slate-700 pl-3 ml-2">
            <button 
                onClick={applyFilters}
                className="flex items-center gap-1.5 bg-primary-600 hover:bg-primary-500 text-white text-xs font-medium px-3 py-2 rounded transition-colors"
            >
                <Check size={14} /> Apply
            </button>
             <button 
                onClick={clearFilters}
                className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-300 text-xs font-medium px-3 py-2 rounded transition-colors"
            >
                <X size={14} /> Clear
            </button>
          </div>

          {/* AI Action */}
          <button className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 border border-slate-600 text-white text-xs font-medium px-3 py-2 rounded transition-colors ml-auto">
            <span className="text-purple-400">✨</span> AI Analysis
          </button>
      </div>

      {/* Log Console */}
      <div className="flex-1 overflow-y-auto bg-slate-950 font-mono text-sm p-4 custom-scrollbar">
        {logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-500">
            <Terminal size={48} className="mb-4 opacity-30" />
            <p className="text-slate-400 font-medium">No logs found</p>
            <p className="text-xs mt-1">Try adjusting your filters or clearing them</p>
          </div>
        ) : (
          <div className="space-y-0.5">
            {logs.map((log) => (
              <div key={log.id} className="flex items-start gap-3 hover:bg-slate-900 p-1.5 rounded-md group transition-colors">
                <span className="text-slate-500 w-32 flex-shrink-0 text-xs select-none pt-0.5">
                  {new Date(log.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute:'2-digit', second:'2-digit' })}
                  <span className="block text-[10px] opacity-60">{new Date(log.timestamp).toISOString().split('T')[0]}</span>
                </span>
                
                <div className="w-14 flex-shrink-0 pt-0.5">
                     <span className={`text-[10px] font-bold ${getLevelColor(log.level)}`}>
                        {log.level}
                    </span>
                </div>

                <span className="text-slate-300 break-all leading-snug font-light flex-1">
                  <span className="text-slate-500 mr-2 opacity-50 text-xs">[{log.source}]</span>
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