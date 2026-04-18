// 15-imagemap-geometry.js
// Geometrie- und Statistik-Hilfsfunktionen für Imagemap-Fragen (Quiz-Gameplay)

function checkImagemapHit(cx, cy, targets) {
    if (!targets || !Array.isArray(targets)) return false;
    for (const t of targets) {
        if (t.mode === 'polygon' && t.points) {
            if (pointInPolygon(cx, cy, t.points)) return true;
            var d = distToPolygon(cx, cy, t.points);
            if (d < (t.tolerance || 5)) return true;
        } else {
            var dx = cx - (t.x || 0), dy = cy - (t.y || 0), r = t.radius || 5;
            if (dx * dx + dy * dy <= r * r) return true;
        }
    }
    return false;
}

function pointInPolygon(x, y, poly) {
    var inside = false;
    for (var i = 0, j = poly.length - 1; i < poly.length; j = i++) {
        var xi = poly[i].x, yi = poly[i].y, xj = poly[j].x, yj = poly[j].y;
        if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) inside = !inside;
    }
    return inside;
}

function distToPolygon(x, y, poly) {
    var min = Infinity;
    for (var i = 0, j = poly.length - 1; i < poly.length; j = i++) {
        var d = distToSegment(x, y, poly[j].x, poly[j].y, poly[i].x, poly[i].y);
        if (d < min) min = d;
    }
    return min;
}

function distToSegment(px, py, x1, y1, x2, y2) {
    var dx = x2 - x1, dy = y2 - y1, t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / (dx * dx + dy * dy)));
    return Math.sqrt((px - x1 - t * dx) ** 2 + (py - y1 - t * dy) ** 2);
}

function calculateQuestionStats(qid) {
    var asked = 0, correct = 0;
    users.forEach(function(u) { if (u.questionStats && u.questionStats[qid]) { asked += u.questionStats[qid].asked || 0; correct += u.questionStats[qid].correct || 0; } });
    if (asked === 0) return null;
    return { totalAsked: asked, totalCorrect: correct, percentage: Math.round((correct / asked) * 100) };
}
