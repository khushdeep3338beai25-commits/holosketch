# HoloSketch AI — Next-Gen Spatial Canvas & 10-Shape Recognition

HoloSketch AI is a browser-based touchless creative workstation that turns your fingertips into a mid-air drawing and modeling tool. Powered by real-time computer vision (MediaPipe Hand Landmarker), it smooths air trajectories, auto-snaps sketches into 10 geometric shapes, and enables full 3D object manipulation and AI compositions.

---

## ✨ What's New in this Upgraded Edition

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
| **COLOR** | ◉ Palette mode | Move index finger horizontally to preview vibrant 

## 🔒 Privacy

- 100% of video processing occurs **locally in your browser** via WebAssembly and WebGL/GPU.
- No webcam imagery, sketches, or telemetry are ever uploaded or stored on any server.
