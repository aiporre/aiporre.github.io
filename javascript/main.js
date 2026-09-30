(function () {
    var root = document.documentElement;

    // Theme toggle
    var toggle = document.getElementById("themeToggle");
    function isDark() {
        var t = root.getAttribute("data-theme");
        if (t) return t === "dark";
        return window.matchMedia("(prefers-color-scheme: dark)").matches;
    }
    toggle.addEventListener("click", function () {
        var next = isDark() ? "light" : "dark";
        root.setAttribute("data-theme", next);
        try { localStorage.setItem("theme", next); } catch (e) {}
    });

    // Top bar border on scroll
    var bar = document.getElementById("topbar");
    function onScroll() { bar.classList.toggle("scrolled", window.scrollY > 8); }
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    // Reveal sections + highlight active nav link
    var links = {};
    document.querySelectorAll(".nav a").forEach(function (a) {
        links[a.getAttribute("href").slice(1)] = a;
    });
    if ("IntersectionObserver" in window) {
        var revealObs = new IntersectionObserver(function (entries) {
            entries.forEach(function (e) {
                if (e.isIntersecting) { e.target.classList.add("in"); revealObs.unobserve(e.target); }
            });
        }, { threshold: 0.08 });
        document.querySelectorAll(".reveal").forEach(function (el) { revealObs.observe(el); });

        var navObs = new IntersectionObserver(function (entries) {
            entries.forEach(function (e) {
                var l = links[e.target.id];
                if (l && e.isIntersecting) {
                    Object.keys(links).forEach(function (k) { links[k].classList.remove("active"); });
                    l.classList.add("active");
                }
            });
        }, { rootMargin: "-40% 0px -55% 0px" });
        document.querySelectorAll("main section[id]").forEach(function (s) { navObs.observe(s); });
    } else {
        document.querySelectorAll(".reveal").forEach(function (el) { el.classList.add("in"); });
    }

    // Publication filters
    var chips = document.querySelectorAll(".chip");
    chips.forEach(function (chip) {
        chip.addEventListener("click", function () {
            chips.forEach(function (c) { c.classList.remove("on"); });
            chip.classList.add("on");
            var f = chip.getAttribute("data-filter");
            document.querySelectorAll(".pub[data-type]").forEach(function (p) {
                p.hidden = f !== "all" && p.getAttribute("data-type") !== f;
            });
        });
    });

    // Copy email
    var copyBtn = document.getElementById("copyEmail");
    copyBtn.addEventListener("click", function () {
        var text = document.getElementById("email").textContent;
        if (navigator.clipboard) {
            navigator.clipboard.writeText(text).then(function () {
                copyBtn.textContent = "Copied!";
                setTimeout(function () { copyBtn.textContent = "Copy"; }, 1600);
            });
        }
    });

    document.getElementById("year").textContent = new Date().getFullYear();
})();
