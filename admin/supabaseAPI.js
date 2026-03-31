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

/* ── CONNECTION ─────────────────────────────────────── */
const SUPABASE_URL = 'https://cgxjqsbrditbteqhdyus.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNneGpxc2JyZGl0YnRlcWhkeXVzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTExMTY1ODEsImV4cCI6MjA2NjY5MjU4MX0.xUDy5ic-r52kmRtocdcW8Np9-lczjMZ6YKPXc03rIG4';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

/* ── Fetch all puzzles ──────────────────────────────── */
/*
  Returns all rows from card_decks ordered newest first.
  Used to populate the archive table and the
  landing-upload.html puzzle dropdown.
*/
export async function fetchAllPuzzles() {
  const { data, error } = await supabase
    .from('word_search_puzzles')
    .select('puzzle_slug, title, word_list, puzzle_url, r2_key, is_active, created_at')
    .order('id', { ascending: false });

  if (error) { console.error('supabaseAPI.fetchAllPuzzles:', error.message); return []; }
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
/*
  Inserts a new row or updates an existing one
  if puzzle_slug already exists (onConflict).

  row shape:
  {
    puzzle_slug:  'puzzle.01',
    title:      'title',
    puzzle_url:   'https://.../landing.html?puzzle=puzzle.01',
    r2_key:     'WordSearch/puzzle.01/puzzle.json'
  }

  Returns: { data, error }
*/
export async function savePuzzle(row) {
  const { data, error } = await supabase
    .from('word_search_puzzles')
    .upsert([{ ...row, updated_at: new Date().toISOString() }], {
      onConflict: 'puzzle_slug',
    })
    .select();

  if (error) console.error('supabaseAPI.savePuzzle:', error.message);
  return { data, error };
}

/* ── Delete puzzle ──────────────────────────────────── */
export async function deletePuzzle(slug) {
  const { error } = await supabase
    .from('word_search_puzzles')
    .delete()
    .eq('puzzle_slug', slug);

  if (error) console.error('supabaseAPI.deletePuzzle:', error.message);
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
