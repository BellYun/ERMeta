"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ItemsService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const L10N_CACHE_TTL = 5 * 60 * 1000;
let ItemsService = class ItemsService {
    constructor(configService) {
        this.configService = configService;
        this.l10nCache = null;
        this.bserApiKey = this.configService.get('BSER_API_KEY') ?? '';
    }
    async fetchL10n() {
        if (this.l10nCache && Date.now() < this.l10nCache.expiresAt) {
            return this.l10nCache.data;
        }
        if (!this.bserApiKey)
            return null;
        const res = await fetch('https://open-api.bser.io/v1/l10n/Korean', {
            headers: { 'x-api-key': this.bserApiKey },
        });
        if (!res.ok)
            return null;
        const json = (await res.json());
        const data = json.data ?? {};
        this.l10nCache = { data, expiresAt: Date.now() + L10N_CACHE_TTL };
        return data;
    }
    async getItemNames() {
        if (!this.bserApiKey)
            return { error: 'BSER_API_KEY is not configured' };
        const l10n = await this.fetchL10n();
        if (!l10n)
            return { error: 'Failed to fetch L10n data' };
        const items = {};
        for (const [key, value] of Object.entries(l10n)) {
            if (key.startsWith('Item/Name/'))
                items[key.replace('Item/Name/', '')] = value;
        }
        return { items };
    }
    async getTraitNames() {
        if (!this.bserApiKey)
            return { error: 'BSER_API_KEY is not configured' };
        const l10n = await this.fetchL10n();
        if (!l10n)
            return { error: 'Failed to fetch L10n data' };
        const traits = {};
        for (const [key, value] of Object.entries(l10n)) {
            if (key.startsWith('Trait/Name/'))
                traits[key.replace('Trait/Name/', '')] = value;
        }
        return { traits };
    }
};
exports.ItemsService = ItemsService;
exports.ItemsService = ItemsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], ItemsService);
//# sourceMappingURL=items.service.js.map