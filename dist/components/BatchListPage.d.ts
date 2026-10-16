import type { BatchIssuerAdapter } from '../adapter';
import { type Batch } from '../lib/types';
export default function BatchListPage({ adapter, onEdit, openError, }: {
    adapter: BatchIssuerAdapter;
    onEdit: (batch: Batch) => void;
    openError?: string;
}): import("react").JSX.Element;
