<template>
  <aside class="taskflow-sidebar">
    <!-- Brand -->
    <div class="sidebar-brand">
      <div class="sidebar-brand__icon">T</div>
      <div class="sidebar-brand__text">
        <strong>Taskflow</strong>
        <span>Workspace</span>
      </div>
    </div>

    <!-- Overview Section -->
    <section class="sidebar-section">
      <button
        type="button"
        class="sidebar-nav-item"
        :class="{ active: isOverviewSelected }"
        @click="selectOverview"
      >
        <span class="sidebar-nav-item__label">Team Overview</span>
        <span class="sidebar-nav-item__meta">{{ totalProjectCount }}</span>
      </button>
    </section>

    <!-- Team Selection -->
    <section class="sidebar-section">
      <div class="sidebar-section-header">Team selection</div>
      <div class="sidebar-field">
        <select
          :value="selectedTeam"
          class="sidebar-select"
          @change="onTeamChange($event.target.value)"
        >
          <option value="">All Teams</option>
          <option v-for="team in teams" :key="team.name" :value="team.name">
            {{ team.team_name }}
          </option>
        </select>
      </div>
    </section>

    <!-- Projects Section -->
    <section class="sidebar-section sidebar-section--projects">
      <div class="sidebar-section-header">
        <span>Projects</span>
        <span class="sidebar-section-meta">{{ filteredProjects.length }}</span>
      </div>

      <div class="sidebar-search">
        <input
          v-model="projectSearch"
          type="search"
          placeholder="Search projects..."
        />
      </div>

      <nav class="sidebar-project-list">
        <button
          v-for="project in filteredProjects"
          :key="project.name"
          type="button"
          class="sidebar-nav-item"
          :class="{ active: selectedProject === project.name }"
          @click="onProjectClick(project.name)"
        >
          <span class="sidebar-nav-item__label">{{ project.project_name || project.name }}</span>
          <span v-if="project.pending_task_count > 0" class="sidebar-nav-item__meta">
            {{ project.pending_task_count }}
          </span>
        </button>
        <div v-if="!filteredProjects.length" class="sidebar-empty">No projects found.</div>
      </nav>
    </section>
  </aside>
</template>

<script setup>
import { computed, ref, watch } from 'vue'

const props = defineProps({
  teams: { type: Array, default: () => [] },
  projects: { type: Array, default: () => [] },
  selectedTeam: { type: String, default: '' },
  selectedProject: { type: String, default: '' },
})

const emit = defineEmits(['update:selectedTeam', 'update:selectedProject'])
const projectSearch = ref('')

watch([() => props.selectedTeam, () => props.selectedProject], () => {
  projectSearch.value = ''
})

const isOverviewSelected = computed(() => !props.selectedTeam && !props.selectedProject)
const totalProjectCount = computed(() => props.projects.length)

const filteredProjects = computed(() => {
  const query = projectSearch.value.toLowerCase().trim()
  const source = props.selectedTeam 
    ? props.projects.filter(p => p.team === props.selectedTeam)
    : props.projects
    
  if (!query) return source
  return source.filter(p => 
    (p.project_name || '').toLowerCase().includes(query) || 
    (p.project_code || '').toLowerCase().includes(query)
  )
})

function selectOverview() {
  emit('update:selectedTeam', '')
  emit('update:selectedProject', '')
}

function onTeamChange(teamId) {
  emit('update:selectedTeam', teamId)
  emit('update:selectedProject', '')
}

function onProjectClick(projectId) {
  emit('update:selectedProject', projectId)
}
</script>

<style scoped>
.taskflow-sidebar {
  display: flex;
  flex-direction: column;
  height: 100vh;
  padding: 16px;
  border-right: 1px solid var(--tf-border);
  background: #fff;
  overflow: hidden;
}

.sidebar-section { 
  margin-bottom: 20px; 
  flex-shrink: 0;
}

.sidebar-section--projects {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.sidebar-section-header {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  color: #6b7280;
  margin-bottom: 8px;
  display: flex;
  justify-content: space-between;
  flex-shrink: 0;
}
.sidebar-nav-item {
  display: flex;
  justify-content: space-between;
  width: 100%;
  padding: 8px 12px;
  border-radius: 8px;
  font-size: 13px;
  color: #374151;
  background: transparent;
  cursor: pointer;
  white-space: nowrap;
}
.sidebar-nav-item:hover { background: #f3f4f6; }
.sidebar-nav-item.active { background: #eef2ff; color: #1d4ed8; }
.sidebar-nav-item__meta {
  background: #f3f4f6;
  padding: 0 6px;
  border-radius: 999px;
  font-size: 11px;
  margin-left: 8px;
}
.sidebar-search { margin-bottom: 10px; flex-shrink: 0; }
.sidebar-search input {
  width: 100%;
  padding: 8px;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
  font-size: 13px;
}
.sidebar-project-list {
  flex: 1;
  overflow-y: auto;
  padding-right: 4px;
}
</style>