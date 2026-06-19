import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { IsOptional, IsString } from 'class-validator';
import { Role } from '@prisma/client';
import { ChatService } from './chat.service';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser, AuthUser } from '../auth/decorators/current-user.decorator';

class CreateThreadDto {
  @IsOptional()
  @IsString()
  productId?: string;
}

// REST surface for thread/message history; live updates come over /chat WS.
@Controller('chat')
export class ChatController {
  constructor(private readonly chat: ChatService) {}

  @Get('threads')
  threads(@CurrentUser() user: AuthUser) {
    return this.chat.listThreads(user);
  }

  @Roles(Role.CUSTOMER)
  @Post('threads')
  createThread(@CurrentUser() user: AuthUser, @Body() dto: CreateThreadDto) {
    return this.chat.getOrCreateThread(user.id, dto.productId);
  }

  @Get('threads/:id/messages')
  messages(@Param('id') id: string) {
    return this.chat.listMessages(id);
  }
}
