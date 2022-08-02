"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserEntity = void 0;
const typeorm_1 = require("typeorm");
let UserEntity = class UserEntity {
    constructor() {
        this.timer = null;
        this.colors = null;
    }
};
__decorate([
    (0, typeorm_1.PrimaryColumn)('text')
], UserEntity.prototype, "userId", void 0);
__decorate([
    (0, typeorm_1.Column)('text')
], UserEntity.prototype, "username", void 0);
__decorate([
    (0, typeorm_1.Column)('text')
], UserEntity.prototype, "pscope", void 0);
__decorate([
    (0, typeorm_1.Column)('int', {
        nullable: true
    })
], UserEntity.prototype, "timer", void 0);
__decorate([
    (0, typeorm_1.Column)("simple-array", {
        nullable: true
    })
], UserEntity.prototype, "colors", void 0);
UserEntity = __decorate([
    (0, typeorm_1.Entity)()
], UserEntity);
exports.UserEntity = UserEntity;
