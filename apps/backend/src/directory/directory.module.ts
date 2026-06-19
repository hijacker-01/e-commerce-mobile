import { Module } from '@nestjs/common';
import { ServiceCentersService } from './service-centers.service';
import { ServiceCentersController } from './service-centers.controller';
import { LobbyService } from './lobby.service';
import { LobbyController } from './lobby.controller';

// Service-center directory + curated special lobby.
@Module({
  providers: [ServiceCentersService, LobbyService],
  controllers: [ServiceCentersController, LobbyController],
})
export class DirectoryModule {}
