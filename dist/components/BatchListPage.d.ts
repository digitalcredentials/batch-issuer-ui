import type { BatchIssuerAdapter } from '../adapter';
import { type Batch } from '../lib/types';
export default function BatchListPage({ adapter, onEdit, }: {
    adapter: BatchIssuerAdapter;
    onEdit: (batch: Batch) => void;
}): import("react").JSX.Element;
