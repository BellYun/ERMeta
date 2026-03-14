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
exports.BuildsController = void 0;
const common_1 = require("@nestjs/common");
const builds_service_1 = require("./builds.service");
const builds_query_dto_1 = require("./dto/builds-query.dto");
const cache_control_interceptor_1 = require("../../common/interceptors/cache-control.interceptor");
let BuildsController = class BuildsController {
    constructor(buildsService) {
        this.buildsService = buildsService;
    }
    async getEquipment(query) {
        return this.buildsService.getEquipmentBuilds(parseInt(query.characterCode, 10), query.tier ?? 'DIAMOND', query.patchVersion ?? '', query.mainCore, query.bestWeapon);
    }
    async getTraitsMain(query) {
        return this.buildsService.getTraitsMain(parseInt(query.characterCode, 10), query.tier ?? 'DIAMOND', query.patchVersion ?? '10.4', query.bestWeapon);
    }
    async getTraitsOptions(query) {
        return this.buildsService.getTraitsOptions(parseInt(query.characterCode, 10), query.tier ?? 'DIAMOND', query.patchVersion ?? '10.4', query.bestWeapon, query.mainCore);
    }
};
exports.BuildsController = BuildsController;
__decorate([
    (0, common_1.Get)('equipment'),
    (0, common_1.UseInterceptors)((0, cache_control_interceptor_1.CacheControlInterceptor)('daily')),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [builds_query_dto_1.EquipmentQueryDto]),
    __metadata("design:returntype", Promise)
], BuildsController.prototype, "getEquipment", null);
__decorate([
    (0, common_1.Get)('traits/main'),
    (0, common_1.UseInterceptors)((0, cache_control_interceptor_1.CacheControlInterceptor)('daily')),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [builds_query_dto_1.TraitsMainQueryDto]),
    __metadata("design:returntype", Promise)
], BuildsController.prototype, "getTraitsMain", null);
__decorate([
    (0, common_1.Get)('traits/options'),
    (0, common_1.UseInterceptors)((0, cache_control_interceptor_1.CacheControlInterceptor)('daily')),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [builds_query_dto_1.TraitsOptionsQueryDto]),
    __metadata("design:returntype", Promise)
], BuildsController.prototype, "getTraitsOptions", null);
exports.BuildsController = BuildsController = __decorate([
    (0, common_1.Controller)('builds'),
    __metadata("design:paramtypes", [builds_service_1.BuildsService])
], BuildsController);
//# sourceMappingURL=builds.controller.js.map