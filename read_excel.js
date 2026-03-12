import * as xlsx from 'xlsx';
import * as fs from 'fs';

const filePath = './document/ตัวอย่างข้อมูลทร้พยากรสัตว์น้ำจากเรือสำ.xlsx';
const workbook = xlsx.readFile(filePath);

console.log('Sheet Names:', workbook.SheetNames);

workbook.SheetNames.forEach(sheetName => {
  console.log(`\n\n--- Sheet: ${sheetName} ---`);
  const sheet = workbook.Sheets[sheetName];
  const data = xlsx.utils.sheet_to_json(sheet, { header: 1 });
  
  if (data.length > 0) {
    console.log('Columns:', data[0]);
    console.log('First 3 rows of data:');
    console.log(data.slice(1, 4));
  } else {
    console.log('Sheet is empty');
  }
});
