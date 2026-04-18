import { WebSocketServer, WebSocket } from 'ws';
import { userProfileService } from './user-profile.service';
import { segmentEngineService } from './segment-engine.service';
import { logger } from '../utils/logger';

interface RealTimeClient {
  ws: WebSocket;
  tenantId: string;
  userId?: string;
  segments?: string[];
}

export class RealTimeService {
  private wss: WebSocketServer | null = null;
  private clients: Map<string, RealTimeClient> = new Map();
  private heartbeatInterval: NodeJS.Timeout | null = null;

  initialize(server: any): void {
    this.wss = new WebSocketServer({ server, path: '/ws' });

    this.wss.on('connection', (ws: WebSocket, request) => {
      this.handleConnection(ws, request);
    });

    this.startHeartbeat();
    logger.info('WebSocket server initialized');
  }

  private handleConnection(ws: WebSocket, request: any): void {
    const url = new URL(request.url, `http://${request.headers.host}`);
    const tenantId = url.searchParams.get('tenantId');
    const userId = url.searchParams.get('userId');

    if (!tenantId) {
      ws.close(1008, 'Tenant ID required');
      return;
    }

    const clientId = this.generateClientId();
    const client: RealTimeClient = { ws, tenantId, userId };

    this.clients.set(clientId, client);

    // Send initial segments if userId provided
    if (userId) {
      this.sendUserSegments(tenantId, userId, clientId);
    }

    ws.on('message', (data) => {
      this.handleMessage(clientId, data.toString());
    });

    ws.on('close', () => {
      this.handleDisconnection(clientId);
    });

    ws.on('error', (error) => {
      logger.error('WebSocket error:', error);
      this.handleDisconnection(clientId);
    });

    logger.info('WebSocket client connected', { clientId, tenantId, userId });
  }

  private async handleMessage(clientId: string, message: string): Promise<void> {
    try {
      const data = JSON.parse(message);
      const client = this.clients.get(clientId);

      if (!client) return;

      switch (data.type) {
        case 'ping':
          this.sendToClient(clientId, { type: 'pong', timestamp: Date.now() });
          break;
        
        case 'subscribe_user':
          if (data.userId) {
            client.userId = data.userId;
            await this.sendUserSegments(client.tenantId, data.userId, clientId);
          }
          break;
        
        case 'unsubscribe_user':
          client.userId = undefined;
          client.segments = undefined;
          break;
        
        case 'user_updated':
          if (data.userId && data.updates) {
            await this.handleUserUpdate(client.tenantId, data.userId, data.updates);
          }
          break;
        
        default:
          logger.warn('Unknown message type:', data.type);
      }
    } catch (error) {
      logger.error('Error handling WebSocket message:', error);
    }
  }

  private handleDisconnection(clientId: string): void {
    this.clients.delete(clientId);
    logger.info('WebSocket client disconnected', { clientId });
  }

  private async sendUserSegments(tenantId: string, userId: string, clientId: string): Promise<void> {
    try {
      const segments = await userProfileService.recalculateUserSegments(tenantId, userId);
      const client = this.clients.get(clientId);
      
      if (client) {
        client.segments = segments;
        this.sendToClient(clientId, {
          type: 'user_segments',
          userId,
          segments,
          timestamp: Date.now()
        });
      }
    } catch (error) {
      logger.error('Error sending user segments:', error);
    }
  }

  async notifyUserSegmentChange(tenantId: string, userId: string, segments: string[]): Promise<void> {
    const message = {
      type: 'segments_updated',
      userId,
      segments,
      timestamp: Date.now()
    };

    this.broadcastToTenant(tenantId, message);
    
    // Notify specific user subscribers
    this.clients.forEach((client, clientId) => {
      if (client.tenantId === tenantId && client.userId === userId) {
        this.sendToClient(clientId, message);
      }
    });
  }

  async notifySegmentUpdate(tenantId: string, segmentId: string): Promise<void> {
    const message = {
      type: 'segment_updated',
      segmentId,
      timestamp: Date.now()
    };

    this.broadcastToTenant(tenantId, message);

    // Recalculate segments for users subscribed to this segment
    const affectedClients = Array.from(this.clients.values()).filter(
      client => client.tenantId === tenantId && client.segments?.includes(segmentId)
    );

    for (const client of affectedClients) {
      if (client.userId) {
        await this.sendUserSegments(tenantId, client.userId, this.getClientId(client));
      }
    }
  }

  private async handleUserUpdate(tenantId: string, userId: string, updates: any): Promise<void> {
    try {
      await userProfileService.createOrUpdateUserProfile(tenantId, userId, updates);
      
      // Notify segment changes
      const segments = await userProfileService.recalculateUserSegments(tenantId, userId);
      await this.notifyUserSegmentChange(tenantId, userId, segments);
    } catch (error) {
      logger.error('Error handling user update:', error);
    }
  }

  private broadcastToTenant(tenantId: string, message: any): void {
    this.clients.forEach((client, clientId) => {
      if (client.tenantId === tenantId) {
        this.sendToClient(clientId, message);
      }
    });
  }

  private sendToClient(clientId: string, message: any): void {
    const client = this.clients.get(clientId);
    if (client && client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(JSON.stringify(message));
    }
  }

  private getClientId(client: RealTimeClient): string {
    for (const [id, c] of this.clients.entries()) {
      if (c === client) return id;
    }
    return '';
  }

  private generateClientId(): string {
    return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      this.clients.forEach((client, clientId) => {
        if (client.ws.readyState === WebSocket.OPEN) {
          this.sendToClient(clientId, { type: 'ping', timestamp: Date.now() });
        }
      });
    }, 30000); // Every 30 seconds
  }

  stop(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    this.clients.forEach((client) => {
      client.ws.close();
    });

    this.clients.clear();

    if (this.wss) {
      this.wss.close();
    }

    logger.info('RealTime service stopped');
  }
}

export const realTimeService = new RealTimeService();