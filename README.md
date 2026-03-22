# 911 Pulse: North America Regional Story Globe

An interactive D3.js visualization for exploring emergency-call patterns as a regional story over time.

## What This Visualization Shows

This project visualizes emergency activity across North America on an interactive globe.  
Instead of plotting individual call dots, it aggregates activity by state/province and encodes each region by its dominant emergency type for the selected month.

The story controls animate month-by-month transitions so viewers can see how dominant emergency patterns shift through the year.

## Features

- **Interactive Globe Navigation:** Drag to rotate and scroll to zoom.
- **Regional Choropleth Layer:** One color per state/province based on dominant emergency type.
- **Story Playback:** Play/pause monthly animation with chapter shortcuts (`Winter Stress`, `Summer Mobility`, `Storm Season`).
- **Details-on-Demand Tooltip:** Hover any region for aggregate statistics:
  - Total calls
  - EMS/Traffic/Fire breakdown
  - Risk index
  - A top story incident report (headline + context)
- **Coordinated Summary Views:**
  - KPI cards (`Calls This Month`, `Top Region`, `Dominant Type`)
  - Category bar chart that updates with time
- **Day/Night Theme Toggle:** Fast visual theme switch for presentation contexts.

## Data and Geography

- **Primary source:** [Montgomery County 911 Calls (Kaggle)](https://www.kaggle.com/datasets/mchirico/montcoalert)
- **Regional boundaries:**
  - `data/us-states.geojson`
  - `data/canada-provinces.geojson`
  - `data/mexico-states.geojson`
- **Base globe land/ocean context:** `countries-110m.json` (TopoJSON)

## Project Structure

- `index.html` - app structure and UI components
- `main.js` - interaction, animation, aggregation logic, and rendering
- `style.css` - layout, theme, and component styling
- `data/` - state/province boundary files
- `scripts/preprocess.py` - preprocessing helper for dataset work

## Local Development

1. Clone the repository:
   ```bash
   git clone https://github.com/sahilhanda/csc316-A3.git
   cd csc316-A3
   ```
2. Start a local server:
   ```bash
   python3 -m http.server
   ```
3. Open:
   ```text
   http://localhost:8000
   ```

## Deployment

Deploy to GitHub Pages from the repository root (or `/docs`) so `index.html`, assets, and data files are served as static files.

## Built With

- [D3.js v7](https://d3js.org/)
- [TopoJSON Client](https://github.com/topojson/topojson-client)
