const XLSX = require('xlsx');

try {
  const workbook = XLSX.readFile('cmdec_mock.xlsx');
  console.log('Sheet names:', workbook.SheetNames);

  workbook.SheetNames.forEach(sheetName => {
    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet, {header: 1});
    console.log(`Sheet: ${sheetName}, Rows: ${data.length}`);

    if (data.length > 0) {
      console.log('Headers:', data[0]);
      if (data.length > 1) {
        console.log('Sample row 1:', data[1]);
      }
      if (data.length > 2) {
        console.log('Sample row 2:', data[2]);
      }
      if (data.length > 3) {
        console.log('Sample row 3:', data[3]);
      }
    }
    console.log('---');
  });
} catch (error) {
  console.error('Error reading Excel file:', error);
}
