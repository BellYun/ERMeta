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
exports.CharacterStatsQueryDto = exports.RankingQueryDto = exports.TierGroup = void 0;
const class_validator_1 = require("class-validator");
var TierGroup;
(function (TierGroup) {
    TierGroup["DIAMOND"] = "DIAMOND";
    TierGroup["METEORITE"] = "METEORITE";
    TierGroup["MITHRIL"] = "MITHRIL";
    TierGroup["IN1000"] = "IN1000";
})(TierGroup || (exports.TierGroup = TierGroup = {}));
class RankingQueryDto {
    constructor() {
        this.tier = TierGroup.DIAMOND;
    }
}
exports.RankingQueryDto = RankingQueryDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], RankingQueryDto.prototype, "patchVersion", void 0);
__decorate([
    (0, class_validator_1.IsEnum)(TierGroup),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], RankingQueryDto.prototype, "tier", void 0);
class CharacterStatsQueryDto {
    constructor() {
        this.tier = TierGroup.DIAMOND;
    }
}
exports.CharacterStatsQueryDto = CharacterStatsQueryDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CharacterStatsQueryDto.prototype, "patchVersion", void 0);
__decorate([
    (0, class_validator_1.IsEnum)(TierGroup),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CharacterStatsQueryDto.prototype, "tier", void 0);
//# sourceMappingURL=ranking-query.dto.js.map