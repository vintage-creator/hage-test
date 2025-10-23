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
Object.defineProperty(exports, "__esModule", { value: true });
exports.CloudinaryService = void 0;
const common_1 = require("@nestjs/common");
const cloudinary_1 = require("cloudinary");
const streamifier_1 = __importDefault(require("streamifier"));
const config_1 = require("@nestjs/config");
let CloudinaryService = class CloudinaryService {
    constructor(cfg) {
        this.cfg = cfg;
        cloudinary_1.v2.config({
            cloud_name: cfg.get('CLOUDINARY_CLOUD_NAME'),
            api_key: cfg.get('CLOUDINARY_API_KEY'),
            api_secret: cfg.get('CLOUDINARY_API_SECRET'),
            secure: true,
        });
    }
    async uploadFile(file, options = { folder: 'company-docs' }) {
        if (!file || !file.buffer) {
            throw new Error('No file buffer provided');
        }
        return new Promise((resolve, reject) => {
            const cb = (error, result) => {
                if (error)
                    return reject(error);
                if (!result || !result.secure_url)
                    return reject(new Error('Invalid Cloudinary response'));
                resolve({ url: result.secure_url, key: result.public_id });
            };
            const uploadStream = cloudinary_1.v2.uploader.upload_stream(options, cb);
            streamifier_1.default.createReadStream(file.buffer).pipe(uploadStream);
        });
    }
    async delete(keyOrUrl) {
        await cloudinary_1.v2.uploader.destroy(keyOrUrl);
    }
};
exports.CloudinaryService = CloudinaryService;
exports.CloudinaryService = CloudinaryService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], CloudinaryService);
