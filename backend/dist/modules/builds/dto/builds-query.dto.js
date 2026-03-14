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
exports.TraitsOptionsQueryDto = exports.TraitsMainQueryDto = exports.EquipmentQueryDto = void 0;
const class_validator_1 = require("class-validator");
class EquipmentQueryDto {
    constructor() {
        this.tier = 'DIAMOND';
        this.patchVersion = '';
    }
}
exports.EquipmentQueryDto = EquipmentQueryDto;
__decorate([
    (0, class_validator_1.IsNumberString)(),
    __metadata("design:type", String)
], EquipmentQueryDto.prototype, "characterCode", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], EquipmentQueryDto.prototype, "tier", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], EquipmentQueryDto.prototype, "patchVersion", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], EquipmentQueryDto.prototype, "mainCore", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], EquipmentQueryDto.prototype, "bestWeapon", void 0);
class TraitsMainQueryDto {
    constructor() {
        this.tier = 'DIAMOND';
        this.patchVersion = '10.4';
    }
}
exports.TraitsMainQueryDto = TraitsMainQueryDto;
__decorate([
    (0, class_validator_1.IsNumberString)(),
    __metadata("design:type", String)
], TraitsMainQueryDto.prototype, "characterCode", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], TraitsMainQueryDto.prototype, "tier", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], TraitsMainQueryDto.prototype, "patchVersion", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], TraitsMainQueryDto.prototype, "bestWeapon", void 0);
class TraitsOptionsQueryDto extends TraitsMainQueryDto {
}
exports.TraitsOptionsQueryDto = TraitsOptionsQueryDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], TraitsOptionsQueryDto.prototype, "mainCore", void 0);
//# sourceMappingURL=builds-query.dto.js.map