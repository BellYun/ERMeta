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
function buildRankings(rows) {
    const grandTotal = rows.reduce((sum, r) => sum + (r.totalGames ?? 0), 0);
    const rankings = rows.map((r) => ({
        characterNum: r.characterNum,
        bestWeapon: r.bestWeapon,
        totalGames: r.totalGames ?? 0,
        pickRate: grandTotal > 0 ? ((r.totalGames ?? 0) / grandTotal) * 100 : 0,
        winRate: r.totalGames > 0 ? ((r.totalWins ?? 0) / r.totalGames) * 100 : 0,
        averageRP: r.totalGames > 0 ? (r.totalRP ?? 0) / r.totalGames : 0,
        top3Rate: r.totalGames > 0 ? ((r.totalTop3 ?? 0) / r.totalGames) * 100 : 0,
    }));
    rankings.sort((a, b) => b.averageRP - a.averageRP);
    return rankings.map((c, i) => ({ rank: i + 1, ...c }));
}
function selectRankings(data, requestedTier) {
    const tierOrder = [
        requestedTier,
        ...TIER_FALLBACK_ORDER.filter((t) => t !== requestedTier),
    ];
    for (const tier of tierOrder) {
        const rows = data.filter((r) => r.tier === tier);
        if (rows.length > 0)
            return { rankings: buildRankings(rows), usedTier: tier };
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
            .from('CharacterStats')
            .select('characterNum,bestWeapon,totalGames,totalWins,totalRP,totalTop3,averageRank,tier,patchVersion')
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
        const typedData = data;
        const currentData = typedData.filter((r) => r.patchVersion === effectivePatch);
        const prevData = previousPatch
            ? typedData.filter((r) => r.patchVersion === previousPatch)
            : [];
        const { rankings, usedTier } = selectRankings(currentData, requestedTier);
        const { rankings: previousRankings } = prevData.length > 0
            ? selectRankings(prevData, usedTier)
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
            .from('CharacterStats')
            .select('characterNum,bestWeapon,totalGames,totalWins,totalRP,totalTop3,averageRank')
            .eq('patchVersion', patchVersion)
            .eq('tier', tier);
        if (error || !data || data.length === 0)
            return emptyResponse;
        const allRows = data;
        const grandTotal = allRows.reduce((sum, r) => sum + (r.totalGames ?? 0), 0);
        const rows = allRows.filter((r) => r.characterNum === characterCode);
        if (rows.length === 0)
            return emptyResponse;
        const totalGames = rows.reduce((sum, r) => sum + (r.totalGames ?? 0), 0);
        const totalWins = rows.reduce((sum, r) => sum + (r.totalWins ?? 0), 0);
        const totalRP = rows.reduce((sum, r) => sum + (r.totalRP ?? 0), 0);
        const totalTop3 = rows.reduce((sum, r) => sum + (r.totalTop3 ?? 0), 0);
        const weightedAvgRank = totalGames > 0
            ? rows.reduce((sum, r) => sum + (r.averageRank ?? 0) * (r.totalGames ?? 0), 0) / totalGames
            : 0;
        const weapons = rows
            .map((r) => ({
            bestWeapon: r.bestWeapon,
            totalGames: r.totalGames ?? 0,
            pickRate: totalGames > 0 ? ((r.totalGames ?? 0) / totalGames) * 100 : 0,
            winRate: r.totalGames > 0 ? ((r.totalWins ?? 0) / r.totalGames) * 100 : 0,
            averageRank: r.averageRank ?? 0,
            averageRP: r.totalGames > 0 ? (r.totalRP ?? 0) / r.totalGames : 0,
        }))
            .sort((a, b) => b.totalGames - a.totalGames);
        return {
            characterNum: characterCode,
            patchVersion,
            tier,
            totalGames,
            pickRate: grandTotal > 0 ? (totalGames / grandTotal) * 100 : 0,
            winRate: totalGames > 0 ? (totalWins / totalGames) * 100 : 0,
            averageRank: weightedAvgRank,
            averageRP: totalGames > 0 ? totalRP / totalGames : 0,
            top3Rate: totalGames > 0 ? (totalTop3 / totalGames) * 100 : 0,
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