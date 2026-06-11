import { Controller, Get, Param, Res } from '@nestjs/common';
import { Response } from 'express';
import { SynergyPairsService } from './synergy-pairs.service';

@Controller('synergy-pairs')
export class SynergyPairsController {
  constructor(private readonly synergyPairsService: SynergyPairsService) {}

  @Get(':code')
  async getSynergyPairs(@Param('code') code: string, @Res() response: Response) {
    if (!/^\d+$/.test(code)) {
      return response.status(400).json({ error: 'invalid code' });
    }

    const raw = await this.synergyPairsService.readPairJson(code);
    if (!raw) {
      return response.status(404).json({ error: 'not found' });
    }

    response.setHeader('Content-Type', 'application/json');
    response.setHeader('Cache-Control', 'public, max-age=3600, stale-while-revalidate=86400');
    return response.status(200).send(raw);
  }
}
