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
exports.MetaController = exports.HoneyPicksQueryDto = void 0;
const common_1 = require("@nestjs/common");
const class_validator_1 = require("class-validator");
const meta_service_1 = require("./meta.service");
const cache_control_interceptor_1 = require("../../common/interceptors/cache-control.interceptor");
class HoneyPicksQueryDto {
    constructor() {
        this.patchVersion = '10.4';
        this.tier = 'MITHRIL';
    }
}
exports.HoneyPicksQueryDto = HoneyPicksQueryDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], HoneyPicksQueryDto.prototype, "patchVersion", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], HoneyPicksQueryDto.prototype, "tier", void 0);
let MetaController = class MetaController {
    constructor(metaService) {
        this.metaService = metaService;
    }
    async getHoneyPicks(query) {
        return this.metaService.getHoneyPicks(query.patchVersion ?? '10.4', query.tier ?? 'MITHRIL');
    }
};
exports.MetaController = MetaController;
__decorate([
    (0, common_1.Get)('honey-picks'),
    (0, common_1.UseInterceptors)((0, cache_control_interceptor_1.CacheControlInterceptor)('daily')),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [HoneyPicksQueryDto]),
    __metadata("design:returntype", Promise)
], MetaController.prototype, "getHoneyPicks", null);
exports.MetaController = MetaController = __decorate([
    (0, common_1.Controller)('meta'),
    __metadata("design:paramtypes", [meta_service_1.MetaService])
], MetaController);
//# sourceMappingURL=meta.controller.js.map