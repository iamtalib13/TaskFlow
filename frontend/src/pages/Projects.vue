<template>
  <div class="mx-auto max-w-7xl p-6">
    <div v-if="isOverviewLoading" class="rounded-xl border border-gray-200 bg-white p-4 text-sm text-gray-600">
      Loading projects...
    </div>

    <div v-else-if="managerOverview.error && !projects.length" class="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
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
                class="rounded-lg border bg-white p-3 transition hover:-translate-y-0.5 hover:bg-blue-50/40 hover:shadow-sm"
                :class="cardBorderClass(project.health_state)"
              >
                <div class="flex items-start justify-between gap-2">
                  <div>
                    <h3 class="text-sm font-semibold text-gray-900">{{ project.project_name }}</h3>
                    <p class="mt-1 text-xs text-gray-500">{{ project.status }} • {{ project.pending_tasks }} pending</p>
                  </div>
                  <div class="flex items-center gap-2">
                    <span class="rounded-full px-2 py-0.5 text-[11px] font-medium" :class="healthBadgeClass(project.health_state)">
                      {{ project.health_state }}
                    </span>
                    <button
                      class="rounded-md border border-gray-300 p-1 text-gray-600 hover:bg-gray-50"
                      :class="{ 'cursor-not-allowed opacity-50': !project.permissions?.can_manage_team }"
                      :disabled="!project.permissions?.can_manage_team"
                      @click="openProjectEditor(project)"
                    >
                      <Pencil class="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                <div class="mt-3">
                  <div class="mb-2 rounded-md border border-gray-200 bg-gray-50 px-2 py-1.5">
                    <div class="flex items-center gap-2 text-[11px] text-gray-600">
                      <span class="shrink-0 font-medium">Start: {{ formatDateDMY(project.expected_start_date) }}</span>
                      <span class="flex flex-1 items-center gap-1 text-gray-400">
                        <span class="h-px flex-1 bg-gray-300"></span>
                        <span class="text-xs">→</span>
                      </span>
                      <span class="shrink-0 text-right font-medium">End: {{ formatDateDMY(project.expected_end_date) }}</span>
                    </div>
                  </div>
                  <div class="mb-1 flex items-center justify-between text-xs text-gray-500">
                    <span class="font-medium">Progress</span>
                    <span>{{ completedTaskCount(project) }}/{{ Number(project.total_tasks || 0) }}</span>
                  </div>
                  <div class="h-2 w-full rounded-full bg-gray-100">
                    <div
                      class="h-2 rounded-full"
                      :class="progressClass(project.health_state)"
                      :style="{ width: `${completionPercent(project)}%` }"
                    ></div>
                  </div>
                </div>

                <div class="mt-3 flex items-center justify-between gap-3">
                  <div class="flex min-w-0 flex-nowrap -space-x-1.5">
                    <div v-for="member in visibleTeamMembers(project)" :key="member.user" class="group relative">
                      <img
                        v-if="member.user_image"
                        :src="member.user_image"
                        :alt="member.full_name || member.user"
                        class="h-8 w-8 rounded-full border border-white object-cover"
                      />
                      <span v-else class="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white bg-gray-700 text-[11px] font-semibold text-white">
                        {{ initials(member.full_name || member.user) }}
                      </span>
                      <span class="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-gray-900 px-2 py-1 text-[10px] text-white opacity-0 transition group-hover:opacity-100">
                        {{ member.full_name || member.user }}
                      </span>
                    </div>
                    <span
                      v-if="(project.team || []).length > 3"
                      class="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white bg-gray-200 text-xs font-semibold text-gray-700"
                    >
                      +{{ (project.team || []).length - 3 }}
                    </span>
                  </div>
                  <button
                    class="inline-flex h-6 min-w-[24px] shrink-0 items-center justify-center rounded-full px-1.5 text-[11px] font-semibold text-white"
                    :class="{
                      'bg-red-600 hover:bg-red-700': Number(project.pending_tasks || 0) > 0,
                      'bg-emerald-600 hover:bg-emerald-700': Number(project.pending_tasks || 0) === 0,
                    }"
                    @click="goToProjectTasks(project)"
                    :title="`Open tasks for ${project.project_name || project.name}`"
                  >
                    {{ project.pending_tasks || 0 }}
                  </button>
                </div>
              </article>

              <div v-if="column.projects.length === 0" class="rounded-lg border border-dashed border-gray-200 p-3 text-xs text-gray-500">
                No projects
              </div>
            </div>
          </div>
        </div>
      </section>

      <section v-else-if="activeTab === 'list'" class="rounded-xl border border-gray-200 bg-white p-4">
        <div class="overflow-x-auto">
          <table class="min-w-full text-left text-sm">
            <thead>
              <tr class="border-b border-gray-200 text-xs uppercase tracking-wide text-gray-500">
                <th class="w-16 px-3 py-2">Sr. No.</th>
                <th class="px-3 py-2">Project</th>
                <th class="px-3 py-2">Status</th>
                <th class="px-3 py-2">Pending / Total</th>
                <th class="px-3 py-2">Progress</th>
                <th class="px-3 py-2">Health</th>
                <th class="px-3 py-2">Team</th>
                <th class="px-3 py-2 text-right">Action</th>
                <th class="px-3 py-2 text-right">Last Modified</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(project, index) in filteredProjects" :key="project.name" class="border-b border-gray-100">
                <td class="px-3 py-2.5 text-gray-500">{{ index + 1 }}</td>
                <td class="px-3 py-2.5 font-medium text-gray-900">{{ project.project_name }}</td>
                <td class="px-3 py-2.5 text-gray-700">{{ project.status }}</td>
                <td class="px-3 py-2.5 text-gray-700">{{ project.pending_tasks }} / {{ project.total_tasks }}</td>
                <td class="px-3 py-2.5 text-gray-700">{{ completionPercent(project) }}%</td>
                <td class="px-3 py-2.5">
                  <span class="rounded-full px-2 py-0.5 text-xs font-medium" :class="healthBadgeClass(project.health_state)">
                    {{ project.health_state }}
                  </span>
                </td>
                <td class="px-3 py-2.5">
                  <div class="flex -space-x-1.5">
                    <div v-for="member in visibleTeamMembers(project)" :key="member.user" class="group relative">
                      <img
                        v-if="member.user_image"
                        :src="member.user_image"
                        :alt="member.full_name || member.user"
                        class="h-8 w-8 rounded-full border border-white object-cover"
                      />
                      <span v-else class="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white bg-gray-700 text-[11px] font-semibold text-white">
                        {{ initials(member.full_name || member.user) }}
                      </span>
                      <span class="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-gray-900 px-2 py-1 text-[10px] text-white opacity-0 transition group-hover:opacity-100">
                        {{ member.full_name || member.user }}
                      </span>
                    </div>
                    <span
                      v-if="(project.team || []).length > 3"
                      class="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white bg-gray-200 text-xs font-semibold text-gray-700"
                    >
                      +{{ (project.team || []).length - 3 }}
                    </span>
                  </div>
                </td>
                <td class="px-3 py-2.5 text-right">
                  <button
                    class="rounded-md border border-gray-300 p-1 text-gray-600 hover:bg-gray-50"
                    :class="{ 'cursor-not-allowed opacity-50': !project.permissions?.can_manage_team }"
                    :disabled="!project.permissions?.can_manage_team"
                    @click="openProjectEditor(project)"
                  >
                    <Pencil class="h-3.5 w-3.5" />
                  </button>
                </td>
                <td class="px-3 py-2.5 text-right text-gray-600">{{ project.modified_pretty || 'N/A' }}</td>
              </tr>
              <tr v-if="filteredProjects.length === 0">
                <td colspan="9" class="px-3 py-6 text-center text-sm text-gray-500">No projects match your search.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section v-else class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <article
          v-for="project in filteredProjects"
          :key="project.name"
          class="rounded-xl border bg-white p-4 transition hover:-translate-y-0.5 hover:bg-blue-50/40 hover:shadow-sm"
          :class="cardBorderClass(project.health_state)"
        >
          <div class="mb-2 flex items-start justify-between gap-2">
            <div>
              <h3 class="text-base font-semibold text-gray-900">{{ project.project_name }}</h3>
              <p class="mt-1 text-xs text-gray-500">{{ project.status }}</p>
            </div>
            <div class="flex items-center gap-2">
              <span class="rounded-full px-2 py-0.5 text-[11px] font-medium" :class="healthBadgeClass(project.health_state)">
                {{ project.health_state }}
              </span>
              <button
                class="rounded-md border border-gray-300 p-1 text-gray-600 hover:bg-gray-50"
                :class="{ 'cursor-not-allowed opacity-50': !project.permissions?.can_manage_team }"
                :disabled="!project.permissions?.can_manage_team"
                @click="openProjectEditor(project)"
              >
                <Pencil class="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          <div class="mb-3">
            <div class="mb-2 rounded-md border border-gray-200 bg-gray-50 px-2 py-1.5">
              <div class="flex items-center gap-2 text-[11px] text-gray-600">
                <span class="shrink-0 font-medium">Start: {{ formatDateDMY(project.expected_start_date) }}</span>
                <span class="flex flex-1 items-center gap-1 text-gray-400">
                  <span class="h-px flex-1 bg-gray-300"></span>
                  <span class="text-xs">→</span>
                </span>
                <span class="shrink-0 text-right font-medium">End: {{ formatDateDMY(project.expected_end_date) }}</span>
              </div>
            </div>
            <div class="mb-1 flex items-center justify-between text-xs text-gray-500">
              <span class="font-medium">Progress</span>
              <span>{{ completedTaskCount(project) }}/{{ Number(project.total_tasks || 0) }}</span>
            </div>
            <div class="h-2 w-full rounded-full bg-gray-100">
              <div
                class="h-2 rounded-full"
                :class="progressClass(project.health_state)"
                :style="{ width: `${completionPercent(project)}%` }"
              ></div>
            </div>
          </div>

          <div class="mb-3 flex items-center justify-between gap-3">
            <div class="flex min-w-0 flex-nowrap -space-x-1.5">
              <div v-for="member in visibleTeamMembers(project)" :key="member.user" class="group relative">
                <img
                  v-if="member.user_image"
                  :src="member.user_image"
                  :alt="member.full_name || member.user"
                  class="h-8 w-8 rounded-full border border-white object-cover"
                />
                <span v-else class="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white bg-gray-700 text-[11px] font-semibold text-white">
                  {{ initials(member.full_name || member.user) }}
                </span>
                <span class="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-gray-900 px-2 py-1 text-[10px] text-white opacity-0 transition group-hover:opacity-100">
                  {{ member.full_name || member.user }}
                </span>
              </div>
              <span
                v-if="(project.team || []).length > 3"
                class="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white bg-gray-200 text-xs font-semibold text-gray-700"
              >
                +{{ (project.team || []).length - 3 }}
              </span>
            </div>
            <button
              class="inline-flex h-6 min-w-[24px] shrink-0 items-center justify-center rounded-full px-1.5 text-[11px] font-semibold text-white"
              :class="{
                'bg-red-600 hover:bg-red-700': Number(project.pending_tasks || 0) > 0,
                'bg-emerald-600 hover:bg-emerald-700': Number(project.pending_tasks || 0) === 0,
              }"
              @click="goToProjectTasks(project)"
              :title="`Open tasks for ${project.project_name || project.name}`"
            >
              {{ project.pending_tasks || 0 }}
            </button>
          </div>
        </article>

        <div v-if="filteredProjects.length === 0" class="rounded-xl border border-dashed border-gray-300 bg-white p-6 text-sm text-gray-500">
          No projects available.
        </div>
      </section>
    </template>

    <div
      v-if="modalMode"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 backdrop-blur-sm"
      @click.self="closeProjectModal"
    >
      <div class="max-h-[90vh] w-full max-w-4xl overflow-auto rounded-xl border border-gray-200 bg-white p-5 shadow-xl">
        <div class="mb-4 flex items-start justify-between">
          <div>
            <h3 class="text-lg font-semibold text-gray-900">{{ modalMode === 'create' ? 'Create Project' : 'Edit Project' }}</h3>
            <p class="text-sm text-gray-600">
              {{ modalMode === 'create' ? 'Fill details and create a new project with team members.' : 'Update project details and manage team members.' }}
            </p>
          </div>
          <button class="text-gray-500 hover:text-gray-700" @click="closeProjectModal">Close</button>
        </div>

        <div class="rounded-lg border border-gray-200 bg-gray-50 p-4">
          <div class="grid gap-3 md:grid-cols-2">
            <div>
              <label class="mb-1 block text-xs font-medium uppercase tracking-wide text-gray-500">Project Name *</label>
              <input v-model.trim="projectForm.project_name" type="text" class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
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

        <p v-if="formError" class="mt-3 text-sm text-red-700">{{ formError }}</p>

        <div class="mt-5 flex justify-end gap-2">
          <button class="rounded-md border border-gray-300 px-3 py-1.5 text-sm" @click="closeProjectModal">Cancel</button>
          <button class="rounded-md bg-gray-900 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-60" :disabled="saving" @click="submitProjectForm">
            {{ saving ? 'Saving...' : modalMode === 'create' ? 'Create Project' : 'Save Project' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { frappeRequest } from 'frappe-ui'
import { useRoute, useRouter } from 'vue-router'
import { Pencil } from 'lucide-vue-next'
import { ensureManagerOverviewLoaded, managerOverview } from '../resources'

const activeTab = ref('kanban')
const modalMode = ref('')
const selectedProjectName = ref('')
const teamDraft = ref([])
const projectForm = ref(defaultProjectForm())
const formError = ref('')
const saving = ref(false)
const route = useRoute()
const router = useRouter()
const isOverviewLoading = computed(() => managerOverview.loading || (!managerOverview.fetched && !managerOverview.data))

const projects = computed(() => managerOverview.data?.projects || [])
const filteredProjects = computed(() => {
  const q = (route.query.project_search || '').toString().trim().toLowerCase()
  const filterBy = (route.query.project_filter_by || 'project_name').toString()
  const selectedMember = (route.query.project_member || '').toString().trim().toLowerCase()

  return projects.value.filter((project) => {
    const projectName = (project.project_name || '').toLowerCase()
    const status = (project.status || '').toLowerCase()
    const teamMembers = (project.team || []).map((member) => (member.full_name || member.user || '').toLowerCase())
    const teamUsers = (project.team || []).map((member) => (member.user || '').toLowerCase())

    if (filterBy === 'team_member') {
      if (selectedMember && !teamUsers.includes(selectedMember)) {
        return false
      }
      if (!q) return true
      return teamMembers.some((memberName) => memberName.includes(q)) || teamUsers.some((user) => user.includes(q))
    }

    if (!q) return true
    return projectName.includes(q) || status.includes(q)
  })
})
const assignableUsers = computed(() => managerOverview.data?.assignable_users || [])
const availableRoles = computed(() => managerOverview.data?.available_roles || ['Project Manager', 'Team Member', 'Viewer'])
const statusOptions = ['Open', 'Working', 'Completed', 'Cancelled']
const canCreateProject = computed(() => Boolean(managerOverview.data?.permissions?.can_manage_any_team))

const kanbanColumns = computed(() => {
  const columns = {
    on_track: { key: 'on_track', title: 'On Track', projects: [] },
    at_risk: { key: 'at_risk', title: 'At Risk', projects: [] },
    delayed: { key: 'delayed', title: 'Delayed', projects: [] },
    completed: { key: 'completed', title: 'Completed', projects: [] },
  }

  for (const project of filteredProjects.value) {
    const health = (project.health_state || '').toLowerCase()
    if (health === 'completed') columns.completed.projects.push(project)
    else if (health.includes('risk')) columns.at_risk.projects.push(project)
    else if (health.includes('delay')) columns.delayed.projects.push(project)
    else columns.on_track.projects.push(project)
  }

  return [columns.on_track, columns.at_risk, columns.delayed, columns.completed]
})

function defaultProjectForm() {
  return {
    project_name: '',
    status: 'Open',
    expected_start_date: '',
    expected_end_date: '',
    notes: '',
  }
}

function completionPercent(project) {
  const total = Number(project?.total_tasks || 0)
  const pending = Number(project?.pending_tasks || 0)
  if (!total) return 0
  const completed = Math.max(total - pending, 0)
  return Math.round((completed / total) * 100)
}

function completedTaskCount(project) {
  const total = Number(project?.total_tasks || 0)
  const pending = Number(project?.pending_tasks || 0)
  return Math.max(total - pending, 0)
}

function formatDateDMY(value) {
  if (!value) return 'Not set'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Not set'
  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const year = date.getFullYear()
  return `${day}-${month}-${year}`
}

function progressClass(health) {
  if (health === 'Delayed') return 'bg-red-500'
  if (health === 'At Risk') return 'bg-amber-500'
  if (health === 'Completed') return 'bg-emerald-500'
  return 'bg-blue-600'
}

function healthBadgeClass(health) {
  if (health === 'Delayed') return 'border border-red-300 text-red-700'
  if (health === 'At Risk') return 'border border-amber-300 text-amber-700'
  if (health === 'Completed') return 'border border-emerald-300 text-emerald-700'
  return 'border border-blue-300 text-blue-700'
}

function cardBorderClass(health) {
  if (health === 'Delayed') return 'border-red-300'
  if (health === 'At Risk') return 'border-amber-300'
  if (health === 'Completed') return 'border-emerald-300'
  return 'border-blue-300'
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
  modalMode.value = 'edit'
  selectedProjectName.value = project.name
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
  formError.value = ''
}

function openCreateProjectModal() {
  if (!canCreateProject.value) return
  modalMode.value = 'create'
  selectedProjectName.value = ''
  projectForm.value = defaultProjectForm()
  teamDraft.value = []
  formError.value = ''
}

function closeProjectModal() {
  modalMode.value = ''
  selectedProjectName.value = ''
  projectForm.value = defaultProjectForm()
  teamDraft.value = []
  formError.value = ''
}

function clearNewProjectFlagFromRoute() {
  if (!route.query.new_project) return
  const nextQuery = { ...route.query }
  delete nextQuery.new_project
  router.replace({ path: route.path, query: nextQuery })
}

function clearEditProjectFlagFromRoute() {
  if (!route.query.edit_project) return
  const nextQuery = { ...route.query }
  delete nextQuery.edit_project
  router.replace({ path: route.path, query: nextQuery })
}

function addMember() {
  teamDraft.value.push({ user: '', role: 'Team Member' })
}

function removeMember(index) {
  teamDraft.value.splice(index, 1)
}

function goToProjectTasks(project) {
  if (!project?.name) return
  router.push({
    path: '/tasks',
    query: { project: project.name },
  })
}

function validateProjectForm() {
  if (!projectForm.value.project_name) {
    formError.value = 'Project name is required.'
    return null
  }

  if (projectForm.value.expected_start_date && projectForm.value.expected_end_date) {
    if (projectForm.value.expected_end_date < projectForm.value.expected_start_date) {
      formError.value = 'Expected end date cannot be before start date.'
      return null
    }
  }

  const cleanRows = teamDraft.value.filter((row) => row.user)
  const seenUsers = new Set()

  for (const row of cleanRows) {
    if (seenUsers.has(row.user)) {
      formError.value = `Duplicate user selected: ${row.user}`
      return null
    }
    seenUsers.add(row.user)
  }

  return cleanRows
}

async function submitProjectForm() {
  if (!modalMode.value) return

  formError.value = ''
  const cleanRows = validateProjectForm()
  if (!cleanRows) return

  saving.value = true
  try {
    const payload = {
      project_name: projectForm.value.project_name,
      status: projectForm.value.status,
      expected_start_date: projectForm.value.expected_start_date || null,
      expected_end_date: projectForm.value.expected_end_date || null,
      notes: projectForm.value.notes || '',
      users: cleanRows,
    }

    if (modalMode.value === 'create') {
      await frappeRequest({
        url: 'taskflow.taskflow.api.taskflow.create_project',
        params: { values: payload },
      })
      await ensureManagerOverviewLoaded({ force: true })
      closeProjectModal()
      return
    }

    await frappeRequest({
      url: 'taskflow.taskflow.api.taskflow.update_project',
      params: {
        project_name: selectedProjectName.value,
        values: payload,
      },
    })
    await ensureManagerOverviewLoaded({ force: true })
    closeProjectModal()
  } catch (error) {
    formError.value = error?.messages?.[0] || error?.message || 'Unable to save project.'
  } finally {
    saving.value = false
  }
}

watch(
  () => route.query.view,
  (view) => {
    activeTab.value = ['kanban', 'list', 'gallery'].includes(view) ? view : 'kanban'
  },
  { immediate: true },
)

watch(
  () => [route.query.new_project, canCreateProject.value, managerOverview.loading],
  ([newProjectFlag, canCreate, loading]) => {
    if (newProjectFlag !== '1') return
    if (loading) return
    clearNewProjectFlagFromRoute()
    if (canCreate) {
      openCreateProjectModal()
    }
  },
  { immediate: true },
)

watch(
  () => [route.query.edit_project, managerOverview.loading],
  ([editProjectName, loading]) => {
    if (!editProjectName || typeof editProjectName !== 'string') return
    if (loading) return

    const project = projects.value.find((item) => item.name === editProjectName)
    clearEditProjectFlagFromRoute()
    if (project?.permissions?.can_manage_team) {
      openProjectEditor(project)
    }
  },
  { immediate: true },
)

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
