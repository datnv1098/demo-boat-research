// Enhanced Mock Data Generation System for Thai Fisheries Analytics
// ปรับปรุงระบบสร้างข้อมูลจำลองสำหรับการวิเคราะห์ประมงไทย

import {
  Trip,
  CPUEData,
  LengthData,
  SpeciesInfo,
  FISHING_AREAS,
  SPECIES_INFO,
  realTrips,
  realCPUEData,
  realLengthData,
  realSpeciesInfo
} from './mockData';
import { generateThaiCaptainName, generateThaiVesselName } from './excelParser';

// Enhanced Trip Generation with More Realistic Patterns
export const generateEnhancedTrips = (count: number = 50): Trip[] => {
  const vesselTypes = [
    'อวนรุ่น', 'อวนล้อม', 'ราวตก', 'อวนลากก้น', 'ปังโตล',
    'เบ็ดราว', 'อวนชั้น', 'อวนลากกลางน้ำ', 'เครื่องมือประมงพื้นบ้าน'
  ];

  const areas = Object.keys(FISHING_AREAS);

  // Seasonal patterns for different areas
  const seasonalMultipliers = {
    'อ่าวไทยตอนบน (ชลบุรี-ประจวบคีรีขันธ์)': {
      Q1: 0.8, Q2: 1.2, Q3: 1.4, Q4: 1.0
    },
    'อ่าวไทยตอนล่าง (ชุมพร-สงขลา)': {
      Q1: 1.0, Q2: 1.3, Q3: 1.1, Q4: 0.9
    },
    'ฝั่งอันดามันเหนือ (ระนอง-พังงา)': {
      Q1: 0.9, Q2: 1.1, Q3: 1.3, Q4: 1.0
    },
    'ฝั่งอันดามันใต้ (ภูเก็ต-สตูล)': {
      Q1: 1.1, Q2: 0.8, Q3: 1.2, Q4: 1.4
    }
  };

  return Array.from({ length: count }, (_, i) => {
    const area = areas[i % areas.length];
    const baseDate = new Date(2024, Math.floor(i / 12), (i % 28) + 1);
    const season = Math.floor((baseDate.getMonth() + 1) / 3); // 0-3 for Q1-Q4
    const seasonKey = ['Q1', 'Q2', 'Q3', 'Q4'][season] as keyof typeof seasonalMultipliers[typeof area];

    // Apply seasonal multiplier
    const seasonalMultiplier = seasonalMultipliers[area as keyof typeof seasonalMultipliers]?.[seasonKey] || 1.0;

    const duration = (8 + Math.random() * 16) * seasonalMultiplier; // 8-24 ชั่วโมง ปรับตามฤดูกาล
    const endDate = new Date(baseDate.getTime() + duration * 60 * 60 * 1000);

    // More realistic catch calculation based on area and season
    const baseCatch = {
      'อ่าวไทยตอนบน (ชลบุรี-ประจวบคีรีขันธ์)': 120,
      'อ่าวไทยตอนล่าง (ชุมพร-สงขลา)': 180,
      'ฝั่งอันดามันเหนือ (ระนอง-พังงา)': 90,
      'ฝั่งอันดามันใต้ (ภูเก็ต-สตูล)': 150,
      'น่านน้ำลึกอ่าวไทย': 200,
      'น่านน้ำลึกอันดามัน': 160
    }[area] || 100;

    const totalCatch = Math.round(baseCatch * seasonalMultiplier * (0.7 + Math.random() * 0.6));

    const issues = [];
    if (Math.random() < 0.12) issues.push('พิกัด GPS ไม่ถูกต้อง');
    if (Math.random() < 0.08) issues.push('ความลึกทะเลผิดปกติ');
    if (Math.random() < 0.15) issues.push('ข้อมูลน้ำหนักไม่ครบถ้วน');
    if (Math.random() < 0.05) issues.push('รหัสสายพันธุ์ซ้ำซ้อน');

    return {
      tripId: `TH-${String(1000 + i + 1).padStart(4, '0')}`,
      vessel: generateThaiVesselName(`V${i % 5}`, i),
      vesselType: vesselTypes[i % vesselTypes.length],
      captain: generateThaiCaptainName(i),
      startDate: baseDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
      fishingArea: area,
      coordinates: FISHING_AREAS[area as keyof typeof FISHING_AREAS],
      duration: Math.round(duration * 10) / 10,
      dqScore: Math.round((75 + Math.random() * 20 + (issues.length === 0 ? 8 : -issues.length * 4)) * 10) / 10,
      issues,
      totalCatch,
      fuelConsumption: Math.round(duration * (12 + Math.random() * 8))
    };
  });
};

// Enhanced CPUE Data with Species-Specific Patterns
export const generateEnhancedCPUEData = (): CPUEData[] => {
  const data: CPUEData[] = [];
  const speciesKeys = Object.keys(SPECIES_INFO);

  // Species-specific seasonal patterns
  const speciesPatterns = {
    'ปลาทู': { peakSeason: 2, peakMultiplier: 1.8, baseCPUE: 25 },
    'ปลาเก๋า': { peakSeason: 0, peakMultiplier: 1.5, baseCPUE: 5 },
    'กุ้งแชบ๊วย': { peakSeason: 1, peakMultiplier: 2.0, baseCPUE: 8 },
    'กุ้งกุลาดำ': { peakSeason: 1, peakMultiplier: 1.6, baseCPUE: 4 },
    'หมึกกล้วย': { peakSeason: 2, peakMultiplier: 1.7, baseCPUE: 12 },
    'ปลาอินทรีย์': { peakSeason: 3, peakMultiplier: 1.4, baseCPUE: 18 }
  };

  const areas = Object.keys(FISHING_AREAS).slice(0, 8); // Use more areas

  // Generate 36 months of data
  for (let month = 0; month < 36; month++) {
    const date = new Date(2022, month % 12, 15);
    const monthStr = date.toISOString().slice(0, 7);
    const season = Math.floor((month % 12) / 3); // 0=Q1, 1=Q2, 2=Q3, 3=Q4

    speciesKeys.forEach(speciesName => {
      if (!SPECIES_INFO[speciesName]) return;

      areas.forEach(area => {
        const pattern = speciesPatterns[speciesName as keyof typeof speciesPatterns];
        let seasonalMultiplier = 1.0;

        if (pattern) {
          // Calculate seasonal effect using sine wave
          const seasonDiff = Math.abs(season - pattern.peakSeason);
          const seasonEffect = Math.cos((seasonDiff / 4) * Math.PI);
          seasonalMultiplier = 1 + (pattern.peakMultiplier - 1) * (seasonEffect + 1) / 2;
        }

        const baseCPUE = pattern?.baseCPUE || 10;
        const effort = 8 + Math.random() * 12; // 8-20 hours
        const cpue = Math.max(0.1, baseCPUE * seasonalMultiplier * (0.6 + Math.random() * 0.8));

        data.push({
          date: date.toISOString().split('T')[0],
          month: monthStr,
          fishingArea: area,
          species: speciesName,
          cpue: Math.round(cpue * 10) / 10,
          effort: Math.round(effort * 10) / 10,
          catch: Math.round(cpue * effort * 10) / 10
        });
      });
    });
  }

  return data;
};

// Enhanced Length Data with Better Biological Realism
export const generateEnhancedLengthData = (): LengthData[] => {
  const data: LengthData[] = [];
  const speciesKeys = Object.keys(SPECIES_INFO);
  const areas = Object.keys(FISHING_AREAS).slice(0, 6);
  const seasons = ['Q1', 'Q2', 'Q3', 'Q4'];

  speciesKeys.forEach(speciesName => {
    const speciesInfo = SPECIES_INFO[speciesName];
    if (!speciesInfo) return;

    const lm50 = speciesInfo.lm50;
    const maxLength = speciesInfo.maxLength;

    // More realistic length distribution parameters
    const minLength = Math.max(2, lm50 * 0.2);
    const lengthRange = maxLength - minLength;
    const binSize = Math.max(1, Math.round(lengthRange / 20));

    areas.forEach(area => {
      seasons.forEach(season => {
        // Seasonal effects on size distribution
        const seasonMultiplier = season === 'Q2' ? 1.2 : season === 'Q3' ? 1.1 : 0.9;

        for (let binStart = minLength; binStart < maxLength; binStart += binSize) {
          const binEnd = Math.min(binStart + binSize, maxLength);
          const binMid = (binStart + binEnd) / 2;

          // Use log-normal distribution for more realistic size distributions
          const meanLength = lm50 * 0.85 * seasonMultiplier; // Slightly below maturity
          const sigma = 0.4; // Standard deviation parameter

          // Log-normal PDF approximation
          const logLength = Math.log(binMid);
          const logMean = Math.log(meanLength);
          const exponent = -Math.pow(logLength - logMean, 2) / (2 * sigma * sigma);
          const freq = Math.exp(exponent) / (binMid * sigma * Math.sqrt(2 * Math.PI));

          const totalSamples = 80 + Math.random() * 150;

          // Sex ratio varies by species
          const sexRatio = speciesName.includes('กุ้ง') ? 0.55 : 0.48; // Shrimp species have more females

          const male = Math.round(totalSamples * freq * sexRatio * (0.8 + Math.random() * 0.4));
          const female = Math.round(totalSamples * freq * (1 - sexRatio) * (0.8 + Math.random() * 0.4));
          const unsexed = Math.round(totalSamples * freq * 0.15 * Math.random());

          if (male + female + unsexed > 2) { // Minimum threshold
            data.push({
              species: speciesName,
              lengthBin: `${Math.round(binStart)}-${Math.round(binEnd)}cm`,
              male,
              female,
              unsexed,
              area: area.split(' ')[0],
              season
            });
          }
        }
      });
    });
  });

  return data;
};

// Generate Environmental Factors Data
export const generateEnvironmentalData = () => {
  const data = [];
  const areas = Object.keys(FISHING_AREAS);

  for (let month = 0; month < 24; month++) {
    const date = new Date(2023, month % 12, 15);

    areas.forEach(area => {
      // Seasonal environmental patterns
      const season = Math.floor((month % 12) / 3);
      const tempBase = 25 + 5 * Math.sin((month / 12) * 2 * Math.PI);
      const salinityBase = 32 + 3 * Math.sin((month / 12) * 2 * Math.PI + Math.PI / 4);

      data.push({
        date: date.toISOString().split('T')[0],
        area,
        temperature: Math.round((tempBase + (Math.random() - 0.5) * 4) * 10) / 10,
        salinity: Math.round((salinityBase + (Math.random() - 0.5) * 2) * 10) / 10,
        chlorophyll: Math.round((5 + Math.random() * 15) * 10) / 10,
        turbidity: Math.round((10 + Math.random() * 20) * 10) / 10,
        dissolvedOxygen: Math.round((6 + Math.random() * 3) * 10) / 10
      });
    });
  }

  return data;
};

// Enhanced Alert Generation
export const generateEnhancedAlerts = () => {
  const alertTypes = [
    { type: 'อัตราส่วนปลาเด็กเกินขีดจำกัด', severity: 'สูง', area: 'อ่าวไทยตอนบน' },
    { type: 'CPUE ลดลงอย่างกะทันหัน', severity: 'ปานกลาง', area: 'อันดามันเหนือ' },
    { type: 'แรงกดดันการประมงสูง', severity: 'สูง', area: 'อ่าวไทยตอนล่าง' },
    { type: 'พื้นที่ห้ามประมง', severity: 'วิกฤต', area: 'น่านน้ำลึกอ่าวไทย' },
    { type: 'คุณภาพน้ำเสื่อมโทรม', severity: 'ปานกลาง', area: 'ปากแม่น้ำเจ้าพระยา' },
    { type: 'สาหร่ายบลูม', severity: 'สูง', area: 'อันดามันใต้' },
    { type: 'ออกซิเจนในน้ำต่ำ', severity: 'วิกฤต', area: 'อ่าวไทยตอนล่าง' }
  ];

  const levels = ['ต่ำ', 'ปานกลาง', 'สูง', 'วิกฤต'];
  const areas = Object.keys(FISHING_AREAS);

  return Array.from({ length: 15 }, (_, i) => ({
    id: i + 1,
    type: alertTypes[i % alertTypes.length].type,
    level: levels[Math.floor(Math.random() * levels.length)],
    area: areas[i % areas.length],
    message: `${alertTypes[i % alertTypes.length].type} ในพื้นที่ ${areas[i % areas.length]}`,
    timestamp: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
    status: Math.random() > 0.4 ? 'active' : 'resolved',
    recommendedAction: generateRecommendedAction(alertTypes[i % alertTypes.length].type)
  }));
};

const generateRecommendedAction = (alertType: string): string => {
  const actions = {
    'อัตราส่วนปลาเด็กเกินขีดจำกัด': 'ปรับขนาดตาข่ายอวนให้ใหญ่ขึ้น ปิดพื้นที่บางส่วนชั่วคราว',
    'CPUE ลดลงอย่างกะทันหัน': 'สำรวจทรัพยากรเพิ่มเติม ตรวจสอบแรงกดดันการประมง',
    'แรงกดดันการประมงสูง': 'กำหนดโควต้าปล่อยจำหน่าย เปิด-ปิดพื้นที่ประมงตามฤดูกาล',
    'พื้นที่ห้ามประมง': 'บังคับใช้กฎหมายอย่างเคร่งครัด ติดตามการลักลอบ',
    'คุณภาพน้ำเสื่อมโทรม': 'ติดตามคุณภาพน้ำอย่างใกล้ชิด ควบคุมมลพิษจากแหล่งกำเนิด',
    'สาหร่ายบลูม': 'เฝ้าระวังการขยายตัวของสาหร่าย ตรวจสอบออกซิเจนในน้ำ',
    'ออกซิเจนในน้ำต่ำ': 'ระงับการประมงชั่วคราว จนกว่าคุณภาพน้ำจะดีขึ้น'
  };
  return actions[alertType as keyof typeof actions] || 'ติดตามและประเมินสถานการณ์';
};

// Export Enhanced Mock Data
export const enhancedTrips = [...realTrips, ...generateEnhancedTrips(45)]; // 22 real + 45 enhanced = 67 total
export const enhancedCPUEData = [...realCPUEData, ...generateEnhancedCPUEData()];
export const enhancedLengthData = [...realLengthData, ...generateEnhancedLengthData()];
export const enhancedEnvironmentalData = generateEnvironmentalData();
export const enhancedAlerts = generateEnhancedAlerts();

// Validation Functions
export const validateMockDataConsistency = () => {
  const issues = [];

  // Check trip data consistency
  enhancedTrips.forEach(trip => {
    if (trip.totalCatch < 0) issues.push(`Trip ${trip.tripId}: Invalid catch weight`);
    if (trip.duration <= 0) issues.push(`Trip ${trip.tripId}: Invalid duration`);
    if (trip.dqScore < 0 || trip.dqScore > 100) issues.push(`Trip ${trip.tripId}: Invalid data quality score`);
  });

  // Check CPUE data consistency
  enhancedCPUEData.forEach(cpue => {
    if (cpue.cpue < 0) issues.push(`CPUE data: Negative CPUE value`);
    if (cpue.effort <= 0) issues.push(`CPUE data: Invalid effort`);
    if (Math.abs(cpue.catch - cpue.cpue * cpue.effort) > 0.1) issues.push(`CPUE data: Catch calculation mismatch`);
  });

  return issues;
};

console.log('Enhanced mock data generated successfully!');
console.log(`Total trips: ${enhancedTrips.length}`);
console.log(`Total CPUE records: ${enhancedCPUEData.length}`);
console.log(`Total length records: ${enhancedLengthData.length}`);
console.log(`Environmental records: ${enhancedEnvironmentalData.length}`);
console.log(`Active alerts: ${enhancedAlerts.filter(a => a.status === 'active').length}`);
