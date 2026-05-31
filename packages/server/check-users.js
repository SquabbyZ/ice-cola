/**
 * Clear expired tokens and check users table
 */

const { Pool } = require('pg');

const DATABASE_URL = 'postgresql://postgres:postgres@localhost:5432/icecola?schema=public';

async function clearExpiredTokens() {
  const pool = new Pool({ connectionString: DATABASE_URL });

  try {
    console.log('=== Checking Users Tables ===\n');

    // Check if users table exists
    const tablesResult = await pool.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name LIKE '%user%'
      ORDER BY table_name
    `);

    console.log('Found user-related tables:');
    tablesResult.rows.forEach(row => {
      console.log(`  - ${row.table_name}`);
    });

    // Check users in each table
    for (const row of tablesResult.rows) {
      const tableName = row.table_name;
      try {
        const countResult = await pool.query(`SELECT COUNT(*) as count FROM ${tableName}`);
        console.log(`\n${tableName}: ${countResult.rows[0].count} users`);

        if (countResult.rows[0].count > 0) {
          const usersResult = await pool.query(`SELECT * FROM ${tableName} LIMIT 5`);
          console.log('Sample data:');
          usersResult.rows.forEach(user => {
            console.log(`  - ID: ${user.id}, Email: ${user.email || 'N/A'}`);
          });
        }
      } catch (e) {
        console.log(`  (Could not query ${tableName})`);
      }
    }

    console.log('\n=== Solution ===');
    console.log('To fix the JWT expired error:');
    console.log('1. Close the Client application');
    console.log('2. Clear localStorage by running this in browser console:');
    console.log('   localStorage.clear()');
    console.log('3. Or simply re-login in the Client');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

clearExpiredTokens();
