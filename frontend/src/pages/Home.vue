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
      <header class="workspace-header">
        <div class="workspace-header__left">
          <button type="button" class="workspace-add-btn">New Task +</button>

          <div class="workspace-tabs" role="tablist" aria-label="Workspace views">
            <button
              type="button"
              class="workspace-tab"
              :class="{ active: activeView === 'table' }"
              @click="activeView = 'table'"
            >
              Table view
            </button>
            <button
              type="button"
              class="workspace-tab"
              :class="{ active: activeView === 'kanban' }"
              @click="activeView = 'kanban'"
            >
              Kanban board
            </button>
          </div>

          <label class="workspace-search">
            <span class="sr-only">Search</span>
            <input type="search" placeholder="Search" />
          </label>
        </div>

        <div class="workspace-header__right">
          <div class="workspace-profile" aria-label="Talib Sheikh profile user">
            <div class="workspace-avatar">TS</div>
            <div class="workspace-profile__text">
              <strong>Talib Sheikh</strong>
              <span>Profile user</span>
            </div>
          </div>
        </div>
      </header>

      <section class="workspace-empty" aria-label="Workspace placeholder"></section>
    </main>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import TaskflowSidebar from '@/components/TaskflowSidebar.vue'

const teams = ref([])
const projects = ref([])
const selectedTeam = ref('')
const selectedProject = ref('')
const activeSection = ref('overview')
const activeView = ref('table')

async function loadWorkspace() {
  try {
    const response = await fetch('/api/v2/method/taskflow.taskflow.api.workspace.get_workspace_bootstrap', {
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

onMounted(loadWorkspace)
</script>
