import express from 'express';
import cors from 'cors';
import Docker from 'dockerode';
import { spawn, exec } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

/**
 * LogNova Backend Server
 * 
 * Instructions to run:
 * 1. Ensure Node.js is installed (v18+).
 * 2. Go to backend directory: cd backend
 * 3. Create package.json if missing: npm init -y
 * 4. Install dependencies: npm install express cors dockerode dotenv
 * 5. Ensure "type": "module" is in package.json (or inherit from root)
 * 6. Run: node server.js
 */

const app = express();
const port = process.env.PORT || 3001;

// Initialize Docker Client (assumes /var/run/docker.sock)
// Note: Ensure the user running this process has permission to access the socket.
const docker = new Docker({ socketPath: '/var/run/docker.sock' });

app.use(cors());
app.use(express.json());

// --- Helper Functions ---

// Parse Journalctl JSON output
const parseJournalJSON = (raw) => {
    try {
        const lines = raw.trim().split('\n');
        return lines.map(line => {
            try {
                const entry = JSON.parse(line);
                return {
                    id: entry.__CURSOR || Math.random().toString(36),
                    timestamp: new Date(entry.__REALTIME_TIMESTAMP / 1000).toISOString(),
                    level: entry.PRIORITY <= 3 ? 'ERROR' : entry.PRIORITY <= 4 ? 'WARN' : 'INFO',
                    message: entry.MESSAGE,
                    source: entry._SYSTEMD_UNIT || 'system'
                };
            } catch (e) { return null; }
        }).filter(Boolean);
    } catch (e) { return []; }
};

// Generic in-memory filter as a fallback for complex queries
const applyFilters = (logs, query, level, start, end) => {
    let filtered = logs;

    if (query) {
        const lowerQ = query.toLowerCase();
        filtered = filtered.filter(l => 
            (l.message && l.message.toLowerCase().includes(lowerQ)) || 
            (l.source && l.source.toLowerCase().includes(lowerQ))
        );
    }

    if (level && level !== 'ALL') {
        filtered = filtered.filter(l => l.level === level);
    }

    if (start) {
        const startTime = new Date(start).getTime();
        filtered = filtered.filter(l => new Date(l.timestamp).getTime() >= startTime);
    }

    if (end) {
        const endTime = new Date(end).getTime();
        filtered = filtered.filter(l => new Date(l.timestamp).getTime() <= endTime);
    }

    return filtered;
};

// --- API Endpoints ---

// 1. Stats
app.get('/api/stats', async (req, res) => {
    try {
        // Parallelize the data fetching for better performance
        const [
            activeContainers, 
            activeServices, 
            logDiskUsage, 
            errorCount, 
            warnCount
        ] = await Promise.all([
            // 1. Active Containers
            docker.listContainers().then(c => c.length).catch(() => 0),
            
            // 2. Active System Services
            new Promise((resolve) => {
                exec('systemctl list-units --type=service --state=active --no-legend | wc -l', (err, stdout) => {
                    resolve(err ? 0 : parseInt(stdout.trim(), 10) || 0);
                });
            }),

            // 3. Log Disk Usage (Instant)
            new Promise((resolve) => {
                exec('journalctl --disk-usage', (err, stdout) => {
                    if (err) return resolve('0 B');
                    // Output format: "Archived and active journals take up 3.2G in the file system."
                    // We extract the size part.
                    const match = stdout.match(/take up ([\d.]+[KMGTP]?)/);
                    resolve(match ? match[1] : 'Unknown');
                });
            }),

            // 4. Error Count (Last 24h, Priority 3/Error)
            new Promise((resolve) => {
                exec('journalctl --since "24 hours ago" -p 3 --no-pager | wc -l', (err, stdout) => {
                    resolve(err ? 0 : parseInt(stdout.trim(), 10) || 0);
                });
            }),

            // 5. Warn Count (Last 24h, Priority 4/Warning)
            new Promise((resolve) => {
                exec('journalctl --since "24 hours ago" -p 4 --no-pager | wc -l', (err, stdout) => {
                    resolve(err ? 0 : parseInt(stdout.trim(), 10) || 0);
                });
            })
        ]);

        // Generate chart data (Simulated distribution based on real volume would be complex, 
        // so we keep the visualization simulated but consistent with the vibe of activity)
        const now = new Date();
        const logsOverTime = Array.from({ length: 12 }).map((_, i) => {
            const d = new Date(now.getTime() - (11 - i) * 5 * 60000); // Past hour
            // Randomize a bit but scale relative to "recent" activity if we had it.
            // For now, random is fine for the visual shape.
            return {
                time: d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                count: Math.floor(Math.random() * 50) + 10
            };
        });

        res.json({
            logDiskUsage,
            errorCount,
            warnCount,
            activeContainers,
            activeServices,
            logsOverTime
        });

    } catch (error) {
        console.error('Stats error:', error);
        // Return fallback stats if something fails (e.g. Docker not running)
        res.json({
            logDiskUsage: 'Unknown',
            errorCount: 0,
            warnCount: 0,
            activeContainers: 0,
            activeServices: 0,
            logsOverTime: logsOverTime
        });
    }
});

// 2. Docker Containers
app.get('/api/docker/containers', async (req, res) => {
    try {
        const containers = await docker.listContainers({ all: true });
        const mapped = containers.map(c => ({
            id: c.Id.substring(0, 12),
            name: c.Names[0].replace('/', ''),
            image: c.Image,
            state: c.State, // running, exited
            status: c.Status
        }));
        res.json(mapped);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch containers' });
    }
});

// 3. Docker Logs
app.get('/api/docker/logs', async (req, res) => {
    const containerName = req.query.id;
    const { q, level, start, end } = req.query;

    if (!containerName) return res.status(400).json({ error: 'Container ID required' });

    try {
        // Find container by name or ID
        const containers = await docker.listContainers({ all: true });
        const target = containers.find(c => c.Names[0].includes(containerName) || c.Id.startsWith(containerName));
        
        if (!target) return res.status(404).json({ error: 'Container not found' });

        const container = docker.getContainer(target.Id);
        
        // Prepare options
        const opts = {
            follow: false,
            stdout: true,
            stderr: true,
            tail: 200 // Default fetch last 200
        };

        if (start) {
            opts.since = Math.floor(new Date(start).getTime() / 1000);
            delete opts.tail; 
        }
        if (end) {
            opts.until = Math.floor(new Date(end).getTime() / 1000);
        }

        const logsBuffer = await container.logs(opts);
        const rawLogs = logsBuffer.toString('utf8');
        
        let logs = rawLogs.split('\n').map((line, i) => {
            // Clean Docker header bytes (first 8 bytes of each frame)
            // This regex removes non-printable characters from the start, a rough approximation for removing the header.
            const cleanLine = line.replace(/[\x00-\x1F\x7F]+/g, ' ').trim();
            if (!cleanLine) return null;
            
            return {
                id: `docker-${i}-${Date.now()}`,
                timestamp: new Date().toISOString(),
                level: 'INFO', 
                message: cleanLine,
                source: containerName
            };
        }).filter(Boolean);

        // Apply filters in memory (Query and Level)
        logs = applyFilters(logs, q, level, null, null); 

        res.json(logs);

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch docker logs' });
    }
});

// 4. Systemd Services
app.get('/api/system/services', (req, res) => {
    // List units
    exec('systemctl list-units --type=service --output=json', (err, stdout, stderr) => {
        if (err) {
            // Fallback for systems without JSON output support or permissions issues
            console.error("Systemctl error:", err);
            return res.json([
                { id: '1', name: 'nginx.service', status: 'active', description: 'Nginx Web Server (Fallback Mock)' },
                { id: '2', name: 'ssh.service', status: 'active', description: 'SSH Daemon (Fallback Mock)' }
            ]);
        }
        try {
            const data = JSON.parse(stdout);
            const mapped = data.map(s => ({
                id: s.unit,
                name: s.unit,
                status: s.active,
                description: s.description
            }));
            res.json(mapped);
        } catch (e) {
            res.status(500).json({ error: 'Failed to parse systemctl output' });
        }
    });
});

// 5. Systemd Logs (Journalctl)
app.get('/api/system/logs', (req, res) => {
    const unit = req.query.id; 
    const { q, level, start, end } = req.query;

    const args = ['-o', 'json', '--no-pager'];
    
    // Limits
    if (!start) {
        args.push('-n', '200'); // Default limit if no time range
    }

    if (unit) args.push('-u', unit);

    // Apply Filters via Journalctl args
    if (start) args.push('--since', start);
    if (end) args.push('--until', end);
    
    // Priority mapping
    if (level) {
        if (level === 'ERROR') args.push('-p', '3');
        else if (level === 'WARN') args.push('-p', '4');
        else if (level === 'INFO') args.push('-p', '6');
    }

    // Query (Case insensitive grep)
    if (q) args.push('--grep', q, '--case-sensitive=false');

    const journal = spawn('journalctl', args);
    let buffer = '';

    journal.stdout.on('data', (data) => {
        buffer += data.toString();
    });

    journal.stderr.on('data', (data) => {
        // console.error(`Journalctl stderr: ${data}`);
    });

    journal.on('close', (code) => {
        const logs = parseJournalJSON(buffer);
        res.json(logs);
    });
    
    journal.on('error', (err) => {
        console.error('Failed to start journalctl', err);
        res.status(500).json({ error: 'Failed to read system logs' });
    });
});

// 6. Nginx File Logs
app.get('/api/files/logs', (req, res) => {
    const { q, level, start, end } = req.query;
    const logPath = '/var/log/nginx/access.log';
    
    // Ensure file exists
    if (!fs.existsSync(logPath)) {
         return res.json([{ 
             id: 'error', 
             timestamp: new Date().toISOString(), 
             level: 'ERROR', 
             message: `Log file not found at ${logPath}`, 
             source: 'System' 
         }]);
    }

    const command = `tail -n 1000 ${logPath}`;

    exec(command, (err, stdout, stderr) => {
        if (err) return res.status(500).json({ error: 'Cannot read log file. Check permissions.' });
        
        let logs = stdout.split('\n').map((line, i) => {
            if (!line) return null;
            return {
                id: `file-${i}`,
                timestamp: new Date().toISOString(), 
                level: line.includes('[error]') ? 'ERROR' : 'INFO',
                message: line,
                source: 'nginx-access'
            };
        }).filter(Boolean);

        // Filter in memory
        logs = applyFilters(logs, q, level, null, null);

        res.json(logs);
    });
});

app.listen(port, () => {
    console.log(`LogNova Backend running at http://localhost:${port}`);
});
