export const API = {
  projects: {
    list:    '/api/projects',
    create:  '/api/projects',
    detail:  (id: string) => `/api/projects/${id}`,
    update:  (id: string) => `/api/projects/${id}`,
    archive: (id: string) => `/api/projects/${id}`,
  },
  auth: {
    google: '/api/auth/google',
    refresh: '/api/auth/refresh',
    logout: '/api/auth/logout',
  },
  users: {
    me: '/api/users/me',
    list: '/api/users',
  },
  tickets: {
    list: '/api/tickets',
    create: '/api/tickets',
    detail: (id: string) => `/api/tickets/${id}`,
    update: (id: string) => `/api/tickets/${id}`,
    updateStatus: (id: string) => `/api/tickets/${id}/status`,
    archive: (id: string) => `/api/tickets/${id}`,
    comments: (id: string) => `/api/tickets/${id}/comments`,
  },
  comments: {
    archive: (id: string) => `/api/comments/${id}`,
  },
  metrics: {
    dashboard: '/api/metrics',
    export: '/api/metrics/export',
  },
} as const
