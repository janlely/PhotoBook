// 简单的短链接生成器测试脚本
const { ShortCodeGenerator } = require('./src/utils/shortCode.ts');

console.log('测试短链接生成器...\n');

// 测试生成功能
console.log('1. 生成随机短代码:');
for (let i = 0; i < 5; i++) {
  const code = ShortCodeGenerator.generate();
  console.log(`   ${code} (长度: ${code.length})`);
}

console.log('\n2. 测试验证功能:');
const validCodes = ['abc123XY', 'Zz9a8b7C'];
const invalidCodes = ['abc123', 'abc123XY!', ''];

validCodes.forEach(code => {
  console.log(`   ${code}: ${ShortCodeGenerator.isValid(code) ? '✅ 有效' : '❌ 无效'}`);
});

invalidCodes.forEach(code => {
  console.log(`   "${code}": ${ShortCodeGenerator.isValid(code) ? '✅ 有效' : '❌ 无效'}`);
});

console.log('\n3. 基于ID生成:');
for (let id = 1; id <= 3; id++) {
  const code = ShortCodeGenerator.generateFromId(id);
  console.log(`   ID ${id}: ${code}`);
}

console.log('\n测试完成！');