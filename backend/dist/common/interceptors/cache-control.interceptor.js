"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CacheControlInterceptor = CacheControlInterceptor;
const common_1 = require("@nestjs/common");
const rxjs_1 = require("rxjs");
const CACHE_CONTROL = {
    immutable: 'public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400',
    slow: 'public, max-age=300, s-maxage=3600, stale-while-revalidate=600',
    daily: 'public, max-age=300, s-maxage=1800, stale-while-revalidate=300',
    frequent: 'public, max-age=120, s-maxage=300, stale-while-revalidate=3600',
};
function CacheControlInterceptor(preset) {
    let CacheInterceptor = class CacheInterceptor {
        intercept(context, next) {
            return next.handle().pipe((0, rxjs_1.tap)(() => {
                const response = context.switchToHttp().getResponse();
                response.setHeader('Cache-Control', CACHE_CONTROL[preset]);
            }));
        }
    };
    CacheInterceptor = __decorate([
        (0, common_1.Injectable)()
    ], CacheInterceptor);
    return CacheInterceptor;
}
//# sourceMappingURL=cache-control.interceptor.js.map