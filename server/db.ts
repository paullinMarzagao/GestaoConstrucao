import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  console.warn("DATABASE_URL não definida. Usando configurações individuais de PG_* ou caindo para storage em memória");
}

const connectionString = process.env.DATABASE_URL || 
  `postgres://${process.env.PGUSER}:${process.env.PGPASSWORD}@${process.env.PGHOST}:${process.env.PGPORT}/${process.env.PGDATABASE}`;

export const pool = new Pool({ connectionString });
export const db = drizzle({ client: pool, schema });

export async function testDatabaseConnection() {
  try {
    const client = await pool.connect();
    client.release();
    console.log("✅ Conexão com o banco de dados estabelecida com sucesso!");
    return true;
  } catch (error) {
    console.error("❌ Não foi possível conectar ao banco de dados:", error);
    return false;
  }
}
