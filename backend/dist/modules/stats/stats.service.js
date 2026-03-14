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
exports.StatsService = void 0;
const common_1 = require("@nestjs/common");
const supabase_service_1 = require("../../common/database/supabase.service");
const DIAMOND_PLUS_TIERS = ['DIAMOND', 'METEORITE', 'MITHRIL', 'IN1000'];
const TRIO_MEMBER_COUNT = 3;
const EXCLUDED_CHARACTER_CODES = new Set([9998, 9999]);
const BAYESIAN_K = 50;
function bayesianRP(avgRP, n, globalAvg) {
    return (n * avgRP + BAYESIAN_K * globalAvg) / (n + BAYESIAN_K);
}
function wilsonLower(winPct, n) {
    if (n === 0)
        return 0;
    const p = winPct / 100;
    const z = 1.645;
    const num = p + (z * z) / (2 * n) - z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n));
    return Math.max(0, num / (1 + (z * z) / n));
}
function recommendedScore(rec, globalAvgRP, rpRange) {
    const bRP = bayesianRP(rec.averageRP, rec.totalGames, globalAvgRP);
    const span = rpRange.max - rpRange.min || 1;
    const normRP = Math.max(0, Math.min(1, (bRP - rpRange.min) / span));
    return 0.6 * normRP + 0.3 * wilsonLower(rec.winRate, rec.totalGames) + 0.1 * Math.max(0, Math.min(1, (8 - rec.averageRank) / 7));
}
function aggregateByTrio(rows) {
    const map = new Map();
    for (const r of rows) {
        const key = `${r.character1}-${r.character2}-${r.character3}`;
        const e = map.get(key);
        if (e) {
            e.totalGames += r.totalGames;
            e.wrW += r.winRate * r.totalGames;
            e.rpW += r.averageRP * r.totalGames;
            e.rkW += r.averageRank * r.totalGames;
        }
        else {
            map.set(key, {
                c1: r.character1, c2: r.character2, c3: r.character3,
                totalGames: r.totalGames,
                wrW: r.winRate * r.totalGames,
                rpW: r.averageRP * r.totalGames,
                rkW: r.averageRank * r.totalGames,
            });
        }
    }
    return [...map.values()].map((v) => ({
        character1: v.c1, character2: v.c2, character3: v.c3,
        totalGames: v.totalGames,
        winRate: v.totalGames > 0 ? v.wrW / v.totalGames : 0,
        averageRP: v.totalGames > 0 ? v.rpW / v.totalGames / TRIO_MEMBER_COUNT : 0,
        averageRank: v.totalGames > 0 ? v.rkW / v.totalGames : 0,
    }));
}
let StatsService = class StatsService {
    constructor(supabase) {
        this.supabase = supabase;
    }
    async getTrios(sortBy, limit, char1, char2) {
        if (char2 !== null && char1 === null)
            throw new common_1.BadRequestException('character2는 character1 없이 사용할 수 없습니다.');
        if (char1 !== null && char2 !== null && char1 === char2)
            throw new common_1.BadRequestException('character1과 character2는 달라야 합니다.');
        if ((char1 !== null && EXCLUDED_CHARACTER_CODES.has(char1)) ||
            (char2 !== null && EXCLUDED_CHARACTER_CODES.has(char2)))
            return { results: [] };
        if (isNaN(limit) || limit < 1)
            limit = 1;
        if (limit > 200)
            limit = 200;
        const client = this.supabase.getClient();
        const TWO_WEEKS_AGO = new Date(Date.now() - 14 * 86400000).toISOString();
        let query = client
            .from('CharacterTrio')
            .select('character1,character2,character3,winRate,averageRP,totalGames,averageRank')
            .in('tier', DIAMOND_PLUS_TIERS)
            .gte('lastUpdated', TWO_WEEKS_AGO)
            .order('totalGames', { ascending: false })
            .limit(5000);
        if (char1 !== null && char2 !== null) {
            const [lo, hi] = [char1, char2].sort((a, b) => a - b);
            query = query.or(`and(character1.eq.${lo},character2.eq.${hi}),and(character1.eq.${lo},character3.eq.${hi}),and(character2.eq.${lo},character3.eq.${hi})`);
        }
        else if (char1 !== null) {
            query = query.or(`character1.eq.${char1},character2.eq.${char1},character3.eq.${char1}`);
        }
        const { data, error } = await query;
        if (error)
            throw new Error('일시적인 오류가 발생했어요.');
        const filtered = (data ?? []).filter((r) => !EXCLUDED_CHARACTER_CODES.has(r.character1) &&
            !EXCLUDED_CHARACTER_CODES.has(r.character2) &&
            !EXCLUDED_CHARACTER_CODES.has(r.character3));
        const agg = aggregateByTrio(filtered);
        if (sortBy === 'recommended') {
            const globalAvg = agg.length > 0 ? agg.reduce((s, r) => s + r.averageRP, 0) / agg.length : 0;
            const rpVals = agg.map((r) => r.averageRP);
            const rpRange = { min: Math.min(...rpVals), max: Math.max(...rpVals) };
            agg.sort((a, b) => recommendedScore(b, globalAvg, rpRange) - recommendedScore(a, globalAvg, rpRange));
        }
        else {
            agg.sort((a, b) => sortBy === 'averageRP' ? b.averageRP - a.averageRP
                : sortBy === 'winRate' ? b.winRate - a.winRate : b.totalGames - a.totalGames);
        }
        return { results: agg.slice(0, limit) };
    }
};
exports.StatsService = StatsService;
exports.StatsService = StatsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [supabase_service_1.SupabaseService])
], StatsService);
//# sourceMappingURL=stats.service.js.map