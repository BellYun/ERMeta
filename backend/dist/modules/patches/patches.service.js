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
exports.PatchesService = void 0;
const common_1 = require("@nestjs/common");
const supabase_service_1 = require("../../common/database/supabase.service");
let PatchesService = class PatchesService {
    constructor(supabase) {
        this.supabase = supabase;
    }
    async getPatchHistory(limit = 50, includeInactive = false) {
        const client = this.supabase.getClient();
        let query = client
            .from('PatchVersion')
            .select('version')
            .order('startDate', { ascending: false })
            .limit(limit);
        if (!includeInactive) {
            query = query.eq('isActive', true);
        }
        const { data } = await query;
        return (data ?? []).map((p) => p.version);
    }
    async getPatchList(limit = 50) {
        const client = this.supabase.getClient();
        const { data } = await client
            .from('PatchVersion')
            .select('version')
            .order('startDate', { ascending: false })
            .limit(limit);
        return (data ?? []).map((p) => p.version);
    }
};
exports.PatchesService = PatchesService;
exports.PatchesService = PatchesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [supabase_service_1.SupabaseService])
], PatchesService);
//# sourceMappingURL=patches.service.js.map