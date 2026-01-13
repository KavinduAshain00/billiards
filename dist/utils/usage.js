"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logusage = logusage;
function logusage() {
    if (window.location.hostname === "localhost" ||
        window.location.hostname === "127.0.0.1") {
        console.log("Skipping usage fetch for localhost.");
        return;
    }
    var url = "https://scoreboard-tailuge.vercel.app/api/usage/game";
    fetch(url, {
        method: "PUT",
        mode: "cors",
    })
        .then(function (response) {
        if (!response.ok) {
            console.error("HTTP error:", response.status, response.statusText);
        }
    })
        .catch(function (error) {
        console.error("Fetch error:", error);
    });
}
//# sourceMappingURL=usage.js.map