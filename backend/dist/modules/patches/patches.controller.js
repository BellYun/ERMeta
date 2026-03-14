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
exports.PatchesController = void 0;
const common_1 = require("@nestjs/common");
const patches_service_1 = require("./patches.service");
const cache_control_interceptor_1 = require("../../common/interceptors/cache-control.interceptor");
let PatchesController = class PatchesController {
    constructor(patchesService) {
        this.patchesService = patchesService;
    }
    async getHistory(limit, includeInactive) {
        const patches = await this.patchesService.getPatchHistory(limit ?? 50, includeInactive ?? false);
        return { patches };
    }
};
exports.PatchesController = PatchesController;
__decorate([
    (0, common_1.Get)('history'),
    (0, common_1.UseInterceptors)((0, cache_control_interceptor_1.CacheControlInterceptor)('slow')),
    __param(0, (0, common_1.Query)('limit')),
    __param(1, (0, common_1.Query)('includeInactive')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Boolean]),
    __metadata("design:returntype", Promise)
], PatchesController.prototype, "getHistory", null);
exports.PatchesController = PatchesController = __decorate([
    (0, common_1.Controller)('patches'),
    __metadata("design:paramtypes", [patches_service_1.PatchesService])
], PatchesController);
//# sourceMappingURL=patches.controller.js.map