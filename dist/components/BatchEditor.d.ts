import type { BatchIssuerAdapter } from '../adapter';
import type { Batch } from '../lib/types';
export default function BatchEditor({ adapter, initialBatch, onDone, }: {
    adapter: BatchIssuerAdapter;
    initialBatch: Batch;
    onDone: () => void;
}): import("react").JSX.Element;
