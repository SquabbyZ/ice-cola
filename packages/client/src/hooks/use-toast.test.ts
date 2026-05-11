/**
 * use-toast 单元测试 - 测试 reducer 函数
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { reducer } from './use-toast';

describe('use-toast reducer', () => {
  const initialState = { toasts: [] };

  describe('ADD_TOAST', () => {
    it('adds a toast to the beginning of the list', () => {
      const toast = { id: '1', title: 'Test Toast' };
      const action = { type: 'ADD_TOAST' as const, toast };

      const newState = reducer(initialState, action);

      expect(newState.toasts).toHaveLength(1);
      expect(newState.toasts[0].id).toBe('1');
      expect(newState.toasts[0].title).toBe('Test Toast');
    });

    it('limits toasts to TOAST_LIMIT (1)', () => {
      const toast1 = { id: '1', title: 'Toast 1' };
      const toast2 = { id: '2', title: 'Toast 2' };

      let state = reducer(initialState, { type: 'ADD_TOAST' as const, toast: toast1 });
      state = reducer(state, { type: 'ADD_TOAST' as const, toast: toast2 });

      expect(state.toasts).toHaveLength(1);
      expect(state.toasts[0].id).toBe('2'); // newest first
    });
  });

  describe('UPDATE_TOAST', () => {
    it('updates an existing toast', () => {
      const stateWithToast = {
        toasts: [{ id: '1', title: 'Original', open: true }],
      };

      const action = {
        type: 'UPDATE_TOAST' as const,
        toast: { id: '1', title: 'Updated' },
      };

      const newState = reducer(stateWithToast, action);

      expect(newState.toasts[0].title).toBe('Updated');
    });

    it('does not affect other toasts', () => {
      const stateWithToasts = {
        toasts: [
          { id: '1', title: 'Toast 1' },
          { id: '2', title: 'Toast 2' },
        ],
      };

      const action = {
        type: 'UPDATE_TOAST' as const,
        toast: { id: '1', title: 'Updated' },
      };

      const newState = reducer(stateWithToasts, action);

      expect(newState.toasts[1].title).toBe('Toast 2');
    });
  });

  describe('DISMISS_TOAST', () => {
    it('sets open to false for the specified toast', () => {
      const stateWithToast = {
        toasts: [{ id: '1', title: 'Test', open: true }],
      };

      const action = { type: 'DISMISS_TOAST' as const, toastId: '1' };

      const newState = reducer(stateWithToast, action);

      expect(newState.toasts[0].open).toBe(false);
    });

    it('dismisses all toasts when toastId is undefined', () => {
      const stateWithToasts = {
        toasts: [
          { id: '1', title: 'Toast 1', open: true },
          { id: '2', title: 'Toast 2', open: true },
        ],
      };

      const action = { type: 'DISMISS_TOAST' as const, toastId: undefined };

      const newState = reducer(stateWithToasts, action);

      expect(newState.toasts.every((t) => t.open === false)).toBe(true);
    });
  });

  describe('REMOVE_TOAST', () => {
    it('removes the toast with specified id', () => {
      const stateWithToasts = {
        toasts: [
          { id: '1', title: 'Toast 1' },
          { id: '2', title: 'Toast 2' },
        ],
      };

      const action = { type: 'REMOVE_TOAST' as const, toastId: '1' };

      const newState = reducer(stateWithToasts, action);

      expect(newState.toasts).toHaveLength(1);
      expect(newState.toasts[0].id).toBe('2');
    });

    it('removes all toasts when toastId is undefined', () => {
      const stateWithToasts = {
        toasts: [
          { id: '1', title: 'Toast 1' },
          { id: '2', title: 'Toast 2' },
        ],
      };

      const action = { type: 'REMOVE_TOAST' as const, toastId: undefined };

      const newState = reducer(stateWithToasts, action);

      expect(newState.toasts).toHaveLength(0);
    });
  });
});