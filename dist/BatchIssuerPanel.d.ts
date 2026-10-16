import type { BatchIssuerAdapter } from './adapter';
export default function BatchIssuerPanel({ adapter, initialSpaceUrl, }: {
    adapter: BatchIssuerAdapter;
    initialSpaceUrl?: string;
}): import("react").JSX.Element;
