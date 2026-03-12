# 911 Emergency Calls - Interactive Globe Visualization

A high-performance 3D globe visualization of the Montgomery County, PA 911 dataset, built with D3.js. 🌍

![Final Globe Demo](https://raw.githubusercontent.com/sahilhanda/csc316-A3/main/Globe_Final_Demo.webp)

## Features
- **Interactive 3D Globe:** Smooth dragging and multi-axis rotation using quaternion-based math.
- **Land-Restricted Data:** 1,200 data points (200 real PA records, 1,000 synthetic global records) mathematically verified to reside on landmasses only.
- **Semantic Zooming:** Dynamic scaling of point radii during zoom-in to maintain visual clarity.
- **Categorical Filtering:** Toggle visibility for EMS, Traffic, Fire, and other emergency types.
- **Details-on-Demand:** Interactive tooltips displaying timestamp, township, and specific emergency titles.
- **Optimized Performance:** Preprocessed dataset ensures a lag-free 60fps experience even on mobile browsers.

## Design Decisions
- **Projection:** Replaced the flat Mercator map with a `d3.geoOrthographic` projection for a more engaging, global context.
- **Data Sampling:** The original 123MB dataset was sampled down to 1,200 points to ensure instant loading and smooth interaction while retaining a representative geographic spread.
- **Land Verification:** Used `geopandas` and `shapely` with Natural Earth shapefiles to prevent "sea-based" 911 calls, ensuring all synthetic points fall on continents.
- **Aesthetics:** Implemented a sleek dark mode theme with semi-transparent points and graticules to emphasize the data.

## Installation & Local Development
1. Clone the repository:
   ```bash
   git clone https://github.com/sahilhanda/csc316-A3.git
   cd csc316-A3
   ```
2. Start a local web server:
   ```bash
   python3 -m http.server
   ```
3. Open your browser to `http://localhost:8000`.

## Preprocessing (Internal)
If you wish to regenerate the data subset:
1. Ensure you have the dependencies: `pip install pandas geopandas shapely fiona`.
2. Run the script: `python3 scripts/preprocess.py`.

## Built With
- [D3.js v7](https://d3js.org/)
- [TopoJSON](https://github.com/topojson/topojson)
- [Natural Earth Data](https://www.naturalearthdata.com/)
