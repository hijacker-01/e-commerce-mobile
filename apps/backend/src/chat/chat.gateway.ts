import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { OfferMessageStatus } from '@prisma/client';
import { Server, Socket } from 'socket.io';
import { ChatService } from './chat.service';
import { JwtPayload } from '../auth/strategies/jwt.strategy';

const room = (threadId: string) => `thread:${threadId}`;

@WebSocketGateway({ cors: { origin: true }, namespace: '/chat' })
export class ChatGateway implements OnGatewayConnection {
  @WebSocketServer() server!: Server;
  private readonly logger = new Logger(ChatGateway.name);

  constructor(
    private readonly chat: ChatService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  // Authenticate the socket from the handshake bearer token.
  handleConnection(client: Socket) {
    try {
      const token =
        (client.handshake.auth?.token as string | undefined) ??
        client.handshake.headers.authorization?.replace('Bearer ', '');
      if (!token) throw new Error('No token');
      const payload = this.jwt.verify<JwtPayload>(token, {
        secret: this.config.get('JWT_ACCESS_SECRET'),
      });
      client.data.user = { id: payload.sub, role: payload.role };
    } catch {
      this.logger.warn('Rejected unauthenticated socket');
      client.disconnect(true);
    }
  }

  @SubscribeMessage('thread:join')
  join(@ConnectedSocket() client: Socket, @MessageBody() body: { threadId: string }) {
    client.join(room(body.threadId));
    return { joined: body.threadId };
  }

  @SubscribeMessage('message:send')
  async sendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { threadId: string; text: string },
  ) {
    const userId = client.data.user.id as string;
    const msg = await this.chat.addMessage(body.threadId, userId, body.text);
    this.server.to(room(body.threadId)).emit('message:new', msg);
    return msg;
  }

  @SubscribeMessage('offer:make')
  async makeOffer(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { threadId: string; amount: number },
  ) {
    const userId = client.data.user.id as string;
    const msg = await this.chat.makeOffer(body.threadId, userId, body.amount);
    this.server.to(room(body.threadId)).emit('offer:new', msg);
    return msg;
  }

  @SubscribeMessage('offer:respond')
  async respondOffer(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    body: { threadId: string; messageId: string; status: OfferMessageStatus },
  ) {
    const msg = await this.chat.respondOffer(body.messageId, body.status);
    this.server.to(room(body.threadId)).emit('offer:update', msg);
    return msg;
  }
}
