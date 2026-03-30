// api/puzzles.js — 3C Word Search
// Puzzle CRUD via Supabase service role key
// GET  /api/puzzles?slug=puzzle.01   → fetch single puzzle
// GET  /api/puzzles                  → fetch all puzzles
// POST /api/puzzles                  → upsert puzzle

import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  return createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY  // service role — full access, bypasses RLS
  );
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  const supabase = getSupabase();

  // ── GET ────────────────────────────────────────────────────────────────────
  if (req.method === 'GET') {
    const { slug } = req.query;

    if (slug) {
      // Single puzzle
      const { data, error } = await supabase
        .from('word_search_puzzles')
        .select('*')
        .eq('puzzle_slug', slug)
        .eq('is_active', true)
        .single();

      if (error || !data) {
        return res.status(404).json({ error: 'Puzzle not found', slug });
      }
      return res.status(200).json({ success: true, data });
    }

    // All puzzles
    const { data, error } = await supabase
      .from('word_search_puzzles')
      .select('puzzle_slug, title, word_list, puzzle_url, r2_key, is_active, created_at')
      .order('created_at', { ascending: false });

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ success: true, data: data || [] });
  }

  // ── POST (upsert) ──────────────────────────────────────────────────────────
  if (req.method === 'POST') {
    const row = req.body;

    if (!row?.puzzle_slug) {
      return res.status(400).json({ error: 'puzzle_slug is required' });
    }

    const { data, error } = await supabase
      .from('word_search_puzzles')
      .upsert([{ ...row, updated_at: new Date().toISOString() }], {
        onConflict: 'puzzle_slug',
      })
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ success: true, data });
  }

  // ── DELETE ─────────────────────────────────────────────────────────────────
  if (req.method === 'DELETE') {
    const { slug } = req.query;
    if (!slug) return res.status(400).json({ error: 'slug required' });

    const { error } = await supabase
      .from('word_search_puzzles')
      .delete()
      .eq('puzzle_slug', slug);

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ success: true, deleted: slug });
  }

  res.status(405).json({ error: 'Method not allowed' });
}
