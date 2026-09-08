import { createRouter, createWebHistory } from 'vue-router'

const getBasePath = () => {
  if (typeof window === 'undefined') return '/'
  const p = window.location.pathname
  if (p.startsWith('/tasks')) return '/tasks'
  if (p.startsWith('/mytasks')) return '/mytasks'
  if (p.startsWith('/taskflow')) return '/taskflow'
  if (p.startsWith('/frontend')) return '/frontend'
  return '/'
}

const routes = [
  {
    path: '/',
    name: 'Tasks',
    component: () => import('@/pages/Tasks.vue'),
  },
  {
    path: '/tasks',
    redirect: '/',
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/',
  },
]

const router = createRouter({
  history: createWebHistory(getBasePath()),
  routes,
})

export default router
