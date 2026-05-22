# Database Standards

Source: Extracted from project `CLAUDE.md` to keep the root instruction file compact.
Scope: local PostgreSQL setup and database environment conventions.

## Database Service

The project uses PostgreSQL through Docker for local development.

Default local values:
- Host: `localhost` or Docker service name
- Container port: `5432`
- Host port: `5433`
- Database: `icecola`
- User: `postgres`
- Password: `postgres`

These defaults are for local development only. Production and shared environments must use strong unique passwords from an uncommitted `.env` file or a secret manager.

## DATABASE_URL

Host connection:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5433/icecola?schema=public
```

Docker network connection:

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
