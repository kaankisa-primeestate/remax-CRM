import { Strategy } from 'passport-jwt';
import { CurrentUserPayload } from './current-user.decorator';
declare const JwtStrategy_base: new (...args: any[]) => Strategy;
export declare class JwtStrategy extends JwtStrategy_base {
    constructor();
    validate(payload: {
        sub: string;
        role: 'broker' | 'agent';
        name: string;
        email: string;
    }): Promise<CurrentUserPayload>;
}
export {};
