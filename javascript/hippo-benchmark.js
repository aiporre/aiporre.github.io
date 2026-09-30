/*
 * Animated summary of "Benchmarking Geometric Deep Learning for Hippocampal
 * Shape Analysis" (ECML PKDD 2026). Five scenes: input mesh -> GDL models ->
 * metric-learning embedding -> retrieval results -> normative modeling.
 * A rotating 3D hippocampus is drawn on a canvas; everything else is SVG
 * animated with CSS transitions on transform/opacity.
 */
(function () {
    var root = document.getElementById("hb");
    if (!root) return;

    var NS = "http://www.w3.org/2000/svg";
    var W = 800, H = 450;
    var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // ---------- data from the paper ----------
    var FAMILIES = [
        { name: "Mesh", models: ["MoNet", "GCNN", "SplineCNN", "SpiralNet++"] },
        { name: "Point cloud", models: ["PointNet", "PointNet++", "PointTrans"] },
        { name: "Graph", models: ["GCN", "GCN-DenseNet"] },
        { name: "Other", models: ["MVCNN", "3DMask-CNN", "S2CNN"] }
    ];
    var P_AT_1 = [
        ["MoNet", 63.37], ["PointTrans", 63.09], ["S2CNN", 56.09], ["PointNet++", 53.56],
        ["SplineCNN", 52.88], ["GCN", 50.52], ["GCNN", 48.87], ["GCN-DenseNet", 47.08],
        ["3DMask-CNN", 46.53], ["Spiral++", 44.53], ["MVCNN", 44.20], ["PointNet", 43.06]
    ];
    var SCENES = [
        { label: "Mesh", dur: 5200, mesh: { x: 0.66, y: 0.52, s: 0.27, a: 1 },
          text: "<b>Input.</b> 17,324 left-hippocampus surface meshes from 1,854 ADNI subjects, segmented from T1 MRI and resampled to 3,000 vertices." },
        { label: "Models", dur: 5600, mesh: { x: 0.125, y: 0.5, s: 0.1, a: 1 },
          text: "<b>12 models, one protocol.</b> Mesh, point-cloud, graph, multi-view, volumetric and spherical networks, each configured by the same hyperparameter search." },
        { label: "Embedding", dur: 5200, mesh: { x: 0.125, y: 0.5, s: 0.1, a: 0 },
          text: "<b>Metric learning.</b> A SoftTriple loss maps every shape to an embedding in which subjects with the same diagnosis cluster together." },
        { label: "Retrieval", dur: 6000, mesh: { x: 0.125, y: 0.5, s: 0.1, a: 0 },
          text: "<b>Benchmark.</b> MoNet and Point Transformer build the best local neighbourhoods (P@1); S2CNN leads the global metrics (mAP@R, R-Precision)." },
        { label: "Normative", dur: 7000, mesh: { x: 0.125, y: 0.5, s: 0.1, a: 0 },
          text: "<b>Toward biomarkers.</b> Normative models per embedding dimension yield a total outlier count (tOC) associated with MMSE, APOE-4 and CSF &beta;-amyloid, separating HC from AD (|d| = 0.55)." }
    ];

    // ---------- helpers ----------
    function el(name, attrs, parent) {
        var e = document.createElementNS(NS, name);
        for (var k in attrs) e.setAttribute(k, attrs[k]);
        if (parent) parent.appendChild(e);
        return e;
    }
    function txt(parent, x, y, s, cls, extra) {
        var t = el("text", Object.assign({ x: x, y: y, "class": cls || "" }, extra || {}), parent);
        t.textContent = s;
        return t;
    }
    function rng(seed) { // mulberry32
        return function () {
            seed |= 0; seed = seed + 0x6D2B79F5 | 0;
            var t = Math.imul(seed ^ seed >>> 15, 1 | seed);
            t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
            return ((t ^ t >>> 14) >>> 0) / 4294967296;
        };
    }
    function gauss(r) {
        var u = 1 - r(), v = r();
        return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
    }
    function delay(node, ms) { node.style.setProperty("--d", ms + "ms"); return node; }

    // ---------- DOM skeleton ----------
    var stage = root.querySelector(".hb-stage");
    var canvas = document.createElement("canvas");
    canvas.className = "hb-canvas";
    canvas.setAttribute("aria-hidden", "true");
    stage.appendChild(canvas);
    var svg = el("svg", { viewBox: "0 0 " + W + " " + H, "class": "hb-svg", "aria-hidden": "true" }, stage);
    var caption = root.querySelector(".hb-caption");
    var stepsBox = root.querySelector(".hb-steps");
    var playBtn = root.querySelector(".hb-play");

    var sceneGroups = SCENES.map(function (_, i) {
        return el("g", { "class": "hb-scene", "data-i": i }, svg);
    });

    // ---------- scene 1: input stats ----------
    (function (g) {
        [["17,324", "hippocampal meshes"], ["1,854", "ADNI subjects"], ["3,000", "vertices per mesh"]]
            .forEach(function (s, i) {
                var y = 150 + i * 95;
                var grp = delay(el("g", { "class": "hb-in" }, g), 150 + i * 220);
                txt(grp, 60, y, s[0], "hb-big");
                txt(grp, 62, y + 26, s[1], "hb-small");
            });
        var tag = delay(el("g", { "class": "hb-in" }, g), 900);
        txt(tag, 770, 38, "left hippocampus · subject space", "hb-tiny", { "text-anchor": "end" });
    })(sceneGroups[0]);

    // ---------- scene 2: model zoo ----------
    (function (g) {
        var flow = el("path", { d: "M176 225 L 218 225", "class": "hb-flow" }, g);
        delay(flow, 0);
        var box = delay(el("g", { "class": "hb-in hb-psi" }, g), 150);
        el("rect", { x: 222, y: 180, width: 90, height: 90, rx: 16, "class": "hb-box" }, box);
        txt(box, 267, 240, "Ψ", "hb-psi-t", { "text-anchor": "middle" });
        txt(box, 267, 296, "shape encoder", "hb-tiny", { "text-anchor": "middle" });

        var rowY = [110, 190, 270, 350], k = 0;
        FAMILIES.forEach(function (f, r) {
            var y = rowY[r];
            delay(el("path", { d: "M312 225 C 330 225, 330 " + y + ", 348 " + y, "class": "hb-fan hb-in" }, g), 300 + r * 80);
            var lab = delay(el("g", { "class": "hb-in" }, g), 350 + r * 80);
            txt(lab, 356, y + 4, f.name.toUpperCase(), "hb-fam");
            var x = 450;
            f.models.forEach(function (m) {
                var w = m.length * 7 + 22;
                var chip = delay(el("g", { "class": "hb-chip" }, g), 600 + k * 140);
                el("rect", { x: x, y: y - 14, width: w, height: 28, rx: 14 }, chip);
                txt(chip, x + w / 2, y + 4.5, m, "", { "text-anchor": "middle" });
                x += w + 8; k++;
            });
        });
    })(sceneGroups[1]);

    // ---------- scene 3: embedding space ----------
    var dots = [];
    (function (g) {
        var r = rng(7);
        var frame = el("g", { "class": "hb-in" }, g);
        el("rect", { x: 40, y: 40, width: 500, height: 370, rx: 18, "class": "hb-panel" }, frame);
        txt(frame, 60, 68, "embedding space  ℝᵈ", "hb-tiny");
        var centers = { hc: [175, 165], mci: [300, 300], ad: [430, 170] };
        var spread = { hc: 34, mci: 46, ad: 34 };
        ["hc", "mci", "ad"].forEach(function (c) {
            for (var i = 0; i < 34; i++) {
                var tx = centers[c][0] + gauss(r) * spread[c], ty = centers[c][1] + gauss(r) * spread[c];
                tx = Math.max(55, Math.min(525, tx)); ty = Math.max(85, Math.min(395, ty));
                var d = el("circle", { r: 5, cx: 0, cy: 0, "class": "hb-dot hb-" + c }, g);
                d._a = [60 + r() * 460, 90 + r() * 300];
                d._b = [tx, ty];
                d.style.transitionDelay = Math.round(r() * 400) + "ms";
                dots.push(d);
            }
        });
        var legend = delay(el("g", { "class": "hb-in" }, g), 400);
        [["hc", "Healthy control"], ["mci", "MCI"], ["ad", "Alzheimer's disease"]].forEach(function (l, i) {
            el("circle", { cx: 585, cy: 150 + i * 40, r: 7, "class": "hb-" + l[0] }, legend);
            txt(legend, 602, 155 + i * 40, l[1], "hb-small");
        });
        var note = delay(el("g", { "class": "hb-in" }, g), 900);
        txt(note, 575, 300, "pull together → same diagnosis", "hb-tiny");
        txt(note, 575, 322, "push apart → different diagnosis", "hb-tiny");
    })(sceneGroups[2]);

    function placeDots(clustered, animate) {
        dots.forEach(function (d) {
            var p = clustered ? d._b : d._a;
            if (!animate) d.style.transition = "none";
            d.style.transform = "translate(" + p[0] + "px," + p[1] + "px)";
        });
        if (!animate) {
            svg.getBoundingClientRect(); // flush
            dots.forEach(function (d) { d.style.transition = ""; });
        }
    }
    placeDots(false, false);

    // ---------- scene 4: P@1 bars ----------
    (function (g) {
        var x0 = 150, maxW = 470, lo = 40, hi = 65, top = 58, rowH = 29;
        var head = el("g", { "class": "hb-in" }, g);
        txt(head, x0, 36, "Precision@1 (%) · soft-loss · mean of 5 splits", "hb-tiny");
        [40, 50, 60].forEach(function (v) {
            var x = x0 + (v - lo) / (hi - lo) * maxW;
            el("line", { x1: x, x2: x, y1: 46, y2: top + rowH * 12, "class": "hb-grid" }, head);
            txt(head, x, top + rowH * 12 + 16, v, "hb-tiny", { "text-anchor": "middle" });
        });
        P_AT_1.forEach(function (row, i) {
            var y = top + i * rowH, w = (row[1] - lo) / (hi - lo) * maxW;
            var lab = delay(el("g", { "class": "hb-in" }, g), 80 + i * 70);
            txt(lab, x0 - 10, y + 15, row[0], "hb-bar-l" + (i < 2 ? " hb-strong" : ""), { "text-anchor": "end" });
            delay(el("rect", { x: x0, y: y + 3, width: w, height: 17, rx: 5, "class": "hb-bar" + (i < 2 ? " hb-top" : "") }, g), 120 + i * 70);
            delay(txt(g, x0 + w + 8, y + 16, row[1].toFixed(1), "hb-val hb-in" + (i < 2 ? " hb-strong" : "")), 700 + i * 70);
        });
    })(sceneGroups[3]);

    // ---------- scene 5: normative modeling ----------
    var tocText;
    (function (g) {
        var zs = [0.4, 2.45, -0.8, -2.3, 1.1];
        var x0 = 50, w = 270, zmin = -3.5, zmax = 3.5;
        function zx(z) { return x0 + (z - zmin) / (zmax - zmin) * w; }
        var head = el("g", { "class": "hb-in" }, g);
        txt(head, x0, 38, "normative model per embedding dimension", "hb-tiny");
        zs.forEach(function (z, i) {
            var base = 100 + i * 68;
            var grp = delay(el("g", { "class": "hb-in" }, g), 100 + i * 90);
            var band = "M" + zx(-1.96) + " " + base;
            var curve = "";
            for (var s = 0; s <= 60; s++) {
                var zz = zmin + (zmax - zmin) * s / 60;
                var yy = base - 40 * Math.exp(-zz * zz / 2);
                curve += (s ? " L" : "M") + zx(zz).toFixed(1) + " " + yy.toFixed(1);
                if (zz >= -1.96 && zz <= 1.96) band += " L" + zx(zz).toFixed(1) + " " + yy.toFixed(1);
            }
            band += " L" + zx(1.96) + " " + base + " Z";
            el("path", { d: band, "class": "hb-band" }, grp);
            el("path", { d: curve, "class": "hb-curve" }, grp);
            el("line", { x1: x0, x2: x0 + w, y1: base, y2: base, "class": "hb-axis" }, grp);
            txt(grp, x0 - 8, base - 4, "v" + "₁₂₃₄₅"[i], "hb-tiny", { "text-anchor": "end" });
            var out = Math.abs(z) > 1.96;
            var drop = delay(el("g", { "class": "hb-drop" + (out ? " hb-outlier" : "") }, g), 900 + i * 380);
            drop.style.setProperty("--d2", (900 + i * 380 + 420) + "ms");
            el("line", { x1: zx(z), x2: zx(z), y1: base - 26, y2: base, "class": "hb-stem" }, drop);
            el("circle", { cx: zx(z), cy: base - 28, r: 6.5, "class": "hb-mark" }, drop);
        });
        var foot = delay(el("g", { "class": "hb-in" }, g), 600);
        txt(foot, x0 + w / 2, 440, "shaded: |z| < 1.96", "hb-tiny", { "text-anchor": "middle" });

        // tOC counter
        var cnt = delay(el("g", { "class": "hb-in" }, g), 800);
        el("path", { d: "M332 250 L 368 250", "class": "hb-flow" }, cnt);
        el("rect", { x: 372, y: 216, width: 82, height: 68, rx: 14, "class": "hb-box" }, cnt);
        txt(cnt, 413, 242, "tOC", "hb-tiny", { "text-anchor": "middle" });
        tocText = txt(cnt, 413, 272, "0", "hb-count", { "text-anchor": "middle" });

        // regression tOC vs MMSE
        var px = 500, py = 70, pw = 270, ph = 300;
        var plot = delay(el("g", { "class": "hb-in" }, g), 2600);
        el("line", { x1: px, x2: px + pw, y1: py + ph, y2: py + ph, "class": "hb-axis" }, plot);
        el("line", { x1: px, x2: px, y1: py, y2: py + ph, "class": "hb-axis" }, plot);
        txt(plot, px + pw, py + ph + 22, "tOC →", "hb-tiny", { "text-anchor": "end" });
        txt(plot, px - 8, py + 8, "MMSE", "hb-tiny", { "text-anchor": "end", transform: "rotate(-90 " + (px - 14) + " " + (py + 30) + ")" });
        var r = rng(11);
        for (var i = 0; i < 46; i++) {
            var t = r(), yv = 0.25 + 0.5 * t + gauss(r) * 0.13;
            yv = Math.max(0.04, Math.min(0.96, yv));
            delay(el("circle", { cx: px + 12 + t * (pw - 24), cy: py + yv * ph, r: 4, "class": "hb-pt hb-in" }, g), 2700 + i * 22);
        }
        var line = delay(el("line", { x1: px + 8, y1: py + ph * 0.24, x2: px + pw - 8, y2: py + ph * 0.76, "class": "hb-reg" }, g), 3700);
        line.style.setProperty("--len", Math.hypot(pw - 16, ph * 0.52).toFixed(0));
        var lbl = delay(el("g", { "class": "hb-in" }, g), 4300);
        txt(lbl, px + pw, py - 12, "slope < 0 · p < 0.001", "hb-tiny hb-strong", { "text-anchor": "end" });
    })(sceneGroups[4]);

    // ---------- 3D hippocampus mesh ----------
    var mesh = (function () {
        function bez(t) {
            var P = [[-1.35, -0.3, 0], [0.35, -0.75, 0.15], [1.25, -0.2, -0.15], [0.85, 1.05, 0.25]];
            var u = 1 - t, a = u * u * u, b = 3 * u * u * t, c = 3 * u * t * t, d = t * t * t;
            return [0, 1, 2].map(function (k) { return a * P[0][k] + b * P[1][k] + c * P[2][k] + d * P[3][k]; });
        }
        function norm(v) { var l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; }
        function cross(a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; }
        var NT = 40, NA = 18, V = [], F = [];
        for (var i = 0; i <= NT; i++) {
            var t = i / NT, c = bez(t), c2 = bez(Math.min(1, t + 0.01)), c1 = bez(Math.max(0, t - 0.01));
            var T = norm([c2[0] - c1[0], c2[1] - c1[1], c2[2] - c1[2]]);
            var N = norm(cross(T, [0, 0, 1])), B = cross(T, N);
            var r = 0.07 + 0.42 * Math.pow(1 - t, 1.25) + 0.12 * Math.exp(-Math.pow((t - 0.14) / 0.1, 2));
            if (t < 0.13) r *= Math.sqrt(Math.max(0, 1 - Math.pow((0.13 - t) / 0.13, 2))); // rounded head
            if (t > 0.95) r *= Math.sqrt(Math.max(0, 1 - Math.pow((t - 0.95) / 0.05, 2))) * 0.9 + 0.1; // rounded tail tip
            for (var j = 0; j < NA; j++) {
                var th = j / NA * Math.PI * 2;
                var dig = 1 + 0.09 * Math.sin(t * 70) * Math.max(0, Math.sin(th)) * (t < 0.38 ? 1 : 0);
                var ca = Math.cos(th) * r * dig, sa = Math.sin(th) * r * 0.72 * dig;
                V.push([c[0] + N[0] * ca + B[0] * sa, c[1] + N[1] * ca + B[1] * sa, c[2] + N[2] * ca + B[2] * sa]);
            }
        }
        for (i = 0; i < NT; i++) for (var j2 = 0; j2 < NA; j2++) {
            var a = i * NA + j2, b = i * NA + (j2 + 1) % NA, c3 = a + NA, d = b + NA;
            F.push([a, c3, b], [b, c3, d]);
        }
        var s = bez(0), e = bez(1);
        V.push(s, e);
        var si = V.length - 2, ei = V.length - 1;
        for (j2 = 0; j2 < NA; j2++) {
            F.push([si, j2, (j2 + 1) % NA]);
            F.push([ei, NT * NA + (j2 + 1) % NA, NT * NA + j2]);
        }
        // center
        var m = [0, 0, 0];
        V.forEach(function (v) { m[0] += v[0]; m[1] += v[1]; m[2] += v[2]; });
        m = m.map(function (x) { return x / V.length; });
        V = V.map(function (v) { return [v[0] - m[0], v[1] - m[1], v[2] - m[2]]; });
        return { V: V, F: F };
    })();

    var ctx = canvas.getContext("2d");
    var colors = {};
    function hex(c) {
        c = c.trim();
        if (c[0] === "#") {
            if (c.length === 4) c = "#" + c[1] + c[1] + c[2] + c[2] + c[3] + c[3];
            return [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];
        }
        var m = c.match(/\d+/g);
        return m ? m.slice(0, 3).map(Number) : [47, 111, 219];
    }
    function readColors() {
        var cs = getComputedStyle(document.documentElement);
        colors.accent = hex(cs.getPropertyValue("--accent"));
        colors.bg = hex(cs.getPropertyValue("--bg"));
        colors.dark = colors.bg[0] + colors.bg[1] + colors.bg[2] < 300;
    }
    readColors();
    new MutationObserver(readColors).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", readColors);

    var cw = 0, ch = 0, dpr = 1;
    function resize() {
        var r = stage.getBoundingClientRect();
        dpr = Math.min(window.devicePixelRatio || 1, 2);
        cw = r.width; ch = r.height;
        canvas.width = Math.round(cw * dpr); canvas.height = Math.round(ch * dpr);
    }
    if ("ResizeObserver" in window) new ResizeObserver(resize).observe(stage);
    resize();

    var pose = Object.assign({}, SCENES[0].mesh), from = Object.assign({}, pose), to = pose, tweenStart = 0, TWEEN = 900;
    function easeOutQuint(t) { return 1 - Math.pow(1 - t, 5); }
    var angle = 0.6, lastT = 0;

    function drawMesh(now) {
        var k = Math.min(1, (now - tweenStart) / TWEEN), e = easeOutQuint(k);
        ["x", "y", "s", "a"].forEach(function (p) { pose[p] = from[p] + (to[p] - from[p]) * e; });
        if (!reduceMotion && running) angle += Math.min(50, now - lastT) * 0.00045;
        lastT = now;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, cw, ch);
        if (pose.a < 0.01) return;
        var scale = pose.s * ch, cx = pose.x * cw, cy = pose.y * ch;
        var ca = Math.cos(angle), sa = Math.sin(angle), tilt = 0.35, ct = Math.cos(tilt), st = Math.sin(tilt);
        var P = mesh.V.map(function (v) {
            var x = v[0] * ca + v[2] * sa, z = -v[0] * sa + v[2] * ca, y = v[1];
            var y2 = y * ct - z * st, z2 = y * st + z * ct;
            return [x, y2, z2];
        });
        var L = [-0.35, -0.55, 0.76], A = colors.accent, dark = colors.dark;
        var tris = [];
        mesh.F.forEach(function (f) {
            var a = P[f[0]], b = P[f[1]], c = P[f[2]];
            var ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
            var nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
            var nl = Math.hypot(nx, ny, nz) || 1;
            nx /= nl; ny /= nl; nz /= nl;
            if (nz < 0) { nx = -nx; ny = -ny; nz = -nz; }
            var lum = Math.max(0, nx * L[0] + ny * L[1] + nz * L[2]);
            tris.push({ f: f, z: a[2] + b[2] + c[2], l: lum });
        });
        tris.sort(function (p, q) { return p.z - q.z; });
        ctx.globalAlpha = pose.a;
        ctx.lineWidth = 0.6;
        ctx.lineJoin = "round";
        tris.forEach(function (t) {
            var a = P[t.f[0]], b = P[t.f[1]], c = P[t.f[2]];
            var sh = (dark ? 0.35 : 0.45) + 0.6 * t.l;
            var mix = dark ? 0.1 : 0.25;
            var r = Math.round(Math.min(255, A[0] * sh + 255 * mix * t.l)),
                g = Math.round(Math.min(255, A[1] * sh + 255 * mix * t.l)),
                bl = Math.round(Math.min(255, A[2] * sh + 255 * mix * t.l));
            ctx.beginPath();
            ctx.moveTo(cx + a[0] * scale, cy - a[1] * scale);
            ctx.lineTo(cx + b[0] * scale, cy - b[1] * scale);
            ctx.lineTo(cx + c[0] * scale, cy - c[1] * scale);
            ctx.closePath();
            ctx.fillStyle = "rgb(" + r + "," + g + "," + bl + ")";
            ctx.fill();
            ctx.strokeStyle = dark ? "rgba(255,255,255,0.14)" : "rgba(255,255,255,0.35)";
            ctx.stroke();
        });
        ctx.globalAlpha = 1;
    }

    // ---------- timeline ----------
    var current = -1, sceneStart = 0, running = !reduceMotion, visible = false, timers = [], elapsed = 0;
    var stepBtns = SCENES.map(function (s, i) {
        var b = document.createElement("button");
        b.type = "button";
        b.className = "hb-step";
        b.innerHTML = "<span class=\"hb-step-n\">" + (i + 1) + "</span><span class=\"hb-step-l\">" + s.label + "</span><span class=\"hb-bar-p\"></span>";
        b.addEventListener("click", function () { go(i); });
        stepsBox.appendChild(b);
        return b;
    });

    function later(fn, ms) { timers.push(setTimeout(fn, reduceMotion ? 0 : ms)); }

    function go(i) {
        timers.forEach(clearTimeout); timers = [];
        current = i;
        sceneStart = performance.now(); elapsed = 0;
        sceneGroups.forEach(function (g, j) {
            g.classList.toggle("on", j === i);
            if (j !== i) g.classList.remove("play");
        });
        stepBtns.forEach(function (b, j) {
            b.classList.toggle("active", j === i);
            b.classList.toggle("done", j < i);
            b.setAttribute("aria-current", j === i ? "step" : "false");
        });
        caption.innerHTML = SCENES[i].text;
        from = Object.assign({}, pose); to = SCENES[i].mesh; tweenStart = performance.now();

        if (i === 2) placeDots(false, false);
        if (i === 4) tocText.textContent = "0";
        // next frame: start the scene's inner transitions
        requestAnimationFrame(function () {
            requestAnimationFrame(function () {
                sceneGroups[i].classList.add("play");
                if (i === 2) later(function () { placeDots(true, true); }, 350);
                if (i === 4) {
                    later(function () { tocText.textContent = "1"; }, 900 + 1 * 380 + 420);
                    later(function () { tocText.textContent = "2"; }, 900 + 3 * 380 + 420);
                }
            });
        });
        updateProgress();
    }

    function updateProgress() {
        stepBtns.forEach(function (b, j) {
            var p = j < current ? 1 : j === current ? Math.min(1, elapsed / SCENES[j].dur) : 0;
            b.style.setProperty("--p", p);
        });
    }

    function setRunning(r) {
        running = r;
        playBtn.setAttribute("aria-pressed", r ? "false" : "true");
        playBtn.setAttribute("aria-label", r ? "Pause animation" : "Play animation");
        playBtn.classList.toggle("paused", !r);
        if (r) sceneStart = performance.now() - elapsed;
    }
    playBtn.addEventListener("click", function () { setRunning(!running); });

    var prev = 0;
    function loop(now) {
        requestAnimationFrame(loop);
        if (!visible || document.hidden) { prev = now; return; }
        if (running) {
            elapsed += Math.min(100, now - (prev || now));
            if (elapsed >= SCENES[current].dur) go((current + 1) % SCENES.length);
            updateProgress();
        }
        prev = now;
        drawMesh(now);
    }

    if ("IntersectionObserver" in window) {
        new IntersectionObserver(function (es) {
            visible = es[0].isIntersecting;
        }, { threshold: 0.2 }).observe(stage);
    } else visible = true;

    root.classList.add("ready");
    go(0);
    setRunning(running);
    requestAnimationFrame(loop);
})();
