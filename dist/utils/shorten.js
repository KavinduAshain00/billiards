"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.shorten = shorten;
exports.share = share;
function shorten(url, action) {
    if (typeof process === "object") {
        return action(url);
    }
    var cleanUrl = new URL(url
        .replaceAll("(", "%28")
        .replaceAll(")", "%29")
        .replaceAll("!", "%21")
        .replaceAll("*", "%2A")).search;
    fetch("https://scoreboard-tailuge.vercel.app/api/shorten", {
        method: "POST",
        mode: "cors",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input: cleanUrl }),
    })
        .then(function (response) { return response.json(); })
        .then(function (data) {
        if ("shortUrl" in data) {
            action(data.shortUrl);
        }
        else {
            console.log("Could not shorten url:");
            console.log(data);
            action(url);
        }
    });
}
function share(url) {
    var _a, _b;
    var shareData = {
        title: "Billiards",
        text: "Replay break",
        url: url,
    };
    if ((_a = navigator.canShare) === null || _a === void 0 ? void 0 : _a.call(navigator, shareData)) {
        navigator
            .share(shareData)
            .then(function () { return console.log("shared successfully"); })
            .catch(function (e) {
            console.log("Error: " + e);
        });
        return "link shared";
    }
    (_b = navigator.clipboard) === null || _b === void 0 ? void 0 : _b.writeText(url);
    return "link copied to clipboard <a href=\"".concat(url, "\">").concat(url, "</a>");
}
//# sourceMappingURL=shorten.js.map