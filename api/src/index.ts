import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import { Server as SocketIOServer } from 'socket.io';
import { createServer } from 'http';
import { registerClassroomSocket } from './socket/classroom';
import { classroomRoutes } from './routes/classroom';

const PORT = parseInt(process.env.PORT ?? '3001', 10);
const WEB_ORIGIN = process.env.WEB_ORIGIN ?? 'http://localhost:3000';

async function bootstrap() {
  const fastify = Fastify({
    logger: { level: process.env.NODE_ENV === 'production' ? 'warn' : 'info' },
  });

  await fastify.register(cors, {
    origin: [WEB_ORIGIN],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  });

  // Health check
  fastify.get('/health', async () => ({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  }));

  // REST routes
  await fastify.register(classroomRoutes, { prefix: '/api' });

  // Build HTTP server from Fastify and attach Socket.IO
  const httpServer = createServer(fastify.server);

  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: [WEB_ORIGIN, 'chrome-extension://*'],
      credentials: true,
    },
    transports: ['websocket', 'polling'],
  });

  registerClassroomSocket(io);

  // Start
  await fastify.ready();

  httpServer.listen(PORT, '0.0.0.0', () => {
    fastify.log.info(`API server listening on port ${PORT}`);
  });

  // Graceful shutdown
  const shutdown = async () => {
    fastify.log.info('Shutting down...');
    io.close();
    httpServer.close();
    await fastify.close();
    process.exit(0);
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

bootstrap().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
