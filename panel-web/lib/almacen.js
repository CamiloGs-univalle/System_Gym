// ============================================================
// Almacenamiento del último resumen recibido del gimnasio.
// - Con DATABASE_URL: PostgreSQL (recomendado en Render/Railway, el disco
//   de esos servicios se borra en cada despliegue).
// - Sin DATABASE_URL: archivo JSON en DATA_DIR (VPS o Docker con volumen).
// ============================================================
import fs from "node:fs/promises";
import path from "node:path";

const HISTORIAL = 10; // resúmenes que se conservan en PostgreSQL

export async function crearAlmacen(config) {
  if (config.databaseUrl) {
    const { default: pg } = await import("pg");
    const pool = new pg.Pool({ connectionString: config.databaseUrl, max: 3 });
    await pool.query(`
      CREATE TABLE IF NOT EXISTS panel_resumenes (
        id BIGSERIAL PRIMARY KEY,
        recibido_en TIMESTAMPTZ NOT NULL DEFAULT now(),
        datos JSONB NOT NULL
      )`);
    console.log("[panel] Almacenamiento: PostgreSQL");
    return {
      async guardar(datos) {
        const { rows } = await pool.query(
          "INSERT INTO panel_resumenes (datos) VALUES ($1) RETURNING recibido_en", [datos]);
        await pool.query(
          `DELETE FROM panel_resumenes WHERE id NOT IN
             (SELECT id FROM panel_resumenes ORDER BY id DESC LIMIT ${HISTORIAL})`);
        return rows[0].recibido_en.toISOString();
      },
      async ultimo() {
        const { rows } = await pool.query(
          "SELECT recibido_en, datos FROM panel_resumenes ORDER BY id DESC LIMIT 1");
        if (rows.length === 0) return null;
        return { recibidoEn: rows[0].recibido_en.toISOString(), datos: rows[0].datos };
      },
    };
  }

  await fs.mkdir(config.dataDir, { recursive: true });
  const archivo = path.join(config.dataDir, "ultimo-resumen.json");
  console.log(`[panel] Almacenamiento: archivo ${archivo}`);
  let cache = null;
  return {
    async guardar(datos) {
      const registro = { recibidoEn: new Date().toISOString(), datos };
      const tmp = `${archivo}.tmp`;
      await fs.writeFile(tmp, JSON.stringify(registro), { mode: 0o600 });
      await fs.rename(tmp, archivo); // escritura atómica: nunca queda un archivo a medias
      cache = registro;
      return registro.recibidoEn;
    },
    async ultimo() {
      if (cache) return cache;
      try {
        cache = JSON.parse(await fs.readFile(archivo, "utf8"));
        return cache;
      } catch {
        return null;
      }
    },
  };
}
