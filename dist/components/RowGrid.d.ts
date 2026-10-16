export default function RowGrid({ columns, rows, onChange, readOnly, }: {
    columns: string[];
    rows: Record<string, string>[];
    onChange: (rows: Record<string, string>[]) => void;
    readOnly?: boolean;
}): import("react").JSX.Element;
