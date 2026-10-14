# Glass Fragmentation Analyzer

A browser-based, offline app for analysing thermally toughened glass fragmentation photographs.

## Features
- Upload JPEG and PNG image files
- Drag and drop image upload
- Move and resize a square ROI with optional aspect-lock
- Calibration via two-point distance measurement
- 50 mm x 50 mm ROI automation
- OpenCV.js preprocessing pipeline
- Canny edge detection overlay
- Fragment boundary visualization and counting rules
- Runs fully offline without backend services

## How to run
1. Download or build a local OpenCV.js file.
2. Place it in `vendor/opencv.js`.
3. Open `index.html` in a browser, or serve locally:

```bash
python -m http.server 8000
```

Then visit:

```text
http://localhost:8000/
```
