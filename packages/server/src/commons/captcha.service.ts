import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';

interface CaptchaEntry {
  answer: string[];
  expiresAt: Date;
}

@Injectable()
export class CaptchaService {
  // In-memory storage for captcha tokens
  private captchaStore = new Map<string, CaptchaEntry>();

  // Characters for captcha (Chinese characters for click captcha style)
  private readonly chars = '天地玄黄宇宙洪荒日月盈昃辰宿列张寒来暑往秋收冬藏';
  private readonly charArray = this.chars.split('');

  // Clean up expired captchas every 5 minutes
  constructor() {
    setInterval(() => this.cleanup(), 5 * 60 * 1000);
  }

  /**
   * Generate a new captcha
   * Returns a token, imageUrl, answer, and expiresAt
   */
  async generateCaptcha(): Promise<{
    token: string;
    imageUrl: string;
    answer: string[];
    expiresAt: Date;
  }> {
    // Generate 4 random characters for the captcha
    const answer: string[] = [];
    for (let i = 0; i < 4; i++) {
      const randomIndex = Math.floor(Math.random() * this.charArray.length);
      answer.push(this.charArray[randomIndex]);
    }

    // Generate token
    const token = randomUUID();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes expiry

    // Store in memory
    this.captchaStore.set(token, {
      answer,
      expiresAt,
    });

    // Generate SVG image URL
    const svg = this.generateSvgImage(answer);
    const imageUrl = `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;

    return {
      token,
      imageUrl,
      answer, // In production, this should NOT be sent to frontend
      expiresAt,
    };
  }

  /**
   * Verify a captcha answer
   */
  async verifyCaptcha(token: string, answer: string[]): Promise<boolean> {
    const entry = this.captchaStore.get(token);

    if (!entry) {
      return false;
    }

    // Check if expired
    if (new Date() > entry.expiresAt) {
      this.captchaStore.delete(token);
      return false;
    }

    // Verify answer - case sensitive comparison
    const isValid = JSON.stringify(entry.answer) === JSON.stringify(answer);

    // Delete after verification (one-time use)
    if (isValid) {
      this.captchaStore.delete(token);
    }

    return isValid;
  }

  /**
   * Generate an SVG image with the captcha characters
   */
  private generateSvgImage(answer: string[]): string {
    const width = 200;
    const height = 80;
    const charWidth = width / (answer.length + 1);

    // Create random positions and rotations for each character
    const charElements = answer.map((char, index) => {
      const x = charWidth * (index + 0.5) + (Math.random() - 0.5) * 20;
      const y = height / 2 + (Math.random() - 0.5) * 30;
      const rotation = (Math.random() - 0.5) * 40;
      const fontSize = 32 + Math.random() * 12;
      const hue = Math.random() * 60 + 10; // Warm colors

      return `
        <text
          x="${x}"
          y="${y}"
          font-family="KaiTi, serif"
          font-size="${fontSize}"
          fill="hsl(${hue}, 70%, 40%)"
          transform="rotate(${rotation}, ${x}, ${y})"
        >${char}</text>
      `;
    }).join('');

    // Add some noise lines
    const noiseLines = Array.from({ length: 5 }, () => {
      const x1 = Math.random() * width;
      const y1 = Math.random() * height;
      const x2 = Math.random() * width;
      const y2 = Math.random() * height;
      return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="hsl(40, 60%, 60%)" stroke-width="1" opacity="0.3"/>`;
    }).join('');

    // Add some noise dots
    const noiseDots = Array.from({ length: 20 }, () => {
      const cx = Math.random() * width;
      const cy = Math.random() * height;
      const r = Math.random() * 2 + 1;
      return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="hsl(40, 50%, 50%)" opacity="0.2"/>`;
    }).join('');

    return `
      <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
        <defs>
          <filter id="blur">
            <feGaussianBlur stdDeviation="0.5"/>
          </filter>
        </defs>
        <!-- Background -->
        <rect width="${width}" height="${height}" fill="#f5f0e6"/>
        <!-- Noise elements -->
        ${noiseLines}
        ${noiseDots}
        <!-- Main characters -->
        ${charElements}
        <!-- Instruction text -->
        <text x="${width / 2}" y="${height - 8}" font-family="Arial, sans-serif" font-size="10" fill="#888" text-anchor="middle">Click characters in order</text>
      </svg>
    `.trim();
  }

  /**
   * Clean up expired captchas
   */
  private cleanup(): void {
    const now = new Date();
    for (const [token, entry] of this.captchaStore.entries()) {
      if (now > entry.expiresAt) {
        this.captchaStore.delete(token);
      }
    }
  }
}