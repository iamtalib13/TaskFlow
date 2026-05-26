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
      <TaskflowWorkspaceHeader
        :selection-path="selectionPath"
        :user-name="currentUserName"
        :user-image="currentUserImage"
      />

      <TaskflowWorkspaceToolbar
        :active-view="activeView"
        :primary-action-label="primaryActionLabel"
        :search-query="searchQuery"
        @primary-action="handlePrimaryAction"
        @update:activeView="activeView = $event"
        @update:searchQuery="searchQuery = $event"
      />

      <TaskflowWorkspaceList :section="activeSection" :rows="activeRows" />
    </main>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import TaskflowSidebar from '@/components/TaskflowSidebar.vue'
import TaskflowWorkspaceHeader from '@/components/TaskflowWorkspaceHeader.vue'
import TaskflowWorkspaceList from '@/components/TaskflowWorkspaceList.vue'
import TaskflowWorkspaceToolbar from '@/components/TaskflowWorkspaceToolbar.vue'

const route = useRoute()
const router = useRouter()

const teams = ref([])
const projects = ref([])
const currentUserName = ref('')
const currentUserImage = ref('')
const selectedTeam = ref('')
const selectedProject = ref('')
const activeSection = ref('overview')
const activeView = ref('table')
const searchQuery = ref('')
const syncingFromRoute = ref(false)

const teamNameById = computed(() => Object.fromEntries(teams.value.map((team) => [team.name, team.team_name || team.name])))
const projectNameById = computed(() => Object.fromEntries(projects.value.map((project) => [project.name, project.project_name || project.name])))

const selectedTeamLabel = computed(() => {
  return selectedTeam.value ? teamNameById.value[selectedTeam.value] || selectedTeam.value : ''
})

const selectedProjectLabel = computed(() => {
  return selectedProject.value ? projectNameById.value[selectedProject.value] || selectedProject.value : ''
})

const selectionPath = computed(() => {
  const parts = []

  if (activeSection.value === 'team') {
    parts.push('Team')
  } else if (activeSection.value === 'mom') {
    parts.push('Minutes of Meeting')
  } else {
    parts.push('Overview')
  }

  if (selectedTeamLabel.value && activeSection.value !== 'team') {
    parts.push(selectedTeamLabel.value)
  }

  if (selectedProjectLabel.value) {
    parts.push(selectedProjectLabel.value)
  }

  return parts.join(' / ')
})

const activeRows = computed(() => {
  if (activeSection.value === 'team') return teams.value
  if (activeSection.value === 'mom') return []
  return projects.value
})

const primaryActionLabel = computed(() => {
  if (activeSection.value === 'team') return 'New Team'
  return 'New Task +'
})

function hydrateFromRoute(query) {
  syncingFromRoute.value = true

  activeSection.value = normalizeSection(query.section)
  activeView.value = normalizeView(query.view)
  selectedTeam.value = asText(query.team)
  selectedProject.value = asText(query.project)
  searchQuery.value = asText(query.search)

  syncingFromRoute.value = false
}

function normalizeSection(value) {
  return ['overview', 'team', 'mom'].includes(value) ? value : 'overview'
}

function normalizeView(value) {
  return ['table', 'kanban'].includes(value) ? value : 'table'
}

function asText(value) {
  return value == null ? '' : String(value)
}

function currentQuery() {
  const query = {}

  if (activeSection.value !== 'overview') query.section = activeSection.value
  if (activeView.value !== 'table') query.view = activeView.value
  if (selectedTeam.value) query.team = selectedTeam.value
  if (selectedProject.value) query.project = selectedProject.value
  if (searchQuery.value) query.search = searchQuery.value

  return query
}

function sameQuery(a, b) {
  const aKeys = Object.keys(a)
  const bKeys = Object.keys(b)
  if (aKeys.length !== bKeys.length) return false
  return aKeys.every((key) => a[key] === b[key])
}

async function loadWorkspace() {
  try {
    const params = new URLSearchParams()

    if (selectedTeam.value) params.set('team', selectedTeam.value)
    if (selectedProject.value) params.set('project', selectedProject.value)
    if (searchQuery.value) params.set('search', searchQuery.value)

    const query = params.toString()
    const url = query
      ? `/api/v2/method/taskflow.taskflow.api.workspace.get_workspace_bootstrap?${query}`
      : '/api/v2/method/taskflow.taskflow.api.workspace.get_workspace_bootstrap'

    const response = await fetch(url, {
      credentials: 'same-origin',
    })
    const data = await response.json()
    const payload = data.message ?? data ?? {}

    teams.value = payload.teams ?? []
    projects.value = payload.projects ?? []
    currentUserName.value = payload.current_user?.full_name || payload.current_user?.name || ''
    currentUserImage.value = payload.current_user?.user_image || ''

    if (payload.selected_team !== undefined) {
      selectedTeam.value = payload.selected_team || ''
    }

    if (payload.selected_project !== undefined) {
      selectedProject.value = payload.selected_project || ''
    }

    syncQueryToRoute()
  } catch (error) {
    teams.value = []
    projects.value = []
    currentUserName.value = ''
    currentUserImage.value = ''
    console.error('Failed to load workspace bootstrap', error)
  }
}

function syncQueryToRoute() {
  if (syncingFromRoute.value) return

  const nextQuery = currentQuery()
  if (sameQuery(route.query, nextQuery)) return

  router.replace({ query: nextQuery })
}

function handlePrimaryAction() {
  // Reserved for the next step when create dialogs are wired up.
}

watch(
  () => route.query,
  (query) => {
    hydrateFromRoute(query)
    loadWorkspace()
  },
  { immediate: true },
)

watch([activeSection, activeView, selectedTeam, selectedProject, searchQuery], () => {
  syncQueryToRoute()
})
</script>
