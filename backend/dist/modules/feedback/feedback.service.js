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
exports.FeedbackService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const rateLimitMap = new Map();
function checkRateLimit(ip) {
    const now = Date.now();
    const entry = rateLimitMap.get(ip);
    if (!entry || now > entry.resetAt) {
        rateLimitMap.set(ip, { count: 1, resetAt: now + 60_000 });
        return true;
    }
    if (entry.count >= 5)
        return false;
    entry.count += 1;
    return true;
}
let FeedbackService = class FeedbackService {
    constructor(configService) {
        this.configService = configService;
        this.cleanupInterval = null;
    }
    onModuleInit() {
        this.cleanupInterval = setInterval(() => {
            const now = Date.now();
            for (const [ip, entry] of rateLimitMap) {
                if (now > entry.resetAt)
                    rateLimitMap.delete(ip);
            }
        }, 5 * 60 * 1000);
    }
    onModuleDestroy() {
        if (this.cleanupInterval)
            clearInterval(this.cleanupInterval);
    }
    async submit(body, ip, userAgent) {
        if (!checkRateLimit(ip)) {
            throw new common_1.HttpException({ error: '너무 많은 요청입니다. 잠시 후 다시 시도해주세요.' }, common_1.HttpStatus.TOO_MANY_REQUESTS);
        }
        const { category, message, contact } = body;
        if (!message || message.trim() === '') {
            throw new common_1.BadRequestException({ error: '메시지를 입력해주세요.' });
        }
        const webhookUrl = this.configService.get('GOOGLE_SHEETS_WEBHOOK_URL');
        if (webhookUrl) {
            const timestamp = new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Seoul' }).replace(' ', 'T') + '+09:00';
            try {
                const res = await fetch(webhookUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        category: category ?? '', message: message.trim(),
                        contact: contact ?? '', timestamp, userAgent,
                    }),
                });
                if (!res.ok)
                    console.error(`[feedback] Webhook responded with status ${res.status}`);
            }
            catch (err) {
                console.error('[feedback] Failed to send to webhook:', err);
            }
        }
        return { success: true };
    }
};
exports.FeedbackService = FeedbackService;
exports.FeedbackService = FeedbackService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], FeedbackService);
//# sourceMappingURL=feedback.service.js.map