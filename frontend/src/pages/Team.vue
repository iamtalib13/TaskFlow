<template>
  <div class="mx-auto max-w-7xl px-5 py-6">
    <header class="mb-4 border-b border-[#ececf0] pb-4">
        <div class="flex flex-wrap items-center justify-end gap-3">
          <div class="flex flex-wrap items-center gap-2">
            <label class="relative">
              <Search class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8a9099]" />
              <input
                v-model="searchQuery"
                type="text"
                placeholder="Search"
                class="h-10 w-[250px] rounded-xl border border-[#e5e6ea] bg-[#f3f4f6] pl-10 pr-3 text-sm text-[#30343a] outline-none transition focus:border-[#d4d7de]"
              />
            </label>

            <label class="relative">
              <select
                v-model="sortBy"
                class="h-10 min-w-[150px] appearance-none rounded-xl border border-[#e5e6ea] bg-[#f3f4f6] px-3 pr-8 text-sm text-[#3b4048] outline-none"
              >
                <option value="posts">Posts</option>
                <option value="replies">Replies</option>
                <option value="name">Name</option>
              </select>
              <ChevronDown class="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8a9099]" />
            </label>

            <button class="inline-flex h-10 items-center gap-2 rounded-xl bg-[#15181d] px-4 text-sm font-medium text-white" @click="openAddNew">
              <UserPlus class="h-4 w-4" />
              Invite
            </button>
          </div>
        </div>
      </header>

      <div v-if="loading" class="rounded-xl border border-[#e4e6ea] bg-white p-4 text-sm text-[#666b74]">Loading team configuration...</div>
      <div v-else-if="loadError" class="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{{ loadError }}</div>

      <template v-else>
        <section v-if="activeTab === 'kanban'">
          <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <article
              v-for="member in filteredMembers"
              :key="member.user"
              class="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm"
            >
              <div class="mb-3 flex items-center gap-3">
                <img
                  v-if="member.user_image"
                  :src="member.user_image"
                  :alt="member.full_name || member.user"
                  class="h-14 w-14 rounded-full border border-gray-200 object-cover"
                />
                <div
                  v-else
                  class="flex h-14 w-14 items-center justify-center rounded-full border border-gray-200 bg-[#dce9f8] text-sm font-semibold text-[#2f3a4b]"
                >
                  {{ initials(member.full_name || member.user) }}
                </div>
                <div class="min-w-0">
                  <p class="truncate text-base font-semibold text-gray-900">{{ member.full_name || member.user }}</p>
                  <p class="truncate text-xs text-gray-500">{{ member.role }}</p>
                </div>
              </div>

              <p class="truncate text-sm text-gray-600">{{ memberTagline(member) }}</p>

              <div class="mt-3 grid grid-cols-2 gap-2 text-xs">
                <div class="rounded-lg border border-gray-200 bg-gray-50 px-2 py-2">
                  <p class="text-gray-500">Posts</p>
                  <p class="font-semibold text-gray-900">{{ memberMetric(member).posts }}</p>
                </div>
                <div class="rounded-lg border border-gray-200 bg-gray-50 px-2 py-2">
                  <p class="text-gray-500">Replies</p>
                  <p class="font-semibold text-gray-900">{{ memberMetric(member).replies }}</p>
                </div>
              </div>

              <div class="mt-3 flex items-center justify-between">
                <button class="rounded-md border border-gray-300 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50" @click="selectMember(member)">
                  View
                </button>
                <button class="rounded-md border border-gray-300 p-1.5 text-gray-600 hover:bg-gray-50" @click="openMemberEdit(member)">
                  <Pencil class="h-3.5 w-3.5" />
                </button>
              </div>
            </article>
          </div>
        </section>

        <section v-else-if="activeTab === 'list'" class="grid gap-4 lg:grid-cols-12">
          <div class="lg:col-span-7">
            <div class="overflow-hidden rounded-2xl border border-[#e3e4e8] bg-white">
              <div
                v-for="member in filteredMembers"
                :key="member.user"
                class="cursor-pointer border-b border-[#f0f0f3] px-4 py-3 transition last:border-b-0 hover:bg-[#fafbfd]"
                :class="member.user === selectedUser ? 'bg-[#f6f8fc]' : ''"
                @click="selectMember(member)"
              >
                <div class="flex items-center gap-3">
                  <img
                    v-if="member.user_image"
                    :src="member.user_image"
                    :alt="member.full_name || member.user"
                    class="h-12 w-12 rounded-full border border-[#dde0e6] object-cover"
                  />
                  <div v-else class="flex h-12 w-12 items-center justify-center rounded-full border border-[#dde0e6] bg-[#dce9f8] text-xs font-semibold text-[#2f3a4b]">
                    {{ initials(member.full_name || member.user) }}
                  </div>

                  <div class="min-w-0 flex-1">
                    <p class="truncate text-lg font-semibold text-[#1e2229]">{{ member.full_name || member.user }}</p>
                    <p class="truncate text-sm text-[#6b7079]">{{ memberTagline(member) }}</p>
                  </div>

                  <button class="rounded-lg border border-[#d8dce3] p-2 text-[#5e6672] hover:bg-[#eff2f7]" @click.stop="openMemberEdit(member)">
                    <Pencil class="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          <aside class="lg:col-span-5">
            <div class="sticky top-5 overflow-hidden rounded-2xl border border-[#dfe2e8] bg-white">
              <div class="h-28 bg-[radial-gradient(circle_at_30%_20%,#5b6a85_0%,#1f2430_45%,#0f1219_100%)]"></div>

              <div class="px-5 pb-5">
                <div class="-mt-11 mb-3 flex items-end justify-between gap-2">
                  <img
                    v-if="profileCard.user_image"
                    :src="profileCard.user_image"
                    :alt="profileCard.full_name || profileCard.user"
                    class="h-[88px] w-[88px] rounded-full border-4 border-white bg-white object-cover"
                  />
                  <div v-else class="flex h-[88px] w-[88px] items-center justify-center rounded-full border-4 border-white bg-[#ffb3b3] text-xl font-semibold text-[#2e3138]">
                    {{ initials(profileCard.full_name || profileCard.user || 'U') }}
                  </div>

                  <button class="rounded-lg border border-[#d9dde5] px-3 py-1.5 text-xs font-medium text-[#48505b] hover:bg-[#f1f4f8]" @click="openEditPanel">
                    Edit Profile
                  </button>
                </div>

                <h2 class="text-2xl font-semibold text-[#1d2128]">{{ profileCard.full_name || profileCard.user || 'Select member' }}</h2>
                <p class="text-sm text-[#666d78]">{{ profileRoleLabel }}</p>
                
                <div v-if="memberOverview" class="mt-6 space-y-4">
                  <div class="grid grid-cols-2 gap-4">
                    <div class="rounded-xl border border-gray-100 bg-gray-50 p-3 text-center">
                      <p class="text-xs text-gray-500 uppercase">Pending Tasks</p>
                      <p class="text-xl font-bold text-gray-900">{{ memberOverview.projects.reduce((sum, p) => sum + p.pending_tasks, 0) }}</p>
                    </div>
                    <div class="rounded-xl border border-gray-100 bg-gray-50 p-3 text-center">
                      <p class="text-xs text-gray-500 uppercase">Total Tasks</p>
                      <p class="text-xl font-bold text-gray-900">{{ memberOverview.projects.reduce((sum, p) => sum + p.total_tasks, 0) }}</p>
                    </div>
                  </div>

                  <div>
                    <p class="mb-2 text-sm font-medium text-gray-900">Allocated Projects</p>
                    <div class="space-y-2">
                      <div v-for="p in memberOverview.projects" :key="p.name" class="flex items-center justify-between rounded-lg border border-gray-100 p-3">
                        <span class="text-sm text-gray-700">{{ p.project_name }}</span>
                        <span class="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded">{{ p.pending_tasks }} pending</span>
                      </div>
                      <div v-if="memberOverview.projects.length === 0" class="text-sm text-gray-500 italic p-2">No projects allocated.</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </aside>
        </section>

        <section v-else class="rounded-xl border border-gray-200 bg-white p-5">
          <div class="mb-4 flex items-center justify-between gap-3">
            <h3 class="text-lg font-semibold text-gray-900">Team Member Form</h3>
            <div class="flex items-center gap-2">
              <select v-model="editForm.user" class="min-w-[260px] rounded-md border border-gray-300 px-3 py-2 text-sm" :disabled="editingMode === 'edit'" @change="loadMemberOverview(editForm.user)">
                <option value="">Select user</option>
                <option v-for="u in selectableUsers" :key="u.name" :value="u.name">{{ u.full_name || u.name }} ({{ u.name }})</option>
              </select>
              <button class="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-700" @click="openAddNew">New</button>
            </div>
          </div>

          <div class="grid gap-3 md:grid-cols-2">
            <div>
              <label class="mb-1 block text-xs font-medium uppercase tracking-wide text-gray-500">Role</label>
              <select v-model="editForm.role" class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm">
                <option v-for="role in availableRoles" :key="role" :value="role">{{ role }}</option>
              </select>
            </div>
            <div>
              <label class="mb-1 block text-xs font-medium uppercase tracking-wide text-gray-500">Status</label>
              <label class="flex items-center gap-2 rounded-md border border-gray-300 px-3 py-2 text-sm">
                <input v-model="editForm.active" type="checkbox" class="h-4 w-4" />
                Active
              </label>
            </div>
            <div class="md:col-span-2">
              <label class="mb-1 block text-xs font-medium uppercase tracking-wide text-gray-500">Assign Projects</label>
              <div class="max-h-52 space-y-2 overflow-auto rounded-md border border-gray-300 p-2">
                <label v-for="p in allProjectsOptions" :key="p.name" class="flex items-center justify-between rounded border border-gray-200 px-2 py-1.5 text-sm">
                  <span>{{ p.project_name || p.name }}</span>
                  <input v-model="editForm.project_names" :value="p.name" type="checkbox" class="h-4 w-4" />
                </label>
              </div>
            </div>
          </div>

          <p v-if="error" class="mt-3 text-sm text-red-600">{{ error }}</p>
          <p v-if="success" class="mt-3 text-sm text-emerald-700">{{ success }}</p>

          <div class="mt-5 flex items-center justify-between">
            <button
              v-if="editingMode === 'edit'"
              class="rounded-md border border-red-200 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50"
              :disabled="saving"
              @click="deleteMember"
            >
              Delete User
            </button>
            <span v-else></span>

            <button class="rounded-md bg-gray-900 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-60" :disabled="saving" @click="saveProfileEdits">
              {{ saving ? 'Saving...' : editingMode === 'add' ? 'Add Member' : 'Save Changes' }}
            </button>
          </div>
        </section>
      </template>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { frappeRequest } from 'frappe-ui'
import { useRoute, useRouter } from 'vue-router'
import { ChevronDown, Pencil, Search, UserPlus } from 'lucide-vue-next'
import { ensureManagerOverviewLoaded, managerOverview } from '../resources'

const activeTab = ref('kanban')
const loading = ref(true)
const saving = ref(false)
const loadError = ref('')
const error = ref('')
const success = ref('')

const teamRows = ref([])
const availableUsers = ref([])
const availableRoles = ref(['Project Manager', 'Team Member', 'Viewer'])

const selectedUser = ref('')
const searchQuery = ref('')
const sortBy = ref('posts')

const editingMode = ref('edit')
const memberOverview = ref(null)
const route = useRoute()
const router = useRouter()

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

const selectedMember = computed(() => normalizedMembers.value.find((m) => m.user === selectedUser.value) || null)
const managerProjects = computed(() => managerOverview.data?.projects || [])

const memberProjects = computed(() => {
  if (memberOverview.value?.projects) return memberOverview.value.projects
  const user = selectedUser.value
  if (!user) return []
  return managerProjects.value.filter((project) => (project.team || []).some((member) => member.user === user))
})

const allProjectsOptions = computed(() => memberOverview.value?.all_projects || managerProjects.value || [])
const profileCard = computed(() => memberOverview.value?.user || userMap.value[selectedUser.value] || selectedMember.value || {})
const profileRoleLabel = computed(() => memberOverview.value?.member_profile?.role || selectedMember.value?.role || 'Team Member')

const profileAbout = computed(() => {
  const name = profileCard.value?.full_name || profileCard.value?.user || 'This member'
  return `${name} focuses on team collaboration, project delivery, and consistent execution across the workspace.`
})

const selectableUsers = computed(() => {
  if (editingMode.value === 'edit') return availableUsers.value
  const used = new Set(teamRows.value.filter((r) => r.user).map((r) => r.user))
  return availableUsers.value.filter((u) => !used.has(u.name))
})

const filteredMembers = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  let rows = normalizedMembers.value.filter((member) => {
    if (!q) return true
    const haystack = `${member.full_name || ''} ${member.user || ''} ${member.role || ''}`.toLowerCase()
    return haystack.includes(q)
  })

  rows = rows.sort((a, b) => {
    if (sortBy.value === 'name') return (a.full_name || a.user).localeCompare(b.full_name || b.user)
    const am = memberMetric(a)
    const bm = memberMetric(b)
    if (sortBy.value === 'replies') return bm.replies - am.replies
    return bm.posts - am.posts
  })

  return rows
})

function initials(value) {
  const text = (value || '').trim()
  if (!text) return '?'
  const parts = text.split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
}

function memberProjectsFor(user) {
  return managerProjects.value.filter((project) => (project.team || []).some((member) => member.user === user))
}

function memberMetric(member) {
  const projects = memberProjectsFor(member.user)
  return {
    posts: projects.reduce((sum, p) => sum + Number(p.total_tasks || 0), 0),
    replies: projects.reduce((sum, p) => sum + Number(p.pending_tasks || 0), 0),
  }
}

function memberTagline(member) {
  return `${member.role} in ${memberProjectsFor(member.user).length} projects`
}

function selectMember(member) {
  selectedUser.value = member.user
  loadMemberOverview(member.user)
}

function openAddNew() {
  activeTab.value = 'form'
  editingMode.value = 'add'
  editForm.value = { user: '', role: 'Team Member', active: true, project_names: [] }
  error.value = ''
  success.value = ''
}

function setActiveTab(tab) {
  const next = tab === 'list' ? 'list' : 'kanban'
  activeTab.value = next
  router.replace({
    path: route.path,
    query: { ...route.query, view: next },
  })
}

function openMemberEdit(member) {
  activeTab.value = 'form'
  selectedUser.value = member.user
  editingMode.value = 'edit'
  editForm.value = {
    user: member.user,
    role: member.role || 'Team Member',
    active: !!member.enabled,
    project_names: memberProjectsFor(member.user).map((p) => p.name),
  }
  loadMemberOverview(member.user)
}

function openEditPanel() {
  if (!selectedUser.value) return
  activeTab.value = 'form'
  const member = selectedMember.value
  editingMode.value = 'edit'
  editForm.value = {
    user: selectedUser.value,
    role: member?.role || 'Team Member',
    active: !!member?.enabled,
    project_names: memberProjects.value.map((p) => p.name),
  }
}

async function loadMemberOverview(user) {
  if (!user) {
    memberOverview.value = null
    return
  }

  try {
    const response = await frappeRequest({
      url: 'taskflow.taskflow.api.taskflow.get_user_member_overview',
      params: { user },
    })
    memberOverview.value = response || null
  } catch {
    memberOverview.value = null
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
    await ensureManagerOverviewLoaded({ force: true })
    selectedUser.value = editForm.value.user
    await loadMemberOverview(editForm.value.user)
    success.value = editingMode.value === 'add' ? 'Member added.' : 'Profile updated.'
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
    const removingUser = editForm.value.user
    const remaining = teamRows.value.filter((r) => r.user !== removingUser).map((r) => ({
      user: r.user,
      role: r.role,
      enabled: !!r.enabled,
    }))
    await persistTeamRows(remaining)
    await loadConfig()
    await ensureManagerOverviewLoaded({ force: true })

    if (selectedUser.value === removingUser) {
      const fallback = normalizedMembers.value[0]
      selectedUser.value = fallback?.user || ''
      await loadMemberOverview(selectedUser.value)
    }

    success.value = 'Member removed.'
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

    if (!managerOverview.data) {
      await ensureManagerOverviewLoaded()
    }

    if (!selectedUser.value && normalizedMembers.value.length > 0) {
      selectedUser.value = normalizedMembers.value[0].user
    }

    await loadMemberOverview(selectedUser.value)
  } catch (e) {
    loadError.value = e?.messages?.[0] || e?.message || 'Unable to load team configuration.'
  } finally {
    loading.value = false
  }
}

onMounted(loadConfig)

watch(
  () => route.query.view,
  (view) => {
    activeTab.value = view === 'list' ? 'list' : 'kanban'
  },
  { immediate: true },
)
</script>
