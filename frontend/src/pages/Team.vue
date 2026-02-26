<template>
  <div class="mx-auto max-w-6xl p-6">
    <header class="mb-6 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 class="text-2xl font-semibold text-gray-900">Team</h1>
        <p class="mt-1 text-sm text-gray-600">Role-wise members with full profile overview.</p>
      </div>
      <button class="rounded-md bg-gray-900 px-3 py-2 text-sm font-medium text-white hover:bg-gray-800" @click="openAddNew">
        + Add New
      </button>
    </header>

    <div v-if="loading" class="rounded-xl border border-gray-200 bg-white p-4 text-sm text-gray-600">Loading team configuration...</div>
    <div v-else-if="loadError" class="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{{ loadError }}</div>

    <template v-else>
      <section class="space-y-3">
        <article v-for="group in roleGroups" :key="group.key" class="rounded-xl border border-gray-200 bg-white">
          <button class="flex w-full items-center justify-between px-4 py-3 text-left" @click="toggleSection(group.key)">
            <div>
              <h2 class="text-sm font-semibold text-gray-900">{{ group.label }}</h2>
              <p class="text-xs text-gray-500">{{ group.members.length }} members</p>
            </div>
            <span class="text-xs text-gray-500">{{ collapsed[group.key] ? 'Expand' : 'Collapse' }}</span>
          </button>

          <div v-if="!collapsed[group.key]" class="border-t border-gray-100 p-4">
            <div v-if="group.members.length === 0" class="rounded-lg border border-dashed border-gray-200 p-3 text-xs text-gray-500">
              No members in this category.
            </div>

            <div v-else class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <article v-for="member in group.members" :key="member.user" class="rounded-lg border border-gray-200 p-3">
                <div class="flex items-start justify-between gap-2">
                  <div class="flex items-center gap-3">
                    <img v-if="member.user_image" :src="member.user_image" :alt="member.full_name || member.user" class="h-10 w-10 rounded-full border border-gray-200 object-cover" />
                    <div v-else class="flex h-10 w-10 items-center justify-center rounded-full bg-gray-200 text-xs font-semibold text-gray-700">
                      {{ initials(member.full_name || member.user) }}
                    </div>
                    <div>
                      <p class="text-sm font-semibold text-gray-900">{{ member.full_name || member.user }}</p>
                      <p class="text-xs text-gray-500">{{ member.user }}</p>
                    </div>
                  </div>
                  <button class="rounded-md border border-gray-300 p-1 text-gray-600 hover:bg-gray-50" @click="openProfile(member)">
                    <Pencil class="h-3.5 w-3.5" />
                  </button>
                </div>
              </article>
            </div>
          </div>
        </article>
      </section>

      <p v-if="error" class="mt-4 text-sm text-red-700">{{ error }}</p>
      <p v-if="success" class="mt-4 text-sm text-green-700">{{ success }}</p>
    </template>

    <div v-if="profileOpen" class="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm">
      <div class="h-full w-full overflow-auto bg-[#0d1117] text-slate-100">
        <div class="mx-auto max-w-7xl p-6">
          <div class="mb-4 flex items-center justify-between">
            <h3 class="text-lg font-semibold text-white">User Profile Overview</h3>
            <button class="rounded-md border border-slate-600 px-3 py-1.5 text-sm text-slate-200" @click="closeProfile">Close</button>
          </div>

          <div v-if="memberOverviewLoading" class="rounded-xl border border-slate-700 bg-[#111827] p-4 text-sm text-slate-300">
            Loading profile overview...
          </div>

          <template v-else>
            <div class="grid gap-6 lg:grid-cols-12">
              <aside class="lg:col-span-4">
                <div class="rounded-xl border border-slate-700 bg-[#111827] p-5">
                  <div class="mb-4 flex flex-col items-center text-center">
                    <img
                      v-if="profileCard.user_image"
                      :src="profileCard.user_image"
                      :alt="profileCard.full_name || profileCard.user"
                      class="h-44 w-44 rounded-full border-4 border-slate-500 object-cover"
                    />
                    <div v-else class="flex h-44 w-44 items-center justify-center rounded-full border-4 border-slate-500 bg-slate-700 text-4xl font-semibold text-white">
                      {{ initials(profileCard.full_name || profileCard.user || 'U') }}
                    </div>
                    <h4 class="mt-4 text-2xl font-bold text-white">{{ profileCard.full_name || profileCard.user }}</h4>
                    <p class="text-sm text-slate-400">{{ profileCard.user }}</p>
                    <p v-if="memberOverview?.user?.email" class="mt-1 text-xs text-slate-400">{{ memberOverview.user.email }}</p>
                  </div>

                  <div class="mb-4 space-y-2 rounded-lg border border-slate-700 p-3">
                    <p class="text-xs uppercase tracking-wide text-slate-400">Role</p>
                    <p class="text-sm font-medium text-white">{{ profileRoleLabel }}</p>
                    <div class="inline-flex items-center rounded-full border border-emerald-400/40 bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-300">
                      <span class="mr-1 h-1.5 w-1.5 rounded-full bg-emerald-300"></span>
                      {{ profileActive ? 'Active' : 'Inactive' }}
                    </div>
                  </div>

                  <button class="w-full rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-500" @click="openEditPanel">
                    Edit Profile
                  </button>
                </div>
              </aside>

              <section class="space-y-5 lg:col-span-8">
                <div class="rounded-xl border border-slate-700 bg-[#111827] p-4">
                  <div class="mb-3 flex items-center justify-between">
                    <h4 class="text-sm font-semibold text-white">Projects</h4>
                    <span class="text-xs text-slate-400">{{ memberProjects.length }} assigned</span>
                  </div>

                  <div v-if="memberProjects.length === 0" class="text-sm text-slate-400">No projects assigned.</div>
                  <div v-else class="grid gap-3 md:grid-cols-2">
                    <article v-for="project in memberProjects" :key="project.name" class="rounded-lg border border-slate-700 p-3">
                      <p class="text-sm font-semibold text-blue-400">{{ project.project_name || project.name }}</p>
                      <p class="mt-1 text-xs text-slate-400">{{ project.status }}</p>
                      <div class="mt-3">
                        <div class="mb-1 flex items-center justify-between text-xs text-slate-400">
                          <span>{{ project.pending_tasks }} pending / {{ project.total_tasks }} total</span>
                          <span>{{ projectProgress(project) }}%</span>
                        </div>
                        <div class="h-2 w-full rounded-full bg-slate-800">
                          <div class="h-2 rounded-full bg-emerald-500" :style="{ width: `${projectProgress(project)}%` }"></div>
                        </div>
                      </div>
                    </article>
                  </div>
                </div>

                <div class="rounded-xl border border-slate-700 bg-[#111827] p-4">
                  <div class="mb-3 flex items-center justify-between">
                    <h4 class="text-sm font-semibold text-white">Contribution Heatmap</h4>
                    <span class="text-xs text-slate-400">{{ fiscalLabel }}</span>
                  </div>

                  <div class="overflow-x-auto">
                    <div class="min-w-[860px]">
                      <div class="mb-2 grid items-end" :style="{ gridTemplateColumns: `40px repeat(${heatmapWeeks.length}, minmax(0, 1fr))` }">
                        <span></span>
                        <span
                          v-for="(_, idx) in heatmapWeeks"
                          :key="`month-col-${idx}`"
                          class="text-[11px] text-slate-400"
                        >
                          {{ monthLabelByColumn[idx] || '' }}
                        </span>
                      </div>

                      <div class="grid" :style="{ gridTemplateColumns: `40px repeat(${heatmapWeeks.length}, minmax(0, 1fr))` }">
                        <div class="mr-2 grid grid-rows-7 text-[11px] text-slate-500">
                          <span></span>
                          <span>Mon</span>
                          <span></span>
                          <span>Wed</span>
                          <span></span>
                          <span>Fri</span>
                          <span></span>
                        </div>

                        <div v-for="(week, weekIdx) in heatmapWeeks" :key="`week-${weekIdx}`" class="grid grid-rows-7 gap-1">
                          <div
                            v-for="cell in week"
                            :key="cell.date"
                            class="h-3.5 w-3.5 rounded-[2px] border border-slate-700"
                            :class="heatLevelClass(cell.count)"
                            :title="`${cell.date}: ${cell.count} updates`"
                          ></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            </div>
          </template>
        </div>
      </div>
    </div>

    <div v-if="editPanelOpen" class="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" @click.self="closeEditPanel">
      <div class="w-full max-w-2xl rounded-xl border border-slate-700 bg-[#0d1117] p-5 text-slate-100">
        <div class="mb-4 flex items-start justify-between">
          <div>
            <h3 class="text-lg font-semibold text-white">Edit Profile</h3>
            <p class="text-sm text-slate-400">Update role, Active status and assigned projects.</p>
          </div>
          <button class="text-slate-400 hover:text-slate-200" @click="closeEditPanel">Close</button>
        </div>

        <div class="space-y-3">
          <div>
            <label class="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-400">User</label>
            <select v-model="editForm.user" class="w-full rounded-md border border-slate-600 bg-[#0b1220] px-3 py-2 text-sm text-slate-100" :disabled="editingMode === 'edit'">
              <option value="">Select user</option>
              <option v-for="u in selectableUsers" :key="u.name" :value="u.name">{{ u.full_name || u.name }} ({{ u.name }})</option>
            </select>
          </div>

          <div class="grid gap-3 md:grid-cols-2">
            <div>
              <label class="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-400">Role</label>
              <select v-model="editForm.role" class="w-full rounded-md border border-slate-600 bg-[#0b1220] px-3 py-2 text-sm text-slate-100">
                <option v-for="role in availableRoles" :key="role" :value="role">{{ role }}</option>
              </select>
            </div>
            <div>
              <label class="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-400">Status</label>
              <label class="flex items-center gap-2 rounded-md border border-slate-600 px-3 py-2 text-sm text-slate-200">
                <input v-model="editForm.active" type="checkbox" class="h-4 w-4" />
                Active
              </label>
            </div>
          </div>

          <div>
            <label class="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-400">Assign Projects</label>
            <div class="max-h-52 space-y-2 overflow-auto rounded-md border border-slate-700 p-2">
              <label v-for="p in allProjectsOptions" :key="p.name" class="flex items-center justify-between rounded border border-slate-700 px-2 py-1.5 text-sm text-slate-200">
                <span>{{ p.project_name || p.name }}</span>
                <input v-model="editForm.project_names" :value="p.name" type="checkbox" class="h-4 w-4" />
              </label>
            </div>
          </div>
        </div>

        <p v-if="error" class="mt-3 text-sm text-red-300">{{ error }}</p>

        <div class="mt-5 flex items-center justify-between">
          <button
            v-if="editingMode === 'edit'"
            class="rounded-md border border-red-500/40 px-3 py-1.5 text-sm text-red-300 hover:bg-red-500/10"
            :disabled="saving"
            @click="deleteMember"
          >
            Delete User
          </button>
          <span v-else></span>

          <div class="flex gap-2">
            <button class="rounded-md border border-slate-600 px-3 py-1.5 text-sm text-slate-200" @click="closeEditPanel">Cancel</button>
            <button class="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-60" :disabled="saving" @click="saveProfileEdits">
              {{ saving ? 'Saving...' : editingMode === 'add' ? 'Add Member' : 'Save Changes' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { frappeRequest } from 'frappe-ui'
import { Pencil } from 'lucide-vue-next'
import { managerOverview } from '../resources'

const loading = ref(true)
const saving = ref(false)
const loadError = ref('')
const error = ref('')
const success = ref('')

const teamRows = ref([])
const availableUsers = ref([])
const availableRoles = ref(['Project Manager', 'Team Member', 'Viewer'])

const collapsed = ref({ project_manager: false, team_member: false, viewer: false })

const profileOpen = ref(false)
const editPanelOpen = ref(false)
const editingMode = ref('edit')

const memberOverviewLoading = ref(false)
const memberOverview = ref(null)

const editForm = ref({
  user: '',
  role: 'Team Member',
  active: true,
  project_names: [],
})

const userMap = computed(() => {
  const map = {}
  for (const u of availableUsers.value) map[u.name] = u
  return map
})

const normalizedMembers = computed(() =>
  teamRows.value
    .filter((row) => row.user)
    .map((row) => ({
      user: row.user,
      role: row.role || 'Team Member',
      enabled: !!row.enabled,
      full_name: userMap.value[row.user]?.full_name || row.user_name || row.user,
      user_image: userMap.value[row.user]?.user_image || '',
    })),
)

const roleGroups = computed(() => {
  const all = normalizedMembers.value
  return [
    { key: 'project_manager', label: 'Project Managers', members: all.filter((m) => m.role === 'Project Manager') },
    { key: 'team_member', label: 'Team Members', members: all.filter((m) => m.role === 'Team Member') },
    { key: 'viewer', label: 'Viewers', members: all.filter((m) => m.role === 'Viewer') },
  ]
})

const selectableUsers = computed(() => {
  if (editingMode.value === 'edit') return availableUsers.value
  const used = new Set(teamRows.value.filter((r) => r.user).map((r) => r.user))
  return availableUsers.value.filter((u) => !used.has(u.name))
})

const profileCard = computed(() => memberOverview.value?.user || userMap.value[editForm.value.user] || {})
const memberProjects = computed(() => memberOverview.value?.projects || [])
const allProjectsOptions = computed(() => memberOverview.value?.all_projects || [])
const profileRoleLabel = computed(() => memberOverview.value?.member_profile?.role || editForm.value.role || 'Team Member')
const profileActive = computed(() => Number(memberOverview.value?.member_profile?.enabled ?? (editForm.value.active ? 1 : 0)) === 1)
const fiscalLabel = computed(() => {
  const start = memberOverview.value?.activity_start_date
  const end = memberOverview.value?.activity_end_date
  if (!start || !end) return 'Apr - Mar'
  const s = new Date(start)
  const e = new Date(end)
  return `${s.toLocaleString('en-US', { month: 'short' })} ${s.getFullYear()} - ${e.toLocaleString('en-US', { month: 'short' })} ${e.getFullYear()}`
})

function formatLocalDate(dateObj) {
  const y = dateObj.getFullYear()
  const m = String(dateObj.getMonth() + 1).padStart(2, '0')
  const d = String(dateObj.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

const heatmapModel = computed(() => {
  const map = memberOverview.value?.activity || {}
  const startRaw = memberOverview.value?.activity_start_date
  const endRaw = memberOverview.value?.activity_end_date
  if (!startRaw || !endRaw) return { weeks: [], monthLabels: [] }

  const start = new Date(startRaw)
  const end = new Date(endRaw)
  start.setHours(0, 0, 0, 0)
  end.setHours(0, 0, 0, 0)

  const paddedStart = new Date(start)
  paddedStart.setDate(start.getDate() - start.getDay())

  const paddedEnd = new Date(end)
  paddedEnd.setDate(end.getDate() + (6 - end.getDay()))

  const days = []
  const cursor = new Date(paddedStart)
  while (cursor <= paddedEnd) {
    const date = formatLocalDate(cursor)
    days.push({ date, count: Number(map[date] || 0), month: cursor.getMonth(), inRange: cursor >= start && cursor <= end })
    cursor.setDate(cursor.getDate() + 1)
  }

  const weeks = []
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7))
  }

  const monthLabels = []
  const monthCursor = new Date(start.getFullYear(), start.getMonth(), 1)
  while (monthCursor <= end) {
    const diffDays = Math.floor((monthCursor - paddedStart) / (1000 * 60 * 60 * 24))
    const column = Math.floor(diffDays / 7)
    monthLabels.push({
      month: monthCursor.toLocaleString('en-US', { month: 'short' }),
      column,
    })
    monthCursor.setMonth(monthCursor.getMonth() + 1)
  }

  return { weeks, monthLabels }
})

const heatmapWeeks = computed(() => heatmapModel.value.weeks)
const monthLabels = computed(() => heatmapModel.value.monthLabels)
const monthLabelByColumn = computed(() => {
  const out = {}
  for (const item of monthLabels.value) {
    out[item.column] = item.month
  }
  return out
})

function heatLevelClass(count) {
  if (count >= 6) return 'bg-emerald-700'
  if (count >= 4) return 'bg-emerald-600'
  if (count >= 2) return 'bg-emerald-500'
  if (count >= 1) return 'bg-emerald-300'
  return 'bg-slate-800'
}

function projectProgress(project) {
  const total = Number(project?.total_tasks || 0)
  const pending = Number(project?.pending_tasks || 0)
  if (!total) return 0
  return Math.round(((total - pending) / total) * 100)
}

function initials(value) {
  const text = (value || '').trim()
  if (!text) return '?'
  const parts = text.split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
}

function toggleSection(key) {
  collapsed.value[key] = !collapsed.value[key]
}

function openAddNew() {
  editingMode.value = 'add'
  editForm.value = { user: '', role: 'Team Member', active: true, project_names: [] }
  memberOverview.value = null
  profileOpen.value = false
  editPanelOpen.value = true
  error.value = ''
  success.value = ''
}

async function openProfile(member) {
  editingMode.value = 'edit'
  editForm.value = { user: member.user, role: member.role || 'Team Member', active: !!member.enabled, project_names: [] }
  profileOpen.value = true
  editPanelOpen.value = false
  error.value = ''
  success.value = ''
  await loadMemberOverview(member.user)
}

function closeProfile() {
  profileOpen.value = false
}

function openEditPanel() {
  if (!editForm.value.user) return
  editPanelOpen.value = true
}

function closeEditPanel() {
  editPanelOpen.value = false
}

watch(
  () => editForm.value.user,
  async (newUser) => {
    if (!newUser) return
    if (editingMode.value === 'add' || editPanelOpen.value) {
      await loadMemberOverview(newUser)
    }
  },
)

async function loadMemberOverview(user) {
  memberOverviewLoading.value = true
  try {
    const response = await frappeRequest({
      url: 'taskflow.taskflow.api.taskflow.get_user_member_overview',
      params: { user },
    })
    memberOverview.value = response || null
    editForm.value.role = response?.member_profile?.role || editForm.value.role || 'Team Member'
    editForm.value.active = Number(response?.member_profile?.enabled || 0) === 1
    editForm.value.project_names = (response?.projects || []).map((p) => p.name)
  } catch (e) {
    memberOverview.value = null
  } finally {
    memberOverviewLoading.value = false
  }
}

async function persistTeamRows(teamDetails) {
  await frappeRequest({
    url: 'taskflow.taskflow.api.taskflow.save_team_configuration',
    params: { team_details: teamDetails },
  })
}

async function saveProfileEdits() {
  error.value = ''
  success.value = ''
  if (!editForm.value.user) {
    error.value = 'Please select a user.'
    return
  }

  saving.value = true
  try {
    await frappeRequest({
      url: 'taskflow.taskflow.api.taskflow.save_user_member_profile',
      params: {
        user: editForm.value.user,
        role: editForm.value.role,
        active: editForm.value.active ? 1 : 0,
        project_names: editForm.value.project_names,
      },
    })

    await loadConfig()
    await managerOverview.fetch()
    await loadMemberOverview(editForm.value.user)
    success.value = editingMode.value === 'add' ? 'Member added.' : 'Profile updated.'
    editPanelOpen.value = false
    if (editingMode.value === 'add') profileOpen.value = true
  } catch (e) {
    error.value = e?.messages?.[0] || e?.message || 'Unable to save profile.'
  } finally {
    saving.value = false
  }
}

async function deleteMember() {
  if (editingMode.value !== 'edit') return
  saving.value = true
  error.value = ''
  success.value = ''
  try {
    const remaining = teamRows.value.filter((r) => r.user !== editForm.value.user).map((r) => ({
      user: r.user,
      role: r.role,
      enabled: !!r.enabled,
    }))
    await persistTeamRows(remaining)
    await loadConfig()
    await managerOverview.fetch()
    success.value = 'Member removed.'
    editPanelOpen.value = false
    profileOpen.value = false
  } catch (e) {
    error.value = e?.messages?.[0] || e?.message || 'Unable to delete member.'
  } finally {
    saving.value = false
  }
}

async function loadConfig() {
  loading.value = true
  loadError.value = ''
  try {
    const response = await frappeRequest({
      url: 'taskflow.taskflow.api.taskflow.get_team_configuration',
      params: {},
    })

    availableUsers.value = response?.available_users || []
    availableRoles.value = response?.available_roles || ['Project Manager', 'Team Member', 'Viewer']
    teamRows.value = (response?.team_details || []).map((row) => ({
      user: row.user,
      role: row.role || 'Team Member',
      enabled: !!row.enabled,
      user_name: row.user_name || '',
    }))
  } catch (e) {
    loadError.value = e?.messages?.[0] || e?.message || 'Unable to load team configuration.'
  } finally {
    loading.value = false
  }
}

onMounted(loadConfig)
</script>
