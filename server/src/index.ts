
import express from 'express';
import cors from 'cors';
import http from 'http';
import { initDB } from './db/db';
import apiRoutes from './routes/api';
import { setupWebSocket } from './websocket';

const app = express();
const port = process.env.PORT || 3000;
console.log(`Configured to listen on port: ${port}`);

app.use(cors());
app.use(express.json());

// Init DB
try {
    console.log('Initializing database...');
    console.log('Current working directory:', process.cwd());
    initDB();
    console.log('Database initialized successfully.');
} catch (e) {
    console.error('Failed to initialize database:', e);
}

app.use('/api', apiRoutes);

app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});

// Serve static frontend files
import path from 'path';
const clientPath = path.join(__dirname, '../../client/dist');
app.use(express.static(clientPath));

// Fallback to index.html for SPA routing
app.get(/.*/, (req, res) => {
    if (req.path.startsWith('/api')) {
        return res.status(404).json({ error: 'Not Found' });
    }
    res.sendFile(path.join(clientPath, 'index.html'));
});

const server = http.createServer(app);

try {
    console.log('Setting up WebSocket server...');
    setupWebSocket(server);
    console.log('WebSocket server setup complete.');
} catch (e) {
    console.error('Failed to setup WebSocket server:', e);
}

console.log('Starting server initialization...');

try {
    server.listen(Number(port), '0.0.0.0', () => {
        console.log(`Server running on port ${port}`);
        console.log(`Health check available at http://0.0.0.0:${port}/health`);
    });
} catch (e) {
    console.error('Failed to start server:', e);
}

export { server, app };
