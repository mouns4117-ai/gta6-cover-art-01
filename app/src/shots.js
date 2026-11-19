// Fixed scenes for screenshots: ?shot=cover shows the cover alone, full frame;
// ?shot=editor shows the editor with a photo loaded. window.__shotReady is set
// by main.js once the scene has painted. Query params: photo (sample key),
// caption (title), layout, grade, size, subtitle.

const SHOT_LAYOUTS = ['grid', 'hero', 'strip', 'bleed', 'nine'];
const SHOT_GRADES = ['sunset', 'neon', 'teal', 'gold', 'mono'];
const SHOT_SIZES = ['square', 'portrait', 'wide'];

function pick(list, value, fallback) {
  return list.includes(value) ? value : fallback;
}

function assignPhotos(state, keys) {
  const wanted = keys.length ? keys : state.photos.map((_, i) => i);
  state.panels.forEach((slot, i) => {
    slot.photo = wanted[i % wanted.length] ?? -1;
    slot.zoom = 1;
    slot.ox = 0;
    slot.oy = 0;
  });
}

export async function runShot(shot, query, state, api) {
  const { redraw, commit, syncControls, loadImage, SAMPLES } = api;
  const photoKey = query.get('photo') || 'woman-car';
  const title = query.get('caption') || state.title;
  const subtitle = query.get('subtitle');
  const layout = pick(SHOT_LAYOUTS, query.get('layout'), 'hero');
  const grade = pick(SHOT_GRADES, query.get('grade'), 'sunset');
  const size = pick(SHOT_SIZES, query.get('size'), 'wide');

  if (shot === 'cover') document.body.classList.add('shot-cover');

  commit();
  state.layout = layout;
  state.grade = grade;
  state.size = size;
  state.title = title;
  if (subtitle !== null) state.subtitle = subtitle;
  state.panels = [];
  const count = { grid: 4, hero: 4, strip: 3, bleed: 1, nine: 8 }[layout];
  for (let i = 0; i < count; i += 1) {
    state.panels.push({ photo: -1, zoom: 1, ox: 0, oy: 0 });
  }
  state.selected = 0;

  // Make sure the requested sample is loaded, then spread the photos over panels.
  let idx = state.photos.findIndex((p) => p.src.endsWith(`${photoKey}.jpg`));
  if (idx < 0) {
    const sample = SAMPLES.find((s) => s.key === photoKey);
    if (sample) {
      try {
        const img = await loadImage(sample.src);
        state.photos.push({ img, name: sample.name, src: sample.src });
        idx = state.photos.length - 1;
      } catch {
        idx = 0;
      }
    }
  }
  const order = idx >= 0 ? [idx, ...state.photos.map((_, i) => i).filter((i) => i !== idx)] : [];
  assignPhotos(state, order);
  syncControls();
  redraw();
}
