// Editable recipient grid: every cell is an input, rows can be deleted or
// inserted anywhere, and a new row can be appended at the end.

export default function RowGrid({
  columns,
  rows,
  onChange,
}: {
  columns: string[]
  rows: Record<string, string>[]
  onChange: (rows: Record<string, string>[]) => void
}) {
  function blankRow(): Record<string, string> {
    return Object.fromEntries(columns.map((column) => [column, '']))
  }

  function setCell(rowIndex: number, column: string, value: string) {
    onChange(rows.map((row, i) => (i === rowIndex ? { ...row, [column]: value } : row)))
  }

  function deleteRow(rowIndex: number) {
    onChange(rows.filter((_, i) => i !== rowIndex))
  }

  function insertRowBelow(rowIndex: number) {
    const next = [...rows]
    next.splice(rowIndex + 1, 0, blankRow())
    onChange(next)
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
      <table className="w-full min-w-max border-collapse text-sm">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50 text-left">
            <th className="w-10 px-2 py-2 font-medium text-slate-400">#</th>
            {columns.map((column) => (
              <th key={column} className="px-3 py-2 font-medium text-slate-700">
                {column}
              </th>
            ))}
            <th className="w-24 px-2 py-2" />
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={rowIndex} className="border-b border-slate-100 last:border-b-0">
              <td className="px-2 py-1 text-slate-400">{rowIndex + 1}</td>
              {columns.map((column) => (
                <td key={column} className="px-1 py-1">
                  <input
                    value={row[column] ?? ''}
                    onChange={(e) => setCell(rowIndex, column, e.target.value)}
                    className="w-full min-w-32 rounded border border-transparent px-2 py-1 hover:border-slate-200 focus:border-indigo-500 focus:outline-none"
                  />
                </td>
              ))}
              <td className="whitespace-nowrap px-2 py-1 text-right">
                <button
                  type="button"
                  title="Insert row below"
                  onClick={() => insertRowBelow(rowIndex)}
                  className="rounded px-2 py-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                >
                  +
                </button>
                <button
                  type="button"
                  title="Delete row"
                  onClick={() => deleteRow(rowIndex)}
                  className="rounded px-2 py-1 text-slate-400 hover:bg-red-50 hover:text-red-600"
                >
                  ✕
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="border-t border-slate-200 px-3 py-2">
        <button
          type="button"
          onClick={() => onChange([...rows, blankRow()])}
          className="text-sm text-indigo-600 hover:text-indigo-800"
        >
          + Add row
        </button>
      </div>
    </div>
  )
}
