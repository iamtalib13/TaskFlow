import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    name: 'Home',
    component: () => import('@/pages/Home.vue'),
  },
  {
    path: '/projects',
    name: 'Projects',
    component: () => import('@/pages/Projects.vue'),
  },
  {
    path: '/tasks',
    name: 'Tasks',
    component: () => import('@/pages/Tasks.vue'),
  },
  {
    path: '/team',
    name: 'Team',
    component: () => import('@/pages/Team.vue'),
  },
  {
    path: '/settings',
    name: 'Settings',
    component: () => import('@/pages/Settings.vue'),
  },
]

let router = createRouter({
  history: createWebHistory('/taskflow'),
  routes,
})

export default router
