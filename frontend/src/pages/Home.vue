<template>
  <div class="taskflow-shell">
    <TaskflowSidebar
      v-model:selectedTeam="selectedTeam"
      v-model:selectedProject="selectedProject"
      v-model:activeSection="activeSection"
      :teams="teams"
      :projects="projects"
    />

    <main class="workspace">
      <TaskflowWorkspaceHeader
        :active-view="activeView"
        :primary-action-label="primaryActionLabel"
        :search-query="searchQuery"
        @primary-action="handlePrimaryAction"
        @update:activeView="activeView = $event"
        @update:searchQuery="searchQuery = $event"
      />

      <TaskflowWorkspaceList :section="activeSection" :rows="activeRows" />
    </main>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import TaskflowSidebar from '@/components/TaskflowSidebar.vue'
import TaskflowWorkspaceHeader from '@/components/TaskflowWorkspaceHeader.vue'
import TaskflowWorkspaceList from '@/components/TaskflowWorkspaceList.vue'

const teams = ref([])
const projects = ref([])
const selectedTeam = ref('')
const selectedProject = ref('')
const activeSection = ref('overview')
const activeView = ref('table')
const searchQuery = ref('')

const activeRows = computed(() => {
  if (activeSection.value === 'team') return teams.value
  if (activeSection.value === 'mom') return []
  return projects.value
})

const primaryActionLabel = computed(() => {
  if (activeSection.value === 'team') return 'New Team'
  return 'New Task +'
})

async function loadWorkspace() {
  try {
    const params = new URLSearchParams()

    if (selectedTeam.value) {
      params.set('team', selectedTeam.value)
    }

    if (selectedProject.value) {
      params.set('project', selectedProject.value)
    }

    if (searchQuery.value) {
      params.set('search', searchQuery.value)
    }

    const query = params.toString()
    const url = query
      ? `/api/v2/method/taskflow.taskflow.api.workspace.get_workspace_bootstrap?${query}`
      : '/api/v2/method/taskflow.taskflow.api.workspace.get_workspace_bootstrap'

    const response = await fetch(url, {
      credentials: 'same-origin',
    })
    const data = await response.json()
    const payload = data.message ?? data ?? {}

    teams.value = payload.teams ?? []
    projects.value = payload.projects ?? []
  } catch (error) {
    teams.value = []
    projects.value = []
    console.error('Failed to load workspace bootstrap', error)
  }
}

function handlePrimaryAction() {
  // Reserved for the next step when create dialogs are wired up.
}

watch([selectedTeam, selectedProject, searchQuery], loadWorkspace)

onMounted(loadWorkspace)
</script>
