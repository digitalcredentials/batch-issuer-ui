export interface ParsedCsv {
    columns: string[];
    rows: Record<string, string>[];
}
export declare function parseCsvFile(file: File): Promise<ParsedCsv>;
