import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';

let keepAlive: NodeJS.Timeout;

async function bootstrap() {
  console.log('Creating NestJS application...');
  const app = await NestFactory.create(AppModule);
  console.log('App created');

  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }));

  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT', 3000);
  console.log(`Configured port: ${port}`);

  const corsOrigins = configService
    .get<string>('CORS_ORIGINS', 'http://localhost:1420,http://127.0.0.1:1420')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  app.enableCors({
    origin: corsOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // Use app.listen() with timeout fallback
  console.log('Starting server...');
  const server = await Promise.race([
    app.listen(port, '0.0.0.0'),
    new Promise((_, reject) => setTimeout(() => reject(new Error('Listen timeout')), 15000))
  ]).catch(err => {
    console.log('Listen issue:', err.message);
    // Fall back to manual http server setup
    const httpServer = app.getHttpServer();
    return new Promise((resolve, reject) => {
      httpServer.listen(port, '0.0.0.0', (err: any) => {
        if (err) reject(err);
        else resolve(httpServer);
      });
    });
  });
  
  console.log(`OpenClaw Server running on 0.0.0.0:${port}`);

  keepAlive = setInterval(() => {
    console.log(`Server heartbeat - listening on ${port}`);
  }, 15000);

  (server as any)?.on?.('error', (err: any) => {
    console.error('Server error:', err);
  });
}

bootstrap().catch(err => {
  console.error('Bootstrap error:', err);
  process.exit(1);
});

process.on('SIGINT', () => {
  console.log('SIGINT - shutting down');
  if (keepAlive) clearInterval(keepAlive);
  process.exit(0);
});
