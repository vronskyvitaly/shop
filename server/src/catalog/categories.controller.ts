import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CategoriesService } from './categories.service.js';

// ───────── Витрина: доступна всем, в том числе гостям ─────────

@ApiTags('catalog')
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categories: CategoriesService) {}

  @Get()
  findAll() {
    return this.categories.findAll();
  }
}
