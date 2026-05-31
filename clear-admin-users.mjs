#!/usr/bin/env node
/**
 * Clear admin_users table to allow re-registration of owner
 */

import pg from 'pg';
const { Pool } = pg;

const DATABASE_URL = 'postgresql://postgres:postgres@localhost:5432/icecola?schema=public';

async function clearAdminUsers() {
  const pool = new Pool({ connectionString: DATABASE_URL });

  try {
    console.log('Connecting to database...');

    // Check existing users
    const checkResult = await pool.query('SELECT id, email, role FROM admin_users');
    console.log(`\nFound ${checkResult.rows.length} admin user(s):`);
    checkResult.rows.forEach(user => {
      console.log(`  - ${user.email} (${user.role})`);
    });

    if (checkResult.rows.length === 0) {
      console.log('\n✅ No admin users found. You can register a new owner.');
      await pool.end();
      return;
    }

    // Clear the table
    console.log('\nClearing admin_users table...');
    await pool.query('DELETE FROM admin_users');

    console.log('✅ Successfully cleared admin_users table');
    console.log('You can now register a new owner at http://localhost:1992/login');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

clearAdminUsers();
