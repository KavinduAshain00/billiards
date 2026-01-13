"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.layout = exports.config = void 0;
exports.color = color;
exports.createTrace = createTrace;
exports.config = {
    responsive: true,
    showLink: true,
    plotlyServerURL: "https://chart-studio.plotly.com",
};
exports.layout = {
    legend: {
        font: { color: "#4D5663" },
        bgcolor: "#e5e6F9",
    },
    title: {
        text: "",
        font: {
            size: 11,
        },
    },
    xaxis: {
        title: "impulse",
        tickfont: { color: "#4D5663" },
        gridcolor: "#E1E5ED",
        titlefont: { color: "#4D5663" },
        zerolinecolor: "#E1E5ED",
    },
    yaxis: {
        title: "value",
        tickfont: { color: "#4D5663" },
        zeroline: false,
        gridcolor: "#E1E5ED",
        titlefont: { color: "#4D5663" },
        zerolinecolor: "#E1E5ED",
    },
    plot_bgcolor: "#F5F6F9",
    paper_bgcolor: "#F2F6F9",
};
function color(index) {
    var hue = (index * 137.5) % 360;
    var saturation = 70;
    var lightness = 50;
    return "hsl(".concat(hue, ", ").concat(saturation, "%, ").concat(lightness, "%)");
}
function createTrace(x, y, name, color) {
    return {
        x: x,
        y: y,
        name: name,
        line: {
            color: color,
            width: 1.3,
        },
        mode: "lines",
        type: "scatter",
    };
}
//# sourceMappingURL=plotlyconfig.js.map