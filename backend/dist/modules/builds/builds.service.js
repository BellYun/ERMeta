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
exports.BuildsService = void 0;
const common_1 = require("@nestjs/common");
const supabase_service_1 = require("../../common/database/supabase.service");
function aggregateSlot(rows, slot, slotTotal, limit = 5) {
    const map = new Map();
    for (const row of rows) {
        const code = row[slot];
        if (code == null)
            continue;
        const existing = map.get(code);
        if (existing) {
            existing.games += row.totalGames;
            existing.wins += row.totalWins;
        }
        else {
            map.set(code, { games: row.totalGames, wins: row.totalWins });
        }
    }
    return [...map.entries()]
        .sort((a, b) => b[1].games - a[1].games)
        .slice(0, limit)
        .map(([code, { games, wins }]) => ({
        code,
        totalGames: games,
        pickRate: slotTotal > 0 ? (games / slotTotal) * 100 : 0,
        winRate: games > 0 ? (wins / games) * 100 : 0,
    }));
}
function aggregateSubOptions(rows, subKey, groupTotalGames, options = {}) {
    const { excludeNull = false, limit = 5 } = options;
    const subMap = new Map();
    for (const row of rows) {
        const code = row[subKey];
        if (excludeNull && code == null)
            continue;
        const key = String(code ?? 'null');
        const existing = subMap.get(key);
        if (existing) {
            existing.games += row.totalGames;
            existing.wins += row.totalWins;
        }
        else {
            subMap.set(key, { code, games: row.totalGames, wins: row.totalWins });
        }
    }
    return [...subMap.values()]
        .sort((a, b) => b.games - a.games)
        .slice(0, limit)
        .map((o) => ({
        code: o.code,
        totalGames: o.games,
        pickRate: groupTotalGames > 0 ? (o.games / groupTotalGames) * 100 : 0,
        winRate: o.games > 0 ? (o.wins / o.games) * 100 : 0,
    }));
}
let BuildsService = class BuildsService {
    constructor(supabase) {
        this.supabase = supabase;
    }
    async getEquipmentBuilds(characterCode, tier, patchVersion, mainCoreParam, bestWeaponParam) {
        const empty = {
            topBuilds: [],
            slotPopularity: { weapon: [], chest: [], head: [], arm: [], leg: [] },
            coreItems: [],
        };
        if (!characterCode || isNaN(characterCode))
            return empty;
        const client = this.supabase.getClient();
        let query = client
            .from('CharacterEquipmentBuildStats')
            .select('mainCore,weapon,chest,head,arm,leg,totalGames,totalWins,rankSum,totalRP')
            .eq('characterNum', characterCode)
            .eq('tier', tier)
            .eq('patchVersion', patchVersion);
        if (mainCoreParam != null) {
            if (mainCoreParam === 'null') {
                query = query.is('mainCore', null);
            }
            else {
                query = query.eq('mainCore', Number(mainCoreParam));
            }
        }
        const { data, error } = await query
            .order('totalGames', { ascending: false })
            .limit(200);
        if (error || !data || data.length === 0)
            return empty;
        const rows = data;
        const grandTotal = rows.reduce((s, r) => s + r.totalGames, 0);
        const buildMap = new Map();
        for (const row of rows) {
            const key = `${row.mainCore ?? ''}|${row.weapon ?? ''}|${row.chest ?? ''}|${row.head ?? ''}|${row.arm ?? ''}|${row.leg ?? ''}`;
            const existing = buildMap.get(key);
            if (existing) {
                existing.games += row.totalGames;
                existing.wins += row.totalWins;
                existing.rankSum += row.rankSum;
                existing.rpSum += row.totalRP;
            }
            else {
                buildMap.set(key, {
                    mainCore: row.mainCore, weapon: row.weapon, chest: row.chest,
                    head: row.head, arm: row.arm, leg: row.leg,
                    games: row.totalGames, wins: row.totalWins,
                    rankSum: row.rankSum, rpSum: row.totalRP,
                });
            }
        }
        const topBuilds = [...buildMap.values()]
            .sort((a, b) => b.games - a.games)
            .slice(0, 5)
            .map((b) => ({
            mainCore: b.mainCore, weapon: b.weapon, chest: b.chest,
            head: b.head, arm: b.arm, leg: b.leg,
            totalGames: b.games,
            pickRate: grandTotal > 0 ? (b.games / grandTotal) * 100 : 0,
            winRate: b.games > 0 ? (b.wins / b.games) * 100 : 0,
            averageRank: b.games > 0 ? b.rankSum / b.games : 0,
            averageRP: b.games > 0 ? b.rpSum / b.games : 0,
        }));
        const slots = ['weapon', 'chest', 'head', 'arm', 'leg'];
        const slotPopularity = {};
        for (const slot of slots) {
            const slotTotal = rows.reduce((s, r) => s + (r[slot] != null ? r.totalGames : 0), 0);
            slotPopularity[slot] = aggregateSlot(rows, slot, slotTotal);
        }
        const coreMap = new Map();
        for (const row of rows) {
            for (const slot of slots) {
                const code = row[slot];
                if (code == null)
                    continue;
                const existing = coreMap.get(code);
                if (existing) {
                    existing.games += row.totalGames;
                    existing.wins += row.totalWins;
                }
                else {
                    coreMap.set(code, { games: row.totalGames, wins: row.totalWins });
                }
            }
        }
        const coreItems = [...coreMap.entries()]
            .sort((a, b) => b[1].games - a[1].games)
            .slice(0, 5)
            .map(([code, { games, wins }]) => ({
            code,
            totalGames: games,
            pickRate: grandTotal > 0 ? (games / grandTotal) * 100 : 0,
            winRate: games > 0 ? (wins / games) * 100 : 0,
        }));
        return { topBuilds, slotPopularity, coreItems };
    }
    async getTraitsMain(characterCode, tier, patchVersion, bestWeapon) {
        if (!characterCode || isNaN(characterCode))
            return { builds: [] };
        const client = this.supabase.getClient();
        let query = client
            .from('CharacterTraitBuildStats')
            .select('*')
            .eq('characterNum', characterCode)
            .eq('patchVersion', patchVersion)
            .eq('tier', tier)
            .order('totalGames', { ascending: false })
            .limit(50);
        if (bestWeapon)
            query = query.eq('bestWeapon', Number(bestWeapon));
        const { data, error } = await query;
        if (error || !data || data.length === 0)
            return { builds: [] };
        const grandTotal = data.reduce((sum, r) => sum + (r.totalGames ?? 0), 0);
        const coreMap = new Map();
        for (const r of data) {
            const mainCore = r.mainCore ?? null;
            const row = {
                sub1: r.sub1 ?? null,
                sub2: r.sub2 ?? null,
                sub3: r.sub3 ?? null,
                sub4: r.sub4 ?? null,
                totalGames: r.totalGames ?? 0,
                totalWins: r.totalWins ?? 0,
            };
            const key = String(mainCore ?? 'null');
            const existing = coreMap.get(key);
            if (existing) {
                existing.rows.push(row);
            }
            else {
                coreMap.set(key, { mainCore, rows: [row] });
            }
        }
        const builds = [];
        for (const group of coreMap.values()) {
            const groupTotalGames = group.rows.reduce((s, r) => s + r.totalGames, 0);
            const groupTotalWins = group.rows.reduce((s, r) => s + r.totalWins, 0);
            builds.push({
                mainCore: group.mainCore,
                totalGames: groupTotalGames,
                groupPickRate: grandTotal > 0 ? (groupTotalGames / grandTotal) * 100 : 0,
                groupWinRate: groupTotalGames > 0 ? (groupTotalWins / groupTotalGames) * 100 : 0,
                sub1Options: aggregateSubOptions(group.rows, 'sub1', groupTotalGames),
                sub2Options: aggregateSubOptions(group.rows, 'sub2', groupTotalGames),
                sub3Options: aggregateSubOptions(group.rows, 'sub3', groupTotalGames, { excludeNull: true }),
                sub4Options: aggregateSubOptions(group.rows, 'sub4', groupTotalGames, { excludeNull: true }),
            });
        }
        builds.sort((a, b) => b.totalGames - a.totalGames);
        return { builds: builds.slice(0, 5) };
    }
    async getTraitsOptions(characterCode, tier, patchVersion, bestWeapon, mainCore) {
        if (!characterCode || isNaN(characterCode))
            return { options: [] };
        const client = this.supabase.getClient();
        let query = client
            .from('CharacterTraitBuildStats')
            .select('*')
            .eq('characterNum', characterCode)
            .eq('patchVersion', patchVersion)
            .eq('tier', tier)
            .order('totalGames', { ascending: false })
            .limit(50);
        if (bestWeapon)
            query = query.eq('bestWeapon', Number(bestWeapon));
        if (mainCore != null) {
            if (mainCore === 'null') {
                query = query.is('mainCore', null);
            }
            else {
                query = query.eq('mainCore', Number(mainCore));
            }
        }
        const { data, error } = await query;
        if (error || !data || data.length === 0)
            return { options: [] };
        const rows = data;
        const groupTotalGames = rows.reduce((s, r) => s + r.totalGames, 0);
        return {
            options: {
                sub1: aggregateSubOptions(rows, 'sub1', groupTotalGames),
                sub2: aggregateSubOptions(rows, 'sub2', groupTotalGames),
                sub3: aggregateSubOptions(rows, 'sub3', groupTotalGames, { excludeNull: true }),
                sub4: aggregateSubOptions(rows, 'sub4', groupTotalGames, { excludeNull: true }),
            },
        };
    }
};
exports.BuildsService = BuildsService;
exports.BuildsService = BuildsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [supabase_service_1.SupabaseService])
], BuildsService);
//# sourceMappingURL=builds.service.js.map