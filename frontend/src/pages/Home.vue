<template>
  <div class="taskflow-shell">
    <aside class="taskflow-sidebar">
      <div class="sidebar-brand">
        <div class="brand-mark">T</div>
        <div class="brand-text">
          <div class="brand-name">Taskflow</div>
          <div class="brand-subtitle">Workspace</div>
        </div>
      </div>

      <div class="sidebar-panel">
        <div class="panel-label">Team</div>
        <select class="field-select">
          <option value="">All Teams</option>
          <option v-for="team in teams" :key="team.name" :value="team.name">
            {{ team.team_name }} · {{ team.team_code }}
          </option>
        </select>
      </div>

      <div class="sidebar-panel">
        <div class="panel-label">Project</div>
        <select class="field-select">
          <option value="">All Projects</option>
          <option v-for="project in projects" :key="project.name" :value="project.name">
            {{ project.project_name }} · {{ project.project_code }}
          </option>
        </select>
      </div>
    </aside>

    <main class="workspace">
      <header class="workspace-header">
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

        <div class="workspace-header__right">
          <button type="button" class="workspace-add-btn">Add new</button>
          <button type="button" class="workspace-add-btn workspace-add-btn--secondary">New Task +</button>
          <label class="workspace-search">
            <span class="sr-only">Search</span>
            <input type="search" placeholder="Search" />
          </label>
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

const teams = ref([])
const projects = ref([])
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
