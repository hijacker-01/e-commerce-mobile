import { Controller, Get, Post, Query } from '@nestjs/common';
import { Role } from '@prisma/client';
import { SearchService } from './search.service';
import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('search')
export class SearchController {
  constructor(private readonly search: SearchService) {}

  @Public()
  @Get()
  query(
    @Query('q') q?: string,
    @Query('brand') brand?: string,
    @Query('maxPrice') maxPrice?: string,
  ) {
    return this.search.search({
      q,
      brand,
      maxPrice: maxPrice ? Number(maxPrice) : undefined,
    });
  }

  // Backfill the search index from the catalog.
  @Roles(Role.OWNER, Role.EMPLOYEE)
  @Post('reindex')
  reindex() {
    return this.search.reindexAll();
  }
}
