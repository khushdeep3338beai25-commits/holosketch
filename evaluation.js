import { stabilityStats } from './smoothing.js';

export class EvaluationDashboard {
  constructor({ root, getData }) {
    this.root = root;
    this.getData = getData;
    this.evaluation = null;
  }

  setEvaluation(e) {
    this.evaluation = e;
  }

  updateLive() {
    if (!this.root.classList.contains('hidden')) this.renderLiveStats();
  }

  render() {
    if (!this.evaluation) return;
    const e = this.evaluation;
    const summary = [
      ['ACCURACY', `${(e.accuracy * 100).toFixed(1)}%`],
      ['CORRECT', `${e.correct} / ${e.total}`],
      ['DATASET SIZE', `${e.total} samples`],
      ['SHAPES', `${e.classes.length} classes`]
    ];

    const sumEl = document.getElementById('evalSummary');
    if (sumEl) {
      sumEl.innerHTML = summary.map(([a, b]) => `
        <div class="eval-stat">
          <small>${a}</small>
          <b>${b}</b>
        </div>
      `).join('');
    }

    const matrix = [['ACTUAL ↓ / PRED. →', ...e.classes]];
    e.classes.forEach((c, i) => matrix.push([c, ...e.matrix[i]]));

    const matrixEl = document.getElementById('confusionMatrix');
    if (matrixEl) {
      matrixEl.innerHTML = `
        <div class="table-wrap">
          <table class="matrix">
            <tbody>
              ${matrix.map((row, i) => `
                <tr>
                  ${row.map((v, j) => {
                    if (i === 0 || j === 0) return `<th>${v}</th>`;
                    const isDiag = i === j;
                    const val = Number(v) || 0;
                    const bg = isDiag
                      ? `rgba(88, 245, 168, ${Math.min(0.45, 0.08 + val * 0.035)})`
                      : (val > 0 ? `rgba(255, 112, 141, ${Math.min(0.45, 0.1 + val * 0.05)})` : 'transparent');
                    const color = isDiag && val > 0 ? '#58f5a8' : (val > 0 ? '#ff8ca3' : '#6f82a9');
                    return `<td style="background:${bg};color:${color}">${v}</td>`;
                  }).join('')}
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;
    }

    const metricsEl = document.getElementById('classMetrics');
    if (metricsEl) {
      metricsEl.innerHTML = `
        <div class="table-wrap">
          <table class="metrics-table">
            <thead>
              <tr>
                <th>SHAPE CLASS</th>
                <th>PRECISION</th>
                <th>RECALL</th>
                <th>F1 SCORE</th>
                <th>SUPPORT</th>
              </tr>
            </thead>
            <tbody>
              ${e.metrics.map(m => `
                <tr>
                  <td><b>${m.name}</b></td>
                  <td>${(m.precision * 100).toFixed(0)}%</td>
                  <td>${(m.recall * 100).toFixed(0)}%</td>
                  <td><span class="f1-chip">${(m.f1 * 100).toFixed(0)}%</span></td>
                  <td>${m.support}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;
    }

    this.renderLiveStats();
  }

  renderLiveStats() {
    const d = this.getData(), s = stabilityStats(d.rawJitter, d.smoothJitter);
    const raw = s.raw * 1000, smooth = s.smooth * 1000;
    const rawEl = document.getElementById('rawJitter');
    const smEl = document.getElementById('smoothJitter');
    if (rawEl) rawEl.textContent = s.samples ? raw.toFixed(2) : '—';
    if (smEl) smEl.textContent = s.samples ? smooth.toFixed(2) : '—';

    const rBar = document.getElementById('rawJitterBar');
    const sBar = document.getElementById('smoothJitterBar');
    if (rBar) rBar.style.width = `${Math.min(100, raw * 4)}%`;
    if (sBar) sBar.style.width = `${Math.min(100, smooth * 4)}%`;
  }

  getReport() {
    return {
      generatedAt: new Date().toISOString(),
      note: 'Built-in synthetic labeled test data (Circle, Oval, Triangle, Square, Rectangle, Diamond, Pentagon, Hexagon, Star, Heart).',
      summary: { accuracy: this.evaluation.accuracy, correct: this.evaluation.correct, total: this.evaluation.total },
      classes: this.evaluation.classes,
      confusionMatrix: this.evaluation.matrix,
      perClass: this.evaluation.metrics,
      samples: this.evaluation.samples,
      live: {
        gestureCount: this.getData().gestureCount,
        drawingCount: this.getData().drawingCount,
        stability: stabilityStats(this.getData().rawJitter, this.getData().smoothJitter)
      }
    };
  }

  toCSV() {
    const e = this.evaluation;
    return [
      'id,actual,predicted,score,correct,variation',
      ...e.samples.map(s => [s.id, s.label, s.predicted, s.score.toFixed(4), s.correct, s.variation].join(','))
    ].join('\n');
  }
}
