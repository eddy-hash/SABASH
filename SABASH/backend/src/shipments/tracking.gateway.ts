import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';

@WebSocketGateway({ cors: { origin: '*' } })
export class TrackingGateway {
  @WebSocketServer()
  server: Server;

  emitLocationUpdate(trackingCode: string, data: any) {
    this.server.emit('track_' + trackingCode, data);
  }
}
