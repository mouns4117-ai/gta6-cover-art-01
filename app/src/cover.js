// Vice Lights cover engine: draws a GTA-style multi-panel poster on a 2D canvas.
// Everything is procedural — photos, gradient grades, lettering, grain, vignette.
// drawCover(ctx, W, H, state) is the only entry point the page and the exporter use.

export const SIZES = [
  { id: 'square', label: '1080 × 1080', w: 1080, h: 1080 },
  { id: 'portrait', label: '1080 × 1350', w: 1080, h: 1350 },
  { id: 'wide', label: '1920 × 1080', w: 1920, h: 1080 },
];

export const LAYOUTS = [
  { id: 'grid', label: 'Vice Grid', panels: 4, note: 'Four-panel grid' },
  { id: 'hero', label: 'Hero + Trio', panels: 4, note: 'Big hero, three stacked' },
  { id: 'strip', label: 'Sunset Strip', panels: 3, note: 'Three stacked bands' },
  { id: 'bleed', label: 'Full Bleed', panels: 1, note: 'One photo, full frame' },
  { id: 'nine', label: 'Nine Panel', panels: 8, note: 'Eight photos, title in the middle' },
];

export const GRADES = [
  { id: 'sunset', label: 'Sunset', top: 'rgba(255,170,60,0.10)', mid: 'rgba(255,110,70,0.16)', bottom: 'rgba(220,40,120,0.42)', mono: false },
  { id: 'neon', label: 'Neon Nights', top: 'rgba(255,60,180,0.24)', mid: 'rgba(120,40,220,0.10)', bottom: 'rgba(0,220,255,0.30)', mono: false },
  { id: 'teal', label: 'Teal Heat', top: 'rgba(0,200,180,0.20)', mid: 'rgba(0,140,160,0.08)', bottom: 'rgba(255,180,60,0.26)', mono: false },
  { id: 'gold', label: 'Vice Gold', top: 'rgba(255,200,90,0.30)', mid: 'rgba(255,160,60,0.14)', bottom: 'rgba(120,60,10,0.30)', mono: false },
  { id: 'mono', label: 'Mono Noir', top: 'rgba(255,255,255,0.06)', mid: 'rgba(255,255,255,0.00)', bottom: 'rgba(255,46,136,0.22)', mono: true },
];

/** Panel rectangles for a layout, as fractions of the cover, plus the title band. */
export function layoutGeometry(layout, W, H) {
  const g = Math.max(3, Math.round(W * 0.012)); // gutter
  const m = g; // outer margin
  const iw = W - m * 2;
  const ih = H - m * 2;
  if (layout === 'grid') {
    const cw = (iw - g) / 2;
    const ch = (ih - g) / 2;
    return {
      panels: [
        { x: m, y: m, w: cw, h: ch },
        { x: m + cw + g, y: m, w: cw, h: ch },
        { x: m, y: m + ch + g, w: cw, h: ch },
        { x: m + cw + g, y: m + ch + g, w: cw, h: ch },
      ],
      title: null,
    };
  }
  if (layout === 'hero') {
    const hw = iw * 0.62;
    const rw = iw - hw - g;
    const rh = (ih - g * 2) / 3;
    return {
      panels: [
        { x: m, y: m, w: hw, h: ih },
        { x: m + hw + g, y: m, w: rw, h: rh },
        { x: m + hw + g, y: m + rh + g, w: rw, h: rh },
        { x: m + hw + g, y: m + (rh + g) * 2, w: rw, h: rh },
      ],
      title: null,
    };
  }
  if (layout === 'strip') {
    const h1 = ih * 0.38;
    const h2 = ih * 0.32;
    const h3 = ih - h1 - h2 - g * 2;
    return {
      panels: [
        { x: m, y: m, w: iw, h: h1 },
        { x: m, y: m + h1 + g, w: iw, h: h2 },
        { x: m, y: m + h1 + h2 + g * 2, w: iw, h: h3 },
      ],
      title: null,
    };
  }
  if (layout === 'bleed') {
    return { panels: [{ x: m, y: m, w: iw, h: ih }], title: null };
  }
  // nine: 3x3 grid, the middle cell is the title block.
  const cw = (iw - g * 2) / 3;
  const ch = (ih - g * 2) / 3;
  const cells = [];
  for (let row = 0; row < 3; row += 1) {
    for (let col = 0; col < 3; col += 1) {
      cells.push({ x: m + col * (cw + g), y: m + row * (ch + g), w: cw, h: ch });
    }
  }
  const titleCell = cells[4];
  return { panels: cells.filter((_, i) => i !== 4), title: titleCell };
}

let noiseTile = null;
/** A small random-noise tile, made once, for the film grain. */
function grainTile() {
  if (noiseTile) return noiseTile;
  const c = document.createElement('canvas');
  c.width = 160;
  c.height = 160;
  const g = c.getContext('2d');
  const data = g.createImageData(160, 160);
  for (let i = 0; i < data.data.length; i += 4) {
    const v = 100 + Math.floor(Math.random() * 110);
    data.data[i] = v;
    data.data[i + 1] = v;
    data.data[i + 2] = v;
    data.data[i + 3] = 255;
  }
  g.putImageData(data, 0, 0);
  noiseTile = c;
  return noiseTile;
}

/** Draws one photo into a rectangle, cover-fit, with zoom and pan offsets. */
function drawPhotoInto(ctx, img, rect, zoom, ox, oy) {
  const scale = Math.max(rect.w / img.naturalWidth, rect.h / img.naturalHeight) * zoom;
  const dw = img.naturalWidth * scale;
  const dh = img.naturalHeight * scale;
  const dx = rect.x + (rect.w - dw) / 2 + ox * rect.w;
  const dy = rect.y + (rect.h - dh) / 2 + oy * rect.h;
  ctx.drawImage(img, dx, dy, dw, dh);
}

/** A placeholder panel when no photo is assigned yet. */
function drawEmptyPanel(ctx, rect) {
  const grad = ctx.createLinearGradient(rect.x, rect.y, rect.x + rect.w, rect.y + rect.h);
  grad.addColorStop(0, '#3a1c5c');
  grad.addColorStop(1, '#160a24');
  ctx.fillStyle = grad;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.font = `600 ${Math.max(14, rect.h * 0.07)}px system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('YOUR PHOTO HERE', rect.x + rect.w / 2, rect.y + rect.h / 2);
}

/** Shrinks the font until the text fits maxWidth. Returns the font size used. */
function fitFont(ctx, text, family, startPx, maxWidth, weight) {
  let size = startPx;
  const set = (s) => { ctx.font = `${weight} ${s}px ${family}`; };
  set(size);
  while (size > 12 && ctx.measureText(text).width > maxWidth) {
    size -= 2;
    set(size);
  }
  return size;
}

/** The title block: big gradient Anton title, neon Pacifico subtitle, badge pill. */
function drawTitleBlock(ctx, rect, state, W, H) {
  const { title, subtitle, badge, titleTop } = state;
  const pad = Math.max(14, W * 0.02);
  const x = rect.x + pad;
  const maxW = rect.w - pad * 2;

  // Scrim so the letters read over any photo.
  const scrim = ctx.createLinearGradient(0, rect.y, 0, rect.y + rect.h);
  if (titleTop) {
    scrim.addColorStop(0, 'rgba(8,3,16,0.88)');
    scrim.addColorStop(1, 'rgba(8,3,16,0)');
  } else {
    scrim.addColorStop(0, 'rgba(8,3,16,0)');
    scrim.addColorStop(1, 'rgba(8,3,16,0.88)');
  }
  ctx.fillStyle = scrim;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);

  const words = (title || 'UNTITLED').trim().toUpperCase();
  const titlePx = fitFont(ctx, words, "Anton, 'Arial Black', sans-serif", rect.h * 0.46, maxW, 400);
  const grad = ctx.createLinearGradient(x, rect.y, x + maxW, rect.y);
  grad.addColorStop(0, '#ffd23f');
  grad.addColorStop(0.35, '#ff7a3d');
  grad.addColorStop(0.7, '#ff2e88');
  grad.addColorStop(1, '#b967ff');
  const baseline = titleTop
    ? rect.y + rect.h * 0.18 + titlePx * 0.8
    : rect.y + rect.h * 0.62;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.lineJoin = 'round';
  ctx.lineWidth = Math.max(2, titlePx * 0.07);
  ctx.strokeStyle = 'rgba(255,255,255,0.95)';
  ctx.strokeText(words, x, baseline);
  ctx.fillStyle = grad;
  ctx.fillText(words, x, baseline);

  const sub = (subtitle || '').trim();
  if (sub) {
    const subPx = fitFont(ctx, sub, "Pacifico, cursive", rect.h * 0.2, maxW * 0.9, 400);
    ctx.font = `${subPx}px Pacifico, cursive`;
    ctx.fillStyle = '#ff5da2';
    ctx.shadowColor = 'rgba(255,46,136,0.9)';
    ctx.shadowBlur = subPx * 0.55;
    ctx.fillText(sub, x + 2, baseline + subPx * 1.15);
    ctx.shadowBlur = 0;
  }

  const tag = (badge || '').trim();
  if (tag) {
    const tagPx = Math.max(12, rect.h * 0.13);
    ctx.font = `700 ${tagPx}px system-ui, sans-serif`;
    const tw = ctx.measureText(`★ ${tag.toUpperCase()} ★`).width;
    const bw = tw + tagPx * 1.6;
    const bh = tagPx * 2.1;
    const bx = rect.x + rect.w - bw - pad;
    const by = titleTop ? rect.y + pad * 0.5 : rect.y + rect.h - bh - pad * 0.5;
    ctx.fillStyle = 'rgba(10,4,20,0.72)';
    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    ctx.lineWidth = Math.max(1.5, tagPx * 0.09);
    roundRect(ctx, bx, by, bw, bh, bh / 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#ffd23f';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`★ ${tag.toUpperCase()} ★`, bx + bw / 2, by + bh / 2 + 1);
  }
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/**
 * Draws the whole cover. state: { layout, grade, title, subtitle, badge, titleTop,
 *   photos: Image[], panels: [{ photo, zoom, ox, oy }] }.
 */
export function drawCover(ctx, W, H, state) {
  const grade = GRADES.find((g) => g.id === state.grade) || GRADES[0];
  const geo = layoutGeometry(state.layout, W, H);
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = '#14091f';
  ctx.fillRect(0, 0, W, H);

  geo.panels.forEach((rect, i) => {
    const slot = state.panels[i] || { photo: -1, zoom: 1, ox: 0, oy: 0 };
    const entry = slot.photo >= 0 ? state.photos[slot.photo] : null;
    const img = entry ? (entry.img || entry) : null;
    ctx.save();
    ctx.beginPath();
    ctx.rect(rect.x, rect.y, rect.w, rect.h);
    ctx.clip();
    if (img) {
      if (grade.mono) ctx.filter = 'grayscale(1) contrast(1.12) brightness(1.04)';
      drawPhotoInto(ctx, img, rect, slot.zoom, slot.ox, slot.oy);
      ctx.filter = 'none';
      const wash = ctx.createLinearGradient(rect.x, rect.y, rect.x, rect.y + rect.h);
      wash.addColorStop(0, grade.top);
      wash.addColorStop(0.55, grade.mid);
      wash.addColorStop(1, grade.bottom);
      ctx.globalCompositeOperation = 'overlay';
      ctx.fillStyle = wash;
      ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = grade.bottom;
      ctx.globalAlpha = 0.16;
      ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
      ctx.globalAlpha = 1;
    } else {
      drawEmptyPanel(ctx, rect);
    }
    ctx.restore();
  });

  // White poster frame: outer border and gutters.
  const frame = Math.max(2, W * 0.004);
  ctx.strokeStyle = 'rgba(255,255,255,0.92)';
  ctx.lineWidth = frame;
  geo.panels.forEach((rect) => ctx.strokeRect(rect.x, rect.y, rect.w, rect.h));
  ctx.lineWidth = frame * 1.6;
  ctx.strokeRect(frame, frame, W - frame * 2, H - frame * 2);

  // Title: middle cell for nine-panel, a band for the rest.
  if (geo.title) {
    const cell = geo.title;
    ctx.save();
    ctx.beginPath();
    ctx.rect(cell.x, cell.y, cell.w, cell.h);
    ctx.clip();
    ctx.fillStyle = '#180b28';
    ctx.fillRect(cell.x, cell.y, cell.w, cell.h);
    const words = (state.title || 'UNTITLED').trim().toUpperCase();
    const titlePx = fitFont(ctx, words, "Anton, 'Arial Black', sans-serif", cell.h * 0.3, cell.w * 0.88, 400);
    const grad = ctx.createLinearGradient(cell.x, cell.y, cell.x + cell.w, cell.y);
    grad.addColorStop(0, '#ffd23f');
    grad.addColorStop(0.5, '#ff2e88');
    grad.addColorStop(1, '#b967ff');
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    ctx.lineWidth = Math.max(2, titlePx * 0.07);
    ctx.strokeStyle = 'rgba(255,255,255,0.95)';
    const cy = cell.y + cell.h * 0.42;
    ctx.strokeText(words, cell.x + cell.w / 2, cy);
    ctx.fillStyle = grad;
    ctx.fillText(words, cell.x + cell.w / 2, cy);
    const sub = (state.subtitle || '').trim();
    if (sub) {
      const subPx = fitFont(ctx, sub, 'Pacifico, cursive', cell.h * 0.13, cell.w * 0.86, 400);
      ctx.font = `${subPx}px Pacifico, cursive`;
      ctx.fillStyle = '#ff5da2';
      ctx.shadowColor = 'rgba(255,46,136,0.9)';
      ctx.shadowBlur = subPx * 0.5;
      ctx.fillText(sub, cell.x + cell.w / 2, cell.y + cell.h * 0.74);
      ctx.shadowBlur = 0;
    }
    ctx.restore();
    ctx.strokeStyle = 'rgba(255,255,255,0.92)';
    ctx.lineWidth = frame;
    ctx.strokeRect(cell.x, cell.y, cell.w, cell.h);
  } else {
    const bandH = H * 0.26;
    const band = state.titleTop
      ? { x: 0, y: 0, w: W, h: bandH }
      : { x: 0, y: H - bandH, w: W, h: bandH };
    drawTitleBlock(ctx, band, state, W, H);
  }

  // Film grain, then a vignette to pull the eye inward.
  const tile = grainTile();
  const pattern = ctx.createPattern(tile, 'repeat');
  ctx.save();
  ctx.globalAlpha = 0.09;
  ctx.globalCompositeOperation = 'overlay';
  ctx.fillStyle = pattern;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
  const vig = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.42, W / 2, H / 2, Math.max(W, H) * 0.72);
  vig.addColorStop(0, 'rgba(0,0,0,0)');
  vig.addColorStop(1, 'rgba(0,0,0,0.34)');
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, W, H);
}
