<template>
  <div class="mx-auto max-w-7xl p-6">
    <header class="mb-5 flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 class="text-2xl font-semibold text-gray-900">Projects</h1>
        <p class="mt-1 text-sm text-gray-600">Kanban and list views for project status tracking.</p>
      </div>

      <div class="inline-flex rounded-lg border border-gray-200 bg-white p-1">
        <button
          class="rounded-md px-3 py-1.5 text-sm font-medium"
          :class="activeTab === 'kanban' ? 'bg-gray-900 text-white' : 'text-gray-700 hover:bg-gray-50'"
          @click="activeTab = 'kanban'"
        >
          Kanban
        </button>
        <button
          class="rounded-md px-3 py-1.5 text-sm font-medium"
          :class="activeTab === 'list' ? 'bg-gray-900 text-white' : 'text-gray-700 hover:bg-gray-50'"
          @click="activeTab = 'list'"
        >
          List
        </button>
      </div>
    </header>

    <div v-if="managerOverview.loading" class="rounded-xl border border-gray-200 bg-white p-4 text-sm text-gray-600">
      Loading projects...
    </div>

    <div v-else-if="managerOverview.error" class="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
      Unable to load projects.
    </div>

    <template v-else>
      <section v-if="activeTab === 'kanban'" class="overflow-x-auto">
        <div class="grid min-w-[980px] grid-cols-4 gap-4">
          <div
            v-for="column in kanbanColumns"
            :key="column.key"
            class="rounded-xl border border-gray-200 bg-white p-3"
          >
            <div class="mb-3 flex items-center justify-between">
              <h2 class="text-sm font-semibold text-gray-900">{{ column.title }}</h2>
              <span class="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">{{ column.projects.length }}</span>
            </div>

            <div class="space-y-3">
              <article
                v-for="project in column.projects"
                :key="project.name"
                class="rounded-lg border border-gray-200 bg-white p-3"
              >
                <div class="flex items-start justify-between gap-2">
                  <div>
                    <h3 class="text-sm font-semibold text-gray-900">{{ project.project_name }}</h3>
                    <p class="mt-1 text-xs text-gray-500">{{ project.status }} • {{ project.pending_tasks }} pending</p>
                  </div>
                  <button
                    class="rounded-md border border-gray-300 p-1 text-gray-600 hover:bg-gray-50"
                    :class="{ 'cursor-not-allowed opacity-50': !project.permissions?.can_manage_team }"
                    :disabled="!project.permissions?.can_manage_team"
                    @click="openProjectEditor(project)"
                  >
                    <Pencil class="h-3.5 w-3.5" />
                  </button>
                </div>

                <div class="mt-3">
                  <div class="mb-1 flex items-center justify-between text-xs text-gray-500">
                    <span>{{ project.pending_tasks }} pending / {{ project.total_tasks }} total</span>
                    <span>{{ completionPercent(project) }}%</span>
                  </div>
                  <div class="h-2 w-full rounded-full bg-gray-100">
                    <div
                      class="h-2 rounded-full"
                      :class="progressClass(project.health_state)"
                      :style="{ width: `${completionPercent(project)}%` }"
                    ></div>
                  </div>
                </div>

                <div class="mt-3 flex -space-x-1.5">
                  <div v-for="member in visibleTeamMembers(project)" :key="member.user" class="group relative">
                    <img
                      v-if="member.user_image"
                      :src="member.user_image"
                      :alt="member.full_name || member.user"
                      class="h-6 w-6 rounded-full border border-white object-cover"
                    />
                    <span v-else class="inline-flex h-6 w-6 items-center justify-center rounded-full border border-white bg-gray-700 text-[10px] font-semibold text-white">
                      {{ initials(member.full_name || member.user) }}
                    </span>
                    <span class="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-gray-900 px-2 py-1 text-[10px] text-white opacity-0 transition group-hover:opacity-100">
                      {{ member.full_name || member.user }}
                    </span>
                  </div>
                  <span
                    v-if="(project.team || []).length > 3"
                    class="inline-flex h-6 w-6 items-center justify-center rounded-full border border-white bg-gray-200 text-[10px] font-semibold text-gray-700"
                  >
                    +{{ (project.team || []).length - 3 }}
                  </span>
                </div>
              </article>

              <div v-if="column.projects.length === 0" class="rounded-lg border border-dashed border-gray-200 p-3 text-xs text-gray-500">
                No projects
              </div>
            </div>
          </div>
        </div>
      </section>

      <section v-else class="rounded-xl border border-gray-200 bg-white p-4">
        <div class="overflow-x-auto">
          <table class="min-w-full text-left text-sm">
            <thead>
              <tr class="border-b border-gray-200 text-xs uppercase tracking-wide text-gray-500">
                <th class="px-2 py-2">Project</th>
                <th class="px-2 py-2">Status</th>
                <th class="px-2 py-2">Pending / Total</th>
                <th class="px-2 py-2">Progress</th>
                <th class="px-2 py-2">Health</th>
                <th class="px-2 py-2 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="project in projects" :key="project.name" class="border-b border-gray-100">
                <td class="px-2 py-3 font-medium text-gray-900">{{ project.project_name }}</td>
                <td class="px-2 py-3 text-gray-700">{{ project.status }}</td>
                <td class="px-2 py-3 text-gray-700">{{ project.pending_tasks }} / {{ project.total_tasks }}</td>
                <td class="px-2 py-3 text-gray-700">{{ completionPercent(project) }}%</td>
                <td class="px-2 py-3">
                  <span class="rounded-full px-2 py-0.5 text-xs font-medium" :class="healthBadgeClass(project.health_state)">
                    {{ project.health_state }}
                  </span>
                </td>
                <td class="px-2 py-3 text-right">
                  <button
                    class="rounded-md border border-gray-300 p-1 text-gray-600 hover:bg-gray-50"
                    :class="{ 'cursor-not-allowed opacity-50': !project.permissions?.can_manage_team }"
                    :disabled="!project.permissions?.can_manage_team"
                    @click="openProjectEditor(project)"
                  >
                    <Pencil class="h-3.5 w-3.5" />
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </template>

    <div
      v-if="selectedProject"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 backdrop-blur-sm"
      @click.self="closeProjectEditor"
    >
      <div class="max-h-[90vh] w-full max-w-4xl overflow-auto rounded-xl border border-gray-200 bg-white p-5 shadow-xl">
        <div class="mb-4 flex items-start justify-between">
          <div>
            <h3 class="text-lg font-semibold text-gray-900">Edit Project</h3>
            <p class="text-sm text-gray-600">Update project details and manage team members.</p>
          </div>
          <button class="text-gray-500 hover:text-gray-700" @click="closeProjectEditor">Close</button>
        </div>

        <div class="rounded-lg border border-gray-200 bg-gray-50 p-4">
          <div class="grid gap-3 md:grid-cols-2">
            <div>
              <label class="mb-1 block text-xs font-medium uppercase tracking-wide text-gray-500">Project Name</label>
              <input v-model="projectForm.project_name" type="text" class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
            </div>
            <div>
              <label class="mb-1 block text-xs font-medium uppercase tracking-wide text-gray-500">Status</label>
              <select v-model="projectForm.status" class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm">
                <option v-for="status in statusOptions" :key="status" :value="status">{{ status }}</option>
              </select>
            </div>
            <div>
              <label class="mb-1 block text-xs font-medium uppercase tracking-wide text-gray-500">Expected Start Date</label>
              <input v-model="projectForm.expected_start_date" type="date" class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
            </div>
            <div>
              <label class="mb-1 block text-xs font-medium uppercase tracking-wide text-gray-500">Expected End Date</label>
              <input v-model="projectForm.expected_end_date" type="date" class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
            </div>
            <div class="md:col-span-2">
              <label class="mb-1 block text-xs font-medium uppercase tracking-wide text-gray-500">Description</label>
              <textarea v-model="projectForm.notes" rows="3" class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"></textarea>
            </div>
          </div>
        </div>

        <div class="mt-4 rounded-lg border border-gray-200 p-4">
          <div class="mb-3 flex items-center justify-between">
            <h4 class="text-sm font-semibold text-gray-900">Team Members</h4>
            <button class="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50" @click="addMember">
              + Add Member
            </button>
          </div>

          <div v-if="assignableUsers.length === 0" class="mb-3 rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            Team dropdown empty hai. Pehle `Team` tab me global members add karo.
          </div>

          <div class="space-y-2">
            <div v-for="(member, index) in teamDraft" :key="`${member.user}-${index}`" class="grid grid-cols-12 gap-2">
              <select v-model="member.user" class="col-span-6 rounded-md border border-gray-300 px-2 py-2 text-sm">
                <option value="">Select user</option>
                <option v-for="u in assignableUsers" :key="u.name" :value="u.name">
                  {{ u.full_name || u.name }} ({{ u.name }})
                </option>
              </select>

              <select v-model="member.role" class="col-span-4 rounded-md border border-gray-300 px-2 py-2 text-sm">
                <option v-for="role in availableRoles" :key="role" :value="role">{{ role }}</option>
              </select>

              <button class="col-span-2 rounded-md border border-red-300 px-2 py-2 text-sm text-red-700 hover:bg-red-50" @click="removeMember(index)">
                Remove
              </button>
            </div>
          </div>
        </div>

        <p v-if="saveError" class="mt-3 text-sm text-red-700">{{ saveError }}</p>

        <div class="mt-5 flex justify-end gap-2">
          <button class="rounded-md border border-gray-300 px-3 py-1.5 text-sm" @click="closeProjectEditor">Cancel</button>
          <button class="rounded-md bg-gray-900 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-60" :disabled="saving" @click="saveProject">
            {{ saving ? 'Saving...' : 'Save Project' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { frappeRequest } from 'frappe-ui'
import { Pencil } from 'lucide-vue-next'
import { managerOverview } from '../resources'

const activeTab = ref('kanban')
const selectedProject = ref(null)
const teamDraft = ref([])
const projectForm = ref({
  project_name: '',
  status: 'Open',
  expected_start_date: '',
  expected_end_date: '',
  notes: '',
})
const saveError = ref('')
const saving = ref(false)

const projects = computed(() => managerOverview.data?.projects || [])
const assignableUsers = computed(() => managerOverview.data?.assignable_users || [])
const availableRoles = computed(() => managerOverview.data?.available_roles || ['Project Manager', 'Team Member', 'Viewer'])
const statusOptions = ['Open', 'Working', 'Completed', 'Cancelled']

const kanbanColumns = computed(() => {
  const columns = {
    on_track: { key: 'on_track', title: 'On Track', projects: [] },
    at_risk: { key: 'at_risk', title: 'At Risk', projects: [] },
    delayed: { key: 'delayed', title: 'Delayed', projects: [] },
    completed: { key: 'completed', title: 'Completed', projects: [] },
  }

  for (const project of projects.value) {
    const health = (project.health_state || '').toLowerCase()
    if (health === 'completed') columns.completed.projects.push(project)
    else if (health.includes('risk')) columns.at_risk.projects.push(project)
    else if (health.includes('delay')) columns.delayed.projects.push(project)
    else columns.on_track.projects.push(project)
  }

  return [columns.on_track, columns.at_risk, columns.delayed, columns.completed]
})

function completionPercent(project) {
  const total = Number(project?.total_tasks || 0)
  const pending = Number(project?.pending_tasks || 0)
  if (!total) return 0
  const completed = Math.max(total - pending, 0)
  return Math.round((completed / total) * 100)
}

function progressClass(health) {
  if (health === 'Delayed') return 'bg-red-500'
  if (health === 'At Risk') return 'bg-amber-500'
  if (health === 'Completed') return 'bg-emerald-500'
  return 'bg-blue-600'
}

function healthBadgeClass(health) {
  if (health === 'Delayed') return 'bg-red-100 text-red-700'
  if (health === 'At Risk') return 'bg-amber-100 text-amber-700'
  if (health === 'Completed') return 'bg-emerald-100 text-emerald-700'
  return 'bg-blue-100 text-blue-700'
}

function visibleTeamMembers(project) {
  return (project.team || []).slice(0, 3)
}

function initials(value) {
  const text = (value || '').trim()
  if (!text) return '?'
  const parts = text.split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
}

function openProjectEditor(project) {
  if (!project?.permissions?.can_manage_team) return
  selectedProject.value = project
  projectForm.value = {
    project_name: project.project_name || '',
    status: project.status || 'Open',
    expected_start_date: project.expected_start_date || '',
    expected_end_date: project.expected_end_date || '',
    notes: project.notes || '',
  }
  teamDraft.value = (project.team || []).map((member) => ({
    user: member.user,
    role: member.role || 'Team Member',
  }))
  saveError.value = ''
}

function closeProjectEditor() {
  selectedProject.value = null
  teamDraft.value = []
  projectForm.value = {
    project_name: '',
    status: 'Open',
    expected_start_date: '',
    expected_end_date: '',
    notes: '',
  }
  saveError.value = ''
}

function addMember() {
  teamDraft.value.push({ user: '', role: 'Team Member' })
}

function removeMember(index) {
  teamDraft.value.splice(index, 1)
}

async function saveProject() {
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
      url: 'taskflow.taskflow.api.taskflow.update_project',
      params: {
        project_name: selectedProject.value.name,
        values: {
          project_name: projectForm.value.project_name,
          status: projectForm.value.status,
          expected_start_date: projectForm.value.expected_start_date || null,
          expected_end_date: projectForm.value.expected_end_date || null,
          notes: projectForm.value.notes || '',
          users: cleanRows,
        },
      },
    })
    await managerOverview.fetch()
    closeProjectEditor()
  } catch (error) {
    saveError.value = error?.messages?.[0] || error?.message || 'Unable to save project.'
  } finally {
    saving.value = false
  }
}
</script>
