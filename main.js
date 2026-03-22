const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
];

const categoryOrder = ["EMS", "Traffic", "Fire", "Other"];
const categoryColors = {
    EMS: "var(--ems-color)",
    Traffic: "var(--traffic-color)",
    Fire: "var(--fire-color)",
    Other: "var(--other-color)"
};

const monthMultipliers = [
    { EMS: 1.12, Traffic: 0.86, Fire: 1.20, Other: 1.02 }, // Jan
    { EMS: 1.10, Traffic: 0.88, Fire: 1.16, Other: 1.02 },
    { EMS: 1.04, Traffic: 0.95, Fire: 1.03, Other: 1.01 },
    { EMS: 1.00, Traffic: 1.03, Fire: 0.98, Other: 1.00 },
    { EMS: 0.98, Traffic: 1.08, Fire: 0.95, Other: 1.00 },
    { EMS: 0.96, Traffic: 1.20, Fire: 0.94, Other: 1.00 }, // Jun
    { EMS: 0.95, Traffic: 1.24, Fire: 0.96, Other: 1.01 },
    { EMS: 0.97, Traffic: 1.17, Fire: 1.01, Other: 1.02 },
    { EMS: 1.02, Traffic: 1.04, Fire: 1.12, Other: 1.03 }, // Sep
    { EMS: 1.04, Traffic: 0.98, Fire: 1.18, Other: 1.04 },
    { EMS: 1.08, Traffic: 0.92, Fire: 1.16, Other: 1.03 },
    { EMS: 1.13, Traffic: 0.88, Fire: 1.21, Other: 1.03 }  // Dec
];

const themes = {
    night: { bg: "#111827", water: "#0b1220", land: "#1f2937", icon: "☀️", label: "Day" },
    day: { bg: "#e8f4f8", water: "#b3d9f5", land: "#dbe3ed", icon: "🌙", label: "Night" }
};

const geoSources = [
    { country: "United States", path: "data/us-states.geojson" },
    { country: "Canada", path: "data/canada-provinces.geojson" },
    { country: "Mexico", path: "data/mexico-states.geojson" }
];

const container = d3.select("#map-container");
let width = container.node().clientWidth;
let height = container.node().clientHeight;
let isDayMode = false;
let activeMonth = 0;
let playTimer = null;
let syntheticSeed = 316;
let baseScale = Math.min(width, height) * 0.43;
let currentZoomK = 1;

const svg = container.append("svg").attr("width", width).attr("height", height);
const bgRect = svg.append("rect").attr("width", width).attr("height", height).attr("fill", themes.night.bg);
const globeLayer = svg.append("g").attr("class", "globe-layer");
const regionLayer = svg.append("g").attr("class", "regions-layer");

const tooltip = d3.select("#tooltip");
const loading = d3.select("#loading");
const monthSlider = d3.select("#month-slider");
const monthLabel = d3.select("#month-label");
const storyCaption = d3.select("#story-caption");
const playBtn = d3.select("#play-story");
const pauseBtn = d3.select("#pause-story");
const chapterButtons = d3.selectAll(".chapter-btn");
const barsSvg = d3.select("#category-bars");
const kpiTotal = d3.select("#kpi-total-calls");
const kpiTopRegion = d3.select("#kpi-top-region");
const kpiDominant = d3.select("#kpi-dominant");

let projection = d3.geoOrthographic()
    .scale(baseScale)
    .translate([width / 2, height / 2])
    .clipAngle(90)
    .precision(0.1)
    .rotate([98, -40, 0]);
let geoPath = d3.geoPath(projection);

let worldCountries = [];
let combinedFeatures = [];
let regionAggregates = new Map();

function mulberry32(seed) {
    let t = seed >>> 0;
    return function random() {
        t += 0x6D2B79F5;
        let x = Math.imul(t ^ (t >>> 15), 1 | t);
        x ^= x + Math.imul(x ^ (x >>> 7), 61 | x);
        return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
    };
}

function normalizeLongitude(lon) {
    // Clamp out-of-range coordinates to the dateline instead of wrapping.
    // Wrapping (e.g. -188 -> +172) can create globe-spanning polygons.
    return Math.max(-179.999, Math.min(179.999, lon));
}

function sanitizeCoordinates(coords) {
    if (typeof coords[0] === "number") return [normalizeLongitude(coords[0]), coords[1]];
    return coords.map(sanitizeCoordinates);
}

function sanitizeFeatureGeometry(feature) {
    if (feature?.geometry?.coordinates) {
        feature.geometry.coordinates = sanitizeCoordinates(feature.geometry.coordinates);
    }
    return feature;
}

function reverseRingSet(coords) {
    if (typeof coords[0][0] === "number") {
        return [...coords].reverse();
    }
    return coords.map(reverseRingSet);
}

function fixInvertedFeature(feature) {
    // Some source multipolygons around the antimeridian can render as "inverse fill"
    // (covering almost the whole globe). Flip ring order when detected.
    const area = d3.geoArea(feature);
    if (area > 2 * Math.PI && feature?.geometry?.coordinates) {
        feature.geometry.coordinates = reverseRingSet(feature.geometry.coordinates);
    }
    return feature;
}

function normalizeRegionName(properties = {}) {
    return properties.name || properties.NAME_1 || properties.shapeName || properties.nom || properties.region || properties.admin || "Unknown";
}

function dominantCategory(counts) {
    return categoryOrder.map(key => [key, counts[key] || 0]).sort((a, b) => d3.descending(a[1], b[1]))[0][0];
}

function storyTemplate(category, random) {
    const samples = {
        EMS: ["Cardiac emergency response surge in dense residential corridors.", "Respiratory distress cluster with multi-unit dispatch support.", "Heat/cold exposure incidents increased near commuter hubs."],
        Traffic: ["Chain-collision wave along intercity routes during peak movement.", "Major disabled-vehicle incidents created cascading delays.", "Intersection crash volume climbed across arterial roads."],
        Fire: ["Structure fire calls spiked during severe weather patterns.", "Wildland and brush fire alerts elevated in peri-urban zones.", "Gas leak and alarm triggers required coordinated evacuations."],
        Other: ["Welfare checks rose after storm-related infrastructure outages.", "Public assistance incidents increased around large events.", "Non-fire emergency service requests rose in mixed-use districts."]
    };
    const list = samples[category] || samples.Other;
    return list[Math.floor(random() * list.length)];
}

function seasonalNarrative(month) {
    if ([11, 0, 1].includes(month)) return "Winter period: higher Fire and EMS urgency under weather stress.";
    if ([5, 6, 7].includes(month)) return "Summer mobility: Traffic incidents dominate many regions.";
    if ([8, 9, 10].includes(month)) return "Storm season: Fire and multi-agency events increase regionally.";
    return "Transition months: mixed emergency profiles with shifting dominant categories.";
}

function isFeatureVisible(feature) {
    const center = projection.invert([width / 2, height / 2]);
    const centroid = d3.geoCentroid(feature);
    return d3.geoDistance(center, centroid) <= Math.PI / 2;
}

function generateRegionData(features, seed) {
    const random = mulberry32(seed);
    const regionMap = new Map();
    const profiles = [
        { EMS: 0.58, Traffic: 0.2, Fire: 0.17, Other: 0.05 },
        { EMS: 0.36, Traffic: 0.47, Fire: 0.11, Other: 0.06 },
        { EMS: 0.33, Traffic: 0.24, Fire: 0.35, Other: 0.08 },
        { EMS: 0.41, Traffic: 0.25, Fire: 0.16, Other: 0.18 }
    ];
    const eventCities = ["Downtown Core", "Transit Belt", "Industrial Zone", "Suburban Corridor", "Harbor District"];

    for (const f of features) {
        const regionName = f.properties.regionName;
        const country = f.properties.country;
        const id = f.properties.regionId;
        const profile = profiles[Math.floor(random() * profiles.length)];
        const popFactor = 0.8 + random() * 2.2;
        const countryFactor = country === "United States" ? 1.22 : (country === "Mexico" ? 1.02 : 0.92);
        const baseDemand = 220 + Math.round((250 + random() * 950) * popFactor * countryFactor);

        const months = [];
        for (let m = 0; m < 12; m++) {
            const seasonWave = 0.9 + 0.2 * Math.sin((m / 12) * Math.PI * 2 + random() * 0.9);
            const volatility = 0.88 + random() * 0.3;
            const totalCalls = Math.round(baseDemand * seasonWave * volatility);
            const mul = monthMultipliers[m];
            const jitter = () => (random() - 0.5) * 0.05;

            const emsRaw = Math.max(0.05, profile.EMS * mul.EMS + jitter());
            const trafficRaw = Math.max(0.05, profile.Traffic * mul.Traffic + jitter());
            const fireRaw = Math.max(0.04, profile.Fire * mul.Fire + jitter());
            const otherRaw = Math.max(0.03, profile.Other * mul.Other + jitter());

            const norm = emsRaw + trafficRaw + fireRaw + otherRaw;
            const shares = { EMS: emsRaw / norm, Traffic: trafficRaw / norm, Fire: fireRaw / norm, Other: otherRaw / norm };
            const counts = {
                EMS: Math.round(totalCalls * shares.EMS),
                Traffic: Math.round(totalCalls * shares.Traffic),
                Fire: Math.round(totalCalls * shares.Fire)
            };
            counts.Other = Math.max(0, totalCalls - counts.EMS - counts.Traffic - counts.Fire);

            const topCategory = dominantCategory(counts);
            const reportDay = 1 + Math.floor(random() * 27);
            const reportHour = Math.floor(random() * 24);
            const story = {
                title: storyTemplate(topCategory, random),
                when: `${monthNames[m]} ${String(reportDay).padStart(2, "0")} at ${String(reportHour).padStart(2, "0")}:${random() > 0.5 ? "17" : "42"}`,
                where: `${eventCities[Math.floor(random() * eventCities.length)]}, ${regionName}`,
                note: random() > 0.5 ? "Dispatch escalated to multi-unit response after secondary alerts." : "First responders stabilized scene and coordinated regional support."
            };
            const riskIndex = (counts.EMS * 1.08 + counts.Fire * 1.35 + counts.Traffic * 0.84) / Math.max(1, totalCalls);

            months.push({ month: m, totalCalls, counts, shares, topCategory, story, riskIndex });
        }

        regionMap.set(id, { regionName, country, months });
    }
    return regionMap;
}

function updateCategoryBars(rows) {
    const totals = {
        EMS: d3.sum(rows, d => d.counts.EMS),
        Traffic: d3.sum(rows, d => d.counts.Traffic),
        Fire: d3.sum(rows, d => d.counts.Fire),
        Other: d3.sum(rows, d => d.counts.Other)
    };
    const data = categoryOrder.map(cat => ({ category: cat, value: totals[cat] }));

    const widthBar = 320;
    const heightBar = 120;
    const margin = { top: 10, right: 8, bottom: 26, left: 32 };
    const innerW = widthBar - margin.left - margin.right;
    const innerH = heightBar - margin.top - margin.bottom;
    const x = d3.scaleBand().domain(categoryOrder).range([0, innerW]).padding(0.25);
    const y = d3.scaleLinear().domain([0, d3.max(data, d => d.value) || 1]).nice().range([innerH, 0]);

    const root = barsSvg.selectAll("g.root").data([null]).join("g")
        .attr("class", "root")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    root.selectAll("g.y-axis")
        .data([null]).join("g")
        .attr("class", "y-axis")
        .call(d3.axisLeft(y).ticks(3).tickSizeOuter(0))
        .call(g => g.selectAll("text").attr("fill", "var(--text-secondary)").attr("font-size", 10))
        .call(g => g.selectAll("line,path").attr("stroke", "var(--border)"));

    root.selectAll("g.x-axis")
        .data([null]).join("g")
        .attr("class", "x-axis")
        .attr("transform", `translate(0,${innerH})`)
        .call(d3.axisBottom(x).tickSizeOuter(0))
        .call(g => g.selectAll("text").attr("fill", "var(--text-secondary)").attr("font-size", 10))
        .call(g => g.selectAll("line,path").attr("stroke", "var(--border)"));

    root.selectAll("rect.category-bar")
        .data(data, d => d.category)
        .join(
            enter => enter.append("rect")
                .attr("class", "category-bar")
                .attr("x", d => x(d.category))
                .attr("width", x.bandwidth())
                .attr("y", innerH)
                .attr("height", 0)
                .attr("fill", d => categoryColors[d.category])
                .call(sel => sel.transition().duration(300).attr("y", d => y(d.value)).attr("height", d => innerH - y(d.value))),
            update => update.call(sel => sel.transition().duration(300).attr("x", d => x(d.category)).attr("width", x.bandwidth()).attr("y", d => y(d.value)).attr("height", d => innerH - y(d.value)))
        );
}

function monthRows() {
    return combinedFeatures.map(f => {
        const region = regionAggregates.get(f.properties.regionId);
        return {
            ...region.months[activeMonth],
            regionName: region.regionName,
            country: region.country,
            regionId: f.properties.regionId,
            feature: f
        };
    });
}

function redrawGlobeGeometry() {
    globeLayer.selectAll("path").attr("d", geoPath);
    regionLayer.selectAll("path.region")
        .attr("d", geoPath)
        .style("display", d => isFeatureVisible(d) ? "block" : "none");
}

function updateKpis(rows) {
    const monthlyTotal = d3.sum(rows, d => d.totalCalls);
    const visibleRows = rows.filter(d => isFeatureVisible(d.feature));
    const topRegion = [...visibleRows].sort((a, b) => d3.descending(a.totalCalls, b.totalCalls))[0] || [...rows].sort((a, b) => d3.descending(a.totalCalls, b.totalCalls))[0];
    const categoryTotals = {
        EMS: d3.sum(rows, d => d.counts.EMS),
        Traffic: d3.sum(rows, d => d.counts.Traffic),
        Fire: d3.sum(rows, d => d.counts.Fire),
        Other: d3.sum(rows, d => d.counts.Other)
    };
    const topCategory = dominantCategory(categoryTotals);
    kpiTotal.text(monthlyTotal.toLocaleString());
    kpiTopRegion.text(topRegion ? `${topRegion.regionName} (${topRegion.totalCalls})` : "-");
    kpiDominant.text(`${topCategory} (${categoryTotals[topCategory].toLocaleString()})`);
}

function updateMap() {
    const rows = monthRows();
    const rowsById = new Map(rows.map(r => [r.regionId, r]));

    regionLayer.selectAll("path.region")
        .data(combinedFeatures, d => d.properties.regionId)
        .transition()
        .duration(450)
        .attr("fill", d => {
            const row = rowsById.get(d.properties.regionId);
            return categoryColors[row.topCategory];
        })
        .attr("opacity", 0.92);

    monthLabel.text(monthNames[activeMonth]);
    storyCaption.text(seasonalNarrative(activeMonth));
    updateCategoryBars(rows);
    updateKpis(rows);
}

function handleRegionHover(event, feature) {
    if (!isFeatureVisible(feature)) return;
    const region = regionAggregates.get(feature.properties.regionId);
    const monthData = region.months[activeMonth];
    tooltip.select("#tt-category").text(monthData.topCategory).attr("class", `tag ${monthData.topCategory.toLowerCase()}`);
    tooltip.select("#tt-title").text(`${region.regionName}, ${region.country}`);
    tooltip.select("#tt-total").text(monthData.totalCalls.toLocaleString());
    tooltip.select("#tt-breakdown").text(`${monthData.counts.EMS} / ${monthData.counts.Traffic} / ${monthData.counts.Fire}`);
    tooltip.select("#tt-risk").text((monthData.riskIndex * 100).toFixed(1));
    tooltip.select("#tt-report-title").text(monthData.story.title);
    tooltip.select("#tt-report-time").text(monthData.story.when);
    tooltip.select("#tt-report-location").text(monthData.story.where);
    tooltip.select("#tt-report-note").text(monthData.story.note);
    tooltip.classed("hidden", false).style("border-color", categoryColors[monthData.topCategory]);

    const node = tooltip.node();
    let x = event.pageX + 14;
    let y = event.pageY + 14;
    if (x + node.offsetWidth > window.innerWidth) x = event.pageX - node.offsetWidth - 16;
    if (y + node.offsetHeight > window.innerHeight) y = event.pageY - node.offsetHeight - 16;
    tooltip.style("left", `${x}px`).style("top", `${y}px`);
}

function applyTheme() {
    const theme = isDayMode ? themes.day : themes.night;
    document.body.classList.toggle("day-mode", isDayMode);
    bgRect.transition().duration(350).attr("fill", theme.bg);
    globeLayer.select(".water").transition().duration(350).attr("fill", theme.water);
    globeLayer.selectAll(".world-land").transition().duration(350).attr("fill", theme.land);
    document.getElementById("theme-icon").textContent = theme.icon;
    document.getElementById("theme-label").textContent = theme.label;
}

function setActiveChapter(month) {
    chapterButtons.classed("active", function () {
        return +this.dataset.month === month;
    });
}

function seekMonth(month) {
    activeMonth = month;
    monthSlider.property("value", month);
    if ([11, 0, 1].includes(month)) setActiveChapter(0);
    else if ([5, 6, 7].includes(month)) setActiveChapter(5);
    else setActiveChapter(9);
    updateMap();
}

function startStory() {
    if (playTimer) return;
    playTimer = setInterval(() => seekMonth((activeMonth + 1) % 12), 1400);
}

function pauseStory() {
    if (!playTimer) return;
    clearInterval(playTimer);
    playTimer = null;
}

function setupInteractions() {
    const drag = d3.drag().on("drag", event => {
        const r = projection.rotate();
        const next = [
            r[0] + event.dx * 0.25,
            Math.max(-89, Math.min(89, r[1] - event.dy * 0.25)),
            r[2]
        ];
        projection.rotate(next);
        redrawGlobeGeometry();
    });

    const zoom = d3.zoom()
        .scaleExtent([0.8, 3])
        .on("zoom", event => {
            currentZoomK = event.transform.k;
            projection.scale(baseScale * currentZoomK);
            redrawGlobeGeometry();
        });

    svg.call(drag);
    svg.call(zoom).on("dblclick.zoom", null);
}

function renderBaseGlobe() {
    globeLayer.selectAll("*").remove();
    globeLayer.append("path")
        .datum({ type: "Sphere" })
        .attr("class", "water")
        .attr("d", geoPath)
        .attr("fill", themes.night.water)
        .attr("stroke", "var(--border)")
        .attr("stroke-width", 1);

    const graticule = d3.geoGraticule();
    globeLayer.append("path")
        .datum(graticule)
        .attr("class", "graticule")
        .attr("d", geoPath)
        .attr("fill", "none")
        .attr("stroke", "var(--border)")
        .attr("stroke-opacity", 0.25)
        .attr("stroke-width", 0.5);

    globeLayer.selectAll("path.world-land")
        .data(worldCountries)
        .join("path")
        .attr("class", "world-land")
        .attr("d", geoPath)
        .attr("fill", themes.night.land)
        .attr("stroke", "var(--border)")
        .attr("stroke-width", 0.45);
}

window.addEventListener("resize", () => {
    width = container.node().clientWidth;
    height = container.node().clientHeight;
    baseScale = Math.min(width, height) * 0.43;
    projection.translate([width / 2, height / 2]).scale(baseScale * currentZoomK);
    svg.attr("width", width).attr("height", height);
    bgRect.attr("width", width).attr("height", height);
    redrawGlobeGeometry();
});

Promise.all([
    d3.json("countries-110m.json"),
    ...geoSources.map(src => d3.json(src.path).then(fc => ({ src, fc })))
]).then(([world, ...regionSources]) => {
    worldCountries = topojson.feature(world, world.objects.countries).features;

    combinedFeatures = regionSources.flatMap(({ src, fc }) =>
        fc.features.map(feature => {
            sanitizeFeatureGeometry(feature);
            fixInvertedFeature(feature);
            const regionName = normalizeRegionName(feature.properties);
            const regionId = `${src.country}:${regionName}`;
            feature.properties = { ...feature.properties, country: src.country, regionName, regionId };
            return feature;
        })
    );

    renderBaseGlobe();
    regionLayer.selectAll("path.region")
        .data(combinedFeatures, d => d.properties.regionId)
        .join("path")
        .attr("class", "region")
        .attr("d", geoPath)
        .attr("stroke-linejoin", "round")
        .on("mousemove", handleRegionHover)
        .on("mouseleave", () => tooltip.classed("hidden", true));

    regionAggregates = generateRegionData(combinedFeatures, syntheticSeed);
    setupInteractions();
    seekMonth(0);
    redrawGlobeGeometry();

    loading.style("opacity", 0);
    setTimeout(() => loading.style("display", "none"), 450);
}).catch(err => {
    console.error(err);
    loading.select("p").text("Failed to load local globe/region boundaries.").style("color", "red");
});

d3.select("#theme-toggle").on("click", () => {
    isDayMode = !isDayMode;
    applyTheme();
});

monthSlider.on("input", function () {
    pauseStory();
    seekMonth(+this.value);
});

playBtn.on("click", startStory);
pauseBtn.on("click", pauseStory);
chapterButtons.on("click", function () {
    pauseStory();
    seekMonth(+this.dataset.month);
});
