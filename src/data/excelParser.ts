// Parser để chuyển đổi dữ liệu Excel thành mock data tiếng Thái
// ไฟล์นี้ใช้สำหรับแปลงข้อมูลจากไฟล์ Excel เป็นข้อมูลจำลองภาษาไทย

export interface ExcelHeaderData {
  Link: string;
  Zone: string;
  Office: string;
  Cruise: string;
  Haulno: number;
  Area: number;
  Station: number;
  Depth: number;
  Date: string;
  Time: string;
  Tow: number;
  Course: number;
  LatStart: number;
  LongStart: number;
  LatEnd: number;
  LongEnd: number;
  VesselName: string;
  Remark?: string;
}

export interface ExcelCatchData {
  Link: string;
  order?: string;
  btscodename: string;
  name: string;
  size: 'S' | 'L' | 'C';
  sex?: string;
  stage?: string;
  sam_weight?: number;
  total_weight: number;
  cal_weight?: number;
  number?: number;
  freqtext?: string;
}

export interface ExcelSpeciesData {
  IDspp: number;
  SppSciName: string;
  CommonName: string;
  ThaiName: string;
  IDgroup: number;
  IDgroupName: string;
  IdgrCluster: number;
  grClusterName: string;
  IDFamily: number;
  FamilyName: string;
}

export interface ExcelWaterQualityData {
  link: string;
  year?: number;
  month?: number;
  station?: string;
  Salinity_surface?: number;
  Temp_surface?: number;
  pH_surface?: number;
  DO_surface?: number;
  Salinity_middle?: number;
  Temp_middle?: number;
  pH_middle?: number;
  DO_middle?: number;
  Salinity_bottom?: number;
  Temp_bottom?: number;
  pH_bottom?: number;
  DO_bottom?: number;
  Transparency?: number;
  Remark?: string;
}

// พจนานุกรมแปลภาษา - Translation Dictionary
export const TRANSLATION_DICT: { [key: string]: string } = {
  // ชื่อสามัญของสัตว์น้ำ
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
  'Mitre squid': 'หมึกมิเตอร์',
  
  // ค่าทางเศรษฐกิจ
  'Very High': 'สูงมาก',
  'High': 'สูง',
  'Medium': 'ปานกลาง',
  'Low': 'ต่ำ',
  
  // ที่อยู่อาศัย
  'Coral reef': 'แนวปะการัง',
  'Mangrove': 'ป่าชายเลน',
  'Deep water': 'น่านน้ำลึก',
  'Coastal': 'ชายฝั่ง',
  'Estuarine': 'ปากแม่น้ำ',
  'Schooling': 'ฝูงปลา',
  'Coastal, schooling': 'ชายฝั่ง, ฝูงปลา',
  'Rocky reef': 'แนวปะการังหิน',
  'Sandy bottom': 'พื้นทราย',
  'Muddy bottom': 'พื้นโคลน',
  
  // ประเภทเรือ
  'Research vessel': 'เรือวิจัย',
  'Commercial trawler': 'เรือประมงเชิงพาณิชย์',
  'Artisanal boat': 'เรือประมงพื้นบ้าน',
  'Bottom trawl': 'อวนลากก้น',
  'Purse seine': 'อวนล้อม',
  'Long line': 'เบ็ดราว',
  'Gill net': 'อวนชั้น',
  
  // ขนาด
  'Small': 'เล็ก',
  'Large': 'ใหญ่',
  'Commercial size': 'ขนาดเชิงพาณิชย์',
  
  // สถานะและข้อความ
  'Active': 'ใช้งาน',
  'Inactive': 'ไม่ใช้งาน',
  'Good': 'ดี',
  'Fair': 'พอใช้',
  'Poor': 'แย่',
  'Excellent': 'ยอดเยี่ยม',
  
  // ข้อความแจ้งเตือน
  'Juvenile ratio exceeded': 'อัตราส่วนปลาเด็กเกินขีดจำกัด',
  'CPUE sudden drop': 'CPUE ลดลงอย่างกะทันหัน',
  'High fishing pressure': 'แรงกดดันการประมงสูง',
  'Fishing area closed': 'พื้นที่ห้ามประมง',
  'Data quality low': 'คุณภาพข้อมูลต่ำ',
  
  // เดือน
  'January': 'มกราคม',
  'February': 'กุมภาพันธ์',
  'March': 'มีนาคม',
  'April': 'เมษายน',
  'May': 'พฤษภาคม',
  'June': 'มิถุนายน',
  'July': 'กรกฎาคม',
  'August': 'สิงหาคม',
  'September': 'กันยายน',
  'October': 'ตุลาคม',
  'November': 'พฤศจิกายน',
  'December': 'ธันวาคม'
};

// ฟังก์ชันแปลข้อความเป็นภาษาไทย
export const translateToThai = (text: string): string => {
  if (!text) return text;
  return TRANSLATION_DICT[text] || text;
};

// ฟังก์ชันแปลงพิกัดเป็นชื่อพื้นที่ประมงภาษาไทย
export const coordinatesToFishingArea = (lat: number, lon: number): string => {
  // อิงจากพิกัดในข้อมูล Excel เพื่อกำหนดพื้นที่ประมง
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

// ฟังก์ชันสร้างชื่อกัปตันภาษาไทย
export const generateThaiCaptainName = (index: number): string => {
  const thaiNames = [
    'นายสมชาย จันทร์เพ็ญ',
    'นายวิชัย ทองคำ', 
    'นายประยุทธ์ ใสใจ',
    'นายสุทิน แสงทอง',
    'นายจำรัส มณีแก้ว',
    'นายธีรพงษ์ สุขสม',
    'นายชาติชาย ปลิงใส',
    'นายกิตติศักดิ์ นามแพง',
    'นายบุญชู เรืองยศ',
    'นายอนันต์ จับปลา',
    'นายสมบัติ ทะเลสาคร',
    'นายมานะ จับปลา',
    'นายสุชาติ ประมงใจ',
    'นายวิรัตน์ ชายทะเล',
    'นายสนิท กุ้งใหญ่',
    'นายพิเชษฐ์ หอยแมลงภู่',
    'นายรุ่งโรจน์ ประมงดี',
    'นายสมพร เรือดี',
    'นายอุดม ประมงเจริญ',
    'นายศิลป์ชัย ทะเลงาม'
  ];
  return thaiNames[index % thaiNames.length];
};

// ฟังก์ชันแปลง size code เป็นข้อความไทย
export const sizeCodeToThai = (sizeCode: string): string => {
  switch (sizeCode) {
    case 'S': return 'เล็ก';
    case 'L': return 'ใหญ่';
    case 'C': return 'เชิงพาณิชย์';
    default: return 'ไม่ระบุ';
  }
};

// ฟังก์ชันแปลงเพศเป็นภาษาไทย
export const sexToThai = (sex?: string): string => {
  if (!sex) return 'ไม่ระบุเพศ';
  if (sex.includes('ผู้') || sex.includes('Male')) return 'เพศผู้';
  if (sex.includes('เมีย') || sex.includes('Female')) return 'เพศเมีย';
  return 'ไม่ระบุเพศ';
};

// ฟังก์ชันสร้างชื่อเรือภาษาไทย
export const generateThaiVesselName = (_vesselCode: string, index: number): string => {
  const prefixes = ['กท', 'ระย', 'ภก', 'ตรง', 'สข', 'สร', 'ปท', 'อุบ', 'นค', 'ขก'];
  const numbers = [80000, 80001, 80002, 80003, 80004, 80005, 80006, 80007, 80008, 80009];
  
  return `${prefixes[index % prefixes.length]}-${numbers[index % numbers.length]}`;
};

// ฟังก์ชันกำหนดประเภทเรือจาก Link
export const getLinkToVesselType = (link: string): string => {
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

// ฟังก์ชันแยกข้อมูล freqtext เป็น length distribution
export const parseFreqText = (freqtext?: string): {
  factor: number;
  meanLength: number;
  distribution: number[];
} | null => {
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

// ฟังก์ชันคำนวณ CPUE (Catch Per Unit Effort)
export const calculateCPUE = (totalWeight: number, effortHours: number): number => {
  if (effortHours === 0) return 0;
  return Math.round((totalWeight / effortHours) * 10) / 10; // kg/hour
};

// ฟังก์ชันสร้างรหัสข้อมูลคุณภาพ
export const generateDataQualityScore = (
  hasCoordinates: boolean,
  hasWeight: boolean,
  hasSpeciesInfo: boolean,
  hasWaterQuality: boolean
): number => {
  let score = 50; // คะแนนพื้นฐาน
  
  if (hasCoordinates) score += 20;
  if (hasWeight) score += 15;
  if (hasSpeciesInfo) score += 10;
  if (hasWaterQuality) score += 5;
  
  return Math.min(100, score);
};

// ฟังก์ชันคำนวณการบริโภคน้ำมัน (ประมาณการ)
export const estimateFuelConsumption = (durationHours: number, vesselType: string): number => {
  let baseConsumption = 15; // ลิตรต่อชั่วโมง
  
  if (vesselType.includes('วิจัย')) {
    baseConsumption = 12; // เรือวิจัยประหยัดน้ำมันกว่า
  } else if (vesselType.includes('เชิงพาณิชย์')) {
    baseConsumption = 20; // เรือเชิงพาณิชย์ใช้น้ำมันมาก
  }
  
  return Math.round(durationHours * baseConsumption);
};
