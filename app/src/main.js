// Vice Lights wiring: photos, panels, pickers, undo/redo, export and ?shot= scenes.
import { drawCover, layoutGeometry, LAYOUTS, GRADES, SIZES } from './cover.js';
import { runShot } from './shots.js';

const canvas = document.getElementById('cover');
const ctx = canvas.getContext('2d');
const statusEl = document.getElementById('status');
const panelHint = document.getElementById('panelHint');

const SAMPLES = [
  { key: 'woman-car', name: 'Boulevard', src: 'samples/woman-car.jpg' },
  { key: 'man-rooftop', name: 'Rooftop', src: 'samples/man-rooftop.jpg' },
  { key: 'friends-neon', name: 'Neon Night', src: 'samples/friends-neon.jpg' },
];

const state = {
  layout: 'hero',
  grade: 'sunset',
  title: 'SUNSET RUN',
  subtitle: 'golden hour, vice lights',
  badge: 'VICE LIGHTS',
  titleTop: false,
  size: 'wide',
  photos: [], // { img, name, src }
  panels: [], // { photo, zoom, ox, oy } per layout slot
  selected: 0,
};

let history = [];
let future = [];

function snapshot() {
  return JSON.stringify({
    layout: state.layout,
    grade: state.grade,
    title: state.title,
    subtitle: state.subtitle,
    badge: state.badge,
    titleTop: state.titleTop,
    size: state.size,
    panels: state.panels,
    selected: state.selected,
  });
}

function restore(json) {
  const s = JSON.parse(json);
  Object.assign(state, s);
  syncControls();
  redraw();
}

function commit() {
  history.push(snapshot());
  if (history.length > 60) history.shift();
  future = [];
  syncUndoButtons();
}

function syncUndoButtons() {
  document.getElementById('undo').disabled = history.length === 0;
  document.getElementById('redo').disabled = future.length === 0;
}

function currentSize() {
  return SIZES.find((s) => s.id === state.size) || SIZES[0];
}

function panelCount() {
  return (LAYOUTS.find((l) => l.id === state.layout) || LAYOUTS[0]).panels;
}

function freshPanels() {
  const n = panelCount();
  const slots = [];
  for (let i = 0; i < n; i += 1) {
    slots.push({ photo: state.photos.length ? i % state.photos.length : -1, zoom: 1, ox: 0, oy: 0 });
  }
  return slots;
}

function redraw() {
  const size = currentSize();
  if (canvas.width !== size.w || canvas.height !== size.h) {
    canvas.width = size.w;
    canvas.height = size.h;
  }
  drawCover(ctx, canvas.width, canvas.height, state);
  if (document.body.classList.contains('shot-cover')) {
    panelHint.textContent = '';
    return;
  }
  const geo = layoutGeometry(state.layout, canvas.width, canvas.height);
  const slot = state.panels[state.selected];
  if (slot && geo.panels[state.selected]) {
    const r = geo.panels[state.selected];
    ctx.save();
    ctx.strokeStyle = '#ffd23f';
    ctx.lineWidth = Math.max(3, canvas.width * 0.004);
    ctx.setLineDash([18, 10]);
    ctx.strokeRect(r.x + 4, r.y + 4, r.w - 8, r.h - 8);
    ctx.restore();
    const name = slot.photo >= 0 ? state.photos[slot.photo].name : 'empty';
    panelHint.textContent = `Panel ${state.selected + 1}: ${name} — drag to move, scroll to zoom.`;
  } else {
    panelHint.textContent = 'No panel selected — click a panel to edit its photo.';
  }
}

export function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`could not load ${src}`));
    img.src = src;
  });
}

async function addPhoto(img, name, src) {
  state.photos.push({ img, name, src });
  renderTray();
}

function renderTray() {
  const tray = document.getElementById('photoTray');
  tray.replaceChildren();
  state.photos.forEach((p, i) => {
    const thumb = document.createElement('img');
    thumb.className = 'thumb';
    thumb.src = p.src;
    thumb.alt = p.name;
    thumb.title = p.name;
    thumb.setAttribute('aria-pressed', String(state.panels[state.selected]?.photo === i));
    thumb.addEventListener('click', () => {
      commit();
      const slot = state.panels[state.selected];
      if (slot) {
        slot.photo = i;
        slot.zoom = 1;
        slot.ox = 0;
        slot.oy = 0;
      }
      renderTray();
      redraw();
    });
    tray.appendChild(thumb);
  });
}

function buildPicker(el, items, current, onPick, swatch) {
  el.replaceChildren();
  items.forEach((item) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = item.label;
    b.setAttribute('aria-pressed', String(item.id === current));
    if (swatch) {
      b.className = 'swatch';
      b.title = item.label;
      b.textContent = '';
      b.style.background = `linear-gradient(135deg, ${item.top}, ${item.bottom})`;
    }
    b.addEventListener('click', () => {
      commit();
      onPick(item.id);
      buildPicker(el, items, item.id, onPick, swatch);
      redraw();
    });
    el.appendChild(b);
  });
}

function syncControls() {
  document.getElementById('titleText').value = state.title;
  document.getElementById('subtitleText').value = state.subtitle;
  document.getElementById('badgeText').value = state.badge;
  document.getElementById('titleTop').checked = state.titleTop;
  buildPicker(document.getElementById('layoutRow'), LAYOUTS, state.layout, (id) => {
    state.layout = id;
    state.panels = freshPanels();
    state.selected = 0;
  });
  buildPicker(document.getElementById('gradeRow'), GRADES, state.grade, (id) => { state.grade = id; }, true);
  buildPicker(document.getElementById('sizeRow'), SIZES, state.size, (id) => { state.size = id; });
  renderTray();
  syncUndoButtons();
}

// Photo uploads from the user's machine.
document.getElementById('photoFiles').addEventListener('change', async (e) => {
  const files = [...e.target.files];
  if (!files.length) return;
  commit();
  for (const file of files) {
    const url = URL.createObjectURL(file);
    try {
      const img = await loadImage(url);
      await addPhoto(img, file.name.replace(/\.[^.]+$/, ''), url);
    } catch {
      statusEl.textContent = `Could not read ${file.name}.`;
    }
  }
  if (state.panels.every((p) => p.photo < 0)) state.panels = freshPanels();
  redraw();
  e.target.value = '';
});

document.getElementById('fillAll').addEventListener('click', () => {
  if (!state.photos.length) return;
  commit();
  state.panels.forEach((p) => { p.photo = 0; p.zoom = 1; p.ox = 0; p.oy = 0; });
  renderTray();
  redraw();
});

// Lettering inputs.
document.getElementById('titleText').addEventListener('input', (e) => { state.title = e.target.value; redraw(); });
document.getElementById('subtitleText').addEventListener('input', (e) => { state.subtitle = e.target.value; redraw(); });
document.getElementById('badgeText').addEventListener('input', (e) => { state.badge = e.target.value; redraw(); });
document.getElementById('titleTop').addEventListener('change', (e) => { commit(); state.titleTop = e.target.checked; redraw(); });

// Undo / redo / reset.
document.getElementById('undo').addEventListener('click', () => {
  if (!history.length) return;
  future.push(snapshot());
  restore(history.pop());
  syncUndoButtons();
});
document.getElementById('redo').addEventListener('click', () => {
  if (!future.length) return;
  history.push(snapshot());
  restore(future.pop());
  syncUndoButtons();
});
document.getElementById('reset').addEventListener('click', () => {
  commit();
  state.layout = 'hero';
  state.grade = 'sunset';
  state.title = 'SUNSET RUN';
  state.subtitle = 'golden hour, vice lights';
  state.badge = 'VICE LIGHTS';
  state.titleTop = false;
  state.size = 'wide';
  state.panels = freshPanels();
  state.selected = 0;
  syncControls();
  redraw();
});

// Export: render at the chosen size and download the PNG.
document.getElementById('export').addEventListener('click', () => {
  const size = currentSize();
  const off = document.createElement('canvas');
  off.width = size.w;
  off.height = size.h;
  drawCover(off.getContext('2d'), size.w, size.h, state);
  off.toBlob((blob) => {
    if (!blob) {
      statusEl.textContent = 'Export failed — try again.';
      return;
    }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `vice-lights-${size.w}x${size.h}.png`;
    a.click();
    statusEl.textContent = `Saved vice-lights-${size.w}x${size.h}.png (${Math.round(blob.size / 1024)} KB)`;
  }, 'image/png');
});

// Panel editing on the canvas: click to select, drag to pan, wheel to zoom.
function canvasPoint(e) {
  const r = canvas.getBoundingClientRect();
  return {
    x: ((e.clientX - r.left) / r.width) * canvas.width,
    y: ((e.clientY - r.top) / r.height) * canvas.height,
  };
}

function hitPanel(p) {
  const geo = layoutGeometry(state.layout, canvas.width, canvas.height);
  return geo.panels.findIndex((r) => p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h);
}

let dragging = null;
canvas.addEventListener('pointerdown', (e) => {
  const p = canvasPoint(e);
  const i = hitPanel(p);
  if (i < 0) return;
  commit();
  state.selected = i;
  dragging = { last: p, moved: false };
  canvas.setPointerCapture(e.pointerId);
  renderTray();
  redraw();
});
canvas.addEventListener('pointermove', (e) => {
  if (!dragging) return;
  const p = canvasPoint(e);
  const slot = state.panels[state.selected];
  const geo = layoutGeometry(state.layout, canvas.width, canvas.height);
  const r = geo.panels[state.selected];
  if (!slot || !r) return;
  slot.ox += (p.x - dragging.last.x) / r.w;
  slot.oy += (p.y - dragging.last.y) / r.h;
  slot.ox = Math.max(-1.5, Math.min(1.5, slot.ox));
  slot.oy = Math.max(-1.5, Math.min(1.5, slot.oy));
  dragging.last = p;
  dragging.moved = true;
  redraw();
});
canvas.addEventListener('pointerup', () => { dragging = null; });
canvas.addEventListener('wheel', (e) => {
  e.preventDefault();
  const slot = state.panels[state.selected];
  if (!slot) return;
  commit();
  slot.zoom = Math.max(1, Math.min(4, slot.zoom * Math.exp(-e.deltaY * 0.0012)));
  redraw();
}, { passive: false });

// Boot: load the samples, then either a ?shot= scene or the plain editor.
async function boot() {
  for (const s of SAMPLES) {
    try {
      const img = await loadImage(s.src);
      await addPhoto(img, s.name, s.src);
    } catch {
      // A missing sample just leaves that slot empty.
    }
  }
  state.panels = freshPanels();
  syncControls();

  const query = new URLSearchParams(location.search);
  const shot = query.get('shot');
  if (shot) {
    await runShot(shot, query, state, { redraw, commit, syncControls, loadImage, SAMPLES });
  }
  await document.fonts.ready;
  redraw();
  requestAnimationFrame(() => requestAnimationFrame(() => { window.__shotReady = true; }));
}

boot();
