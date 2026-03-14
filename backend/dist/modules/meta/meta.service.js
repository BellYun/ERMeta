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
exports.MetaService = void 0;
const common_1 = require("@nestjs/common");
const supabase_service_1 = require("../../common/database/supabase.service");
const TIER_FALLBACK_ORDER = ['DIAMOND', 'METEORITE', 'MITHRIL', 'IN1000'];
function computeRates(rows) {
    const grandTotal = rows.reduce((sum, r) => sum + (r.totalGames ?? 0), 0);
    return rows.map((r) => ({
        characterNum: r.characterNum,
        bestWeapon: r.bestWeapon,
        totalGames: r.totalGames ?? 0,
        pickRate: grandTotal > 0 ? ((r.totalGames ?? 0) / grandTotal) * 100 : 0,
        winRate: r.totalGames > 0 ? ((r.totalWins ?? 0) / r.totalGames) * 100 : 0,
        averageRP: r.totalGames > 0 ? (r.totalRP ?? 0) / r.totalGames : 0,
    }));
}
function selectTierRows(data, requestedTier) {
    const tierOrder = [requestedTier, ...TIER_FALLBACK_ORDER.filter((t) => t !== requestedTier)];
    for (const tier of tierOrder) {
        const rows = data.filter((r) => r.tier === tier);
        if (rows.length > 0)
            return { rows, usedTier: tier };
    }
    return { rows: [], usedTier: requestedTier };
}
let MetaService = class MetaService {
    constructor(supabase) {
        this.supabase = supabase;
    }
    async getHoneyPicks(patchVersion, requestedTier) {
        const client = this.supabase.getClient();
        const { data: patches } = await client
            .from('PatchVersion').select('version')
            .order('startDate', { ascending: false }).limit(50);
        const patchList = (patches ?? []).map((p) => p.version);
        const currentIndex = patchList.indexOf(patchVersion);
        const previousPatch = currentIndex >= 0 && currentIndex + 1 < patchList.length
            ? patchList[currentIndex + 1] : null;
        if (!previousPatch) {
            return { picks: [], patchVersion, previousPatch: null, tier: requestedTier };
        }
        const { data, error } = await client
            .from('CharacterStats')
            .select('characterNum,bestWeapon,totalGames,totalWins,totalRP,tier,patchVersion')
            .in('patchVersion', [patchVersion, previousPatch])
            .in('tier', TIER_FALLBACK_ORDER);
        if (error || !data) {
            return { picks: [], patchVersion, previousPatch, tier: requestedTier };
        }
        const typedData = data;
        const { rows: currentRows, usedTier } = selectTierRows(typedData.filter((r) => r.patchVersion === patchVersion), requestedTier);
        const { rows: prevRows } = selectTierRows(typedData.filter((r) => r.patchVersion === previousPatch), usedTier);
        if (currentRows.length === 0 || prevRows.length === 0) {
            return { picks: [], patchVersion, previousPatch, tier: usedTier };
        }
        const currentRates = computeRates(currentRows);
        const prevRates = computeRates(prevRows);
        const prevMap = new Map(prevRates.map((r) => [r.characterNum, r]));
        const honeyPicks = [];
        for (const curr of currentRates) {
            const prev = prevMap.get(curr.characterNum);
            if (!prev)
                continue;
            const pickRateDelta = curr.pickRate - prev.pickRate;
            const winRateDelta = curr.winRate - prev.winRate;
            if (pickRateDelta > 0 && winRateDelta > 0) {
                const rpBonus = curr.averageRP > 0 ? 1 + curr.averageRP / 100 : 1;
                honeyPicks.push({
                    characterNum: curr.characterNum, bestWeapon: curr.bestWeapon,
                    pickRate: curr.pickRate, winRate: curr.winRate, averageRP: curr.averageRP,
                    pickRateDelta, winRateDelta,
                    averageRPDelta: curr.averageRP - prev.averageRP,
                    honeyScore: pickRateDelta * winRateDelta * rpBonus,
                });
            }
        }
        honeyPicks.sort((a, b) => b.honeyScore - a.honeyScore);
        return { picks: honeyPicks.slice(0, 5), patchVersion, previousPatch, tier: usedTier };
    }
};
exports.MetaService = MetaService;
exports.MetaService = MetaService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [supabase_service_1.SupabaseService])
], MetaService);
//# sourceMappingURL=meta.service.js.map