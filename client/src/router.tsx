import {
  createRouter,
  createRoute,
  createRootRoute,
  Outlet,
  redirect,
} from '@tanstack/react-router'
import { useAuthStore } from './store/auth'
import Landing from './pages/Landing'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import Builder from './pages/Builder'
import Survey from './pages/Survey'
import Analytics from './pages/Analytics'
import Preview from './pages/Preview'
import CreateWorkspace from './pages/CreateWorkspace'
import WorkspaceSettings from './pages/WorkspaceSettings'
import InviteAccept from './pages/InviteAccept'

function requireAuth() {
  const { accessToken } = useAuthStore.getState()
  if (!accessToken) throw redirect({ to: '/login' })
}

function requireWorkspace() {
  const { accessToken, workspace } = useAuthStore.getState()
  if (!accessToken) throw redirect({ to: '/login' })
  if (!workspace) throw redirect({ to: '/create-workspace' })
}

function redirectIfAuth() {
  const { accessToken, workspaces } = useAuthStore.getState()
  if (accessToken) {
    throw redirect({ to: workspaces.length > 0 ? '/dashboard' : '/create-workspace' })
  }
}


const rootRoute = createRootRoute({ component: () => <Outlet /> })

const landingRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  beforeLoad: redirectIfAuth,
  component: Landing,
})

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  beforeLoad: redirectIfAuth,
  component: Login,
})

const registerRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/register',
  beforeLoad: redirectIfAuth,
  component: Register,
})

const createWorkspaceRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/create-workspace',
  beforeLoad: requireAuth,
  component: CreateWorkspace,
})

const workspaceSettingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/settings',
  beforeLoad: requireWorkspace,
  component: WorkspaceSettings,
})

const inviteRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/invite/$token',
  component: InviteAccept,
})

const dashboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/dashboard',
  beforeLoad: requireWorkspace,
  component: Dashboard,
})

const builderRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/builder/$id',
  beforeLoad: requireWorkspace,
  component: Builder,
})

const surveyRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/s/$slug',
  component: Survey,
})

const analyticsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/analytics/$id',
  beforeLoad: requireWorkspace,
  component: Analytics,
})

const previewRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/preview/$id',
  beforeLoad: requireWorkspace,
  component: Preview,
})

const routeTree = rootRoute.addChildren([
  landingRoute,
  loginRoute,
  registerRoute,
  createWorkspaceRoute,
  workspaceSettingsRoute,
  inviteRoute,
  dashboardRoute,
  builderRoute,
  surveyRoute,
  analyticsRoute,
  previewRoute,
])

export const router = createRouter({ routeTree })

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
