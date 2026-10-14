OpenCV.js (vendor) instructions

The app requires a local copy of opencv.js to run fully offline.

You can download a prebuilt OpenCV.js release from the official OpenCV docs site, for example:

https://docs.opencv.org/5.0.0/opencv.js

To download automatically, run one of the included scripts from the project root:

- Linux / macOS / WSL:
  ./scripts/fetch-opencv.sh 5.0.0

- Windows (PowerShell):
  .\scripts\fetch-opencv.ps1 -Version 5.0.0

After the script completes, vendor/opencv.js will be present and you can open index.html in a browser or serve the project with a simple static server.
