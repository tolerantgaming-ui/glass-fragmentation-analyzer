# Glass Fragmentation Analyzer

A browser-based, offline single-page application for analysing tempered glass fragmentation photographs. It helps inspectors count fragments in a 50 mm x 50 mm region using an ROI, calibration, image preprocessing, and fragment segmentation.

## Features
- Upload JPEG/PNG images with drag-and-drop support
- Move and resize a square ROI with optional aspect-ratio locking
- Calibration from two user-selected points and a known distance
- 50 mm x 50 mm ROI automation with manual resizing
- OpenCV.js preprocessing: LAB conversion, CLAHE, Gaussian blur, adaptive threshold
- Canny edge detection overlay
- Fragment segmentation using distance-transform / watershed-inspired processing
- Fragment colouring, labels, and count modes
- No backend and no external API usage

## Offline setup
This app is designed to run fully offline after OpenCV.js is placed locally in the project.

1. Download a local copy of OpenCV.js (for example, from the OpenCV release package or a local build).
2. Place it at `vendor/opencv.js`.
3. Open `index.html` in a browser, or serve the project locally with a simple static file server.

## Run locally
Using Python:

```bash
python -m http.server 8000
```

Then visit:

```text
http://localhost:8000
```

## Project structure
- `index.html` – UI and layout
- `styles.css` – styling
- `app.js` – image processing, ROI logic, calibration, and counting
- `vendor/` – local OpenCV.js file

## Notes
- The app is designed for a 50 mm x 50 mm target ROI in fragmentation testing.
- If the OpenCV library is missing, the UI still loads and explains the missing dependency.
