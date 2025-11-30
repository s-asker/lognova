# LogNova - Centralized Log Management Dashboard

<div align="center">
  <img src="https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen" />
  <img src="https://img.shields.io/badge/react-19.2.0-blue" />
  <img src="https://img.shields.io/badge/license-MIT-green" />
</div>

## Overview

LogNova is a modern, self-hosted log aggregation and monitoring dashboard for Ubuntu/Linux systems. It provides a unified interface to view and analyze logs from multiple sources:

- **Docker Containers** - Real-time container logs via Docker API
- **Systemd Services** - System service logs via journalctl
- **File-based Logs** - Direct file reading (Nginx, Apache, custom logs)

### Features

- ✅ **JWT Authentication** - Secure user management with role-based access
- ✅ **Multi-source Aggregation** - Docker, systemd, and file logs in one place
- ✅ **Advanced Filtering** - Search, log level, time range filters
- ✅ **Real-time Stats** - Dashboard with metrics and visualizations
- ✅ **User Management** - Admin can create/delete users from dashboard
- ✅ **Modern UI** - Responsive design with dark theme
- ⏳ **AI Log Analysis** - Perplexity/Gemini integration (coming soon)

---

## Prerequisites

### System Requirements
- **OS**: Ubuntu 20.04+ (or any systemd-based Linux)
- **Node.js**: v18 or higher
- **Docker**: Installed and running (for container logs)
- **Nginx**: Optional (for file-based log examples)

### Required Permissions

The backend requires specific system permissions:

1. **Docker Socket Access** (`/var/run/docker.sock`)
   ```bash
   sudo usermod -aG docker $USER
   newgrp docker
   ```

2. **Journalctl Access** (systemd logs)
   ```bash
   sudo usermod -aG systemd-journal $USER
   ```

3. **Log File Read Access** (`/var/log`)
   ```bash
   sudo chmod +r /var/log/nginx/access.log  # Example for Nginx
   # OR add user to adm group
   sudo usermod -aG adm $USER
   ```

**Important**: Logout and login again after adding user to groups!

---

## Installation

### 1. Clone Repository

```bash
git clone https://github.com/s-asker/lognova.git
cd lognova
```

### 2. Install Dependencies

```bash
# Install frontend dependencies
npm install

# Install backend dependencies
cd backend
npm install
cd ..
```

### 3. Backend Configuration

Create `backend/.env` file:

```bash
# Generate a secure JWT secret (32+ characters)
JWT_SECRET=your-super-secret-key-change-this-in-production
PORT=3001
```

**Generate secure JWT secret:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 4. Frontend Configuration

Update `services/api.ts`:

```typescript
// Line 5: Set to false to use real backend
const USE_MOCK_DATA = false;

// Line 4: Update if backend is on different host/port
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';
```

Or create `.env` in root:

```bash
VITE_API_BASE_URL=http://localhost:3001/api
```

---

## Running the Application

### Development Mode

**Terminal 1 - Backend:**
```bash
cd backend
node server.js
```

**Terminal 2 - Frontend:**
```bash
npm run dev
```

Access the dashboard at: `http://localhost:5173`

### Production Build

```bash
# Build frontend
npm run build

# Serve with a static server
npx serve dist -p 3000

# Or use Nginx (recommended)
sudo cp -r dist/* /var/www/lognova/
```

**Nginx Configuration Example:**

```nginx
server {
    listen 80;
    server_name lognova.yourdomain.com;
    root /var/www/lognova;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass http://localhost:3001/api;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### Running Backend as System Service

Create `/etc/systemd/system/lognova-backend.service`:

```ini
[Unit]
Description=LogNova Backend Server
After=network.target docker.service

[Service]
Type=simple
User=your-username
WorkingDirectory=/path/to/lognova/backend
Environment="NODE_ENV=production"
ExecStart=/usr/bin/node server.js
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

Enable and start:
```bash
sudo systemctl enable lognova-backend
sudo systemctl start lognova-backend
sudo systemctl status lognova-backend
```

---

## Authentication & User Management

### Default Credentials

```
Username: admin
Password: admin
```

**⚠️ CRITICAL**: Change the default password immediately after first login!

### Changing Password

1. Login to LogNova
2. Navigate to **Settings** (gear icon)
3. Go to **General** tab
4. Fill in **Change Password** form:
   - Current Password: `admin`
   - New Password: `your-secure-password`
   - Confirm New Password: `your-secure-password`
5. Click **Change Password**

### Creating New Users (Admin Only)

1. Login as admin
2. Navigate to **Settings** → **User Management** tab
3. Click **Create User**
4. Fill in:
   - Username
   - Password
   - Role: `admin` or `viewer`
5. Click **Create**

### User Roles

- **Admin**: Full access + user management capabilities
- **Viewer**: Read-only access to logs and dashboard

### User Storage

Users are stored in `backend/users.json` (auto-created on first run).

**Security Best Practice:**
```bash
chmod 600 backend/users.json
```

---

## API Endpoints

### Authentication

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/auth/login` | User login | No |
| POST | `/api/auth/change-password` | Change password | Yes |

### User Management (Admin Only)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/users` | List all users |
| POST | `/api/users` | Create new user |
| DELETE | `/api/users/:username` | Delete user |

### Log APIs

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/stats` | Dashboard statistics |
| GET | `/api/docker/containers` | List Docker containers |
| GET | `/api/docker/logs?id=<container>` | Get container logs |
| GET | `/api/system/services` | List systemd services |
| GET | `/api/system/logs?id=<service>` | Get service logs |
| GET | `/api/files/logs` | Get file-based logs |

**Query Parameters:**
- `q`: Search query
- `level`: Log level (ERROR, WARN, INFO)
- `start`: Start date (ISO 8601)
- `end`: End date (ISO 8601)

---

## Troubleshooting

### Backend won't start

**Check permissions:**
```bash
# Docker socket
ls -la /var/run/docker.sock
# Should show: srw-rw---- 1 root docker

# Verify user in docker group
groups $USER | grep docker
```

### "Failed to fetch containers" error

```bash
# Ensure Docker is running
sudo systemctl status docker

# Test Docker API access
docker ps
```

### "Failed to read system logs" error

```bash
# Test journalctl access
journalctl -n 10

# If permission denied, add to systemd-journal group
sudo usermod -aG systemd-journal $USER
```

### 401 Unauthorized on API calls

- Token expired (24h expiry) - Login again
- Invalid JWT_SECRET between backend restarts
- Check browser console for token presence

### Users.json file permissions

```bash
# If backend can't write users.json
cd backend
sudo chown $USER:$USER users.json
chmod 600 users.json
```

---

## Security Considerations

1. **Change default admin password** immediately
2. **Use strong JWT_SECRET** (minimum 32 characters, generated securely)
3. **Enable HTTPS** in production (use Nginx reverse proxy with Let's Encrypt)
4. **Restrict file permissions**:
   ```bash
   chmod 600 backend/.env
   chmod 600 backend/users.json
   ```
5. **Rate limiting** - Consider adding `express-rate-limit` to login endpoint
6. **Firewall** - Only expose necessary ports (80/443, not 3001 directly)
7. **Regular updates** - Keep Node.js and dependencies updated

---

## Roadmap

- [ ] AI-powered log analysis (Perplexity/Gemini integration)
- [ ] Email/Slack alerts for error spikes
- [ ] Log export (CSV, JSON)
- [ ] Multi-server support (agent-based architecture)
- [ ] Kubernetes logs integration
- [ ] Custom log parsers
- [ ] Saved search queries
- [ ] Role-based dashboard customization

---

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

---

## License

MIT License - see LICENSE file for details

---

## Support

For issues and questions:
- GitHub Issues: https://github.com/s-asker/lognova/issues
- Email: sherifasker2@gmail.com
