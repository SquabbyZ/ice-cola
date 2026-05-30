# Database Standards

Source: Extracted from project `CLAUDE.md` to keep the root instruction file compact.
Scope: local PostgreSQL setup and database environment conventions.

## Database Service

The project supports two PostgreSQL configurations:

### 本地开发 (原生安装)
- Host: `localhost`
- Port: `5432` (D:\pg18\bin\)
- Database: `icecola`
- User: `postgres`

### Docker 部署
- Host: `localhost` 或 Docker service name `postgres`
- Container port: `5432`
- Host 映射端口: `5433`
- Database: `icecola`
- User: `postgres`

这些默认值仅用于本地开发。生产或共享环境必须使用未提交的 `.env` 文件或密钥管理系统中的强密码。

## DATABASE_URL

本地开发 (原生 PG):

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/icecola?schema=public
```

Docker 部署 (映射端口):

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5433/icecola?schema=public
```

Docker 网络内部:

```env
DATABASE_URL=postgresql://postgres:postgres@postgres:5432/icecola?schema=public
```

## Docker Commands

```bash
# Check database container status
docker ps | grep postgres

# Start PostgreSQL container
docker start <container_name>

# Stop PostgreSQL container
docker stop <container_name>

# Open psql
docker exec -it <container_name> psql -U postgres -d icecola

# List databases
docker exec -it <container_name> psql -U postgres -c "\l"
```
