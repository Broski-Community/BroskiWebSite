#!/usr/bin/env node
/**
 * Demon Tier Tracker — one-shot production seeder.
 *
 * Seeds the demon allow-list (`dtt_demons`) from the local JSON file and creates
 * Secret_Player_Tokens for the configured players (`dtt_players`). Both steps are
 * idempotent and safe to re-run.
 *
 * Credentials are read from the environment (never hard-coded, never committed):
 *   SUPABASE_URL              project URL  (e.g. https://echeoibsdqdawkfogfob.supabase.co)
 *   SUPABASE_SERVICE_ROLE_KEY service-role secret (bypasses RLS; server-only)
 *
 * Run (values come from your Vercel project settings):
 *   SUPABASE_URL='...' SUPABASE_SERVICE_ROLE_KEY='...' node scripts/seed-dtt.mjs
 * or, with a gitignored env file:
 *   node --env-file=.env.seed scripts/seed-dtt.mjs
 *
 * Raw player tokens are written to `dtt-player-tokens.local.txt` (gitignored) and
 * are NEVER printed in full to stdout, so they stay off your terminal history.
 */
import { createClient } from '@supabase/supabase-js';
import { createHash, randomBytes } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error(
    '\n✗ Missing credentials. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.\n' +
      "  e.g.  SUPABASE_URL='https://echeoibsdqdawkfogfob.supabase.co' \\\n" +
      "        SUPABASE_SERVICE_ROLE_KEY='<service-role-key>' node scripts/seed-dtt.mjs\n",
  );
  process.exit(1);
}

const DEMON_LIST_PATH = join(ROOT, 'public/demonlist/lista_demon_gd.json');
const TOKENS_OUT_PATH = join(ROOT, 'dtt-player-tokens.local.txt');

// Players to provision (raw tokens generated locally, only the hash is stored).
const PLAYER_USERNAMES = ['zZalix', 'RobZeph', 'Klockish', 'zleemm', 'UniversoMC', 'B0bX2'];

// "Easy Demon" -> easy, etc. Matches the difficulty_tier enum.
const TIER_MAP = {
  'Easy Demon': 'easy',
  'Medium Demon': 'medium',
  'Hard Demon': 'hard',
  'Insane Demon': 'insane',
  'Extreme Demon': 'extreme',
};

const sha256hex = (s) => createHash('sha256').update(s, 'utf8').digest('hex');

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function seedDemons() {
  const raw = JSON.parse(readFileSync(DEMON_LIST_PATH, 'utf8'));
  const seen = new Set();
  const rows = [];
  const unmapped = new Set();
  for (const e of raw) {
    const level_id = String(e.id ?? '').trim();
    if (!level_id || seen.has(level_id)) continue;
    const tier = TIER_MAP[e.difficolta];
    if (!tier) {
      unmapped.add(e.difficolta);
      continue;
    }
    let name = String(e.nome ?? '').trim() || 'Unknown';
    if (name.length > 255) name = name.slice(0, 255);
    const creator = String(e.creatore ?? '').trim() || null;
    seen.add(level_id);
    rows.push({ level_id, name, difficulty_tier: tier, creator });
  }
  if (unmapped.size) {
    throw new Error(`Unmapped difficolta values: ${[...unmapped].join(', ')}`);
  }

  console.log(`→ Seeding ${rows.length} unique demons (idempotent)…`);
  const BATCH = 1000;
  let upserted = 0;
  for (let i = 0; i < rows.length; i += BATCH) {
    const chunk = rows.slice(i, i + BATCH);
    const { error } = await supabase
      .from('dtt_demons')
      .upsert(chunk, { onConflict: 'level_id' });
    if (error) throw new Error(`dtt_demons upsert failed at batch ${i / BATCH}: ${error.message}`);
    upserted += chunk.length;
    process.stdout.write(`\r  …${upserted}/${rows.length}`);
  }
  process.stdout.write('\n');

  const { count, error: cErr } = await supabase
    .from('dtt_demons')
    .select('level_id', { count: 'exact', head: true });
  if (cErr) throw new Error(`count failed: ${cErr.message}`);
  console.log(`✓ dtt_demons now holds ${count} rows.`);
}

async function createPlayerTokens() {
  console.log(`→ Provisioning ${PLAYER_USERNAMES.length} player tokens (idempotent)…`);

  const { data: existing, error: exErr } = await supabase
    .from('dtt_players')
    .select('username')
    .in('username', PLAYER_USERNAMES);
  if (exErr) throw new Error(`lookup failed: ${exErr.message}`);
  const have = new Set((existing ?? []).map((r) => r.username));

  const lines = [
    '# Demon Tier Tracker — Secret Player Tokens',
    '# Paste each token into the mod setting "Secret Player Token" for that player.',
    '# Keep this file private. It is gitignored. Regenerating requires deleting the row.',
    `# Generated: ${new Date().toISOString()}`,
    '',
  ];

  let created = 0;
  for (const username of PLAYER_USERNAMES) {
    if (have.has(username)) {
      lines.push(`${username}: (already exists — token not shown; delete the row to reissue)`);
      console.log(`  • ${username}: already exists, skipped`);
      continue;
    }
    const token = randomBytes(32).toString('hex'); // 256-bit secret
    const { error } = await supabase
      .from('dtt_players')
      .insert({ username, token_hash: sha256hex(token) });
    if (error) throw new Error(`insert for ${username} failed: ${error.message}`);
    lines.push(`${username}: ${token}`);
    created += 1;
    console.log(`  • ${username}: created (token ends …${token.slice(-6)})`);
  }

  writeFileSync(TOKENS_OUT_PATH, lines.join('\n') + '\n', { mode: 0o600 });
  console.log(`✓ ${created} new token(s). Full tokens written to: ${TOKENS_OUT_PATH}`);
}

try {
  await seedDemons();
  await createPlayerTokens();
  console.log('\n✓ Done. Open dtt-player-tokens.local.txt for the raw player tokens.');
} catch (err) {
  console.error(`\n✗ Seed failed: ${err.message}`);
  process.exit(1);
}
