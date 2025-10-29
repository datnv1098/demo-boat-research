import { useState } from 'react'
import { Map } from 'lucide-react'
import { Header, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/common'
import { ThailandMap } from '../components/ThailandMap'

interface HotspotCell { r: number; c: number; density: number; coordinates: { lat: number; lon: number } }

const mockHotspotGrid: HotspotCell[][] = [
  [
      {
          "r": 0,
          "c": 0,
          "density": 64,
          "coordinates": {
              "lat": 6,
              "lon": 95
          }
      },
      {
          "r": 0,
          "c": 1,
          "density": 49,
          "coordinates": {
              "lat": 6,
              "lon": 95.66666666666667
          }
      },
      {
          "r": 0,
          "c": 2,
          "density": 79,
          "coordinates": {
              "lat": 6,
              "lon": 96.33333333333333
          }
      },
      {
          "r": 0,
          "c": 3,
          "density": 37,
          "coordinates": {
              "lat": 6,
              "lon": 97
          }
      },
      {
          "r": 0,
          "c": 4,
          "density": 91,
          "coordinates": {
              "lat": 6,
              "lon": 97.66666666666667
          }
      },
      {
          "r": 0,
          "c": 5,
          "density": 25,
          "coordinates": {
              "lat": 6,
              "lon": 98.33333333333333
          }
      },
      {
          "r": 0,
          "c": 6,
          "density": 38,
          "coordinates": {
              "lat": 6,
              "lon": 99
          }
      },
      {
          "r": 0,
          "c": 7,
          "density": 63,
          "coordinates": {
              "lat": 6,
              "lon": 99.66666666666667
          }
      },
      {
          "r": 0,
          "c": 8,
          "density": 29,
          "coordinates": {
              "lat": 6,
              "lon": 100.33333333333333
          }
      },
      {
          "r": 0,
          "c": 9,
          "density": 10,
          "coordinates": {
              "lat": 6,
              "lon": 101
          }
      },
      {
          "r": 0,
          "c": 10,
          "density": 77,
          "coordinates": {
              "lat": 6,
              "lon": 101.66666666666667
          }
      },
      {
          "r": 0,
          "c": 11,
          "density": 46,
          "coordinates": {
              "lat": 6,
              "lon": 102.33333333333333
          }
      }
  ],
  [
      {
          "r": 1,
          "c": 0,
          "density": 64,
          "coordinates": {
              "lat": 7,
              "lon": 95
          }
      },
      {
          "r": 1,
          "c": 1,
          "density": 39,
          "coordinates": {
              "lat": 7,
              "lon": 95.66666666666667
          }
      },
      {
          "r": 1,
          "c": 2,
          "density": 45,
          "coordinates": {
              "lat": 7,
              "lon": 96.33333333333333
          }
      },
      {
          "r": 1,
          "c": 3,
          "density": 91,
          "coordinates": {
              "lat": 7,
              "lon": 97
          }
      },
      {
          "r": 1,
          "c": 4,
          "density": 50,
          "coordinates": {
              "lat": 7,
              "lon": 97.66666666666667
          }
      },
      {
          "r": 1,
          "c": 5,
          "density": 25,
          "coordinates": {
              "lat": 7,
              "lon": 98.33333333333333
          }
      },
      {
          "r": 1,
          "c": 6,
          "density": 29,
          "coordinates": {
              "lat": 7,
              "lon": 99
          }
      },
      {
          "r": 1,
          "c": 7,
          "density": 67,
          "coordinates": {
              "lat": 7,
              "lon": 99.66666666666667
          }
      },
      {
          "r": 1,
          "c": 8,
          "density": 58,
          "coordinates": {
              "lat": 7,
              "lon": 100.33333333333333
          }
      },
      {
          "r": 1,
          "c": 9,
          "density": 74,
          "coordinates": {
              "lat": 7,
              "lon": 101
          }
      },
      {
          "r": 1,
          "c": 10,
          "density": 21,
          "coordinates": {
              "lat": 7,
              "lon": 101.66666666666667
          }
      },
      {
          "r": 1,
          "c": 11,
          "density": 31,
          "coordinates": {
              "lat": 7,
              "lon": 102.33333333333333
          }
      }
  ],
  [
      {
          "r": 2,
          "c": 0,
          "density": 76,
          "coordinates": {
              "lat": 8,
              "lon": 95
          }
      },
      {
          "r": 2,
          "c": 1,
          "density": 94,
          "coordinates": {
              "lat": 8,
              "lon": 95.66666666666667
          }
      },
      {
          "r": 2,
          "c": 2,
          "density": 57,
          "coordinates": {
              "lat": 8,
              "lon": 96.33333333333333
          }
      },
      {
          "r": 2,
          "c": 3,
          "density": 22,
          "coordinates": {
              "lat": 8,
              "lon": 97
          }
      },
      {
          "r": 2,
          "c": 4,
          "density": 81,
          "coordinates": {
              "lat": 8,
              "lon": 97.66666666666667
          }
      },
      {
          "r": 2,
          "c": 5,
          "density": 21,
          "coordinates": {
              "lat": 8,
              "lon": 98.33333333333333
          }
      },
      {
          "r": 2,
          "c": 6,
          "density": 24,
          "coordinates": {
              "lat": 8,
              "lon": 99
          }
      },
      {
          "r": 2,
          "c": 7,
          "density": 58,
          "coordinates": {
              "lat": 8,
              "lon": 99.66666666666667
          }
      },
      {
          "r": 2,
          "c": 8,
          "density": 17,
          "coordinates": {
              "lat": 8,
              "lon": 100.33333333333333
          }
      },
      {
          "r": 2,
          "c": 9,
          "density": 69,
          "coordinates": {
              "lat": 8,
              "lon": 101
          }
      },
      {
          "r": 2,
          "c": 10,
          "density": 66,
          "coordinates": {
              "lat": 8,
              "lon": 101.66666666666667
          }
      },
      {
          "r": 2,
          "c": 11,
          "density": 21,
          "coordinates": {
              "lat": 8,
              "lon": 102.33333333333333
          }
      }
  ],
  [
      {
          "r": 3,
          "c": 0,
          "density": 96,
          "coordinates": {
              "lat": 9,
              "lon": 95
          }
      },
      {
          "r": 3,
          "c": 1,
          "density": 17,
          "coordinates": {
              "lat": 9,
              "lon": 95.66666666666667
          }
      },
      {
          "r": 3,
          "c": 2,
          "density": 11,
          "coordinates": {
              "lat": 9,
              "lon": 96.33333333333333
          }
      },
      {
          "r": 3,
          "c": 3,
          "density": 33,
          "coordinates": {
              "lat": 9,
              "lon": 97
          }
      },
      {
          "r": 3,
          "c": 4,
          "density": 90,
          "coordinates": {
              "lat": 9,
              "lon": 97.66666666666667
          }
      },
      {
          "r": 3,
          "c": 5,
          "density": 40,
          "coordinates": {
              "lat": 9,
              "lon": 98.33333333333333
          }
      },
      {
          "r": 3,
          "c": 6,
          "density": 21,
          "coordinates": {
              "lat": 9,
              "lon": 99
          }
      },
      {
          "r": 3,
          "c": 7,
          "density": 18,
          "coordinates": {
              "lat": 9,
              "lon": 99.66666666666667
          }
      },
      {
          "r": 3,
          "c": 8,
          "density": 45,
          "coordinates": {
              "lat": 9,
              "lon": 100.33333333333333
          }
      },
      {
          "r": 3,
          "c": 9,
          "density": 87,
          "coordinates": {
              "lat": 9,
              "lon": 101
          }
      },
      {
          "r": 3,
          "c": 10,
          "density": 99,
          "coordinates": {
              "lat": 9,
              "lon": 101.66666666666667
          }
      },
      {
          "r": 3,
          "c": 11,
          "density": 70,
          "coordinates": {
              "lat": 9,
              "lon": 102.33333333333333
          }
      }
  ],
  [
      {
          "r": 4,
          "c": 0,
          "density": 23,
          "coordinates": {
              "lat": 10,
              "lon": 95
          }
      },
      {
          "r": 4,
          "c": 1,
          "density": 22,
          "coordinates": {
              "lat": 10,
              "lon": 95.66666666666667
          }
      },
      {
          "r": 4,
          "c": 2,
          "density": 43,
          "coordinates": {
              "lat": 10,
              "lon": 96.33333333333333
          }
      },
      {
          "r": 4,
          "c": 3,
          "density": 25,
          "coordinates": {
              "lat": 10,
              "lon": 97
          }
      },
      {
          "r": 4,
          "c": 4,
          "density": 89,
          "coordinates": {
              "lat": 10,
              "lon": 97.66666666666667
          }
      },
      {
          "r": 4,
          "c": 5,
          "density": 21,
          "coordinates": {
              "lat": 10,
              "lon": 98.33333333333333
          }
      },
      {
          "r": 4,
          "c": 6,
          "density": 47,
          "coordinates": {
              "lat": 10,
              "lon": 99
          }
      },
      {
          "r": 4,
          "c": 7,
          "density": 79,
          "coordinates": {
              "lat": 10,
              "lon": 99.66666666666667
          }
      },
      {
          "r": 4,
          "c": 8,
          "density": 21,
          "coordinates": {
              "lat": 10,
              "lon": 100.33333333333333
          }
      },
      {
          "r": 4,
          "c": 9,
          "density": 36,
          "coordinates": {
              "lat": 10,
              "lon": 101
          }
      },
      {
          "r": 4,
          "c": 10,
          "density": 39,
          "coordinates": {
              "lat": 10,
              "lon": 101.66666666666667
          }
      },
      {
          "r": 4,
          "c": 11,
          "density": 39,
          "coordinates": {
              "lat": 10,
              "lon": 102.33333333333333
          }
      }
  ],
  [
      {
          "r": 5,
          "c": 0,
          "density": 68,
          "coordinates": {
              "lat": 11,
              "lon": 95
          }
      },
      {
          "r": 5,
          "c": 1,
          "density": 21,
          "coordinates": {
              "lat": 11,
              "lon": 95.66666666666667
          }
      },
      {
          "r": 5,
          "c": 2,
          "density": 98,
          "coordinates": {
              "lat": 11,
              "lon": 96.33333333333333
          }
      },
      {
          "r": 5,
          "c": 3,
          "density": 77,
          "coordinates": {
              "lat": 11,
              "lon": 97
          }
      },
      {
          "r": 5,
          "c": 4,
          "density": 36,
          "coordinates": {
              "lat": 11,
              "lon": 97.66666666666667
          }
      },
      {
          "r": 5,
          "c": 5,
          "density": 85,
          "coordinates": {
              "lat": 11,
              "lon": 98.33333333333333
          }
      },
      {
          "r": 5,
          "c": 6,
          "density": 57,
          "coordinates": {
              "lat": 11,
              "lon": 99
          }
      },
      {
          "r": 5,
          "c": 7,
          "density": 54,
          "coordinates": {
              "lat": 11,
              "lon": 99.66666666666667
          }
      },
      {
          "r": 5,
          "c": 8,
          "density": 96,
          "coordinates": {
              "lat": 11,
              "lon": 100.33333333333333
          }
      },
      {
          "r": 5,
          "c": 9,
          "density": 79,
          "coordinates": {
              "lat": 11,
              "lon": 101
          }
      },
      {
          "r": 5,
          "c": 10,
          "density": 91,
          "coordinates": {
              "lat": 11,
              "lon": 101.66666666666667
          }
      },
      {
          "r": 5,
          "c": 11,
          "density": 56,
          "coordinates": {
              "lat": 11,
              "lon": 102.33333333333333
          }
      }
  ],
  [
      {
          "r": 6,
          "c": 0,
          "density": 91,
          "coordinates": {
              "lat": 12,
              "lon": 95
          }
      },
      {
          "r": 6,
          "c": 1,
          "density": 28,
          "coordinates": {
              "lat": 12,
              "lon": 95.66666666666667
          }
      },
      {
          "r": 6,
          "c": 2,
          "density": 18,
          "coordinates": {
              "lat": 12,
              "lon": 96.33333333333333
          }
      },
      {
          "r": 6,
          "c": 3,
          "density": 45,
          "coordinates": {
              "lat": 12,
              "lon": 97
          }
      },
      {
          "r": 6,
          "c": 4,
          "density": 62,
          "coordinates": {
              "lat": 12,
              "lon": 97.66666666666667
          }
      },
      {
          "r": 6,
          "c": 5,
          "density": 59,
          "coordinates": {
              "lat": 12,
              "lon": 98.33333333333333
          }
      },
      {
          "r": 6,
          "c": 6,
          "density": 69,
          "coordinates": {
              "lat": 12,
              "lon": 99
          }
      },
      {
          "r": 6,
          "c": 7,
          "density": 85,
          "coordinates": {
              "lat": 12,
              "lon": 99.66666666666667
          }
      },
      {
          "r": 6,
          "c": 8,
          "density": 19,
          "coordinates": {
              "lat": 12,
              "lon": 100.33333333333333
          }
      },
      {
          "r": 6,
          "c": 9,
          "density": 39,
          "coordinates": {
              "lat": 12,
              "lon": 101
          }
      },
      {
          "r": 6,
          "c": 10,
          "density": 34,
          "coordinates": {
              "lat": 12,
              "lon": 101.66666666666667
          }
      },
      {
          "r": 6,
          "c": 11,
          "density": 86,
          "coordinates": {
              "lat": 12,
              "lon": 102.33333333333333
          }
      }
  ],
  [
      {
          "r": 7,
          "c": 0,
          "density": 99,
          "coordinates": {
              "lat": 13,
              "lon": 95
          }
      },
      {
          "r": 7,
          "c": 1,
          "density": 73,
          "coordinates": {
              "lat": 13,
              "lon": 95.66666666666667
          }
      },
      {
          "r": 7,
          "c": 2,
          "density": 59,
          "coordinates": {
              "lat": 13,
              "lon": 96.33333333333333
          }
      },
      {
          "r": 7,
          "c": 3,
          "density": 97,
          "coordinates": {
              "lat": 13,
              "lon": 97
          }
      },
      {
          "r": 7,
          "c": 4,
          "density": 97,
          "coordinates": {
              "lat": 13,
              "lon": 97.66666666666667
          }
      },
      {
          "r": 7,
          "c": 5,
          "density": 82,
          "coordinates": {
              "lat": 13,
              "lon": 98.33333333333333
          }
      },
      {
          "r": 7,
          "c": 6,
          "density": 91,
          "coordinates": {
              "lat": 13,
              "lon": 99
          }
      },
      {
          "r": 7,
          "c": 7,
          "density": 54,
          "coordinates": {
              "lat": 13,
              "lon": 99.66666666666667
          }
      },
      {
          "r": 7,
          "c": 8,
          "density": 67,
          "coordinates": {
              "lat": 13,
              "lon": 100.33333333333333
          }
      },
      {
          "r": 7,
          "c": 9,
          "density": 82,
          "coordinates": {
              "lat": 13,
              "lon": 101
          }
      },
      {
          "r": 7,
          "c": 10,
          "density": 43,
          "coordinates": {
              "lat": 13,
              "lon": 101.66666666666667
          }
      },
      {
          "r": 7,
          "c": 11,
          "density": 55,
          "coordinates": {
              "lat": 13,
              "lon": 102.33333333333333
          }
      }
  ]
]
export default function HotspotMapPage() {
  const [month, setMonth] = useState('ส.ค.')
  const thaiMonths = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.']

  return (
    <div>
      <Header title="แผนที่จุดร้อน" desc="อนุมานความหนาแน่น/CPUE มาตรฐานบนกริดเชิงพื้นที่-เวลา; จัดอันดับจุดร้อนตามสปีชีส์/เวลา" icon={<Map className="h-6 w-6" />} />
      <div className="mb-4 w-56">
        <Label>เดือน</Label>
        <Select defaultValue={month} onValueChange={setMonth}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {thaiMonths.map((m) => (<SelectItem key={m} value={m}>{m}</SelectItem>))}
          </SelectContent>
        </Select>
      </div>
      <ThailandMap hotspotData={mockHotspotGrid as any} month={month} />
    </div>
  )
}


