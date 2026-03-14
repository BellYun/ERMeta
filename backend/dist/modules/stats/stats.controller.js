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
exports.StatsController = exports.TriosQueryDto = void 0;
const common_1 = require("@nestjs/common");
const class_validator_1 = require("class-validator");
const stats_service_1 = require("./stats.service");
const cache_control_interceptor_1 = require("../../common/interceptors/cache-control.interceptor");
class TriosQueryDto {
    constructor() {
        this.sortBy = 'recommended';
    }
}
exports.TriosQueryDto = TriosQueryDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], TriosQueryDto.prototype, "sortBy", void 0);
__decorate([
    (0, class_validator_1.IsNumberString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], TriosQueryDto.prototype, "limit", void 0);
__decorate([
    (0, class_validator_1.IsNumberString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], TriosQueryDto.prototype, "character1", void 0);
__decorate([
    (0, class_validator_1.IsNumberString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], TriosQueryDto.prototype, "character2", void 0);
let StatsController = class StatsController {
    constructor(statsService) {
        this.statsService = statsService;
    }
    async getTrios(query) {
        return this.statsService.getTrios((query.sortBy ?? 'recommended'), query.limit ? parseInt(query.limit, 10) : 100, query.character1 ? parseInt(query.character1, 10) : null, query.character2 ? parseInt(query.character2, 10) : null);
    }
};
exports.StatsController = StatsController;
__decorate([
    (0, common_1.Get)('trios'),
    (0, common_1.UseInterceptors)((0, cache_control_interceptor_1.CacheControlInterceptor)('frequent')),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [TriosQueryDto]),
    __metadata("design:returntype", Promise)
], StatsController.prototype, "getTrios", null);
exports.StatsController = StatsController = __decorate([
    (0, common_1.Controller)('stats'),
    __metadata("design:paramtypes", [stats_service_1.StatsService])
], StatsController);
//# sourceMappingURL=stats.controller.js.map