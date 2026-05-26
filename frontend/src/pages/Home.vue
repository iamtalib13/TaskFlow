<template>
  <div class="taskflow-shell">
    <TaskflowSidebar
      v-model:selectedTeam="selectedTeam"
      v-model:selectedProject="selectedProject"
      :teams="teams"
      :projects="projects"
    />

    <main class="workspace">
      <TaskflowWorkspaceHeader
        :active-view="activeView"
        :primary-action-label="primaryActionLabel"
        :search-query="searchQuery"
        :user-name="currentUserName"
        :user-image="currentUserImage"
        @primary-action="handlePrimaryAction"
        @update:activeView="activeView = $event"
        @update:searchQuery="searchQuery = $event"
      />

      <div class="workspace-content">
        <TaskflowWorkspaceToolbar
          :workspace-title="workspaceTitle"
          :pending-task-count="selectedProjectTaskStats.pending"
          :total-task-count="selectedProjectTaskStats.total"
        />

        <TaskflowWorkspaceList
          :section="tableSection"
          :rows="visibleRows"
          :loading="workspaceLoading"
          @primary-action="handlePrimaryAction"
        />
      </div>
    </main>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import TaskflowSidebar from '@/components/TaskflowSidebar.vue'
import TaskflowWorkspaceHeader from '@/components/TaskflowWorkspaceHeader.vue'
import TaskflowWorkspaceList from '@/components/TaskflowWorkspaceList.vue'
import TaskflowWorkspaceToolbar from '@/components/TaskflowWorkspaceToolbar.vue'
import { workspaceBootstrap } from '@/data/workspace'

const route = useRoute()
const router = useRouter()

const selectedTeam = ref('')
const selectedProject = ref('')
const activeSection = ref('overview')
const activeView = ref('table')
const searchQuery = ref('')
const syncingFromRoute = ref(false)

const workspaceData = computed(() => workspaceBootstrap.data || {})
const teams = computed(() => workspaceData.value.teams || [])
const projects = computed(() => workspaceData.value.projects || [])
const tasks = computed(() => workspaceData.value.tasks || [])
const currentUserName = computed(
  () => workspaceData.value.current_user?.full_name || workspaceData.value.current_user?.name || '',
)
const currentUserImage = computed(() => workspaceData.value.current_user?.user_image || '')
const workspaceLoading = computed(() => Boolean(workspaceBootstrap.loading && !workspaceBootstrap.fetched))

const projectNameById = computed(() =>
  Object.fromEntries(projects.value.map((project) => [project.name, project.project_name || project.name])),
)

const selectedProjectLabel = computed(() => {
  return selectedProject.value ? projectNameById.value[selectedProject.value] || selectedProject.value : ''
})

const selectedProjectTaskRows = computed(() => {
  if (!selectedProject.value) return []
  return tasks.value.filter((task) => task.project === selectedProject.value)
})

const selectedProjectTaskStats = computed(() => ({
  total: selectedProjectTaskRows.value.length,
  pending: selectedProjectTaskRows.value.filter((task) => !['Completed', 'Cancelled'].includes(task.status)).length,
}))

const workspaceTitle = computed(() => selectedProjectLabel.value || 'All Projects')

const tableSection = computed(() => {
  if (activeSection.value === 'team') return 'team'
  if (activeSection.value === 'mom') return 'mom'
  if (selectedProject.value && activeView.value === 'table') return 'task'
  return 'overview'
})

const visibleRows = computed(() => {
  const query = normalizeText(searchQuery.value)
  const sectionRows = getRowsForSection(tableSection.value)
  if (!query) return sectionRows
  return sectionRows.filter((row) => matchesSearch(row, searchKeysForSection(tableSection.value), query))
})

const primaryActionLabel = computed(() => {
  if (tableSection.value === 'team') return 'New Team'
  if (tableSection.value === 'mom') return 'New Meeting'
  return 'New Task +'
})

function normalizeText(value) {
  return value == null ? '' : String(value).trim().toLowerCase()
}

function buildSearchIndex(row, keys) {
  return keys
    .map((key) => normalizeText(row?.[key]))
    .filter(Boolean)
    .join(' ')
}

function getRowsForSection(section) {
  if (section === 'team') return teams.value
  if (section === 'task') return selectedProjectTaskRows.value
  if (section === 'mom') return []
  return projects.value
}

function searchKeysForSection(section) {
  if (section === 'team') {
    return ['team_name', 'team_code', 'company', 'team_lead', 'description']
  }
  if (section === 'task') {
    return ['task_title', 'project_title', 'assigned_to_name', 'status', 'priority', 'task_type', 'description']
  }
  if (section === 'mom') return []
  return ['project_name', 'project_code', 'team_name', 'status', 'priority', 'description']
}

function matchesSearch(row, keys, query) {
  return buildSearchIndex(row, keys).includes(query)
}

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
  const params = {
    team: selectedTeam.value || undefined,
    search: searchQuery.value || undefined,
  }

  await workspaceBootstrap.fetch(params)
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
