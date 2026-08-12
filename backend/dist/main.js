"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const core_1 = require("@nestjs/core");
const common_1 = require("@nestjs/common");
const app_module_1 = require("./app.module");
const ALLOWED_ORIGINS = [
    'https://remaxbostanci.com',
    'https://www.remaxbostanci.com',
    'https://remax-crm.netlify.app',
    'http://localhost:5173',
];
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    app.enableCors({
        origin: (origin, callback) => {
            if (!origin || ALLOWED_ORIGINS.includes(origin)) {
                callback(null, true);
            }
            else {
                callback(new Error('CORS: Bu adresten erisime izin verilmiyor'), false);
            }
        },
        credentials: true,
    });
    app.useGlobalPipes(new common_1.ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
    }));
    app.setGlobalPrefix('api');
    const port = process.env.PORT || 3000;
    await app.listen(port);
    console.log(`Remax CRM API çalışıyor: http://localhost:${port}/api`);
}
bootstrap();
//# sourceMappingURL=main.js.map