<template>
  <aside class="taskflow-sidebar">
    <div class="sidebar-brand">
      <div class="brand-mark">T</div>
      <div class="brand-text">
        <div class="brand-name">Taskflow</div>
        <div class="brand-subtitle">Workspace</div>
      </div>
    </div>

    <section class="sidebar-section" aria-label="Workspace filters">
      <div class="sidebar-section__label">Workspace</div>

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

    <nav class="sidebar-section" aria-label="Workspace navigation">
      <div class="sidebar-section__label">Sections</div>
      <button
        type="button"
        class="sidebar-link"
        :class="{ active: activeSection === 'overview' }"
        @click="updateActiveSection('overview')"
      >
        <span>Overview</span>
      </button>
      <button
        type="button"
        class="sidebar-link"
        :class="{ active: activeSection === 'team' }"
        @click="updateActiveSection('team')"
      >
        <span>Team</span>
      </button>
      <button
        type="button"
        class="sidebar-link"
        :class="{ active: activeSection === 'mom' }"
        @click="updateActiveSection('mom')"
      >
        <span>Minutes of Meeting</span>
      </button>
    </nav>

    <section class="sidebar-section sidebar-section--projects" aria-label="Project list">
      <div class="sidebar-section__head">
        <div class="sidebar-section__label">Projects</div>
        <span class="sidebar-section__meta">{{ visibleProjects.length }}</span>
      </div>

      <div class="sidebar-project-list">
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
      </div>
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
