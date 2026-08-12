import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { verifyAccessToken } from '../utils/jwt';
import { MessagingService } from '../modules/messaging/messaging.service';
import { logger } from '../utils/logger';

let ioInstance: Server | null = null;

export function initWebSocket(server: HttpServer): Server {
  const io = new Server(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });

  ioInstance = io;

  io.use((socket: Socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;
    if (!token) {
      return next(new Error('Authentication token missing'));
    }

    try {
      const payload = verifyAccessToken(token as string);
      (socket as any).user = payload;
      return next();
    } catch {
      return next(new Error('Invalid socket authentication token'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const user = (socket as any).user;
    logger.info(`🔌 Socket client connected: ${user.email} (${socket.id})`);

    // Join personal notification channel
    socket.join(`user:${user.userId}`);

    // Join role channels if admin
    const roles = user.roles || [user.role];
    if (roles.includes('ADMIN')) {
      socket.join('role:ADMIN');
    }

    // Join conversation room
    socket.on('join_conversation', (conversationId: string) => {
      socket.join(`conversation:${conversationId}`);
      logger.debug(`Socket ${socket.id} joined conversation:${conversationId}`);
    });

    socket.on('leave_conversation', (conversationId: string) => {
      socket.leave(`conversation:${conversationId}`);
      logger.debug(`Socket ${socket.id} left conversation:${conversationId}`);
    });

    // Send real-time message
    socket.on('send_message', async (data: { conversationId: string; text: string }) => {
      try {
        const messagingService = new MessagingService();
        const message = await messagingService.sendMessage(data.conversationId, user.userId, data.text);
        io.to(`conversation:${data.conversationId}`).emit('new_message', message);
      } catch (err: any) {
        socket.emit('error', { message: err.message });
      }
    });

    socket.on('disconnect', () => {
      logger.info(`Socket client disconnected: ${socket.id}`);
    });
  });

  return io;
}

export function getIO(): Server {
  if (!ioInstance) {
    throw new Error('Socket.IO instance has not been initialized');
  }
  return ioInstance;
}

export function emitToUser(userId: string, event: string, payload: any) {
  try {
    getIO().to(`user:${userId}`).emit(event, payload);
  } catch {
    // Graceful fallback during tests
  }
}

export function emitToAdmins(event: string, payload: any) {
  try {
    getIO().to('role:ADMIN').emit(event, payload);
  } catch {
    // Graceful fallback during tests
  }
}

export function emitToConversation(conversationId: string, event: string, payload: any) {
  try {
    getIO().to(`conversation:${conversationId}`).emit(event, payload);
  } catch {
    // Graceful fallback during tests
  }
}

