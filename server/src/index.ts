
import express from 'express';
import cors from 'cors';
import http from 'http';
import { initDB } from './db/db';
import apiRoutes from './routes/api';
import { setupWebSocket } from './websocket';

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Init DB
initDB();

app.use('/api', apiRoutes);

app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});

// Serve static frontend files
import path from 'path';
const clientPath = path.join(__dirname, '../../client/dist');
app.use(express.static(clientPath));

// Fallback to index.html for SPA routing
app.get('*', (req, res) => {
    if (req.path.startsWith('/api')) {
        return res.status(404).json({ error: 'Not Found' });
    }
    res.sendFile(path.join(clientPath, 'index.html'));
});

const server = http.createServer(app);

setupWebSocket(server);

server.listen(port, () => {
    console.log(`Server running on port ${port}`);
});

export { server, app };
