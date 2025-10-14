// ระบบสร้างข้อมูลจำลองคุณภาพน้ำ
// Mock Water Quality Data Generation System

import { 
  SensorReading, 
  WaterMonitoringStation, 
  ProcessedWaterQuality, 
  WaterQualityAlert,
  WATER_QUALITY_STANDARDS,
  WATER_QUALITY_STATUS_THAI 
} from './waterMonitoring';

// ข้อมูลสถานีตรวจวัดคุณภาพน้ำในน่านน้ำไทย
export const MONITORING_STATIONS: WaterMonitoringStation[] = [
  {
    stationId: 'WQ001',
    stationName: 'Gulf of Thailand North Station',
    stationNameThai: 'สถานีตรวจวัดอ่าวไทยตอนบน',
    coordinates: { lat: 12.8, lon: 100.2 },
    depth: 25,
    waterType: 'coastal',
    fishingArea: 'อ่าวไทยตอนบน (ชลบุรี-ประจวบคีรีขันธ์)',
    province: 'ชลบุรี',
    installDate: '2024-01-15',
    sensors: [],
    status: 'active',
    lastUpdate: new Date().toISOString()
  },
  {
    stationId: 'WQ002',
    stationName: 'Gulf of Thailand South Station',
    stationNameThai: 'สถานีตรวจวัดอ่าวไทยตอนล่าง',
    coordinates: { lat: 9.2, lon: 100.8 },
    depth: 18,
    waterType: 'coastal',
    fishingArea: 'อ่าวไทยตอนล่าง (ชุมพร-สงขลา)',
    province: 'สงขลา',
    installDate: '2024-01-20',
    sensors: [],
    status: 'active',
    lastUpdate: new Date().toISOString()
  },
  {
    stationId: 'WQ003',
    stationName: 'Andaman North Station',
    stationNameThai: 'สถานีตรวจวัดอันดามันเหนือ',
    coordinates: { lat: 9.8, lon: 98.3 },
    depth: 35,
    waterType: 'offshore',
    fishingArea: 'ฝั่งอันดามันเหนือ (ระนอง-พังงา)',
    province: 'พังงา',
    installDate: '2024-02-01',
    sensors: [],
    status: 'active',
    lastUpdate: new Date().toISOString()
  },
  {
    stationId: 'WQ004',
    stationName: 'Andaman South Station',
    stationNameThai: 'สถานีตรวจวัดอันดามันใต้',
    coordinates: { lat: 7.5, lon: 98.8 },
    depth: 28,
    waterType: 'coastal',
    fishingArea: 'ฝั่งอันดามันใต้ (ภูเก็ต-สตูล)',
    province: 'ภูเก็ต',
    installDate: '2024-02-10',
    sensors: [],
    status: 'active',
    lastUpdate: new Date().toISOString()
  },
  {
    stationId: 'WQ005',
    stationName: 'Chao Phraya Estuary Station',
    stationNameThai: 'สถานีตรวจวัดปากแม่น้ำเจ้าพระยา',
    coordinates: { lat: 13.4, lon: 100.6 },
    depth: 8,
    waterType: 'estuarine',
    fishingArea: 'ปากแม่น้ำเจ้าพระยา',
    province: 'สมุทรปราการ',
    installDate: '2024-01-25',
    sensors: [],
    status: 'active',
    lastUpdate: new Date().toISOString()
  }
];

// ฟังก์ชันแปลงข้อมูล Raw เป็น SensorReading
export const parseRawSensorData = (rawData: any[]): SensorReading[] => {
  return rawData.map(row => ({
    date: row.Date || '01/10/2025',
    time: row.Time || '8:19:18',
    millisecond: row.Millisecond || 0,
    pH: parseFloat(row.pH) || 7.47,
    conductivity: parseFloat(row.Conductivity) || 273,
    dissolvedOxygen: parseFloat(row['Dissolved Oxygen']) || 5.11,
    turbidity: parseFloat(row.Turbidity) || 95.9,
    temperature: parseFloat(row.Temperature) || 29.6,
    tds: parseFloat(row.TDS) || 163,
    salinity: parseFloat(row.Salinity) || 0.12,
    level: parseFloat(row.Level) || 37,
    chlorophyl: parseFloat(row.Chlorophyl) || 21.34
  }));
};

// ฟังก์ชันประเมินสถานะคุณภาพน้ำ
export const evaluateWaterParameter = (
  parameter: string, 
  value: number
): { status: string; statusThai: string } => {
  const standards = WATER_QUALITY_STANDARDS as any;
  const paramStandards = standards[parameter];
  
  if (!paramStandards) {
    return { status: 'unknown', statusThai: 'ไม่ทราบ' };
  }

  // ตรวจสอบแต่ละระดับ
  for (const [level, range] of Object.entries(paramStandards)) {
    const rangeObj = range as any;
    if (parameter === 'temperature' || parameter === 'salinity') {
      // สำหรับ temperature และ salinity ใช้การตรวจสอบแบบพิเศษ
      if (level === 'normal' && value >= rangeObj.min && value <= rangeObj.max) {
        return { status: level, statusThai: WATER_QUALITY_STATUS_THAI[level as keyof typeof WATER_QUALITY_STATUS_THAI] };
      } else if (level === 'high' && value >= rangeObj.min) {
        return { status: level, statusThai: WATER_QUALITY_STATUS_THAI[level as keyof typeof WATER_QUALITY_STATUS_THAI] };
      } else if (level === 'low' && value <= rangeObj.max) {
        return { status: level, statusThai: WATER_QUALITY_STATUS_THAI[level as keyof typeof WATER_QUALITY_STATUS_THAI] };
      }
    } else {
      // สำหรับพารามิเตอร์อื่นๆ
      if (value >= rangeObj.min && value <= rangeObj.max) {
        return { status: level, statusThai: WATER_QUALITY_STATUS_THAI[level as keyof typeof WATER_QUALITY_STATUS_THAI] };
      }
    }
  }
  
  return { status: 'critical', statusThai: 'วิกฤต' };
};

// ฟังก์ชันคำนวณ Water Quality Index
export const calculateWaterQualityIndex = (reading: SensorReading): number => {
  const weights = {
    pH: 0.2,
    dissolvedOxygen: 0.25,
    temperature: 0.15,
    salinity: 0.15,
    turbidity: 0.15,
    chlorophyl: 0.1
  };

  const scores = {
    pH: getParameterScore('pH', reading.pH),
    dissolvedOxygen: getParameterScore('dissolvedOxygen', reading.dissolvedOxygen),
    temperature: getParameterScore('temperature', reading.temperature),
    salinity: getParameterScore('salinity', reading.salinity),
    turbidity: getParameterScore('turbidity', reading.turbidity),
    chlorophyl: getParameterScore('chlorophyl', reading.chlorophyl)
  };

  const wqi = Object.entries(scores).reduce((total, [param, score]) => {
    const weight = weights[param as keyof typeof weights];
    return total + (score * weight);
  }, 0);

  return Math.round(wqi);
};

// ฟังก์ชันให้คะแนนพารามิเตอร์แต่ละตัว (0-100)
const getParameterScore = (parameter: string, value: number): number => {
  const status = evaluateWaterParameter(parameter, value).status;
  
  switch (status) {
    case 'excellent': return 100;
    case 'good': return 80;
    case 'normal': return 80;
    case 'clear': return 90;
    case 'fair': return 60;
    case 'moderate': return 70;
    case 'poor': return 40;
    case 'turbid': return 50;
    case 'high': return 60;
    case 'low': return 60;
    case 'critical': return 20;
    case 'very_turbid': return 30;
    case 'bloom': return 30;
    default: return 50;
  }
};

// ฟังก์ชันประมวลผลข้อมูลคุณภาพน้ำ
export const processWaterQuality = (
  stationId: string, 
  reading: SensorReading
): ProcessedWaterQuality => {
  const station = MONITORING_STATIONS.find(s => s.stationId === stationId);
  
  if (!station) {
    throw new Error(`Station ${stationId} not found`);
  }

  const pHEval = evaluateWaterParameter('pH', reading.pH);
  const doEval = evaluateWaterParameter('dissolvedOxygen', reading.dissolvedOxygen);
  const tempEval = evaluateWaterParameter('temperature', reading.temperature);
  const salEval = evaluateWaterParameter('salinity', reading.salinity);
  const turbEval = evaluateWaterParameter('turbidity', reading.turbidity);
  const chlorEval = evaluateWaterParameter('chlorophyl', reading.chlorophyl);

  const wqi = calculateWaterQualityIndex(reading);
  
  // กำหนดคุณภาพโดยรวม
  let overallQuality: string;
  let overallQualityThai: string;
  
  if (wqi >= 90) {
    overallQuality = 'excellent';
    overallQualityThai = 'ดีเยี่ยม';
  } else if (wqi >= 70) {
    overallQuality = 'good';
    overallQualityThai = 'ดี';
  } else if (wqi >= 50) {
    overallQuality = 'fair';
    overallQualityThai = 'พอใช้';
  } else if (wqi >= 30) {
    overallQuality = 'poor';
    overallQualityThai = 'แย่';
  } else {
    overallQuality = 'critical';
    overallQualityThai = 'วิกฤต';
  }

  // สร้างการแจ้งเตือน
  const alerts: string[] = [];
  if (reading.pH < 6.5 || reading.pH > 9.0) {
    alerts.push('ค่า pH ผิดปกติ');
  }
  if (reading.dissolvedOxygen < 4.0) {
    alerts.push('ปริมาณออกซิเจนต่ำ');
  }
  if (reading.temperature > 32) {
    alerts.push('อุณหภูมิน้ำสูง');
  }
  if (reading.chlorophyl > 50) {
    alerts.push('ปริมาณสาหร่ายสูง');
  }

  // คำแนะนำการประมง
  let fishingRecommendation: string;
  if (wqi >= 70) {
    fishingRecommendation = 'เหมาะสำหรับการประมง คุณภาพน้ำดี';
  } else if (wqi >= 50) {
    fishingRecommendation = 'ระมัดระวังการประมง ตรวจสอบคุณภาพน้ำอย่างใกล้ชิด';
  } else {
    fishingRecommendation = 'ไม่แนะนำให้ประมงในพื้นที่นี้ คุณภาพน้ำไม่เหมาะสม';
  }

  return {
    stationId,
    date: reading.date,
    time: reading.time,
    location: station.coordinates,
    measurements: {
      pH: {
        value: reading.pH,
        status: pHEval.status as any,
        statusThai: pHEval.statusThai
      },
      dissolvedOxygen: {
        value: reading.dissolvedOxygen,
        status: doEval.status as any,
        statusThai: doEval.statusThai
      },
      temperature: {
        value: reading.temperature,
        status: tempEval.status as any,
        statusThai: tempEval.statusThai
      },
      salinity: {
        value: reading.salinity,
        status: salEval.status as any,
        statusThai: salEval.statusThai
      },
      turbidity: {
        value: reading.turbidity,
        status: turbEval.status as any,
        statusThai: turbEval.statusThai
      },
      conductivity: {
        value: reading.conductivity,
        unit: 'uS/cm'
      },
      tds: {
        value: reading.tds,
        unit: 'mg/L'
      },
      level: {
        value: reading.level,
        unit: 'cm'
      },
      chlorophyl: {
        value: reading.chlorophyl,
        status: chlorEval.status as any,
        statusThai: chlorEval.statusThai
      }
    },
    overallQuality: overallQuality as any,
    overallQualityThai,
    waterQualityIndex: wqi,
    alerts,
    fishingRecommendation
  };
};

// ฟังก์ชันสร้างข้อมูล time-series แบบสมจริง
export const generateTimeSeriesData = (
  stationId: string, 
  days: number = 30
): ProcessedWaterQuality[] => {
  const station = MONITORING_STATIONS.find(s => s.stationId === stationId);
  if (!station) return [];

  const data: ProcessedWaterQuality[] = [];
  const baseDate = new Date('2025-10-01');

  for (let day = 0; day < days; day++) {
    // สร้าง 24 จุดข้อมูลต่อวัน (ทุกชั่วโมง)
    for (let hour = 0; hour < 24; hour += 4) { // ทุก 4 ชั่วโมง
      const currentDate = new Date(baseDate);
      currentDate.setDate(baseDate.getDate() + day);
      currentDate.setHours(hour);

      // สร้างข้อมูลที่สมจริงตามลักษณะของสถานี
      const reading = generateRealisticReading(station, currentDate, day, hour);
      const processed = processWaterQuality(stationId, reading);
      
      data.push(processed);
    }
  }

  return data;
};

// ฟังก์ชันสร้างข้อมูลการอ่านค่าที่สมจริง
const generateRealisticReading = (
  station: WaterMonitoringStation,
  date: Date,
  dayIndex: number,
  hour: number
): SensorReading => {
  // Base values ตามประเภทน้ำและสถานที่
  let basePH = 7.8;
  let baseDO = 6.5;
  let baseTemp = 28.0;
  let baseSalinity = 32.0;
  let baseTurbidity = 15.0;
  let baseChlorophyl = 25.0;

  // ปรับค่าตามประเภทน้ำ
  switch (station.waterType) {
    case 'estuarine':
      basePH = 7.2;
      baseSalinity = 20.0;
      baseTurbidity = 35.0;
      break;
    case 'offshore':
      basePH = 8.1;
      baseDO = 7.0;
      baseSalinity = 34.0;
      baseTurbidity = 8.0;
      break;
    case 'river':
      basePH = 7.0;
      baseSalinity = 0.5;
      baseTurbidity = 25.0;
      break;
  }

  // เพิ่มการเปลี่ยนแปลงตามฤดูกาล
  const seasonFactor = Math.sin((dayIndex / 365) * 2 * Math.PI);
  const dailyFactor = Math.sin((hour / 24) * 2 * Math.PI);

  // Enhanced variation for alert generation (Option 1)
  let pH = basePH + (seasonFactor * 0.3) + (dailyFactor * 0.1) + (Math.random() - 0.5) * 0.8; // increased from 0.2
  let dissolvedOxygen = baseDO + (seasonFactor * 1.0) + (dailyFactor * 0.5) + (Math.random() - 0.5) * 1.8; // increased from 0.8
  let temperature = baseTemp + (seasonFactor * 3.0) + (dailyFactor * 2.0) + (Math.random() - 0.5) * 4.0; // increased from 1.0
  let salinity = baseSalinity + (seasonFactor * 2.0) + (Math.random() - 0.5) * 2.5; // increased from 1.0
  let turbidity = baseTurbidity + (seasonFactor * 5.0) + (Math.random() - 0.5) * 15.0; // increased from 10.0
  let chlorophyl = baseChlorophyl + (seasonFactor * 10.0) + (Math.random() - 0.5) * 20.0; // increased from 5.0

  // Force extreme values for alerts (Option 3) - 3% chance of pollution/extreme events
  const forceExtreme = Math.random() < 0.03;
  if (forceExtreme) {
    const extremeType = Math.floor(Math.random() * 4);
    switch (extremeType) {
      case 0: // pH extreme
        pH = Math.random() < 0.5 ? 6.0 + Math.random() * 0.4 : 9.1 + Math.random() * 0.5; // <6.4 or >9.1
        break;
      case 1: // Low oxygen
        dissolvedOxygen = 1.5 + Math.random() * 2.0; // 1.5-3.5 mg/L
        break;
      case 2: // High temperature
        temperature = 33.0 + Math.random() * 4.0; // 33-37°C
        break;
      case 3: // Algae bloom
        chlorophyl = 55.0 + Math.random() * 45.0; // 55-100 mg/L
        break;
    }
  }

  // Additional chance for multiple parameter pollution event (1% chance)
  if (Math.random() < 0.01) {
    pH = 6.1 + Math.random() * 0.3; // Low pH
    dissolvedOxygen = 2.0 + Math.random() * 1.5; // Low oxygen
    temperature = 34.0 + Math.random() * 3.0; // High temp
    chlorophyl = 60.0 + Math.random() * 30.0; // High chlorophyl
  }

  // คำนวณค่าอื่นๆ ที่เกี่ยวข้อง
  const conductivity = salinity * 1.8 + 200 + (Math.random() - 0.5) * 50;
  const tds = conductivity * 0.6 + (Math.random() - 0.5) * 20;
  const level = 50 + (Math.random() - 0.5) * 20; // ระดับน้ำ

  return {
    date: date.toLocaleDateString('en-GB'),
    time: date.toLocaleTimeString('en-GB'),
    millisecond: 0,
    pH: Math.round(pH * 100) / 100,
    conductivity: Math.round(conductivity),
    dissolvedOxygen: Math.round(dissolvedOxygen * 100) / 100,
    turbidity: Math.round(turbidity * 10) / 10,
    temperature: Math.round(temperature * 10) / 10,
    tds: Math.round(tds),
    salinity: Math.round(salinity * 100) / 100,
    level: Math.round(level * 10) / 10,
    chlorophyl: Math.round(chlorophyl * 100) / 100
  };
};

// ฟังก์ชันสร้างการแจ้งเตือนคุณภาพน้ำ
export const generateWaterQualityAlerts = (
  waterQualityData: ProcessedWaterQuality[]
): WaterQualityAlert[] => {
  const alerts: WaterQualityAlert[] = [];
  let alertIdCounter = 1;

  waterQualityData.forEach(data => {
    const station = MONITORING_STATIONS.find(s => s.stationId === data.stationId);
    if (!station) return;

    // ตรวจสอบ pH
    if (data.measurements.pH.value < 6.5 || data.measurements.pH.value > 9.0) {
      alerts.push({
        alertId: `ALERT-${String(alertIdCounter++).padStart(4, '0')}`,
        stationId: data.stationId,
        stationName: station.stationNameThai,
        type: 'pH',
        severity: data.measurements.pH.value < 6.0 || data.measurements.pH.value > 9.5 ? 'critical' : 'warning',
        severityThai: data.measurements.pH.value < 6.0 || data.measurements.pH.value > 9.5 ? 'วิกฤต' : 'เตือน',
        message: `pH level is ${data.measurements.pH.value}`,
        messageThai: `ค่า pH อยู่ที่ ${data.measurements.pH.value}`,
        value: data.measurements.pH.value,
        threshold: data.measurements.pH.value < 7.0 ? 6.5 : 9.0,
        unit: 'pH',
        timestamp: `${data.date} ${data.time}`,
        resolved: false,
        impact: 'Affects fish health and reproduction',
        impactThai: 'ส่งผลต่อสุขภาพและการสืบพันธุ์ของปลา',
        recommendation: 'Monitor closely and avoid fishing activities',
        recommendationThai: 'ติดตามอย่างใกล้ชิดและหลีกเลี่ยงกิจกรรมประมง'
      });
    }

    // ตรวจสอบ Dissolved Oxygen
    if (data.measurements.dissolvedOxygen.value < 4.0) {
      alerts.push({
        alertId: `ALERT-${String(alertIdCounter++).padStart(4, '0')}`,
        stationId: data.stationId,
        stationName: station.stationNameThai,
        type: 'oxygen',
        severity: data.measurements.dissolvedOxygen.value < 2.0 ? 'critical' : 'warning',
        severityThai: data.measurements.dissolvedOxygen.value < 2.0 ? 'วิกฤต' : 'เตือน',
        message: `Low dissolved oxygen: ${data.measurements.dissolvedOxygen.value} mg/L`,
        messageThai: `ออกซิเจนละลายน้ำต่ำ: ${data.measurements.dissolvedOxygen.value} มก./ล.`,
        value: data.measurements.dissolvedOxygen.value,
        threshold: 4.0,
        unit: 'mg/L',
        timestamp: `${data.date} ${data.time}`,
        resolved: false,
        impact: 'Fish mortality risk, reduced catch potential',
        impactThai: 'เสี่ยงต่อการตายของปลา ศักยภาพการจับลดลง',
        recommendation: 'Suspend fishing activities until oxygen levels improve',
        recommendationThai: 'หยุดกิจกรรมประมงจนกว่าระดับออกซิเจนจะดีขึ้น'
      });
    }

    // ตรวจสอบ Temperature
    if (data.measurements.temperature.value > 32.0) {
      alerts.push({
        alertId: `ALERT-${String(alertIdCounter++).padStart(4, '0')}`,
        stationId: data.stationId,
        stationName: station.stationNameThai,
        type: 'temperature',
        severity: data.measurements.temperature.value > 35.0 ? 'critical' : 'warning',
        severityThai: data.measurements.temperature.value > 35.0 ? 'วิกฤต' : 'เตือน',
        message: `High water temperature: ${data.measurements.temperature.value}°C`,
        messageThai: `อุณหภูมิน้ำสูง: ${data.measurements.temperature.value}°C`,
        value: data.measurements.temperature.value,
        threshold: 32.0,
        unit: '°C',
        timestamp: `${data.date} ${data.time}`,
        resolved: false,
        impact: 'Fish stress, reduced feeding activity',
        impactThai: 'ปลาเครียด กิจกรรมการหากินลดลง',
        recommendation: 'Fish in early morning or evening hours',
        recommendationThai: 'ประมงในช่วงเช้าตรู่หรือเย็น'
      });
    }

    // ตรวจสอบ Chlorophyl (Algae bloom)
    if (data.measurements.chlorophyl.value > 50.0) {
      alerts.push({
        alertId: `ALERT-${String(alertIdCounter++).padStart(4, '0')}`,
        stationId: data.stationId,
        stationName: station.stationNameThai,
        type: 'chlorophyl',
        severity: data.measurements.chlorophyl.value > 100.0 ? 'critical' : 'warning',
        severityThai: data.measurements.chlorophyl.value > 100.0 ? 'วิกฤต' : 'เตือน',
        message: `High chlorophyll levels: ${data.measurements.chlorophyl.value} mg/L`,
        messageThai: `ระดับคลอโรฟิลล์สูง: ${data.measurements.chlorophyl.value} มก./ล.`,
        value: data.measurements.chlorophyl.value,
        threshold: 50.0,
        unit: 'mg/L',
        timestamp: `${data.date} ${data.time}`,
        resolved: false,
        impact: 'Potential algae bloom, oxygen depletion risk',
        impactThai: 'เสี่ยงการเกิดสาหร่ายบลูม ออกซิเจนหมดลง',
        recommendation: 'Avoid fishing, monitor oxygen levels closely',
        recommendationThai: 'หลีกเลี่ยงการประมง ติดตามระดับออกซิเจนอย่างใกล้ชิด'
      });
    }
  });

  return alerts;
};

// Export data สำหรับใช้ใน mock system
export const mockWaterQualityData = MONITORING_STATIONS.map(station => 
  generateTimeSeriesData(station.stationId, 30)
).flat();

export const mockWaterQualityAlerts = generateWaterQualityAlerts(mockWaterQualityData);
