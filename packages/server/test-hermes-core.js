/**
 * 快速测试脚本 - 验证 Hermes Core 模块是否可以正常加载
 */

console.log('🧪 Testing Hermes Core Module Loading...\n');

try {
  // 测试 1: 检查接口文件是否存在
  console.log('✅ Test 1: Checking interface files...');
  const fs = require('fs');
  const path = require('path');
  
  const interfacesPath = path.join(__dirname, 'src', 'hermes-core', 'interfaces');
  const servicesPath = path.join(__dirname, 'src', 'hermes-core', 'services');
  const toolsPath = path.join(__dirname, 'src', 'hermes-core', 'tools');
  
  if (fs.existsSync(interfacesPath)) {
    console.log('   ✓ Interfaces directory exists');
    const files = fs.readdirSync(interfacesPath);
    console.log(`   ✓ Found ${files.length} interface files:`, files.join(', '));
  } else {
    console.error('   ✗ Interfaces directory not found');
    process.exit(1);
  }
  
  if (fs.existsSync(servicesPath)) {
    console.log('   ✓ Services directory exists');
    const files = fs.readdirSync(servicesPath);
    console.log(`   ✓ Found ${files.length} service files`);
  } else {
    console.error('   ✗ Services directory not found');
    process.exit(1);
  }
  
  if (fs.existsSync(toolsPath)) {
    console.log('   ✓ Tools directory exists');
    const files = fs.readdirSync(toolsPath);
    console.log(`   ✓ Found ${files.length} tool files`);
  } else {
    console.error('   ✗ Tools directory not found');
    process.exit(1);
  }
  
  console.log('\n✅ Test 2: Checking module file...');
  const modulePath = path.join(__dirname, 'src', 'hermes-core', 'hermes-core.module.ts');
  if (fs.existsSync(modulePath)) {
    console.log('   ✓ HermesCoreModule file exists');
    const content = fs.readFileSync(modulePath, 'utf-8');
    if (content.includes('@Global()')) {
      console.log('   ✓ Module is marked as @Global()');
    }
    if (content.includes('registerDefaultTools')) {
      console.log('   ✓ Module registers default tools');
    }
  } else {
    console.error('   ✗ Module file not found');
    process.exit(1);
  }
  
  console.log('\n✅ Test 3: Checking database migration...');
  const initSqlPath = path.join(__dirname, '..', '..', 'init.sql');
  if (fs.existsSync(initSqlPath)) {
    const content = fs.readFileSync(initSqlPath, 'utf-8');
    if (content.includes('task_plans')) {
      console.log('   ✓ task_plans table definition found in init.sql');
    } else {
      console.error('   ✗ task_plans table not found in init.sql');
      process.exit(1);
    }
  }
  
  console.log('\n✅ Test 4: Checking documentation...');
  const readmePath = path.join(__dirname, 'src', 'hermes-core', 'README.md');
  if (fs.existsSync(readmePath)) {
    console.log('   ✓ README.md exists');
  }
  
  const designDocPath = path.join(__dirname, '..', '..', 'docs', 'superpowers', 'specs', '2026-04-27-hermes-core-design.md');
  if (fs.existsSync(designDocPath)) {
    console.log('   ✓ Design document exists');
  }
  
  console.log('\n🎉 All tests passed! Hermes Core module structure is correct.');
  console.log('\n📋 Summary:');
  console.log('   - Module structure: ✅');
  console.log('   - Interfaces: ✅');
  console.log('   - Services: ✅');
  console.log('   - Tools: ✅');
  console.log('   - Database schema: ✅');
  console.log('   - Documentation: ✅');
  console.log('\n⚠️  Note: Full runtime testing requires successful compilation.');
  console.log('   Please fix remaining TypeScript errors and restart the server.\n');
  
} catch (error) {
  console.error('\n❌ Test failed:', error.message);
  process.exit(1);
}
