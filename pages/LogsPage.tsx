import React, { useState, useEffect } from 'react';
import { LogSourceType, DockerContainer, SystemService } from '../types';
import { ApiService } from '../services/api';
import { LogViewer } from '../components/LogViewer';
import { Box, Server, CheckCircle, XCircle, PauseCircle } from 'lucide-react';

interface LogsPageProps {
  type: LogSourceType;
  selectedId: string | null;
}

export const LogsPage: React.FC<LogsPageProps> = ({ type, selectedId: initialId }) => {
  const [selectedId, setSelectedId] = useState<string | null>(initialId);
  const [dockerContainers, setDockerContainers] = useState<DockerContainer[]>([]);
  const [systemServices, setSystemServices] = useState<SystemService[]>([]);
  const [isFullScreen, setIsFullScreen] = useState(false);

  useEffect(() => {
    if (type === LogSourceType.DOCKER) {
      ApiService.getDockerContainers().then(setDockerContainers);
    } else if (type === LogSourceType.SYSTEMD) {
      ApiService.getSystemServices().then(setSystemServices);
    }
  }, [type]);

  // If type is FILE (Nginx), we just show the viewer directly for now
  if (type === LogSourceType.FILE) {
     return (
        <div className="h-full flex flex-col">
            <h1 className="text-2xl font-bold text-white mb-6">Nginx Access & Error Logs</h1>
            <div className="flex-1 min-h-0">
                <LogViewer type={type} sourceId="nginx" />
            </div>
        </div>
     );
  }

  const renderStatus = (status: string) => {
    if (status === 'running' || status === 'active') return <CheckCircle size={16} className="text-green-500" />;
    if (status === 'exited' || status === 'failed') return <XCircle size={16} className="text-red-500" />;
    return <PauseCircle size={16} className="text-yellow-500" />;
  };

  return (
    <div className="h-full flex flex-col gap-6">
      <div className={`flex items-center justify-between ${isFullScreen ? 'hidden' : ''}`}>
        <h1 className="text-2xl font-bold text-white">
          {type === LogSourceType.DOCKER ? 'Docker Containers' : 'System Services'}
        </h1>
      </div>

      <div className="grid grid-cols-12 gap-6 h-full min-h-0 transition-all duration-300">
        {/* List Side - Hidden in Full Screen */}
        <div className={`${isFullScreen ? 'hidden' : 'col-span-4'} bg-slate-800 border border-slate-700 rounded-lg overflow-hidden flex flex-col transition-all`}>
          <div className="p-4 border-b border-slate-700 bg-slate-850">
            <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wide">Available Sources</h3>
          </div>
          <div className="overflow-y-auto flex-1 p-2 space-y-1">
            {type === LogSourceType.DOCKER && dockerContainers.map(c => (
              <button
                key={c.id}
                onClick={() => setSelectedId(c.name)}
                className={`w-full text-left p-3 rounded-md transition-colors flex items-center justify-between ${
                  selectedId === c.name ? 'bg-primary-600/10 border border-primary-600/50 text-white' : 'hover:bg-slate-700 text-slate-300 border border-transparent'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Box size={18} className="text-slate-500" />
                  <div>
                    <div className="font-medium text-sm">{c.name}</div>
                    <div className="text-xs text-slate-500 truncate max-w-[150px]">{c.image}</div>
                  </div>
                </div>
                {renderStatus(c.state)}
              </button>
            ))}

            {type === LogSourceType.SYSTEMD && systemServices.map(s => (
              <button
                key={s.id}
                onClick={() => setSelectedId(s.name)}
                className={`w-full text-left p-3 rounded-md transition-colors flex items-center justify-between ${
                  selectedId === s.name ? 'bg-primary-600/10 border border-primary-600/50 text-white' : 'hover:bg-slate-700 text-slate-300 border border-transparent'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Server size={18} className="text-slate-500" />
                  <div>
                    <div className="font-medium text-sm">{s.name}</div>
                    <div className="text-xs text-slate-500 truncate max-w-[150px]">{s.description}</div>
                  </div>
                </div>
                {renderStatus(s.status)}
              </button>
            ))}
          </div>
        </div>

        {/* Viewer Side - Expands in Full Screen */}
        <div className={`${isFullScreen ? 'col-span-12' : 'col-span-8'} flex flex-col min-h-0 transition-all`}>
           {selectedId ? (
               <LogViewer 
                  type={type} 
                  sourceId={selectedId} 
                  key={selectedId} 
                  isFullScreen={isFullScreen}
                  onToggleFullScreen={() => setIsFullScreen(!isFullScreen)}
               />
           ) : (
               <div className="h-full border border-dashed border-slate-700 rounded-lg flex items-center justify-center text-slate-500 bg-slate-800/50">
                   <p>Select a {type === LogSourceType.DOCKER ? 'container' : 'service'} to view logs</p>
               </div>
           )}
        </div>
      </div>
    </div>
  );
};