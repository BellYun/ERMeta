import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '../../common/redis/redis.service';

@Injectable()
export class ItemsService {
  private readonly bserApiKey: string;

  constructor(
    private configService: ConfigService,
    private readonly redis: RedisService,
  ) {
    this.bserApiKey = this.configService.get<string>('BSER_API_KEY') ?? '';
  }

  private async fetchL10n(): Promise<Record<string, string> | null> {
    if (!this.bserApiKey) return null;

    const res = await fetch('https://open-api.bser.io/v1/l10n/Korean', {
      headers: { 'x-api-key': this.bserApiKey },
    });
    if (!res.ok) return null;

    const json = (await res.json()) as { data?: Record<string, string> };
    return json.data ?? {};
  }

  async getItemNames() {
    if (!this.bserApiKey) return { error: 'BSER_API_KEY is not configured' };

    return this.redis.getOrSet('lookup:items', 86400, async () => {
      const l10n = await this.fetchL10n();
      if (!l10n) return { error: 'Failed to fetch L10n data' };

      const items: Record<string, string> = {};
      for (const [key, value] of Object.entries(l10n)) {
        if (key.startsWith('Item/Name/')) items[key.replace('Item/Name/', '')] = value;
      }
      return { items };
    });
  }

  async getTraitNames() {
    if (!this.bserApiKey) return { error: 'BSER_API_KEY is not configured' };

    return this.redis.getOrSet('lookup:traits', 86400, async () => {
      const l10n = await this.fetchL10n();
      if (!l10n) return { error: 'Failed to fetch L10n data' };

      const traits: Record<string, string> = {};
      for (const [key, value] of Object.entries(l10n)) {
        if (key.startsWith('Trait/Name/')) traits[key.replace('Trait/Name/', '')] = value;
      }
      return { traits };
    });
  }
}
