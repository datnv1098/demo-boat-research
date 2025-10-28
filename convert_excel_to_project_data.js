import fs from 'fs';

// Copy necessary functions from excelParser.ts
const TRANSLATION_DICT = {
  'Short mackerel': 'ปลาทูสั้น',
  'Indian mackerel': 'ปลาทูอินเดีย',
  'Island mackerel': 'ปลาทูเกาะ',
  'Mackerel': 'ปลาทู',
  'Narrow-barred Spanish mackerel': 'ปลาอินทรีย์บาร์แคบ',
  'Indo-Pacific king mackerel': 'ปลาอินทรีย์พระราชา',
  'Dorab wolf-herring': 'ปลาดาบหมาป่า',
  'Frigate tuna': 'ปลาโอฟริเกต',
  'Kawakawa': 'ปลาโอคาวาคาวา',
  'Longtail tuna': 'ปลาโอหางยาว',
  'Tuna': 'ปลาโอ',
  'Giant Tiger Prawn': 'กุ้งกุลาดำยักษ์',
  'Banana Prawn': 'กุ้งกล้วย',
  'Indian Squid': 'หมึกอินเดีย',
  'Splendid squid': 'หมึกงาม',
  'Mitre squid': 'หมึกมิเตอร์'
};

const translateToThai = (text) => {
  if (!text) return text;
  return TRANSLATION_DICT[text] || text;
};

const coordinatesToFishingArea = (lat, lon) => {
  if (lat >= 12.0 && lon >= 99.5 && lon <= 102.0) {
    return 'อ่าวไทยตอนบน (ชลบุรี-ประจวบคีรีขันธ์)';
  } else if (lat >= 9.0 && lat < 12.0 && lon >= 99.5 && lon <= 102.0) {
    return 'อ่าวไทยตอนล่าง (ชุมพร-สงขลา)';
  } else if (lat >= 9.5 && lon >= 97.5 && lon < 99.5) {
    return 'ฝั่งอันดามันเหนือ (ระนอง-พังงา)';
  } else if (lat < 9.5 && lon >= 97.5 && lon < 99.5) {
    return 'ฝั่งอันดามันใต้ (ภูเก็ต-สตูล)';
  } else if (lat >= 8.0 && lat < 12.0 && lon >= 102.0) {
    return 'น่านน้ำลึกอ่าวไทย';
  } else if (lat >= 6.0 && lat < 10.0 && lon < 97.5) {
    return 'น่านน้ำลึกอันดามัน';
  } else {
    return 'พื้นที่ประมงอื่น';
  }
};

const generateThaiCaptainName = (index) => {
  const thaiNames = [
    'นายสมชาย จันทร์เพ็ญ', 'นายวิชัย ทองคำ', 'นายประยุทธ์ ใสใจ', 'นายสุทิน แสงทอง',
    'นายจำรัส มณีแก้ว', 'นายธีรพงษ์ สุขสม', 'นายชาติชาย ปลิงใส', 'นายกิตติศักดิ์ นามแพง',
    'นายบุญชู เรืองยศ', 'นายอนันต์ จับปลา', 'นายสมบัติ ทะเลสาคร', 'นายมานะ จับปลา',
    'นายสุชาติ ประมงใจ', 'นายวิรัตน์ ชายทะเล', 'นายสนิท กุ้งใหญ่', 'นายพิเชษฐ์ หอยแมลงภู่',
    'นายรุ่งโรจน์ ประมงดี', 'นายสมพร เรือดี', 'นายอุดม ประมงเจริญ', 'นายศิลป์ชัย ทะเลงาม'
  ];
  return thaiNames[index % thaiNames.length];
};

const generateThaiVesselName = (vesselCode, index) => {
  const prefixes = ['กท', 'ระย', 'ภก', 'ตรง', 'สข', 'สร', 'ปท', 'อุบ', 'นค', 'ขก'];
  const numbers = [80000, 80001, 80002, 80003, 80004, 80005, 80006, 80007, 80008, 80009];
  return `${prefixes[index % prefixes.length]}-${numbers[index % numbers.length]}`;
};

const getLinkToVesselType = (link) => {
  if (link.includes('TSCM')) {
    return 'เรือสำรวจทรัพยากรประมง';
  } else if (link.includes('COM')) {
    return 'เรือประมงเชิงพาณิชย์';
  } else if (link.includes('ART')) {
    return 'เรือประมงพื้นบ้าน';
  } else {
    return 'เรือประมงทั่วไป';
  }
};

const calculateCPUE = (totalWeight, effortHours) => {
  if (effortHours === 0) return 0;
  return Math.round((totalWeight / effortHours) * 10) / 10;
};

const generateDataQualityScore = (hasCoordinates, hasWeight, hasSpeciesInfo, hasWaterQuality) => {
  let score = 50;
  if (hasCoordinates) score += 20;
  if (hasWeight) score += 15;
  if (hasSpeciesInfo) score += 10;
  if (hasWaterQuality) score += 5;
  return Math.min(100, score);
};

const estimateFuelConsumption = (durationHours, vesselType) => {
  let baseConsumption = 15;
  if (vesselType.includes('วิจัย')) {
    baseConsumption = 12;
  } else if (vesselType.includes('เชิงพาณิชย์')) {
    baseConsumption = 20;
  }
  return Math.round(durationHours * baseConsumption);
};

const parseFreqText = (freqtext) => {
  if (!freqtext || freqtext.trim() === '') return null;

  try {
    const parts = freqtext.split(',');
    if (parts.length < 3) return null;

    const factor = parseFloat(parts[0]) || 0.5;
    const meanLength = parseFloat(parts[1]) || 0;
    const distribution = parts.slice(2).map(x => parseInt(x.trim()) || 0);

    return {
      factor,
      meanLength,
      distribution
    };
  } catch (error) {
    console.warn('Error parsing freqtext:', freqtext, error);
    return null;
  }
};

// Import the extracted Excel data
const extractedData = JSON.parse(fs.readFileSync('extracted_excel_data.json', 'utf8'));

console.log('=== CONVERTING EXCEL DATA TO PROJECT FORMAT ===\n');

// Function to convert header data to Trip format
function convertHeaderToTrips(headerData) {
  console.log(`Converting ${headerData.length} header records to Trip format...`);

  const trips = headerData.map((header, index) => {
    const startDate = new Date(header.Date);
    const durationHours = header.Tow / 60; // Convert minutes to hours
    const endDate = new Date(startDate.getTime() + header.Tow * 60 * 1000);

    // Determine fishing area based on coordinates
    const fishingArea = coordinatesToFishingArea(header.LatStart, header.LongStart);
    const vesselType = getLinkToVesselType(header.Link);
    const captain = generateThaiCaptainName(index);
    const vesselName = generateThaiVesselName(header.Link, index);

    // Calculate total catch from catch data
    const tripCatchData = extractedData.catch.filter(catchRecord => catchRecord.Link === header.Link);
    const totalCatch = tripCatchData.reduce((sum, catchRecord) => sum + (catchRecord.total_weight || 0), 0);

    // Calculate data quality score
    const dqScore = generateDataQualityScore(
      true, // Has coordinates
      totalCatch > 0, // Has weight data
      tripCatchData.length > 0, // Has species info
      false // No water quality data in header
    );

    const fuelConsumption = estimateFuelConsumption(durationHours, vesselType);

    // Generate issues based on data quality
    const issues = [];
    if (totalCatch === 0) issues.push('ไม่มีข้อมูลการจับ');
    if (header.Depth < 10) issues.push('ความลึกทะเลน้อยกว่า 10 เมตร');
    if (tripCatchData.length === 0) issues.push('ไม่มีข้อมูลสายพันธุ์');

    return {
      tripId: header.Link,
      vessel: vesselName,
      vesselType: vesselType,
      captain: captain,
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
      fishingArea: fishingArea,
      coordinates: {
        lat: Math.round(((header.LatStart + header.LatEnd) / 2) * 1000000) / 1000000,
        lon: Math.round(((header.LongStart + header.LongEnd) / 2) * 1000000) / 1000000
      },
      duration: Math.round(durationHours * 10) / 10,
      dqScore: dqScore,
      issues: issues,
      totalCatch: Math.round(totalCatch * 10) / 10,
      fuelConsumption: fuelConsumption
    };
  });

  console.log(`✅ Converted ${trips.length} trips`);
  return trips;
}

// Function to convert catch data to CPUE format
function convertCatchToCPUE(catchData, headerData, speciesList) {
  console.log(`Converting ${catchData.length} catch records to CPUE format...`);

  const cpueData = [];

  // Define common species for different weight ranges (expanded for more variety)
  const weightBasedSpecies = {
    small: ['กุ้งแชบ๊วย', 'กุ้งกุลาดำ', 'หมึกกล้วย', 'ปลาซาร์ดีน', 'ปลาอินทรีย์', 'ปลาสีกุน', 'ปลาจูบ๊วย', 'หมึก'],
    medium: ['ปลาทู', 'ปลาเก๋า', 'ปลาจะละเม็ด', 'ปลาแรด', 'หอยแมลงภู่', 'ปลากะพง', 'ปลาทราย', 'ปลาปากคม'],
    large: ['ปลาจะละเม็ด', 'ปลาแรด', 'ปลาเก๋า', 'ปลาทู', 'หมึกกล้วย', 'ปลาช่อน', 'ปลาเสือ', 'ปลากระโห้']
  };

  // Get available species names for random assignment
  const availableSpecies = Object.keys(speciesList);
  const commonSpecies = ['ปลาทู', 'ปลาเก๋า', 'ปลาจะละเม็ด', 'หมึกกล้วย', 'กุ้งกุลาดำ', 'กุ้งแชบ๊วย'];

  catchData.forEach((catchRecord, index) => {
    const header = headerData.find(h => h.Link === catchRecord.Link);
    if (!header) return;

    const effortHours = header.Tow / 60;
    const weight = catchRecord.total_weight || 0;
    const cpue = calculateCPUE(weight, effortHours);
    const fishingArea = coordinatesToFishingArea(header.LatStart, header.LongStart);

    // Hybrid assignment: weight-based for some, random for variety
    let speciesName;

    // 30% use weight-based assignment for realism
    if (Math.random() < 0.3) {
      if (weight < 50) {
        speciesName = weightBasedSpecies.small[Math.floor(Math.random() * weightBasedSpecies.small.length)];
      } else if (weight < 150) {
        speciesName = weightBasedSpecies.medium[Math.floor(Math.random() * weightBasedSpecies.medium.length)];
      } else {
        speciesName = weightBasedSpecies.large[Math.floor(Math.random() * weightBasedSpecies.large.length)];
      }
    } else {
      // 70% use random assignment from common species for variety
      speciesName = commonSpecies[Math.floor(Math.random() * commonSpecies.length)];
    }

    // Ensure species exists in our species list
    if (!speciesList[speciesName]) {
      // Try to find a similar species or fallback
      const fallbackSpecies = availableSpecies.find(s => s.includes('ปลา') || s.includes('กุ้ง') || s.includes('หมึก'));
      speciesName = fallbackSpecies || 'ปลาทู';
    }

    cpueData.push({
      date: header.Date,
      month: header.Date.substring(0, 7),
      fishingArea: fishingArea,
      species: speciesName,
      cpue: cpue,
      effort: Math.round(effortHours * 10) / 10,
      catch: weight
    });
  });

  console.log(`✅ Converted ${cpueData.length} CPUE records`);
  return cpueData;
}

// Function to convert catch data to length format
function convertCatchToLength(catchData, headerData, speciesList) {
  console.log(`Converting catch records to length format...`);

  const lengthData = [];

  // Same weight-based species assignment as CPUE
  const weightBasedSpecies = {
    small: ['กุ้งแชบ๊วย', 'กุ้งกุลาดำ', 'หมึกกล้วย', 'ปลาซาร์ดีน', 'ปลาอินทรีย์'],
    medium: ['ปลาทู', 'ปลาเก๋า', 'ปลาจะละเม็ด', 'ปลาแรด', 'หอยแมลงภู่'],
    large: ['ปลาจะละเม็ด', 'ปลาแรด', 'ปลาเก๋า', 'ปลาทู', 'หมึกกล้วย']
  };

  catchData.forEach((catchRecord, index) => {
    if (!catchRecord.freqtext) return;

    const header = headerData.find(h => h.Link === catchRecord.Link);
    if (!header) return;

    const freqData = parseFreqText(catchRecord.freqtext);
    if (!freqData) return;

    // Use same species assignment logic as CPUE
    const weight = catchRecord.total_weight || 0;
    let speciesName;
    if (weight < 50) {
      speciesName = weightBasedSpecies.small[index % weightBasedSpecies.small.length];
    } else if (weight < 150) {
      speciesName = weightBasedSpecies.medium[index % weightBasedSpecies.medium.length];
    } else {
      speciesName = weightBasedSpecies.large[index % weightBasedSpecies.large.length];
    }

    if (!speciesList[speciesName]) {
      speciesName = 'ปลาทู'; // Default fallback
    }

    const fishingArea = coordinatesToFishingArea(header.LatStart, header.LongStart);
    const season = getSeasonFromDate(header.Date);

    // Create length bins from distribution
    freqData.distribution.forEach((count, binIndex) => {
      if (count > 0) {
        const lengthBin = `${freqData.meanLength + (binIndex - 2) * 2}-${freqData.meanLength + (binIndex - 1) * 2}ซม.`;

        lengthData.push({
          species: speciesName,
          lengthBin: lengthBin,
          male: Math.round(count * 0.48),
          female: Math.round(count * 0.52),
          unsexed: 0,
          area: fishingArea.split(' ')[0],
          season: season
        });
      }
    });
  });

  console.log(`✅ Converted ${lengthData.length} length records`);
  return lengthData;
}

// Function to convert water quality data
function convertWaterQuality(waterQualityData) {
  console.log(`Converting ${waterQualityData.length} water quality records...`);

  const wqData = waterQualityData.map(wq => ({
    tripId: wq.link,
    salinity: {
      surface: wq.Salinity_surface || 0,
      middle: 0, // Not available in data
      bottom: 0   // Not available in data
    },
    temperature: {
      surface: wq.Temp_surface || 0,
      middle: 0,
      bottom: 0
    },
    pH: {
      surface: wq.pH_surface || 0,
      middle: 0,
      bottom: 0
    },
    dissolvedOxygen: {
      surface: wq.DO_surface || 0,
      middle: 0,
      bottom: 0
    },
    transparency: wq.Transparency || 0,
    remark: undefined
  }));

  console.log(`✅ Converted ${wqData.length} water quality records`);
  return wqData;
}

// Function to convert species data
function convertSpeciesData(speciesData) {
  console.log(`Converting ${speciesData.length} species records...`);

  const speciesInfo = {};

  speciesData.forEach(species => {
    const id = species['ชนิดสัตว์น้ำสำหรับงานเรือสำรวจ (trawl survey, TS) จำนวน 279 ชนิดจากรายชื่อที่กำหนดเลขประจำตัวไว้ทั้งหมด 299 ชนิด'];
    const scientificName = species['Unnamed: 1']; // Scientific name
    const commonName = species['Unnamed: 2']; // Common name
    const thaiName = species['Unnamed: 3']; // Thai name

    // Skip header rows and invalid entries
    if (!id || typeof id !== 'number' || !thaiName || thaiName === 'ThaiName') {
      return;
    }

    // Use thaiName as key for easy lookup
    const key = thaiName.split(',')[0].trim(); // Use first thai name if multiple

    speciesInfo[key] = {
      scientificName: scientificName || id.toString(),
      commonName: commonName || thaiName,
      thaiName: thaiName,
      lm50: estimateLm50(scientificName),
      maxLength: estimateMaxLength(scientificName),
      habitat: getHabitatFromGroup(species['Unnamed: 5'] || ''),
      economicValue: getEconomicValueFromGroup(species['Unnamed: 5'] || '')
    };
  });

  console.log(`✅ Converted ${Object.keys(speciesInfo).length} species records`);
  return speciesInfo;
}

// Helper functions
function getSeasonFromDate(dateString) {
  const month = parseInt(dateString.split('-')[1]);
  if (month >= 3 && month <= 5) return 'Q1';
  if (month >= 6 && month <= 8) return 'Q2';
  if (month >= 9 && month <= 11) return 'Q3';
  return 'Q4';
}

function estimateLm50(scientificName) {
  if (!scientificName || typeof scientificName !== 'string') return 15;
  if (scientificName.includes('Rastrelliger')) return 22;
  if (scientificName.includes('Lutjanus')) return 25;
  if (scientificName.includes('Nemipterus')) return 18;
  if (scientificName.includes('Saurida')) return 20;
  return 15;
}

function estimateMaxLength(scientificName) {
  if (!scientificName || typeof scientificName !== 'string') return 30;
  if (scientificName.includes('Rastrelliger')) return 35;
  if (scientificName.includes('Lutjanus')) return 60;
  if (scientificName.includes('Nemipterus')) return 35;
  if (scientificName.includes('Saurida')) return 40;
  return 30;
}

function getHabitatFromGroup(groupName) {
  if (!groupName || typeof groupName !== 'string') return 'ทั่วไป';
  if (groupName.includes('Pelagic')) return 'ผิวน้ำ, ฝูงปลา';
  if (groupName.includes('Demersal')) return 'พื้นทะเล';
  return 'ทั่วไป';
}

function getEconomicValueFromGroup(groupName) {
  if (!groupName || typeof groupName !== 'string') return 'ปานกลาง';
  if (groupName.includes('Pelagic')) return 'สูง';
  if (groupName.includes('Demersal')) return 'สูงมาก';
  return 'ปานกลาง';
}

// Main conversion process
console.log('Starting data conversion...\n');

const speciesInfo = convertSpeciesData(extractedData.TS_Spp);

const convertedData = {
  trips: convertHeaderToTrips(extractedData.header),
  cpueData: convertCatchToCPUE(extractedData.catch, extractedData.header, speciesInfo),
  lengthData: convertCatchToLength(extractedData.catch, extractedData.header, speciesInfo),
  waterQualityData: convertWaterQuality(extractedData.Water_QL),
  speciesInfo: speciesInfo
};

// Save converted data
fs.writeFileSync('converted_excel_data.json', JSON.stringify(convertedData, null, 2));

console.log('\n=== CONVERSION COMPLETE ===');
console.log(`📊 Trips: ${convertedData.trips.length}`);
console.log(`📈 CPUE Records: ${convertedData.cpueData.length}`);
console.log(`📏 Length Records: ${convertedData.lengthData.length}`);
console.log(`💧 Water Quality Records: ${convertedData.waterQualityData.length}`);
console.log(`🐟 Species Records: ${Object.keys(convertedData.speciesInfo).length}`);

console.log('\n✅ All data converted and saved to converted_excel_data.json');

// Create a project-ready data file
const projectDataFile = `// Complete Excel Data Converted for Thai Fisheries Project
// Generated from cmdec_mock.xlsx on ${new Date().toISOString()}

export const excelConvertedTrips = ${JSON.stringify(convertedData.trips, null, 2)};

export const excelConvertedCPUEData = ${JSON.stringify(convertedData.cpueData, null, 2)};

export const excelConvertedLengthData = ${JSON.stringify(convertedData.lengthData, null, 2)};

export const excelConvertedWaterQualityData = ${JSON.stringify(convertedData.waterQualityData, null, 2)};

export const excelConvertedSpeciesInfo = ${JSON.stringify(convertedData.speciesInfo, null, 2)};

// Summary Statistics
export const EXCEL_DATA_SUMMARY = {
  totalTrips: ${convertedData.trips.length},
  totalCPUE: ${convertedData.cpueData.length},
  totalLength: ${convertedData.lengthData.length},
  totalWaterQuality: ${convertedData.waterQualityData.length},
  totalSpecies: ${Object.keys(convertedData.speciesInfo).length},
  dataSource: 'cmdec_mock.xlsx',
  conversionDate: '${new Date().toISOString()}',
  coverage: 'Complete Excel dataset conversion'
};
`;

fs.writeFileSync('src/data/convertedExcelData.ts', projectDataFile);
console.log('📁 Project data file created: src/data/convertedExcelData.ts');
