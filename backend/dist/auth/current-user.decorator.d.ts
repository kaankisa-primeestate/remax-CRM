export interface CurrentUserPayload {
    userId: string;
    role: 'broker' | 'agent';
    name: string;
    email: string;
}
export declare const CurrentUser: (...dataOrPipes: unknown[]) => ParameterDecorator;
