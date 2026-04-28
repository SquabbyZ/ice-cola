import axios from 'axios';

const API_BASE = '';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
}

export interface User {
  id: string;
  email: string;
  name: string | null;
  team: {
    id: string;
    name: string;
    role: string;
  } | null;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export class AuthService {
  private getAuthHeaders() {
    const token = localStorage.getItem('accessToken');
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  async login(data: LoginRequest): Promise<AuthResponse> {
    const response = await axios.post(`${API_BASE}/auth/login`, data);
    const { accessToken, refreshToken, user } = response.data.data;
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
    return response.data.data;
  }

  async register(data: RegisterRequest): Promise<AuthResponse> {
    const response = await axios.post(`${API_BASE}/auth/register`, data);
    const { accessToken, refreshToken, user } = response.data.data;
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
    return response.data.data;
  }

  async logout() {
    const token = localStorage.getItem('accessToken');
    if (token) {
      try {
        await axios.post(
          `${API_BASE}/auth/logout`,
          {},
          { headers: { Authorization: `Bearer ${token}` } }
        );
      } catch (e) {
        // ignore
      }
    }
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  }

  async getCurrentUser(): Promise<User> {
    const response = await axios.get(`${API_BASE}/auth/me`, {
      headers: this.getAuthHeaders(),
    });
    return response.data.data;
  }

  async refreshToken(): Promise<{ accessToken: string; expiresIn: number }> {
    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) {
      throw new Error('No refresh token');
    }
    const response = await axios.post(`${API_BASE}/auth/refresh`, {
      refreshToken,
    });
    const { accessToken, expiresIn } = response.data.data;
    localStorage.setItem('accessToken', accessToken);
    return { accessToken, expiresIn };
  }

  isAuthenticated(): boolean {
    return !!localStorage.getItem('accessToken');
  }

  // Client auth methods for registration with email verification
  async getCaptcha(): Promise<{ token: string; imageUrl: string }> {
    const response = await axios.post(`${API_BASE}/client/auth/captcha`);
    return response.data.data;
  }

  async sendVerificationCode(data: {
    email: string;
    captchaToken: string;
    captchaAnswer: string[];
  }): Promise<void> {
    await axios.post(`${API_BASE}/client/auth/send-code`, data);
  }

  async verifyCode(data: { email: string; code: string }): Promise<boolean> {
    const response = await axios.post(`${API_BASE}/client/auth/verify-code`, data);
    return response.data.success;
  }

  async clientRegister(data: {
    email: string;
    code: string;
    password: string;
    name: string;
  }): Promise<AuthResponse> {
    const response = await axios.post(`${API_BASE}/client/auth/register`, data);
    const { accessToken, refreshToken, user } = response.data.data;
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
    return response.data.data;
  }
}

export const authService = new AuthService();
