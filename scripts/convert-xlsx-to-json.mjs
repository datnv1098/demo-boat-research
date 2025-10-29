// Minimal XLSX to JSON converter for cmdec_mock.xlsx
import fs from 'node:fs'
import path from 'node:path'
import XLSX from 'xlsx'

const root = process.cwd()
const inputPath = path.join(root, 'cmdec_mock.xlsx')
const outputPath = path.join(root, 'cmdec_mock.json')

if (!fs.existsSync(inputPath)) {
	console.error('Input Excel not found:', inputPath)
	process.exit(1)
}

const wb = XLSX.readFile(inputPath, { cellDates: true })
const result = {}

for (const sheetName of wb.SheetNames) {
	const ws = wb.Sheets[sheetName]
	const data = XLSX.utils.sheet_to_json(ws, { defval: null })
	result[sheetName] = data
}

fs.writeFileSync(outputPath, JSON.stringify(result, null, 2), 'utf-8')
console.log('Written JSON to', outputPath)
