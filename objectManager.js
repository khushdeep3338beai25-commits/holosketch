export class ObjectManager {
  constructor(engine) {
    this.engine = engine;
    this.items = [];
    this.selected = null;
    this.hovered = null;
  }

  add(o) {
    o.id = crypto.randomUUID?.() || String(Date.now() + Math.random());
    this.items.push(o);
    this.selected = o;
    this.render();
  }

  hitTest(p) {
    for (let i = this.items.length - 1; i >= 0; i--) {
      const o = this.items[i];
      if (p.x >= o.x - 20 && p.x <= o.x + o.w + 20 && p.y >= o.y - 20 && p.y <= o.y + o.h + 20) {
        return o;
      }
    }
    return null;
  }

  select(o) {
    this.selected = o;
    this.render();
  }

  remove(o) {
    this.items = this.items.filter(x => x !== o);
    if (this.selected === o) this.selected = null;
    this.render();
  }

  clear() {
    this.items = [];
    this.selected = null;
    this.hovered = null;
    this.engine.render();
  }

  render() {
    const c = this.engine.ctx;
    c.save();
    for (const o of this.items) {
      if (o.type?.startsWith('3d-')) {
        this.render3D(c, o);
        continue;
      }
      c.save();
      c.strokeStyle = o.color || '#52f6ff';
      c.fillStyle = (o.color || '#52f6ff') + '1c';
      c.lineWidth = 2.4;
      c.shadowColor = o.color || '#52f6ff';
      c.shadowBlur = 15;

      const cx = o.x + o.w / 2, cy = o.y + o.h / 2;
      c.translate(cx, cy);
      c.rotate(o.rotation || 0);
      c.beginPath();

      const type = (o.type || '').toLowerCase();
      const hw = o.w / 2, hh = o.h / 2;

      if (type === 'circle' || type === 'oval') {
        c.ellipse(0, 0, Math.max(4, hw), Math.max(4, hh), 0, 0, Math.PI * 2);
      } else if (type === 'triangle') {
        c.moveTo(0, -hh);
        c.lineTo(hw, hh);
        c.lineTo(-hw, hh);
        c.closePath();
      } else if (type === 'square' || type === 'rectangle') {
        c.rect(-hw, -hh, o.w, o.h);
      } else if (type === 'diamond') {
        c.moveTo(0, -hh);
        c.lineTo(hw, 0);
        c.lineTo(0, hh);
        c.lineTo(-hw, 0);
        c.closePath();
      } else if (type === 'pentagon') {
        for (let i = 0; i < 5; i++) {
          const a = -Math.PI / 2 + (i * 2 * Math.PI) / 5;
          const px = hw * Math.cos(a), py = hh * Math.sin(a);
          if (i === 0) c.moveTo(px, py); else c.lineTo(px, py);
        }
        c.closePath();
      } else if (type === 'hexagon') {
        for (let i = 0; i < 6; i++) {
          const a = -Math.PI / 2 + (i * 2 * Math.PI) / 6;
          const px = hw * Math.cos(a), py = hh * Math.sin(a);
          if (i === 0) c.moveTo(px, py); else c.lineTo(px, py);
        }
        c.closePath();
      } else if (type === 'star') {
        for (let i = 0; i < 10; i++) {
          const a = -Math.PI / 2 + (i * Math.PI) / 5;
          const r = (i % 2 === 0) ? 1 : 0.42;
          const px = hw * r * Math.cos(a), py = hh * r * Math.sin(a);
          if (i === 0) c.moveTo(px, py); else c.lineTo(px, py);
        }
        c.closePath();
      } else if (type === 'heart') {
        c.moveTo(0, -hh * 0.35);
        c.bezierCurveTo(-hw * 0.55, -hh * 1.15, -hw * 1.05, -hh * 0.25, -hw * 0.65, hh * 0.35);
        c.bezierCurveTo(-hw * 0.4, hh * 0.72, 0, hh * 0.9, 0, hh);
        c.bezierCurveTo(0, hh * 0.9, hw * 0.4, hh * 0.72, hw * 0.65, hh * 0.35);
        c.bezierCurveTo(hw * 1.05, -hh * 0.25, hw * 0.55, -hh * 1.15, 0, -hh * 0.35);
        c.closePath();
      } else {
        c.moveTo(-hw, 0);
        (o.points || []).forEach(p => c.lineTo(p.x - cx, p.y - cy));
        c.closePath();
      }

      c.fill();
      c.stroke();

      // Subtle inner geometric highlight for holographic feel
      c.lineWidth = 1;
      c.globalAlpha = 0.35;
      c.stroke();
      c.globalAlpha = 1;

      this.drawSelection(c, o, true);
      c.restore();
    }
    c.restore();
  }

  render3D(c, o) {
    const cx = o.x + o.w / 2, cy = o.y + o.h / 2;
    const size = Math.min(o.w, o.h) * 0.48;
    const rx = o.rx || 0.35, ry = o.ry || 0.55, rz = o.rz || 0;

    const rotate = v => {
      let [x, y, z] = v;
      let a = y * Math.cos(rx) - z * Math.sin(rx), b = y * Math.sin(rx) + z * Math.cos(rx);
      y = a; z = b;
      a = x * Math.cos(ry) + z * Math.sin(ry); b = -x * Math.sin(ry) + z * Math.cos(ry);
      x = a; z = b;
      a = x * Math.cos(rz) - y * Math.sin(rz); b = x * Math.sin(rz) + y * Math.cos(rz);
      return { x: cx + a * size, y: cy + b * size, z };
    };

    c.save();
    c.strokeStyle = o.color || '#52f6ff';
    c.fillStyle = (o.color || '#52f6ff') + '1c';
    c.lineWidth = 2.2;
    c.shadowColor = o.color || '#52f6ff';
    c.shadowBlur = 18;

    const line = (a, b) => {
      c.beginPath();
      c.moveTo(a.x, a.y);
      c.lineTo(b.x, b.y);
      c.stroke();
    };

    if (o.type === '3d-sphere') {
      c.beginPath();
      c.ellipse(cx, cy, size * 0.9, size * 0.9, rz, 0, Math.PI * 2);
      c.stroke();
      c.beginPath();
      c.ellipse(cx, cy, size * 0.9, size * 0.35, rz + ry, 0, Math.PI * 2);
      c.stroke();
      c.beginPath();
      c.ellipse(cx, cy, size * 0.35, size * 0.9, rz + rx, 0, Math.PI * 2);
      c.stroke();
      c.beginPath();
      c.arc(cx, cy, size * 0.9, Math.PI * 0.1, Math.PI * 0.9);
      c.stroke();
    } else if (o.type === '3d-octahedron') {
      const verts = [
        [0, -1.2, 0], [0, 1.2, 0], [1, 0, 0], [-1, 0, 0], [0, 0, 1], [0, 0, -1]
      ].map(v => rotate(v));
      const edges = [
        [0, 2], [0, 3], [0, 4], [0, 5],
        [1, 2], [1, 3], [1, 4], [1, 5],
        [2, 4], [4, 3], [3, 5], [5, 2]
      ];
      edges.forEach(([a, b]) => line(verts[a], verts[b]));
    } else if (o.type === '3d-cylinder') {
      const segs = 10, topRing = [], botRing = [];
      for (let i = 0; i < segs; i++) {
        const a = (i * 2 * Math.PI) / segs;
        topRing.push(rotate([Math.cos(a) * 0.75, -1, Math.sin(a) * 0.75]));
        botRing.push(rotate([Math.cos(a) * 0.75, 1, Math.sin(a) * 0.75]));
      }
      for (let i = 0; i < segs; i++) {
        const next = (i + 1) % segs;
        line(topRing[i], topRing[next]);
        line(botRing[i], botRing[next]);
        if (i % 2 === 0) line(topRing[i], botRing[i]);
      }
    } else {
      const verts = o.type === '3d-pyramid'
        ? [[0, -1.1, 0], [1, 1, 1], [-1, 1, 1], [-1, 1, -1], [1, 1, -1]].map(v => rotate(v))
        : [[-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1], [-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]].map(v => rotate(v));

      const edges = o.type === '3d-pyramid'
        ? [[0, 1], [0, 2], [0, 3], [0, 4], [1, 2], [2, 3], [3, 4], [4, 1]]
        : [[0, 1], [1, 2], [2, 3], [3, 0], [4, 5], [5, 6], [6, 7], [7, 4], [0, 4], [1, 5], [2, 6], [3, 7]];

      edges.forEach(([a, b]) => line(verts[a], verts[b]));
    }

    this.drawSelection(c, o);
    c.restore();
  }

  drawSelection(c, o, local = false) {
    if (o === this.hovered || o === this.selected) {
      c.save();
      c.shadowBlur = 0;
      const isHov = o === this.hovered;
      c.setLineDash(isHov ? [4, 4] : [6, 4]);
      c.lineWidth = 1.8;
      c.strokeStyle = isHov ? '#58f5a8' : '#ffffffd9';

      const x = local ? -o.w / 2 - 12 : o.x - 12;
      const y = local ? -o.h / 2 - 12 : o.y - 12;
      const w = o.w + 24, h = o.h + 24;

      c.strokeRect(x, y, w, h);
      c.setLineDash([]);

      // Corner handles
      const cs = 7;
      c.fillStyle = isHov ? '#58f5a8' : '#ffffff';
      c.fillRect(x - cs / 2, y - cs / 2, cs, cs);
      c.fillRect(x + w - cs / 2, y - cs / 2, cs, cs);
      c.fillRect(x - cs / 2, y + h - cs / 2, cs, cs);
      c.fillRect(x + w - cs / 2, y + h - cs / 2, cs, cs);

      c.restore();
    }
  }
}