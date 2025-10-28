import XLSX from 'xlsx';
import fs from 'fs';

console.log('=== EXTRACTING COMPLETE EXCEL DATA ===\n');

try {
  const workbook = XLSX.readFile('cmdec_mock.xlsx');
  console.log('Available sheets:', workbook.SheetNames);

  const extractedData = {};

  workbook.SheetNames.forEach((sheetName, index) => {
    console.log(`\n--- EXTRACTING SHEET: ${sheetName} ---`);
    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet);

    extractedData[sheetName] = data;
    console.log(`✓ Extracted ${data.length} rows from ${sheetName}`);

    if (data.length > 0) {
      console.log('Columns:', Object.keys(data[0]));
    }
  });

  // Save extracted data to JSON file
  fs.writeFileSync('extracted_excel_data.json', JSON.stringify(extractedData, null, 2));
  console.log('\n✅ All Excel data extracted and saved to extracted_excel_data.json');

  // Display summary
  console.log('\n=== DATA SUMMARY ===');
  Object.entries(extractedData).forEach(([sheetName, data]) => {
    console.log(`${sheetName}: ${Array.isArray(data) ? data.length : 'N/A'} records`);
  });

} catch (error) {
  console.error('❌ Error extracting Excel data:', error);
  process.exit(1);
}
