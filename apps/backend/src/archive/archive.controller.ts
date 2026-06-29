import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { Role } from '@prisma/client';
import { ArchiveService } from './archive.service';
import { Roles } from '../auth/decorators/roles.decorator';

// Orders/sales cold-storage archive — owner only (export/purge is destructive).
@Roles(Role.OWNER)
@Controller('archive')
export class ArchiveController {
  constructor(private readonly archive: ArchiveService) {}

  @Get()
  list() {
    return this.archive.list();
  }

  @Post()
  create(@Body('scope') scope?: string) {
    return this.archive.archive(scope === 'all' ? 'all' : 'terminal');
  }

  @Get(':id')
  getFile(@Param('id') id: string) {
    return this.archive.getFile(id);
  }

  @Post(':id/restore')
  restore(@Param('id') id: string) {
    return this.archive.restore(id);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.archive.deleteArchive(id);
  }
}
