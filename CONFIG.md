# Ice Cola 项目配置

## 数据库 (PostgreSQL)

- **主机**: 127.0.0.1
- **端口**: 5432
- **用户名**: postgres
- **密码**: (需要用户配置)
- **数据库名**: icecola
- **pg 路径**: D:\pg18\bin\

### 连接命令

```bash
# Windows cmd
set PGPASSWORD=your_password
D:\pg18\bin\psql.exe -U postgres -h 127.0.0.1 -p 5432 -d postgres
```

### 重建数据库

如果需要重建数据库，请先确认 postgres 用户密码，然后执行：

```bash
# 删除并重建 icecola 数据库
cmd /c "set PGPASSWORD=你的密码&& D:\pg18\bin\psql.exe -U postgres -h 127.0.0.1 -p 5432 -c \"DROP DATABASE IF EXISTS icecola;\""
cmd /c "set PGPASSWORD=你的密码&& D:\pg18\bin\psql.exe -U postgres -h 127.0.0.1 -p 5432 -c \"CREATE DATABASE icecola;\""
```

## 服务配置

### Server (.env)

```
DATABASE_URL=postgresql://postgres:密码@localhost:5432/icecola?schema=public
PORT=3000
NODE_ENV=development
HERMES_ENDPOINT=http://localhost:9119
RESEND_API_KEY=re_你的Resend密钥
RESEND_FROM_EMAIL=Ice Cola <noreply@你的域名>
```

### Client (.env)

```
VITE_API_URL=http://localhost:3000
VITE_WS_URL=ws://localhost:3000
```

## 启动命令

```bash
# 根目录启动所有服务
cd c:/Users/smallMark/Desktop/peaksclaw/ice-cola
pnpm dev

# 单独启动 server
cd packages/server && pnpm dev

# 单独启动 client
cd packages/client && pnpm dev
```

## 邮件服务 (Resend)

- **API**: https://resend.com
- **免费限制**: 只能发送到自己验证的邮箱
- **验证邮箱**: 601709253@qq.com

### 测试邮件发送

```bash
cd packages/server
node test/test-resend.js 目标邮箱
```

## 常用端口

| 服务 | 端口 |
|------|------|
| Server API | 3000 |
| Client | 1420 |
| PostgreSQL | 5432 |
| Hermes Agent | 9119 |

## 注意事项

1. 确保 PostgreSQL 服务运行中 (postgresql-x64-18)
2. 确保 Resend API Key 已配置
3. 数据库连接密码需要与 PostgreSQL 安装时的一致