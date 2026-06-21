import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
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

  // Declared before ':id' so these literal paths match first.
  @Public()
  @Get('meta/categories')
  categories() {
    return this.products.listCategories();
  }

  @Public()
  @Get('meta/facets')
  facets(@Query('categoryId') categoryId?: string) {
    return this.products.facets(categoryId);
  }

  @Roles(Role.OWNER, Role.EMPLOYEE)
  @Get('meta/shops')
  shops() {
    return this.products.listShops();
  }

  @Public()
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.products.findOne(id);
  }

  // ---- Product Q&A ----
  @Public()
  @Get(':id/questions')
  questions(@Param('id') id: string) {
    return this.products.listQuestions(id);
  }

  @Roles(Role.CUSTOMER)
  @Post(':id/questions')
  ask(
    @Param('id') id: string,
    @Body('question') question: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.products.askQuestion(user.id, id, question);
  }

  @Roles(Role.OWNER, Role.EMPLOYEE)
  @Patch('questions/:questionId/answer')
  answer(
    @Param('questionId') questionId: string,
    @Body('answer') answer: string,
  ) {
    return this.products.answerQuestion(questionId, answer, 'Store');
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
