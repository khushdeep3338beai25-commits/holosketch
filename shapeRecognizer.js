// Explainable geometric classifier with PCA/minimum bounding box and convexity analysis.
// Supports 10 distinct shape classes: Circle, Oval, Triangle, Square, Rectangle, Diamond, Pentagon, Hexagon, Star, Heart.

export function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function smoothTrajectory(points, window = 2) {
  if (!points || points.length < 3) return points ? points.map(p => ({ ...p })) : [];
  return points.map((p, i) => {
    const chunk = points.slice(Math.max(0, i - window), Math.min(points.length, i + window + 1));
    return {
      x: chunk.reduce((s, q) => s + q.x, 0) / chunk.length,
      y: chunk.reduce((s, q) => s + q.y, 0) / chunk.length
    };
  });
}

export function simplify(points, tolerance = 4) {
  if (!points || points.length < 3) return points ? points.slice() : [];
  const out = [points[0]];
  for (let i = 1; i < points.length - 1; i++) {
    const prev = out[out.length - 1], p = points[i], next = points[i + 1];
    const area = Math.abs((p.x - prev.x) * (next.y - prev.y) - (p.y - prev.y) * (next.x - prev.x));
    const base = distance(prev, next) || 1;
    if (area / base > tolerance) out.push(p);
  }
  out.push(points[points.length - 1]);
  return out;
}

export function boundsOf(p) {
  if (!p || !p.length) return { x: 0, y: 0, w: 0, h: 0, cx: 0, cy: 0 };
  const xs = p.map(x => x.x), ys = p.map(x => x.y);
  const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY, cx: (minX + maxX) / 2, cy: (minY + maxY) / 2 };
}

export function polygonArea(p) {
  if (!p || p.length < 3) return 0;
  let a = 0;
  for (let i = 0; i < p.length; i++) {
    const q = p[(i + 1) % p.length];
    a += p[i].x * q.y - q.x * p[i].y;
  }
  return Math.abs(a / 2);
}

export function perimeter(p) {
  if (!p || p.length < 2) return 0;
  let s = 0;
  for (let i = 1; i < p.length; i++) s += distance(p[i - 1], p[i]);
  return s;
}

export function resample(p, n = 80) {
  if (!p || p.length < 2) return p || [];
  const lengths = [0];
  for (let i = 1; i < p.length; i++) lengths.push(lengths[lengths.length - 1] + distance(p[i - 1], p[i]));
  const total = lengths[lengths.length - 1] || 1, out = [];
  let j = 1;
  for (let k = 0; k < n; k++) {
    const target = total * k / (n - 1);
    while (j < lengths.length - 1 && lengths[j] < target) j++;
    const seg = lengths[j] - lengths[j - 1] || 1, t = (target - lengths[j - 1]) / seg;
    out.push({ x: p[j - 1].x + (p[j].x - p[j - 1].x) * t, y: p[j - 1].y + (p[j].y - p[j - 1].y) * t });
  }
  return out;
}

export function minBoundingBox(points) {
  let minArea = Infinity, best = { theta: 0, w: 1, h: 1, area: 1, aspect: 1 };
  for (let i = 0; i < 36; i++) {
    const theta = (i * Math.PI) / 36;
    const cos = Math.cos(theta), sin = Math.sin(theta);
    let minU = Infinity, maxU = -Infinity, minV = Infinity, maxV = -Infinity;
    for (const p of points) {
      const u = p.x * cos + p.y * sin;
      const v = -p.x * sin + p.y * cos;
      if (u < minU) minU = u; if (u > maxU) maxU = u;
      if (v < minV) minV = v; if (v > maxV) maxV = v;
    }
    const w = maxU - minU, h = maxV - minV;
    const area = w * h;
    if (area < minArea) {
      minArea = area;
      best = { theta, w, h, area, aspect: Math.max(w, h) / (Math.min(w, h) || 1) };
    }
  }
  return best;
}

export function convexHull(points) {
  if (!points || points.length < 3) return points ? points.slice() : [];
  const pts = points.slice().sort((a, b) => a.x === b.x ? a.y - b.y : a.x - b.x);
  const cross = (o, a, b) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
  const lower = [];
  for (const p of pts) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) lower.pop();
    lower.push(p);
  }
  const upper = [];
  for (let i = pts.length - 1; i >= 0; i--) {
    const p = pts[i];
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) upper.pop();
    upper.push(p);
  }
  upper.pop();
  lower.pop();
  return lower.concat(upper);
}

export function maxLocalTurn(points, step = 3) {
  if (!points || points.length < step * 2) return 0;
  let maxTurn = 0;
  const n = points.length;
  for (let i = 0; i < n; i++) {
    const prev = points[(i - step + n) % n];
    const curr = points[i];
    const next = points[(i + step) % n];
    const u = { x: curr.x - prev.x, y: curr.y - prev.y };
    const v = { x: next.x - curr.x, y: next.y - curr.y };
    const cos = (u.x * v.x + u.y * v.y) / (Math.hypot(u.x, u.y) * Math.hypot(v.x, v.y) || 1);
    const turn = Math.acos(Math.max(-1, Math.min(1, cos))) * 180 / Math.PI;
    if (turn > maxTurn) maxTurn = turn;
  }
  return maxTurn;
}

export function recognizeShape(input) {
  if (!input || input.length < 10) {
    return { shape: 'Ambiguous', score: 0, message: 'Draw a little longer to classify the shape' };
  }
  const smoothed = smoothTrajectory(input, 2);
  const b = boundsOf(smoothed);
  const diag = Math.hypot(b.w, b.h) || 1;
  const closure = distance(smoothed[0], smoothed[smoothed.length - 1]) / diag;
  const closed = closure < 0.35;
  if (!closed) {
    return { shape: 'Freeform', score: 0.55, bounds: b, message: 'Almost there — close the outline to snap to a shape' };
  }

  const pts = resample(smoothed, 80);
  const polyA = polygonArea(pts);
  const path = perimeter(pts) + distance(pts[0], pts[pts.length - 1]);
  const circularity = path ? (4 * Math.PI * polyA) / (path * path) : 0;

  const hull = convexHull(pts);
  const hullA = polygonArea(hull);
  const convexity = hullA ? polyA / hullA : 1;

  const rawHull = polyA / (b.w * b.h || 1);
  const mb = minBoundingBox(pts);
  const minFill = polyA / (mb.area || 1);
  const minAspect = mb.aspect;
  const maxTurn = maxLocalTurn(pts);

  let shape = 'Freeform', score = 0.6, rotation = mb.theta;

  // 1. Star: low convexity (< 0.68) with inward valleys
  if (convexity < 0.68) {
    shape = 'Star';
    score = Math.min(0.99, 0.76 + (1 - convexity) * 0.35 + (1 - closure) * 0.05);
  }
  // 2. Heart: non-convex (0.75 - 0.95) with top cleft indentation
  else if (convexity >= 0.75 && convexity <= 0.95 && minFill > 0.60 && minFill < 0.85) {
    shape = 'Heart';
    score = Math.min(0.98, 0.78 + (1 - Math.abs(convexity - 0.88)) * 0.2 + (1 - closure) * 0.05);
  }
  // 3. Triangle: minimum bounding box fill ~ 0.50
  else if (minFill >= 0.40 && minFill <= 0.60) {
    shape = 'Triangle';
    score = Math.min(0.97, 0.74 + (1 - Math.abs(minFill - 0.51)) * 0.25 + (1 - closure) * 0.05);
  }
  // 4. Diamond: rhombus with raw upright hull < 0.65
  else if (rawHull < 0.65 && minFill > 0.65 && minFill < 0.88) {
    shape = 'Diamond';
    score = Math.min(0.97, 0.75 + (0.65 - rawHull) * 0.25 + (1 - closure) * 0.05);
  }
  // 5. Circle: smooth curvature (maxTurn < 28), aspect ratio ~ 1, high circularity
  else if (maxTurn < 28 && minAspect < 1.22 && circularity > 0.88) {
    shape = 'Circle';
    score = Math.min(0.99, 0.75 + circularity * 0.23 + (1 - closure) * 0.04);
  }
  // 6. Oval / Ellipse: elongated smooth curvature (minAspect >= 1.25), circularity > 0.68
  else if (minAspect >= 1.25 && minFill >= 0.72 && minFill <= 0.85 && circularity > 0.68 && rawHull >= 0.68) {
    shape = 'Oval';
    score = Math.min(0.97, 0.74 + circularity * 0.2 + (1 - closure) * 0.05);
  }
  // 7. Pentagon: regular 5-sided polygon, minFill 0.65 - 0.755
  else if (minFill >= 0.65 && minFill < 0.755) {
    shape = 'Pentagon';
    score = Math.min(0.96, 0.74 + circularity * 0.2 + (1 - closure) * 0.05);
  }
  // 8. Hexagon: regular 6-sided polygon, minFill 0.755 - 0.83
  else if (minFill >= 0.755 && minFill <= 0.83) {
    shape = 'Hexagon';
    score = Math.min(0.96, 0.75 + circularity * 0.2 + (1 - closure) * 0.05);
  }
  // 9. Square & Rectangle: minFill > 0.85
  else if (minFill > 0.85) {
    if (minAspect < 1.28) {
      shape = 'Square';
      score = Math.min(0.97, 0.74 + (1 - Math.abs(minAspect - 1)) * 0.18 + (1 - closure) * 0.05);
    } else {
      shape = 'Rectangle';
      score = Math.min(0.97, 0.74 + Math.min(1, Math.abs(Math.log(minAspect))) * 0.15 + (1 - closure) * 0.05);
    }
  }
  // Fallbacks
  else if (circularity > 0.88 && minAspect < 1.25) {
    shape = 'Circle'; score = 0.75;
  } else if (minAspect >= 1.28) {
    shape = minFill > 0.82 ? 'Rectangle' : 'Oval'; score = 0.70;
  } else if (minFill > 0.80) {
    shape = 'Square'; score = 0.70;
  }

  return { shape, score, bounds: b, rotation, circularity, minFill, convexity };
}

export function makeShape(type, cx, cy, rx, ry, rotation = 0, noise = 0, n = 72) {
  let pts = [];
  for (let i = 0; i < n; i++) {
    let t = 2 * Math.PI * i / (n - 1), x, y;
    if (type === 'Circle') {
      x = rx * Math.cos(t); y = rx * Math.sin(t);
    } else if (type === 'Oval') {
      x = rx * Math.cos(t); y = ry * Math.sin(t);
    } else if (type === 'Square') {
      const corners = [[-rx, -rx], [rx, -rx], [rx, rx], [-rx, rx], [-rx, -rx]];
      const f = (i / (n - 1)) * 4, seg = Math.min(3, Math.floor(f)), u = f - seg;
      x = corners[seg][0] * (1 - u) + corners[seg + 1][0] * u;
      y = corners[seg][1] * (1 - u) + corners[seg + 1][1] * u;
    } else if (type === 'Rectangle') {
      const corners = [[-rx, -ry], [rx, -ry], [rx, ry], [-rx, ry], [-rx, -ry]];
      const f = (i / (n - 1)) * 4, seg = Math.min(3, Math.floor(f)), u = f - seg;
      x = corners[seg][0] * (1 - u) + corners[seg + 1][0] * u;
      y = corners[seg][1] * (1 - u) + corners[seg + 1][1] * u;
    } else if (type === 'Triangle') {
      const corners = [[-rx, ry], [0, -ry], [rx, ry], [-rx, ry]];
      const f = (i / (n - 1)) * 3, seg = Math.min(2, Math.floor(f)), u = f - seg;
      x = corners[seg][0] * (1 - u) + corners[seg + 1][0] * u;
      y = corners[seg][1] * (1 - u) + corners[seg + 1][1] * u;
    } else if (type === 'Diamond') {
      const corners = [[0, -ry], [rx, 0], [0, ry], [-rx, 0], [0, -ry]];
      const f = (i / (n - 1)) * 4, seg = Math.min(3, Math.floor(f)), u = f - seg;
      x = corners[seg][0] * (1 - u) + corners[seg + 1][0] * u;
      y = corners[seg][1] * (1 - u) + corners[seg + 1][1] * u;
    } else if (type === 'Pentagon') {
      const corners = [];
      for (let k = 0; k <= 5; k++) {
        const ang = -Math.PI / 2 + (k % 5) * 2 * Math.PI / 5;
        corners.push([rx * Math.cos(ang), ry * Math.sin(ang)]);
      }
      const f = (i / (n - 1)) * 5, seg = Math.min(4, Math.floor(f)), u = f - seg;
      x = corners[seg][0] * (1 - u) + corners[seg + 1][0] * u;
      y = corners[seg][1] * (1 - u) + corners[seg + 1][1] * u;
    } else if (type === 'Hexagon') {
      const corners = [];
      for (let k = 0; k <= 6; k++) {
        const ang = -Math.PI / 2 + (k % 6) * 2 * Math.PI / 6;
        corners.push([rx * Math.cos(ang), ry * Math.sin(ang)]);
      }
      const f = (i / (n - 1)) * 6, seg = Math.min(5, Math.floor(f)), u = f - seg;
      x = corners[seg][0] * (1 - u) + corners[seg + 1][0] * u;
      y = corners[seg][1] * (1 - u) + corners[seg + 1][1] * u;
    } else if (type === 'Star') {
      const corners = [];
      for (let k = 0; k <= 10; k++) {
        const ang = -Math.PI / 2 + (k % 10) * Math.PI / 5;
        const r = (k % 2 === 0) ? rx : rx * 0.42;
        corners.push([r * Math.cos(ang), r * Math.sin(ang)]);
      }
      const f = (i / (n - 1)) * 10, seg = Math.min(9, Math.floor(f)), u = f - seg;
      x = corners[seg][0] * (1 - u) + corners[seg + 1][0] * u;
      y = corners[seg][1] * (1 - u) + corners[seg + 1][1] * u;
    } else if (type === 'Heart') {
      const hx = 16 * Math.pow(Math.sin(t), 3);
      const hy = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));
      x = hx * (rx / 16);
      y = hy * (ry / 17);
    }
    const xx = x * Math.cos(rotation) - y * Math.sin(rotation);
    const yy = x * Math.sin(rotation) + y * Math.cos(rotation);
    const jitterX = Math.sin(i * 12.9898 + rotation * 7.13) * noise * 0.35;
    const jitterY = Math.sin(i * 7.233 + rotation * 3.71) * noise * 0.35;
    pts.push({ x: cx + xx + jitterX, y: cy + yy + jitterY });
  }
  return pts;
}

export function makeSyntheticDataset() {
  const out = [];
  const types = ['Circle', 'Oval', 'Triangle', 'Square', 'Rectangle', 'Diamond', 'Pentagon', 'Hexagon', 'Star', 'Heart'];
  types.forEach(type => {
    for (let i = 0; i < 10; i++) {
      const variation = i < 4 ? 'easy' : i < 7 ? 'noisy' : 'rotated';
      const noise = variation === 'noisy' ? 3 : 0;
      const rotation = variation === 'rotated' ? (i % 2 ? Math.PI / 14 : -Math.PI / 14) : 0;
      let rx = 50 + (i % 3) * 2, ry = 50 + (i % 2) * 2;
      if (type === 'Oval') { rx = 68; ry = 32; }
      if (type === 'Rectangle') { rx = 70; ry = 36; }
      if (type === 'Diamond') { rx = 40; ry = 52; }
      if (type === 'Square') { rx = 48; ry = 48; }
      if (type === 'Triangle') { rx = 52; ry = 52; }
      const points = makeShape(type, 120, 110, rx, ry, rotation, noise, 75);
      out.push({ id: `${type.toLowerCase()}-${i + 1}`, label: type, variation, points, prediction: null });
    }
  });
  return out;
}

export function evaluateDataset(dataset) {
  const classes = ['Circle', 'Oval', 'Triangle', 'Square', 'Rectangle', 'Diamond', 'Pentagon', 'Hexagon', 'Star', 'Heart'];
  const matrix = classes.map(() => classes.map(() => 0));
  let correct = 0;
  const samples = dataset.map(s => {
    const pred = recognizeShape(s.points);
    const predicted = classes.includes(pred.shape) ? pred.shape : 'Other';
    if (predicted === s.label) correct++;
    const r = classes.indexOf(s.label), c = classes.indexOf(predicted);
    if (r >= 0 && c >= 0) matrix[r][c]++;
    return { ...s, predicted, score: pred.score, correct: predicted === s.label };
  });
  const metrics = classes.map((name, i) => {
    const tp = matrix[i][i];
    const fp = matrix.reduce((s, row, r) => s + (r === i ? 0 : row[i]), 0);
    const fn = matrix[i].reduce((s, v, c) => s + (c === i ? 0 : v), 0);
    const precision = tp / (tp + fp || 1);
    const recall = tp / (tp + fn || 1);
    const f1 = 2 * precision * recall / (precision + recall || 1);
    return { name, precision, recall, f1, support: matrix[i].reduce((s, v) => s + v, 0) };
  });
  return { classes, matrix, metrics, accuracy: correct / (dataset.length || 1), correct, total: dataset.length, samples };
}
