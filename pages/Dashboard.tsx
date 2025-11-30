import React, { useEffect, useState } from 'react';
import { StatsCard } from '../components/StatsCard';
import { Activity, AlertTriangle, Box, Server } from 'lucide-react';
import { ApiService } from '../services/api';
import { LogStats } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface DashboardProps {
  onNavigate: (view: any) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onNavigate }) => {
  const [stats, setStats] = useState<LogStats | null>(null);

  useEffect(() => {
    ApiService.getStats().then(setStats);
  }, []);

  if (!stats) return <div className="text-slate-400 p-8">Loading dashboard...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">System Overview</h1>
        <span className="text-slate-500 text-sm">Last updated: {new Date().toLocaleTimeString()}</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard 
          title="Total Events (24h)" 
          value={stats.totalLogs.toLocaleString()} 
          icon={Activity} 
          trend="12%" 
          trendUp={true} 
        />
        <StatsCard 
          title="Error Rate" 
          value={stats.errorCount} 
          icon={AlertTriangle} 
          trend="2%" 
          trendUp={false} 
        />
        <StatsCard 
          title="Active Containers" 
          value="8" 
          icon={Box} 
        />
        <StatsCard 
          title="System Services" 
          value="42" 
          icon={Server} 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-slate-800 border border-slate-700 rounded-lg p-6 flex flex-col">
          <h3 className="text-lg font-medium text-white mb-6">Log Volume</h3>
          {/* Explicit height wrapper for Recharts */}
          <div className="h-[300px] w-full">
            {stats.logsOverTime && stats.logsOverTime.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.logsOverTime} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                    <XAxis 
                        dataKey="time" 
                        stroke="#94a3b8" 
                        tick={{fontSize: 12, fill: '#94a3b8'}} 
                        tickLine={false}
                        axisLine={false}
                    />
                    <YAxis 
                        stroke="#94a3b8" 
                        tick={{fontSize: 12, fill: '#94a3b8'}} 
                        tickLine={false}
                        axisLine={false}
                    />
                    <Tooltip 
                        contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f1f5f9', borderRadius: '0.375rem' }}
                        itemStyle={{ color: '#3b82f6' }}
                        cursor={{fill: '#334155', opacity: 0.3}}
                    />
                    <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={32} />
                </BarChart>
                </ResponsiveContainer>
            ) : (
                <div className="h-full flex items-center justify-center text-slate-500">
                    No data available
                </div>
            )}
          </div>
        </div>

        <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
          <h3 className="text-lg font-medium text-white mb-4">Quick Actions</h3>
          <div className="space-y-3">
            <button 
              onClick={() => onNavigate('docker')}
              className="w-full text-left px-4 py-3 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors flex items-center justify-between group"
            >
              <span className="text-slate-200">View Docker Logs</span>
              <span className="text-slate-400 group-hover:translate-x-1 transition-transform">→</span>
            </button>
             <button 
              onClick={() => onNavigate('system')}
              className="w-full text-left px-4 py-3 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors flex items-center justify-between group"
            >
              <span className="text-slate-200">View Systemd Logs</span>
              <span className="text-slate-400 group-hover:translate-x-1 transition-transform">→</span>
            </button>
             <button 
              onClick={() => onNavigate('nginx')}
              className="w-full text-left px-4 py-3 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors flex items-center justify-between group"
            >
              <span className="text-slate-200">Analyze Nginx Errors</span>
              <span className="text-slate-400 group-hover:translate-x-1 transition-transform">→</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};