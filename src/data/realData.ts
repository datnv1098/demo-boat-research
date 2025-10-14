// ข้อมูลจริงจากไฟล์ Excel ที่แปลงเป็นภาषาไทยแล้ว
// Real data from Excel file converted to Thai language

import { 
  coordinatesToFishingArea, 
  generateThaiCaptainName, 
  generateThaiVesselName, 
  getLinkToVesselType,
  calculateCPUE,
  generateDataQualityScore,
  estimateFuelConsumption,
  parseFreqText,
  sizeCodeToThai,
  translateToThai
} from './excelParser';
import type { Trip, CPUEData, LengthData, SpeciesInfo } from './mockData';

// ข้อมูล header จาก Excel (22 รายการ)
const EXCEL_HEADER_DATA = [
  { Link: 'TSCM202501087', Zone: 'GOT', Office: 'CMD', Cruise: '2501', Haulno: 1, Area: 5, Station: 87, Depth: 45, Date: '2025-01-31', Time: '1899-12-30', Tow: 60, Course: 174, LatStart: 10.8767471, LongStart: 99.6623755, LatEnd: 10.8247851, LongEnd: 99.6660672, VesselName: 'P01' },
  { Link: 'TSCM202501103', Zone: 'GOT', Office: 'CMD', Cruise: '2501', Haulno: 2, Area: 5, Station: 103, Depth: 50, Date: '2025-01-31', Time: '1899-12-30', Tow: 60, Course: 181, LatStart: 10.7289559, LongStart: 99.7642226, LatEnd: 10.6784779, LongEnd: 99.761108, VesselName: 'P01' },
  { Link: 'TSCM202501089', Zone: 'GOT', Office: 'CMD', Cruise: '2501', Haulno: 3, Area: 5, Station: 89, Depth: 53, Date: '2025-01-31', Time: '1899-12-30', Tow: 60, Course: 1, LatStart: 10.8215094, LongStart: 100.0112473, LatEnd: 10.8689468, LongEnd: 100.0125981, VesselName: 'P01' },
  { Link: 'TSCM202502075', Zone: 'GOT', Office: 'CMD', Cruise: '2501', Haulno: 4, Area: 5, Station: 75, Depth: 49, Date: '2025-02-01', Time: '1899-12-30', Tow: 60, Course: 357, LatStart: 11.348125, LongStart: 100.3308506, LatEnd: 11.3954073, LongEnd: 100.3454795, VesselName: 'P01' },
  { Link: 'TSCM202502062', Zone: 'GOT', Office: 'CMD', Cruise: '2501', Haulno: 5, Area: 5, Station: 62, Depth: 48, Date: '2025-02-01', Time: '1899-12-30', Tow: 60, Course: 355, LatStart: 11.4117359, LongStart: 100.3443619, LatEnd: 11.4629432, LongEnd: 100.3415338, VesselName: 'P01' },
  { Link: 'TSCM202502060', Zone: 'GOT', Office: 'CMD', Cruise: '2501', Haulno: 6, Area: 5, Station: 60, Depth: 48, Date: '2025-02-01', Time: '1899-12-30', Tow: 60, Course: 356, LatStart: 11.481851, LongStart: 100.3401784, LatEnd: 11.5335162, LongEnd: 100.3403733, VesselName: 'P01' },
  { Link: 'TSCM202502049', Zone: 'GOT', Office: 'CMD', Cruise: '2501', Haulno: 7, Area: 4, Station: 49, Depth: 48, Date: '2025-02-01', Time: '1899-12-30', Tow: 60, Course: 358, LatStart: 11.5578011, LongStart: 100.3405154, LatEnd: 11.6082224, LongEnd: 100.340189, VesselName: 'P01' },
  { Link: 'TSCM202502047', Zone: 'GOT', Office: 'CMD', Cruise: '2501', Haulno: 8, Area: 4, Station: 47, Depth: 32, Date: '2025-02-02', Time: '1899-12-30', Tow: 60, Course: 214, LatStart: 11.5979645, LongStart: 99.9046688, LatEnd: 11.5511871, LongEnd: 99.8834619, VesselName: 'P01' },
  { Link: 'TSCM202502058', Zone: 'GOT', Office: 'CMD', Cruise: '2501', Haulno: 9, Area: 5, Station: 58, Depth: 38, Date: '2025-02-02', Time: '1899-12-30', Tow: 60, Course: 217, LatStart: 11.3306677, LongStart: 99.7607348, LatEnd: 11.2824983, LongEnd: 99.7396022, VesselName: 'P01' },
  { Link: 'TSCM202502073', Zone: 'GOT', Office: 'CMD', Cruise: '2501', Haulno: 10, Area: 5, Station: 73, Depth: 42, Date: '2025-02-02', Time: '1899-12-30', Tow: 60, Course: 184, LatStart: 11.2216353, LongStart: 99.7688097, LatEnd: 11.1731764, LongEnd: 99.7657611, VesselName: 'P01' },
  { Link: 'TSCM202502101', Zone: 'GOT', Office: 'CMD', Cruise: '2501', Haulno: 11, Area: 5, Station: 101, Depth: 36, Date: '2025-02-03', Time: '1899-12-30', Tow: 60, Course: 178, LatStart: 10.5862445, LongStart: 99.4878997, LatEnd: 10.5349257, LongEnd: 99.488959, VesselName: 'P01' },
  { Link: 'TSCM202502136', Zone: 'GOT', Office: 'CMD', Cruise: '2501', Haulno: 12, Area: 6, Station: 136, Depth: 16, Date: '2025-02-04', Time: '1899-12-30', Tow: 60, Course: 168, LatStart: 10.2481994, LongStart: 99.3112969, LatEnd: 10.1999323, LongEnd: 99.3163944, VesselName: 'P01' },
  { Link: 'TSCM202502156', Zone: 'GOT', Office: 'CMD', Cruise: '2501', Haulno: 13, Area: 6, Station: 156, Depth: 24, Date: '2025-02-05', Time: '1899-12-30', Tow: 60, Course: 271, LatStart: 9.810389, LongStart: 99.5653817, LatEnd: 9.8130206, LongEnd: 99.5124473, VesselName: 'P01' },
  { Link: 'TSCM202502177', Zone: 'GOT', Office: 'CMD', Cruise: '2501', Haulno: 14, Area: 6, Station: 177, Depth: 22, Date: '2025-02-05', Time: '1899-12-30', Tow: 60, Course: 270, LatStart: 9.8081454, LongStart: 99.4649345, LatEnd: 9.8084261, LongEnd: 99.4158156, VesselName: 'P01' },
  { Link: 'TSCM202502199', Zone: 'GOT', Office: 'CMD', Cruise: '2501', Haulno: 15, Area: 6, Station: 199, Depth: 7, Date: '2025-02-06', Time: '1899-12-30', Tow: 60, Course: 356, LatStart: 9.4355392, LongStart: 99.7377685, LatEnd: 9.4874393, LongEnd: 99.7355091, VesselName: 'P01' },
  { Link: 'TSCM202502179', Zone: 'GOT', Office: 'CMD', Cruise: '2501', Haulno: 16, Area: 6, Station: 179, Depth: 8, Date: '2025-02-06', Time: '1899-12-30', Tow: 60, Course: 164, LatStart: 9.5247305, LongStart: 99.7632011, LatEnd: 9.5399219, LongEnd: 99.8087551, VesselName: 'P01' },
  { Link: 'TSCM202502158', Zone: 'GOT', Office: 'CMD', Cruise: '2501', Haulno: 17, Area: 6, Station: 158, Depth: 24, Date: '2025-02-06', Time: '1899-12-30', Tow: 60, Course: 264, LatStart: 9.8352092, LongStart: 100.050731, LatEnd: 9.8370717, LongEnd: 100.0032265, VesselName: 'P01' },
  { Link: 'TSCM202502181', Zone: 'GOT', Office: 'CMD', Cruise: '2501', Haulno: 18, Area: 6, Station: 181, Depth: 23, Date: '2025-02-07', Time: '1899-12-30', Tow: 60, Course: 348, LatStart: 9.7276985, LongStart: 100.2514809, LatEnd: 9.7784575, LongEnd: 100.2468313, VesselName: 'P01' },
  { Link: 'TSCM202502140', Zone: 'GOT', Office: 'CMD', Cruise: '2501', Haulno: 19, Area: 6, Station: 140, Depth: 51, Date: '2025-02-07', Time: '1899-12-30', Tow: 60, Course: 351, LatStart: 10.027829, LongStart: 100.2549047, LatEnd: 10.0791753, LongEnd: 100.2467187, VesselName: 'P01' },
  { Link: 'TSCM202502119', Zone: 'GOT', Office: 'CMD', Cruise: '2501', Haulno: 20, Area: 6, Station: 119, Depth: 51, Date: '2025-02-07', Time: '1899-12-30', Tow: 60, Course: 347, LatStart: 10.2633245, LongStart: 100.0304411, LatEnd: 10.3087622, LongEnd: 100.0190462, VesselName: 'P01' },
  { Link: 'TSCM202502138', Zone: 'GOT', Office: 'CMD', Cruise: '2501', Haulno: 21, Area: 6, Station: 138, Depth: 49, Date: '2025-02-07', Time: '1899-12-30', Tow: 60, Course: 223, LatStart: 10.2435791, LongStart: 99.9686502, LatEnd: 10.2164569, LongEnd: 99.9267667, VesselName: 'P01' },
  { Link: 'TSCM202502117', Zone: 'GOT', Office: 'CMD', Cruise: '2501', Haulno: 22, Area: 6, Station: 117, Depth: 43, Date: '2025-02-08', Time: '1899-12-30', Tow: 60, Course: 343, LatStart: 10.3215824, LongStart: 99.6138993, LatEnd: 10.3677176, LongEnd: 99.5936088, VesselName: 'P01' }
];

// ข้อมูล catch สำคัญจาก Excel (ตัวอย่างบางส่วน)
const EXCEL_CATCH_DATA = [
  { Link: 'TSCM202501087', btscodename: '247', name: 'Pentaprion longimanus', size: 'S', total_weight: 1, freqtext: '0.5,24,1,1,,,,,,,,,,,,,,,,,1,,,,1,,,1,' },
  { Link: 'TSCM202501087', btscodename: '259', name: 'Leiognathidae', size: 'C', total_weight: 0.9, freqtext: '0.5,20,1,,,,1,,1,1,,,1,' },
  { Link: 'TSCM202501087', btscodename: '102', name: 'Lutjanidae', size: 'L', total_weight: 2.3, freqtext: '0.5,20,1,,1,' },
  { Link: 'TSCM202501087', btscodename: '166', name: 'Photololigo chinensis', size: 'L', total_weight: 2.6, freqtext: '0.5,16.5,1,,,1,,,,1,1,,,1,1,1,,1,1,,1,,,,,,,1,' },
  { Link: 'TSCM202501089', btscodename: '87', name: 'Saurida elongata', size: 'L', total_weight: 1, freqtext: '0.5,24,1,,,,1,,1,1,,,,1,,,,,,,,,,,,,,1,' },
  { Link: 'TSCM202501103', btscodename: '76', name: 'Nemipterus nematophorus', size: 'L', total_weight: 0.6, freqtext: '0.5,11.5,3,3,3,2,1,,,1,1,1,1,1,,1,,,,,1,' },
  { Link: 'TSCM202502047', btscodename: '225', name: 'Amusium pleuronectes', size: 'S', total_weight: 0.17, freqtext: '0.5,7.5,1,2,1,' },
  { Link: 'TSCM202502058', btscodename: '88', name: 'Saurida undosquamis', size: 'L', total_weight: 0.7, freqtext: '0.5,17.5,1,2,1,1,1,,1,,,,,1,,1,1,' },
  { Link: 'TSCM202502075', btscodename: '2', name: 'Rastrelliger kanagurta', size: 'L', total_weight: 0.14, freqtext: '0.5,22,1,' },
  { Link: 'TSCM202502101', btscodename: '95', name: 'Lutjanus lutjanus', size: 'L', total_weight: 0.39, freqtext: '0.5,15.5,2,1,1,2,' }
];

// ข้อมูลสายพันธุ์จาก Excel (279 ชนิด - แสดงตัวอย่าง)
const EXCEL_SPECIES_DATA = [
  { IDspp: 1, SppSciName: 'Rastrelliger brachysoma', CommonName: 'Short mackerel', ThaiName: 'ปลาทู', IDgroup: 1, IDgroupName: 'Pelagic fishes', FamilyName: 'Scombridae' },
  { IDspp: 2, SppSciName: 'Rastrelliger kanagurta', CommonName: 'Indian mackerel', ThaiName: 'ปลาลัง, ทูโม่ง, โม่ง, โม่งลัง', IDgroup: 1, IDgroupName: 'Pelagic fishes', FamilyName: 'Scombridae' },
  { IDspp: 76, SppSciName: 'Nemipterus nematophorus', CommonName: 'Doublewhip threadfin bream', ThaiName: 'ปลาทรายแดงแซ่', IDgroup: 2, IDgroupName: 'Demersal fishes', FamilyName: 'Nemipteridae' },
  { IDspp: 87, SppSciName: 'Saurida elongata', CommonName: 'Slender lizardfish', ThaiName: 'ปลาปากคม', IDgroup: 2, IDgroupName: 'Demersal fishes', FamilyName: 'Synodontidae' },
  { IDspp: 88, SppSciName: 'Saurida undosquamis', CommonName: 'Brushtooth lizardfish', ThaiName: 'ปลาปากคมจุด', IDgroup: 2, IDgroupName: 'Demersal fishes', FamilyName: 'Synodontidae' },
  { IDspp: 95, SppSciName: 'Lutjanus lutjanus', CommonName: 'Bigeye snapper', ThaiName: 'ปลากะเหลืองข้างเหลือง, นกขมิ้น', IDgroup: 2, IDgroupName: 'Demersal fishes', FamilyName: 'Lutjanidae' },
  { IDspp: 102, SppSciName: 'Lutjanidae', CommonName: '', ThaiName: 'ปลากะพง', IDgroup: 2, IDgroupName: 'Demersal fishes', FamilyName: 'Lutjanidae' },
  { IDspp: 165, SppSciName: 'Photololigo duvaucelii', CommonName: 'Indian squid, Splendid squid', ThaiName: 'หมึกกล้วย', IDgroup: 3, IDgroupName: 'Cephalopods', FamilyName: '' },
  { IDspp: 166, SppSciName: 'Photololigo chinensis', CommonName: 'Mitre squid', ThaiName: 'หมึกกล้วย, หมึกศอก, หมึกโก๋เนื้อหนา', IDgroup: 3, IDgroupName: 'Cephalopods', FamilyName: '' },
  { IDspp: 225, SppSciName: 'Amusium pleuronectes', CommonName: 'Radiated Scallop', ThaiName: 'หอยเชลล์, หอยพัด', IDgroup: 6, IDgroupName: 'Shells', FamilyName: '' },
  { IDspp: 247, SppSciName: 'Pentaprion longimanus', CommonName: 'Longfin Mojarra', ThaiName: 'ปลาแป้นแก้ว, ดอกหมากครีบยาว', IDgroup: 8, IDgroupName: 'Trash groups', FamilyName: '' },
  { IDspp: 259, SppSciName: 'Leiognathidae', CommonName: 'Ponyfish', ThaiName: 'ปลาแป้น', IDgroup: 8, IDgroupName: 'Trash groups', FamilyName: 'Leiognathidae' }
];

// ข้อมูลคุณภาพน้ำจาก Excel
const EXCEL_WATER_QUALITY_DATA = [
  { link: 'TSCM202501087', Salinity_surface: 30.91, Temp_surface: 28.277, pH_surface: 8.421, DO_surface: 3.343, Salinity_middle: 31.146, Temp_middle: 28.293, pH_middle: 8.493, DO_middle: 4.461, Salinity_bottom: 31.576, Temp_bottom: 28.334, pH_bottom: 8.477, DO_bottom: 4.061, Transparency: 5.5 }
];

// Interface สำหรับข้อมูลคุณภาพน้ำ
export interface WaterQuality {
  tripId: string;
  station?: string;
  salinity: {
    surface: number;
    middle: number;
    bottom: number;
  };
  temperature: {
    surface: number;
    middle: number;
    bottom: number;
  };
  pH: {
    surface: number;
    middle: number;
    bottom: number;
  };
  dissolvedOxygen: {
    surface: number;
    middle: number;
    bottom: number;
  };
  transparency: number;
  remark?: string;
}

// สร้างข้อมูล Trip จากข้อมูล Excel
export const generateRealTrips = (): Trip[] => {
  return EXCEL_HEADER_DATA.map((header, index) => {
    const startDate = new Date(header.Date);
    const durationHours = header.Tow / 60; // แปลงจากนาทีเป็นชั่วโมง
    const endDate = new Date(startDate.getTime() + header.Tow * 60 * 1000);
    
    const fishingArea = coordinatesToFishingArea(header.LatStart, header.LongStart);
    const vesselType = getLinkToVesselType(header.Link);
    const captain = generateThaiCaptainName(index);
    const vesselName = generateThaiVesselName(header.VesselName, index);
    
    // คำนวณ total catch จากข้อมูล catch
    const tripCatchData = EXCEL_CATCH_DATA.filter(catchRecord => catchRecord.Link === header.Link);
    const totalCatch = tripCatchData.reduce((sum, catchRecord) => sum + catchRecord.total_weight, 0);
    
    const dqScore = generateDataQualityScore(
      true, // มีพิกัด
      totalCatch > 0, // มีข้อมูลน้ำหนัก
      tripCatchData.length > 0, // มีข้อมูลสายพันธุ์
      EXCEL_WATER_QUALITY_DATA.some(wq => wq.link === header.Link) // มีข้อมูลคุณภาพน้ำ
    );
    
    const fuelConsumption = estimateFuelConsumption(durationHours, vesselType);
    
    // สร้าง issues ตามคุณภาพข้อมูล
    const issues: string[] = [];
    if (totalCatch === 0) issues.push('ไม่มีข้อมูลการจับ');
    if (header.Depth < 10) issues.push('ความลึกน้อยกว่า 10 เมตร');
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
        lat: Math.round((header.LatStart + header.LatEnd) / 2 * 1000000) / 1000000,
        lon: Math.round((header.LongStart + header.LongEnd) / 2 * 1000000) / 1000000
      },
      duration: Math.round(durationHours * 10) / 10,
      dqScore: dqScore,
      issues: issues,
      totalCatch: Math.round(totalCatch * 10) / 10,
      fuelConsumption: fuelConsumption
    };
  });
};

// สร้างข้อมูล CPUE จากข้อมูล Excel
export const generateRealCPUEData = (): CPUEData[] => {
  const cpueData: CPUEData[] = [];
  
  EXCEL_CATCH_DATA.forEach(catchRecord => {
    const headerData = EXCEL_HEADER_DATA.find(h => h.Link === catchRecord.Link);
    if (!headerData) return;
    
    const effortHours = headerData.Tow / 60; // แปลงจากนาทีเป็นชั่วโมง
    const cpue = calculateCPUE(catchRecord.total_weight, effortHours);
    const fishingArea = coordinatesToFishingArea(headerData.LatStart, headerData.LongStart);
    
    // หาข้อมูลสายพันธุ์
    const speciesData = EXCEL_SPECIES_DATA.find(s => s.IDspp.toString() === catchRecord.btscodename);
    const speciesName = speciesData ? speciesData.ThaiName : catchRecord.name;
    
    cpueData.push({
      date: headerData.Date,
      month: headerData.Date.substring(0, 7),
      fishingArea: fishingArea,
      species: speciesName,
      cpue: cpue,
      effort: Math.round(effortHours * 10) / 10,
      catch: catchRecord.total_weight
    });
  });
  
  return cpueData;
};

// สร้างข้อมูล Length จากข้อมูล Excel
export const generateRealLengthData = (): LengthData[] => {
  const lengthData: LengthData[] = [];
  
  EXCEL_CATCH_DATA.forEach(catchRecord => {
    if (!catchRecord.freqtext) return;
    
    const headerData = EXCEL_HEADER_DATA.find(h => h.Link === catchRecord.Link);
    if (!headerData) return;
    
    const freqData = parseFreqText(catchRecord.freqtext);
    if (!freqData) return;
    
    const speciesData = EXCEL_SPECIES_DATA.find(s => s.IDspp.toString() === catchRecord.btscodename);
    const speciesName = speciesData ? speciesData.ThaiName : catchRecord.name;
    
    const fishingArea = coordinatesToFishingArea(headerData.LatStart, headerData.LongStart);
    const season = getSeasonFromDate(headerData.Date);
    
    // สร้าง length bins จาก distribution
    freqData.distribution.forEach((count, index) => {
      if (count > 0) {
        const lengthBin = `${freqData.meanLength + (index - 2) * 2}-${freqData.meanLength + (index - 1) * 2}ซม.`;
        
        lengthData.push({
          species: speciesName,
          lengthBin: lengthBin,
          male: Math.round(count * 0.48), // สมมติสัดส่วนเพศ
          female: Math.round(count * 0.52),
          unsexed: 0,
          area: fishingArea.split(' ')[0], // ย่อชื่อพื้นที่
          season: season
        });
      }
    });
  });
  
  return lengthData;
};

// ฟังก์ชันช่วยเหลือ - แปลงวันที่เป็นฤดูกาล
const getSeasonFromDate = (dateString: string): string => {
  const month = parseInt(dateString.split('-')[1]);
  if (month >= 3 && month <= 5) return 'Q1';
  if (month >= 6 && month <= 8) return 'Q2';
  if (month >= 9 && month <= 11) return 'Q3';
  return 'Q4';
};

// สร้างข้อมูล Species ที่ปรับปรุงแล้ว
export const generateEnhancedSpeciesInfo = (): { [key: string]: SpeciesInfo } => {
  const enhancedSpecies: { [key: string]: SpeciesInfo } = {};
  
  EXCEL_SPECIES_DATA.forEach(species => {
    // ใช้ชื่อไทยเป็น key
    const thaiName = species.ThaiName.split(',')[0].trim(); // ใช้ชื่อแรกถ้ามีหลายชื่อ
    
    enhancedSpecies[thaiName] = {
      scientificName: species.SppSciName,
      commonName: translateToThai(species.CommonName) || species.ThaiName,
      thaiName: species.ThaiName,
      lm50: estimateLm50(species.SppSciName), // ประมาณการจากชื่อวิทยาศาสตร์
      maxLength: estimateMaxLength(species.SppSciName),
      habitat: getHabitatFromGroup(species.IDgroupName),
      economicValue: getEconomicValueFromGroup(species.IDgroupName)
    };
  });
  
  return enhancedSpecies;
};

// สร้างข้อมูลคุณภาพน้ำจากข้อมูล Excel
export const generateRealWaterQualityData = (): WaterQuality[] => {
  return EXCEL_WATER_QUALITY_DATA.map(wq => ({
    tripId: wq.link,
    salinity: {
      surface: wq.Salinity_surface || 0,
      middle: wq.Salinity_middle || 0,
      bottom: wq.Salinity_bottom || 0
    },
    temperature: {
      surface: wq.Temp_surface || 0,
      middle: wq.Temp_middle || 0,
      bottom: wq.Temp_bottom || 0
    },
    pH: {
      surface: wq.pH_surface || 0,
      middle: wq.pH_middle || 0,
      bottom: wq.pH_bottom || 0
    },
    dissolvedOxygen: {
      surface: wq.DO_surface || 0,
      middle: wq.DO_middle || 0,
      bottom: wq.DO_bottom || 0
    },
    transparency: wq.Transparency || 0,
    remark: undefined
  }));
};

// ฟังก์ชันช่วยเหลือ - ประมาณการความยาวเมื่อโตเต็มวัย
const estimateLm50 = (scientificName: string): number => {
  // ประมาณการตามชื่อวิทยาศาสตร์
  if (scientificName.includes('Rastrelliger')) return 22; // ปลาทู
  if (scientificName.includes('Lutjanus')) return 25; // ปลากะพง
  if (scientificName.includes('Nemipterus')) return 18; // ปลาทรายแดง
  if (scientificName.includes('Saurida')) return 20; // ปลาปากคม
  if (scientificName.includes('Photololigo')) return 8; // หมึก
  if (scientificName.includes('Penaeus')) return 12; // กุ้ง
  if (scientificName.includes('Amusium')) return 6; // หอย
  return 15; // ค่าเริ่มต้น
};

// ฟังก์ชันช่วยเหลือ - ประมาณการความยาวสูงสุด
const estimateMaxLength = (scientificName: string): number => {
  // ประมาณการตามชื่อวิทยาศาสตร์
  if (scientificName.includes('Rastrelliger')) return 35; // ปลาทู
  if (scientificName.includes('Lutjanus')) return 60; // ปลากะพง
  if (scientificName.includes('Nemipterus')) return 35; // ปลาทรายแดง
  if (scientificName.includes('Saurida')) return 40; // ปลาปากคม
  if (scientificName.includes('Photololigo')) return 20; // หมึก
  if (scientificName.includes('Penaeus')) return 25; // กุ้ง
  if (scientificName.includes('Amusium')) return 12; // หอย
  return 30; // ค่าเริ่มต้น
};

// ฟังก์ชันช่วยเหลือ - กำหนดที่อยู่อาศัยจากกลุ่ม
const getHabitatFromGroup = (groupName: string): string => {
  if (groupName.includes('Pelagic')) return 'ผิวน้ำ, ฝูงปลา';
  if (groupName.includes('Demersal')) return 'พื้นทะเล';
  if (groupName.includes('Cephalopods')) return 'ใกล้ชายฝั่ง';
  if (groupName.includes('Shells')) return 'พื้นทราย';
  if (groupName.includes('Crabs')) return 'พื้นโคลน';
  if (groupName.includes('Shrimps')) return 'ป่าชายเลน';
  return 'ทั่วไป';
};

// ฟังก์ชันช่วยเหลือ - กำหนดค่าทางเศรษฐกิจจากกลุ่ม
const getEconomicValueFromGroup = (groupName: string): string => {
  if (groupName.includes('Pelagic')) return 'สูง';
  if (groupName.includes('Demersal')) return 'สูงมาก';
  if (groupName.includes('Cephalopods')) return 'สูง';
  if (groupName.includes('Shells')) return 'ปานกลาง';
  if (groupName.includes('Crabs')) return 'สูง';
  if (groupName.includes('Shrimps')) return 'สูงมาก';
  if (groupName.includes('Trash')) return 'ต่ำ';
  return 'ปานกลาง';
};

// ส่งออกข้อมูลที่สร้างจากข้อมูลจริง
export const realTrips = generateRealTrips();
export const realCPUEData = generateRealCPUEData();
export const realLengthData = generateRealLengthData();
export const realSpeciesInfo = generateEnhancedSpeciesInfo();
export const realWaterQualityData = generateRealWaterQualityData();

// ข้อมูลสรุปจากข้อมูลจริง
export const REAL_DATA_SUMMARY = {
  totalTrips: EXCEL_HEADER_DATA.length,
  totalSpecies: EXCEL_SPECIES_DATA.length,
  dataSource: 'TSCM 2025 Survey Data',
  coverage: 'อ่าวไทยตอนบน-ตอนล่าง',
  period: 'มกราคม-กุมภาพันธ์ 2025',
  vesselType: 'เรือสำรวจทรัพยากรประมง',
  methodology: 'Bottom Trawl Survey'
};
