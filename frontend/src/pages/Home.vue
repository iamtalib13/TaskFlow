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
      <header class="hero">
        <div>
          <p class="eyebrow">SaaS workspace</p>
          <h1>Taskflow workspace shell.</h1>
          <p class="lede">
            Sidebar se Team aur Project select karo. Neeche ka area abhi intentionally blank hai, next steps yahin add honge.
          </p>
        </div>

        <div class="hero-actions">
          <Button theme="blue" variant="solid" label="Create Project" />
          <Button variant="outline" label="Refresh" @click="refreshWorkspace" />
        </div>
      </header>

      <section class="workspace-empty" aria-label="Workspace placeholder"></section>
    </main>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { Badge, Button, createResource } from 'frappe-ui'

const selectedTeam = ref('')
const selectedProject = ref('')

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
