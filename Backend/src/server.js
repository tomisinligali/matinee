require('dotenv').config();

const app = require('./app');
const prisma = require('./config/db');
const { startWorker, stopWorker } = require('./modules/jobs/jobWorker');

const PORT = parseInt(process.env.PORT, 10) || 4000;
const HOST = process.env.HOST || '0.0.0.0';

const server = app.listen(PORT, HOST, () => {
  console.log(`[Matinee Backend] Server running on http://${HOST}:${PORT}`);
  console.log(`[Matinee Backend] Local health check available at http://localhost:${PORT}/health`);
  
  // Start durable background worker for webhooks, hold cleanup, and refunds
  startWorker(2000);
});

// Graceful Shutdown
const gracefulShutdown = async (signal) => {
  console.log(`\n[Matinee Backend] Received ${signal}. Closing HTTP server...`);
  
  // Stop background worker
  stopWorker();

  server.close(async () => {
    console.log('[Matinee Backend] HTTP server closed. Disconnecting database...');
    await prisma.$disconnect();
    console.log('[Matinee Backend] Database disconnected. Exit complete.');
    process.exit(0);
  });
};

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
