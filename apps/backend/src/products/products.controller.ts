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

  // Self-learning autocomplete + auto-fill data for the Add-product form.
  @Roles(Role.OWNER, Role.EMPLOYEE)
  @Get('meta/catalog-suggest')
  catalogSuggest() {
    return this.products.catalogSuggest();
  }

  @Roles(Role.OWNER, Role.EMPLOYEE)
  @Get('meta/questions')
  allQuestions(@Query('unanswered') unanswered?: string) {
    return this.products.listAllQuestions(unanswered === 'true');
  }

  // Exact live stock for staff (owner/employee only — never customers/stockists).
  @Roles(Role.OWNER, Role.EMPLOYEE)
  @Get('meta/stock')
  stock() {
    return this.products.listStock();
  }

  @Roles(Role.OWNER, Role.EMPLOYEE)
  @Patch(':id/stock')
  async setStock(
    @Param('id') id: string,
    @Body('quantity') quantity: number,
    @Body('reorderLevel') reorderLevel: number | undefined,
    @CurrentUser() user: AuthUser,
  ) {
    const res = await this.products.setStock(id, Number(quantity), reorderLevel);
    await this.audit.log(user.id, 'stock', 'product', id, {
      quantity: res.quantity,
    });
    return res;
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

  // Toggle merchandising flags (New arrival).
  @Roles(Role.OWNER, Role.EMPLOYEE)
  @Patch(':id/flags')
  setFlags(@Param('id') id: string, @Body('isNew') isNew?: boolean) {
    return this.products.setFlags(id, { isNew });
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
