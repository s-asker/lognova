/**
 * LogNova Backend Server
 * 
 * Instructions to run:
 * 1. Ensure Node.js is installed (v18+).
 * 2. Create a package.json in this directory with dependencies:
 *    npm init -y
 *    npm install express cors dockerode
 * 3. Run: node server.js
 * 
 * Note: Requires permissions to access Docker socket and read Log files.
 * Typically requires adding your user to 'docker' group and 'adm' group for logs.
 */

const express = require('express');
const cors = require('cors');
const Docker = require('dockerode');
const { spawn, exec } = require('child_process');
const fs = require('fs');
const path = require('path');

const app = express();
const port = 3001;

// Initialize Docker Client (assumes /var/run/docker.sock)
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
    // In a real app, this would aggregate real data. Returning mock structure for dashboard for now.
    res.json({
        totalLogs: 1000,
        errorCount: 5,
        warnCount: 12,
        logsOverTime: []
    });
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
            tail: 200 // Default fetch last 200, but if 'since' is provided, we might get more
        };

        if (start) {
            opts.since = Math.floor(new Date(start).getTime() / 1000);
            delete opts.tail; // If asking for time range, don't limit by lines
        }
        if (end) {
            opts.until = Math.floor(new Date(end).getTime() / 1000);
        }

        const logsBuffer = await container.logs(opts);

        // Clean docker header bytes (8 bytes header per frame)
        // This is a naive split; proper parsing requires reading the 8-byte header to know length/type.
        // For simple usage, converting to string and splitting by newline often works enough for text logs.
        const rawLogs = logsBuffer.toString('utf8');
        
        // Basic cleanup of non-printable chars from headers
        let logs = rawLogs.split('\n').map((line, i) => {
             // Remove Docker header garbage (approximate) if present
            const cleanLine = line.replace(/[^\x20-\x7E]/g, '').trim();
            if (!cleanLine) return null;
            
            return {
                id: `docker-${i}-${Date.now()}`,
                timestamp: new Date().toISOString(), // Docker API stream doesn't inherently include timestamp unless tty=false and 'timestamps: true' is sent.
                level: 'INFO', // Docker doesn't separate levels strictly in API, only stdout(1)/stderr(2) streams.
                message: cleanLine,
                source: containerName
            };
        }).filter(Boolean);

        // Apply filters in memory (Query and Level)
        logs = applyFilters(logs, q, level, null, null); // Start/End handled by Docker API

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
            // Fallback for systems without JSON output support
            return res.json([
                { id: '1', name: 'nginx.service', status: 'active', description: 'Nginx Web Server' },
                { id: '2', name: 'ssh.service', status: 'active', description: 'SSH Daemon' }
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
    
    // Priority mapping: 
    // ERROR=3 (err), WARN=4 (warning), INFO=6 (info), DEBUG=7 (debug)
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
    
    // Construct command: tail -> grep (if basic)
    // For advanced filtering, we'll read and filter in JS.
    // Reading 1000 lines max to prevent memory issues in this simple implementation
    const command = `tail -n 1000 ${logPath}`;

    exec(command, (err, stdout, stderr) => {
        if (err) return res.status(500).json({ error: 'Cannot read log file. Check permissions.' });
        
        let logs = stdout.split('\n').map((line, i) => {
            if (!line) return null;
            return {
                id: `file-${i}`,
                timestamp: new Date().toISOString(), // Nginx logs have timestamps inside the text, requires regex parsing to extract. Using current time as fallback for this demo unless we implement full Nginx parsing.
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