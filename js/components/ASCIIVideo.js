// Import your converted video frames here:
import { walkingFrames, walkingConfig } from '../../data/walking_frames.js';
import { coffeeFrames,  coffeeConfig  } from '../../data/coffee_frames.js';
import { introFrames,   introConfig   } from '../../data/baseline_frames.js';
import { successFrames,  successConfig  } from '../../data/success_frames.js';
import { failureFrames,   failureConfig   } from '../../data/failure_frames.js';

export class ASCIIVideo {
  constructor() {
    this.container = document.getElementById('ascii-video');
    this.currentSequence = null;
    this.frameIndex = 0;
    this.frameRate = 15; // fps
    this.lastFrameTime = 0;
    this.isPlaying = false;
    this.loop = true;

    // ASCII character intensity mapping (darkest -> lightest). Includes space to match Python.
    this.asciiChars = ['@', '#', 'S', '%', '?', '*', '+', ';', ':', ',', '.', ' '];

    // Store loaded sequences
    this.sequences = new Map();

    // Base metrics (fitToParent will compute the actual values)
    this.baseLineHeightFactor = 0.9;
    this.baseLetterSpacingPerPx = -0.1; // at 6px font => -0.6px
    this.minFontPx = 4;
    this.maxFontPx = 500; // upper guard rail

    if (this.container) {
      const s = this.container.style;
      s.whiteSpace = 'pre';
      s.fontFamily = 'Courier New, monospace';
      s.textAlign = s.textAlign || 'center';
      s.display = s.display || 'inline-block';
      s.boxSizing = 'border-box';
      s.padding = s.padding || '0';   // avoid padding affecting fit math
      s.border = s.border || '0';     // avoid borders affecting fit math
      s.maxWidth = '100%';
      s.maxHeight = '100%';
      s.overflow = 'hidden';
    }

    // Responsive sizing setup
    this._charW1Cache = null; // px per char at 1px font
    this._probe = null;       // hidden measurement element
    this._probeTextCache = null;
    this._queuedFit = null;

    this.fitToParent = this.fitToParent.bind(this);
    this._queueFit = this._queueFit.bind(this);

    window.addEventListener('resize', this._queueFit);

    // Observe parent and container size changes
    const parent = this.container?.parentElement || document.body;
    if ('ResizeObserver' in window && parent) {
      this._ro = new ResizeObserver(this._queueFit);
      this._ro.observe(parent);
      this._ro.observe(this.container);
    }

    this.loadDefaultSequences();
  }

  init() {
    this.playSequence('idle');
    this._queueFit();
  }

  // -------------------------------------------------------------
  // Responsive sizing helpers
  // -------------------------------------------------------------
  _queueFit() {
    if (this._queuedFit) return;
    this._queuedFit = requestAnimationFrame(() => {
      this._queuedFit = null;
      this.fitToParent();
    });
  }

  _ensureProbe() {
    if (this._probe) return this._probe;
    const el = document.createElement('pre');
    const s = el.style;
    s.position = 'absolute';
    s.visibility = 'hidden';
    s.pointerEvents = 'none';
    s.whiteSpace = 'pre';
    s.margin = '0';
    s.padding = '0';
    s.border = '0';
    s.left = '-99999px'; // keep it offscreen
    s.top = '0';
    s.lineHeight = String(this.baseLineHeightFactor);
    s.fontFamily = 'Courier New, monospace';
    document.body.appendChild(el);
    this._probe = el;
    return el;
  }

  _buildProbeText(cols, rows) {
    const key = `${cols}x${rows}`;
    if (this._probeTextCache?.key === key) return this._probeTextCache.text;
    const line = '0'.repeat(Math.max(1, cols));
    const lines = new Array(Math.max(1, rows)).fill(line).join('\n');
    this._probeTextCache = { key, text: lines };
    return lines;
  }

  _measureCharWidthUnit() {
    if (this._charW1Cache != null) return this._charW1Cache;

    const span = document.createElement('span');
    const run = '0'.repeat(200);
    span.textContent = run;
    const s = span.style;
    s.position = 'absolute';
    s.visibility = 'hidden';
    s.whiteSpace = 'pre';
    s.fontFamily = 'Courier New, monospace';
    s.lineHeight = '1';
    s.fontSize = '100px'; // measure large to reduce rounding error
    document.body.appendChild(span);
    const widthAt100 = span.getBoundingClientRect().width || 60;
    document.body.removeChild(span);

    const charWidthAt100 = widthAt100 / run.length; // px/char at 100px
    const charWidthAt1px = charWidthAt100 / 100;    // px/char at 1px
    this._charW1Cache = charWidthAt1px || 0.6;
    return this._charW1Cache;
  }

  _applyProbe(fontPx, letterSpacingPx) {
    const probe = this._ensureProbe();
    const s = probe.style;
    s.fontSize = `${fontPx}px`;
    s.lineHeight = String(this.baseLineHeightFactor);
    s.letterSpacing = `${letterSpacingPx.toFixed(2)}px`;
  }

  _measureNeededBox(cols, rows, fontPx, letterSpacingPx) {
    const probe = this._ensureProbe();
    probe.textContent = this._buildProbeText(cols, rows);
    this._applyProbe(fontPx, letterSpacingPx);
    const rect = probe.getBoundingClientRect();
    return { w: rect.width, h: rect.height };
  }

  fitToParent() {
    if (!this.container) return;

    const parent = this.container.parentElement || document.body;
    // clientWidth/Height includes padding, excludes border/scrollbars → good for fit target
    const availW = Math.max(40, parent.clientWidth  || window.innerWidth);
    const availH = Math.max(40, parent.clientHeight || window.innerHeight);

    // Dimensions of current sequence (columns x rows)
    const dims = (this.currentSequence && this.currentSequence.dimensions) || { width: 60, height: 25 };
    const cols = Math.max(1, dims.width);
    const rows = Math.max(1, dims.height);

    // Initial upper bound guess
    const charW1 = this._measureCharWidthUnit();
    const sizeFromWidth  = availW / (cols * charW1);
    const sizeFromHeight = availH / (rows * this.baseLineHeightFactor);
    let low = this.minFontPx;
    let high = Math.min(this.maxFontPx, Math.max(low, Math.floor(Math.min(sizeFromWidth, sizeFromHeight))));
    if (high < low) high = low;

    // Binary search the largest fontPx that fits both width & height
    let best = low;
    const maxIters = 12;
    for (let i = 0; i < maxIters && low <= high; i++) {
      const mid = Math.floor((low + high) / 2);
      const letterSpacingPx = this.baseLetterSpacingPerPx * mid;
      const need = this._measureNeededBox(cols, rows, mid, letterSpacingPx);

      if (need.w <= availW && need.h <= availH) {
        best = mid;
        low = mid + 1;  // try larger
      } else {
        high = mid - 1; // too big
      }
    }

    // Apply best size
    let fontPx = best;
    let letterSpacingPx = this.baseLetterSpacingPerPx * fontPx;
    this._setContainerMetrics(fontPx, letterSpacingPx);

    // Final safety: if only width slightly overflows due to rounding, squeeze letter-spacing a bit
    const needFinal = this._measureNeededBox(cols, rows, fontPx, letterSpacingPx);
    if ((needFinal.w > availW || needFinal.h > availH) && fontPx > this.minFontPx) {
      // Try squeezing width (down to 80% of original spacing)
      const squeezes = [0.95, 0.9, 0.85, 0.8];
      for (const s of squeezes) {
        const ls = letterSpacingPx * s;
        const box = this._measureNeededBox(cols, rows, fontPx, ls);
        if (box.w <= availW && box.h <= availH) {
          letterSpacingPx = ls;
          this._setContainerMetrics(fontPx, letterSpacingPx);
          break;
        }
      }
    }
  }

  _setContainerMetrics(fontPx, letterSpacingPx) {
    const s = this.container.style;
    s.fontSize = `${fontPx}px`;
    s.lineHeight = String(this.baseLineHeightFactor);
    s.letterSpacing = `${letterSpacingPx.toFixed(2)}px`;
  }

  // -------------------------------------------------------------
  // Sequences
  // -------------------------------------------------------------
  loadDefaultSequences() {
    // Idle sequence - subtle animated pattern
    this.sequences.set('idle', {
      frames: this.generateIdleFrames(),
      frameRate: 2,
      dimensions: { width: 60, height: 25 },
    });

    // Loading pattern
    this.sequences.set('loading', {
      frames: this.generateLoadingFrames(),
      frameRate: 8,
      dimensions: { width: 60, height: 25 },
    });

    // Load your converted videos here (dimensions passed through)
    this.loadSequence('walking', walkingFrames, walkingConfig.frameRate, walkingConfig.dimensions);
    this.loadSequence('coffee',  coffeeFrames,  coffeeConfig.frameRate,  coffeeConfig.dimensions);
    this.loadSequence('idle',   introFrames,   introConfig.frameRate,   introConfig.dimensions);
    this.loadSequence('success',   successFrames,   successConfig.frameRate,   successConfig.dimensions);
    this.loadSequence('failure',   failureFrames,   failureConfig.frameRate,   failureConfig.dimensions);



    console.log('📺 ASCII Video system ready');
    this._queueFit();
  }

  // Generate simple placeholder patterns
  generateIdleFrames() {
    const width = 60;
    const height = 25;
    const frames = [];

    for (let f = 0; f < 8; f++) {
      let frame = '';
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const intensity = Math.sin((x + f * 2) * 0.1) * Math.cos((y + f) * 0.15);
          const charIndex = Math.floor(((intensity + 1) / 2) * (this.asciiChars.length - 1));
          frame += this.asciiChars[Math.max(0, Math.min(this.asciiChars.length - 1, charIndex))];
        }
        frame += '\n';
      }
      frames.push(frame);
    }

    return frames;
  }

  generateLoadingFrames() {
    const width = 60;
    const height = 25;
    const frames = [];

    for (let f = 0; f < 12; f++) {
      let frame = '';
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const wave = Math.sin((x - f * 5) * 0.2) * Math.cos(y * 0.1);
          const pulse = Math.sin(f * 0.5) * 0.3;
          const intensity = (wave + pulse + 1) / 2;
          const charIndex = Math.floor(intensity * (this.asciiChars.length - 1));
          frame += this.asciiChars[Math.max(0, Math.min(this.asciiChars.length - 1, charIndex))];
        }
        frame += '\n';
      }
      frames.push(frame);
    }

    return frames;
  }

  // Convert video frame data to ASCII (for potential in-browser conversion)
  convertFrameToASCII(imageData, width, height) {
    const asciiWidth = 80;
    const asciiHeight = 30;
    let ascii = '';

    for (let y = 0; y < asciiHeight; y++) {
      for (let x = 0; x < asciiWidth; x++) {
        const sourceX = Math.floor((x / asciiWidth) * width);
        const sourceY = Math.floor((y / asciiHeight) * height);
        const pixelIndex = (sourceY * width + sourceX) * 4;

        const r = imageData[pixelIndex];
        const g = imageData[pixelIndex + 1];
        const b = imageData[pixelIndex + 2];
        const gray = (r + g + b) / 3;

        const intensity = gray / 255;
        const charIndex = Math.floor(intensity * (this.asciiChars.length - 1));
        ascii += this.asciiChars[Math.max(0, Math.min(this.asciiChars.length - 1, charIndex))];
      }
      ascii += '\n';
    }

    return ascii;
  }

  // Load a pre-converted ASCII sequence
  async loadSequence(name, frames, frameRate = 15, dimensions = null) {
    this.sequences.set(name, { frames, frameRate, dimensions });
    console.log(`📺 Loaded ASCII sequence: ${name} (${frames.length} frames)`);
  }

  playSequence(name, loop = true) {
    const sequence = this.sequences.get(name);
    if (!sequence) {
      console.warn(`⚠️ ASCII sequence '${name}' not found`);
      return;
    }

    this.currentSequence = sequence;
    this.frameIndex = 0;
    this.loop = loop;
    this.isPlaying = true;
    this.frameRate = sequence.frameRate;

    // Refit to the new grid on next frame
    this._queueFit();

    console.log(`▶️ Playing ASCII sequence: ${name}`);
  }

  stopSequence() {
    this.isPlaying = false;
    this.currentSequence = null;
  }

  update(deltaTime) {
    if (!this.isPlaying || !this.currentSequence) return;

    this.lastFrameTime += deltaTime;
    const frameInterval = 1000 / this.frameRate;

    if (this.lastFrameTime >= frameInterval) {
      this.renderCurrentFrame();
      this.frameIndex++;

      if (this.frameIndex >= this.currentSequence.frames.length) {
        if (this.loop) {
          this.frameIndex = 0;
        } else {
          this.isPlaying = false;
        }
      }

      this.lastFrameTime = 0;
    }
  }

  renderCurrentFrame() {
    if (!this.currentSequence || this.frameIndex >= this.currentSequence.frames.length) return;
    const frame = this.currentSequence.frames[this.frameIndex];
    this.container.textContent = frame;
  }
}
