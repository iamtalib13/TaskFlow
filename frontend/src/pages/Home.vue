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

      <section class="sidebar-block" aria-label="Master controls">
        <div class="sidebar-label">Master Control</div>

        <div class="sidebar-field">
          <label class="sidebar-field__label" for="team-select">Team</label>
          <select id="team-select" v-model="selectedTeam" class="sidebar-select">
            <option value="">All Teams</option>
            <option v-for="team in teams" :key="team.name" :value="team.name">
              {{ team.team_name }} · {{ team.team_code }}
            </option>
          </select>
        </div>

        <div class="sidebar-field">
          <label class="sidebar-field__label" for="project-select">Project</label>
          <select id="project-select" v-model="selectedProject" class="sidebar-select">
            <option value="">All Projects</option>
            <option v-for="project in visibleProjects" :key="project.name" :value="project.name">
              {{ project.project_name }} · {{ project.project_code }}
            </option>
          </select>
        </div>
      </section>

      <section class="sidebar-block" aria-label="Workspace options">
        <div class="sidebar-label">Options</div>
        <button
          type="button"
          class="sidebar-link"
          :class="{ active: activeSection === 'overview' }"
          @click="activeSection = 'overview'"
        >
          Overview
        </button>
        <button
          type="button"
          class="sidebar-link"
          :class="{ active: activeSection === 'team' }"
          @click="activeSection = 'team'"
        >
          Team
        </button>
        <button
          type="button"
          class="sidebar-link"
          :class="{ active: activeSection === 'mom' }"
          @click="activeSection = 'mom'"
        >
          Minutes of Meeting
        </button>
      </section>

      <section class="sidebar-block sidebar-block--projects" aria-label="Project list">
        <div class="sidebar-label">Project List</div>
        <button
          v-for="project in visibleProjects"
          :key="project.name"
          type="button"
          class="sidebar-project"
          :class="{ active: selectedProject === project.name }"
          @click="selectedProject = project.name"
        >
          <span class="sidebar-project__title">{{ project.project_name }}</span>
          <span class="sidebar-project__meta">{{ project.project_code }}</span>
        </button>
        <div v-if="!visibleProjects.length" class="sidebar-empty">No projects for this team.</div>
      </section>
    </aside>

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
import { computed, onMounted, ref, watch } from 'vue'

const teams = ref([])
const projects = ref([])
const selectedTeam = ref('')
const selectedProject = ref('')
const activeSection = ref('overview')
const activeView = ref('table')

const visibleProjects = computed(() => {
  if (!selectedTeam.value) return projects.value
  return projects.value.filter((project) => project.team === selectedTeam.value)
})

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

watch(selectedTeam, () => {
  if (!visibleProjects.value.some((project) => project.name === selectedProject.value)) {
    selectedProject.value = ''
  }
})

onMounted(loadWorkspace)
</script>
