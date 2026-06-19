import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
} from '@nestjs/common';
import { IsInt, IsOptional, IsString } from 'class-validator';
import { Role } from '@prisma/client';
import { LobbyService } from './lobby.service';
import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../auth/decorators/roles.decorator';

class AddLobbyItemDto {
  @IsString()
  productId!: string;

  @IsOptional()
  @IsInt()
  position?: number;

  @IsOptional()
  @IsString()
  bannerUrl?: string;
}

@Controller('lobby')
export class LobbyController {
  constructor(private readonly lobby: LobbyService) {}

  @Public()
  @Get()
  list() {
    return this.lobby.list();
  }

  // Owner curates the special lobby.
  @Roles(Role.OWNER)
  @Post()
  add(@Body() dto: AddLobbyItemDto) {
    return this.lobby.add(dto.productId, dto.position, dto.bannerUrl);
  }

  @Roles(Role.OWNER)
  @Delete(':productId')
  remove(@Param('productId') productId: string) {
    return this.lobby.remove(productId);
  }
}
