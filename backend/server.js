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
    if (!containerName) return res.status(400).json({ error: 'Container ID required' });

    try {
        // Find container by name or ID
        const containers = await docker.listContainers({ all: true });
        const target = containers.find(c => c.Names[0].includes(containerName) || c.Id.startsWith(containerName));
        
        if (!target) return res.status(404).json({ error: 'Container not found' });

        const container = docker.getContainer(target.Id);
        // Get logs (last 100 lines)
        const logsBuffer = await container.logs({
            follow: false,
            stdout: true,
            stderr: true,
            tail: 100
        });

        // Docker logs return a buffer with header bytes. We need to strip them to get text.
        // This is a simplified parser.
        const rawLogs = logsBuffer.toString('utf8');
        // Clean up non-printable characters often found in docker stream headers
        const cleanLogs = rawLogs.split('\n').map((line, i) => ({
            id: `docker-${i}-${Date.now()}`,
            timestamp: new Date().toISOString(), // Docker logs via API don't always have easy timestamps unless tty=false
            level: 'INFO',
            message: line.replace(/[^\x20-\x7E]/g, '').trim(), // rudimentary cleaning
            source: containerName
        })).filter(l => l.message.length > 0);

        res.json(cleanLogs);

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
            // Fallback for systems without JSON output support in systemctl (older versions)
            // returning a static list or parsing text would be needed.
            // For now, assuming modern systemd.
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
    const unit = req.query.id; // e.g., nginx.service
    const args = ['-o', 'json', '-n', '100', '--no-pager'];
    
    if (unit) {
        args.push('-u', unit);
    }

    const journal = spawn('journalctl', args);
    let buffer = '';

    journal.stdout.on('data', (data) => {
        buffer += data.toString();
    });

    journal.on('close', (code) => {
        const logs = parseJournalJSON(buffer);
        res.json(logs);
    });
});

// 6. Nginx File Logs
app.get('/api/files/logs', (req, res) => {
    // Default to nginx access log
    const logPath = '/var/log/nginx/access.log';
    
    exec(`tail -n 100 ${logPath}`, (err, stdout, stderr) => {
        if (err) return res.status(500).json({ error: 'Cannot read log file. Check permissions.' });
        
        const logs = stdout.split('\n').map((line, i) => ({
            id: `file-${i}`,
            timestamp: new Date().toISOString(),
            level: 'INFO',
            message: line,
            source: 'nginx-access'
        })).filter(l => l.message.length > 0);

        res.json(logs);
    });
});

app.listen(port, () => {
    console.log(`LogNova Backend running at http://localhost:${port}`);
});