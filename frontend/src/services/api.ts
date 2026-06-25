import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let isRefreshing = false;
let failedQueue: any[] = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch((err) => {
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = localStorage.getItem('refreshToken');
      if (!refreshToken) {
        isRefreshing = false;
        return Promise.reject(error);
      }

      try {
        const res = await axios.post(`${API_URL}/auth/refresh`, { refreshToken });
        const { accessToken: newAccessToken, refreshToken: newRefreshToken } = res.data;

        localStorage.setItem('accessToken', newAccessToken);
        localStorage.setItem('refreshToken', newRefreshToken);

        api.defaults.headers.common['Authorization'] = `Bearer ${newAccessToken}`;
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;

        processQueue(null, newAccessToken);
        isRefreshing = false;

        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        isRefreshing = false;

        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('userRole');

        window.dispatchEvent(new Event('auth-logout'));

        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export const authApi = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),
  registerCandidate: (name: string, email: string, password: string) =>
    api.post('/auth/register/candidate', { name, email, password }),
  registerEmployer: (company_name: string, email: string, password: string) =>
    api.post('/auth/register/employer', { company_name, email, password }),
  refresh: (refreshToken: string) =>
    api.post('/auth/refresh', { refreshToken }),
  logout: (refreshToken: string) =>
    api.post('/auth/logout', { refreshToken }),
};

export const jobsApi = {
  list: () => api.get('/jobs'),
  search: (q: string) => api.get('/jobs/search', { params: { q } }),
  create: (data: any) => api.post('/jobs', data),
  updateStatus: (id: string, status: string) =>
    api.patch(`/jobs/${id}/status`, { status }),
};

export const resumeApi = {
  upload: (file: File) => {
    const formData = new FormData();
    formData.append('resume', file);
    return api.post('/resumes/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  get: () => api.get('/resumes/me'),
  delete: () => api.delete('/resumes/me'),
};

export const applicationsApi = {
  apply: (jobId: string) => api.post('/applications', { jobId }),
  mine: () => api.get('/applications/me'),
  withdraw: (id: string) => api.delete(`/applications/${id}`),
  updateStatus: (id: string, status: string) =>
    api.patch(`/applications/${id}/status`, { status }),
};

export const profileApi = {
  me: () => api.get('/users/me'),
};

export const dashboardApi = {
  candidate: () => api.get('/dashboard/candidate'),
  employer: () => api.get('/dashboard/employer'),
};

// ── New APIs ──

export const jdGenerationApi = {
  generateDescription: (data: {
    title: string;
    responsibilities: string[];
    requiredSkills: string[];
    salaryMin?: number;
    salaryMax?: number;
    companyCulture?: string;
    employmentType?: string;
    location?: string;
    remoteStatus?: boolean;
    requiredExperience?: number;
  }) => api.post('/jobs/generate-description', data),

  createWithAI: (data: any) => api.post('/jobs/create-with-ai', data),

  generateInterviewQuestions: (jobId: string) =>
    api.post(`/jobs/${jobId}/interview-questions`),

  getInterviewQuestions: (jobId: string) =>
    api.get(`/jobs/${jobId}/interview-questions`),

  analyzeSalary: (data: {
    title: string;
    location: string;
    skills?: string[];
    experienceYears?: number;
    salaryMin?: number;
    salaryMax?: number;
  }) => api.post('/jobs/salary-analysis', data),
};

export const pipelineApi = {
  create: (data: { name: string; description?: string; criteria?: any; jobId?: string }) =>
    api.post('/pipelines', data),
  list: () => api.get('/pipelines'),
  getById: (id: string) => api.get(`/pipelines/${id}`),
  addCandidate: (pipelineId: string, candidateId: string, notes?: string) =>
    api.post(`/pipelines/${pipelineId}/candidates`, { candidateId, notes }),
  removeCandidate: (pipelineId: string, candidateId: string) =>
    api.delete(`/pipelines/${pipelineId}/candidates/${candidateId}`),
  autoPopulate: (id: string, limit?: number) =>
    api.post(`/pipelines/${id}/auto-populate`, null, { params: { limit } }),
  delete: (id: string) => api.delete(`/pipelines/${id}`),
};

export const exportApi = {
  exportJob: (jobId: string, platform: string) =>
    api.get(`/jobs/${jobId}/export/${platform}`),
  downloadJob: (jobId: string, platform: string) =>
    api.get(`/jobs/${jobId}/export/${platform}`, {
      params: { download: 'true' },
      responseType: 'blob',
    }),
};

export const linkedInApi = {
  parseProfile: (profileText: string, linkedInUrl?: string) =>
    api.post('/resumes/linkedin', { profileText, linkedInUrl }),
};

export const candidateSummaryApi = {
  generate: (candidateId: string, jobId: string) =>
    api.post(`/candidates/${candidateId}/summary/${jobId}`),
};
