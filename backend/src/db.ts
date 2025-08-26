import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

export const db = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl:
    process.env.NODE_ENV === 'production' || process.env.PGSSL?.toLowerCase() === 'true'
      ? { rejectUnauthorized: false }
      : undefined,
});

db.connect()
  .then((client) => {
    console.log('✅ Connected to PostgreSQL');
    client.release();
  })
  .catch((err) => console.error('❌ PostgreSQL connection error:', err));
