# HoloSketch AI — Technical Project Report (10-Shape Edition)

## 1. Abstract
HoloSketch AI is a browser-based, touchless spatial drawing workstation that uses webcam-based hand landmarks to map index-fingertip motion onto a neon holographic canvas. It combines gesture-state detection, exponential trajectory smoothing, explainable geometric shape classification across 10 distinct categories, selectable and manipulable shape objects, 3D holographic wireframe models, and a full measurement dashboard. Video processing is strictly local to the client browser; the app does not record or upload webcam footage.

## 2. Problem statement and motivation
Conventional digital drawing interfaces require physical peripherals such as a mouse, stylus, or touch surface. HoloSketch explores a spatial computing model where natural hand gestures control a virtual canvas in mid-air. The engineering challenge is to maintain robust landmark tracking, interpret natural gestures without false positives, accurately classify freehand closed strokes into clean geometry regardless of rotation and drawing noise, and provide instant visual and acoustic feedback.

## 3. Key Enhancements & Shape Classification
The classification engine in `shapeRecognizer.js` was overhauled to support **10 distinct geometric shape classes**:
1. **Circle**: Circularity > 0.88, minimal radial variance from centroid, smooth curvature.
2. **Oval / Ellipse**: Smooth curvature, elongated aspect ratio ($\ge 1.25$), bounding box fill $\approx \pi/4$.
3. **Triangle**: Minimum bounding box fill $\approx 0.50$, 3 sharp corners.
4. **Square**: Minimum bounding box fill $> 0.85$, aspect ratio $\approx 1.0$.
5. **Rectangle**: Minimum bounding box fill $> 0.85$, aspect ratio $> 1.28$.
6. **Diamond / Rhombus**: 4 vertices, characteristic screen-aligned bounding box fill $\approx 0.50$.
7. **Pentagon**: Regular 5-sided convex polygon, minimum bounding box fill $0.65 - 0.755$.
8. **Hexagon**: Regular 6-sided convex polygon, minimum bounding box fill $0.755 - 0.83$.
9. **Star**: 5-point star with deep inward concavities, low convexity ($< 0.68$), and radial ratio $> 1.7$.
10. **Heart**: Non-convex shape ($0.75 - 0.95$) with top cleft dip, dual upper lobes, and bottom apex tip.

### Mathematical Invariants
- **Minimum Area Bounding Box**: Uses multi-angle projections to calculate true minimum bounding box dimensions and orientation angle $\theta$, ensuring complete rotation invariance.
- **Convex Hull & Convexity**: Computed via Monotone Chain algorithm. Differentiates stars (convexity $\approx 0.54$) and hearts (convexity $\approx 0.90$) from convex polygons (convexity $1.00$).
- **Local Curvature & Max Turning Angle**: Curvature analysis separates smooth curves (Circle, Oval with turn $< 30^\circ$) from sharp polygonal vertices.

## 4. Technology stack
- HTML5 / CSS3 / ES Modules for client interface.
- MediaPipe Tasks Vision Hand Landmarker for real-time 21-point hand tracking.
- `getUserMedia()` for local webcam streaming.
- Canvas 2D API for drawing, skeleton overlays, and 2D/3D wireframe rendering.
- Web Audio API for procedural sound effects (snaps, blips, erase, grab).

## 5. Testing & Evaluation Benchmark
The built-in evaluation set contains 100 procedural trajectories: 10 examples each for Circle, Oval, Triangle, Square, Rectangle, Diamond, Pentagon, Hexagon, Star, and Heart, spanning easy, noisy, and rotated variations. The app computes:
- Overall Accuracy = correct predictions / total samples.
- 10×10 Confusion matrix: Actual class vs. predicted class.
- Per-class Precision, Recall, and F1 scores.
- Real-time FPS, latency, and trajectory stability (raw vs. exponentially smoothed jitter).

## 6. Privacy & Reliability
Webcam frames are analyzed purely on-device using WebAssembly and WebGL. No video data or sketches are ever uploaded to any server. Stream tracks are completely released when the user stops the camera.
