# Glass Fragmentation Analyzer

A browser-based, offline analysis tool for counting fragments in thermally toughened glass photographs.

## Features
- Upload image from disk or drag-and-drop
- Select and move a square ROI
- Resize the ROI from corners with optional aspect-ratio lock
- Calibration using two points and a known distance
- Set ROI to 50 mm x 50 mm automatically or manually adjust it
- Live preprocessing preview with OpenCV.js
- Adaptive thresholding and Canny edge detection
- Fragment labeling and colourized visualization
- Counting by centroid, majority area, or full-fragment criteria

## Usage
1. Open `index.html` in a browser.
2. Add an image.
3. Calibrate the scale using two points and a known distance.
4. Adjust the ROI and image-processing sliders.
5. Run the fragment analysis and review counted fragments.

## Offline dependency
The app expects OpenCV.js in `vendor/opencv.js` for truly offline usage.
