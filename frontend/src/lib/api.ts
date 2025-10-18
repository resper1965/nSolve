// API client for n.Solve
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://core-processor.ness.workers.dev';
const AUTH_BASE_URL = process.env.NEXT_PUBLIC_AUTH_URL || 'https://auth-service.ness.workers.dev';

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

interface Vulnerability {
  id: string;
  title: string;
  description: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  cve?: string;
  cvss_score?: number;
  created_at: string;
  updated_at: string;
  tenant_id: string;
}

interface CreateVulnerabilityRequest {
  title: string;
  description: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  cve?: string;
  cvss_score?: number;
}

interface UpdateVulnerabilityRequest extends Partial<CreateVulnerabilityRequest> {
  status?: 'open' | 'in_progress' | 'resolved' | 'closed';
}

class ApiClient {
  private getAuthToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const token = this.getAuthToken();
    
    const defaultHeaders = {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
    };

    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers: {
          ...defaultHeaders,
          ...options.headers,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return {
        success: true,
        data,
      };
    } catch (error) {
      console.error('API request failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // Authentication
  async login(email: string, password: string): Promise<ApiResponse<{ token: string; user: any }>> {
    try {
      const response = await fetch(`${AUTH_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return {
        success: true,
        data,
      };
    } catch (error) {
      console.error('Login failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Login failed',
      };
    }
  }

  async register(email: string, password: string, name: string): Promise<ApiResponse<{ token: string; user: any }>> {
    try {
      const response = await fetch(`${AUTH_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password, name }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return {
        success: true,
        data,
      };
    } catch (error) {
      console.error('Registration failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Registration failed',
      };
    }
  }

  // Vulnerabilities
  async getVulnerabilities(): Promise<ApiResponse<{ vulnerabilities: Vulnerability[] }>> {
    return this.request<{ vulnerabilities: Vulnerability[] }>('/vulnerabilities');
  }

  async getVulnerability(id: string): Promise<ApiResponse<Vulnerability>> {
    return this.request<Vulnerability>(`/vulnerabilities/${id}`);
  }

  async createVulnerability(vuln: CreateVulnerabilityRequest): Promise<ApiResponse<Vulnerability>> {
    return this.request<Vulnerability>('/vulnerabilities', {
      method: 'POST',
      body: JSON.stringify(vuln),
    });
  }

  async updateVulnerability(id: string, vuln: UpdateVulnerabilityRequest): Promise<ApiResponse<Vulnerability>> {
    return this.request<Vulnerability>(`/vulnerabilities/${id}`, {
      method: 'PUT',
      body: JSON.stringify(vuln),
    });
  }

  async deleteVulnerability(id: string): Promise<ApiResponse<void>> {
    return this.request<void>(`/vulnerabilities/${id}`, {
      method: 'DELETE',
    });
  }

  // Statistics
  async getStats(): Promise<ApiResponse<{
    total: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
    open: number;
    in_progress: number;
    resolved: number;
    closed: number;
  }>> {
    return this.request('/stats');
  }

  // Jira Integration
  async createJiraTicket(vulnerabilityId: string, projectKey: string): Promise<ApiResponse<{ ticketId: string; url: string }>> {
    return this.request(`/jira/tickets`, {
      method: 'POST',
      body: JSON.stringify({ vulnerabilityId, projectKey }),
    });
  }

  async getJiraTickets(): Promise<ApiResponse<{ tickets: any[] }>> {
    return this.request('/jira/tickets');
  }

  // Translation
  async translateVulnerability(id: string, targetLanguage: string): Promise<ApiResponse<{ translated: Vulnerability }>> {
    return this.request(`/translate/vulnerability/${id}`, {
      method: 'POST',
      body: JSON.stringify({ targetLanguage }),
    });
  }
}

export const apiClient = new ApiClient();
export type { Vulnerability, CreateVulnerabilityRequest, UpdateVulnerabilityRequest, ApiResponse };
