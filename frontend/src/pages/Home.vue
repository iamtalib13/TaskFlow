<template>
  <div class="mx-auto max-w-6xl p-6">
    <header class="mb-6">
      <h1 class="text-2xl font-semibold text-gray-900">Project Control</h1>
      <p class="mt-1 text-sm text-gray-600">
        Minimal dashboard for manager clarity: active workload, progress, and team roles.
      </p>
    </header>

    <div v-if="managerOverview.loading" class="rounded-lg border border-gray-200 bg-white p-6 text-sm text-gray-600">
      Loading project overview...
    </div>

    <div v-else-if="managerOverview.error" class="rounded-lg border border-red-200 bg-red-50 p-6 text-sm text-red-700">
      You do not have access to manager controls.
    </div>

    <template v-else>
      <div
        v-if="!canManageAnyTeam"
        class="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800"
      >
        You are in read/limited mode based on your project role.
      </div>

      <section class="mb-5 rounded-xl border border-red-200 bg-red-50 p-4">
        <div class="mb-3 flex items-center justify-between">
          <h2 class="text-sm font-semibold uppercase tracking-wide text-red-800">Critical Alerts</h2>
          <p class="text-xs text-red-700">Immediate attention required</p>
        </div>
        <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <button
            v-for="card in criticalCards"
            :key="card.key"
            class="rounded-lg border p-3 text-left transition"
            :class="card.classes"
            @click="applyTaskFocus(card.key)"
          >
            <p class="text-xs font-medium uppercase tracking-wide">{{ card.label }}</p>
            <p class="mt-1 text-2xl font-bold">{{ card.value }}</p>
            <p class="mt-1 text-xs">{{ card.hint }}</p>
          </button>
        </div>
      </section>

      <div class="mb-5 inline-flex rounded-lg border border-gray-200 bg-white p-1">
        <button
          class="rounded-md px-3 py-1.5 text-sm font-medium"
          :class="activeView === 'projects' ? 'bg-gray-900 text-white' : 'text-gray-700 hover:bg-gray-50'"
          @click="activeView = 'projects'"
        >
          Projects
        </button>
        <button
          class="rounded-md px-3 py-1.5 text-sm font-medium"
          :class="activeView === 'tasks' ? 'bg-gray-900 text-white' : 'text-gray-700 hover:bg-gray-50'"
          @click="switchToTasksView"
        >
          Tasks
        </button>
      </div>

      <section v-if="activeView === 'projects'" class="mb-6 grid gap-4 md:grid-cols-3">
        <div class="rounded-xl border border-gray-200 bg-white p-4">
          <p class="text-xs uppercase tracking-wide text-gray-500">Active Projects</p>
          <p class="mt-2 text-3xl font-semibold text-gray-900">{{ managerStats.active_projects }}</p>
        </div>
        <div class="rounded-xl border border-gray-200 bg-white p-4">
          <p class="text-xs uppercase tracking-wide text-gray-500">Avg Progress</p>
          <p class="mt-2 text-3xl font-semibold text-gray-900">{{ managerStats.average_progress }}%</p>
        </div>
        <div class="rounded-xl border border-gray-200 bg-white p-4">
          <p class="text-xs uppercase tracking-wide text-gray-500">Team Members (Total)</p>
          <p class="mt-2 text-3xl font-semibold text-gray-900">{{ managerStats.total_team_members }}</p>
        </div>
      </section>

      <section v-if="activeView === 'projects'" class="space-y-4">
        <article
          v-for="project in projects"
          :key="project.name"
          class="rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
        >
          <div class="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 class="text-lg font-semibold text-gray-900">{{ project.project_name }}</h2>
              <p class="mt-1 text-xs text-gray-500">
                {{ project.status }} • {{ project.team_count }} members • {{ project.pending_tasks }} pending tasks
              </p>
              <p class="mt-1 text-xs font-medium text-gray-700">My Role: {{ project.current_user_role }}</p>
            </div>
            <span
              class="rounded-full px-2.5 py-1 text-xs font-medium"
              :class="healthBadgeClass(project.health_state)"
            >
              {{ project.health_state }}
            </span>
            <button
              class="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
              :class="{ 'cursor-not-allowed opacity-50': !project.permissions?.can_manage_team }"
              :disabled="!project.permissions?.can_manage_team"
              @click="openTeamEditor(project)"
            >
              Team Settings
            </button>
          </div>

          <div class="mt-4">
            <div class="mb-1 flex items-center justify-between text-xs text-gray-500">
              <span>Progress</span>
              <span>{{ project.progress }}%</span>
            </div>
            <div class="h-2 w-full rounded-full bg-gray-100">
              <div
                class="h-2 rounded-full"
                :class="healthProgressClass(project.health_state)"
                :style="{ width: `${project.progress}%` }"
              ></div>
            </div>
          </div>

          <div class="mt-3 grid grid-cols-5 gap-2 text-xs text-gray-600">
            <div class="rounded border border-gray-200 px-2 py-1">PM: {{ project.role_count.project_manager }}</div>
            <div class="rounded border border-gray-200 px-2 py-1">Team: {{ project.role_count.team_member }}</div>
            <div class="rounded border border-gray-200 px-2 py-1">Viewer: {{ project.role_count.viewer }}</div>
            <div class="rounded border border-gray-200 px-2 py-1">Risk: {{ project.at_risk_tasks }}</div>
            <div class="rounded border border-gray-200 px-2 py-1">Delayed: {{ project.delayed_tasks }}</div>
          </div>
        </article>
      </section>

      <section v-if="activeView === 'tasks'" class="space-y-4">
        <div class="rounded-xl border border-gray-200 bg-white p-4">
          <div class="flex flex-wrap items-center gap-3">
            <label class="text-sm font-medium text-gray-700">Project</label>
            <select
              v-model="selectedProjectFilter"
              class="min-w-[240px] rounded-md border border-gray-300 px-3 py-2 text-sm"
              @change="fetchTasks"
            >
              <option value="">All Projects</option>
              <option v-for="project in projects" :key="project.name" :value="project.name">
                {{ project.project_name }}
              </option>
            </select>
          </div>
          <div class="mt-3 flex flex-wrap gap-2">
            <button
              v-for="option in taskFocusOptions"
              :key="option.key"
              class="rounded-full border px-3 py-1 text-xs font-medium"
              :class="taskFocus === option.key ? 'border-gray-900 bg-gray-900 text-white' : 'border-gray-300 text-gray-700 hover:bg-gray-50'"
              @click="applyTaskFocus(option.key)"
            >
              {{ option.label }}
            </button>
          </div>
        </div>

        <div v-if="tasksLoading" class="rounded-xl border border-gray-200 bg-white p-4 text-sm text-gray-600">
          Loading tasks...
        </div>
        <div v-else-if="tasks.length === 0" class="rounded-xl border border-gray-200 bg-white p-4 text-sm text-gray-600">
          No tasks found for selected project.
        </div>

        <div v-else class="space-y-2">
          <article
            v-for="task in tasks"
            :key="task.name"
            class="rounded-xl border border-gray-200 bg-white p-4"
          >
            <div class="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h3 class="text-sm font-semibold text-gray-900">{{ task.subject }}</h3>
                <p class="mt-1 text-xs text-gray-500">
                  {{ task.project_title || selectedProjectName || task.project }} • {{ task.owner_name || task.owner }}
                </p>
              </div>
              <span class="rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700">
                {{ task.status }}
              </span>
            </div>
            <div class="mt-2 flex flex-wrap gap-3 text-xs text-gray-600">
              <span>Priority: {{ task.priority || 'NA' }}</span>
              <span>Due: {{ task.exp_end_date || 'Not set' }}</span>
              <span v-if="task.days_left !== null && task.days_left !== undefined">Days Left: {{ task.days_left }}</span>
            </div>
          </article>
        </div>
      </section>
    </template>

    <div
      v-if="selectedProject"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      @click.self="closeTeamEditor"
    >
      <div class="max-h-[85vh] w-full max-w-3xl overflow-auto rounded-xl bg-white p-5">
        <div class="mb-4 flex items-start justify-between">
          <div>
            <h3 class="text-lg font-semibold text-gray-900">Team Settings</h3>
            <p class="text-sm text-gray-600">{{ selectedProject.project_name }}</p>
          </div>
          <button class="text-gray-500 hover:text-gray-700" @click="closeTeamEditor">Close</button>
        </div>

        <div class="space-y-2">
          <div
            v-for="(member, index) in teamDraft"
            :key="`${member.user}-${index}`"
            class="grid grid-cols-12 gap-2"
          >
            <select v-model="member.user" class="col-span-6 rounded-md border border-gray-300 px-2 py-2 text-sm">
              <option value="">Select user</option>
              <option v-for="u in assignableUsers" :key="u.name" :value="u.name">
                {{ u.full_name || u.name }} ({{ u.name }})
              </option>
            </select>

            <select v-model="member.role" class="col-span-4 rounded-md border border-gray-300 px-2 py-2 text-sm">
              <option v-for="role in availableRoles" :key="role" :value="role">{{ role }}</option>
            </select>

            <button
              class="col-span-2 rounded-md border border-red-300 px-2 py-2 text-sm text-red-700 hover:bg-red-50"
              @click="removeMember(index)"
            >
              Remove
            </button>
          </div>
        </div>

        <button
          class="mt-3 rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
          @click="addMember"
        >
          + Add Member
        </button>

        <p v-if="saveError" class="mt-3 text-sm text-red-700">{{ saveError }}</p>

        <div class="mt-5 flex justify-end gap-2">
          <button class="rounded-md border border-gray-300 px-3 py-1.5 text-sm" @click="closeTeamEditor">
            Cancel
          </button>
          <button
            class="rounded-md bg-gray-900 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-60"
            :disabled="saving"
            @click="saveTeam"
          >
            {{ saving ? 'Saving...' : 'Save Team' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { frappeRequest } from 'frappe-ui'
import { managerOverview } from '../resources'

const activeView = ref('projects')
const selectedProject = ref(null)
const teamDraft = ref([])
const saveError = ref('')
const saving = ref(false)
const selectedProjectFilter = ref('')
const taskFocus = ref('all')
const tasks = ref([])
const tasksLoading = ref(false)

const projects = computed(() => managerOverview.data?.projects || [])
const managerStats = computed(() => {
  return (
    managerOverview.data?.stats || {
      active_projects: 0,
      average_progress: 0,
      total_team_members: 0,
    }
  )
})
const assignableUsers = computed(() => managerOverview.data?.assignable_users || [])
const availableRoles = computed(
  () => managerOverview.data?.available_roles || ['Project Manager', 'Team Member', 'Viewer'],
)
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
const criticalCards = computed(() => [
  {
    key: 'overdue',
    label: 'Overdue Tasks',
    value: criticalMetrics.value.overdue || 0,
    hint: 'Past deadline',
    classes: 'border-red-200 bg-white text-red-700 hover:bg-red-100',
  },
  {
    key: 'due_today',
    label: 'Due Today',
    value: criticalMetrics.value.due_today || 0,
    hint: 'Needs closure today',
    classes: 'border-orange-200 bg-white text-orange-700 hover:bg-orange-100',
  },
  {
    key: 'blocked',
    label: 'Blocked Tasks',
    value: criticalMetrics.value.blocked || 0,
    hint: 'Waiting on dependency',
    classes: 'border-amber-200 bg-white text-amber-700 hover:bg-amber-100',
  },
  {
    key: 'long_pending',
    label: 'Long Pending',
    value: criticalMetrics.value.long_pending || 0,
    hint: `Open > ${criticalMetrics.value.long_pending_days || 7} days`,
    classes: 'border-rose-200 bg-white text-rose-700 hover:bg-rose-100',
  },
])
const taskFocusOptions = [
  { key: 'all', label: 'All' },
  { key: 'overdue', label: 'Overdue' },
  { key: 'due_today', label: 'Due Today' },
  { key: 'blocked', label: 'Blocked' },
  { key: 'long_pending', label: 'Long Pending' },
]
const selectedProjectName = computed(() => {
  if (!selectedProjectFilter.value) return 'All Projects'
  const project = projects.value.find((p) => p.name === selectedProjectFilter.value)
  return project?.project_name || ''
})

function healthBadgeClass(health) {
  if (health === 'Delayed') return 'bg-red-100 text-red-700'
  if (health === 'At Risk') return 'bg-amber-100 text-amber-700'
  if (health === 'Completed') return 'bg-emerald-100 text-emerald-700'
  return 'bg-blue-100 text-blue-700'
}

function healthProgressClass(health) {
  if (health === 'Delayed') return 'bg-red-500'
  if (health === 'At Risk') return 'bg-amber-500'
  if (health === 'Completed') return 'bg-emerald-500'
  return 'bg-blue-600'
}

function openTeamEditor(project) {
  if (!project?.permissions?.can_manage_team) return
  selectedProject.value = project
  teamDraft.value = (project.team || []).map((member) => ({
    user: member.user,
    role: member.role || 'Team Member',
  }))
  saveError.value = ''
}

function closeTeamEditor() {
  selectedProject.value = null
  teamDraft.value = []
  saveError.value = ''
}

function addMember() {
  teamDraft.value.push({ user: '', role: 'Team Member' })
}

function removeMember(index) {
  teamDraft.value.splice(index, 1)
}

async function fetchTasks() {
  tasksLoading.value = true
  try {
    const response = await frappeRequest({
      url: 'taskflow.taskflow.api.taskflow.get_task_list',
      params: {
        project: selectedProjectFilter.value || null,
        start: 0,
        page_length: 30,
        only_my_tasks: 0,
        focus_filter: taskFocus.value === 'all' ? null : taskFocus.value,
        long_pending_days: criticalMetrics.value.long_pending_days || 7,
      },
    })
    tasks.value = response?.tasks || []
  } catch (error) {
    tasks.value = []
  } finally {
    tasksLoading.value = false
  }
}

function switchToTasksView() {
  activeView.value = 'tasks'
  if (!tasks.value.length) {
    fetchTasks()
  }
}

function applyTaskFocus(focusKey) {
  taskFocus.value = focusKey || 'all'
  activeView.value = 'tasks'
  fetchTasks()
}

async function saveTeam() {
  if (!selectedProject.value) return

  saveError.value = ''
  const cleanRows = teamDraft.value.filter((row) => row.user)

  const seen = new Set()
  for (const row of cleanRows) {
    if (seen.has(row.user)) {
      saveError.value = `Duplicate user selected: ${row.user}`
      return
    }
    seen.add(row.user)
  }

  saving.value = true
  try {
    await frappeRequest({
      url: 'taskflow.taskflow.api.taskflow.save_project_team_roles',
      params: {
        project_name: selectedProject.value.name,
        team: cleanRows,
      },
    })

    await managerOverview.fetch()
    await fetchTasks()
    closeTeamEditor()
  } catch (error) {
    saveError.value = error?.messages?.[0] || error?.message || 'Unable to save team settings.'
  } finally {
    saving.value = false
  }
}
</script>
