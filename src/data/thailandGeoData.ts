// Dữ liệu GeoJSON cho ranh giới tỉnh thành và vùng biển Thái Lan
export const THAILAND_PROVINCES_GEOJSON = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: {
        name: 'กรุงเทพมหานคร',
        name_en: 'Bangkok',
        region: 'Central',
      },
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [100.3, 13.5],
            [100.9, 13.5],
            [100.9, 14.0],
            [100.3, 14.0],
            [100.3, 13.5],
          ],
        ],
      },
    },
    {
      type: 'Feature',
      properties: {
        name: 'ชลบุรี',
        name_en: 'Chonburi',
        region: 'Eastern',
      },
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [100.8, 12.8],
            [101.5, 12.8],
            [101.5, 13.8],
            [100.8, 13.8],
            [100.8, 12.8],
          ],
        ],
      },
    },
    {
      type: 'Feature',
      properties: {
        name: 'ระยong',
        name_en: 'Rayong',
        region: 'Eastern',
      },
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [101.2, 12.4],
            [101.8, 12.4],
            [101.8, 13.0],
            [101.2, 13.0],
            [101.2, 12.4],
          ],
        ],
      },
    },
    {
      type: 'Feature',
      properties: {
        name: 'จันทบุรี',
        name_en: 'Chanthaburi',
        region: 'Eastern',
      },
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [101.8, 12.2],
            [102.5, 12.2],
            [102.5, 13.0],
            [101.8, 13.0],
            [101.8, 12.2],
          ],
        ],
      },
    },
    {
      type: 'Feature',
      properties: {
        name: 'ตราด',
        name_en: 'Trat',
        region: 'Eastern',
      },
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [102.3, 11.8],
            [102.9, 11.8],
            [102.9, 12.6],
            [102.3, 12.6],
            [102.3, 11.8],
          ],
        ],
      },
    },
    {
      type: 'Feature',
      properties: {
        name: 'เพชรบุรี',
        name_en: 'Phetchaburi',
        region: 'Western',
      },
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [99.8, 12.8],
            [100.5, 12.8],
            [100.5, 13.5],
            [99.8, 13.5],
            [99.8, 12.8],
          ],
        ],
      },
    },
    {
      type: 'Feature',
      properties: {
        name: 'ประจวบคีรีขันธ์',
        name_en: 'Prachuap Khiri Khan',
        region: 'Western',
      },
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [99.5, 11.2],
            [100.3, 11.2],
            [100.3, 12.8],
            [99.5, 12.8],
            [99.5, 11.2],
          ],
        ],
      },
    },
    {
      type: 'Feature',
      properties: {
        name: 'ชุมพร',
        name_en: 'Chumphon',
        region: 'Southern',
      },
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [99.0, 10.0],
            [99.8, 10.0],
            [99.8, 11.2],
            [99.0, 11.2],
            [99.0, 10.0],
          ],
        ],
      },
    },
    {
      type: 'Feature',
      properties: {
        name: 'สุราษฎร์ธานี',
        name_en: 'Surat Thani',
        region: 'Southern',
      },
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [98.8, 8.5],
            [100.2, 8.5],
            [100.2, 10.0],
            [98.8, 10.0],
            [98.8, 8.5],
          ],
        ],
      },
    },
    {
      type: 'Feature',
      properties: {
        name: 'นครศรีธรรมราช',
        name_en: 'Nakhon Si Thammarat',
        region: 'Southern',
      },
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [99.5, 7.8],
            [100.5, 7.8],
            [100.5, 9.0],
            [99.5, 9.0],
            [99.5, 7.8],
          ],
        ],
      },
    },
    {
      type: 'Feature',
      properties: {
        name: 'พังงา',
        name_en: 'Phang Nga',
        region: 'Southern',
      },
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [98.0, 7.8],
            [98.8, 7.8],
            [98.8, 9.0],
            [98.0, 9.0],
            [98.0, 7.8],
          ],
        ],
      },
    },
    {
      type: 'Feature',
      properties: {
        name: 'ภูเก็ต',
        name_en: 'Phuket',
        region: 'Southern',
      },
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [98.2, 7.8],
            [98.5, 7.8],
            [98.5, 8.2],
            [98.2, 8.2],
            [98.2, 7.8],
          ],
        ],
      },
    },
    {
      type: 'Feature',
      properties: {
        name: 'กระบี่',
        name_en: 'Krabi',
        region: 'Southern',
      },
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [98.5, 7.5],
            [99.5, 7.5],
            [99.5, 8.5],
            [98.5, 8.5],
            [98.5, 7.5],
          ],
        ],
      },
    },
    {
      type: 'Feature',
      properties: {
        name: 'ตรัง',
        name_en: 'Trang',
        region: 'Southern',
      },
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [99.2, 7.0],
            [100.0, 7.0],
            [100.0, 8.0],
            [99.2, 8.0],
            [99.2, 7.0],
          ],
        ],
      },
    },
    {
      type: 'Feature',
      properties: {
        name: 'สตูล',
        name_en: 'Satun',
        region: 'Southern',
      },
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [99.5, 6.4],
            [100.2, 6.4],
            [100.2, 7.2],
            [99.5, 7.2],
            [99.5, 6.4],
          ],
        ],
      },
    },
    {
      type: 'Feature',
      properties: {
        name: 'สงขลา',
        name_en: 'Songkhla',
        region: 'Southern',
      },
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [100.0, 6.8],
            [100.8, 6.8],
            [100.8, 7.8],
            [100.0, 7.8],
            [100.0, 6.8],
          ],
        ],
      },
    },
    {
      type: 'Feature',
      properties: {
        name: 'ปัตตานี',
        name_en: 'Pattani',
        region: 'Southern',
      },
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [100.8, 6.6],
            [101.5, 6.6],
            [101.5, 7.2],
            [100.8, 7.2],
            [100.8, 6.6],
          ],
        ],
      },
    },
    {
      type: 'Feature',
      properties: {
        name: 'ยะลา',
        name_en: 'Yala',
        region: 'Southern',
      },
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [100.8, 5.8],
            [101.8, 5.8],
            [101.8, 6.8],
            [100.8, 6.8],
            [100.8, 5.8],
          ],
        ],
      },
    },
    {
      type: 'Feature',
      properties: {
        name: 'นราธิวาส',
        name_en: 'Narathiwat',
        region: 'Southern',
      },
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [101.2, 5.5],
            [102.0, 5.5],
            [102.0, 6.8],
            [101.2, 6.8],
            [101.2, 5.5],
          ],
        ],
      },
    },
  ],
}

// Dữ liệu vùng biển Thái Lan
export const THAILAND_MARINE_ZONES = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: {
        name: 'อ่าวไทยตอนบน',
        name_en: 'Upper Gulf of Thailand',
        zone_type: 'fishing_area',
      },
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [100.0, 12.5],
            [102.0, 12.5],
            [102.0, 14.0],
            [100.0, 14.0],
            [100.0, 12.5],
          ],
        ],
      },
    },
    {
      type: 'Feature',
      properties: {
        name: 'อ่าวไทยตอนกลาง',
        name_en: 'Central Gulf of Thailand',
        zone_type: 'fishing_area',
      },
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [99.5, 10.0],
            [103.0, 10.0],
            [103.0, 12.5],
            [99.5, 12.5],
            [99.5, 10.0],
          ],
        ],
      },
    },
    {
      type: 'Feature',
      properties: {
        name: 'อ่าวไทยตอนล่าง',
        name_en: 'Lower Gulf of Thailand',
        zone_type: 'fishing_area',
      },
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [99.0, 6.0],
            [103.5, 6.0],
            [103.5, 10.0],
            [99.0, 10.0],
            [99.0, 6.0],
          ],
        ],
      },
    },
    {
      type: 'Feature',
      properties: {
        name: 'ทะเลอันดามันตอนบน',
        name_en: 'Upper Andaman Sea',
        zone_type: 'fishing_area',
      },
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [97.0, 9.0],
            [99.0, 9.0],
            [99.0, 12.0],
            [97.0, 12.0],
            [97.0, 9.0],
          ],
        ],
      },
    },
    {
      type: 'Feature',
      properties: {
        name: 'ทะเลอันดามันตอนล่าง',
        name_en: 'Lower Andaman Sea',
        zone_type: 'fishing_area',
      },
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [97.0, 5.5],
            [99.0, 5.5],
            [99.0, 9.0],
            [97.0, 9.0],
            [97.0, 5.5],
          ],
        ],
      },
    },
    {
      type: 'Feature',
      properties: {
        name: 'เขตเศรษฐกิจจำเพาะอ่าวไทย',
        name_en: 'Gulf of Thailand EEZ',
        zone_type: 'eez',
      },
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [98.5, 5.5],
            [104.0, 5.5],
            [104.0, 14.5],
            [98.5, 14.5],
            [98.5, 5.5],
          ],
        ],
      },
    },
    {
      type: 'Feature',
      properties: {
        name: 'เขตเศรษฐกิจจำเพาะทะเลอันดามัน',
        name_en: 'Andaman Sea EEZ',
        zone_type: 'eez',
      },
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [96.0, 5.0],
            [99.5, 5.0],
            [99.5, 13.0],
            [96.0, 13.0],
            [96.0, 5.0],
          ],
        ],
      },
    },
  ],
}

// Tọa độ trung tâm Thái Lan
export const THAILAND_CENTER = {
  lat: 13.7563,
  lng: 100.5018,
}

// Bounding box cho Thái Lan
export const THAILAND_BOUNDS = {
  southwest: { lat: 5.5, lng: 97.0 },
  northeast: { lat: 20.5, lng: 105.0 },
}
