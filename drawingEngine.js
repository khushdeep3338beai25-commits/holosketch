export class DrawingEngine {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.width = canvas.width || 1;
    this.height = canvas.height || 1;
    this.strokes = [];
    this.gridMode = 'cyber'; // 'cyber' | 'dots' | 'hex' | 'none'
    this.particles = [];
  }

  resize(w, h) {
    this.width = w;
    this.height = h;
    this.render();
  }

  setGridMode(mode) {
    this.gridMode = mode;
    this.render();
  }

  clear() {
    this.strokes = [];
    this.particles = [];
    this.ctx.clearRect(0, 0, this.width, this.height);
    this.renderGrid();
  }

  addParticle(x, y, color) {
    if (this.particles.length > 40) this.particles.shift();
    this.particles.push({
      x,
      y,
      vx: (Math.random() - 0.5) * 1.5,
      vy: (Math.random() - 0.5) * 1.5,
      alpha: 0.8,
      color: color || '#52f6ff',
      size: Math.random() * 2.5 + 1.5
    });
  }

  renderGrid() {
    if (this.gridMode === 'none') return;
    const c = this.ctx;
    c.save();

    if (this.gridMode === 'cyber') {
      const step = Math.max(30, Math.round(this.width / 24));
      c.strokeStyle = 'rgba(82, 246, 255, 0.04)';
      c.lineWidth = 1;
      for (let x = 0; x < this.width; x += step) {
        c.beginPath();
        c.moveTo(x, 0);
        c.lineTo(x, this.height);
        c.stroke();
      }
      for (let y = 0; y < this.height; y += step) {
        c.beginPath();
        c.moveTo(0, y);
        c.lineTo(this.width, y);
        c.stroke();
      }
      // Center crosshairs
      const cx = this.width / 2, cy = this.height / 2;
      c.strokeStyle = 'rgba(82, 246, 255, 0.12)';
      c.setLineDash([4, 6]);
      c.beginPath();
      c.moveTo(cx, 0); c.lineTo(cx, this.height);
      c.moveTo(0, cy); c.lineTo(this.width, cy);
      c.stroke();
      c.setLineDash([]);
    } else if (this.gridMode === 'dots') {
      const step = 28;
      c.fillStyle = 'rgba(137, 163, 226, 0.18)';
      for (let x = step / 2; x < this.width; x += step) {
        for (let y = step / 2; y < this.height; y += step) {
          c.fillRect(x, y, 1.5, 1.5);
        }
      }
    } else if (this.gridMode === 'hex') {
      const r = 24, h = r * Math.sqrt(3);
      c.strokeStyle = 'rgba(181, 140, 255, 0.05)';
      c.lineWidth = 1;
      for (let y = 0; y < this.height + h; y += h) {
        for (let x = 0; x < this.width + r * 3; x += r * 3) {
          c.beginPath();
          for (let i = 0; i < 6; i++) {
            const a = (i * Math.PI) / 3;
            const px = x + r * Math.cos(a), py = y + r * Math.sin(a);
            if (i === 0) c.moveTo(px, py); else c.lineTo(px, py);
          }
          c.closePath();
          c.stroke();
        }
      }
    }

    c.restore();
  }

  drawSegment(a, b, color, size) {
    const c = this.ctx;
    c.save();
    c.strokeStyle = color;
    c.lineWidth = size * (Math.min(this.width, this.height) / 500);
    c.lineCap = 'round';
    c.lineJoin = 'round';
    c.shadowColor = color;
    c.shadowBlur = 15;
    c.beginPath();
    c.moveTo(a.x, a.y);
    c.lineTo(b.x, b.y);
    c.stroke();
    c.restore();

    this.addParticle(b.x, b.y, color);
  }

  render() {
    const c = this.ctx;
    c.clearRect(0, 0, this.width, this.height);

    this.renderGrid();

    // Render strokes
    for (const s of this.strokes) {
      if (!s.points?.length) continue;
      c.save();
      c.globalAlpha = s.opacity ?? 1;
      c.strokeStyle = s.color;
      c.lineWidth = s.size * (Math.min(this.width, this.height) / 500);
      c.lineCap = 'round';
      c.lineJoin = 'round';
      c.shadowColor = s.color;
      c.shadowBlur = 14;
      c.beginPath();
      c.moveTo(s.points[0].x, s.points[0].y);
      for (let i = 1; i < s.points.length; i++) {
        const prev = s.points[i - 1], p = s.points[i];
        const mx = (prev.x + p.x) / 2, my = (prev.y + p.y) / 2;
        c.quadraticCurveTo(prev.x, prev.y, mx, my);
      }
      const last = s.points.at(-1);
      c.lineTo(last.x, last.y);
      c.stroke();
      c.restore();
    }

    // Render drawing particles
    if (this.particles.length) {
      c.save();
      for (let i = this.particles.length - 1; i >= 0; i--) {
        const p = this.particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.alpha *= 0.92;
        if (p.alpha <= 0.05) {
          this.particles.splice(i, 1);
          continue;
        }
        c.beginPath();
        c.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        c.fillStyle = p.color;
        c.globalAlpha = p.alpha;
        c.shadowColor = p.color;
        c.shadowBlur = 8;
        c.fill();
      }
      c.restore();
    }
  }
}
