# HoloSketch AI — Next-Gen Spatial Canvas & 10-Shape Recognition

HoloSketch AI is a browser-based touchless creative workstation that turns your fingertips into a mid-air drawing and modeling tool. Powered by real-time computer vision (MediaPipe Hand Landmarker), it smooths air trajectories, auto-snaps sketches into 10 geometric shapes, and enables full 3D object manipulation and AI compositions.

---

## ✨ What's New in this Upgraded Edition

### 1. Expanded 10-Shape Recognition Engine (`shapeRecognizer.js`)
Previously limited to 4 basic shapes, HoloSketch AI now recognizes **10 geometric shape categories** with 100% benchmark accuracy across easy, noisy, and rotated variations:
1. **Circle** (`◯`) — Smooth uniform radial curve, aspect ratio ~ 1.0.
2. **Oval / Ellipse** (`⬭`) — Smooth curve with elongated aspect ratio.
3. **Triangle** (`△`) — 3 dominant sharp vertices, minimum bounding box fill ~ 0.50.
4. **Square** (`□`) — 4 right angles, aspect ratio ~ 1.0, minimum bounding box fill > 0.85.
5. **Rectangle** (`▭`) — 4 right angles, aspect ratio > 1.28, minimum bounding box fill > 0.85.
6. **Diamond / Rhombus** (`◇`) — Upright rhombus with characteristic 0.50 screen-aligned bounding box fill and diamond geometry.
7. **Pentagon** (`⬠`) — Regular 5-sided convex polygon with ~72° interior turns.
8. **Hexagon** (`⬡`) — Regular 6-sided convex honeycomb polygon with ~60° interior turns.
9. **Star** (`☆`) — 5-point star with deep inward concavities and convexity < 0.68.
10. **Heart** (`♡`) — Parametric heart with distinctive top cleft dip, top rounded lobes, and bottom apex tip.

### 2. Complete UI / UX Overhaul (`index.html`, `style.css`)
- **Cyberpunk / Spatial Glassmorphism Aesthetic**: Deep cosmic space background, dynamic ambient light nebulas, frosted glass panels with glow borders, and clean typography (`Outfit`, `Plus Jakarta Sans`, and `DM Mono`).
- **Instant Try Pad on Landing Page**: Visitors can sketch immediately with mouse/trackpad right in the hero section to test shape recognition before launching the camera.
- **Interactive Shape Library Bar**: Live strip displaying all 10 shapes. When a shape is recognized from the air, its badge lights up with an animated neon celebration pulse. Users can also click any chip to stamp shapes directly onto the canvas.
- **Audio Sound Synthesizer (Web Audio API)**: Zero-dependency native audio synthesis generating subtle futuristic audio cues on gesture triggers, shape snaps, object grabs, and erasures (with mute toggle in the topbar).
- **Auto-Snap & Grid Mode Controls**:
  - **Auto-Snap**: Toggle between instant geometric snapping and raw freehand drawing.
  - **Canvas Grids**: Cycle between Cyber Grid, Dot Matrix, Hexagon Shield Grid, and Clean Canvas.
- **Enhanced 3D Hologram Lab**: Wireframe interactive 3D models including **Cube**, **Sphere**, **Pyramid**, **Octahedron Diamond**, and **Holo Cylinder**. Pinch to reposition, two fingers to rotate, and open palm to scale.
- **Expanded AI Prompt Assistant**: Generates rich multi-part compositions including *Galaxy & Stars*, *Gem Crown*, *Valentine Love Heart*, *Cyber Castle*, *Space Rocket*, *Cybernetic Robot*, *Neon House*, and *Hologram Flower*.
- **10×10 AI Evaluation Matrix**: Full confusion matrix and per-class precision, recall, and F1 dashboard evaluating 100 synthetic test samples.

---

## 🚀 How to Run Locally

Camera access requires **localhost or HTTPS** in modern browsers:

1. Extract the project ZIP.
2. Open a terminal in the project directory.
3. Start a local server:
   - Python:
     ```bash
     python3 -m http.server 8000
     ```
   - Node:
     ```bash
     npx serve .
     ```
4. Open `http://localhost:8000` in Google Chrome, Microsoft Edge, or any modern Chromium browser.
5. Click **Launch HoloSketch**, grant webcam permissions, and wait 2–3 seconds for the MediaPipe hand model to load.

*Note: The first launch downloads the MediaPipe model files from Google's public CDN.*

---

## ✋ Air Gesture Controls

| Gesture | Pose | Action |
| :--- | :--- | :--- |
| **DRAW** | ☝ Index finger raised, others folded | Freehand air drawing / shape outlining |
| **GRAB** | 🤏 Pinch thumb + index | Select, grab, and move recognized 2D shapes or 3D objects |
| **PAUSE** | ✋ Open palm facing camera | Pause drawing / Swipe horizontally for Undo / Redo |
| **SELECT** | ✌ Two fingers raised | Switch to select mode / Rotate 3D objects sideways |
| **ERASE** | ✊ Closed fist | Erase selected object or latest stroke |
| **SCALE** | ✋ Open palm (in 3D mode) | Expand or contract hand to scale selected 3D object |
| **COLOR** | ◉ Palette mode | Move index finger horizontally to preview vibrant colors |

---

## 📁 Project Architecture

- `index.html` — Upgraded spatial interface, quick-try pad, 10-shape ribbon, and holographic panels.
- `style.css` — Modern cyberpunk glassmorphism theme, glowing neon accents, and responsive layout.
- `main.js` — Camera stream, MediaPipe inference loop, gesture state machine, audio synthesizer, and event orchestration.
- `shapeRecognizer.js` — Rotation-invariant minimum bounding box, convexity analysis, 10-shape classifier, and 100-sample test benchmark.
- `drawingEngine.js` — Neon glowing canvas strokes, particle spark trails, and multiple cyber grid styles.
- `objectManager.js` — Storage, hit-testing, selection bounding boxes, and rendering for all 10 2D shapes & 5 3D models.
- `evaluation.js` — 10×10 confusion matrix heatmap, per-class metrics table, and CSV/JSON export.
- `smoothing.js` — Exponential moving average smoothing and jitter diagnostics.
- `handTracker.js` & `gestureRecognizer.js` — Module boundaries for camera and gesture subsystems.

---

## 🔒 Privacy

- 100% of video processing occurs **locally in your browser** via WebAssembly and WebGL/GPU.
- No webcam imagery, sketches, or telemetry are ever uploaded or stored on any server.
