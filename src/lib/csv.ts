import Papa from 'papaparse'

export interface ParsedCsv {
  columns: string[]
  rows: Record<string, string>[]
}

// Parses an uploaded CSV file: first row is the header, every cell a string.
// Column order is preserved so the grid matches the file.
export function parseCsvFile(file: File): Promise<ParsedCsv> {
  return new Promise((resolve, reject) => {
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: 'greedy',
      transformHeader: (header) => header.trim(),
      complete: ({ data, meta, errors }) => {
        const fatal = errors.filter(({ code }) => code !== 'TooFewFields' && code !== 'TooManyFields')
        if (fatal.length) {
          reject(new Error(`CSV parse error: ${fatal[0].message}`))
          return
        }
        const columns = (meta.fields ?? []).filter((column) => column !== '')
        if (!columns.length) {
          reject(new Error('CSV has no header row.'))
          return
        }
        const rows = data.map((row) =>
          Object.fromEntries(columns.map((column) => [column, row[column] ?? '']))
        )
        resolve({ columns, rows })
      },
      error: (err) => reject(err),
    })
  })
}
