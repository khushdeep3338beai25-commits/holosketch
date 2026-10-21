import { HandLandmarker, FilesetResolver } from 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14';
import { initSmoothing, smoothPoint, stabilityStats } from './smoothing.js';
import { recognizeShape, makeSyntheticDataset, evaluateDataset } from './shapeRecognizer.js';
import { DrawingEngine } from './drawingEngine.js';
import { ObjectManager } from './objectManager.js';
import { EvaluationDashboard } from './evaluation.js';

// Sound Synthesizer (Native Web Audio API)
class SoundFx {
  constructor() {
    this.ctx = null;
    this.enabled = true;
  }
  init() {
    if (!this.ctx && typeof AudioContext !== 'undefined') {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
  }
  playTone(freq, type, duration, gainVal = 0.08) {
    if (!this.enabled) return;
    try {
      this.init();
      if (this.ctx.state === 'suspended') this.ctx.resume();
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
      gain.gain.setValueAtTime(gainVal, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + duration);
    } catch (e) {}
  }
  snap() {
    this.playTone(587.33, 'sine', 0.12, 0.08); // D5
    setTimeout(() => this.playTone(880, 'sine', 0.22, 0.09), 70); // A5
  }
  blip() {
    this.playTone(480, 'triangle', 0.06, 0.04);
  }
  erase() {
    this.playTone(160, 'sawtooth', 0.14, 0.06);
  }
  grab() {
    this.playTone(659.25, 'sine', 0.09, 0.07);
  }
}

const sfx = new SoundFx();
const $ = id => document.getElementById(id);

const video = $('cameraVideo');
const landmarkCanvas = $('landmarkCanvas');
const lctx = landmarkCanvas.getContext('2d');
const engine = new DrawingEngine($('drawCanvas'));
const objects = new ObjectManager(engine);

let landmarker = null;
let stream = null;
let running = false;
let raf = 0;
let lastVideoTime = -1;
let lastFrame = performance.now();
let frames = 0;
let fps = 0;
let latency = 0;
let currentColor = '#52f6ff';
let brushSize = 6;
let tool = 'draw';
let autoSnap = true;
let gesture = 'WAITING FOR HAND';
let prevGesture = '';
let gestureSince = 0;
let lastGestureEvent = 0;
let lastPoint = null;
let rawPoints = [];
let smoothPoints = [];
let activeStroke = null;
let drawingCount = 0;
let gestureCount = 0;
let history = [];
let undoStack = [];
let redoStack = [];
let lastHand = null;
let pinchObject = null;
let pinchOffset = { x: 0, y: 0 };
let swipeStart = null;
let swipeCooldown = 0;
let toastTimer;
let lastSampleTime = 0;
let lastPalmWidth = null;
let lastRotateX = null;

// Mouse / Touch drawing on workspace canvas
let isPointerDrawing = false;

const symbols = {
  Circle: '◯',
  Oval: '⬭',
  Triangle: '△',
  Square: '□',
  Rectangle: '▭',
  Diamond: '◇',
  Pentagon: '⬠',
  Hexagon: '⬡',
  Star: '☆',
  Heart: '♡'
};

const evalData = {
  test: [],
  live: [],
  rawJitter: [],
  smoothJitter: [],
  gestureCount: 0,
  drawingCount: 0
};

const evalDashboard = new EvaluationDashboard({
  root: $('evaluationPanel'),
  getData: () => evalData
});

initSmoothing();

function toast(msg) {
  const t = $('toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2600);
}

function setStatus(text, on = false) {
  const s = $('liveStatus'), d = $('statusDot');
  if (s) s.textContent = text;
  if (d) d.classList.toggle('on', on);
}

function setGesture(g) {
  if (g !== gesture) {
    gesture = g;
    const ag = $('activeGesture');
    if (ag) ag.textContent = `GESTURE · ${g}`;
    gestureCount++;
    evalData.gestureCount = gestureCount;
    const gc = $('gestureCount');
    if (gc) gc.textContent = gestureCount;
    lastGestureEvent = performance.now();
    if (g === 'PINCH' || g === 'FIST' || g === 'TWO FINGERS') sfx.blip();
  }
}

function sizeCanvases() {
  const wrap = $('canvasWrap');
  if (!wrap) return;
  const r = wrap.getBoundingClientRect();
  const c = $('drawCanvas');
  const dpr = Math.min(devicePixelRatio || 1, 2);
  if (c.width !== Math.round(r.width * dpr) || c.height !== Math.round(r.height * dpr)) {
    c.width = Math.round(r.width * dpr);
    c.height = Math.round(r.height * dpr);
    engine.resize(c.width, c.height);
    engine.render();
  }
  const vr = video.getBoundingClientRect();
  if (vr.width && vr.height) {
    landmarkCanvas.width = Math.round(vr.width * dpr);
    landmarkCanvas.height = Math.round(vr.height * dpr);
  }
}
window.addEventListener('resize', sizeCanvases);

// Navigation & Camera Launch
$('launchBtn')?.addEventListener('click', async () => {
  $('landing')?.classList.add('hidden');
  $('workspace')?.classList.remove('hidden');
  window.scrollTo({ top: 0, behavior: 'smooth' });
  sizeCanvases();
  if (!stream) await startCamera();
});

$('stopCameraBtn')?.addEventListener('click', () => stopCamera(true));

async function startCamera() {
  try {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error('This browser does not support camera access. Use a recent browser on localhost or HTTPS.');
    }
    setStatus('INITIALIZING VISION…');
    $('trackingNote').textContent = 'Requesting camera permission…';
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
      audio: false
    });
    video.srcObject = stream;
    await video.play();
    $('cameraOverlay')?.classList.add('off');
    const cs = $('cameraStatus');
    if (cs) {
      cs.textContent = 'CAMERA ACTIVE';
      cs.classList.add('on');
    }
    $('trackingLabel').textContent = 'LOADING';
    $('trackingNote').textContent = 'Loading hand-tracking model from MediaPipe CDN…';
    setStatus('LOADING MODEL…');

    const vision = await FilesetResolver.forVisionTasks('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm');
    landmarker = await HandLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
        delegate: 'GPU'
      },
      runningMode: 'VIDEO',
      numHands: 1,
      minHandDetectionConfidence: 0.55,
      minHandPresenceConfidence: 0.5,
      minTrackingConfidence: 0.5
    });

    running = true;
    $('trackingLabel').textContent = 'TRACKING';
    $('trackingLabel').classList.add('on');
    $('trackingNote').textContent = 'One hand · 21 landmarks · real-time local processing';
    setStatus('VISION ONLINE', true);
    lastFrame = performance.now();
    raf = requestAnimationFrame(loop);
    toast('Camera ready — raise your index finger to draw in mid-air.');
  } catch (e) {
    console.error(e);
    stopCamera(false);
    setStatus('CAMERA ERROR');
    $('trackingNote').textContent = e.message.includes('Permission')
      ? 'Camera permission was denied. Allow camera access in your browser settings and retry.'
      : e.message;
    const co = $('cameraOverlay');
    if (co) {
      co.classList.remove('off');
      co.querySelector('b').textContent = 'Unable to start camera';
      co.querySelector('small').textContent = e.message.slice(0, 90);
    }
    toast('Could not start camera. Check permission and connection.');
  }
}

function stopCamera(show = true) {
  running = false;
  cancelAnimationFrame(raf);
  if (stream) {
    stream.getTracks().forEach(t => t.stop());
    stream = null;
  }
  video.srcObject = null;
  if (landmarker) {
    landmarker.close();
    landmarker = null;
  }
  lctx.clearRect(0, 0, landmarkCanvas.width, landmarkCanvas.height);
  const co = $('cameraOverlay');
  if (co) {
    co.classList.remove('off');
    co.querySelector('b').textContent = 'Camera inactive';
    co.querySelector('small').textContent = 'Launch to enable local tracking';
  }
  const cs = $('cameraStatus');
  if (cs) {
    cs.textContent = 'CAMERA OFF';
    cs.classList.remove('on');
  }
  $('trackingLabel').textContent = 'OFFLINE';
  $('trackingLabel').classList.remove('on');
  $('trackingNote').textContent = 'Camera stopped. No video is recorded or uploaded.';
  setStatus('SYSTEM STANDBY');
  lastPoint = null;
  activeStroke = null;
  setGesture('WAITING FOR HAND');
  if (show) toast('Camera stopped and stream released.');
}

function loop(now) {
  if (!running || !landmarker) return;
  raf = requestAnimationFrame(loop);
  if (video.readyState < 2 || video.currentTime === lastVideoTime) return;
  lastVideoTime = video.currentTime;
  const start = performance.now();
  let result;
  try {
    result = landmarker.detectForVideo(video, now);
  } catch (e) {
    console.warn('Frame inference failed', e);
    return;
  }
  latency = performance.now() - start;
  frames++;
  if (now - lastFrame >= 1000) {
    fps = Math.round(frames * 1000 / (now - lastFrame));
    frames = 0;
    lastFrame = now;
    updateTelemetry();
  }

  sizeCanvases();
  lctx.clearRect(0, 0, landmarkCanvas.width, landmarkCanvas.height);
  const lm = result.landmarks?.[0];
  if (!lm) {
    $('confidenceValue').textContent = '—';
    $('coordinates').textContent = 'X — / Y —';
    $('trackingNote').textContent = 'No hand detected. Keep your hand inside the frame.';
    setGesture('NO HAND DETECTED');
    lastPoint = null;
    activeStroke = null;
    lastHand = null;
    return;
  }

  drawLandmarks(lm);
  const confidence = result.handednesses?.[0]?.[0]?.score;
  $('confidenceValue').textContent = Number.isFinite(confidence) ? `${Math.round(confidence * 100)}%` : 'Detected';
  $('trackingNote').textContent = 'Hand detected · follow the gesture guide below.';

  const raw = { x: 1 - lm[8].x, y: lm[8].y };
  const sm = smoothPoint(raw);
  evalData.rawJitter.push(raw);
  evalData.smoothJitter.push(sm);
  if (evalData.rawJitter.length > 400) {
    evalData.rawJitter.shift();
    evalData.smoothJitter.shift();
  }

  const p = { x: sm.x * engine.width, y: sm.y * engine.height };
  $('coordinates').textContent = `X ${Math.round(raw.x * 1000) / 10}% / Y ${Math.round(raw.y * 1000) / 10}%`;
  lastHand = { landmarks: lm, point: p, raw };

  const g = detectGesture(lm);
  handleGesture(g, p, raw, now);

  engine.render();
  objects.render();
  drawInteractionCursor(p);

  if (now - lastSampleTime > 180) {
    lastSampleTime = now;
    evalData.live.push({ time: now, raw: { ...raw }, smooth: { ...sm } });
    if (evalData.live.length > 600) evalData.live.shift();
  }
}

function drawInteractionCursor(p) {
  const c = engine.ctx;
  if (!lastHand) return;
  c.save();
  const isSelect = tool === 'select', hit = isSelect && objects.hovered;
  c.beginPath();
  c.arc(p.x, p.y, hit ? 18 : 12, 0, Math.PI * 2);
  c.strokeStyle = hit ? '#58f5a8' : (isSelect ? '#b58cff' : currentColor);
  c.lineWidth = 2.2;
  c.shadowColor = c.strokeStyle;
  c.shadowBlur = 16;
  c.stroke();

  c.beginPath();
  c.arc(p.x, p.y, 3.5, 0, Math.PI * 2);
  c.fillStyle = '#ffffff';
  c.fill();

  if (hit) {
    c.shadowBlur = 0;
    c.font = '12px system-ui';
    c.fillStyle = '#d9fff0';
    c.fillText(`PINCH TO GRAB · ${hit.name || hit.type}`, Math.min(p.x + 20, c.canvas.width - 200), Math.max(20, p.y - 18));
  } else if (isSelect) {
    c.shadowBlur = 0;
    c.font = '11px system-ui';
    c.fillStyle = '#d8caff';
    c.fillText('MOVE TO SHAPE', Math.min(p.x + 18, c.canvas.width - 130), Math.max(18, p.y - 16));
  }
  c.restore();
}

function drawLandmarks(lm) {
  const w = landmarkCanvas.width, h = landmarkCanvas.height;
  const pt = i => ({ x: (1 - lm[i].x) * w, y: lm[i].y * h });
  const edges = [
    [0, 1], [1, 2], [2, 3], [3, 4],
    [0, 5], [5, 6], [6, 7], [7, 8],
    [5, 9], [9, 10], [10, 11], [11, 12],
    [9, 13], [13, 14], [14, 15], [15, 16],
    [13, 17], [17, 18], [18, 19], [19, 20],
    [0, 17]
  ];

  lctx.lineWidth = Math.max(1.5, w / 300);
  lctx.strokeStyle = 'rgba(82, 246, 255, 0.7)';
  edges.forEach(([a, b]) => {
    const p = pt(a), q = pt(b);
    lctx.beginPath();
    lctx.moveTo(p.x, p.y);
    lctx.lineTo(q.x, q.y);
    lctx.stroke();
  });

  lm.forEach((_, i) => {
    const p = pt(i);
    lctx.beginPath();
    const isTip = (i === 8);
    lctx.arc(p.x, p.y, isTip ? Math.max(5, w / 65) : Math.max(2.5, w / 180), 0, Math.PI * 2);
    lctx.fillStyle = isTip ? '#ffffff' : (i % 4 === 0 ? '#ff5edb' : '#52f6ff');
    lctx.shadowColor = isTip ? '#52f6ff' : 'transparent';
    lctx.shadowBlur = isTip ? 16 : 0;
    lctx.fill();
    lctx.shadowBlur = 0;
  });
}

function fingerUp(lm, tip, pip) {
  return lm[tip].y < lm[pip].y - 0.015;
}

function detectGesture(lm) {
  const index = fingerUp(lm, 8, 6);
  const middle = fingerUp(lm, 12, 10);
  const ring = fingerUp(lm, 16, 14);
  const pinky = fingerUp(lm, 20, 18);
  const thumbTip = lm[4], indexTip = lm[8];
  const pinch = Math.hypot(thumbTip.x - indexTip.x, thumbTip.y - indexTip.y) < 0.065;

  if (pinch) return 'PINCH';
  if (index && middle && !ring && !pinky) return 'TWO FINGERS';
  if (index && !middle && !ring && !pinky) return 'DRAW';
  if (index && middle && ring && pinky) return 'OPEN PALM';
  if (!index && !middle && !ring && !pinky) return 'FIST';
  return 'NAVIGATE';
}

function setTool(next, announce = true) {
  tool = next;
  document.querySelectorAll('.tool-btn').forEach(b => b.classList.toggle('active', b.dataset.tool === tool));
  const help = $('selectionHelp');
  if (help) {
    help.classList.toggle('visible', tool === 'select' || tool === 'palette' || tool === '3d');
    help.textContent = tool === 'select'
      ? 'SELECT MODE · Hover over a recognized shape, then pinch thumb + index to grab and reposition it.'
      : tool === 'palette'
      ? 'COLOR PALETTE · Move your fingertip left/right in the camera view to preview vibrant colors.'
      : tool === '3d'
      ? '3D HOLOGRAPHIC LAB · Pinch to move, two fingers to rotate, open palm to scale.'
      : '';
  }
  $('threeDControls')?.classList.toggle('visible', tool === '3d');
  if (announce) {
    if (tool === 'select') toast('Select mode ready · hover over a shape, then pinch to grab it.');
    else if (tool === 'draw') toast('Draw mode enabled · raise your index finger to sketch in the air.');
    else if (tool === 'palette') toast('Palette mode · move fingertip horizontally to choose brush colors.');
    else if (tool === '3d') toast('3D Lab ready · add a cube, sphere, pyramid, octahedron or cylinder.');
    else toast('Eraser mode · make a closed fist to erase strokes or shapes.');
  }
}

function chooseColor(color) {
  currentColor = color;
  document.querySelectorAll('.swatch').forEach(x => x.classList.toggle('active', x.dataset.color === color));
  if (objects.selected) objects.selected.color = color;
  $('trackingNote').textContent = `Brush color selected · ${color.toUpperCase()}`;
}

function add3D(type) {
  const size = Math.min(engine.width, engine.height) * 0.22;
  const nameMap = {
    cube: 'Cube',
    sphere: 'Sphere',
    pyramid: 'Pyramid',
    octahedron: 'Octahedron Diamond',
    cylinder: 'Holo Cylinder'
  };
  const o = {
    type: `3d-${type}`,
    name: nameMap[type] || (type[0].toUpperCase() + type.slice(1)),
    x: engine.width * 0.5 - size / 2 + (Math.random() - 0.5) * engine.width * 0.16,
    y: engine.height * 0.5 - size / 2 + (Math.random() - 0.5) * engine.height * 0.16,
    w: size,
    h: size,
    color: currentColor,
    rx: 0.35,
    ry: 0.55,
    rz: 0,
    rotation: 0
  };
  objects.add(o);
  objects.select(o);
  updateObjectCount();
  $('canvasHint')?.classList.add('hide');
  sfx.snap();
  toast(`${o.name} added · use gestures to manipulate it`);
}

function updateObjectCount() {
  const el = $('objectCount');
  if (el) el.textContent = `${objects.items.length} OBJECT${objects.items.length === 1 ? '' : 'S'}`;
}

function lmDistance(a, b) {
  return { x: a.x - b.x, y: a.y - b.y };
}

function handleGesture(g, p, raw, now) {
  if (g !== prevGesture) {
    prevGesture = g;
    gestureSince = now;
  }
  const stable = now - gestureSince > 160;
  setGesture(g);

  // Palette mode
  if (tool === 'palette') {
    const swatches = [...document.querySelectorAll('.swatch')];
    if (g === 'DRAW' || g === 'TWO FINGERS' || g === 'NAVIGATE') {
      const idx = Math.min(swatches.length - 1, Math.floor(Math.max(0, Math.min(0.999, raw.x)) * swatches.length));
      const sw = swatches[idx];
      if (sw) {
        chooseColor(sw.dataset.color);
        $('trackingNote').textContent = `Color preview ${idx + 1}/${swatches.length} · ${sw.getAttribute('aria-label') || sw.dataset.color}`;
      }
    }
    activeStroke = null;
    lastPoint = null;
    objects.hovered = null;
    return;
  }

  // 3D manipulation mode
  if (tool === '3d') {
    const selected = objects.selected?.type?.startsWith('3d-') ? objects.selected : null;
    objects.hovered = objects.hitTest(p);
    if (g === 'PINCH' && stable) {
      if (!pinchObject) {
        const hit = objects.hitTest(p);
        if (hit?.type?.startsWith('3d-')) {
          pinchObject = hit;
          pinchOffset = { x: p.x - hit.x, y: p.y - hit.y };
          objects.select(hit);
          sfx.grab();
          toast(`Moving ${hit.name} · keep pinching`);
        } else {
          $('trackingNote').textContent = 'Pinch directly over a 3D object to move it.';
        }
      }
      if (pinchObject) {
        pinchObject.x = p.x - pinchOffset.x;
        pinchObject.y = p.y - pinchOffset.y;
      }
    } else {
      if (g === 'TWO FINGERS' && stable && selected) {
        if (lastRotateX !== null) selected.ry += (raw.x - lastRotateX) * 5;
        lastRotateX = raw.x;
      } else {
        lastRotateX = null;
      }

      if (g === 'OPEN PALM' && selected) {
        const width = Math.hypot(
          lmDistance(lastHand.landmarks[5], lastHand.landmarks[17]).x,
          lmDistance(lastHand.landmarks[5], lastHand.landmarks[17]).y
        );
        if (lastPalmWidth !== null) {
          const factor = Math.max(0.92, Math.min(1.08, width / lastPalmWidth));
          selected.w = Math.max(50, Math.min(engine.width * 0.75, selected.w * factor));
          selected.h = Math.max(50, Math.min(engine.height * 0.75, selected.h * factor));
        }
        lastPalmWidth = width;
      } else {
        lastPalmWidth = null;
      }

      if (g !== 'PINCH') pinchObject = null;
    }
    activeStroke = null;
    lastPoint = null;
    return;
  }

  // Select mode
  if (tool === 'select') {
    objects.hovered = objects.hitTest(p);
    $('trackingNote').textContent = objects.hovered
      ? 'Shape found · pinch thumb and index to grab it.'
      : 'Select mode · move your fingertip over a shape, then pinch to grab.';
  } else {
    objects.hovered = null;
  }

  if (g === 'TWO FINGERS' && stable && tool !== 'select' && tool !== '3d') {
    setTool('select');
    pinchObject = null;
    activeStroke = null;
    lastPoint = null;
  }

  if (g === 'DRAW' && stable && tool === 'draw') {
    if (!activeStroke) {
      activeStroke = {
        type: 'stroke',
        color: currentColor,
        size: brushSize,
        points: [],
        opacity: 0.92
      };
      engine.strokes.push(activeStroke);
      undoStack.push({ type: 'stroke', index: engine.strokes.length - 1 });
      redoStack = [];
      $('canvasHint')?.classList.add('hide');
    }
    activeStroke.points.push(p);
    rawPoints.push(raw);
    smoothPoints.push({ x: p.x / engine.width, y: p.y / engine.height });
    if (activeStroke.points.length > 1) {
      engine.drawSegment(activeStroke.points.at(-2), p, activeStroke.color, activeStroke.size);
    }
    lastPoint = p;
  } else if (g === 'PINCH' && stable) {
    if (activeStroke && activeStroke.points.length > 5) finishStroke();
    activeStroke = null;
    lastPoint = null;
    const hit = pinchObject || objects.hitTest(p);
    if (hit) {
      if (pinchObject !== hit) {
        pinchObject = hit;
        pinchOffset = { x: p.x - hit.x, y: p.y - hit.y };
        objects.select(hit);
        $('shapeName').textContent = `Selected · ${hit.name || hit.type}`;
        $('shapeScore').textContent = 'Move your hand while keeping thumb and index pinched';
        sfx.grab();
        toast(`Grabbed ${hit.name || hit.type} · move to reposition`);
      } else {
        hit.x = p.x - pinchOffset.x;
        hit.y = p.y - pinchOffset.y;
      }
    } else {
      pinchObject = null;
      $('trackingNote').textContent = 'No shape under fingertip · move onto a shape before pinching.';
    }
  } else {
    if (activeStroke && activeStroke.points.length > 5) finishStroke();
    activeStroke = null;
    lastPoint = null;
    if (g !== 'PINCH') pinchObject = null;

    if (g === 'FIST' && stable && now - lastGestureEvent > 650) {
      if (objects.selected) {
        const name = objects.selected.name || objects.selected.type;
        objects.remove(objects.selected);
        updateObjectCount();
        sfx.erase();
        toast(`${name} deleted`);
      } else if (engine.strokes.length) {
        engine.strokes.pop();
        engine.render();
        sfx.erase();
        toast('Last stroke erased');
      }
      lastGestureEvent = now;
    }

    if ((g === 'OPEN PALM' || g === 'TWO FINGERS') && rawPoints.length > 10) {
      rawPoints = [];
      smoothPoints = [];
    }
  }

  // Swipe gesture for Undo / Redo
  if (g === 'OPEN PALM' && swipeStart && now - swipeStart.t < 700) {
    const dx = raw.x - swipeStart.x;
    if (Math.abs(dx) > 0.25 && now - swipeCooldown > 1000) {
      dx < 0 ? undo() : redo();
      swipeCooldown = now;
      toast(dx < 0 ? 'Swipe left · undo' : 'Swipe right · redo');
    }
    swipeStart = null;
  } else if (g === 'OPEN PALM' && !swipeStart) {
    swipeStart = { x: raw.x, t: now };
  }
}

function highlightShapeInLibrary(shapeName) {
  document.querySelectorAll('.shape-lib-chip').forEach(chip => {
    const isTarget = chip.dataset.shape === shapeName;
    chip.classList.toggle('active-recognized', isTarget);
    if (isTarget) {
      chip.classList.add('pulse-glow');
      setTimeout(() => chip.classList.remove('pulse-glow'), 1800);
    }
  });
}

function finishStroke() {
  if (!activeStroke || activeStroke.points.length < 6) return;
  drawingCount++;
  evalData.drawingCount = drawingCount;
  $('drawingCount').textContent = drawingCount;

  const result = recognizeShape(activeStroke.points);

  if (autoSnap && result && result.shape !== 'Freeform' && result.shape !== 'Ambiguous' && result.score >= 0.52) {
    const orig = activeStroke.points;
    const newObj = {
      type: result.shape.toLowerCase(),
      name: result.shape,
      x: result.bounds.x,
      y: result.bounds.y,
      w: result.bounds.w,
      h: result.bounds.h,
      color: activeStroke.color,
      rotation: result.rotation || 0,
      points: orig,
      score: result.score
    };
    objects.add(newObj);
    engine.strokes.pop();
    engine.render();

    $('shapeName').textContent = result.shape;
    $('shapeScore').textContent = `Match confidence: ${Math.round(result.score * 100)}% · Snapped cleanly`;
    $('shapeIcon').textContent = symbols[result.shape] || '◇';

    highlightShapeInLibrary(result.shape);

    history.unshift({ shape: result.shape, score: result.score, time: new Date().toLocaleTimeString() });
    history = history.slice(0, 6);
    renderHistory();
    updateObjectCount();

    sfx.snap();
    toast(`✨ ${result.shape} recognized (${Math.round(result.score * 100)}%) · snapped to canvas`);
  } else {
    engine.render();
    $('shapeName').textContent = result?.shape === 'Ambiguous' ? 'Shape unclear' : 'Freeform stroke';
    $('shapeScore').textContent = result?.message || (autoSnap ? 'Try closing the shape more clearly' : 'Auto-snap is off · stroke kept freehand');
  }

  rawPoints = [];
  smoothPoints = [];
  activeStroke = null;
}

function renderHistory() {
  const el = $('shapeHistory');
  if (!el) return;
  el.innerHTML = '';
  if (!history.length) {
    el.innerHTML = '<span class="empty-history">Your recognized shapes will appear here.</span>';
    return;
  }
  history.forEach(h => {
    const item = document.createElement('div');
    item.className = 'history-item';
    item.innerHTML = `
      <span class="history-sym">${symbols[h.shape] || '◇'}</span>
      <span class="history-label"><b>${h.shape}</b><small>${Math.round(h.score * 100)}%</small></span>
    `;
    el.appendChild(item);
  });
}

function updateTelemetry() {
  $('fpsValue').textContent = fps;
  $('dashFps').textContent = fps;
  $('latencyValue').textContent = `${latency.toFixed(1)} ms`;
  $('dashLatency').textContent = latency.toFixed(1);
  $('fpsBar').style.width = `${Math.min(100, (fps / 30) * 100)}%`;
  $('latencyBar').style.width = `${Math.max(3, 100 - Math.min(100, (latency / 100) * 100))}%`;
  evalDashboard.updateLive();
}

function snapshot() {
  return { strokes: structuredClone(engine.strokes), objects: structuredClone(objects.items) };
}
function restore(s) {
  engine.strokes = structuredClone(s.strokes);
  objects.items = structuredClone(s.objects);
  engine.render();
  objects.render();
  updateObjectCount();
}

function undo() {
  if (!engine.strokes.length && !objects.items.length) return;
  redoStack.push(snapshot());
  if (objects.items.length) {
    objects.items.pop();
  } else {
    engine.strokes.pop();
  }
  engine.render();
  objects.render();
  updateObjectCount();
  sfx.blip();
  toast('Undo complete');
}

function redo() {
  const s = redoStack.pop();
  if (s) {
    undoStack.push(snapshot());
    restore(s);
    sfx.blip();
    toast('Redo complete');
  }
}

// Mouse / Touch drawing on the main canvas (fallback or pair mode)
const drawCanvas = $('drawCanvas');
if (drawCanvas) {
  const getCanvasPos = e => {
    const r = drawCanvas.getBoundingClientRect();
    const dpr = Math.min(devicePixelRatio || 1, 2);
    return {
      x: (e.clientX - r.left) * (drawCanvas.width / r.width),
      y: (e.clientY - r.top) * (drawCanvas.height / r.height)
    };
  };

  drawCanvas.addEventListener('pointerdown', e => {
    if (tool !== 'draw' && tool !== 'select') return;
    const pt = getCanvasPos(e);
    if (tool === 'select') {
      const hit = objects.hitTest(pt);
      if (hit) {
        objects.select(hit);
        pinchObject = hit;
        pinchOffset = { x: pt.x - hit.x, y: pt.y - hit.y };
        sfx.grab();
      }
      return;
    }
    isPointerDrawing = true;
    activeStroke = {
      type: 'stroke',
      color: currentColor,
      size: brushSize,
      points: [pt],
      opacity: 0.95
    };
    engine.strokes.push(activeStroke);
    undoStack.push({ type: 'stroke', index: engine.strokes.length - 1 });
    redoStack = [];
    $('canvasHint')?.classList.add('hide');
  });

  drawCanvas.addEventListener('pointermove', e => {
    const pt = getCanvasPos(e);
    if (tool === 'select' && pinchObject) {
      pinchObject.x = pt.x - pinchOffset.x;
      pinchObject.y = pt.y - pinchOffset.y;
      objects.render();
      return;
    }
    if (!isPointerDrawing || !activeStroke) return;
    activeStroke.points.push(pt);
    if (activeStroke.points.length > 1) {
      engine.drawSegment(activeStroke.points.at(-2), pt, activeStroke.color, activeStroke.size);
    }
  });

  const stopPointer = () => {
    if (tool === 'select') {
      pinchObject = null;
      return;
    }
    if (isPointerDrawing && activeStroke) {
      isPointerDrawing = false;
      finishStroke();
    }
  };
  drawCanvas.addEventListener('pointerup', stopPointer);
  drawCanvas.addEventListener('pointercancel', stopPointer);
}

// Interactive Quick-Try Pad on Landing Screen
const quickCanvas = $('quickCanvas');
if (quickCanvas) {
  const qctx = quickCanvas.getContext('2d');
  let qPoints = [];
  let isQDrawing = false;

  const sizeQuickCanvas = () => {
    const r = quickCanvas.getBoundingClientRect();
    if (r.width && r.height) {
      quickCanvas.width = r.width * 2;
      quickCanvas.height = r.height * 2;
      drawQuickGrid();
    }
  };
  sizeQuickCanvas();
  window.addEventListener('resize', sizeQuickCanvas);

  function drawQuickGrid() {
    qctx.clearRect(0, 0, quickCanvas.width, quickCanvas.height);
    qctx.strokeStyle = 'rgba(82, 246, 255, 0.06)';
    qctx.lineWidth = 1;
    const step = 28;
    for (let x = 0; x < quickCanvas.width; x += step) {
      qctx.beginPath(); qctx.moveTo(x, 0); qctx.lineTo(x, quickCanvas.height); qctx.stroke();
    }
    for (let y = 0; y < quickCanvas.height; y += step) {
      qctx.beginPath(); qctx.moveTo(0, y); qctx.lineTo(quickCanvas.width, y); qctx.stroke();
    }
  }

  const getQPos = e => {
    const r = quickCanvas.getBoundingClientRect();
    return {
      x: (e.clientX - r.left) * (quickCanvas.width / r.width),
      y: (e.clientY - r.top) * (quickCanvas.height / r.height)
    };
  };

  quickCanvas.addEventListener('pointerdown', e => {
    isQDrawing = true;
    qPoints = [getQPos(e)];
    drawQuickGrid();
    $('quickHint')?.classList.add('hide');
  });

  quickCanvas.addEventListener('pointermove', e => {
    if (!isQDrawing) return;
    const pt = getQPos(e);
    qPoints.push(pt);
    if (qPoints.length > 1) {
      qctx.save();
      qctx.strokeStyle = '#52f6ff';
      qctx.lineWidth = 6;
      qctx.lineCap = 'round';
      qctx.lineJoin = 'round';
      qctx.shadowColor = '#52f6ff';
      qctx.shadowBlur = 12;
      const prev = qPoints.at(-2);
      qctx.beginPath();
      qctx.moveTo(prev.x, prev.y);
      qctx.lineTo(pt.x, pt.y);
      qctx.stroke();
      qctx.restore();
    }
  });

  const finishQuick = () => {
    if (!isQDrawing) return;
    isQDrawing = false;
    if (qPoints.length > 8) {
      const pred = recognizeShape(qPoints);
      const resEl = $('quickResult');
      if (resEl) {
        if (pred && pred.shape !== 'Freeform' && pred.shape !== 'Ambiguous') {
          resEl.innerHTML = `Recognized: <b>${symbols[pred.shape] || ''} ${pred.shape}</b> (${Math.round(pred.score * 100)}%)`;
          resEl.classList.add('highlight');
          sfx.snap();
        } else {
          resEl.innerHTML = `Sketch finished · try a closed Circle, Star, Heart, or Triangle!`;
          resEl.classList.remove('highlight');
        }
      }
    }
  };
  quickCanvas.addEventListener('pointerup', finishQuick);
  quickCanvas.addEventListener('pointercancel', finishQuick);

  $('clearQuickBtn')?.addEventListener('click', () => {
    drawQuickGrid();
    qPoints = [];
    $('quickResult').textContent = 'Draw any shape in the pad above to test recognition';
    $('quickResult').classList.remove('highlight');
  });
}

// Workspace Toolbar Handlers
$('undoBtn').onclick = undo;
$('redoBtn').onclick = redo;

$('clearBtn').onclick = () => {
  engine.clear();
  objects.clear();
  activeStroke = null;
  updateObjectCount();
  $('canvasHint')?.classList.remove('hide');
  sfx.erase();
  toast('Canvas cleared');
};

$('saveBtn').onclick = () => {
  const a = document.createElement('a');
  a.download = `holosketch-${Date.now()}.png`;
  a.href = engine.canvas.toDataURL('image/png');
  a.click();
  toast('Drawing saved as high-res PNG');
};

$('clearHistoryBtn')?.addEventListener('click', () => {
  history = [];
  renderHistory();
  toast('Shape history cleared');
});

// Auto-snap toggle
const snapBtn = $('snapToggleBtn');
if (snapBtn) {
  snapBtn.onclick = () => {
    autoSnap = !autoSnap;
    snapBtn.classList.toggle('active', autoSnap);
    snapBtn.querySelector('small').textContent = autoSnap ? 'Snap: ON' : 'Snap: OFF';
    toast(autoSnap ? 'Auto-snap enabled · shapes snap to geometry' : 'Auto-snap disabled · strokes remain freehand');
  };
}

// Grid mode toggle
const gridBtn = $('gridBtn');
if (gridBtn) {
  const modes = ['cyber', 'dots', 'hex', 'none'];
  const labels = { cyber: 'Grid: Cyber', dots: 'Grid: Dots', hex: 'Grid: Hex', none: 'Grid: Off' };
  gridBtn.onclick = () => {
    const curIdx = modes.indexOf(engine.gridMode);
    const nextMode = modes[(curIdx + 1) % modes.length];
    engine.setGridMode(nextMode);
    gridBtn.querySelector('small').textContent = labels[nextMode];
    toast(`Canvas pattern set to ${labels[nextMode]}`);
  };
}

// Sound toggle
const soundBtn = $('soundBtn');
if (soundBtn) {
  soundBtn.onclick = () => {
    sfx.enabled = !sfx.enabled;
    soundBtn.classList.toggle('active', sfx.enabled);
    soundBtn.title = sfx.enabled ? 'Mute sound effects' : 'Unmute sound effects';
    soundBtn.textContent = sfx.enabled ? '🔊' : '🔇';
    toast(sfx.enabled ? 'Sound effects enabled' : 'Sound effects muted');
  };
}

// Fullscreen toggle
const fsBtn = $('fullscreenBtn');
if (fsBtn) {
  fsBtn.onclick = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.();
      fsBtn.textContent = '⤓';
    } else {
      document.exitFullscreen?.();
      fsBtn.textContent = '⤢';
    }
  };
}

// Tool Selection
document.querySelectorAll('.tool-btn').forEach(b => {
  b.onclick = () => {
    setTool(b.dataset.tool);
    pinchObject = null;
  };
});

// Color Swatches
document.querySelectorAll('.swatch').forEach(b => {
  b.onclick = () => chooseColor(b.dataset.color);
  b.onpointerenter = () => {
    if (tool === 'palette') chooseColor(b.dataset.color);
  };
});

$('customColor')?.addEventListener('input', e => chooseColor(e.target.value));

// 3D Controls
document.querySelectorAll('[data-3d]').forEach(b => {
  b.onclick = () => {
    setTool('3d');
    add3D(b.dataset['3d']);
  };
});

$('rotate3dBtn')?.addEventListener('click', () => {
  if (objects.selected?.type?.startsWith('3d-')) {
    objects.selected.ry += Math.PI / 8;
    objects.render();
  } else {
    toast('Select a 3D object first to rotate it');
  }
});

$('scale3dBtn')?.addEventListener('click', () => {
  if (objects.selected?.type?.startsWith('3d-')) {
    objects.selected.w *= 1.15;
    objects.selected.h *= 1.15;
    objects.render();
  } else {
    toast('Select a 3D object first to scale it');
  }
});

// Brush Size
const brushSlider = $('brushSize');
if (brushSlider) {
  brushSlider.oninput = e => {
    brushSize = +e.target.value;
    const sv = $('sizeValue');
    if (sv) sv.textContent = brushSize;
    const dot = $('sizeDotPreview');
    if (dot) dot.style.transform = `scale(${brushSize / 6})`;
  };
}

// Interactive Shape Library Chips (Click to stamp directly onto canvas)
document.querySelectorAll('.shape-lib-chip').forEach(chip => {
  chip.onclick = () => {
    const shapeType = chip.dataset.shape;
    if (!shapeType) return;
    const W = engine.width, H = engine.height;
    const size = Math.min(W, H) * 0.22;
    const rx = size * (shapeType === 'Oval' || shapeType === 'Rectangle' ? 0.6 : 0.5);
    const ry = size * (shapeType === 'Oval' || shapeType === 'Rectangle' ? 0.35 : 0.5);
    const newObj = {
      type: shapeType.toLowerCase(),
      name: shapeType,
      x: W * 0.5 - size / 2 + (Math.random() - 0.5) * 80,
      y: H * 0.5 - size / 2 + (Math.random() - 0.5) * 80,
      w: size,
      h: size,
      color: currentColor,
      rotation: 0,
      score: 1.0
    };
    objects.add(newObj);
    objects.select(newObj);
    updateObjectCount();
    $('canvasHint')?.classList.add('hide');
    sfx.snap();
    toast(`Stamped ${shapeType} onto canvas · pinch to grab & move`);
  };
});

// AI Assistant
function assistantShape(type, x, y, w, h, color, name = type) {
  objects.add({ type, name, x, y, w, h, color, rotation: 0, score: 1 });
}

function runAssistant(prompt) {
  const q = prompt.toLowerCase();
  objects.clear();
  engine.clear();
  const W = engine.width, H = engine.height, cx = W * 0.5, base = H * 0.72, unit = Math.min(W, H) * 0.16;
  const cyan = currentColor, pink = '#ff5edb', green = '#58f5a8', yellow = '#ffcf5a', purple = '#b58cff', white = '#ffffff';
  let label = 'custom composition';

  if (q.includes('house') || q.includes('home')) {
    label = 'Cyber House';
    assistantShape('rectangle', cx - unit * 0.65, base - unit * 1.25, unit * 1.3, unit * 1.25, cyan, 'House Body');
    assistantShape('triangle', cx - unit * 0.8, base - unit * 2.05, unit * 1.6, unit * 0.95, pink, 'Neon Roof');
    assistantShape('rectangle', cx - unit * 0.16, base - unit * 0.62, unit * 0.32, unit * 0.62, yellow, 'Door');
    assistantShape('square', cx - unit * 0.5, base - unit * 0.95, unit * 0.28, unit * 0.28, purple, 'Left Window');
    assistantShape('square', cx + unit * 0.22, base - unit * 0.95, unit * 0.28, unit * 0.28, purple, 'Right Window');
  } else if (q.includes('rocket') || q.includes('space')) {
    label = 'Deep Space Rocket';
    assistantShape('triangle', cx - unit * 0.38, base - unit * 2.15, unit * 0.76, unit * 0.75, pink, 'Nose Cone');
    assistantShape('rectangle', cx - unit * 0.38, base - unit * 1.45, unit * 0.76, unit * 1.35, cyan, 'Fuselage');
    assistantShape('triangle', cx - unit * 0.65, base - unit * 0.55, unit * 0.42, unit * 0.52, purple, 'Left Fin');
    assistantShape('triangle', cx + unit * 0.23, base - unit * 0.55, unit * 0.42, unit * 0.52, purple, 'Right Fin');
    assistantShape('circle', cx - unit * 0.15, base - unit * 1.15, unit * 0.3, unit * 0.3, yellow, 'Porthole');
    assistantShape('star', cx - unit * 1.4, base - unit * 2.1, unit * 0.35, unit * 0.35, white, 'Star');
    assistantShape('star', cx + unit * 1.2, base - unit * 1.8, unit * 0.4, unit * 0.4, yellow, 'Star');
    assistantShape('triangle', cx - unit * 0.22, base, unit * 0.44, unit * 0.45, yellow, 'Thruster Flame');
  } else if (q.includes('castle') || q.includes('fortress')) {
    label = 'Holographic Castle';
    assistantShape('rectangle', cx - unit * 1.2, base - unit * 1.1, unit * 2.4, unit * 1.1, cyan, 'Castle Wall');
    assistantShape('rectangle', cx - unit * 1.35, base - unit * 1.7, unit * 0.5, unit * 1.7, purple, 'Left Tower');
    assistantShape('rectangle', cx + unit * 0.85, base - unit * 1.7, unit * 0.5, unit * 1.7, purple, 'Right Tower');
    assistantShape('triangle', cx - unit * 1.35, base - unit * 2.3, unit * 0.5, unit * 0.65, pink, 'Left Spire');
    assistantShape('triangle', cx + unit * 0.85, base - unit * 2.3, unit * 0.5, unit * 0.65, pink, 'Right Spire');
    assistantShape('diamond', cx - unit * 0.15, base - unit * 1.5, unit * 0.3, unit * 0.45, yellow, 'Banner Gem');
    assistantShape('rectangle', cx - unit * 0.22, base - unit * 0.7, unit * 0.44, unit * 0.7, yellow, 'Drawbridge');
  } else if (q.includes('crown') || q.includes('gem') || q.includes('royal')) {
    label = 'Royal Gem Crown';
    assistantShape('rectangle', cx - unit * 1.1, base - unit * 0.45, unit * 2.2, unit * 0.45, yellow, 'Crown Band');
    assistantShape('triangle', cx - unit * 1.1, base - unit * 1.3, unit * 0.7, unit * 0.85, yellow, 'Left Peak');
    assistantShape('triangle', cx - unit * 0.45, base - unit * 1.6, unit * 0.9, unit * 1.15, yellow, 'Center Peak');
    assistantShape('triangle', cx + unit * 0.4, base - unit * 1.3, unit * 0.7, unit * 0.85, yellow, 'Right Peak');
    assistantShape('diamond', cx - unit * 0.15, base - unit * 1.8, unit * 0.3, unit * 0.45, cyan, 'Center Diamond');
    assistantShape('heart', cx - unit * 0.2, base - unit * 0.38, unit * 0.4, unit * 0.35, pink, 'Center Heart');
    assistantShape('star', cx - unit * 1.0, base - unit * 1.45, unit * 0.3, unit * 0.3, pink, 'Star Gem');
    assistantShape('star', cx + unit * 0.7, base - unit * 1.45, unit * 0.3, unit * 0.3, pink, 'Star Gem');
  } else if (q.includes('love') || q.includes('heart') || q.includes('valentine')) {
    label = 'Valentine Hologram';
    assistantShape('heart', cx - unit * 0.9, base - unit * 1.6, unit * 1.8, unit * 1.6, pink, 'Grand Heart');
    assistantShape('heart', cx - unit * 0.45, base - unit * 1.25, unit * 0.9, unit * 0.8, purple, 'Inner Heart');
    assistantShape('star', cx - unit * 1.2, base - unit * 1.9, unit * 0.4, unit * 0.4, yellow, 'Sparkle');
    assistantShape('star', cx + unit * 0.8, base - unit * 1.9, unit * 0.4, unit * 0.4, yellow, 'Sparkle');
    assistantShape('diamond', cx - unit * 0.12, base - unit * 0.25, unit * 0.25, unit * 0.35, cyan, 'Gem');
  } else if (q.includes('flower') || q.includes('nature')) {
    label = 'Neon Flower';
    assistantShape('rectangle', cx - unit * 0.07, base - unit * 1.45, unit * 0.14, unit * 1.45, green, 'Stem');
    assistantShape('circle', cx - unit * 0.22, base - unit * 1.65, unit * 0.44, unit * 0.44, yellow, 'Center');
    for (let i = 0; i < 6; i++) {
      const a = (i * Math.PI) / 3;
      assistantShape(
        'oval',
        cx + Math.cos(a) * unit * 0.45 - unit * 0.22,
        base - unit * 1.65 + Math.sin(a) * unit * 0.45 - unit * 0.22,
        unit * 0.44,
        unit * 0.44,
        pink,
        'Petal'
      );
    }
  } else if (q.includes('robot') || q.includes('bot') || q.includes('cyborg')) {
    label = 'Cybernetic Robot';
    assistantShape('rectangle', cx - unit * 0.55, base - unit * 1.25, unit * 1.1, unit * 0.9, cyan, 'Chassis');
    assistantShape('hexagon', cx - unit * 0.45, base - unit * 2.1, unit * 0.9, unit * 0.8, purple, 'Hex Head');
    assistantShape('circle', cx - unit * 0.28, base - unit * 1.82, unit * 0.15, unit * 0.15, green, 'Left Sensor');
    assistantShape('circle', cx + unit * 0.13, base - unit * 1.82, unit * 0.15, unit * 0.15, green, 'Right Sensor');
    assistantShape('rectangle', cx - unit * 0.75, base - unit * 1.2, unit * 0.2, unit * 0.65, pink, 'Left Arm');
    assistantShape('rectangle', cx + unit * 0.55, base - unit * 1.2, unit * 0.2, unit * 0.65, pink, 'Right Arm');
    assistantShape('diamond', cx - unit * 0.18, base - unit * 0.9, unit * 0.36, unit * 0.45, yellow, 'Core Reactor');
  } else if (q.includes('galaxy') || q.includes('stars')) {
    label = 'Cosmic Constellation';
    assistantShape('circle', cx - unit * 1.2, base - unit * 1.8, unit * 1.2, unit * 1.2, cyan, 'Planet');
    assistantShape('oval', cx - unit * 1.45, base - unit * 1.4, unit * 1.7, unit * 0.4, purple, 'Planetary Ring');
    assistantShape('star', cx + unit * 0.6, base - unit * 2.1, unit * 0.6, unit * 0.6, yellow, 'Supernova');
    assistantShape('star', cx + unit * 1.2, base - unit * 1.2, unit * 0.4, unit * 0.4, pink, 'Star');
    assistantShape('star', cx - unit * 0.2, base - unit * 0.6, unit * 0.35, unit * 0.35, green, 'Star');
    assistantShape('diamond', cx + unit * 0.2, base - unit * 1.4, unit * 0.3, unit * 0.4, white, 'Pulsar');
  } else {
    label = 'Geometric Symphony';
    assistantShape('pentagon', cx - unit * 1.1, base - unit * 1.7, unit * 0.95, unit * 0.95, cyan, 'Pentagon');
    assistantShape('hexagon', cx + unit * 0.25, base - unit * 1.7, unit * 0.95, unit * 0.95, purple, 'Hexagon');
    assistantShape('star', cx - unit * 0.35, base - unit * 2.3, unit * 0.7, unit * 0.7, yellow, 'Star');
    assistantShape('heart', cx - unit * 0.35, base - unit * 0.9, unit * 0.7, unit * 0.7, pink, 'Heart');
  }

  updateObjectCount();
  $('canvasHint')?.classList.add('hide');
  const respEl = $('assistantResponse');
  if (respEl) {
    respEl.textContent = `Generated a ${label} with ${objects.items.length} editable holographic shapes. Click Select to rearrange, resize, or recolor!`;
  }
  $('shapeName').textContent = `AI Composition · ${label}`;
  $('shapeScore').textContent = `${objects.items.length} interactive objects generated`;
  sfx.snap();
  toast(`✨ Created ${label} composition`);
}

$('assistantForm')?.addEventListener('submit', e => {
  e.preventDefault();
  const prompt = $('assistantPrompt').value.trim();
  if (!prompt) {
    $('assistantResponse').textContent = 'Enter a prompt first, such as “create a galaxy with stars” or “royal crown with gems”.';
    return;
  }
  runAssistant(prompt);
});

document.querySelectorAll('[data-prompt]').forEach(b => {
  b.onclick = () => {
    $('assistantPrompt').value = b.dataset.prompt;
    runAssistant(b.dataset.prompt);
  };
});

// Dialogs & Modals
const guide = $('guideDialog');
$('tutorialBtn')?.addEventListener('click', () => guide?.showModal());
$('openGuide')?.addEventListener('click', () => guide?.showModal());
$('closeGuide')?.addEventListener('click', () => guide?.close());
$('guideGotIt')?.addEventListener('click', () => guide?.close());

$('settingsBtn')?.addEventListener('click', () => {
  toast('Settings: choose brush size, color swatch, canvas grid, and auto-snap in the workspace controls.');
});

$('evaluationBtn')?.addEventListener('click', () => {
  const panel = $('evaluationPanel');
  if (!panel) return;
  panel.classList.toggle('hidden');
  if (!panel.classList.contains('hidden')) {
    evalDashboard.render();
    panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
});

$('resetEvalBtn')?.addEventListener('click', () => {
  evalData.live = [];
  evalData.rawJitter = [];
  evalData.smoothJitter = [];
  evalData.gestureCount = 0;
  evalData.drawingCount = 0;
  evalDashboard.render();
  toast('Live evaluation session data reset. Synthetic test benchmark preserved.');
});

$('exportJsonBtn')?.addEventListener('click', () => {
  downloadText('holosketch-evaluation.json', JSON.stringify(evalDashboard.getReport(), null, 2), 'application/json');
});

$('exportCsvBtn')?.addEventListener('click', () => {
  downloadText('holosketch-evaluation.csv', evalDashboard.toCSV(), 'text/csv');
});

function downloadText(name, text, type) {
  const blob = new Blob([text], { type });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  URL.revokeObjectURL(a.href);
}

// Initialize dataset and evaluation dashboard
const dataset = makeSyntheticDataset();
evalData.test = dataset;
evalDashboard.setEvaluation(evaluateDataset(dataset));
evalDashboard.render();
