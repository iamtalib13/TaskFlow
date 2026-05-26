<template>
  <aside class="taskflow-sidebar">
    <div class="sidebar-brand">
      <div class="sidebar-brand__icon" aria-hidden="true">T</div>
      <div class="sidebar-brand__text">
        <strong>Taskflow</strong>
        <span>Workspace</span>
      </div>
    </div>

    <section class="sidebar-section sidebar-section--overview" aria-label="Team overview">
      <button
        type="button"
        class="sidebar-overview-btn"
        :class="{ active: isOverviewSelected }"
        @click="selectOverview"
      >
        <span class="sidebar-overview-btn__label">Team Overview</span>
        <span class="sidebar-overview-btn__meta">{{ filteredProjects.length }}</span>
      </button>
    </section>

    <section class="sidebar-section" aria-label="Team selection">
      <div class="sidebar-section__label">Team selection</div>
      <label class="sidebar-field" for="team-select">
        <span class="sidebar-field__label">Choose team</span>
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
      </label>
    </section>

    <section class="sidebar-section sidebar-section--projects" aria-label="Project list">
      <div class="sidebar-section__head">
        <div class="sidebar-section__label">Projects</div>
        <span class="sidebar-section__meta">{{ filteredProjects.length }}</span>
      </div>

      <label class="sidebar-project-search" for="project-search">
        <span class="sr-only">Search projects</span>
        <input
          id="project-search"
          v-model="projectSearch"
          type="search"
          placeholder="Search projects"
        />
      </label>

      <div class="sidebar-project-list">
        <button
          v-for="project in filteredProjects"
          :key="project.name"
          type="button"
          class="sidebar-project"
          :class="{ active: selectedProject === project.name }"
          @click="updateSelectedProject(project.name)"
        >
          <span class="sidebar-project__title">{{ project.project_name || project.name }}</span>
          <span v-if="Number(project.pending_task_count || 0) > 0" class="sidebar-project__count">{{ project.pending_task_count }}</span>
        </button>
        <div v-if="!filteredProjects.length" class="sidebar-empty">No projects for this team.</div>
      </div>
    </section>
  </aside>
</template>

<script setup>
import { computed, ref } from 'vue'

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
})

const emit = defineEmits(['update:selectedTeam', 'update:selectedProject'])
const projectSearch = ref('')

const isOverviewSelected = computed(() => !props.selectedTeam)

const visibleProjects = computed(() => {
  const items = !props.selectedTeam
    ? props.projects
    : props.projects.filter((project) => project.team === props.selectedTeam)

  return [...items].sort((a, b) => {
    const aPending = Number(a.pending_task_count || 0)
    const bPending = Number(b.pending_task_count || 0)
    if (bPending !== aPending) return bPending - aPending
    return String(a.project_name || a.name || '').localeCompare(String(b.project_name || b.name || ''))
  })
})

const filteredProjects = computed(() => {
  const query = normalizeText(projectSearch.value)
  if (!query) return visibleProjects.value
  return visibleProjects.value.filter((project) => {
    return buildSearchIndex(project).includes(query)
  })
})

function buildSearchIndex(project) {
  return [project.project_name, project.project_code, project.team_name, project.status, project.priority]
    .map((value) => normalizeText(value))
    .filter(Boolean)
    .join(' ')
}

function normalizeText(value) {
  return value == null ? '' : String(value).trim().toLowerCase()
}

function selectOverview() {
  projectSearch.value = ''
  emit('update:selectedTeam', '')
  emit('update:selectedProject', '')
}

function updateSelectedTeam(value) {
  const nextProjects = !value
    ? props.projects
    : props.projects.filter((project) => project.team === value)

  projectSearch.value = ''
  emit('update:selectedTeam', value)

  if (!nextProjects.some((project) => project.name === props.selectedProject)) {
    emit('update:selectedProject', '')
  }
}

function updateSelectedProject(value) {
  emit('update:selectedProject', value)
}
</script>
