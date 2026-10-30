(function () {
    var card = document.getElementById("profile-activity-card");
    if (!card) return;

    if (window.matchMedia("(hover: hover) and (pointer: fine)").matches &&
            !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        card.addEventListener("pointermove", function (event) {
            var rect = card.getBoundingClientRect();
            card.style.setProperty("--glare-x", ((event.clientX - rect.left) / rect.width * 100) + "%");
            card.style.setProperty("--glare-y", ((event.clientY - rect.top) / rect.height * 100) + "%");
        });
        card.addEventListener("pointerleave", function () {
            card.style.setProperty("--glare-x", "50%");
            card.style.setProperty("--glare-y", "50%");
        });
    }

    var status = document.getElementById("profile-activity-status");
    var grid = document.getElementById("profile-activity-grid");
    var range = document.getElementById("profile-activity-range");
    var summary = document.getElementById("profile-activity-summary");
    var gridScroll = document.getElementById("profile-grid-scroll");
    var dateFormat = new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeZone: "UTC" });

    fetch("https://github-contributions-api.jogruber.de/v4/aiporre", {
        headers: { Accept: "application/json" }
    }).then(function (response) {
        if (!response.ok) throw new Error("The activity API returned HTTP " + response.status + ".");
        return response.json();
    }).then(function (data) {
        if (!Array.isArray(data.contributions)) throw new Error("The API response did not include contribution data.");
        var dates = new Map(data.contributions.map(function (day) { return [day.date, day]; }));
        var sortedDates = data.contributions.map(function (day) { return day.date; }).sort();
        if (!sortedDates.length) throw new Error("No contribution dates were returned.");
        var dataStart = new Date(sortedDates[0] + "T00:00:00Z");
        var end = new Date();
        end = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate()));

        function render() {
            grid.replaceChildren();
            var width = gridScroll.clientWidth || card.clientWidth;
            var weeksFit = Math.floor(width / 14);
            var weeks = Math.max(52, weeksFit);
            var start = new Date(end);
            start.setUTCDate(start.getUTCDate() - weeks * 7 + 1);
            if (start < dataStart) start = dataStart;
            var cursor = new Date(start);
            cursor.setUTCDate(cursor.getUTCDate() - cursor.getUTCDay());
            var total = 0;

            while (cursor <= end) {
                for (var weekday = 0; weekday < 7; weekday++) {
                    var day = dates.get(cursor.toISOString().slice(0, 10));
                    var cell = document.createElement("span");
                    var visible = cursor >= start && cursor <= end;
                    cell.className = "activity-day";
                    cell.dataset.level = day ? String(Math.max(0, Math.min(4, Number(day.level) || 0))) : "0";
                    cell.setAttribute("role", "gridcell");
                    if (visible) {
                        var count = day ? Number(day.count) || 0 : 0;
                        total += count;
                        cell.title = count + " contribution" + (count === 1 ? "" : "s") + " on " + dateFormat.format(cursor);
                        cell.setAttribute("aria-label", cell.title);
                    } else {
                        cell.setAttribute("aria-hidden", "true");
                        cell.style.visibility = "hidden";
                    }
                    grid.appendChild(cell);
                    cursor.setUTCDate(cursor.getUTCDate() + 1);
                    if (cursor > end && weekday === 6) break;
                }
            }
            range.textContent = "Showing " + dateFormat.format(start) + " – " + dateFormat.format(end);
            summary.textContent = total.toLocaleString() + " contributions in this period";
        }

        render();
        window.addEventListener("resize", render);
        range.hidden = false;
        summary.hidden = false;
        gridScroll.hidden = false;
        status.hidden = true;
    }).catch(function (error) {
        status.textContent = "Could not load GitHub activity right now. " + error.message;
        status.classList.add("activity-error");
    });
}());
