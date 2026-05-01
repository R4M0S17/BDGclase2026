import { createBrowserRouter, Navigate } from 'react-router-dom'
import AppLayout from '@/components/layout/AppLayout'
import AuthLayout from '@/components/layout/AuthLayout'
import ProtectedRoute from '@/components/shared/ProtectedRoute'
import LoginPage from '@/pages/LoginPage'
import BoardPage from '@/pages/BoardPage'
import DashboardPage from '@/pages/DashboardPage'
import ProjectsPage from '@/pages/ProjectsPage'
import ComingSoonPage from '@/pages/ComingSoonPage'

export const router = createBrowserRouter([
  {
    path: '/login',
    element: (
      <AuthLayout>
        <LoginPage />
      </AuthLayout>
    ),
  },
  {
    element: (
      <ProtectedRoute>
        <AppLayout />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <Navigate to="/board" replace /> },
      { path: 'board', element: <BoardPage /> },
      { path: 'dashboard', element: <DashboardPage /> },
      { path: 'projects', element: <ProjectsPage /> },
      { path: 'roadmap', element: <ComingSoonPage name="Roadmap" /> },
      { path: 'backlog', element: <ComingSoonPage name="Backlog" /> },
      { path: 'issues', element: <ComingSoonPage name="Issues" /> },
    ],
  },
])
