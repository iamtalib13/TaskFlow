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
    component: () => import('@/pages/Placeholder.vue'),
    props: { title: 'Projects' },
  },
  {
    path: '/tasks',
    name: 'Tasks',
    component: () => import('@/pages/Placeholder.vue'),
    props: { title: 'Tasks' },
  },
  {
    path: '/team',
    name: 'Team',
    component: () => import('@/pages/Placeholder.vue'),
    props: { title: 'Team' },
  },
  {
    path: '/settings',
    name: 'Settings',
    component: () => import('@/pages/Placeholder.vue'),
    props: { title: 'Settings' },
  },
]

let router = createRouter({
  history: createWebHistory('/frontend'),
  routes,
})

export default router