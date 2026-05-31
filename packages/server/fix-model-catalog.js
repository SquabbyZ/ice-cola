/**
 * Fix model_catalog table - disable models without API keys and add MiniMax
 */

const { Pool } = require('pg');

const DATABASE_URL = 'postgresql://postgres:postgres@localhost:5432/icecola?schema=public';

async function fixModelCatalog() {
  const pool = new Pool({ connectionString: DATABASE_URL });

  try {
    console.log('=== Fixing model_catalog Table ===\n');

    // Step 1: Disable all existing models
    console.log('Step 1: Disabling all existing models...');
    await pool.query(`
      UPDATE model_catalog
      SET is_active = false, updated_at = NOW()
      WHERE is_active = true
    `);
    console.log('✅ Disabled all existing models');

    // Step 2: Check if MiniMax models exist in catalog
    const miniMaxModels = await pool.query(`
      SELECT * FROM model_catalog WHERE model_name IN ('MiniMax-M2.7', 'abab6.5s-chat')
    `);

    if (miniMaxModels.rows.length === 0) {
      console.log('\nStep 2: Adding MiniMax models to catalog...');
      
      // Add MiniMax models
      await pool.query(`
        INSERT INTO model_catalog (id, model_name, display_name, description, rank, cost_multiplier, required_plan_level, is_active, created_at, updated_at)
        VALUES 
          (gen_random_uuid(), 'MiniMax-M2.7', 'MiniMax 2.7', 'MiniMax 编码与智能体工作流模型', 1, 1.0, 0, true, NOW(), NOW()),
          (gen_random_uuid(), 'abab6.5s-chat', 'MiniMax Text-01', 'MiniMax 大语言模型', 2, 1.0, 0, true, NOW(), NOW())
      `);
      console.log('✅ Added MiniMax models to catalog');
    } else {
      console.log('\nStep 2: Activating existing MiniMax models...');
      await pool.query(`
        UPDATE model_catalog
        SET is_active = true, updated_at = NOW()
        WHERE model_name IN ('MiniMax-M2.7', 'abab6.5s-chat')
      `);
      console.log('✅ Activated MiniMax models');
    }

    // Step 3: Verify the changes
    console.log('\nStep 3: Verifying changes...');
    const activeModels = await pool.query(`
      SELECT model_name, display_name, is_active
      FROM model_catalog
      WHERE is_active = true
      ORDER BY rank ASC
    `);

    console.log(`\n✅ Active models in catalog (${activeModels.rows.length}):`);
    activeModels.rows.forEach(model => {
      console.log(`   - ${model.display_name} (${model.model_name})`);
    });

    console.log('\n✅ Done! Please restart the server for changes to take effect.');
    console.log('\nNext steps:');
    console.log('1. Stop all services: node dev.mjs stop');
    console.log('2. Start all services: node dev.mjs');
    console.log('3. In Client: Create a NEW conversation');
    console.log('4. You should now see only MiniMax models available');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

fixModelCatalog();
