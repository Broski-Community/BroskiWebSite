#!/usr/bin/env node
/**
 * One-shot backfill: populate dtt_demons.creator from the local demon JSON.
 *
 * Demons-only and idempotent. Does NOT touch dtt_players or the tokens file.
 * Upserts full rows (level_id, name, difficulty_tier, creator) keyed on
 * level_id so existing rows get their creator filled in.
 *
 *   node --env-file=.env.local scripts/backfill-dtt-creator.mjs
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('✗ Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY.');
  process.exit(1);
}

const TIER_MAP = {
  'Easy Demon': 'easy',
  'Medium Demon': 'medium',
  'Hard Demon': 'hard',
  'Insane Demon': 'insane',
  'Extreme Demon': 'extreme',
};

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const raw = JSON.parse(
  readFileSync(join(ROOT, 'public/demonlist/lista_demon_gd.json'), 'utf8'),
);

const seen = new Set();
const rows = [];
for (const e of raw) {
  const level_id = String(e.id ?? '').trim();
  if (!level_id || seen.has(level_id)) continue;
  const tier = TIER_MAP[e.difficolta];
  if (!tier) continue; // skip unmapped difficulties (not in allow-list anyway)
  let name = String(e.nome ?? '').trim() || 'Unknown';
  if (name.length > 255) name = name.slice(0, 255);
  const creator = String(e.creatore ?? '').trim() || null;
  seen.add(level_id);
  rows.push({ level_id, name, difficulty_tier: tier, creator });
}

console.log(`→ Backfilling creator on ${rows.length} demons…`);
const BATCH = 1000;
let done = 0;
for (let i = 0; i < rows.length; i += BATCH) {
  const chunk = rows.slice(i, i + BATCH);
  const { error } = await supabase
    .from('dtt_demons')
    .upsert(chunk, { onConflict: 'level_id' });
  if (error) throw new Error(`upsert failed at batch ${i / BATCH}: ${error.message}`);
  done += chunk.length;
  process.stdout.write(`\r  …${done}/${rows.length}`);
}
process.stdout.write('\n');

const { count } = await supabase
  .from('dtt_demons')
  .select('level_id', { count: 'exact', head: true })
  .not('creator', 'is', null);
console.log(`✓ dtt_demons rows with a creator: ${count}`);
