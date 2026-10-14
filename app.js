const state = {
  imageEl: null,
  imageDataUrl: '',
  roi: {
    x: 120,
    y: 120,
    size: 220,
    aspectLocked: true,
    activeHandle: null,
    dragging: false,
    dragStartX: 0,
    dragStartY: 0,
    originalX: 0,
    originalY: 0,
    originalSize: 220
  },
  calibration: {
    active: false,
    points: [],
    mmPerPixel: null,
    knownDistanceMm: 50
  },
  settings: {
    thresholdSensitivity: 24,
    edgeSensitivity: 35,
    contrastEnhancement: 2.5,
    lowThreshold: 50,
    highThreshold: 150,
    countMode: 'centroid'
  },
  fragments: [],
  previewReady: false,
  cvReady: false
};

const elements = {};

function ready() {
  elements.imageInput = document.getElementById('imageInput');
  elements.dropZone = document.getElementById('dropZone');
  elements.startCalibrationBtn = document.getElementById('startCalibrationBtn');
  elements.clearCalibrationBtn = document.getElementById('clearCalibrationBtn');
  elements.imageCanvas = document.getElementById('imageCanvas');
  elements.previewCanvas = document.getElementById('previewCanvas');
  elements.knownDistance = document.getElementById('knownDistance');
  elements.aspectLock = document.getElementById('aspectLock');
  elements.roi50Btn = document.getElementById('roi50Btn');
  elements.roiAutoBtn = document.getElementById('roiAutoBtn');
  elements.processBtn = document.getElementById('processBtn');
  elements.rerunAnalysisBtn = document.getElementById('rerunAnalysisBtn');
  elements.countMode = document.getElementById('countMode');
  elements.statusText = document.getElementById('statusText');

  elements.thresholdSensitivity = document.getElementById('thresholdSensitivity');
  elements.edgeSensitivity = document.getElementById('edgeSensitivity');
  elements.contrastEnhancement = document.getElementById('contrastEnhancement');
  elements.lowThreshold = document.getElementById('lowThreshold');
  elements.highThreshold = document.getElementById('highThreshold');

  elements.thresholdSensitivityValue = document.getElementById('thresholdSensitivityValue');
  elements.edgeSensitivityValue = document.getElementById('edgeSensitivityValue');
  elements.contrastEnhancementValue = document.getElementById('contrastEnhancementValue');
  elements.lowThresholdValue = document.getElementById('lowThresholdValue');
  elements.highThresholdValue = document.getElementById('highThresholdValue');

  elements.mmPerPixelValue = document.getElementById('mmPerPixelValue');
  elements.scaleFactorValue = document.getElementById('scaleFactorValue');
  elements.roiPixelsValue = document.getElementById('roiPixelsValue');
  elements.roiMmValue = document.getElementById('roiMmValue');
  elements.fragmentCountValue = document.getElementById('fragmentCountValue');

  bindEvents();
  updateControlOutputs();
  setStatus('Ready. Add an image to begin.');
  checkOpenCV();
}

function bindEvents() {
  elements.imageInput.addEventListener('change', (event) => {
    const file = event.target.files && event.target.files[0];
    if (file) {
      loadImageFile(file);
    }
  });

  ['dragenter', 'dragover'].forEach((type) => {
    elements.dropZone.addEventListener(type, (event) => {
      event.preventDefault();
      elements.dropZone.classList.add('dragover');
    });
  });

  ['dragleave', 'drop'].forEach((type) => {
    elements.dropZone.addEventListener(type, (event) => {
      event.preventDefault();
      elements.dropZone.classList.remove('dragover');
    });
  });

  elements.dropZone.addEventListener('drop', (event) => {
    const file = event.dataTransfer && event.dataTransfer.files[0];
    if (file) {
      loadImageFile(file);
    }
  });

  elements.startCalibrationBtn.addEventListener('click', () => {
    state.calibration.active = !state.calibration.active;
    state.calibration.points = [];
    setStatus(state.calibration.active ? 'Calibration mode: click two points on the image.' : 'Calibration cancelled.');
    renderImageCanvas();
  });

  elements.clearCalibrationBtn.addEventListener('click', () => {
    state.calibration.points = [];
    state.calibration.mmPerPixel = null;
    setStatus('Calibration reset.');
    renderImageCanvas();
    updateMetrics();
  });

  elements.knownDistance.addEventListener('input', () => {
    state.calibration.knownDistanceMm = Number(elements.knownDistance.value) || 0;
    if (state.calibration.points.length === 2) {
      computeCalibrationFromPoints();
    }
    updateMetrics();
  });

  elements.aspectLock.addEventListener('change', () => {
    state.roi.aspectLocked = elements.aspectLock.checked;
  });

  elements.roi50Btn.addEventListener('click', () => {
    if (!state.imageEl) {
      setStatus('Load an image first.');
      return;
    }
    apply50mmROI();
  });

  elements.roiAutoBtn.addEventListener('click', () => {
    if (!state.imageEl) {
      setStatus('Load an image first.');
      return;
    }
    const width = state.imageEl.width;
    const height = state.imageEl.height;
    const size = Math.min(width, height) * 0.5;
    state.roi.x = (width - size) * 0.5;
    state.roi.y = (height - size) * 0.5;
    state.roi.size = size;
    renderImageCanvas();
    updateMetrics();
  });

  elements.processBtn.addEventListener('click', () => processImagePipeline());
  elements.rerunAnalysisBtn.addEventListener('click', () => processImagePipeline(true));

  [
    elements.thresholdSensitivity,
    elements.edgeSensitivity,
    elements.contrastEnhancement,
    elements.lowThreshold,
    elements.highThreshold
  ].forEach((input) => {
    input.addEventListener('input', () => {
      syncSettingsFromInputs();
      updateControlOutputs();
      if (state.imageEl) {
        processImagePipeline();
      }
    });
  });

  elements.countMode.addEventListener('change', () => {
    state.settings.countMode = elements.countMode.value;
    recountFragments();
  });

  elements.imageCanvas.addEventListener('pointerdown', onCanvasPointerDown);
  elements.imageCanvas.addEventListener('pointermove', onCanvasPointerMove);
  elements.imageCanvas.addEventListener('pointerup', onCanvasPointerUp);
  elements.imageCanvas.addEventListener('pointerleave', onCanvasPointerUp);
  elements.imageCanvas.addEventListener('click', onCanvasClickForCalibration);
}

function syncSettingsFromInputs() {
  state.settings.thresholdSensitivity = Number(elements.thresholdSensitivity.value);
  state.settings.edgeSensitivity = Number(elements.edgeSensitivity.value);
  state.settings.contrastEnhancement = Number(elements.contrastEnhancement.value);
  state.settings.lowThreshold = Number(elements.lowThreshold.value);
  state.settings.highThreshold = Number(elements.highThreshold.value);
  state.settings.countMode = elements.countMode.value;
}

function updateControlOutputs() {
  elements.thresholdSensitivityValue.textContent = elements.thresholdSensitivity.value;
  elements.edgeSensitivityValue.textContent = elements.edgeSensitivity.value;
  elements.contrastEnhancementValue.textContent = Number(elements.contrastEnhancement.value).toFixed(1);
  elements.lowThresholdValue.textContent = elements.lowThreshold.value;
  elements.highThresholdValue.textContent = elements.highThreshold.value;
}

function setStatus(message) {
  elements.statusText.textContent = message;
}

function checkOpenCV() {
  if (window.cv && window.cv.Mat) {
    state.cvReady = true;
    setStatus('OpenCV loaded. Ready for image processing.');
    return true;
  }

  setStatus('OpenCV.js was not detected. Place opencv.js in vendor/opencv.js to enable analysis.');
  return false;
}

function loadImageFile(file) {
  if (!file || !file.type.startsWith('image/')) {
    setStatus('Please select a PNG or JPEG image.');
    return;
  }

  const reader = new FileReader();
  reader.onload = (event) => {
    const dataUrl = event.target.result;
    const img = new Image();
    img.onload = () => {
      state.imageEl = img;
      state.imageDataUrl = dataUrl;
      state.roi.x = 60;
      state.roi.y = 60;
      state.roi.size = Math.min(img.width, img.height) * 0.5;
      state.calibration.points = [];
      state.fragments = [];
      elements.imageCanvas.width = img.width;
      elements.imageCanvas.height = img.height;
      elements.previewCanvas.width = img.width;
      elements.previewCanvas.height = img.height;
      renderImageCanvas();
      if (state.cvReady) {
        processImagePipeline();
      }
    };
    img.src = dataUrl;
  };
  reader.readAsDataURL(file);
}

function getCanvasPoint(event) {
  const rect = elements.imageCanvas.getBoundingClientRect();
  const scaleX = elements.imageCanvas.width / rect.width;
  const scaleY = elements.imageCanvas.height / rect.height;
  return {
    x: (event.clientX - rect.left) * scaleX,
    y: (event.clientY - rect.top) * scaleY
  };
}

function renderImageCanvas() {
  const ctx = elements.imageCanvas.getContext('2d');
  ctx.clearRect(0, 0, elements.imageCanvas.width, elements.imageCanvas.height);

  if (!state.imageEl) {
    ctx.fillStyle = '#0a1826';
    ctx.fillRect(0, 0, elements.imageCanvas.width, elements.imageCanvas.height);
    return;
  }

  ctx.drawImage(state.imageEl, 0, 0, elements.imageCanvas.width, elements.imageCanvas.height);

  drawCalibrationMarkers(ctx);
  drawROI(ctx);
  drawFragmentOverlay(ctx);
}

function drawCalibrationMarkers(ctx) {
  if (!state.calibration.points.length) return;

  state.calibration.points.forEach((point, index) => {
    ctx.beginPath();
    ctx.arc(point.x, point.y, 6, 0, Math.PI * 2);
    ctx.fillStyle = index === 0 ? '#66d9ef' : '#ffe66d';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#ffffff';
    ctx.stroke();
  });

  if (state.calibration.points.length === 2) {
    const a = state.calibration.points[0];
    const b = state.calibration.points[1];
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.setLineDash([6, 6]);
    ctx.stroke();
    ctx.setLineDash([]);
  }
}

function drawROI(ctx) {
  if (!state.imageEl) return;

  const roi = state.roi;
  const x = roi.x;
  const y = roi.y;
  const size = roi.size;

  ctx.save();
  ctx.strokeStyle = '#66d9ef';
  ctx.lineWidth = 2;
  ctx.setLineDash([10, 6]);
  ctx.strokeRect(x, y, size, size);
  ctx.setLineDash([]);

  const handleSize = 10;
  const handles = [
    [x, y],
    [x + size, y],
    [x, y + size],
    [x + size, y + size]
  ];

  handles.forEach(([hx, hy]) => {
    ctx.fillStyle = '#ffcf5a';
    ctx.fillRect(hx - handleSize / 2, hy - handleSize / 2, handleSize, handleSize);
  });

  ctx.font = '14px sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.fillText(`${Math.round(size)} px`, x + 8, y - 8);
  ctx.restore();
}

function drawFragmentOverlay(ctx) {
  if (!state.fragments.length) return;

  state.fragments.forEach((fragment, index) => {
    const color = fragment.color || getPaletteColor(index);
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(fragment.x, fragment.y, fragment.w, fragment.h);
    ctx.fillStyle = color;
    ctx.font = '12px sans-serif';
    ctx.fillText(String(fragment.label), fragment.x + 6, fragment.y + 14);
    ctx.restore();
  });
}

function getPaletteColor(index) {
  const palette = ['#8ee3a0', '#7ad5ff', '#f7d779', '#d7b3ff', '#ff9e9e', '#94f2d9', '#f5a6ff', '#ffd166'];
  return palette[index % palette.length];
}

function onCanvasClickForCalibration(event) {
  if (!state.calibration.active) return;
  const point = getCanvasPoint(event);
  state.calibration.points.push(point);

  if (state.calibration.points.length > 2) {
    state.calibration.points = state.calibration.points.slice(-2);
  }

  if (state.calibration.points.length === 2) {
    computeCalibrationFromPoints();
    state.calibration.active = false;
    setStatus('Calibration complete.');
  } else {
    setStatus('Calibration point 1 selected. Click the second point.');
  }

  renderImageCanvas();
  updateMetrics();
}

function computeCalibrationFromPoints() {
  const [p1, p2] = state.calibration.points;
  const distancePx = Math.hypot(p2.x - p1.x, p2.y - p1.y);
  if (distancePx <= 0) {
    state.calibration.mmPerPixel = null;
    return;
  }
  const distanceMm = Number(elements.knownDistance.value) || state.calibration.knownDistanceMm || 1;
  state.calibration.knownDistanceMm = distanceMm;
  state.calibration.mmPerPixel = distanceMm / distancePx;
}

function updateMetrics() {
  const roiPx = Math.round(state.roi.size);
  const mmPerPixel = state.calibration.mmPerPixel;
  const roiMm = mmPerPixel ? (roiPx * mmPerPixel).toFixed(2) : '—';

  elements.roiPixelsValue.textContent = `${roiPx}px`;
  elements.roiMmValue.textContent = mmPerPixel ? `${roiMm} mm` : '—';

  if (mmPerPixel) {
    elements.mmPerPixelValue.textContent = `${mmPerPixel.toFixed(4)} mm/px`;
    elements.scaleFactorValue.textContent = `${(1 / mmPerPixel).toFixed(2)} px/mm`;
  } else {
    elements.mmPerPixelValue.textContent = '—';
    elements.scaleFactorValue.textContent = '—';
  }

  elements.fragmentCountValue.textContent = String(state.fragments.length);
}

function apply50mmROI() {
  const mmPerPixel = state.calibration.mmPerPixel;
  if (!mmPerPixel) {
    setStatus('Calibration required before applying a 50 mm ROI.');
    return;
  }

  const targetPx = 50 / mmPerPixel;
  state.roi.size = Math.min(targetPx, Math.min(state.imageEl.width, state.imageEl.height));
  state.roi.x = (state.imageEl.width - state.roi.size) / 2;
  state.roi.y = (state.imageEl.height - state.roi.size) / 2;
  renderImageCanvas();
  updateMetrics();
  setStatus('50 mm ROI applied.');
}

function onCanvasPointerDown(event) {
  if (!state.imageEl) return;
  const point = getCanvasPoint(event);

  const handles = getHitHandles();
  const activeHandle = handles.find((handle) => {
    const dx = point.x - handle.x;
    const dy = point.y - handle.y;
    return Math.abs(dx) <= 12 && Math.abs(dy) <= 12;
  });

  if (activeHandle) {
    state.roi.activeHandle = activeHandle.name;
    state.roi.dragging = true;
    state.roi.dragStartX = point.x;
    state.roi.dragStartY = point.y;
    state.roi.originalX = state.roi.x;
    state.roi.originalY = state.roi.y;
    state.roi.originalSize = state.roi.size;
    return;
  }

  if (point.x >= state.roi.x && point.x <= state.roi.x + state.roi.size &&
      point.y >= state.roi.y && point.y <= state.roi.y + state.roi.size) {
    state.roi.dragging = true;
    state.roi.activeHandle = 'move';
    state.roi.dragStartX = point.x;
    state.roi.dragStartY = point.y;
    state.roi.originalX = state.roi.x;
    state.roi.originalY = state.roi.y;
  }
}

function onCanvasPointerMove(event) {
  if (!state.roi.dragging) return;
  const point = getCanvasPoint(event);
  const dx = point.x - state.roi.dragStartX;
  const dy = point.y - state.roi.dragStartY;

  if (state.roi.activeHandle === 'move') {
    state.roi.x = clamp(state.roi.originalX + dx, 0, state.imageEl.width - state.roi.size);
    state.roi.y = clamp(state.roi.originalY + dy, 0, state.imageEl.height - state.roi.size);
  } else {
    resizeROIByHandle(state.roi.activeHandle, dx, dy);
  }

  renderImageCanvas();
  updateMetrics();
}

function onCanvasPointerUp() {
  state.roi.dragging = false;
  state.roi.activeHandle = null;
}

function getHitHandles() {
  const roi = state.roi;
  return [
    { name: 'nw', x: roi.x, y: roi.y },
    { name: 'ne', x: roi.x + roi.size, y: roi.y },
    { name: 'sw', x: roi.x, y: roi.y + roi.size },
    { name: 'se', x: roi.x + roi.size, y: roi.y + roi.size }
  ];
}

function resizeROIByHandle(handle, dx, dy) {
  const roi = state.roi;
  let left = roi.originalX;
  let top = roi.originalY;
  let right = roi.originalX + roi.originalSize;
  let bottom = roi.originalY + roi.originalSize;

  if (handle.includes('e')) right = right + dx;
  if (handle.includes('s')) bottom = bottom + dy;
  if (handle.includes('w')) left = left + dx;
  if (handle.includes('n')) top = top + dy;

  let size = Math.max(30, Math.max(right - left, bottom - top));

  if (state.roi.aspectLocked) {
    size = Math.max(Math.abs(right - left), Math.abs(bottom - top));
    size = Math.max(size, 30);
    if (handle === 'nw') {
      left = right - size;
      top = bottom - size;
    } else if (handle === 'ne') {
      right = left + size;
      top = bottom - size;
    } else if (handle === 'sw') {
      left = right - size;
      bottom = top + size;
    } else if (handle === 'se') {
      right = left + size;
      bottom = top + size;
    }
  }

  if (left < 0) left = 0;
  if (top < 0) top = 0;
  if (right > state.imageEl.width) right = state.imageEl.width;
  if (bottom > state.imageEl.height) bottom = state.imageEl.height;

  const finalSize = Math.min(right - left, bottom - top);
  if (state.roi.aspectLocked) {
    roi.size = Math.min(finalSize, Math.min(state.imageEl.width, state.imageEl.height));
  } else {
    roi.size = Math.max(30, Math.min(Math.max(right - left, 30), state.imageEl.width - left));
  }

  if (state.roi.aspectLocked) {
    roi.x = clamp(left, 0, state.imageEl.width - roi.size);
    roi.y = clamp(top, 0, state.imageEl.height - roi.size);
    roi.size = clamp(roi.size, 30, Math.min(state.imageEl.width, state.imageEl.height));
  } else {
    roi.x = clamp(left, 0, state.imageEl.width - roi.size);
    roi.y = clamp(top, 0, state.imageEl.height - roi.size);
  }
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function processImagePipeline(forceAnalysis = false) {
  if (!state.imageEl || !window.cv || !window.cv.Mat) {
    checkOpenCV();
    return;
  }

  const src = window.cv.imread(state.imageEl);
  if (!src || src.rows === 0 || src.cols === 0) {
    setStatus('Could not read the uploaded image.');
    return;
  }

  const processed = preprocessSource(src);
  const preview = window.cv.imread(state.imageEl);
  const edgeMap = performEdgeDetection(processed);
  const segmented = segmentFragments(processed, preview, edgeMap);

  window.cv.imshow(elements.previewCanvas, segmented.preview);
  renderImageCanvas();

  if (forceAnalysis || state.fragments.length === 0) {
    recountFragments();
  }

  src.delete();
  processed.delete();
  edgeMap.delete();
  segmented.preview.delete();
  segmented.labels.delete();
  preview.delete();
  setStatus('Processing complete.');
}

function preprocessSource(src) {
  const rgb = new window.cv.Mat();
  window.cv.cvtColor(src, rgb, window.cv.COLOR_RGBA2RGB);

  const lab = new window.cv.Mat();
  window.cv.cvtColor(rgb, lab, window.cv.COLOR_RGB2Lab);

  const channels = new window.cv.MatVector();
  window.cv.split(lab, channels);

  const lChannel = channels.get(0);
  const clahe = new window.cv.CLAHE(2.0, new window.cv.Size(8, 8));
  const enhancedL = new window.cv.Mat();
  clahe.apply(lChannel, enhancedL);
  channels.set(0, enhancedL);

  const merged = new window.cv.Mat();
  window.cv.merge(channels, merged);

  const blur = new window.cv.Mat();
  window.cv.GaussianBlur(merged, blur, new window.cv.Size(3, 3), 0.8, 0.8, window.cv.BORDER_DEFAULT);

  const gray = new window.cv.Mat();
  window.cv.cvtColor(blur, gray, window.cv.COLOR_Lab2GRAY);

  const threshold = new window.cv.Mat();
  const blockSize = Math.max(3, Math.round(state.settings.thresholdSensitivity / 8) * 2 + 1);
  const cValue = Math.max(1, 20 - state.settings.thresholdSensitivity / 3);
  window.cv.adaptiveThreshold(
    gray,
    threshold,
    255,
    window.cv.ADAPTIVE_THRESH_GAUSSIAN_C,
    window.cv.THRESH_BINARY_INV,
    blockSize,
    cValue
  );

  const cleaned = new window.cv.Mat();
  const kernel = window.cv.Mat.ones(3, 3, window.cv.CV_8U);
  window.cv.morphologyEx(threshold, cleaned, window.cv.MORPH_OPEN, kernel);

  rgb.delete();
  lab.delete();
  channels.delete();
  lChannel.delete();
  enhancedL.delete();
  merged.delete();
  blur.delete();
  gray.delete();
  threshold.delete();
  kernel.delete();

  return cleaned;
}

function performEdgeDetection(processed) {
  const gray = new window.cv.Mat();
  const edges = new window.cv.Mat();
  const blur = new window.cv.Mat();

  window.cv.GaussianBlur(processed, blur, new window.cv.Size(3, 3), 0.5, 0.5, window.cv.BORDER_DEFAULT);
  window.cv.cvtColor(blur, gray, window.cv.COLOR_GRAY2BGR);
  window.cv.cvtColor(gray, gray, window.cv.COLOR_BGR2GRAY);

  const low = Number(state.settings.lowThreshold);
  const high = Number(state.settings.highThreshold);
  window.cv.Canny(gray, edges, low, high, 3, false);

  blur.delete();
  gray.delete();

  return edges;
}

function segmentFragments(processed, original, edges) {
  const kernel = window.cv.Mat.ones(3, 3, window.cv.CV_8U);
  const opened = new window.cv.Mat();
  window.cv.morphologyEx(processed, opened, window.cv.MORPH_OPEN, kernel);

  const dist = new window.cv.Mat();
  window.cv.distanceTransform(opened, dist, window.cv.DIST_L2, 5);

  const maxVal = window.cv.minMaxLoc(dist).maxVal;
  const sureFg = new window.cv.Mat();
  window.cv.threshold(dist, sureFg, 0.35 * maxVal, 255, window.cv.THRESH_BINARY);

  const markerMask = new window.cv.Mat();
  window.cv.threshold(opened, markerMask, 0, 255, window.cv.THRESH_BINARY);

  const labels = new window.cv.Mat();
  const stats = new window.cv.Mat();
  const centroids = new window.cv.Mat();
  const connectivity = 8;
  const ltype = window.cv.CV_32S;

  window.cv.connectedComponentsWithStats(markerMask, labels, stats, centroids, connectivity, ltype);

  const preview = new window.cv.Mat();
  original.copyTo(preview);

  const fragments = [];
  const totalLabels = Number(stats.rows);
  for (let i = 1; i < totalLabels; i += 1) {
    const area = Number(stats.intAt(i, window.cv.CC_STAT_AREA || 0));
    if (Number.isNaN(area) || area < 30) continue;

    const x = stats.intAt(i, 0);
    const y = stats.intAt(i, 1);
    const w = stats.intAt(i, 2);
    const h = stats.intAt(i, 3);

    const bbox = { x, y, w, h };
    const centroidX = centroids.doubleAt(i, 0);
    const centroidY = centroids.doubleAt(i, 1);
    const label = i;
    const color = getPaletteColor(fragments.length);

    const roi = state.roi;
    const withinRoi = centroidX >= roi.x && centroidX <= roi.x + roi.size && centroidY >= roi.y && centroidY <= roi.y + roi.size;

    fragments.push({
      label,
      area,
      x,
      y,
      w,
      h,
      centroidX,
      centroidY,
      withinRoi,
      color
    });

    const boundingRect = new window.cv.Rect(x, y, w, h);
    const rectangleColor = new window.cv.Scalar(...hexToScalar(color));
    window.cv.rectangle(preview, boundingRect, rectangleColor, 1, window.cv.LINE_8, 0);
    window.cv.putText(preview, String(label), new window.cv.Point(x + 5, y + 15), window.cv.FONT_HERSHEY_SIMPLEX, 0.6, rectangleColor, 1, window.cv.LINE_AA, false);
    rectangleColor.delete();
  }

  state.fragments = fragments;
  updateMetrics();
  recountFragments();

  dist.delete();
  maxVal.delete();
  sureFg.delete();
  markerMask.delete();
  kernel.delete();
  opened.delete();

  return { preview, labels };
}

function hexToScalar(hex) {
  const clean = hex.replace('#', '');
  const value = parseInt(clean, 16);
  const r = (value >> 16) & 255;
  const g = (value >> 8) & 255;
  const b = value & 255;
  return [b, g, r];
}

function recountFragments() {
  if (!state.fragments.length) {
    elements.fragmentCountValue.textContent = '0';
    return;
  }

  const roi = state.roi;
  let count = 0;

  state.fragments.forEach((fragment) => {
    const centroidX = fragment.centroidX;
    const centroidY = fragment.centroidY;
    const insideRoi = centroidX >= roi.x && centroidX <= roi.x + roi.size && centroidY >= roi.y && centroidY <= roi.y + roi.size;

    let includeItem = false;
    if (state.settings.countMode === 'centroid') {
      includeItem = insideRoi;
    } else if (state.settings.countMode === 'majority') {
      const fragmentArea = fragment.area;
      const roiArea = Math.max(0, Math.min(fragment.x + fragment.w, roi.x + roi.size) - Math.max(fragment.x, roi.x)) *
        Math.max(0, Math.min(fragment.y + fragment.h, roi.y + roi.size) - Math.max(fragment.y, roi.y));
      includeItem = (roiArea / fragmentArea) > 0.5;
    } else if (state.settings.countMode === 'full') {
      const fullInside = fragment.x >= roi.x && fragment.y >= roi.y && fragment.x + fragment.w <= roi.x + roi.size && fragment.y + fragment.h <= roi.y + roi.size;
      includeItem = fullInside;
    }

    if (includeItem) {
      count += 1;
      fragment.enabled = true;
    } else {
      fragment.enabled = false;
    }
  });

  elements.fragmentCountValue.textContent = String(count);
}

const bootstrap = () => {
  ready();
};

window.addEventListener('DOMContentLoaded', bootstrap);

window.addEventListener('load', () => {
  if (window.cv) {
    checkOpenCV();
  }
});

window.addEventListener('error', (event) => {
  if (event.message && event.message.includes('opencv')) {
    setStatus('OpenCV.js failed to load. Download or place the library at vendor/opencv.js.');
  }
});

if (typeof window !== 'undefined') {
  if (window.cv && window.cv.Mat) {
    setStatus('OpenCV ready.');
  }
}

