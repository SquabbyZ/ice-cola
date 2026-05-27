const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'icecola',
  user: 'postgres',
  password: 'postgres',
});

async function check() {
  const client = await pool.connect();
  try {
    const result = await client.query('SELECT id, email, name, role FROM admin_users LIMIT 5');
    console.log('Admin users:', JSON.stringify(result.rows, null, 2));
  } finally {
    client.release();
    await pool.end();
  }
}

check().catch(console.error);