import { SetMetadata } from '@nestjs/common';
import { UserRole } from '../users/user.entity';

export const ROLES_KEY = 'roles';

// Kullanım: @Roles(UserRole.BROKER) — bu endpoint'e sadece Broker erişebilir
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
