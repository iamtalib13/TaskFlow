<template>
  <div class="mx-auto max-w-6xl p-6">
    <div v-if="isOverviewLoading" class="rounded-lg border border-gray-200 bg-white p-6 text-sm text-gray-600">
      Loading dashboard summary...
    </div>

    <div v-else-if="managerOverview.error && !managerOverview.data" class="rounded-lg border border-red-200 bg-red-50 p-6 text-sm text-red-700">
      You do not have access to dashboard analytics.
    </div>

    <template v-else>
      <div v-if="!canManageAnyTeam" class="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">
        You are in read/limited mode based on your project role.
      </div>

      <section v-if="activeView === 'overview'" class="space-y-6">
        <div class="rounded-xl border border-gray-200 bg-white p-4">
          <h2 class="text-sm font-semibold uppercase tracking-wide text-gray-700">Team Summary</h2>
          <div class="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <article v-for="card in overviewTeamCards" :key="card.key" class="rounded-lg border border-gray-200 bg-gray-50 p-3">
              <p class="text-xs font-medium uppercase tracking-wide text-gray-500">{{ card.label }}</p>
              <p class="mt-1 text-2xl font-semibold text-gray-900">{{ card.value }}</p>
            </article>
          </div>
        </div>

        <div class="rounded-xl border border-gray-200 bg-white p-4">
          <h2 class="text-sm font-semibold uppercase tracking-wide text-gray-700">Project Summary</h2>
          <div class="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <article v-for="card in overviewProjectCards" :key="card.key" class="rounded-lg border border-gray-200 bg-gray-50 p-3">
              <p class="text-xs font-medium uppercase tracking-wide text-gray-500">{{ card.label }}</p>
              <p class="mt-1 text-2xl font-semibold text-gray-900">{{ card.value }}</p>
            </article>
          </div>
        </div>

        <div class="rounded-xl border border-gray-200 bg-white p-4">
          <h2 class="text-sm font-semibold uppercase tracking-wide text-gray-700">Task Summary</h2>
          <div class="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <article v-for="card in overviewTaskCards" :key="card.key" class="rounded-lg border border-gray-200 bg-gray-50 p-3">
              <p class="text-xs font-medium uppercase tracking-wide text-gray-500">{{ card.label }}</p>
              <p class="mt-1 text-2xl font-semibold text-gray-900">{{ card.value }}</p>
            </article>
          </div>
        </div>
      </section>

      <section v-else-if="activeView === 'team'" class="rounded-xl border border-gray-200 bg-white p-4">
        <h2 class="text-sm font-semibold uppercase tracking-wide text-gray-700">Team Analytics</h2>
        <div class="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <article v-for="card in teamCards" :key="card.key" class="rounded-lg border border-gray-200 bg-gray-50 p-3">
            <p class="text-xs font-medium uppercase tracking-wide text-gray-500">{{ card.label }}</p>
            <p class="mt-1 text-2xl font-semibold text-gray-900">{{ card.value }}</p>
          </article>
        </div>
      </section>

      <section v-else-if="activeView === 'project'" class="rounded-xl border border-gray-200 bg-white p-4">
        <h2 class="text-sm font-semibold uppercase tracking-wide text-gray-700">Project Analytics</h2>
        <div class="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <article v-for="card in projectCards" :key="card.key" class="rounded-lg border border-gray-200 bg-gray-50 p-3">
            <p class="text-xs font-medium uppercase tracking-wide text-gray-500">{{ card.label }}</p>
            <p class="mt-1 text-2xl font-semibold text-gray-900">{{ card.value }}</p>
          </article>
        </div>
      </section>

      <section v-else class="rounded-xl border border-gray-200 bg-white p-4">
        <h2 class="text-sm font-semibold uppercase tracking-wide text-gray-700">Task Analytics</h2>
        <div class="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <article v-for="card in taskCards" :key="card.key" class="rounded-lg border border-gray-200 bg-gray-50 p-3">
            <p class="text-xs font-medium uppercase tracking-wide text-gray-500">{{ card.label }}</p>
            <p class="mt-1 text-2xl font-semibold text-gray-900">{{ card.value }}</p>
          </article>
        </div>
      </section>
    </template>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ensureManagerOverviewLoaded, managerOverview } from '../resources'

const route = useRoute()
const router = useRouter()
const allowedTabs = ['overview', 'team', 'project', 'task']

function normalizeTab(tab) {
  if (tab === 'projects') return 'project'
  if (tab === 'tasks') return 'task'
  return allowedTabs.includes(tab) ? tab : 'overview'
}

const activeView = ref(normalizeTab(route.query.tab))
const isOverviewLoading = computed(() => managerOverview.loading || (!managerOverview.fetched && !managerOverview.data))

watch(
  () => route.query.tab,
  (newTab) => {
    activeView.value = normalizeTab(newTab)
  },
)

watch(
  activeView,
  (nextTab) => {
    const normalized = normalizeTab(nextTab)
    if (route.query.tab !== normalized) {
      router.replace({
        path: route.path,
        query: {
          ...route.query,
          tab: normalized,
        },
      })
    }
  },
)

const projects = computed(() => managerOverview.data?.projects || [])
const canManageAnyTeam = computed(() => !!managerOverview.data?.permissions?.can_manage_any_team)

const criticalMetrics = computed(() => {
  return (
    managerOverview.data?.critical || {
      overdue: 0,
      due_today: 0,
      blocked: 0,
      long_pending: 0,
      long_pending_days: 7,
    }
  )
})

const teamMembers = computed(() => {
  const map = new Map()
  projects.value.forEach((project) => {
    ;(project.team || []).forEach((member) => {
      if (!member?.user) return
      if (!map.has(member.user)) {
        map.set(member.user, {
          user: member.user,
          totalTasks: 0,
          pendingTasks: 0,
        })
      }
      const row = map.get(member.user)
      row.totalTasks += Number(project.total_tasks || 0)
      row.pendingTasks += Number(project.pending_tasks || 0)
    })
  })
  return Array.from(map.values())
})

const teamMetrics = computed(() => {
  const totalMembers = teamMembers.value.length
  const activeMembers = teamMembers.value.filter((member) => Number(member.pendingTasks || 0) > 0).length
  const idleMembers = Math.max(totalMembers - activeMembers, 0)
  const pendingWorkload = teamMembers.value.reduce((sum, member) => sum + Number(member.pendingTasks || 0), 0)
  const taskAssignmentCount = teamMembers.value.reduce((sum, member) => sum + Number(member.totalTasks || 0), 0)
  const avgTasksPerMember = totalMembers ? (taskAssignmentCount / totalMembers).toFixed(1) : '0.0'

  return {
    totalMembers,
    activeMembers,
    idleMembers,
    pendingWorkload,
    taskAssignmentCount,
    avgTasksPerMember,
  }
})

const projectMetrics = computed(() => {
  const totalProjects = projects.value.length
  const activeProjects = projects.value.filter((project) => !['Completed', 'Cancelled'].includes(project.status)).length
  const delayedProjects = projects.value.filter((project) => project.health_state === 'Delayed').length
  const atRiskProjects = projects.value.filter((project) => project.health_state === 'At Risk').length

  const averageCompletionPercentage = totalProjects
    ? Math.round(projects.value.reduce((sum, project) => sum + Number(project.progress || 0), 0) / totalProjects)
    : 0

  return {
    totalProjects,
    activeProjects,
    delayedProjects,
    atRiskProjects,
    averageCompletionPercentage,
  }
})

const taskMetrics = computed(() => {
  const totalTasks = projects.value.reduce((sum, project) => sum + Number(project.total_tasks || 0), 0)
  return {
    totalTasks,
    overdueTasks: Number(criticalMetrics.value.overdue || 0),
    dueTodayTasks: Number(criticalMetrics.value.due_today || 0),
    blockedTasks: Number(criticalMetrics.value.blocked || 0),
    longPendingTasks: Number(criticalMetrics.value.long_pending || 0),
  }
})

const overviewTeamCards = computed(() => [
  { key: 'total-members', label: 'Total Members', value: teamMetrics.value.totalMembers },
  { key: 'active-members', label: 'Active Members', value: teamMetrics.value.activeMembers },
  { key: 'pending-workload', label: 'Pending Workload', value: teamMetrics.value.pendingWorkload },
])

const overviewProjectCards = computed(() => [
  { key: 'total-projects', label: 'Total Projects', value: projectMetrics.value.totalProjects },
  { key: 'active-projects', label: 'Active Projects', value: projectMetrics.value.activeProjects },
  { key: 'delayed-projects', label: 'Delayed Projects', value: projectMetrics.value.delayedProjects },
  { key: 'average-progress', label: 'Average Progress', value: `${projectMetrics.value.averageCompletionPercentage}%` },
])

const overviewTaskCards = computed(() => [
  { key: 'total-tasks', label: 'Total Tasks', value: taskMetrics.value.totalTasks },
  { key: 'overdue-tasks', label: 'Overdue', value: taskMetrics.value.overdueTasks },
  { key: 'due-today-tasks', label: 'Due Today', value: taskMetrics.value.dueTodayTasks },
  { key: 'blocked-tasks', label: 'Blocked', value: taskMetrics.value.blockedTasks },
  { key: 'long-pending-tasks', label: 'Long Pending', value: taskMetrics.value.longPendingTasks },
])

const teamCards = computed(() => [
  { key: 'team-total', label: 'Total Members', value: teamMetrics.value.totalMembers },
  { key: 'team-active', label: 'Active Members', value: teamMetrics.value.activeMembers },
  { key: 'team-idle', label: 'Idle Members', value: teamMetrics.value.idleMembers },
  { key: 'team-workload-distribution', label: 'Workload Distribution', value: teamMetrics.value.avgTasksPerMember },
  { key: 'team-task-assignment', label: 'Task Assignment Count', value: teamMetrics.value.taskAssignmentCount },
])

const projectCards = computed(() => [
  { key: 'project-total', label: 'Total Projects', value: projectMetrics.value.totalProjects },
  { key: 'project-active', label: 'Active Projects', value: projectMetrics.value.activeProjects },
  { key: 'project-delayed', label: 'Delayed Projects', value: projectMetrics.value.delayedProjects },
  { key: 'project-at-risk', label: 'At Risk Projects', value: projectMetrics.value.atRiskProjects },
  { key: 'project-average-completion', label: 'Average Completion', value: `${projectMetrics.value.averageCompletionPercentage}%` },
])

const taskCards = computed(() => [
  { key: 'task-total', label: 'Total Tasks', value: taskMetrics.value.totalTasks },
  { key: 'task-overdue', label: 'Overdue', value: taskMetrics.value.overdueTasks },
  { key: 'task-due-today', label: 'Due Today', value: taskMetrics.value.dueTodayTasks },
  { key: 'task-blocked', label: 'Blocked', value: taskMetrics.value.blockedTasks },
  { key: 'task-long-pending', label: 'Long Pending', value: taskMetrics.value.longPendingTasks },
])

onMounted(async () => {
  if (!managerOverview.data || managerOverview.error) {
    try {
      await ensureManagerOverviewLoaded({ force: Boolean(managerOverview.error) })
    } catch (e) {
      // Error state is rendered in template.
    }
  }
})
</script>
