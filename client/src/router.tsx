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

function requireAuth() {
  const { accessToken } = useAuthStore.getState()
  if (!accessToken) throw redirect({ to: '/login' })
}

function redirectIfAuth() {
  const { accessToken } = useAuthStore.getState()
  if (accessToken) throw redirect({ to: '/dashboard' })
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

const dashboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/dashboard',
  beforeLoad: requireAuth,
  component: Dashboard,
})

const builderRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/builder/$id',
  beforeLoad: requireAuth,
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
  beforeLoad: requireAuth,
  component: Analytics,
})

const previewRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/preview/$id',
  beforeLoad: requireAuth,
  component: Preview,
})

const routeTree = rootRoute.addChildren([
  landingRoute,
  loginRoute,
  registerRoute,
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
