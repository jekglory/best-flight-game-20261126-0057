// Meridian Run — hand-in program (Node 22, standard library only).
//
// Copies game/ and screenshots/ from this repository into the output
// directory the grader provides (/output, or MAKEFUN_OUTPUT_DIR when
// run by hand) and writes /output/dossier.json with buildDossier from
// the kit's vendor/makefun-game.ts. It runs twice in the grader and
// both runs must write the same bytes, so it copies files only and
// keeps no clock, no random value and no network anywhere in it.
import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const repoRoot = dirname(fileURLToPath(import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR || '/output';

// The output directory belongs to the grader: create it when it is
// missing, never remove it, and only ever write files inside it.
mkdirSync(outDir, { recursive: true });
mkdirSync(join(outDir, 'game'), { recursive: true });
mkdirSync(join(outDir, 'screenshots'), { recursive: true });

const gameSrc = join(repoRoot, 'game');
const shotsSrc = join(repoRoot, 'screenshots');
if (!existsSync(gameSrc)) throw new Error('game/ is missing from the repository');
if (!existsSync(shotsSrc)) throw new Error('screenshots/ is missing from the repository');

cpSync(gameSrc, join(outDir, 'game'), { recursive: true, force: true });
cpSync(shotsSrc, join(outDir, 'screenshots'), { recursive: true, force: true });

const dossier = buildDossier(outDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
});
if (!dossier || dossier.length === 0) throw new Error('buildDossier wrote nothing');
writeFileSync(join(outDir, 'dossier.json'), dossier);
