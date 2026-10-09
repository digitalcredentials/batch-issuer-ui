import type { BatchIssuerAdapter } from '../adapter';
import type { Batch } from './types';
export declare function parseSpaceUrl(spaceUrl: string): {
    serverUrl: string;
    spaceId: string;
} | null;
export declare function saveBatch(adapter: BatchIssuerAdapter, batch: Batch): Promise<Batch>;
export declare function loadBatch(adapter: BatchIssuerAdapter, spaceUrl: string): Promise<Batch | null>;
export interface BatchLogCredential {
    emailSentAt?: string;
    collectedAt?: string;
    collections?: string[];
    revocationToken?: string;
    statusListCredential?: string;
    statusListIndex?: string;
    revokedAt?: string;
}
export interface BatchLog {
    entries: {
        type: string;
        at: string;
        recipientCount?: number;
    }[];
    credentials: Record<string, BatchLogCredential>;
}
export declare function loadBatchLog(adapter: BatchIssuerAdapter, spaceUrl: string): Promise<BatchLog | null>;
export declare function recipientsNotified(log: BatchLog | null): boolean;
export declare function revokeCredential(adapter: BatchIssuerAdapter, spaceUrl: string, credId: string, token: string): Promise<void>;
export declare function deleteBatch(adapter: BatchIssuerAdapter, batch: Batch): Promise<void>;
export declare function listBatches(adapter: BatchIssuerAdapter): Promise<Batch[]>;
