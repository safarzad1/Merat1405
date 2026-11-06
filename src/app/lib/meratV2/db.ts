import * as sql from "mssql";
import { getConnection } from "@/lib/db";

/**
 * Research V2 must use the exact same connection as the working legacy
 * APIs. The legacy configuration uses DB_SERVER/DB_USER/DB_PASSWORD/
 * DB_DATABASE; requiring unrelated MERAT_SQL_* variables caused HTTP 500
 * in V2 detail endpoints on existing installations.
 *
 * getConnection() uses the application's shared SQL pool and retains
 * its existing certificate/encryption settings.
 */
export async function getMeratPool(): Promise<sql.ConnectionPool> {
  return getConnection();
}

export { sql };
