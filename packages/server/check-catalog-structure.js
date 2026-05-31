const { Pool } = require('pg');
const DATABASE_URL = 'postgresql://postgres:postgres@localhost:5432/icecola?schema=public';

async function checkStructure() {
  const pool = new Pool({ connectionString: DATABASE_URL });
  try {
    const columns = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'model_catalog'
      ORDER BY ordinal_position
    `);
    
    console.log('model_catalog table structure:');
    columns.rows.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
    });

    // Check existing data
    const existing = await pool.query('SELECT * FROM model_catalog LIMIT 1');
    if (existing.rows.length > 0) {
      console.log('\nSample data:');
      console.log(existing.rows[0]);
    }
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}
checkStructure();
