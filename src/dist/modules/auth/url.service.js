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
exports.UrlService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
let UrlService = class UrlService {
    constructor(cfg) {
        this.cfg = cfg;
    }
    normalizeBase() {
        return (this.cfg.get("APP_URL") ?? "http://localhost:3000").replace(/\/+$/, "");
    }
    normalizePrefix() {
        const apiPrefix = (this.cfg.get("API_PREFIX") ?? "").replace(/\/+$/, "");
        return apiPrefix ? (apiPrefix.startsWith("/") ? apiPrefix : `/${apiPrefix}`) : "";
    }
    build(path, token) {
        const base = this.normalizeBase();
        const prefix = this.normalizePrefix();
        const p = path.startsWith("/") ? path.slice(1) : path;
        const q = token ? `?token=${encodeURIComponent(token)}` : "";
        return `${base}${prefix}/${p}${q}`;
    }
    verificationUrl(token) {
        return this.build("auth/verify-email", token);
    }
    resetUrl(token) {
        return this.build("auth/reset-password", token);
    }
};
exports.UrlService = UrlService;
exports.UrlService = UrlService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], UrlService);
exports.default = UrlService;
