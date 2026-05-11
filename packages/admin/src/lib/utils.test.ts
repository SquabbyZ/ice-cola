import { describe, it, expect } from 'vitest';
import { cn } from '../lib/utils';

describe('utils', () => {
  describe('cn', () => {
    it('merges class names with tailwind-merge', () => {
      const result = cn('text-red-500', 'bg-blue-500');
      expect(result).toContain('text-red-500');
      expect(result).toContain('bg-blue-500');
    });

    it('handles conditional classes', () => {
      const isActive = true;
      const result = cn('base-class', isActive && 'active-class');
      expect(result).toContain('base-class');
      expect(result).toContain('active-class');
    });

    it('handles false conditions', () => {
      const isActive = false;
      const result = cn('base-class', isActive && 'active-class');
      expect(result).toContain('base-class');
      expect(result).not.toContain('active-class');
    });

    it('handles undefined inputs', () => {
      const result = cn('base-class', undefined, 'other-class');
      expect(result).toContain('base-class');
      expect(result).toContain('other-class');
    });

    it('merges conflicting tailwind classes', () => {
      const result = cn('text-red-500', 'text-blue-500');
      // Should contain the last one for same property
      expect(result).toContain('text-blue-500');
    });
  });
});