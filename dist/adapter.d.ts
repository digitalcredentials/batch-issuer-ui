import type { WasClient } from '@interop/was-client';
import type { Batch } from './lib/types';
export interface NotifyResult {
    sent: number;
    failures: {
        row: number;
        reason: string;
    }[];
    recipientRows?: Record<string, number>;
}
export interface SpaceInfo {
    url: string;
    type: string;
    name?: string;
    createdAt?: string;
}
export interface BatchIssuerAdapter {
    getSession(): Promise<{
        client: WasClient;
    } | null>;
    spaces: {
        create(type: 'batch', name: string): Promise<string>;
        list(): Promise<SpaceInfo[]>;
        remove(spaceUrl: string): Promise<void>;
    };
    notifyRecipients(batch: Batch): Promise<NotifyResult>;
    revokeStatus(revocationToken: string): Promise<void>;
    templatesApiBase: string;
    onUnauthorized(): void;
}
