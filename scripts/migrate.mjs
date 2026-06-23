// Migração de dados: projeto ANTIGO (gen-lang-client / "RH-Benesse",
// banco ai-studio-55ed0d53-...) → NOVO (crm-benesse, banco default).
//
// Uso (a partir da pasta benesse-crm):
//   node scripts/migrate.mjs            # migra de verdade
//   node scripts/migrate.mjs --dry      # só conta os documentos, não escreve
//
// Requer 2 chaves de service account (NÃO commitar):
//   secrets/old.json  -> projeto gen-lang-client-0070086689
//   secrets/new.json  -> projeto crm-benesse
// (ou defina os caminhos via env OLD_KEY / NEW_KEY)

import { readFileSync } from 'fs';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const OLD_KEY = process.env.OLD_KEY || './secrets/old.json';
const NEW_KEY = process.env.NEW_KEY || './secrets/new.json';
const OLD_DB  = process.env.OLD_DB  || 'ai-studio-55ed0d53-dad0-48c7-93ab-2fa5504c744f';
const DRY     = process.argv.includes('--dry');

// Coleções do CRM (modelo plano, sem subcoleções).
const COLLECTIONS = [
  'leads', 'interactions', 'tasks', 'documents',
  'negotiations', 'users', 'funnel_configs', 'whatsapp_inbox',
];

function loadKey(path) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch (e) {
    console.error(`\n✗ Não consegui ler a chave em "${path}". Coloque o JSON do service account aí.\n  ${e.message}`);
    process.exit(1);
  }
}

const oldApp = initializeApp({ credential: cert(loadKey(OLD_KEY)) }, 'old');
const newApp = initializeApp({ credential: cert(loadKey(NEW_KEY)) }, 'new');

const oldDb = getFirestore(oldApp, OLD_DB); // banco não-padrão do AI Studio
const newDb = getFirestore(newApp);          // banco (default)

console.log(`\nMigração ${DRY ? '(DRY-RUN — não escreve)' : ''}`);
console.log(`  origem: ${oldApp.options.credential ? loadKey(OLD_KEY).project_id : '?'} / ${OLD_DB}`);
console.log(`  destino: ${loadKey(NEW_KEY).project_id} / (default)\n`);

let totalLidos = 0, totalGravados = 0;

for (const col of COLLECTIONS) {
  let snap;
  try {
    snap = await oldDb.collection(col).get();
  } catch (e) {
    console.log(`• ${col}: erro ao ler (${e.message}) — pulando`);
    continue;
  }
  totalLidos += snap.size;
  console.log(`• ${col}: ${snap.size} documento(s)`);
  if (DRY || snap.empty) continue;

  let batch = newDb.batch();
  let count = 0, gravados = 0;
  for (const doc of snap.docs) {
    batch.set(newDb.collection(col).doc(doc.id), doc.data());
    count++; gravados++;
    if (count >= 400) { await batch.commit(); batch = newDb.batch(); count = 0; }
  }
  if (count > 0) await batch.commit();
  totalGravados += gravados;
  console.log(`    → ${gravados} gravado(s) no destino`);
}

console.log(`\n${DRY ? 'Lidos' : 'Migrados'}: ${DRY ? totalLidos : totalGravados} documento(s) no total.`);
console.log('Concluído.\n');
process.exit(0);
