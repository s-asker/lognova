import { ApiResponse, DockerContainer, LogEntry, LogLevel, LogSourceType, LogStats, SystemService } from '../types';

// Configuration
const API_BASE_URL = 'http://localhost:3001/api';
const USE_MOCK_DATA = true; // Set to FALSE to connect to the actual backend provided in `backend/server.js`

// Mock Data Generators for UI Demo
const generateMockLogs = (count: number, source: string): LogEntry[] => {
  return Array.from({ length: count }).map((_, i) => ({
    id: `log-${Date.now()}-${i}`,
    timestamp: new Date(Date.now() - i * 60000).toISOString(),
    level: i % 10 === 0 ? LogLevel.ERROR : i % 5 === 0 ? LogLevel.WARN : LogLevel.INFO,
    message: `[${source}] processed request ID ${Math.random().toString(36).substring(7)} with latency ${Math.floor(Math.random() * 200)}ms`,
    source: source
  }));
};

const mockStats: LogStats = {
  totalLogs: 14520,
  errorCount: 234,
  warnCount: 890,
  logsOverTime: [
    { time: '10:00', count: 120 }, { time: '10:05', count: 150 },
    { time: '10:10', count: 180 }, { time: '10:15', count: 140 },
    { time: '10:20', count: 200 }, { time: '10:25', count: 400 }, // Spike
    { time: '10:30', count: 160 },
  ]
};

const mockContainers: DockerContainer[] = [
  { id: '1', name: 'lognova-backend', image: 'node:18-alpine', state: 'running', status: 'Up 2 days' },
  { id: '2', name: 'postgres-db', image: 'postgres:14', state: 'running', status: 'Up 5 days' },
  { id: '3', name: 'redis-cache', image: 'redis:alpine', state: 'running', status: 'Up 5 days' },
  { id: '4', name: 'failed-worker', image: 'worker:latest', state: 'exited', status: 'Exited (1) 2 hours ago' },
];

const mockServices: SystemService[] = [
  { id: 'nginx', name: 'nginx.service', status: 'active', description: 'A high performance web server' },
  { id: 'ssh', name: 'sshd.service', status: 'active', description: 'OpenSSH server daemon' },
  { id: 'docker', name: 'docker.service', status: 'active', description: 'Docker Application Container Engine' },
  { id: 'ufw', name: 'ufw.service', status: 'inactive', description: 'Uncomplicated firewall' },
];

// Service Implementation
export const ApiService = {
  async getStats(): Promise<LogStats> {
    if (USE_MOCK_DATA) return mockStats;
    const res = await fetch(`${API_BASE_URL}/stats`);
    const data = await res.json();
    return data;
  },

  async getDockerContainers(): Promise<DockerContainer[]> {
    if (USE_MOCK_DATA) return mockContainers;
    const res = await fetch(`${API_BASE_URL}/docker/containers`);
    return await res.json();
  },

  async getSystemServices(): Promise<SystemService[]> {
    if (USE_MOCK_DATA) return mockServices;
    const res = await fetch(`${API_BASE_URL}/system/services`);
    return await res.json();
  },

  async getLogs(type: LogSourceType, id?: string, query?: string): Promise<LogEntry[]> {
    if (USE_MOCK_DATA) {
      // Simulate network delay
      await new Promise(r => setTimeout(r, 400));
      let logs = generateMockLogs(50, id || (type === LogSourceType.FILE ? 'nginx' : 'system'));
      if (query) {
        logs = logs.filter(l => l.message.toLowerCase().includes(query.toLowerCase()));
      }
      return logs;
    }

    const params = new URLSearchParams();
    if (id) params.append('id', id);
    if (query) params.append('q', query);

    let endpoint = '';
    switch (type) {
      case LogSourceType.DOCKER: endpoint = '/docker/logs'; break;
      case LogSourceType.SYSTEMD: endpoint = '/system/logs'; break;
      case LogSourceType.FILE: endpoint = '/files/logs'; break;
    }

    const res = await fetch(`${API_BASE_URL}${endpoint}?${params.toString()}`);
    return await res.json();
  }
};