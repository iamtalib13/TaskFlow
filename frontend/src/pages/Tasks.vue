<template>
  <div class="mx-auto max-w-6xl p-6">
    <header class="mb-6">
      <h1 class="text-2xl font-semibold text-gray-900">Tasks</h1>
      <p class="mt-1 text-sm text-gray-600">Task view with project filter dropdown.</p>
    </header>

    <div class="rounded-xl border border-gray-200 bg-white p-4">
      <div class="flex flex-wrap items-center gap-3">
        <label class="text-sm font-medium text-gray-700">Project</label>
        <select v-model="selectedProjectFilter" class="min-w-[240px] rounded-md border border-gray-300 px-3 py-2 text-sm" @change="fetchTasks">
          <option value="">All Projects</option>
          <option v-for="project in projects" :key="project.name" :value="project.name">
            {{ project.project_name }}
          </option>
        </select>
      </div>
    </div>

    <div v-if="tasksLoading" class="mt-4 rounded-xl border border-gray-200 bg-white p-4 text-sm text-gray-600">Loading tasks...</div>
    <div v-else-if="tasks.length === 0" class="mt-4 rounded-xl border border-gray-200 bg-white p-4 text-sm text-gray-600">No tasks found for selected project.</div>

    <div v-else class="mt-4 space-y-2">
      <article v-for="task in tasks" :key="task.name" class="rounded-xl border border-gray-200 bg-white p-4">
        <div class="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h3 class="text-sm font-semibold text-gray-900">{{ task.subject }}</h3>
            <p class="mt-1 text-xs text-gray-500">{{ task.project_title || selectedProjectName || task.project }} • {{ task.owner_name || task.owner }}</p>
          </div>
          <span class="rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700">{{ task.status }}</span>
        </div>
        <div class="mt-2 flex flex-wrap gap-3 text-xs text-gray-600">
          <span>Priority: {{ task.priority || 'NA' }}</span>
          <span>Due: {{ task.exp_end_date || 'Not set' }}</span>
          <span v-if="task.days_left !== null && task.days_left !== undefined">Days Left: {{ task.days_left }}</span>
        </div>
      </article>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { frappeRequest } from 'frappe-ui'
import { managerOverview } from '../resources'

const selectedProjectFilter = ref('')
const tasks = ref([])
const tasksLoading = ref(false)

const projects = computed(() => managerOverview.data?.projects || [])
const selectedProjectName = computed(() => {
  if (!selectedProjectFilter.value) return 'All Projects'
  const project = projects.value.find((p) => p.name === selectedProjectFilter.value)
  return project?.project_name || ''
})

async function fetchTasks() {
  tasksLoading.value = true
  try {
    const response = await frappeRequest({
      url: 'taskflow.taskflow.api.taskflow.get_task_list',
      params: {
        project: selectedProjectFilter.value || null,
        start: 0,
        page_length: 30,
        only_my_tasks: 0,
      },
    })
    tasks.value = response?.tasks || []
  } catch (error) {
    tasks.value = []
  } finally {
    tasksLoading.value = false
  }
}

onMounted(async () => {
  if (!managerOverview.data) {
    await managerOverview.fetch()
  }
  await fetchTasks()
})
</script>
