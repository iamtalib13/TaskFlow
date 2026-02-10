<template>
  <div class="p-8 max-w-6xl mx-auto">
    <!-- Header -->
    <header class="mb-10 flex items-center justify-between">
      <div>
        <h1 class="text-3xl font-bold text-gray-900 tracking-tight">Dashboard</h1>
        <p class="text-gray-500 mt-1">Welcome back, here's what's happening today.</p>
      </div>
      <Button variant="solid" theme="gray" icon-left="plus"> New Project </Button>
    </header>

    <!-- Stats Grid -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
      <div
        v-for="stat in stats"
        :key="stat.label"
        class="bg-white p-6 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow duration-200"
      >
        <p class="text-sm font-medium text-gray-500 uppercase tracking-wider">
          {{ stat.label }}
        </p>
        <p class="text-4xl font-bold text-gray-900 mt-2">
          {{ dashboardStats.data?.[stat.key] || 0 }}
        </p>
      </div>
    </div>

    <!-- Active Projects Section -->
    <section>
      <div class="flex items-center justify-between mb-6">
        <h2 class="text-xl font-semibold text-gray-900">Active Projects</h2>
        <router-link to="/projects" class="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">
          View All Projects
        </router-link>
      </div>

      <div v-if="projectsResource.loading" class="flex items-center justify-center py-12">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>

      <div v-else-if="projectsResource.data?.length === 0" class="bg-gray-50 border-2 border-dashed border-gray-200 rounded-xl py-12 px-6 text-center">
        <p class="text-gray-500">No active projects found. Create your first project to get started!</p>
      </div>

      <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div
          v-for="project in projectsResource.data"
          :key="project.name"
          class="bg-white p-6 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all duration-200 group cursor-pointer"
        >
          <div class="flex items-start justify-between mb-4">
            <div class="bg-gray-50 p-2 rounded-lg group-hover:bg-gray-100 transition-colors">
              <span class="text-gray-700 font-bold uppercase text-xs">{{ project.project_name.substring(0, 2) }}</span>
            </div>
            <Badge :theme="getStatusTheme(project.status)">
              {{ project.status }}
            </Badge>
          </div>
          <h3 class="font-bold text-gray-900 text-lg mb-1 group-hover:text-gray-700 transition-colors">
            {{ project.project_name }}
          </h3>
          <p class="text-sm text-gray-500 mb-4 line-clamp-2">
            Managed by {{ project.manager || 'Unassigned' }}
          </p>
          <div class="flex items-center text-xs text-gray-400 font-medium">
            <span v-if="project.end_date">Ends on {{ formatDate(project.end_date) }}</span>
            <span v-else>No end date set</span>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { Badge } from 'frappe-ui'
import { dashboardStats, projectsResource } from '../resources'

const stats = [
  { label: 'Active Projects', key: 'active_projects' },
  { label: 'Pending Tasks', key: 'pending_tasks' },
  { label: 'Overdue Tasks', key: 'overdue_tasks' },
]

const getStatusTheme = (status) => {
  switch (status?.toLowerCase()) {
    case 'open':
      return 'blue'
    case 'completed':
      return 'green'
    case 'cancelled':
      return 'red'
    default:
      return 'gray'
  }
}

const formatDate = (dateStr) => {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}
</script>

<style scoped>
/* Inter font is used by default in Tailwind and Frappe UI if configured */
</style>