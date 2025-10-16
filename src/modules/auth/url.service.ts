// src/modules/auth/url.service.ts
import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class UrlService {
  constructor(private readonly cfg: ConfigService) {}

  private normalizeBase() {
    return (this.cfg.get("APP_URL") ?? "http://localhost:3000").replace(/\/+$/, "");
  }

  private normalizePrefix() {
    const apiPrefix = (this.cfg.get("API_PREFIX") ?? "").replace(/\/+$/, "");
    return apiPrefix ? (apiPrefix.startsWith("/") ? apiPrefix : `/${apiPrefix}`) : "";
  }

  build(path: string, token?: string) {
    const base = this.normalizeBase();
    const prefix = this.normalizePrefix();
    const p = path.startsWith("/") ? path.slice(1) : path;
    const q = token ? `?token=${encodeURIComponent(token)}` : "";
    return `${base}${prefix}/${p}${q}`;
  }

  verificationUrl(token: string) {
    return this.build("auth/verify-email", token);
  }

  resetUrl(token: string) {
    return this.build("auth/reset-password", token);
  }
}
export default UrlService;
