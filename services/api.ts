import { ApiResponse, DockerContainer, LogEntry, LogLevel, LogSourceType, LogStats, SystemService } from '../types';

// Configuration
const API_BASE_URL = 'http://localhost:3001/api';
const USE_MOCK_DATA = false; // Set to FALSE to connect to the actual backend provided in `backend/server.js`

// Mock Data Generators for UI Demo
// Generates logs spanning the last 24 hours
const generateMockLogs = (count: number, source: string): LogEntry[] => {
  const now = Date.now();
  return Array.from({ length: count }).map((_, i) => {
    // Spread logs over 24 hours (86400000 ms)
    const timeOffset = Math.floor((i / count) * 86400000); 
    return {
      id: `log-${now}-${i}`,
      timestamp: new Date(now - timeOffset).toISOString(),
      level: i % 15 === 0 ? LogLevel.ERROR : i % 7 === 0 ? LogLevel.WARN : LogLevel.INFO,
      message: `[${source}] processed request ID ${Math.random().toString(36).substring(7)} with latency ${Math.floor(Math.random() * 200)}ms`,
      source: source
    };
  });
};

const mockStats: LogStats = {
  totalLogs: 14520,
  errorCount: 234,
  warnCount: 890,
  logsOverTime: [
    { time: '10:00', count: 120 }, { time: '10:05', count: 150 },
    { time: '10:10', count: 180 }, { time: '10:15', count: 140 },
    { time: '10:20', count: 200 }, { time: '10:25', count: 400 },
    { time: '10:30', count: 160 }, { time: '10:35', count: 220 },
    { time: '10:40', count: 190 }, { time: '10:45', count: 300 },
    { time: '10:50', count: 250 }, { time: '10:55', count: 180 },
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
    if (USE_MOCK_DATA) {
        // Return a copy to avoid mutation issues
        return JSON.parse(JSON.stringify(mockStats)); 
    }
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

  async getLogs(
      type: LogSourceType, 
      id?: string, 
      query?: string, 
      level?: LogLevel, 
      startDate?: string, 
      endDate?: string
  ): Promise<LogEntry[]> {
    if (USE_MOCK_DATA) {
      await new Promise(r => setTimeout(r, 400)); // Latency simulation
      
      // Generate a larger static set for better filtering demo (500 logs over 24h)
      let logs = generateMockLogs(500, id || (type === LogSourceType.FILE ? 'nginx' : 'system'));
      
      if (query) {
        const lowerQuery = query.toLowerCase();
        logs = logs.filter(l => 
          l.message.toLowerCase().includes(lowerQuery) || 
          l.source.toLowerCase().includes(lowerQuery)
        );
      }
      
      if (level) {
        logs = logs.filter(l => l.level === level);
      }

      if (startDate) {
          const start = new Date(startDate).getTime();
          logs = logs.filter(l => new Date(l.timestamp).getTime() >= start);
      }

      if (endDate) {
          const end = new Date(endDate).getTime();
          logs = logs.filter(l => new Date(l.timestamp).getTime() <= end);
      }

      // Sort logs by timestamp descending (newest first) for the UI logic usually
      // but the UI renders top-down, so usually we want oldest first or newest last depending on scroll.
      // Let's return them such that the newest is at the end of the array (log tail style).
      logs.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

      return logs;
    }

    const params = new URLSearchParams();
    if (id) params.append('id', id);
    if (query) params.append('q', query);
    if (level) params.append('level', level);
    if (startDate) params.append('start', startDate);
    if (endDate) params.append('end', endDate);

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