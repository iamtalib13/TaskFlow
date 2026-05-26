<template>
  <aside class="taskflow-sidebar">
    <section class="sidebar-section" aria-label="Workspace filters">
      <div class="sidebar-section__label">Team</div>

      <div class="sidebar-field">
        <label class="sidebar-field__label" for="team-select">Team selection</label>
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
    </section>

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
          <span class="sidebar-project__title">{{ projectLabel(project) }}</span>
        </button>
        <div v-if="!visibleProjects.length" class="sidebar-empty">No projects for this team.</div>
      </div>
    </section>

    <section class="sidebar-section sidebar-section--tasks" aria-label="Project tasks">
      <div class="sidebar-section__head">
        <div class="sidebar-section__label">Tasks</div>
        <span class="sidebar-section__meta">{{ visibleTasks.length }}</span>
      </div>

      <div v-if="selectedProject" class="sidebar-task-list">
        <button
          v-for="task in visibleTasks"
          :key="task.name"
          type="button"
          class="sidebar-task"
        >
          <span class="sidebar-task__title">{{ task.task_title }}</span>
          <span class="sidebar-task__meta">{{ task.status }}</span>
        </button>
        <div v-if="!visibleTasks.length" class="sidebar-empty">No tasks in this project.</div>
      </div>
      <div v-else class="sidebar-empty">Select a project to view tasks.</div>
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
  tasks: {
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

const visibleTasks = computed(() => {
  if (!props.selectedProject) return []
  return props.tasks.filter((task) => task.project === props.selectedProject)
})

function projectLabel(project) {
  const pending = Number(project.pending_task_count || 0)
  return `${project.project_name || project.name} (${pending})`
}

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
</script>
