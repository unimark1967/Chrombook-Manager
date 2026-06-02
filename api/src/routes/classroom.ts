import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface ClassroomParams {
  id: string;
}

interface SceneBody {
  sceneId: string;
  actorId: string;
}

interface OverrideBody {
  grantedBy: string;
  targetDevice: string;
  urlPattern: string;
  expiresAt?: string;
}

interface NavigateBody {
  url: string;
  deviceId?: string;
}

interface LockBody {
  message?: string;
  deviceId?: string;
}

export async function classroomRoutes(fastify: FastifyInstance) {
  // POST /api/classroom/:id/lock
  fastify.post<{ Params: ClassroomParams; Body: LockBody }>(
    '/classroom/:id/lock',
    async (request: FastifyRequest<{ Params: ClassroomParams; Body: LockBody }>, reply: FastifyReply) => {
      const { id } = request.params;
      const { message, deviceId } = request.body ?? {};

      const session = await prisma.classroomSession.findFirst({
        where: { classroomId: id, endedAt: null },
      });

      if (!session) {
        return reply.status(404).send({ error: 'No active session for this classroom' });
      }

      await prisma.sessionEvent.create({
        data: {
          sessionId: session.id,
          eventType: 'lock',
          targetId: deviceId ?? null,
          payload: { message },
        },
      });

      // Emit via Socket.IO — access io from fastify instance
      const io = (fastify as unknown as { io: import('socket.io').Server }).io;
      if (io) {
        const payload = { type: 'lock', message, timestamp: Date.now() };
        if (deviceId) {
          io.to(`device:${deviceId}`).emit('device:lock', payload);
        } else {
          io.to(`classroom:${id}`).emit('device:lock', payload);
        }
      }

      return reply.send({ ok: true, sessionId: session.id });
    }
  );

  // POST /api/classroom/:id/unlock
  fastify.post<{ Params: ClassroomParams; Body: { deviceId?: string } }>(
    '/classroom/:id/unlock',
    async (request, reply) => {
      const { id } = request.params;
      const { deviceId } = request.body ?? {};

      const session = await prisma.classroomSession.findFirst({
        where: { classroomId: id, endedAt: null },
      });

      if (!session) {
        return reply.status(404).send({ error: 'No active session' });
      }

      await prisma.sessionEvent.create({
        data: {
          sessionId: session.id,
          eventType: 'unlock',
          targetId: deviceId ?? null,
        },
      });

      const io = (fastify as unknown as { io: import('socket.io').Server }).io;
      if (io) {
        const payload = { type: 'unlock', timestamp: Date.now() };
        if (deviceId) {
          io.to(`device:${deviceId}`).emit('device:unlock', payload);
        } else {
          io.to(`classroom:${id}`).emit('device:unlock', payload);
        }
      }

      return reply.send({ ok: true });
    }
  );

  // POST /api/classroom/:id/scene
  fastify.post<{ Params: ClassroomParams; Body: SceneBody }>(
    '/classroom/:id/scene',
    async (request, reply) => {
      const { id } = request.params;
      const { sceneId, actorId } = request.body;

      const [session, scene] = await Promise.all([
        prisma.classroomSession.findFirst({
          where: { classroomId: id, endedAt: null },
        }),
        prisma.scene.findUnique({
          where: { id: sceneId },
          include: { rules: true },
        }),
      ]);

      if (!session) return reply.status(404).send({ error: 'No active session' });
      if (!scene) return reply.status(404).send({ error: 'Scene not found' });

      await Promise.all([
        prisma.classroomSession.update({
          where: { id: session.id },
          data: { activeSceneId: sceneId },
        }),
        prisma.sessionEvent.create({
          data: {
            sessionId: session.id,
            eventType: 'scene_change',
            actorId,
            payload: { sceneId, sceneName: scene.name },
          },
        }),
      ]);

      const io = (fastify as unknown as { io: import('socket.io').Server }).io;
      if (io) {
        io.to(`classroom:${id}`).emit('scene:apply', {
          sceneId,
          sceneName: scene.name,
          rules: scene.rules,
          timestamp: Date.now(),
        });
      }

      return reply.send({ ok: true, scene: { id: scene.id, name: scene.name } });
    }
  );

  // POST /api/classroom/:id/override
  fastify.post<{ Params: ClassroomParams; Body: OverrideBody }>(
    '/classroom/:id/override',
    async (request, reply) => {
      const { id } = request.params;
      const { grantedBy, targetDevice, urlPattern, expiresAt } = request.body;

      const session = await prisma.classroomSession.findFirst({
        where: { classroomId: id, endedAt: null },
      });

      if (!session) return reply.status(404).send({ error: 'No active session' });

      const override = await prisma.teacherOverride.create({
        data: {
          sessionId: session.id,
          grantedBy,
          targetDevice,
          urlPattern,
          expiresAt: expiresAt ? new Date(expiresAt) : null,
        },
      });

      const io = (fastify as unknown as { io: import('socket.io').Server }).io;
      if (io) {
        io.to(`device:${targetDevice}`).emit('override:add', {
          id: override.id,
          urlPattern,
          expiresAt,
          timestamp: Date.now(),
        });
      }

      return reply.send({ ok: true, override });
    }
  );

  // POST /api/classroom/:id/navigate
  fastify.post<{ Params: ClassroomParams; Body: NavigateBody }>(
    '/classroom/:id/navigate',
    async (request, reply) => {
      const { id } = request.params;
      const { url, deviceId } = request.body;

      if (!url) return reply.status(400).send({ error: 'url is required' });

      const io = (fastify as unknown as { io: import('socket.io').Server }).io;
      if (io) {
        const target = deviceId ? `device:${deviceId}` : `classroom:${id}`;
        io.to(target).emit('tab:open', { url, timestamp: Date.now() });
      }

      return reply.send({ ok: true });
    }
  );
}
