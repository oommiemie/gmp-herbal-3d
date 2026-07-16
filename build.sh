#!/usr/bin/env bash
# Build index.html (single self-contained file) from src/
set -euo pipefail
cd "$(dirname "$0")"
V=src/vendor
{
  cat src/head.html
  echo '<script>'
  cat "$V/three.min.js"
  echo '</script>'
  echo '<script>'
  cat "$V/OrbitControls.js" \
      "$V/pp-CopyShader.js" "$V/pp-SAOShader.js" "$V/pp-DepthLimitedBlurShader.js" \
      "$V/pp-UnpackDepthRGBAShader.js" "$V/pp-FXAAShader.js" "$V/pp-Pass.js" \
      "$V/pp-MaskPass.js" "$V/pp-EffectComposer.js" "$V/pp-ShaderPass.js" \
      "$V/pp-RenderPass.js" "$V/pp-SAOPass.js"
  echo '</script>'
  echo '<script>'
  cat src/app1.js src/app2.js src/app3.js src/app4.js
  echo '</script>'
} > index.html
echo "built index.html ($(wc -c < index.html) bytes)"
