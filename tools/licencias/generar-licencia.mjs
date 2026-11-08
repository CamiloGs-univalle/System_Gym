// Genera una licencia firmada para un gimnasio.
// Uso: node tools/licencias/generar-licencia.mjs <private.pem> "<Nombre del gimnasio>" <AAAA-MM-DD>
import { createSign } from "node:crypto";
import { readFileSync } from "node:fs";

const [, , keyPath, gym, expires] = process.argv;
if (!keyPath || !gym || !/^\d{4}-\d{2}-\d{2}$/.test(expires || "")) {
  console.error('Uso: node tools/licencias/generar-licencia.mjs <private.pem> "Nombre del gimnasio" 2026-12-31');
  process.exit(1);
}
const payload = Buffer.from(JSON.stringify({ gym, expires, issued: new Date().toISOString().slice(0, 10) }))
  .toString("base64url");
const signer = createSign("SHA256");
signer.update(payload, "ascii");
const signature = signer.sign(readFileSync(keyPath, "utf8")).toString("base64url");
console.log(`${payload}.${signature}`);
