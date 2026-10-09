export interface BatchIssuerDetails {
    name: string;
    url?: string;
    image?: string;
}
export interface Batch {
    id: string;
    spaceUrl: string;
    name: string;
    description: string;
    issuer: BatchIssuerDetails;
    image?: string;
    achievementId: string;
    templateId: string;
    columns: string[];
    rows: Record<string, string>[];
    createdAt: string;
    updatedAt: string;
}
export interface TemplateField {
    name: string;
    label: string;
    required: boolean;
}
export interface TemplateInfo {
    id: string;
    name: string;
    description: string;
    fields: TemplateField[];
}
export declare function newBatch(): Batch;
