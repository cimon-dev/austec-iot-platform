import { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg';

export class PostgresClient {
  private static instance: PostgresClient;
  private pool: Pool | null = null;
  private isConnected: boolean = false;
  private connectionString: string;

  private constructor() {
    this.connectionString =
      process.env.DATABASE_URL ||
      'postgresql://austec_admin:AustecSecure2026Password!@127.0.0.1:5432/austec_iot_db';
  }

  public static getInstance(): PostgresClient {
    if (!PostgresClient.instance) {
      PostgresClient.instance = new PostgresClient();
    }
    return PostgresClient.instance;
  }

  public async connect(): Promise<boolean> {
    if (this.isConnected && this.pool) {
      return true;
    }

    try {
      this.pool = new Pool({
        connectionString: this.connectionString,
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 5000,
      });

      const client = await this.pool.connect();
      const safeConn = this.connectionString.replace(/:[^:@]*@/, ':****@');
      console.log(`[PostgresClient] Đã kết nối thành công tới PostgreSQL tại ${safeConn}`);
      client.release();
      this.isConnected = true;
      return true;
    } catch (error: any) {
      console.error('[PostgresClient] Lỗi kết nối PostgreSQL:', error.message);
      this.isConnected = false;
      return false;
    }
  }

  public getConnected(): boolean {
    return this.isConnected;
  }

  public getPool(): Pool | null {
    return this.pool;
  }

  public async query<T extends QueryResultRow = any>(
    text: string,
    params?: any[]
  ): Promise<QueryResult<T>> {
    if (!this.pool) {
      const ok = await this.connect();
      if (!ok || !this.pool) {
        throw new Error('[PostgresClient] Database chưa được kết nối.');
      }
    }
    return this.pool.query<T>(text, params);
  }

  public async getClient(): Promise<PoolClient> {
    if (!this.pool) {
      await this.connect();
      if (!this.pool) {
        throw new Error('[PostgresClient] Database chưa được kết nối.');
      }
    }
    return this.pool.connect();
  }

  public async transaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.getClient();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}

export const postgresClient = PostgresClient.getInstance();
