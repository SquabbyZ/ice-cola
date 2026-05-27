const jwt = require('../../node_modules/.pnpm/jsonwebtoken@9.0.2/node_modules/jsonwebtoken');
const secret = 'icecola-local-dev-jwt-secret-not-for-production';

const payload = {
  sub: 'admin-001',
  email: '601709253@qq.com',
  role: 'OWNER',
  type: 'admin_access'
};

const token = jwt.sign(payload, secret, { expiresIn: '1h' });
console.log('Token:', token);