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

export const authApi = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),
  registerCandidate: (name: string, email: string, password: string) =>
    api.post('/auth/register/candidate', { name, email, password }),
  registerEmployer: (company_name: string, email: string, password: string) =>
    api.post('/auth/register/employer', { company_name, email, password }),
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
