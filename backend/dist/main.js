"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const common_1 = require("@nestjs/common");
const app_module_1 = require("./app.module");
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    app.useGlobalPipes(new common_1.ValidationPipe({
        whitelist: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
    }));
    app.enableCors({
        origin: [
            'https://erwagg.com',
            'https://www.erwagg.com',
            'http://localhost:3000',
            'http://localhost:3001',
        ],
        methods: ['GET', 'POST', 'OPTIONS'],
        credentials: true,
    });
    const port = process.env.PORT ?? 4000;
    await app.listen(port);
    console.log(`[ER&GG Backend] Running on http://localhost:${port}`);
}
bootstrap();
//# sourceMappingURL=main.js.map