import { Controller, Get, UseInterceptors } from '@nestjs/common';
import { ItemsService } from './items.service';
import { CacheControlInterceptor } from '../../common/interceptors/cache-control.interceptor';

@Controller()
export class ItemsController {
  constructor(private readonly itemsService: ItemsService) {}

  @Get('items/names')
  @UseInterceptors(CacheControlInterceptor('slow'))
  async getItemNames() {
    return this.itemsService.getItemNames();
  }

  @Get('traits/names')
  @UseInterceptors(CacheControlInterceptor('slow'))
  async getTraitNames() {
    return this.itemsService.getTraitNames();
  }
}
