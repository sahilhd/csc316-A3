// Set up map container dimensions
const container = d3.select("#map-container");
let width = container.node().clientWidth;
let height = container.node().clientHeight;

// Append SVG
const svg = container.append("svg")
    .attr("width", width)
    .attr("height", height);

// Add a background rect to capture zoom and drag events
svg.append("rect")
    .attr("width", width)
    .attr("height", height)
    .attr("fill", "var(--bg-color)");

// The main group
const g = svg.append("g");

// Tooltip setup
const tooltip = d3.select("#tooltip");

// Color mapping based on category
const colorMap = {
    "EMS": "var(--ems-color)",
    "Traffic": "var(--traffic-color)",
    "Fire": "var(--fire-color)",
    "Other": "var(--other-color)"
};

// Filter state
const activeFilters = new Set(["EMS", "Traffic", "Fire", "Other"]);

// Handle window resize
window.addEventListener('resize', () => {
    width = container.node().clientWidth;
    height = container.node().clientHeight;
    svg.attr("width", width).attr("height", height);
    svg.select("rect").attr("width", width).attr("height", height);
});

// Globe Setup
let initialScale = Math.min(width, height) * 0.45;
const projection = d3.geoOrthographic()
    .scale(initialScale)
    .translate([width / 2, height / 2])
    .clipAngle(90) // Hides the back of the globe
    .precision(0.1);

// Initial rotation targeting PA (-75, 40)
projection.rotate([75, -40, 0]);

const path = d3.geoPath().projection(projection);

// Base radius size for dots
const baseRadius = 2.0;

// Render layers
const renderGlobe = g.append("g").attr("class", "globe-layer");
const renderPoints = g.append("g").attr("class", "points-layer");

Promise.all([
    d3.json("countries-110m.json"),
    d3.csv("911_sampled.csv")
]).then(([world, data]) => {

    // Hide loading screen
    d3.select("#loading").style("opacity", 0);
    setTimeout(() => d3.select("#loading").style("display", "none"), 500);

    // 1. Draw Globe Background (Ocean)
    renderGlobe.append("path")
        .datum({ type: "Sphere" })
        .attr("class", "water")
        .attr("d", path)
        .attr("fill", "#0f1419")
        .attr("stroke", "var(--border)")
        .attr("stroke-width", 1);

    // 2. Draw Graticule (Grid lines)
    const graticule = d3.geoGraticule();
    renderGlobe.append("path")
        .datum(graticule)
        .attr("class", "graticule")
        .attr("d", path)
        .attr("fill", "none")
        .attr("stroke", "var(--border)")
        .attr("stroke-opacity", 0.3)
        .attr("stroke-width", 0.5);

    // 3. Draw Land
    const countries = topojson.feature(world, world.objects.countries).features;
    renderGlobe.selectAll(".country")
        .data(countries)
        .enter().append("path")
        .attr("class", "country")
        .attr("d", path)
        .attr("fill", "#22272e") // slightly lighter than ocean
        .attr("stroke", "var(--border)")
        .attr("stroke-width", 0.5);

    // 4. Parse and Draw Points
    data.forEach(d => {
        d.lat = +d.lat;
        d.lng = +d.lng;
    });
    const validData = data.filter(d => !isNaN(d.lat) && !isNaN(d.lng));

    const points = renderPoints.selectAll("circle")
        .data(validData)
        .enter()
        .append("circle")
        .attr("r", baseRadius)
        .attr("fill", d => colorMap[d.category] || colorMap["Other"])
        .attr("class", d => `point category-${d.category.toLowerCase()}`)
        .style("opacity", 0.5)
        .on("mouseover", handleMouseOver)
        .on("mouseout", handleMouseOut);

    // Function to calculate projected point positions and handle back-of-globe clipping
    function updatePoints() {
        points.attr("cx", d => {
            const p = projection([d.lng, d.lat]);
            return p ? p[0] : 0;
        })
            .attr("cy", d => {
                const p = projection([d.lng, d.lat]);
                return p ? p[1] : 0;
            })
            .style("display", d => {
                // Check if the point is on the front side of the globe
                const coordinate = [d.lng, d.lat];
                const p = projection(coordinate);

                if (!p) return "none";

                // To properly hide points on the back side of an orthographic projection:
                // We calculate the angular distance between the projection center and the point.
                // If the angular distance > 90 degrees, it's on the back.
                // d3.geoDistance returns radians
                const center = projection.invert([width / 2, height / 2]);
                const distance = d3.geoDistance(coordinate, center);

                return distance > Math.PI / 2 ? "none" : "block";
            });
    }

    // Initial position wrapper
    function updateGlobe() {
        renderGlobe.selectAll("path").attr("d", path);
        updatePoints();
    }
    updateGlobe();

    // 5. Drag behavior for spinning the globe
    let v0, r0, q0;

    // Custom drag handler using quaternions for smooth multi-axis rotation
    // Inspired by bl.ocks.org/mbostock/ivrr86v
    const drag = d3.drag()
        .on("start", (event) => {
            v0 = versor.cartesian(projection.invert([event.x, event.y]));
            r0 = projection.rotate();
            q0 = versor(r0);
        })
        .on("drag", (event) => {
            const v1 = versor.cartesian(projection.rotate(r0).invert([event.x, event.y]));
            const q1 = versor.multiply(q0, versor.delta(v0, v1));
            const r1 = versor.rotation(q1);
            projection.rotate(r1);
            updateGlobe();
        });

    svg.call(drag);

    // 6. Zoom behavior
    const zoom = d3.zoom()
        .scaleExtent([0.5, 20])
        .on("zoom", (event) => {
            // Update projection scale
            projection.scale(initialScale * event.transform.k);

            // Scale point radius down relative to zoom so they don't bloat
            const scaledRadius = Math.max(0.5, baseRadius / Math.sqrt(event.transform.k));
            points.attr("r", scaledRadius);

            updateGlobe();
        });

    // Bind zoom, but restrict double click to prevent conflicts
    svg.call(zoom).on("dblclick.zoom", null);

    // Optional: Start with a slight animated zoom to the data
    svg.transition()
        .duration(1500)
        .call(zoom.scaleTo, 2);

    // Setup Filtering Logic
    d3.selectAll('.category-label input').on('change', function () {
        const category = this.value;
        const isChecked = this.checked;

        if (isChecked) {
            activeFilters.add(category);
            d3.select(this.parentNode).classed("disabled", false);
        } else {
            activeFilters.delete(category);
            d3.select(this.parentNode).classed("disabled", true);
        }

        points.transition()
            .duration(300)
            .style("opacity", d => activeFilters.has(d.category) ? 0.5 : 0)
            .style("pointer-events", d => activeFilters.has(d.category) ? "all" : "none");
    });

    // Tooltip Interaction Handlers
    function handleMouseOver(event, d) {
        // Highlight logic
        const currentRadius = +d3.select(this).attr("r");
        d3.select(this)
            .transition().duration(100)
            .attr("r", currentRadius * 1.5)
            .style("opacity", 1)
            .attr("stroke", "#fff")
            .attr("stroke-width", 1);

        // Populate tooltip
        tooltip.classed("hidden", false);
        tooltip.style("border-color", colorMap[d.category] || colorMap["Other"]);

        const tag = tooltip.select("#tt-category");
        tag.text(d.category)
            .attr("class", `tag ${d.category.toLowerCase()}`);

        let displayTitle = d.title;
        if (displayTitle.includes(":")) {
            displayTitle = displayTitle.split(":")[1].trim();
        }

        tooltip.select("#tt-title").text(displayTitle);
        tooltip.select("#tt-time").text(d.timeStamp);
        tooltip.select("#tt-twp").text(d.twp || "Unknown");
        tooltip.select("#tt-zip").text(d.zip || "Unknown");

        const tooltipNode = tooltip.node();
        let posX = event.pageX + 15;
        let posY = event.pageY + 15;

        if (posX + tooltipNode.offsetWidth > window.innerWidth) {
            posX = event.pageX - tooltipNode.offsetWidth - 15;
        }
        if (posY + tooltipNode.offsetHeight > window.innerHeight) {
            posY = event.pageY - tooltipNode.offsetHeight - 15;
        }

        tooltip.style("left", `${posX}px`)
            .style("top", `${posY}px`);
    }

    function handleMouseOut(event, d) {
        // Restore styling
        const currentK = d3.zoomTransform(svg.node()).k;
        const scaledRadius = Math.max(0.5, baseRadius / Math.sqrt(currentK));

        d3.select(this)
            .transition().duration(200)
            .attr("r", scaledRadius)
            .style("opacity", 0.5)
            .attr("stroke", null);

        tooltip.classed("hidden", true);
    }

}).catch(error => {
    console.error("Error loading data: ", error);
    d3.select("#loading p").text("Error loading data. Check console.").style("color", "red");
});

// Helper library for smooth spherical dragging (Versor / Quaternions)
// Minimal implementation embedded here so it works perfectly with D3's geo rotation 
// Credits to Mike Bostock
const versor = (function () {
    const acos = Math.acos;
    const asin = Math.asin;
    const atan2 = Math.atan2;
    const cos = Math.cos;
    const max = Math.max;
    const min = Math.min;
    const PI = Math.PI;
    const sin = Math.sin;
    const sqrt = Math.sqrt;
    const radians = PI / 180;
    const degrees = 180 / PI;

    function versor(e) {
        const l = [e[0] * radians, e[1] * radians, e[2] * radians];
        const c0 = cos(l[0] / 2), s0 = sin(l[0] / 2);
        const c1 = cos(l[1] / 2), s1 = sin(l[1] / 2);
        const c2 = cos(l[2] / 2), s2 = sin(l[2] / 2);
        return [
            c0 * c1 * c2 + s0 * s1 * s2,
            s0 * c1 * c2 - c0 * s1 * s2,
            c0 * s1 * c2 + s0 * c1 * s2,
            c0 * c1 * s2 - s0 * s1 * c2
        ];
    }

    versor.cartesian = function (e) {
        const l = e[0] * radians, p = e[1] * radians, cp = cos(p);
        return [cp * cos(l), cp * sin(l), sin(p)];
    };

    versor.rotation = function (q) {
        return [
            atan2(2 * (q[0] * q[1] + q[2] * q[3]), 1 - 2 * (q[1] * q[1] + q[2] * q[2])) * degrees,
            asin(max(-1, min(1, 2 * (q[0] * q[2] - q[3] * q[1])))) * degrees,
            atan2(2 * (q[0] * q[3] + q[1] * q[2]), 1 - 2 * (q[2] * q[2] + q[3] * q[3])) * degrees
        ];
    };

    versor.multiply = function (q0, q1) {
        return [
            q0[0] * q1[0] - q0[1] * q1[1] - q0[2] * q1[2] - q0[3] * q1[3],
            q0[0] * q1[1] + q0[1] * q1[0] + q0[2] * q1[3] - q0[3] * q1[2],
            q0[0] * q1[2] - q0[1] * q1[3] + q0[2] * q1[0] + q0[3] * q1[1],
            q0[0] * q1[3] + q0[1] * q1[2] - q0[2] * q1[1] + q0[3] * q1[0]
        ];
    };

    function cross(v0, v1) {
        return [
            v0[1] * v1[2] - v0[2] * v1[1],
            v0[2] * v1[0] - v0[0] * v1[2],
            v0[0] * v1[1] - v0[1] * v1[0]
        ];
    }

    function dot(v0, v1) {
        return v0[0] * v1[0] + v0[1] * v1[1] + v0[2] * v1[2];
    }

    versor.delta = function (v0, v1) {
        const w = cross(v0, v1), l = sqrt(dot(w, w));
        if (!l) return [1, 0, 0, 0];
        const t = acos(max(-1, min(1, dot(v0, v1)))) / 2, s = sin(t);
        return [cos(t), w[0] / l * s, w[1] / l * s, w[2] / l * s];
    };

    return versor;
})();
