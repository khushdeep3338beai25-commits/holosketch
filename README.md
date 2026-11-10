# ✨ HoloSketch AI — Next-Gen Spatial Canvas & 10-Shape Recognition

> **Turn your fingertips into a creative instrument.**  
> A browser-based, touchless spatial drawing and 3D modeling workstation powered by real-time AI hand tracking and computer vision.

HoloSketch AI transforms natural hand movements into digital creativity. Using Google's MediaPipe Hand Landmarker, it enables users to draw in mid-air, recognize geometric shapes, manipulate 3D holographic objects, and generate AI-inspired compositions — all through intuitive hand gestures.

No physical drawing tablet. No touch required. Just your hands and imagination.

---

## 🌌 Project Overview

HoloSketch AI combines computer vision, gesture recognition, geometric analysis, and interactive canvas rendering to create an immersive spatial creative environment.

The application features a futuristic cyberpunk interface with neon holographic elements, glassmorphism panels, ambient lighting, and interactive 2D and 3D workspaces.

### ✨ Core Highlights

- Real-time hand tracking using MediaPipe.
- Touchless air drawing and gesture-based interactions.
- Recognition of 10 geometric shape categories.
- Automatic geometric shape snapping.
- Interactive 3D holographic object manipulation.
- AI-inspired multi-part composition generation.
- Interactive shape library with direct canvas stamping.
- Multiple canvas grid modes.
- Native Web Audio API sound effects.
- 10×10 shape recognition evaluation dashboard.
- Local browser-based video processing.

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
