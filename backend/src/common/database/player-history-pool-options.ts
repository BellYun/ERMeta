import { PoolConfig } from 'pg';

export function playerHistoryPoolOptions(get: (name: string) => string | undefined): PoolConfig {
  const socket = get('INSTANCE_UNIX_SOCKET');
  if (socket) {
    const user = get('DB_USER');
    const password = get('DB_PASS');
    const database = get('DB_NAME');
    if (!user || !password || !database) {
      throw new Error('DB_USER, DB_PASS, and DB_NAME are required with INSTANCE_UNIX_SOCKET');
    }
    return { host: socket, user, password, database, max: 5, connectionTimeoutMillis: 3000 };
  }
  const connectionString = get('DATABASE_URL');
  if (!connectionString) {
    throw new Error('DATABASE_URL or INSTANCE_UNIX_SOCKET is required');
  }
  return { connectionString, max: 10, connectionTimeoutMillis: 3000 };
}
