import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

@Injectable()
export class EncryptionService {
  private readonly algorithm = 'aes-256-gcm';
  private readonly keyLength = 32;
  private readonly ivLength = 16;
  private readonly authTagLength = 16;
  private encryptionKey: Buffer;

  constructor(private configService: ConfigService) {
    const keyHex = this.configService.get<string>('AI_ENCRYPTION_KEY');
    if (!keyHex) {
      throw new Error('AI_ENCRYPTION_KEY environment variable is not set');
    }
    this.encryptionKey = Buffer.from(keyHex, 'hex');
    if (this.encryptionKey.length !== this.keyLength) {
      throw new Error('AI_ENCRYPTION_KEY must be 32 bytes (64 hex characters)');
    }
  }

  encrypt(plaintext: string): { encrypted: string; iv: string; authTag: string } {
    const iv = crypto.randomBytes(this.ivLength);
    const cipher = crypto.createCipheriv(this.algorithm, this.encryptionKey, iv);

    let encrypted = cipher.update(plaintext, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    const authTag = cipher.getAuthTag();

    return {
      encrypted,
      iv: iv.toString('base64'),
      authTag: authTag.toString('base64'),
    };
  }

  decrypt(encrypted: string, iv: string, authTag: string): string {
    const decipher = crypto.createDecipheriv(
      this.algorithm,
      this.encryptionKey,
      Buffer.from(iv, 'base64'),
    );
    decipher.setAuthTag(Buffer.from(authTag, 'base64'));

    let decrypted = decipher.update(encrypted, 'base64', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  hashForLookup(value: string): string {
    return crypto.createHash('sha256').update(value).digest('hex');
  }
}