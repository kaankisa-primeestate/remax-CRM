import { Strategy } from 'passport-jwt';
import { UsersService } from '../users/users.service';
import { CurrentUserPayload } from './current-user.decorator';
declare const JwtStrategy_base: new (...args: any[]) => Strategy;
export declare class JwtStrategy extends JwtStrategy_base {
    private readonly usersService;
    constructor(usersService: UsersService);
    validate(payload: {
        sub: string;
        role: 'broker' | 'agent';
        name: string;
        email: string;
        iat: number;
    }): Promise<CurrentUserPayload>;
}
export {};
