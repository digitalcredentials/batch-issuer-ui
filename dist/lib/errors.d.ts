export type RequestAction = 'load-batches' | 'load-templates' | 'open-batch' | 'save' | 'notify' | 'resend' | 'revoke' | 'delete';
export declare class SpaceCreationError extends Error {
    constructor(cause: unknown);
}
export declare function describeFailure(action: RequestAction, error: unknown): string;
