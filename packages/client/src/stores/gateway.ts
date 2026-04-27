import { create } from 'zustand';

interface GatewayState {
  isRunning: boolean;
  isConnected: boolean;
  lastChecked: Date | null;
  setGatewayStatus: (isRunning: boolean, isConnected: boolean) => void;
  updateLastChecked: () => void;
}

export const useGatewayStore = create<GatewayState>((set) => ({
  isRunning: true, // NestJS backend 应该在 Docker 中运行
  isConnected: false,
  lastChecked: null,
  setGatewayStatus: (isRunning, isConnected) =>
    set({ isRunning, isConnected, lastChecked: new Date() }),
  updateLastChecked: () => set({ lastChecked: new Date() }),
}));
