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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CharacterController = void 0;
const common_1 = require("@nestjs/common");
const character_service_1 = require("./character.service");
const ranking_query_dto_1 = require("./dto/ranking-query.dto");
const cache_control_interceptor_1 = require("../../common/interceptors/cache-control.interceptor");
let CharacterController = class CharacterController {
    constructor(characterService) {
        this.characterService = characterService;
    }
    async getRanking(query) {
        return this.characterService.fetchRankingData(query.patchVersion ?? '', query.tier ?? 'DIAMOND');
    }
    async getStats(characterCode, query) {
        return this.characterService.getCharacterStats(parseInt(characterCode, 10), query.patchVersion ?? '10.4', query.tier ?? 'DIAMOND');
    }
};
exports.CharacterController = CharacterController;
__decorate([
    (0, common_1.Get)('ranking'),
    (0, common_1.UseInterceptors)((0, cache_control_interceptor_1.CacheControlInterceptor)('daily')),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [ranking_query_dto_1.RankingQueryDto]),
    __metadata("design:returntype", Promise)
], CharacterController.prototype, "getRanking", null);
__decorate([
    (0, common_1.Get)('stats/:characterCode'),
    (0, common_1.UseInterceptors)((0, cache_control_interceptor_1.CacheControlInterceptor)('daily')),
    __param(0, (0, common_1.Param)('characterCode')),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, ranking_query_dto_1.CharacterStatsQueryDto]),
    __metadata("design:returntype", Promise)
], CharacterController.prototype, "getStats", null);
exports.CharacterController = CharacterController = __decorate([
    (0, common_1.Controller)('character'),
    __metadata("design:paramtypes", [character_service_1.CharacterService])
], CharacterController);
//# sourceMappingURL=character.controller.js.map