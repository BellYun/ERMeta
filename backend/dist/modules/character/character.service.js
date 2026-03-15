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
exports.CharacterService = void 0;
const common_1 = require("@nestjs/common");
const supabase_service_1 = require("../../common/database/supabase.service");
const TIER_FALLBACK_ORDER = ['DIAMOND', 'METEORITE', 'MITHRIL', 'IN1000'];
function viewToRankingData(rows) {
    return rows.map((r) => ({
        rank: r.rank,
        characterNum: r.characterNum,
        bestWeapon: r.bestWeapon,
        totalGames: r.totalGames,
        pickRate: r.pickRate,
        winRate: r.winRate,
        averageRP: r.averageRPPerGame,
        top3Rate: r.top3Rate,
    }));
}
function selectTierData(rows, requestedTier) {
    const tierOrder = [
        requestedTier,
        ...TIER_FALLBACK_ORDER.filter((t) => t !== requestedTier),
    ];
    for (const tier of tierOrder) {
        const tierRows = rows.filter((r) => r.tier === tier);
        if (tierRows.length > 0) {
            return { rankings: viewToRankingData(tierRows), usedTier: tier };
        }
    }
    return { rankings: [], usedTier: requestedTier };
}
let CharacterService = class CharacterService {
    constructor(supabase) {
        this.supabase = supabase;
    }
    async fetchRankingData(patchVersion, requestedTier) {
        const client = this.supabase.getClient();
        const { data: patches } = await client
            .from('PatchVersion')
            .select('version')
            .order('startDate', { ascending: false })
            .limit(50);
        const patchList = (patches ?? []).map((p) => p.version);
        const effectivePatch = patchVersion || patchList[0] || '10.4';
        const currentIndex = patchList.indexOf(effectivePatch);
        const previousPatch = currentIndex >= 0 && currentIndex + 1 < patchList.length
            ? patchList[currentIndex + 1]
            : null;
        const patchVersions = previousPatch
            ? [effectivePatch, previousPatch]
            : [effectivePatch];
        const { data, error } = await client
            .from('character_rankings')
            .select('*')
            .in('patchVersion', patchVersions)
            .in('tier', TIER_FALLBACK_ORDER);
        if (error || !data) {
            return {
                rankings: [],
                previousRankings: [],
                patchVersion: effectivePatch,
                previousPatch: null,
                tier: requestedTier,
            };
        }
        const viewRows = data;
        const currentRows = viewRows.filter((r) => r.patchVersion === effectivePatch);
        const prevRows = previousPatch
            ? viewRows.filter((r) => r.patchVersion === previousPatch)
            : [];
        const { rankings, usedTier } = selectTierData(currentRows, requestedTier);
        const { rankings: previousRankings } = prevRows.length > 0
            ? selectTierData(prevRows, usedTier)
            : { rankings: [] };
        return {
            rankings,
            previousRankings,
            patchVersion: effectivePatch,
            previousPatch,
            tier: usedTier,
        };
    }
    async getCharacterStats(characterCode, patchVersion, tier) {
        const emptyResponse = {
            characterNum: characterCode,
            patchVersion,
            tier,
            totalGames: 0,
            pickRate: 0,
            winRate: 0,
            averageRank: 0,
            averageRP: 0,
            top3Rate: 0,
            weapons: [],
        };
        if (!characterCode || isNaN(characterCode))
            return emptyResponse;
        const client = this.supabase.getClient();
        const { data, error } = await client
            .from('character_rankings')
            .select('*')
            .eq('patchVersion', patchVersion)
            .eq('tier', tier);
        if (error || !data || data.length === 0)
            return emptyResponse;
        const viewRows = data;
        const rows = viewRows.filter((r) => r.characterNum === characterCode);
        if (rows.length === 0)
            return emptyResponse;
        const totalGames = rows.reduce((sum, r) => sum + r.totalGames, 0);
        const weapons = rows
            .map((r) => ({
            bestWeapon: r.bestWeapon,
            totalGames: r.totalGames,
            pickRate: totalGames > 0 ? (r.totalGames / totalGames) * 100 : 0,
            winRate: r.winRate,
            averageRank: 0,
            averageRP: r.averageRPPerGame,
        }))
            .sort((a, b) => b.totalGames - a.totalGames);
        const totalPickRate = rows.reduce((sum, r) => sum + r.pickRate, 0);
        const weightedWinRate = totalGames > 0
            ? rows.reduce((sum, r) => sum + r.winRate * r.totalGames, 0) / totalGames
            : 0;
        const weightedRP = totalGames > 0
            ? rows.reduce((sum, r) => sum + r.averageRPPerGame * r.totalGames, 0) / totalGames
            : 0;
        const weightedTop3 = totalGames > 0
            ? rows.reduce((sum, r) => sum + r.top3Rate * r.totalGames, 0) / totalGames
            : 0;
        return {
            characterNum: characterCode,
            patchVersion,
            tier,
            totalGames,
            pickRate: totalPickRate,
            winRate: weightedWinRate,
            averageRank: 0,
            averageRP: weightedRP,
            top3Rate: weightedTop3,
            weapons,
        };
    }
};
exports.CharacterService = CharacterService;
exports.CharacterService = CharacterService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [supabase_service_1.SupabaseService])
], CharacterService);
//# sourceMappingURL=character.service.js.map