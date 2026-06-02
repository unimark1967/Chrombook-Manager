import type { Server as SocketIOServer, Socket } from 'socket.io';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface DeviceRegistration {
  deviceId: string;
  classroomId: string;
  sessionId?: string;
  studentId?: string;
}

interface TabEvent {
  sessionId: string;
  deviceId: string;
  tabId: number;
  url: string;
  title?: string;
}

interface ChatPayload {
  sessionId: string;
  fromUser: string;
  toUser?: string;
  message: string;
  type: 'announcement' | 'private' | 'reaction';
}

interface ScenePayload {
  classroomId: string;
  sessionId: string;
  sceneId: string;
}

interface OverridePayload {
  sessionId: string;
  targetDevice: string;
  urlPattern: string;
  expiresAt?: string;
}

interface ScreenFrame {
  deviceId: string;
  classroomId: string;
  dataUrl: string;
  timestamp: number;
}

// Track which socket belongs to which device
const deviceSocketMap = new Map<string, string>(); // deviceId -> socketId
const socketDeviceMap = new Map<string, string>(); // socketId -> deviceId

export function registerClassroomSocket(io: SocketIOServer) {
  io.on('connection', (socket: Socket) => {
    console.log(`[socket] connected: ${socket.id}`);

    // --- Device Registration ---
    socket.on('device:register', async (data: DeviceRegistration) => {
      const { deviceId, classroomId, sessionId, studentId } = data;

      deviceSocketMap.set(deviceId, socket.id);
      socketDeviceMap.set(socket.id, deviceId);

      // Join rooms
      await socket.join(`classroom:${classroomId}`);
      await socket.join(`device:${deviceId}`);

      // Update last seen in DB
      try {
        await prisma.device.update({
          where: { googleDeviceId: deviceId },
          data: { lastSeen: new Date(), status: 'active' },
        });
      } catch {
        // Device might not exist yet (first time)
      }

      // Notify teachers in the classroom
      socket.to(`classroom:${classroomId}`).emit('device:online', {
        deviceId,
        studentId,
        sessionId,
        timestamp: Date.now(),
      });

      socket.emit('device:registered', { ok: true, deviceId });
      console.log(`[socket] device ${deviceId} registered to classroom ${classroomId}`);
    });

    // --- Lock / Unlock ---
    socket.on('device:lock', async (data: { classroomId: string; deviceId?: string; message?: string }) => {
      const payload = { type: 'lock', message: data.message, timestamp: Date.now() };

      if (data.deviceId) {
        io.to(`device:${data.deviceId}`).emit('device:lock', payload);
      } else {
        io.to(`classroom:${data.classroomId}`).emit('device:lock', payload);
      }
    });

    socket.on('device:unlock', async (data: { classroomId: string; deviceId?: string }) => {
      const payload = { type: 'unlock', timestamp: Date.now() };

      if (data.deviceId) {
        io.to(`device:${data.deviceId}`).emit('device:unlock', payload);
      } else {
        io.to(`classroom:${data.classroomId}`).emit('device:unlock', payload);
      }
    });

    // --- Tab Management ---
    socket.on('tab:open', (data: { classroomId: string; url: string; deviceId?: string }) => {
      const target = data.deviceId
        ? `device:${data.deviceId}`
        : `classroom:${data.classroomId}`;
      io.to(target).emit('tab:open', { url: data.url, timestamp: Date.now() });
    });

    socket.on('tab:close', (data: { classroomId: string; tabId?: number; deviceId?: string }) => {
      const target = data.deviceId
        ? `device:${data.deviceId}`
        : `classroom:${data.classroomId}`;
      io.to(target).emit('tab:close', { tabId: data.tabId, timestamp: Date.now() });
    });

    socket.on('tab:closeAll', (data: { classroomId: string; deviceId?: string }) => {
      const target = data.deviceId
        ? `device:${data.deviceId}`
        : `classroom:${data.classroomId}`;
      io.to(target).emit('tab:closeAll', { timestamp: Date.now() });
    });

    socket.on('tab:focus', (data: { classroomId: string; tabId: number; deviceId?: string }) => {
      const target = data.deviceId
        ? `device:${data.deviceId}`
        : `classroom:${data.classroomId}`;
      io.to(target).emit('tab:focus', { tabId: data.tabId, timestamp: Date.now() });
    });

    // --- Tab history from extension ---
    socket.on('history:visit', async (data: TabEvent) => {
      try {
        const session = await prisma.classroomSession.findFirst({
          where: { id: data.sessionId, endedAt: null },
        });
        if (session) {
          await prisma.browsingHistory.create({
            data: {
              sessionId: data.sessionId,
              deviceId: data.deviceId,
              url: data.url,
              pageTitle: data.title,
            },
          });
        }
      } catch (err) {
        console.error('[socket] history:visit error', err);
      }

      // Forward to teacher room
      const deviceId = socketDeviceMap.get(socket.id);
      if (deviceId) {
        socket.broadcast.emit(`history:visit:${deviceId}`, data);
      }
    });

    // --- Screenshots ---
    socket.on('screen:frame', (data: ScreenFrame) => {
      // Forward compressed screenshot to teacher in classroom
      socket.to(`classroom:${data.classroomId}`).emit(`screen:frame:${data.deviceId}`, {
        deviceId: data.deviceId,
        dataUrl: data.dataUrl,
        timestamp: data.timestamp,
      });
    });

    socket.on('screenshot:request', (data: { deviceId: string; requestedBy: string }) => {
      io.to(`device:${data.deviceId}`).emit('screenshot:request', {
        requestedBy: data.requestedBy,
        timestamp: Date.now(),
      });
    });

    // --- Chat ---
    socket.on('chat:send', async (data: ChatPayload) => {
      try {
        const msg = await prisma.chatMessage.create({
          data: {
            sessionId: data.sessionId,
            fromUser: data.fromUser,
            toUser: data.toUser ?? null,
            message: data.message,
            type: data.type,
          },
          include: { sender: { select: { name: true, image: true } } },
        });

        const outgoing = {
          id: msg.id,
          fromUser: data.fromUser,
          senderName: msg.sender.name,
          senderImage: msg.sender.image,
          toUser: data.toUser,
          message: data.message,
          type: data.type,
          sentAt: msg.sentAt,
        };

        if (data.toUser) {
          // Private message: send to recipient's device socket
          socket.to(`device:${data.toUser}`).emit('chat:receive', outgoing);
          socket.emit('chat:receive', outgoing); // echo to sender
        } else {
          // Announcement: broadcast to whole session / classroom
          io.to(`session:${data.sessionId}`).emit('chat:receive', outgoing);
        }
      } catch (err) {
        console.error('[socket] chat:send error', err);
        socket.emit('chat:error', { message: 'Failed to send message' });
      }
    });

    // --- Scene ---
    socket.on('scene:apply', async (data: ScenePayload) => {
      try {
        const scene = await prisma.scene.findUnique({
          where: { id: data.sceneId },
          include: { rules: true },
        });

        if (!scene) {
          socket.emit('scene:error', { message: 'Scene not found' });
          return;
        }

        await prisma.classroomSession.update({
          where: { id: data.sessionId },
          data: { activeSceneId: data.sceneId },
        });

        io.to(`classroom:${data.classroomId}`).emit('scene:apply', {
          sceneId: data.sceneId,
          sceneName: scene.name,
          rules: scene.rules,
          timestamp: Date.now(),
        });
      } catch (err) {
        console.error('[socket] scene:apply error', err);
      }
    });

    // --- Overrides ---
    socket.on('override:add', async (data: OverridePayload & { classroomId: string; grantedBy: string }) => {
      try {
        const override = await prisma.teacherOverride.create({
          data: {
            sessionId: data.sessionId,
            grantedBy: data.grantedBy,
            targetDevice: data.targetDevice,
            urlPattern: data.urlPattern,
            expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
          },
        });

        io.to(`device:${data.targetDevice}`).emit('override:add', {
          id: override.id,
          urlPattern: data.urlPattern,
          expiresAt: data.expiresAt,
          timestamp: Date.now(),
        });
      } catch (err) {
        console.error('[socket] override:add error', err);
      }
    });

    socket.on('override:remove', async (data: { overrideId: string; targetDevice: string }) => {
      try {
        await prisma.teacherOverride.update({
          where: { id: data.overrideId },
          data: { revokedAt: new Date() },
        });

        io.to(`device:${data.targetDevice}`).emit('override:remove', {
          id: data.overrideId,
          timestamp: Date.now(),
        });
      } catch (err) {
        console.error('[socket] override:remove error', err);
      }
    });

    // --- Heartbeat ---
    socket.on('heartbeat', (data: { deviceId: string }) => {
      if (data.deviceId) {
        prisma.device
          .update({
            where: { googleDeviceId: data.deviceId },
            data: { lastSeen: new Date() },
          })
          .catch(() => {});
      }
      socket.emit('heartbeat:ack', { timestamp: Date.now() });
    });

    // --- Disconnect ---
    socket.on('disconnect', async () => {
      const deviceId = socketDeviceMap.get(socket.id);

      if (deviceId) {
        deviceSocketMap.delete(deviceId);
        socketDeviceMap.delete(socket.id);

        // Mark device as inactive
        try {
          await prisma.device.update({
            where: { googleDeviceId: deviceId },
            data: { status: 'inactive', lastSeen: new Date() },
          });
        } catch {
          // ignore
        }

        // Notify all rooms
        socket.broadcast.emit('device:offline', {
          deviceId,
          timestamp: Date.now(),
        });
      }

      console.log(`[socket] disconnected: ${socket.id}`);
    });
  });
}
