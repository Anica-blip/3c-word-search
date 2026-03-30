/**
 * 3C Word Search — Admin Builder Logic
 * Built by Claude (Anthropic) × Chef Anica · 3C Thread To Success
 */

import {
  supabase,
  fetchAllPuzzles,
  generateNextSlug,
  savePuzzle,
  deletePuzzle,
  togglePuzzleActive,
} from './supabaseAPI.js';

// ── Constants ───────────────────────────────────────────────────────────────
const GRID_SIZE = 12;
const DIRS = [
  [0,1],[1,0],[1,1],[0,-1],[-1,0],[-1,-1],[1,-1],[-1,1]
];
const ALPHA = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const { WORKER_URL, PUZZLE_BASE_URL } = window.APP_CONFIG;

// ── State ────────────────────────────────────────────────────────────────────
let currentSlug     = '';
let currentGrid     = null;
let currentPlacements = [];
let archive         = [];
let bgFile = null, introFile = null, finaleFile = null;
let bgUrl  = '',   introUrl  = '',   finaleUrl  = '';

// ── DOM refs ──────────────────────────────────────────────────────────────────
const titleInput    = () => document.getElementById('puzzle-title');
const wordInput     = () => document.getElementById('word-list');
const slugDisplay   = () => document.getElementById('slug-display');
const gridWrap      = () => document.getElementById('grid-preview');
const statusEl      = () => document.getElementById('status-msg');
const archiveEl     = () => document.getElementById('puzzle-archive');

// ── Init ──────────────────────────────────────────────────────────────────────
export async function init() {
  archive = await fetchAllPuzzles();
  currentSlug = generateNextSlug(archive);
  slugDisplay().textContent = currentSlug;
  renderArchive();
  bindUploads();
}

// ── Status messages ───────────────────────────────────────────────────────────
function showStatus(msg, type = 'info') {
  const el = statusEl();
  el.textContent = msg;
  el.className = `show ${type}`;
  if (type === 'success') setTimeout(() => el.classList.remove('show'), 4000);
}

// ── Word placement algorithm ──────────────────────────────────────────────────
function canPlace(grid, word, r, c, [dr, dc]) {
  for (let i = 0; i < word.length; i++) {
    const nr = r + i * dr, nc = c + i * dc;
    if (nr < 0 || nr >= GRID_SIZE || nc < 0 || nc >= GRID_SIZE) return false;
    if (grid[nr][nc] && grid[nr][nc] !== word[i]) return false;
  }
  return true;
}

function placeWord(grid, word, r, c, [dr, dc]) {
  for (let i = 0; i < word.length; i++)
    grid[r + i * dr][c + i * dc] = word[i];
}

function generateGrid(wordList) {
  const grid = Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(''));
  const placements = [];

  for (const word of wordList) {
    const dirs = [...DIRS].sort(() => Math.random() - 0.5);
    let placed = false;

    for (const dir of dirs) {
      if (placed) break;
      for (let t = 0; t < 100; t++) {
        const r = Math.floor(Math.random() * GRID_SIZE);
        const c = Math.floor(Math.random() * GRID_SIZE);
        if (canPlace(grid, word, r, c, dir)) {
          placeWord(grid, word, r, c, dir);
          placements.push({ word, row: r, col: c, dir });
          placed = true;
          break;
        }
      }
    }

    if (!placed) showStatus(`⚠ Could not place: ${word}`, 'warning');
  }

  // Fill blanks
  for (let r = 0; r < GRID_SIZE; r++)
    for (let c = 0; c < GRID_SIZE; c++)
      if (!grid[r][c]) grid[r][c] = ALPHA[Math.floor(Math.random() * 26)];

  return { grid, placements };
}

// ── Grid preview ──────────────────────────────────────────────────────────────
function renderGridPreview(grid, placements) {
  const wordCells = new Set();
  placements.forEach(({ word, row, col, dir: [dr, dc] }) => {
    for (let i = 0; i < word.length; i++)
      wordCells.add(`${row + i * dr},${col + i * dc}`);
  });

  gridWrap().innerHTML = grid.map((row, r) =>
    row.map((l, c) =>
      `<span class="preview-cell${wordCells.has(`${r},${c}`) ? ' preview-word' : ''}">${l}</span>`
    ).join('')
  ).join('');
}

// ── Generate + preview ────────────────────────────────────────────────────────
export function generateAndPreview() {
  const words = wordInput().value
    .split('\n')
    .map(w => w.trim().toUpperCase().replace(/[^A-Z]/g, ''))
    .filter(w => w.length >= 2 && w.length <= GRID_SIZE);

  if (!words.length) { showStatus('Add at least one word (min 2 letters)', 'error'); return; }

  const result = generateGrid(words);
  currentGrid       = result.grid;
  currentPlacements = result.placements;

  renderGridPreview(currentGrid, currentPlacements);
  showStatus(`Grid generated — ${currentPlacements.length} of ${words.length} words placed`, 'success');
}

// ── Media upload to R2 ────────────────────────────────────────────────────────
async function uploadMedia(file, type) {
  if (!file) return '';
  const ext = file.name.split('.').pop();
  const filename = `${type}.${ext}`;
  try {
    const res = await fetch(`${WORKER_URL}/media/${currentSlug}/${filename}`, {
      method: 'PUT',
      headers: { 'Content-Type': file.type },
      body: file,
    });
    if (!res.ok) throw new Error(await res.text());
    const data = await res.json();
    return data.public_url || '';
  } catch (err) {
    showStatus(`Upload failed (${type}): ${err.message}`, 'error');
    return '';
  }
}

// ── Save puzzle ───────────────────────────────────────────────────────────────
export async function savePuzzleHandler() {
  const title = titleInput().value.trim();
  if (!title)        { showStatus('Add a puzzle title', 'error'); return; }
  if (!currentGrid)  { showStatus('Generate the grid first', 'error'); return; }

  const words = wordInput().value
    .split('\n')
    .map(w => w.trim().toUpperCase().replace(/[^A-Z]/g, ''))
    .filter(w => w.length >= 2);

  showStatus('Uploading media...', 'info');
  bgUrl    = await uploadMedia(bgFile, 'bg');
  introUrl = await uploadMedia(introFile, 'intro');
  finaleUrl= await uploadMedia(finaleFile, 'finale');

  showStatus('Saving to R2...', 'info');
  const puzzleData = {
    puzzle_slug:  currentSlug,
    title,
    word_list:    words,
    grid:         currentGrid,
    placements:   currentPlacements,
    bg_image:     bgUrl,
    intro_asset:  introUrl,
    finale_asset: finaleUrl,
  };

  const r2Res = await fetch(`${WORKER_URL}/puzzle/${currentSlug}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(puzzleData),
  });

  if (!r2Res.ok) { showStatus('R2 save failed', 'error'); return; }

  showStatus('Saving to Supabase...', 'info');
  const puzzleUrl = `${PUZZLE_BASE_URL}?puzzle=${currentSlug}`;
  const { error } = await savePuzzle({
    puzzle_slug:  currentSlug,
    title,
    word_list:    words,
    grid_data:    { grid: currentGrid, placements: currentPlacements },
    bg_image:     bgUrl,
    intro_asset:  introUrl,
    finale_asset: finaleUrl,
    puzzle_url:   puzzleUrl,
    r2_key:       `WordSearch/${currentSlug}.json`,
    is_active:    true,
  });

  if (error) { showStatus(`Supabase error: ${error.message}`, 'error'); return; }

  showStatus(`✅ Puzzle ${currentSlug} saved!`, 'success');
  archive = await fetchAllPuzzles();
  renderArchive();
}

// ── New puzzle ────────────────────────────────────────────────────────────────
export function newPuzzle() {
  currentSlug       = generateNextSlug(archive);
  currentGrid       = null;
  currentPlacements = [];
  bgFile = introFile = finaleFile = null;
  bgUrl  = introUrl  = finaleUrl  = '';

  slugDisplay().textContent = currentSlug;
  titleInput().value = '';
  wordInput().value  = '';
  gridWrap().innerHTML = '';
  document.getElementById('bg-name').textContent    = 'No file';
  document.getElementById('intro-name').textContent  = 'No file';
  document.getElementById('finale-name').textContent = 'No file';
  showStatus('', 'info');
}

// ── Load puzzle for editing ────────────────────────────────────────────────────
export async function editPuzzle(slug) {
  showStatus(`Loading ${slug}...`, 'info');
  const res = await fetch(`${WORKER_URL}/puzzle/${slug}`);
  if (!res.ok) { showStatus('Load failed', 'error'); return; }

  const data = await res.json();
  currentSlug       = slug;
  currentGrid       = data.grid;
  currentPlacements = data.placements;

  slugDisplay().textContent = currentSlug;
  titleInput().value = data.title || '';
  wordInput().value  = (data.word_list || []).join('\n');

  bgUrl    = data.bg_image   || '';
  introUrl = data.intro_asset || '';
  finaleUrl= data.finale_asset|| '';

  renderGridPreview(currentGrid, currentPlacements);
  showStatus(`Loaded ${slug} for editing`, 'success');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ── Delete puzzle ─────────────────────────────────────────────────────────────
export async function deletePuzzleHandler(slug) {
  if (!confirm(`Delete ${slug}? This cannot be undone.`)) return;
  await deletePuzzle(slug);
  // Also remove from R2
  await fetch(`${WORKER_URL}/puzzle/${slug}`, { method: 'DELETE' });
  archive = await fetchAllPuzzles();
  renderArchive();
  showStatus(`${slug} deleted`, 'success');
}

// ── Archive table ─────────────────────────────────────────────────────────────
function renderArchive() {
  const el = archiveEl();
  if (!archive.length) {
    el.innerHTML = '<p style="color:var(--text-muted);font-size:13px;">No puzzles saved yet.</p>';
    return;
  }

  el.innerHTML = `
    <h2>Puzzle Archive</h2>
    <table>
      <thead>
        <tr>
          <th>Edit</th>
          <th>Puzzle #</th>
          <th>Title</th>
          <th>Words</th>
          <th>Status</th>
          <th>URL</th>
          <th>Delete</th>
        </tr>
      </thead>
      <tbody>
        ${archive.map(p => `
          <tr>
            <td><button class="btn-toolbar" onclick="window._builder.edit('${p.puzzle_slug}')">Edit</button></td>
            <td style="font-weight:700;color:var(--accent-light)">${p.puzzle_slug}</td>
            <td>${p.title}</td>
            <td>${(p.word_list || []).length}</td>
            <td>
              <button class="btn-toolbar" style="font-size:11px;"
                onclick="window._builder.toggle('${p.puzzle_slug}', ${!p.is_active})">
                ${p.is_active ? '✅ Active' : '⏸ Paused'}
              </button>
            </td>
            <td>
              <input type="text" value="${p.puzzle_url || ''}" readonly
                style="width:180px;font-size:10px;background:var(--surface-2);border:1px solid var(--border);color:var(--text-2);border-radius:5px;padding:3px 6px;" />
              <button class="btn-toolbar" style="font-size:10px;padding:4px 8px;"
                onclick="navigator.clipboard.writeText('${p.puzzle_url || ''}')">Copy</button>
            </td>
            <td><button class="btn-toolbar btn-danger" onclick="window._builder.del('${p.puzzle_slug}')">✕</button></td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

// ── File upload bindings ──────────────────────────────────────────────────────
function bindUploads() {
  const bind = (inputId, nameId, setter) => {
    document.getElementById(inputId).addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      setter(file);
      document.getElementById(nameId).textContent = file.name;
    });
  };
  bind('upload-bg',     'bg-name',     f => bgFile    = f);
  bind('upload-intro',  'intro-name',  f => introFile  = f);
  bind('upload-finale', 'finale-name', f => finaleFile = f);
}

// ── Expose to window for HTML onclick handlers ────────────────────────────────
window._builder = {
  edit:   editPuzzle,
  del:    deletePuzzleHandler,
  toggle: async (slug, active) => {
    await togglePuzzleActive(slug, active);
    archive = await fetchAllPuzzles();
    renderArchive();
  },
};
