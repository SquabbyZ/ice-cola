/**
 * Clear users table to allow re-registration
 */

const { Pool } = require('pg');

const DATABASE_URL = 'postgresql://postgres:postgres@localhost:5432/icecola?schema=public';

async function clearUsers() {
  const pool = new Pool({ connectionString: DATABASE_URL });

  try {
    console.log('Clearing users table...');
    await pool.query('DELETE FROM users');
    console.log('✅ Successfully cleared users table');
    console.log('You can now register a new client user');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

clearUsers();
