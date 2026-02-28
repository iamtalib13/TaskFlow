<template>
  <div class="h-screen w-full overflow-hidden bg-[#eef0f3]" :class="{ 'theme-dark': isDark }">
    <div class="flex h-full w-full border border-[#d9d9db] bg-[#f8f8f9]">
      <aside class="hidden w-[280px] shrink-0 border-r border-[#e3e3e5] bg-[#f2f2f4] px-4 py-5 lg:flex lg:flex-col">
        <div class="mb-6 flex items-center gap-3 px-2">
          <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-[#ff922e]">
            <MessageSquare class="h-5 w-5 text-white" />
          </div>
          <div class="min-w-0 flex-1">
            <div class="flex items-center justify-between gap-2">
              <p class="truncate text-2xl leading-[1.1] font-semibold tracking-tight text-[#17181b]">Taskflow</p>
              <button
                class="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#d6d8dc] bg-white text-[#495160] hover:bg-[#f0f2f5]"
                :title="isDark ? 'Switch to light mode' : 'Switch to dark mode'"
                @click="toggleTheme"
              >
                <Moon v-if="!isDark" class="h-4 w-4" />
                <Sun v-else class="h-4 w-4" />
              </button>
            </div>
            <p class="text-[14px] leading-[1.2] text-[#6b6f76]">{{ currentUserName }}</p>
          </div>
        </div>

        <button
          class="mb-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#16181d] px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#0f1115]"
          @click="openGlobalNewTask"
        >
          <Plus class="h-4 w-4" />
          New Task
        </button>

        <nav class="space-y-1">
          <router-link
            v-for="item in primaryMenu"
            :key="item.label"
            :to="item.to"
            class="flex items-center gap-3 rounded-xl px-3 py-2.5 text-[17px] font-medium text-[#3f4349] transition"
            :class="[$route.name === item.name ? 'bg-[#e9e9ec] text-[#121316]' : 'hover:bg-[#ededf0]']"
          >
            <component :is="item.icon" class="h-[18px] w-[18px]" />
            <span class="truncate">{{ item.label }}</span>
          </router-link>
        </nav>

        <section class="mt-6 flex min-h-0 flex-1 flex-col border-t border-[#e3e3e5] pt-4">
          <div class="px-2">
            <p class="text-[12px] font-semibold uppercase tracking-wide text-[#5a5f67]">Team Availability</p>
          </div>

          <div class="mt-3 min-h-0 flex-1 overflow-y-auto pr-1">
            <div v-if="teamAvailabilityLoading" class="rounded-lg border border-[#dedee1] bg-[#f9f9fa] px-3 py-2 text-xs text-[#6b6f76]">
              Loading team...
            </div>

            <div v-else-if="teamAvailabilityMembers.length === 0" class="rounded-lg border border-[#dedee1] bg-[#f9f9fa] px-3 py-2 text-xs text-[#6b6f76]">
              No team data available.
            </div>

            <article
              v-for="member in teamAvailabilityMembers"
              :key="member.id"
              class="relative mb-1.5 rounded-lg border border-[#dedee1] bg-[#fafafb] px-2 py-2"
            >
              <div v-if="member.pending_tasks > 0" class="absolute right-2 top-2 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-semibold leading-none text-white">
                {{ member.pending_tasks }}
              </div>

              <div class="flex items-center gap-2 pr-7">
                <img
                  v-if="member.profile_image_url"
                  :src="member.profile_image_url"
                  :alt="member.name"
                  class="h-8 w-8 rounded-full border border-[#e3e3e5] object-cover"
                />
                <div
                  v-else
                  class="flex h-8 w-8 items-center justify-center rounded-full border border-[#e3e3e5] bg-[#dce9f8] text-[10px] font-semibold text-[#2f3a4b]"
                >
                  {{ member.initials }}
                </div>

                <div class="min-w-0 flex-1">
                  <p class="truncate text-[12px] font-semibold text-[#14161a]">{{ member.name }}</p>
                  <div class="mt-0.5 flex items-center gap-1.5">
                    <span class="h-2 w-2 rounded-full" :class="member.status.dotClass"></span>
                    <span class="text-[11px] font-medium" :class="member.status.textClass">{{ member.status.label }}</span>
                  </div>
                </div>
              </div>
            </article>
          </div>
        </section>
      </aside>

      <div class="flex min-w-0 flex-1 flex-col">
        <header class="flex items-center justify-between border-b border-[#e3e3e5] bg-[#f8f8f9] px-5 py-4">
          <div>
            <div class="flex items-center gap-2">
              <p class="text-[24px] font-semibold tracking-tight text-[#181a1f]">{{ headerMeta.title }}</p>
              <span
                v-if="route.name === 'Projects'"
                class="inline-flex h-6 items-center justify-center rounded-full bg-[#16181d] px-2.5 text-xs font-semibold text-white"
                :title="`${projectsCount} total projects`"
              >
                Total Projects: {{ projectsCountDisplay }}
              </span>
            </div>
            <p class="text-sm text-[#70757d]">{{ headerMeta.subtitle }}</p>
          </div>
          <button
            v-if="showRoutePrimaryAction"
            class="inline-flex items-center gap-2 rounded-xl bg-[#16181d] px-4 py-2.5 text-sm font-medium text-white"
            @click="openRoutePrimaryAction"
          >
            <Plus class="h-4 w-4" />
            {{ routePrimaryActionLabel }}
          </button>
        </header>

        <div class="flex min-h-0 flex-1">
          <main class="min-w-0 flex-1 overflow-y-auto bg-[#fbfbfc]">
            <div v-if="['Projects', 'Tasks', 'Team', 'Home'].includes($route.name)" class="border-b border-[#ebebee] px-5 py-3">
              <div class="flex flex-wrap items-center justify-between gap-3">
                <div v-if="$route.name === 'Home'" class="inline-flex rounded-xl bg-[#eeeff2] p-1">
                  <button
                    v-for="tab in dashboardTabs"
                    :key="tab.value"
                    class="rounded-lg px-3 py-1.5 text-[13px] font-medium transition"
                    :class="currentTab === tab.value ? 'bg-white text-[#14161a] shadow-sm' : 'text-[#5a5f67]'"
                    @click="setTab(tab.value)"
                  >
                    {{ tab.label }}
                  </button>
                </div>
                <div v-else class="inline-flex rounded-xl bg-[#eeeff2] p-1">
                  <button
                    class="rounded-lg px-3 py-1.5 text-[13px] font-medium"
                    :class="viewMode === 'kanban' ? 'bg-white text-[#14161a] shadow-sm' : 'text-[#5a5f67]'"
                    @click="setView('kanban')"
                  >
                    Kanban
                  </button>
                  <button
                    class="rounded-lg px-3 py-1.5 text-[13px] font-medium"
                    :class="viewMode === 'list' ? 'bg-white text-[#14161a] shadow-sm' : 'text-[#5a5f67]'"
                    @click="setView('list')"
                  >
                    List
                  </button>
                  <button
                    v-if="$route.name === 'Projects'"
                    class="rounded-lg px-3 py-1.5 text-[13px] font-medium"
                    :class="viewMode === 'gallery' ? 'bg-white text-[#14161a] shadow-sm' : 'text-[#5a5f67]'"
                    @click="setView('gallery')"
                  >
                    Gallery
                  </button>
                </div>
                <div v-if="$route.name === 'Projects'" class="relative flex w-full max-w-xl items-center gap-2">
                  <input
                    v-model.trim="projectSearchValue"
                    type="text"
                    :placeholder="projectFilterBy === 'team_member' ? 'Search team members' : 'Search projects'"
                    class="min-w-0 flex-1 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-800 placeholder:text-gray-400 focus:border-gray-400 focus:outline-none"
                  />
                  <button
                    class="inline-flex h-8 shrink-0 items-center gap-1 rounded-md border border-gray-300 bg-white px-2 text-xs font-medium text-gray-700 hover:bg-gray-50"
                    @click="showProjectFilterDropdown = !showProjectFilterDropdown"
                  >
                    <Filter class="h-3.5 w-3.5" />
                    Filter
                  </button>
                  <button
                    class="inline-flex h-8 shrink-0 items-center rounded-md border border-gray-300 bg-white px-2 text-xs font-medium text-gray-700 hover:bg-gray-50"
                    @click="clearProjectFilters"
                  >
                    Clear Filter
                  </button>

                  <div
                    v-if="showProjectFilterDropdown"
                    class="absolute right-0 top-10 z-30 w-64 rounded-lg border border-gray-200 bg-white p-3 shadow-lg"
                  >
                    <label class="mb-1 block text-[11px] font-medium uppercase tracking-wide text-gray-500">Filter By</label>
                    <select v-model="projectFilterBy" class="mb-3 w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm">
                      <option value="project_name">Project Name</option>
                      <option value="team_member">Team Member</option>
                    </select>

                    <div v-if="projectFilterBy === 'team_member'">
                      <label class="mb-1 block text-[11px] font-medium uppercase tracking-wide text-gray-500">Team Member</label>
                      <select v-model="projectMemberFilter" class="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm">
                        <option value="">All Members</option>
                        <option v-for="member in projectFilterMembers" :key="member.user" :value="member.user">
                          {{ member.label }}
                        </option>
                      </select>
                    </div>

                    <div class="mt-3 flex justify-end">
                      <button
                        class="rounded-md border border-gray-300 px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
                        @click="clearProjectFilters"
                      >
                        Clear Filters
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <slot></slot>
          </main>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Filter, FolderKanban, ClipboardList, LayoutDashboard, MessageSquare, Moon, Plus, Settings, Sun, Users } from 'lucide-vue-next'
import { ensureManagerOverviewLoaded, managerOverview } from '../resources'

const route = useRoute()
const router = useRouter()
const currentUserName = ref('User')
const themeStorageKey = 'taskflow-theme'
const isDark = ref(false)

async function resolveCurrentUserName() {
  if (typeof window === 'undefined') {
    return
  }

  const frappeObj = window.frappe || window.parent?.frappe
  const userEmail = frappeObj?.session?.user
  const fetchedFullName =
    typeof frappeObj?.get_fullname === 'function' && userEmail
      ? frappeObj.get_fullname(userEmail)
      : null

  const immediateName =
    fetchedFullName ||
    frappeObj?.session?.user_fullname ||
    frappeObj?.boot?.user?.full_name

  if (immediateName && immediateName !== 'User') {
    currentUserName.value = immediateName
    return
  }

  if (!userEmail || userEmail === 'Guest' || typeof frappeObj?.call !== 'function') {
    return
  }

  try {
    const userInfoRes = await frappeObj.call({
      method: 'taskflow.taskflow.api.taskflow.get_user_info',
      freeze: false,
    })

    const userInfoName = userInfoRes?.message?.full_name
    if (userInfoName) {
      currentUserName.value = userInfoName
      return
    }
  } catch (e) {
    // continue to next fallback
  }

  try {
    const res = await frappeObj.call({
      method: 'frappe.client.get_value',
      args: {
        doctype: 'User',
        filters: { name: userEmail },
        fieldname: ['full_name'],
      },
      freeze: false,
    })

    const apiFullName = res?.message?.full_name
    if (apiFullName) {
      currentUserName.value = apiFullName
    }
  } catch (e) {
    // keep default fallback when user fetch fails
  }
}
function applyThemeClass(value) {
  if (typeof document === 'undefined') return
  document.documentElement.classList.toggle('theme-dark', value)
  document.body.classList.toggle('theme-dark', value)
}

function toggleTheme() {
  isDark.value = !isDark.value
  applyThemeClass(isDark.value)
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(themeStorageKey, isDark.value ? 'dark' : 'light')
  }
}

onMounted(async () => {
  if (typeof window !== 'undefined') {
    const storedTheme = window.localStorage.getItem(themeStorageKey)
    isDark.value = storedTheme === 'dark'
  }
  applyThemeClass(isDark.value)

  resolveCurrentUserName()
  try {
    await ensureManagerOverviewLoaded()
  } catch (e) {
    // Keep shell usable; route pages handle local fallback states.
  }
})

const primaryMenu = [
  { label: 'Dashboard', icon: LayoutDashboard, to: '/', name: 'Home' },
  { label: 'My Projects', icon: FolderKanban, to: '/projects', name: 'Projects' },
  { label: 'My Tasks', icon: ClipboardList, to: '/tasks', name: 'Tasks' },
  { label: 'My Team', icon: Users, to: '/team', name: 'Team' },
  { label: 'Settings', icon: Settings, to: '/settings', name: 'Settings' },
]

const headerMetaByRoute = {
  Home: { title: 'Dashboard', subtitle: 'Overview, updates, and project conversations' },
  Projects: { title: 'My Projects', subtitle: 'Project planning with Kanban, list, and form workflow' },
  Tasks: { title: 'My Tasks', subtitle: 'Track execution with Kanban, list, and form views' },
  Team: { title: 'My Team', subtitle: 'Manage members in Kanban, list, and form views' },
  Settings: { title: 'Settings', subtitle: 'Workspace configuration and preferences' },
}

const headerMeta = computed(() => headerMetaByRoute[route.name] || headerMetaByRoute.Home)
const showRoutePrimaryAction = computed(() => ['Projects', 'Tasks'].includes(route.name))
const routePrimaryActionLabel = computed(() => {
  if (route.name === 'Projects') return 'Create Project'
  if (route.name === 'Tasks') return 'Add Task'
  return 'Add New'
})
const viewMode = computed(() => {
  if (route.name === 'Projects') {
    return ['kanban', 'list', 'gallery'].includes(route.query.view) ? route.query.view : 'kanban'
  }
  return route.query.view === 'list' ? 'list' : 'kanban'
})
const dashboardTabs = [
  { label: 'Overview', value: 'overview' },
  { label: 'Team', value: 'team' },
  { label: 'Project', value: 'project' },
  { label: 'Task', value: 'task' },
]
const showProjectFilterDropdown = ref(false)
const projectSearchValue = computed({
  get: () => (route.query.project_search || '').toString(),
  set: (value) => {
    const nextQuery = { ...route.query }
    const clean = (value || '').trim()
    if (clean) nextQuery.project_search = clean
    else delete nextQuery.project_search
    router.replace({ path: route.path, query: nextQuery })
  },
})
const projectFilterBy = computed({
  get: () => (route.query.project_filter_by || 'project_name').toString(),
  set: (value) => {
    const nextQuery = { ...route.query, project_filter_by: value || 'project_name' }
    if (value !== 'team_member') {
      delete nextQuery.project_member
    }
    router.replace({ path: route.path, query: nextQuery })
  },
})
const projectMemberFilter = computed({
  get: () => (route.query.project_member || '').toString(),
  set: (value) => {
    const nextQuery = { ...route.query }
    const clean = (value || '').trim()
    if (clean) nextQuery.project_member = clean
    else delete nextQuery.project_member
    router.replace({ path: route.path, query: nextQuery })
  },
})
const currentTab = computed(() => {
  const tab = route.query.tab || 'overview'
  return dashboardTabs.some((item) => item.value === tab) ? tab : 'overview'
})
const projectsCount = computed(() => (managerOverview.data?.projects || []).length)
const projectsCountDisplay = computed(() => (managerOverview.loading && !managerOverview.data ? '...' : projectsCount.value))
const teamAvailabilityLoading = computed(() => managerOverview.loading)
const projectFilterMembers = computed(() => {
  const members = new Map()
  for (const project of managerOverview.data?.projects || []) {
    for (const member of project.team || []) {
      if (!member?.user) continue
      if (!members.has(member.user)) {
        members.set(member.user, {
          user: member.user,
          label: member.full_name ? `${member.full_name} (${member.user})` : member.user,
        })
      }
    }
  }
  return Array.from(members.values()).sort((a, b) => a.label.localeCompare(b.label))
})

const teamAvailabilityMembers = computed(() => {
  const configuredTeam = managerOverview.data?.team_availability || []
  if (configuredTeam.length > 0) {
    return configuredTeam.map((member) => {
      const name = member.full_name || member.user || 'User'
      return {
        id: member.user || name,
        name,
        profile_image_url: member.user_image || '',
        pending_tasks: Number(member.pending_tasks || 0),
        initials: memberInitials(name),
        status: availabilityState(Number(member.pending_tasks || 0)),
      }
    })
  }

  const projects = managerOverview.data?.projects || []
  const memberMap = new Map()

  projects.forEach((project) => {
    const pendingTasks = Number(project.pending_tasks || 0)

    ;(project.team || []).forEach((member) => {
      if (!member?.user) return

      if (!memberMap.has(member.user)) {
        memberMap.set(member.user, {
          id: member.user,
          name: member.full_name || member.user,
          profile_image_url: member.user_image || '',
          pending_tasks: 0,
        })
      }

      const row = memberMap.get(member.user)
      row.pending_tasks += pendingTasks
    })
  })

  return Array.from(memberMap.values()).map((member) => {
    return {
      ...member,
      initials: memberInitials(member.name),
      status: availabilityState(member.pending_tasks),
    }
  })
})

function memberInitials(value) {
  const text = (value || '').trim()
  if (!text) return '?'
  const parts = text.split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
}

function availabilityState(pendingTasks) {
  if (pendingTasks === 0) {
    return { label: 'Available', dotClass: 'bg-emerald-500', textClass: 'text-emerald-700' }
  }
  return { label: 'Not Available', dotClass: 'bg-red-500', textClass: 'text-red-700' }
}

function setView(mode) {
  let next = mode === 'list' ? 'list' : 'kanban'
  if (route.name === 'Projects' && mode === 'gallery') {
    next = 'gallery'
  }
  router.replace({
    path: route.path,
    query: {
      ...route.query,
      view: next,
    },
  })
}

function setTab(tab) {
  router.replace({
    path: route.path,
    query: {
      ...route.query,
      tab,
    },
  })
}

function openGlobalNewTask() {
  const nextQuery = { ...route.query, new_task: '1' }
  if (route.name === 'Tasks') {
    router.replace({ path: '/tasks', query: nextQuery })
    return
  }
  router.push({ path: '/tasks', query: nextQuery })
}

function openRoutePrimaryAction() {
  if (route.name === 'Projects') {
    const nextQuery = { ...route.query, new_project: '1' }
    router.replace({ path: '/projects', query: nextQuery })
    return
  }
  if (route.name === 'Tasks') {
    openGlobalNewTask()
  }
}

function clearProjectFilters() {
  const nextQuery = { ...route.query }
  delete nextQuery.project_search
  delete nextQuery.project_member
  nextQuery.project_filter_by = 'project_name'
  router.replace({ path: route.path, query: nextQuery })
}

watch(
  () => route.name,
  () => {
    showProjectFilterDropdown.value = false
  },
)

</script>
