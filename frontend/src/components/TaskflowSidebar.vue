<template>
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
        <select
          id="team-select"
          :value="selectedTeam"
          class="sidebar-select"
          @change="updateSelectedTeam($event.target.value)"
        >
          <option value="">All Teams</option>
          <option v-for="team in teams" :key="team.name" :value="team.name">
            {{ team.team_name }} · {{ team.team_code }}
          </option>
        </select>
      </div>

      <div class="sidebar-field">
        <label class="sidebar-field__label" for="project-select">Project</label>
        <select
          id="project-select"
          :value="selectedProject"
          class="sidebar-select"
          @change="updateSelectedProject($event.target.value)"
        >
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
        @click="updateActiveSection('overview')"
      >
        Overview
      </button>
      <button
        type="button"
        class="sidebar-link"
        :class="{ active: activeSection === 'team' }"
        @click="updateActiveSection('team')"
      >
        Team
      </button>
      <button
        type="button"
        class="sidebar-link"
        :class="{ active: activeSection === 'mom' }"
        @click="updateActiveSection('mom')"
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
        @click="updateSelectedProject(project.name)"
      >
        <span class="sidebar-project__title">{{ project.project_name }}</span>
        <span class="sidebar-project__meta">{{ project.project_code }}</span>
      </button>
      <div v-if="!visibleProjects.length" class="sidebar-empty">No projects for this team.</div>
    </section>
  </aside>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  teams: {
    type: Array,
    default: () => [],
  },
  projects: {
    type: Array,
    default: () => [],
  },
  selectedTeam: {
    type: String,
    default: '',
  },
  selectedProject: {
    type: String,
    default: '',
  },
  activeSection: {
    type: String,
    default: 'overview',
  },
})

const emit = defineEmits(['update:selectedTeam', 'update:selectedProject', 'update:activeSection'])

const visibleProjects = computed(() => {
  if (!props.selectedTeam) return props.projects
  return props.projects.filter((project) => project.team === props.selectedTeam)
})

function updateSelectedTeam(value) {
  const nextProjects = !value
    ? props.projects
    : props.projects.filter((project) => project.team === value)

  emit('update:selectedTeam', value)

  if (!nextProjects.some((project) => project.name === props.selectedProject)) {
    emit('update:selectedProject', '')
  }
}

function updateSelectedProject(value) {
  emit('update:selectedProject', value)
}

function updateActiveSection(value) {
  emit('update:activeSection', value)
}
</script>

<style scoped>
.taskflow-sidebar {
  position: sticky;
  top: 0;
  height: 100vh;
  overflow: auto;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 12px;
  background: #fff;
  border-right: 1px solid var(--tf-border);
}

.sidebar-brand {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 2px 2px 4px;
}

.brand-mark {
  width: 34px;
  height: 34px;
  border-radius: 999px;
  display: grid;
  place-items: center;
  background: #eef2f7;
  color: #374151;
  font-size: 15px;
  font-weight: 700;
  letter-spacing: -0.02em;
  flex-shrink: 0;
}

.brand-text {
  display: grid;
  gap: 1px;
}

.brand-name {
  font-size: 16px;
  font-weight: 600;
  letter-spacing: -0.02em;
  color: var(--tf-text);
}

.brand-subtitle {
  font-size: 11px;
  color: var(--tf-muted);
}

.sidebar-block {
  display: grid;
  gap: 8px;
  padding-top: 2px;
}

.sidebar-block--projects {
  gap: 6px;
}

.sidebar-label {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--tf-muted);
}

.sidebar-field {
  display: grid;
  gap: 4px;
}

.sidebar-field__label {
  font-size: 11px;
  font-weight: 500;
  color: #374151;
}

.sidebar-select {
  width: 100%;
  min-height: 34px;
  border-radius: 10px;
  border: 1px solid var(--tf-border);
  padding: 0 10px;
  background: #fff;
  color: var(--tf-text);
  outline: none;
}

.sidebar-select:focus {
  border-color: #d1d5db;
  box-shadow: 0 0 0 3px rgba(17, 24, 39, 0.04);
}

.sidebar-link,
.sidebar-project {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  width: 100%;
  min-height: 34px;
  padding: 0 12px;
  border-radius: 10px;
  background: #fff;
  color: #374151;
  border: 1px solid transparent;
  text-align: left;
  cursor: pointer;
}

.sidebar-link.active,
.sidebar-project.active {
  background: #f9fafb;
  color: var(--tf-text);
  border-color: var(--tf-border);
}

.sidebar-project {
  flex-direction: column;
  align-items: flex-start;
  padding: 10px 12px;
  border-color: var(--tf-border);
}

.sidebar-project__title {
  font-size: 13px;
  font-weight: 500;
  line-height: 1.2;
}

.sidebar-project__meta {
  font-size: 11px;
  color: var(--tf-muted);
}

.sidebar-empty {
  padding: 10px 12px;
  border-radius: 10px;
  background: #f9fafb;
  border: 1px dashed var(--tf-border);
  color: var(--tf-muted);
  font-size: 12px;
}
</style>
