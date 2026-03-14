import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

const L10N_CACHE_TTL = 5 * 60 * 1000; // 5분

@Injectable()
export class ItemsService {
  private readonly bserApiKey: string;
  private l10nCache: { data: Record<string, string>; expiresAt: number } | null = null;

  constructor(private configService: ConfigService) {
    this.bserApiKey = this.configService.get<string>('BSER_API_KEY') ?? '';
  }

  private async fetchL10n(): Promise<Record<string, string> | null> {
    if (this.l10nCache && Date.now() < this.l10nCache.expiresAt) {
      return this.l10nCache.data;
    }
    if (!this.bserApiKey) return null;

    const res = await fetch('https://open-api.bser.io/v1/l10n/Korean', {
      headers: { 'x-api-key': this.bserApiKey },
    });
    if (!res.ok) return null;

    const json = (await res.json()) as { data?: Record<string, string> };
    const data = json.data ?? {};
    this.l10nCache = { data, expiresAt: Date.now() + L10N_CACHE_TTL };
    return data;
  }

  async getItemNames() {
    if (!this.bserApiKey) return { error: 'BSER_API_KEY is not configured' };
    const l10n = await this.fetchL10n();
    if (!l10n) return { error: 'Failed to fetch L10n data' };

    const items: Record<string, string> = {};
    for (const [key, value] of Object.entries(l10n)) {
      if (key.startsWith('Item/Name/')) items[key.replace('Item/Name/', '')] = value;
    }
    return { items };
  }

  async getTraitNames() {
    if (!this.bserApiKey) return { error: 'BSER_API_KEY is not configured' };
    const l10n = await this.fetchL10n();
    if (!l10n) return { error: 'Failed to fetch L10n data' };

    const traits: Record<string, string> = {};
    for (const [key, value] of Object.entries(l10n)) {
      if (key.startsWith('Trait/Name/')) traits[key.replace('Trait/Name/', '')] = value;
    }
    return { traits };
  }
}
