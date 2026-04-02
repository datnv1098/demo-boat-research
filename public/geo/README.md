# Marine Admin Geo Data

This folder stores runtime geo assets for the frontend choropleth page.

Files:

- `source/thailand-adm1-simplified.geojson`
  - ADM1 source geometry used to enrich province metadata.
- `thailand-marine-admin-adm1.geojson`
  - Derived marine ADM1 polygons for v1 choropleth visualization.
- `thailand-marine-admin-adm1-grid.json`
  - Grid lookup used to assign haul points to derived marine ADM1 regions.
- `thailand-marine-admin-adm1.metadata.json`
  - Provenance, bounds, grid size, and region metadata.

Notes:

- These polygons are derived analytical regions for CPUE choropleth display.
- They are not legal maritime boundaries.
- To rebuild them, run `npm run build:marine-admin` from `frontend/`.
