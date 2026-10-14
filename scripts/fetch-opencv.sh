#!/usr/bin/env bash
set -e

# Usage:
#   ./scripts/fetch-opencv.sh [version]
# Example:
#   ./scripts/fetch-opencv.sh 5.0.0

VERSION="${1:-5.0.0}"
URL="https://docs.opencv.org/${VERSION}/opencv.js"
OUT="vendor/opencv.js"

mkdir -p "$(dirname "$OUT")"

echo "Downloading OpenCV.js ${VERSION} from ${URL}..."
if command -v curl >/dev/null 2>&1; then
  curl -L --fail -o "$OUT" "$URL"
elif command -v wget >/dev/null 2>&1; then
  wget -O "$OUT" "$URL"
else
  echo "Error: curl or wget required to download files." >&2
  exit 1
fi

echo "Downloaded OpenCV.js -> $OUT"
ls -lh "$OUT" || true
