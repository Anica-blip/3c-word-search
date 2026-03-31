/**
 * 3C Word Search — Admin Builder Logic
 * Built by Claude (Anthropic) × Chef Anica · 3C Thread To Success
 * All media loaded from computer — local preview only, never uploaded here.
 * On Save Puzzle: ONE JSON pushed to R2 via worker with auto-constructed R2 URLs.
 * Supabase holds the puzzle index (slug, title, url, r2_key).
 *
 * JSON fields saved:
 *   intro   → public/index.html screen-intro  (loaded from computer in admin)
 *   finale  → public/index.html screen-finale (loaded from computer in admin)
 *   landing → patched separately by landing-upload.html after upload to R2
 */

import {
  supabase,
  fetchAllPuzzles,
  generateNextSlug,
  savePuzzle,
  deletePuzzle,
  togglePuzzleActive,
} from './supabaseAPI.js';

// ── Constants ────────────────────────────────────────────────────────────────
const GRID_SIZE = 12;
const DIRS = [
  [0,1],[1,0],[1,1],[0,-1],[-1,0],[-1,-1],[1,-1],[-1,1]
];
const ALPHA = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const { WORKER_URL, PUZZLE_BASE_URL } = window.APP_CONFIG;

// ── State ─────────────────────────────────────────────────────────────────────
let currentSlug       = '';
let currentGrid       = null;
let currentPlacements = [];
let currentPuzzleUrl  = '';
let archive           = [];
let bgFile = null, introFile = null, finaleFile = null;
let bgUrl  = '',   introUrl  = '',   finaleUrl  = '';

// ── Init ──────────────────────────────────────────────────────────────────────
export async function init() {
  archive      = await fetchAllPuzzles();
  currentSlug  = generateNextSlug(archive);
  setSlugDisplay(currentSlug, '');
  renderArchive();
  bindUploads();
}

// ── Slug + URL display ────────────────────────────────────────────────────────
function setSlugDisplay(slug, url) {
  const badge = document.getElementById('slug-display');
  const urlEl = document.getElementById('puzzle-url-display');
  const urlWrap = document.getElementById('puzzle-url-wrap');

  if (badge) badge.textContent = slug;

  if (urlEl && urlWrap) {
    if (url) {
      urlEl.value = url;
      urlWrap.style.display = 'flex';
    } else {
      urlWrap.style.display = 'none';
    }
  }
}

// ── Status messages ───────────────────────────────────────────────────────────
function showStatus(msg, type = 'info') {
  const el = document.getElementById('status-msg');
  if (!el) return;
  el.textContent = msg;
  el.className = `show ${type}`;
  if (type === 'success') setTimeout(() => el.classList.remove('show'), 5000);
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

  // Fill blanks with random letters
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

  const el = document.getElementById('grid-preview');
  if (!el) return;

  el.innerHTML = grid.map((row, r) =>
    row.map((l, c) =>
      `<span class="preview-cell${wordCells.has(`${r},${c}`) ? ' preview-word' : ''}">${l}</span>`
    ).join('')
  ).join('');
}

// ── Generate + preview ────────────────────────────────────────────────────────
export function generateAndPreview() {
  const words = getWordList();
  if (!words.length) { showStatus('Add at least one word (min 2 letters)', 'error'); return; }

  const result = generateGrid(words);
  currentGrid       = result.grid;
  currentPlacements = result.placements;

  renderGridPreview(currentGrid, currentPlacements);
  showStatus(`✅ Grid generated — ${currentPlacements.length} of ${words.length} words placed`, 'success');
}

function getWordList() {
  const ta = document.getElementById('word-list');
  if (!ta) return [];
  return ta.value
    .split('\n')
    .map(w => w.trim().toUpperCase().replace(/[^A-Z]/g, ''))
    .filter(w => w.length >= 2 && w.length <= GRID_SIZE);
}

// ── Media upload to R2 ────────────────────────────────────────────────────────
async function uploadMedia(file, type) {
  if (!file) return '';
  const ext      = file.name.split('.').pop();
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
  const title = document.getElementById('puzzle-title')?.value.trim();
  if (!title)       { showStatus('Add a puzzle title', 'error'); return; }
  if (!currentGrid) { showStatus('Generate the grid first', 'error'); return; }

  const words = getWordList();

  showStatus('Uploading media...', 'info');
  bgUrl     = bgFile    ? await uploadMedia(bgFile,    'bg')     : bgUrl;
  introUrl  = introFile ? await uploadMedia(introFile, 'intro')  : introUrl;
  finaleUrl = finaleFile? await uploadMedia(finaleFile,'finale') : finaleUrl;

  showStatus('Saving to R2...', 'info');

  const puzzleUrl  = `${PUZZLE_BASE_URL}?puzzle=${currentSlug}`;
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

  if (!r2Res.ok) { showStatus('R2 save failed: ' + await r2Res.text(), 'error'); return; }

  showStatus('Saving to Supabase...', 'info');
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

  // ── Update UI with saved URL ──────────────────────────────────────────────
  currentPuzzleUrl = puzzleUrl;
  setSlugDisplay(currentSlug, puzzleUrl);
  showStatus(`✅ Puzzle ${currentSlug} saved! URL ready to copy.`, 'success');

  archive = await fetchAllPuzzles();
  renderArchive();
}

// ── New puzzle ────────────────────────────────────────────────────────────────
export function newPuzzle() {
  currentSlug       = generateNextSlug(archive);
  currentGrid       = null;
  currentPlacements = [];
  currentPuzzleUrl  = '';
  bgFile = introFile = finaleFile = null;
  bgUrl  = introUrl  = finaleUrl  = '';

  setSlugDisplay(currentSlug, '');

  const titleEl = document.getElementById('puzzle-title');
  const wordEl  = document.getElementById('word-list');
  const gridEl  = document.getElementById('grid-preview');
  if (titleEl) titleEl.value = '';
  if (wordEl)  wordEl.value  = '';
  if (gridEl)  gridEl.innerHTML = '';

  ['bg-name','intro-name','finale-name'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.textContent = 'No file';
  });

  showStatus('', 'info');
}

// ── Load puzzle for editing ────────────────────────────────────────────────────
export async function editPuzzle(slug) {
  showStatus(`Loading ${slug}...`, 'info');
  try {
    const res = await fetch(`${WORKER_URL}/puzzle/${slug}`);
    if (!res.ok) throw new Error('Fetch failed');
    const data = await res.json();

    currentSlug       = slug;
    currentGrid       = data.grid;
    currentPlacements = data.placements;

    // Find puzzle_url from archive
    const archiveRow = archive.find(p => p.puzzle_slug === slug);
    currentPuzzleUrl = archiveRow?.puzzle_url || `${PUZZLE_BASE_URL}?puzzle=${slug}`;
    setSlugDisplay(currentSlug, currentPuzzleUrl);

    const titleEl = document.getElementById('puzzle-title');
    const wordEl  = document.getElementById('word-list');
    if (titleEl) titleEl.value = data.title || '';
    if (wordEl)  wordEl.value  = (data.word_list || []).join('\n');

    bgUrl     = data.bg_image    || '';
    introUrl  = data.intro_asset || '';
    finaleUrl = data.finale_asset|| '';

    renderGridPreview(currentGrid, currentPlacements);
    showStatus(`Loaded ${slug} — make changes and click Save Puzzle`, 'success');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  } catch (err) {
    showStatus(`Load failed: ${err.message}`, 'error');
  }
}

// ── Delete puzzle ─────────────────────────────────────────────────────────────
export async function deletePuzzleHandler(slug) {
  if (!confirm(`Delete ${slug}? This cannot be undone.`)) return;
  await deletePuzzle(slug);
  await fetch(`${WORKER_URL}/puzzle/${slug}`, { method: 'DELETE' });
  archive = await fetchAllPuzzles();
  renderArchive();
  showStatus(`${slug} deleted`, 'success');
}

// ── Archive table — matches card game style with Open button ──────────────────
function renderArchive() {
  const el = document.getElementById('puzzle-archive');
  if (!el) return;

  if (!archive.length) {
    el.innerHTML = '<p style="color:var(--text-muted);font-size:13px;padding:10px 0;">No puzzles saved yet.</p>';
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
            <td>
              <button class="btn-toolbar" style="font-size:11px;padding:4px 12px;"
                onclick="window._builder.edit('${p.puzzle_slug}')">Edit</button>
            </td>
            <td style="font-weight:700;color:var(--accent-light);">${p.puzzle_slug}</td>
            <td>${p.title}</td>
            <td>${(p.word_list || []).length}</td>
            <td>
              <button class="btn-toolbar" style="font-size:11px;padding:4px 12px;"
                onclick="window._builder.toggle('${p.puzzle_slug}', ${!p.is_active})">
                ${p.is_active ? '✅ Active' : '⏸ Paused'}
              </button>
            </td>
            <td style="display:flex;align-items:center;gap:6px;">
              <input type="text" value="${p.puzzle_url || ''}" readonly
                style="width:200px;font-size:10px;background:var(--surface-2);border:1px solid var(--border);color:var(--text-2);border-radius:5px;padding:3px 6px;" />
              <button class="btn-toolbar" style="font-size:10px;padding:4px 8px;"
                onclick="navigator.clipboard.writeText('${p.puzzle_url || ''}').then(()=>this.textContent='Copied!').catch(()=>{});setTimeout(()=>this.textContent='Copy',1500)">
                Copy
              </button>
              <a href="${p.puzzle_url || '#'}" target="_blank" rel="noopener"
                class="btn-toolbar" style="font-size:10px;padding:4px 8px;text-decoration:none;">
                Open ↗
              </a>
            </td>
            <td>
              <button class="btn-toolbar btn-danger" style="font-size:11px;padding:4px 10px;"
                onclick="window._builder.del('${p.puzzle_slug}')">✕</button>
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

// ── File upload bindings ──────────────────────────────────────────────────────
function bindUploads() {
  const bind = (inputId, nameId, setter) => {
    const el = document.getElementById(inputId);
    if (!el) return;
    el.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      setter(file);
      const nameEl = document.getElementById(nameId);
      if (nameEl) nameEl.textContent = file.name;
    });
  };
  bind('upload-bg',     'bg-name',     f => bgFile    = f);
  bind('upload-intro',  'intro-name',  f => introFile  = f);
  bind('upload-finale', 'finale-name', f => finaleFile = f);
}

// Copy URL button handler
export function copyPuzzleUrl() {
  const el = document.getElementById('puzzle-url-display');
  if (!el || !el.value) return;
  navigator.clipboard.writeText(el.value)
    .then(() => {
      const btn = document.getElementById('copy-url-btn');
      if (btn) { btn.textContent = 'Copied!'; setTimeout(() => btn.textContent = 'Copy URL', 1500); }
    });
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
