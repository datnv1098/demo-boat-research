export const thaiFisheriesSchema = [
  { table: 'trip_data', column: 'trip_id', type: 'varchar', desc: 'รหัสการเดินทาง' },
  { table: 'trip_data', column: 'vessel_reg', type: 'varchar', desc: 'ทะเบียนเรือประมง' },
  { table: 'trip_data', column: 'departure_time', type: 'timestamptz', desc: 'เวลาออกเดินทาง' },
  { table: 'trip_data', column: 'fishing_area', type: 'varchar', desc: 'พื้นที่ประมง' },
  { table: 'trip_data', column: 'latitude', type: 'numeric', desc: 'ละติจูด (WGS84)' },
  { table: 'trip_data', column: 'longitude', type: 'numeric', desc: 'ลองจิจูด (WGS84)' },
  { table: 'catch_data', column: 'species_name', type: 'varchar', desc: 'ชื่อสปีชีส์ (ไทย/วิทยาศาสตร์)' },
  { table: 'catch_data', column: 'weight_kg', type: 'numeric', desc: 'น้ำหนักที่จับได้ (กก.)' },
  { table: 'length_data', column: 'length_cm', type: 'numeric', desc: 'ความยาวตัว (ซม.)' },
  { table: 'length_data', column: 'sex', type: 'varchar', desc: 'เพศ (ผู้/เมี้ยง/ไม่ระบุ)' },
]

export const thaiAPIEndpoints = [
  { method: 'GET', path: '/api/v1/cpue?species=ปลาทู&area=อ่าวไทยบน&season=Q3', desc: 'อนุกรม CPUE มาตรฐาน' },
  { method: 'GET', path: '/api/v1/length-indices?species=กุ้งกุลาดำ&area=อันดามัน', desc: 'ดัชนีตามความยาว (L95, %<Lm50)' },
  { method: 'POST', path: '/api/v1/scenario-simulation', desc: 'รันการจำลองสถานการณ์' },
  { method: 'GET', path: '/api/v1/closure-areas', desc: 'รายการพื้นที่ปิดตามเวลา' },
]


