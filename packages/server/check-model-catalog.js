/**
 * Check model_catalog table - this is the actual table used by Client!
 */

const { Pool } = require('pg');

const DATABASE_URL = 'postgresql://postgres:postgres@localhost:5432/icecola?schema=public';

async function checkModelCatalog() {
  const pool = new Pool({ connectionString: DATABASE_URL });

  try {
    console.log('=== Checking model_catalog Table ===\n');

    // Check all models in catalog
    const allModels = await pool.query(`
      SELECT id, model_name, display_name, description, is_active, required_plan_level
      FROM model_catalog
      ORDER BY rank ASC
    `);

    console.log(`Found ${allModels.rows.length} models in catalog:`);
    allModels.rows.forEach(model => {
      const status = model.is_active ? '✅ Active' : '❌ Inactive';
      console.log(`  ${status} - ${model.display_name} (${model.model_name})`);
    });

    // Check if gpt-4o-mini is in catalog
    const gptModel = await pool.query(`
      SELECT * FROM model_catalog WHERE model_name LIKE '%gpt-4o-mini%'
    `);

    if (gptModel.rows.length > 0) {
      console.log('\n⚠️  Found gpt-4o-mini in model_catalog:');
      gptModel.rows.forEach(model => {
        console.log(`  - ${model.display_name} (${model.model_name})`);
        console.log(`    Status: ${model.is_active ? 'Active' : 'Inactive'}`);
        console.log(`    ID: ${model.id}`);
      });

      if (gptModel.rows[0].is_active) {
        console.log('\n❌ PROBLEM FOUND: gpt-4o-mini is ACTIVE in model_catalog!');
        console.log('This is why Client keeps trying to use it.');
      }
    }

    // Check active models
    const activeModels = await pool.query(`
      SELECT model_name, display_name
      FROM model_catalog
      WHERE is_active = true
      ORDER BY rank ASC
    `);

    console.log(`\n=== Active Models in Catalog (${activeModels.rows.length}) ===`);
    activeModels.rows.forEach(model => {
      console.log(`  ✅ ${model.display_name} (${model.model_name})`);
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

checkModelCatalog();
