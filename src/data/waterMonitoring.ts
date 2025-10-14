// ระบบตรวจสอบคุณภาพน้ำสำหรับการประมง
// Water Quality Monitoring System for Fisheries

// Interface สำหรับการตั้งค่าเซนเซอร์
export interface SensorConfig {
  pen: number;
  color: string;
  ioType: 'AI' | 'PI';
  channelId: number;
  channelName: string;
  displayComment: string;
  scaling0: number;
  scaling100: number;
  scalingUnit: string;
  decimals: number;
  engineeringUnit: string;
}

// Interface สำหรับข้อมูลการอ่านค่าเซนเซอร์
export interface SensorReading {
  date: string;
  time: string;
  millisecond: number;
  pH: number;
  conductivity: number; // uS/cm
  dissolvedOxygen: number; // mg/L
  turbidity: number; // NTU
  temperature: number; // Deg C
  tds: number; // mg/L
  salinity: number; // PSU
  level: number; // cm
  chlorophyl: number; // mg/L
}

// Interface สำหรับสถานีตรวจวัดคุณภาพน้ำ
export interface WaterMonitoringStation {
  stationId: string;
  stationName: string;
  stationNameThai: string;
  coordinates: {
    lat: number;
    lon: number;
  };
  depth: number; // เมตร
  waterType: 'coastal' | 'estuarine' | 'offshore' | 'river'; // ประเภทน้ำ
  fishingArea: string;
  province: string;
  installDate: string;
  sensors: SensorConfig[];
  status: 'active' | 'maintenance' | 'offline';
  lastUpdate: string;
}

// Interface สำหรับข้อมูลคุณภาพน้ำที่ประมวลผลแล้ว
export interface ProcessedWaterQuality {
  stationId: string;
  date: string;
  time: string;
  location: {
    lat: number;
    lon: number;
  };
  measurements: {
    pH: {
      value: number;
      status: 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
      statusThai: string;
    };
    dissolvedOxygen: {
      value: number;
      status: 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
      statusThai: string;
    };
    temperature: {
      value: number;
      status: 'normal' | 'high' | 'low';
      statusThai: string;
    };
    salinity: {
      value: number;
      status: 'normal' | 'high' | 'low';
      statusThai: string;
    };
    turbidity: {
      value: number;
      status: 'clear' | 'moderate' | 'turbid' | 'very_turbid';
      statusThai: string;
    };
    conductivity: {
      value: number;
      unit: string;
    };
    tds: {
      value: number;
      unit: string;
    };
    level: {
      value: number;
      unit: string;
    };
    chlorophyl: {
      value: number;
      status: 'low' | 'normal' | 'high' | 'bloom';
      statusThai: string;
    };
  };
  overallQuality: 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
  overallQualityThai: string;
  waterQualityIndex: number; // 0-100
  alerts: string[];
  fishingRecommendation: string;
}

// Interface สำหรับการแจ้งเตือนคุณภาพน้ำ
export interface WaterQualityAlert {
  alertId: string;
  stationId: string;
  stationName: string;
  type: 'pH' | 'oxygen' | 'temperature' | 'salinity' | 'turbidity' | 'chlorophyl' | 'general';
  severity: 'info' | 'warning' | 'critical' | 'emergency';
  severityThai: string;
  message: string;
  messageThai: string;
  value: number;
  threshold: number;
  unit: string;
  timestamp: string;
  resolved: boolean;
  impact: string;
  impactThai: string;
  recommendation: string;
  recommendationThai: string;
}

// Interface สำหรับสถิติคุณภาพน้ำ
export interface WaterQualityStatistics {
  stationId: string;
  period: 'daily' | 'weekly' | 'monthly';
  startDate: string;
  endDate: string;
  averages: {
    pH: number;
    dissolvedOxygen: number;
    temperature: number;
    salinity: number;
    turbidity: number;
    chlorophyl: number;
  };
  ranges: {
    pH: { min: number; max: number };
    dissolvedOxygen: { min: number; max: number };
    temperature: { min: number; max: number };
    salinity: { min: number; max: number };
    turbidity: { min: number; max: number };
    chlorophyl: { min: number; max: number };
  };
  qualityTrend: 'improving' | 'stable' | 'declining';
  qualityTrendThai: string;
  dataPoints: number;
  completeness: number; // % ความสมบูรณ์ของข้อมูล
}

// ค่ามาตรฐานคุณภาพน้ำสำหรับการประมง
export const WATER_QUALITY_STANDARDS = {
  pH: {
    excellent: { min: 7.5, max: 8.5 },
    good: { min: 7.0, max: 9.0 },
    fair: { min: 6.5, max: 9.5 },
    poor: { min: 6.0, max: 10.0 },
    critical: { min: 0, max: 6.0, maxCritical: 10.0 }
  },
  dissolvedOxygen: { // mg/L
    excellent: { min: 6.0, max: 20.0 },
    good: { min: 4.0, max: 20.0 },
    fair: { min: 2.0, max: 20.0 },
    poor: { min: 1.0, max: 20.0 },
    critical: { min: 0, max: 1.0 }
  },
  temperature: { // Celsius
    normal: { min: 20, max: 32 },
    high: { min: 32, max: 40 },
    low: { min: 10, max: 20 }
  },
  salinity: { // PSU
    normal: { min: 30, max: 35 },
    high: { min: 35, max: 40 },
    low: { min: 20, max: 30 }
  },
  turbidity: { // NTU
    clear: { min: 0, max: 5 },
    moderate: { min: 5, max: 25 },
    turbid: { min: 25, max: 100 },
    very_turbid: { min: 100, max: 1000 }
  },
  chlorophyl: { // mg/L
    low: { min: 0, max: 10 },
    normal: { min: 10, max: 30 },
    high: { min: 30, max: 100 },
    bloom: { min: 100, max: 1000 }
  }
};

// การแปลสถานะเป็นภาษาไทย
export const WATER_QUALITY_STATUS_THAI = {
  // pH Status
  excellent: 'ดีเยี่ยม',
  good: 'ดี',
  fair: 'พอใช้',
  poor: 'แย่',
  critical: 'วิกฤต',
  
  // Temperature Status
  normal: 'ปกติ',
  high: 'สูง',
  low: 'ต่ำ',
  
  // Turbidity Status
  clear: 'ใส',
  moderate: 'ปานกลาง',
  turbid: 'ขุ่น',
  very_turbid: 'ขุ่นมาก',
  
  // Chlorophyl Status
  bloom: 'ปริมาณสาหร่ายสูง',
  
  // Alert Severity
  info: 'ข้อมูล',
  warning: 'เตือน',
  emergency: 'ฉุกเฉิน',
  
  // Quality Trend
  improving: 'ดีขึ้น',
  stable: 'คงที่',
  declining: 'แย่ลง'
};
