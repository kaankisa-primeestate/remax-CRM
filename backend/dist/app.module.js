"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const typeorm_1 = require("@nestjs/typeorm");
const customers_module_1 = require("./customers/customers.module");
const auth_module_1 = require("./auth/auth.module");
const users_module_1 = require("./users/users.module");
const portfolios_module_1 = require("./portfolios/portfolios.module");
const commissions_module_1 = require("./commissions/commissions.module");
const upload_module_1 = require("./upload/upload.module");
const dashboard_module_1 = require("./dashboard/dashboard.module");
const matching_module_1 = require("./matching/matching.module");
const notifications_module_1 = require("./notifications/notifications.module");
const tasks_module_1 = require("./tasks/tasks.module");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({ isGlobal: true }),
            typeorm_1.TypeOrmModule.forRootAsync({
                imports: [config_1.ConfigModule],
                inject: [config_1.ConfigService],
                useFactory: (config) => {
                    const databaseUrl = config.get('DATABASE_URL');
                    const base = databaseUrl
                        ? { url: databaseUrl }
                        : {
                            host: config.get('DB_HOST', 'localhost'),
                            port: parseInt(config.get('DB_PORT', '5432'), 10),
                            username: config.get('DB_USERNAME', 'postgres'),
                            password: config.get('DB_PASSWORD', 'postgres'),
                            database: config.get('DB_DATABASE', 'remax_crm'),
                        };
                    return {
                        type: 'postgres',
                        ...base,
                        autoLoadEntities: true,
                        synchronize: config.get('DB_SYNCHRONIZE', 'true') === 'true',
                    };
                },
            }),
            customers_module_1.CustomersModule,
            auth_module_1.AuthModule,
            users_module_1.UsersModule,
            portfolios_module_1.PortfoliosModule,
            commissions_module_1.CommissionsModule,
            upload_module_1.UploadModule,
            dashboard_module_1.DashboardModule,
            matching_module_1.MatchingModule,
            notifications_module_1.NotificationsModule,
            tasks_module_1.TasksModule,
        ],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map