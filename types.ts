export enum LogSourceType {
  DOCKER = 'DOCKER',
  SYSTEMD = 'SYSTEMD',
  FILE = 'FILE'
}

export enum LogLevel {
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
  DEBUG = 'DEBUG',
  UNKNOWN = 'UNKNOWN'
}

export interface LogEntry {
  id: string;
  timestamp: string;
  level: LogLevel;
  message: string;
  source: string; // Container name or Service name
}

export interface SystemService {
  id: string;
  name: string;
  status: 'active' | 'inactive' | 'failed';
  description: string;
}

export interface DockerContainer {
  id: string;
  name: string;
  image: string;
  state: 'running' | 'exited' | 'paused';
  status: string;
}

export interface LogStats {
  logDiskUsage: string;
  errorCount: number;
  warnCount: number;
  activeContainers: number;
  activeServices: number;
  logsOverTime: { time: string; count: number }[];
}

export interface ApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
}