# CSC316 A3 Write-up: 911 Pulse (Interactive Regional Story Globe)

## 1) Design Rationale

### Project goal
The goal of this visualization is to help viewers understand how emergency response pressure changes across North American regions over time.  
Rather than showing every individual call, the design emphasizes regional patterns and seasonal shifts that are easier to compare and narrate.

### Why this encoding
I chose a region-level choropleth on a globe because the assignment emphasizes interaction and storytelling over exhaustive detail.  
Mapping dominant emergency type per state/province creates a clean first read (what is most common here now?), and the tooltip provides deeper detail on demand.

Core visual choices:
- **Region color:** Dominant emergency category (`EMS`, `Traffic`, `Fire`, `Other`)
- **Temporal control:** Month slider + autoplay story mode
- **Context:** Orthographic globe for geographic framing and engagement
- **Detail layer:** Tooltip with aggregate counts and a top story report

This supports a clear interaction hierarchy:
1) Scan the map for broad category patterns  
2) Play through months to see shifts  
3) Hover a region for precise detail and narrative context

### Interaction and animation decisions

I included multiple interaction techniques required by the assignment:
- **Direct manipulation:** Drag to rotate the globe, scroll to zoom
- **Dynamic queries:** Month slider and chapter shortcuts to focus on time windows
- **Details on demand:** Hover tooltips with aggregate metrics
- **Animation storytelling:** Play mode transitions month-by-month to show change

The autoplay mode acts like a guided narrative while still allowing free exploration.  
This balance was intentional: users can watch the story passively, then pause and inspect individual regions.

### Alternatives considered

I considered and partially prototyped:
- **Individual call points:** Rich detail, but visually noisy and hard to interact with at scale
- **Flat map projection:** Easier geometry, but less engaging for narrative presentation
- **Continuous gradient by total volume:** Good for magnitude, weaker at showing categorical “type” shifts

I moved to region-level dominant category encoding because it better communicates changing emergency “purpose” over time, which aligns with the story objective.

### Design trade-offs

- **Pros:** Cleaner visual, stronger storytelling arc, easier interaction targets
- **Cons:** Loses exact per-event granularity on first view

To address this, I added aggregate metrics and a report-like tooltip so users can still access richer details without cluttering the base view.

---

## 2) Development Process

### Workflow summary
I developed iteratively in four phases:
1. Built the core globe and loading pipeline  
2. Added region boundaries, aggregation logic, and tooltip detail  
3. Added story controls, monthly animation, and coordinated KPI/chart updates  
4. Polished visual design, theming, and interaction stability

A key part of development was debugging geometry and projection edge cases (especially multipolygon behavior near the antimeridian), then refining visual clarity so hover targets were reliable and easy to understand.

### Time spent (people-hours)
Approximate total: **[fill in actual hours, e.g., 18-24 hours]**
- Data prep and aggregation design: **[x]**
- Visualization implementation in D3: **[x]**
- Interaction/animation and UI polish: **[x]**
- Debugging and testing: **[x]**
- Write-up and documentation: **[x]**

### Use of LLM assistance
I used an LLM as a coding assistant for:
- drafting/refining D3 interaction code
- diagnosing rendering and geometry issues
- iterating on visual design and structure
- improving documentation clarity

I still had to evaluate and adjust generated code substantially, especially where behavior depended on projection math, SVG fill behavior, and browser/runtime details.

### What took the most time
- Stabilizing region geometry rendering and hit testing
- Preventing malformed region fill artifacts
- Tuning story transitions so monthly category shifts were visible but not chaotic
- Aligning UI clarity (legend, tooltip, KPIs, chapters) with narrative goals

---

## 3) Sources and Acknowledgments

- Data source: [Montgomery County 911 Calls (Kaggle)](https://www.kaggle.com/datasets/mchirico/montcoalert)
- Geography:
  - US states GeoJSON
  - Canada provinces GeoJSON
  - Mexico states GeoJSON
  - `countries-110m.json` for base globe context
- Libraries:
  - [D3.js v7](https://d3js.org/)
  - [TopoJSON Client](https://github.com/topojson/topojson-client)

These acknowledgments are included in both this write-up and on the visualization UI.
