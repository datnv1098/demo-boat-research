import('./src/data/convertedExcelData.ts').then(({ excelConvertedWaterQualityData }) => {
  console.log('=== DEMO: Water Quality Screen với Excel Data ===\n');

  // Adapter function (same as in App.tsx)
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

  const adaptedWaterQualityData = adaptExcelWaterQualityData(excelConvertedWaterQualityData);
  const selectedStation = 'WQ001';

  // Simulate WaterQualityPage logic
  const stationData = adaptedWaterQualityData.filter(d => d.stationId === selectedStation);
  const latestData = stationData[stationData.length - 1];

  console.log(`📊 สถานีที่เลือก: ${selectedStation}`);
  console.log(`📅 ข้อมูลล่าสุด: ${latestData?.date} ${latestData?.time}`);
  console.log(`📈 Water Quality Index: ${latestData?.waterQualityIndex.toFixed(1)}`);
  console.log(`🌊 สถานะโดยรวม: ${latestData?.overallQualityThai}`);

  console.log('\n📏 การวัดค่าล่าสุด:');
  console.log(`  • pH: ${latestData?.measurements.pH.value} (${latestData?.measurements.pH.statusThai})`);
  console.log(`  • อุณหภูมิ: ${latestData?.measurements.temperature.value}°C (${latestData?.measurements.temperature.statusThai})`);
  console.log(`  • ออกซิเจนละลาย: ${latestData?.measurements.dissolvedOxygen.value} mg/L (${latestData?.measurements.dissolvedOxygen.statusThai})`);
  console.log(`  • ความเค็ม: ${latestData?.measurements.salinity.value} PSU (${latestData?.measurements.salinity.statusThai})`);
  console.log(`  • ความข้น: ${latestData?.measurements.turbidity.value.toFixed(1)} NTU (${latestData?.measurements.turbidity.statusThai})`);
  console.log(`  • คลอโรฟิลล์: ${latestData?.measurements.chlorophyl.value.toFixed(1)} µg/L (${latestData?.measurements.chlorophyl.statusThai})`);

  console.log(`\n💡 คำแนะนำการประมง: ${latestData?.fishingRecommendation}`);

  // Statistics
  const uniqueStations = new Set(adaptedWaterQualityData.map(d => d.stationId));
  console.log(`\n📊 สถิติระบบ:`);
  console.log(`  • จำนวนสถานีทั้งหมด: ${uniqueStations.size}`);
  console.log(`  • จำนวนบันทึกข้อมูลทั้งหมด: ${adaptedWaterQualityData.length}`);
  console.log(`  • ข้อมูลสำหรับ ${selectedStation}: ${stationData.length} รายการ`);

  console.log('\n✅ Water Quality Screen ใช้ข้อมูลจาก Excel ได้สำเร็จ!');

}).catch(console.error);
