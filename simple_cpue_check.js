import('./src/data/convertedExcelData.ts').then(({ excelConvertedSpeciesInfo, excelConvertedCPUEData }) => {
  console.log('=== SIMPLE CPUE CHECK ===\n');

  const defaultSpecies = 'ปลาทู';
  const defaultArea = 'อ่าวไทยตอนบน (ชลบุรี-ประจวบคีรีขันธ์)';

  console.log(`Testing: ${defaultSpecies} in ${defaultArea}`);

  // Exact same logic as in CPUEPage
  const series = excelConvertedCPUEData
    .filter((d) => d.species === defaultSpecies && d.fishingArea === defaultArea)
    .map((d) => ({ x: d.month, y: d.cpue }));

  console.log(`Data points: ${series.length}`);

  if (series.length === 0) {
    console.log('❌ NO DATA FOUND!');
    console.log('Checking available areas for this species:');
    const availableAreas = [...new Set(
      excelConvertedCPUEData
        .filter(d => d.species === defaultSpecies)
        .map(d => d.fishingArea)
    )];
    console.log(availableAreas);

    // Try with first available area
    if (availableAreas.length > 0) {
      const firstArea = availableAreas[0];
      console.log(`\nTrying with first available area: ${firstArea}`);
      const testSeries = excelConvertedCPUEData
        .filter((d) => d.species === defaultSpecies && d.fishingArea === firstArea)
        .map((d) => ({ x: d.month, y: d.cpue }));
      console.log(`Data points with ${firstArea}: ${testSeries.length}`);
    }
  } else {
    console.log('✅ DATA FOUND!');
    console.log('Sample:', series.slice(0, 3));
  }

}).catch(console.error);
