import sql, { ConnectionPool } from "mssql";

const config = {
  server: process.env.DB_SERVER!,
  port: 1433,
  user: process.env.DB_USER!,
  password: process.env.DB_PASSWORD!,
  database: process.env.DB_DATABASE!,
  options: {
    encrypt: false,
    trustServerCertificate: true,
  },
};

export async function getConnection(): Promise<ConnectionPool> {
  try {
    const pool = await sql.connect(config);
    return pool;
  } catch (err) {
    throw new Error("Database Connection Failed: " + err);
  }
}
