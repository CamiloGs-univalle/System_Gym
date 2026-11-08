// Crea el par de llaves RSA para firmar licencias de System Gym.
// Uso: node tools/licencias/crear-llaves.mjs <carpeta-destino>
// La llave privada (private.pem) se guarda fuera del repositorio y no se comparte.
import { generateKeyPairSync } from "node:crypto";
import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";

const dir = resolve(process.argv[2] || "");
if (!process.argv[2]) {
  console.error("Uso: node tools/licencias/crear-llaves.mjs <carpeta-destino-fuera-del-repo>");
  process.exit(1);
}
if (existsSync(join(dir, "private.pem"))) {
  console.error("Ya existe private.pem en esa carpeta. No se sobrescribe.");
  process.exit(1);
}
mkdirSync(dir, { recursive: true });
const { publicKey, privateKey } = generateKeyPairSync("rsa", {
  modulusLength: 2048,
  publicKeyEncoding: { type: "spki", format: "pem" },
  privateKeyEncoding: { type: "pkcs8", format: "pem" },
});
writeFileSync(join(dir, "private.pem"), privateKey, { mode: 0o600 });
writeFileSync(join(dir, "public.pem"), publicKey);
console.log("Llaves creadas en", dir);
console.log("\nCopie esta llave pública en systemgym.license.public-key (application.properties):\n");
console.log(publicKey.replace(/-----[^-]+-----/g, "").replace(/\s/g, ""));
