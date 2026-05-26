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
        <select v-model="selectedTeam" class="field-select">
          <option value="">All Teams</option>
          <option v-for="team in teams" :key="team.name" :value="team.name">
            {{ team.team_name }} · {{ team.team_code }}
          </option>
        </select>
      </div>

      <div class="sidebar-panel">
        <div class="panel-label">Project</div>
        <select v-model="selectedProject" class="field-select">
          <option value="">All Projects</option>
          <option v-for="project in projects" :key="project.name" :value="project.name">
            {{ project.project_name }} · {{ project.project_code }}
          </option>
        </select>
      </div>

      <div class="sidebar-stats">
        <div class="mini-stat">
          <span>Total Teams</span>
          <strong>{{ summary.team_count || 0 }}</strong>
        </div>
        <div class="mini-stat">
          <span>Visible Projects</span>
          <strong>{{ summary.project_count || 0 }}</strong>
        </div>
        <div class="mini-stat">
          <span>Active Projects</span>
          <strong>{{ summary.active_project_count || 0 }}</strong>
        </div>
      </div>

      <div class="sidebar-footer">
        <Badge :label="loading ? 'Syncing' : 'Ready'" :theme="loading ? 'blue' : 'green'" />
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
          <label class="workspace-search">
            <span class="sr-only">Search</span>
            <input v-model="searchQuery" type="search" placeholder="Search" />
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
import { computed, onMounted, ref, watch } from 'vue'
import { Badge, createResource } from 'frappe-ui'

const selectedTeam = ref('')
const selectedProject = ref('')
const activeView = ref('table')
const searchQuery = ref('')

const workspace = createResource({
  url: '/api/v2/method/taskflow.taskflow.api.workspace.get_workspace_bootstrap',
  method: 'GET',
  auto: false,
})

const payload = computed(() => workspace.data?.message ?? workspace.data ?? {})
const loading = computed(() => Boolean(workspace.loading))
const teams = computed(() => payload.value?.teams ?? [])
const projects = computed(() => payload.value?.projects ?? [])
const summary = computed(() => payload.value?.summary ?? {})

async function refreshWorkspace() {
  await workspace.fetch({
    team: selectedTeam.value || '',
    project: selectedProject.value || '',
  })
}

watch([selectedTeam, selectedProject], () => {
  refreshWorkspace()
})

onMounted(() => {
  refreshWorkspace()
})
</script>
