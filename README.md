# LogNova Integration Guide

## 1. Prerequisites
- **Ubuntu Linux** server.
- **Node.js** (v18+) and **NPM**.
- **Docker** installed and running.
- **Nginx** installed (optional, for Nginx logs).

## 2. Backend Setup
1. Create a directory `backend` on your server.
2. Copy the content of `backend/server.js` into `backend/server.js`.
3. Initialize the project and install dependencies:
   ```bash
   cd backend
   npm init -y
   npm install express cors dockerode
   ```
4. Start the backend:
   ```bash
   node server.js
   ```
   *Note: Ensure the user running the node process has access to `/var/run/docker.sock` (usually the `docker` group) and read access to `/var/log`.*

## 3. Frontend Setup
1. In the `services/api.ts` file, change `USE_MOCK_DATA = true` to `false`.
2. Ensure the `API_BASE_URL` in `services/api.ts` points to your backend IP/Domain (e.g., `http://your-server-ip:3001/api`).
3. Build the React application (using Vite, CRA, or similar build tool) and serve the `dist` folder via Nginx or a static file server.

## 4. Perplexity/AI Integration
- The skeleton for AI integration is located in `components/LogViewer.tsx` (Analyze button) and `pages/SettingsPage.tsx`.
- In the future, extend `backend/server.js` to accept a log snippet, send it to the Perplexity API, and return the analysis to the frontend.
