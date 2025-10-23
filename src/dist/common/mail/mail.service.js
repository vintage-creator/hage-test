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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var MailService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MailService = void 0;
const common_1 = require("@nestjs/common");
const nodemailer_1 = __importDefault(require("nodemailer"));
const config_1 = require("@nestjs/config");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const handlebars_1 = __importDefault(require("handlebars"));
const mjml_1 = __importDefault(require("mjml"));
const juice_1 = __importDefault(require("juice"));
let MailService = MailService_1 = class MailService {
    constructor(cfg) {
        this.cfg = cfg;
        this.logger = new common_1.Logger(MailService_1.name);
        this.templatesDir = path_1.default.join(__dirname, "templates");
        this.transporter = nodemailer_1.default.createTransport({
            host: cfg.get("SMTP_HOST"),
            port: Number(cfg.get("SMTP_PORT") ?? 587),
            secure: cfg.get("SMTP_SECURE") === "true",
            auth: {
                user: cfg.get("SMTP_USER"),
                pass: cfg.get("SMTP_PASS"),
            },
        });
    }
    loadTemplate(templateName) {
        const mjmlPath = path_1.default.join(this.templatesDir, `${templateName}.mjml`);
        const txtPath = path_1.default.join(this.templatesDir, "text", `${templateName}.txt.hbs`);
        const mjmlSource = fs_1.default.readFileSync(mjmlPath, "utf8");
        const txtSource = fs_1.default.existsSync(txtPath) ? fs_1.default.readFileSync(txtPath, "utf8") : "";
        return { mjmlSource, txtSource };
    }
    compile(templateSource, ctx) {
        const template = handlebars_1.default.compile(templateSource);
        return template(ctx);
    }
    async sendFromTemplate(to, subject, templateName, context) {
        const { mjmlSource, txtSource } = this.loadTemplate(templateName);
        const fullCtx = {
            year: new Date().getFullYear(),
            appName: this.cfg.get("APP_NAME") ?? "Hage Logistics",
            logoUrl: this.cfg.get("APP_LOGO") ?? `${this.cfg.get("APP_URL")}/logo.png`,
            supportText: this.cfg.get("SUPPORT_TEXT") ?? "Need help? Contact hello@tryhage.com",
            ...context,
        };
        const mjmlWithVars = this.compile(mjmlSource, fullCtx);
        const { html, errors } = (0, mjml_1.default)(mjmlWithVars, { validationLevel: "soft" });
        if (errors && errors.length) {
            this.logger.warn("MJML warnings: " + JSON.stringify(errors));
        }
        const inlined = (0, juice_1.default)(html);
        const text = txtSource ? this.compile(txtSource, fullCtx) : this.stripHtmlToText(inlined);
        const mail = {
            from: this.cfg.get("MAIL_FROM"),
            to,
            subject,
            html: inlined,
            text,
        };
        const info = await this.transporter.sendMail(mail);
        this.logger.verbose(`Email sent to ${to} (${info.messageId})`);
        return info;
    }
    stripHtmlToText(html) {
        return html
            .replace(/<\/?[^>]+(>|$)/g, "")
            .replace(/\s+/g, " ")
            .trim();
    }
    async sendVerificationEmail(email, context) {
        const subject = `${this.cfg.get("APP_NAME")}: Verify your email`;
        return this.sendFromTemplate(email, subject, "verification", context);
    }
    async sendResetPasswordEmail(email, context) {
        const subject = `${this.cfg.get("APP_NAME")}: Reset your password`;
        return this.sendFromTemplate(email, subject, "reset-password", context);
    }
    async sendShipmentCreated(email, context) {
        const subject = `${this.cfg.get("APP_NAME")}: Shipment ${context.trackingNumber} created`;
        return this.sendFromTemplate(email, subject, "shipment-created", context);
    }
    async sendShipmentStatusUpdate(email, context) {
        const subject = `${this.cfg.get("APP_NAME")}: Shipment ${context.trackingNumber} status updated`;
        return this.sendFromTemplate(email, subject, "shipment-status-update", context);
    }
};
exports.MailService = MailService;
exports.MailService = MailService = MailService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], MailService);
