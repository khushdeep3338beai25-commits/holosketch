
# ✨ HoloSketch AI — Next-Gen Spatial Canvas & 10-Shape Recognition

> **Turn your fingertips into a creative instrument.**  
> A browser-based, touchless spatial drawing and 3D modeling workstation powered by real-time AI hand tracking and computer vision.

HoloSketch AI transforms natural hand movements into digital creativity. Using Google's MediaPipe Hand Landmarker, it enables users to draw in mid-air, recognize geometric shapes, manipulate 3D holographic objects, and generate AI-inspired compositions — all through intuitive hand gestures.

No physical drawing tablet. No touch required. Just your hands and imagination.

---

## 🌌 Project Overview

HoloSketch AI combines computer vision, gesture recognition, geometric analysis, and interactive canvas rendering to create an immersive spatial creative environment.

The application features a futuristic cyberpunk interface with neon holographic elements, glassmorphism panels, ambient lighting, and interactive 2D and 3D workspaces.

---

## 🚀 What's New in This Edition

### 1. Expanded 10-Shape Recognition Engine

The upgraded `shapeRecognizer.js` recognizes 10 geometric categories using geometric properties, curvature analysis, vertex detection, bounding boxes, and shape-specific classification rules.

| Shape | Symbol | Recognition Characteristics |
|---|---|---|
| Circle | ◯ | Smooth, uniform radial curvature |
| Oval / Ellipse | ⬭ | Smooth curve with elongated aspect ratio |
| Triangle | △ | Three dominant vertices |
| Square | □ | Four right angles and balanced dimensions |
| Rectangle | ▭ | Four right angles and elongated dimensions |
| Diamond / Rhombus | ◇ | Four characteristic diagonal vertices |
| Pentagon | ⬠ | Five-sided convex polygon |
| Hexagon | ⬡ | Six-sided convex polygon |
| Star | ☆ | Five-point concave geometry |
| Heart | ♡ | Rounded lobes, central cleft, and bottom apex |

**Recognition capabilities:**
- Rotation-tolerant geometric classification.
- Noisy trajectory handling.
- Minimum bounding box analysis.
- Convexity and concavity detection.
- Automatic shape correction and snapping.

The project includes a synthetic 100-sample evaluation benchmark. Actual recognition performance should be validated against independent real-world gesture samples before claiming production accuracy.

### 2. Cyberpunk Spatial UI / UX

The interface has been redesigned with a futuristic spatial computing aesthetic.

**Visual features:**
- Deep cosmic backgrounds.
- Dynamic ambient light nebulas.
- Frosted glass interface panels.
- Neon glowing borders and accents.
- Animated holographic elements.
- Modern typography using Outfit, Plus Jakarta Sans, and DM Mono.
- Responsive layouts for different screen sizes.

### 3. Instant Try Pad

Users can experiment with drawing directly from the landing page without activating their webcam.

Features:
- Mouse and trackpad drawing.
- Real-time stroke rendering.
- Automatic shape recognition.
- Interactive shape previews.
- Quick access to the creative workspace.

### 4. Interactive Shape Library

A dedicated shape library displays all 10 supported geometric shapes.

Users can:
- Browse available shapes.
- Click shape chips to stamp shapes onto the canvas.
- View recognition feedback.
- See animated neon highlights when a shape is recognized.
- Experiment with geometric compositions.

### 5. Audio Sound Synthesizer

HoloSketch AI uses the native Web Audio API to generate futuristic sound effects without requiring external audio libraries.

Audio feedback includes:
- Gesture activation sounds.
- Shape recognition effects.
- Object selection sounds.
- Grab and manipulation feedback.
- Erasure effects.
- Mute / unmute functionality.

### 6. Auto-Snap & Canvas Grid Modes

**Auto-Snap Controls**

Switch between:
- Auto-Snap ON — Automatically converts recognized sketches into geometric shapes.
- Auto-Snap OFF — Preserves original freehand drawing trajectories.

**Available Canvas Modes**

| Grid Mode | Description |
|---|---|
| Cyber Grid | Futuristic glowing grid |
| Dot Matrix | Minimal dotted background |
| Hexagon Shield | Hexagonal geometric grid |
| Clean Canvas | Minimal distraction-free workspace |

### 7. Interactive 3D Hologram Lab

Explore and manipulate five wireframe 3D models.

<details>
<summary>Available 3D Models</summary>

1. Cube
2. Sphere
3. Pyramid
4. Octahedron Diamond
5. Holo Cylinder

</details>

**3D Interaction Controls:**
- Pinch gestures to reposition objects.
- Two-finger gestures to rotate objects.
- Open-palm gestures to scale objects.
- Interactive object selection and manipulation.

### 8. AI Prompt Assistant

The AI Prompt Assistant generates multi-element creative compositions using predefined visual concepts.

**Available compositions:**

- Galaxy & Stars
- Gem Crown
- Valentine Love Heart
- Cyber Castle
- Space Rocket
- Cybernetic Robot
- Neon House
- Hologram Flower

These compositions expand the creative possibilities beyond basic geometric drawing.

### 9. Shape Recognition Evaluation Dashboard

The evaluation module provides a structured overview of shape classification performance.

**Dashboard features:**
- 10×10 confusion matrix.
- Per-class precision.
- Per-class recall.
- Per-class F1-score.
- Synthetic test sample evaluation.
- CSV export.
- JSON export.

The evaluation dashboard helps identify classification errors and analyze recognition performance across all supported shape categories.

---

## ✋ Air Gesture Controls

HoloSketch AI uses intuitive hand gestures to control the creative workspace.

| Gesture | Hand Pose | Action |
|---|---|---|
| DRAW | ☝ Index finger raised | Draw and outline shapes in the air |
| GRAB | 🤏 Thumb and index pinch | Select, grab, and move objects |
| PAUSE | ✋ Open palm | Pause drawing |
| UNDO / REDO | ✋ Horizontal palm swipe | Navigate drawing history |
| SELECT | ✌ Two fingers raised | Activate selection mode |
| ROTATE | ✌ Two-finger movement | Rotate 3D objects |
| ERASE | ✊ Closed fist | Erase selected object or latest stroke |
| SCALE | ✋ Open palm in 3D mode | Scale selected 3D object |
| COLOR | ◉ Palette mode | Preview and select vibrant colors |

*Gesture recognition depends on camera positioning, lighting, hand visibility, and tracking stability.*

---

## 🛠️ Technology Stack

| Technology | Purpose |
|---|---|
| HTML5 | Application structure |
| CSS3 | Styling, animations, and glassmorphism |
| JavaScript ES6+ | Application logic |
| MediaPipe Hand Landmarker | Real-time hand tracking |
| Canvas API | 2D drawing and rendering |
| Web Audio API | Procedural sound synthesis |
| WebGL / GPU | Accelerated visual processing |
| Computer Vision | Shape and gesture recognition |

---

## 📁 Project Architecture

```text
HoloSketch-AI/
│
├── index.html
├── style.css
│
├── main.js
├── shapeRecognizer.js
├── drawingEngine.js
├── objectManager.js
├── evaluation.js
├── smoothing.js
│
├── handTracker.js
├── gestureRecognizer.js
│
├── assets/
│
└── README.md
```

### Core Modules

| File | Responsibility |
|---|---|
| `index.html` | Main spatial interface, landing page, and workspace |
| `style.css` | Cyberpunk theme, animations, responsive styling |
| `main.js` | Main application orchestration and event handling |
| `shapeRecognizer.js` | 10-shape classification and geometric analysis |
| `drawingEngine.js` | Canvas rendering, neon strokes, and grid modes |
| `objectManager.js` | Object storage, selection, hit-testing, and rendering |
| `evaluation.js` | Confusion matrix, metrics, and data exports |
| `smoothing.js` | Trajectory smoothing and jitter diagnostics |
| `handTracker.js` | Camera stream and MediaPipe tracking |
| `gestureRecognizer.js` | Hand gesture classification and interaction states |

---

## ⚙️ Installation & Local Setup

Camera access requires a secure browser context such as `localhost` or HTTPS.

### Step 1 — Download the Project

Download or clone the project repository.

```bash
git clone <YOUR_REPOSITORY_URL>
```

### Step 2 — Open the Project Directory

```bash
cd HoloSketch-AI
```

### Step 3 — Start a Local Development Server

**Option A: Python**

```bash
python3 -m http.server 8000
```

**Option B: Node.js**

```bash
npx serve .
```

### Step 4 — Open in Your Browser

Navigate to:

```text
http://localhost:8000
```

Recommended browsers:
- Google Chrome
- Microsoft Edge
- Modern Chromium-based browsers

### Step 5 — Launch HoloSketch AI

1. Open the application.
2. Click **Launch HoloSketch**.
3. Allow webcam permissions.
4. Wait for the MediaPipe hand-tracking model to load.
5. Position your hand in front of the camera.
6. Start drawing and interacting using gestures.

**Note:** The first launch may require downloading MediaPipe model assets from Google's public CDN. An internet connection may be required unless the dependencies and model files are hosted locally.

---

## 🔒 Privacy & Security

HoloSketch AI is designed around local browser-based processing.

- Webcam video is processed locally in the browser.
- Hand tracking uses MediaPipe and browser-based inference.
- Sketches are rendered within the application.
- No webcam imagery is intentionally uploaded to a project backend.
- No remote storage of sketches is required by the described architecture.

**Privacy note:** Third-party CDN requests may occur when loading external libraries or model assets. Review dependencies and network requests to verify the application's complete privacy behavior.

---

## 🎯 Project Goals

HoloSketch AI explores how computer vision and spatial interaction can transform traditional digital creativity.

Its primary goals are:

1. Make digital drawing accessible without physical input devices.
2. Explore real-time hand gesture recognition.
3. Improve geometric sketch recognition.
4. Enable intuitive 3D object manipulation.
5. Combine AI-inspired composition with interactive drawing.
6. Create an immersive and futuristic creative environment.

---

## 🔮 Future Enhancements

Potential future improvements include:

- Advanced gesture customization.
- More geometric shape categories.
- Persistent cloud-based project storage.
- Export drawings as SVG and PNG.
- 3D model export functionality.
- Custom hand gesture training.
- Multi-hand collaboration.
- Voice-controlled creative commands.
- AI-powered freehand sketch enhancement.
- Advanced spatial object placement.

---

## 👨‍💻 Author & Project

**Project:** HoloSketch AI  
**Category:** AI / Computer Vision / Spatial Computing  
**Platform:** Web Browser  
**Interaction:** Touchless Hand Gesture Control  
**Core Recognition:** 10 Geometric Shapes

---

<p align="center">

### ✨ Draw Beyond the Screen.

**HoloSketch AI — Where Your Hands Become the Interface.**

</p>
