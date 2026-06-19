import { Body, Controller, Post } from '@nestjs/common';
import { Role } from '@prisma/client';
import { AiService } from './ai.service';
import { CompareDto, RecommendDto, DraftListingDto } from './dto/ai.dto';
import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';

@Controller('ai')
export class AiController {
  constructor(private readonly ai: AiService) {}

  // Public so shoppers can compare/recommend before signing in.
  @Public()
  @Post('compare')
  compare(@Body() dto: CompareDto) {
    return this.ai.compare(dto.productIds);
  }

  @Public()
  @Post('recommend')
  recommend(@Body() dto: RecommendDto) {
    return this.ai.recommend(dto.query, dto.categoryId);
  }

  // Low-effort listing assist — owner/employee with product.write only.
  @Roles(Role.OWNER, Role.EMPLOYEE)
  @RequirePermissions('product.write')
  @Post('draft-listing')
  draftListing(@Body() dto: DraftListingDto) {
    return this.ai.draftListing(dto.brand, dto.model, dto.category);
  }
}
