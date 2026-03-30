/**
 * 3C Word Search — Supabase API
 * ─────────────────────────────────────────────────────
 * Built by Claude (Anthropic) × Chef Anica · 3C Thread To Success
 *
 * Table: word_search_puzzles
 * Columns: id, puzzle_slug, title, word_list, grid_data,
 *          bg_image, intro_asset, finale_asset,
 *          puzzle_url, r2_key, is_active, created_at, updated_at
 */

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const { SUPABASE_URL, SUPABASE_ANON_KEY } = window.APP_CONFIG;
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/* ── Fetch all puzzles ──────────────────────────────── */
export async function fetchAllPuzzles() {
  const { data, error } = await supabase
    .from('word_search_puzzles')
    .select('puzzle_slug, title, word_list, puzzle_url, r2_key, is_active, created_at')
    .order('created_at', { ascending: false });

  if (error) { console.error('fetchAllPuzzles:', error.message); return []; }
  return data || [];
}

/* ── Generate next slug ─────────────────────────────── */
export function generateNextSlug(archive) {
  const used = archive.map(p => {
    const m = p.puzzle_slug.match(/^puzzle\.(\d+)$/);
    return m ? parseInt(m[1]) : null;
  }).filter(n => n !== null);

  let n = 1;
  while (used.includes(n)) n++;
  return `puzzle.${String(n).padStart(2, '0')}`;
}

/* ── Save puzzle (upsert) ───────────────────────────── */
export async function savePuzzle(row) {
  const { data, error } = await supabase
    .from('word_search_puzzles')
    .upsert([{ ...row, updated_at: new Date().toISOString() }], {
      onConflict: 'puzzle_slug',
    })
    .select();

  if (error) console.error('savePuzzle:', error.message);
  return { data, error };
}

/* ── Delete puzzle ──────────────────────────────────── */
export async function deletePuzzle(slug) {
  const { error } = await supabase
    .from('word_search_puzzles')
    .delete()
    .eq('puzzle_slug', slug);

  if (error) console.error('deletePuzzle:', error.message);
  return { error };
}

/* ── Toggle active state ────────────────────────────── */
export async function togglePuzzleActive(slug, isActive) {
  const { error } = await supabase
    .from('word_search_puzzles')
    .update({ is_active: isActive, updated_at: new Date().toISOString() })
    .eq('puzzle_slug', slug);

  if (error) console.error('togglePuzzleActive:', error.message);
  return { error };
}
