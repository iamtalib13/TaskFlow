import { createRouter, createWebHistory } from 'vue-router'
import { getAppBase } from '@/utils/url'

const routes = [
  {
    path: '/',
    name: 'Tasks',
    component: () => import('@/pages/Tasks.vue'),
  },
  {
    path: '/task/:id',
    name: 'TaskDetail',
    component: () => import('@/pages/Tasks.vue'),
  },
  // Every path renders the page: the active section and the deep-linked task
  // live in the URL, and the page reads them itself. A catch-all *redirect*
  // would make vue-router rewrite the address bar on load.
  {
    path: '/:pathMatch(.*)*',
    name: 'Section',
    component: () => import('@/pages/Tasks.vue'),
  },
]

const router = createRouter({
  // Base must be slash-free, otherwise links resolve to `/taskflow//task/<id>`
  history: createWebHistory(
    typeof window === 'undefined' ? '/' : getAppBase(window.location.pathname) || '/'
  ),
  routes,
})

export default router
