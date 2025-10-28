import('./src/data/convertedExcelData.ts').then(({ excelConvertedWaterQualityData }) => {
  console.log('Excel Water Quality Data Sample:');
  console.log(JSON.stringify(excelConvertedWaterQualityData.slice(0, 3), null, 2));
  console.log(`Total records: ${excelConvertedWaterQualityData.length}`);

  // Test adapter function
  const adaptExcelWaterQualityData = (excelData) => {
    return excelData.map((record, index) => ({
      stationId: `WQ${String(index + 1).padStart(3, '0')}`,
      date: `2025-10-${String((index % 28) + 1).padStart(2, '0')}`,
      time: `${String((index % 24)).padStart(2, '0')}:00`,
      measurements: {
        pH: { value: record.pH.surface, status: 'normal', statusThai: 'ปกติ' },
        temperature: { value: record.temperature.surface, status: 'normal', statusThai: 'ปกติ' },
        dissolvedOxygen: { value: record.dissolvedOxygen.surface, status: 'normal', statusThai: 'ปกติ' },
        salinity: { value: record.salinity.surface, status: 'normal', statusThai: 'ปกติ' },
        turbidity: { value: 10 + Math.random() * 20, unit: 'NTU', status: 'clear', statusThai: 'ใส' },
        conductivity: { value: 35000 + Math.random() * 10000 },
        chlorophyl: { value: record.chlorophyl || 5 + Math.random() * 10, status: 'normal', statusThai: 'ปกติ' }
      },
      overallQuality: 'good',
      overallQualityThai: 'ดี',
      waterQualityIndex: 75 + Math.random() * 20,
      fishingRecommendation: 'เงื่อนไขน้ำเหมาะสมสำหรับการประมง แนะนำใช้เครื่องมือลากและอุปกรณ์เสริม',
      alerts: []
    }));
  };

  const adaptedData = adaptExcelWaterQualityData(excelConvertedWaterQualityData);
  console.log('\nAdapted Data Sample:');
  console.log(JSON.stringify(adaptedData.slice(0, 2), null, 2));

  // Test station filtering
  const stationData = adaptedData.filter(d => d.stationId === 'WQ001');
  console.log(`\nWQ001 station has ${stationData.length} records`);

}).catch(console.error);
