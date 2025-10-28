import('./src/data/convertedExcelData.ts').then(({ excelConvertedCPUEData }) => {
  console.log('=== CHECKING NEW DEFAULT AREA ===\n');

  const newDefaultArea = 'ฝั่งอันดามันเหนือ (ระนอง-พังงา)';
  const defaultSpecies = 'ปลาทู';

  console.log(`Testing new default area: ${newDefaultArea}`);
  console.log(`With default species: ${defaultSpecies}`);

  // Check data for this combination
  const series = excelConvertedCPUEData
    .filter((d) => d.species === defaultSpecies && d.fishingArea === newDefaultArea)
    .map((d) => ({ x: d.month, y: d.cpue }));

  console.log(`\n📊 Data points found: ${series.length}`);

  if (series.length > 0) {
    console.log('✅ SUCCESS: New default area has data!');
    console.log('Sample data points:', series.slice(0, 3));

    // Show unique months
    const months = [...new Set(series.map(d => d.x))].sort();
    console.log(`📅 Available months: ${months.length} (${months.join(', ')})`);

    // Show CPUE range
    const cpueValues = series.map(d => d.y);
    const minCPUE = Math.min(...cpueValues);
    const maxCPUE = Math.max(...cpueValues);
    const avgCPUE = cpueValues.reduce((a, b) => a + b, 0) / cpueValues.length;

    console.log(`🎯 CPUE Range: ${minCPUE.toFixed(1)} - ${maxCPUE.toFixed(1)} (avg: ${avgCPUE.toFixed(1)})`);

  } else {
    console.log('❌ WARNING: No data found for new default area!');
    console.log('Available areas for this species:');

    const availableAreas = [...new Set(
      excelConvertedCPUEData
        .filter(d => d.species === defaultSpecies)
        .map(d => d.fishingArea)
    )];

    console.log(availableAreas);
  }

}).catch(console.error);
