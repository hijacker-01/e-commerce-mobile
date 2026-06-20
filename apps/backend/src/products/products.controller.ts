import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { Role } from '@prisma/client';
import { ProductsService } from './products.service';
import { CreateProductDto, ProductQueryDto } from './dto/product.dto';
import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { CurrentUser, AuthUser } from '../auth/decorators/current-user.decorator';
import { AuditService } from '../audit/audit.service';

@Controller('products')
export class ProductsController {
  constructor(
    private readonly products: ProductsService,
    private readonly audit: AuditService,
  ) {}

  @Public()
  @Get()
  list(@Query() query: ProductQueryDto) {
    return this.products.list(query);
  }

  @Public()
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.products.findOne(id);
  }

  // Owner or an employee with 'product.write' may list items.
  @Roles(Role.OWNER, Role.EMPLOYEE)
  @RequirePermissions('product.write')
  @Post()
  async create(@Body() dto: CreateProductDto, @CurrentUser() user: AuthUser) {
    const product = await this.products.create(dto);
    await this.audit.log(user.id, 'create', 'product', product.id, {
      title: product.title,
    });
    return product;
  }
}
