<script setup>
import { computed, ref, onMounted } from 'vue'
import {
  Avatar,
  Badge,
  Button,
  DesktopShell,
  Dropdown,
  PageHeader,
  PageHeaderTitle,
  ScrollArea,
  Select,
  SettingsBody,
  SettingsContent,
  SettingsDialog,
  SettingsHeader,
  SettingsNavGroup,
  SettingsNavItem,
  SettingsPanel,
  SettingsRow,
  SettingsSidebar,
  Sidebar,
  SidebarHeader,
  SidebarItem,
  SidebarLabel,
  Switch,
  TabButtons,
  Textarea,
  TextInput,
  Tooltip,
} from 'frappe-ui'
import {
  List,
  ListCell,
  ListRow,
} from 'frappe-ui/list'

import CommonListView from '@/components/CommonListView.vue'
import TaskDetailModal from '@/components/TaskDetailModal.vue'
import TaskCreateModal from '@/components/TaskCreateModal.vue'
import { fetchBootstrap, saveTask } from '@/data/api.js'

// --- State & Data ---
const loading = ref(false)
const tasks = ref([])
const projects = ref([])
const people = ref([])
const statuses = ref(['Open', 'In Progress', 'Review', 'On Hold', 'Completed', 'Cancelled', 'Overdue'])
const priorities = ref(['Critical', 'High', 'Medium', 'Low'])

// Active Navigation: ONLY Task, Timesheet, Project, Team
const activeSection = ref('Task')
const isSidebarCollapsed = ref(false)

const navItems = computed(() => [
  { id: 'Task', label: 'Task', icon: 'lucide-check-square', badge: visibleTasks.value.length },
  { id: 'Timesheet', label: 'Timesheet', icon: 'lucide-clock', badge: timesheetData.value.length },
  { id: 'Project', label: 'Project', icon: 'lucide-folder-kanban', badge: projectsData.value.length },
  { id: 'Team', label: 'Team', icon: 'lucide-users', badge: teamData.value.length },
])

// User Menu
const showSettings = ref(false)
const userMenu = [
  { label: 'My profile', icon: 'lucide-user' },
  {
    label: 'Settings',
    icon: 'lucide-settings',
    onClick: () => (showSettings.value = true),
  },
  { label: 'Log out', icon: 'lucide-log-out' },
]

// View Switching: 'feed' or 'table'
const currentView = ref('table')
const feedTab = ref('All')

// Modals
const detailModalOpen = ref(false)
const activeTask = ref(null)
const createModalOpen = ref(false)

// User Profile Settings State
const settingsTab = ref('profile')
const firstName = ref('Talib')
const lastName = ref('Sheikh')
const bio = ref('Product & Engineering. Building high-performance task management.')
const fullName = computed(() => `${firstName.value} ${lastName.value}`.trim())
const userImage = 'https://avatars.githubusercontent.com/u/499550?v=4'

// Preferences
const theme = ref('system')
const cursorStyle = ref('pointer')
const badgeStyle = ref('Unread count')
const spaceSort = ref('Recent activity')
const hideInactiveSpaces = ref(false)

// Notifications
const emailDigestEnabled = ref(true)
const digestFrequency = ref('Weekly')
const digestDay = ref('Monday')

const spaceActions = [
  { label: 'Copy link', icon: 'lucide-link' },
  { label: 'Mark all as read', icon: 'lucide-check' },
  { label: 'Manage access', icon: 'lucide-users' },
  { label: 'Archive', icon: 'lucide-archive' },
]

// Members list in Settings & Avatar lookup
const members = [
  {
    name: 'Talib Sheikh',
    email: 'talib@example.com',
    role: 'Admin',
    image: 'https://avatars.githubusercontent.com/u/499550?v=4',
  },
  {
    name: 'Sarah Chen',
    email: 'sarah.chen@example.com',
    role: 'Tech Lead',
    image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
  },
  {
    name: 'Marcus Brody',
    email: 'marcus.brody@example.com',
    role: 'Engineer',
    image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
  },
  {
    name: 'Elena Rostova',
    email: 'elena.rostova@example.com',
    role: 'Product Designer',
    image: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
  },
  {
    name: 'Devon Vance',
    email: 'devon.vance@example.com',
    role: 'DevOps Lead',
    image: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
  },
]

const getAssignee = (name) => {
  if (!name) return { name: 'Unassigned', image: '' }
  const found = members.find(
    (m) => m.name.toLowerCase() === name.toLowerCase() || m.email.toLowerCase() === name.toLowerCase()
  )
  if (found) return found
  return {
    name,
    image: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=e2e8f0&color=334155&size=128`,
  }
}

// Table View Columns (clean list view: ID, TASK, PROJECT, STATUS, PRIORITY, ASSIGNED TO, DUE DATE, MODIFIED)
const tableColumns = [
  { key: 'id', label: 'ID', width: '110px', minWidth: '95px', sortable: true, visible: true },
  { key: 'title', label: 'TASK', width: '150px', minWidth: '120px', sortable: true, visible: true },
  { key: 'project', label: 'PROJECT', width: '140px', minWidth: '120px', sortable: true, visible: true },
  { key: 'status', label: 'STATUS', width: '120px', minWidth: '100px', sortable: true, visible: true },
  { key: 'priority', label: 'PRIORITY', width: '100px', minWidth: '90px', sortable: true, visible: true },
  { key: 'assigned_to', label: 'ASSIGNED TO', width: '160px', minWidth: '140px', sortable: true, visible: true },
  { key: 'due_date', label: 'DUE DATE', width: '110px', minWidth: '100px', sortable: true, visible: true },
  { key: 'modified', label: 'MODIFIED', width: '120px', minWidth: '100px', sortable: true, visible: true },
]

const selectedRowKeys = ref([])
const tablePage = ref(1)
const tablePageSize = ref(20)
const sortKey = ref('modified')
const sortOrder = ref('desc')

function handleSortChange({ key, order }) {
  sortKey.value = key
  sortOrder.value = order
}

function formatPrettyDate(row) {
  if (row?.modified_pretty) return row.modified_pretty
  if (!row?.modified) return '—'

  try {
    const raw = String(row.modified).trim()
    const isoString = raw.includes('T') ? raw : raw.replace(' ', 'T')
    const d = new Date(isoString)
    if (isNaN(d.getTime())) return row.modified

    const now = new Date()
    const diffSec = Math.floor((now.getTime() - d.getTime()) / 1000)

    if (diffSec < 0 || diffSec < 60) return 'Just now'
    const diffMin = Math.floor(diffSec / 60)
    if (diffMin < 60) return `${diffMin}m ago`
    const diffHours = Math.floor(diffMin / 60)
    if (diffHours < 24) return `${diffHours}h ago`
    const diffDays = Math.floor(diffHours / 24)
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return `${diffDays}d ago`

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    const day = d.getDate()
    const month = months[d.getMonth()]
    if (d.getFullYear() === now.getFullYear()) {
      return `${day} ${month}`
    }
    return `${day} ${month} ${d.getFullYear()}`
  } catch {
    return row.modified || '—'
  }
}

// Status theme mapping for badges
const getStatusTheme = (status) => {
  switch (status) {
    case 'Completed':
      return 'green'
    case 'In Progress':
      return 'blue'
    case 'Review':
      return 'purple'
    case 'On Hold':
      return 'amber'
    case 'Overdue':
      return 'red'
    case 'Cancelled':
      return 'gray'
    case 'Open':
    default:
      return 'gray'
  }
}

// Filtered tasks based on feed tab and sort
const visibleTasks = computed(() => {
  let list = [...tasks.value]

  if (feedTab.value && feedTab.value !== 'All') {
    list = list.filter((t) => t.status === feedTab.value)
  }

  if (sortKey.value) {
    list.sort((a, b) => {
      let valA = a[sortKey.value] ?? ''
      let valB = b[sortKey.value] ?? ''
      if (typeof valA === 'string') valA = valA.toLowerCase()
      if (typeof valB === 'string') valB = valB.toLowerCase()
      if (valA < valB) return sortOrder.value === 'asc' ? -1 : 1
      if (valA > valB) return sortOrder.value === 'asc' ? 1 : -1
      return 0
    })
  }

  return list
})

const paginationInfo = computed(() => ({
  page: tablePage.value,
  pageSize: tablePageSize.value,
  total: visibleTasks.value.length,
}))

const paginatedTableTasks = computed(() => {
  const start = (tablePage.value - 1) * tablePageSize.value
  return visibleTasks.value.slice(start, start + tablePageSize.value)
})

// --- 2. Project List View State & Columns ---
const selectedProjectKeys = ref([])
const projectColumns = [
  { key: 'name', label: 'PROJECT', width: '220px', minWidth: '180px', sortable: true, visible: true },
  { key: 'status', label: 'STATUS', width: '120px', minWidth: '100px', sortable: true, visible: true },
  { key: 'lead', label: 'PROJECT LEAD', width: '180px', minWidth: '150px', sortable: true, visible: true },
  { key: 'open_tasks', label: 'OPEN TASKS', width: '120px', minWidth: '100px', align: 'right', sortable: true, visible: true },
  { key: 'completed_tasks', label: 'COMPLETED', width: '120px', minWidth: '100px', align: 'right', sortable: true, visible: true },
  { key: 'progress', label: 'PROGRESS', width: '150px', minWidth: '130px', sortable: true, visible: true },
  { key: 'logged_hours', label: 'LOGGED HRS', width: '120px', minWidth: '100px', align: 'right', sortable: true, visible: true },
  { key: 'due_date', label: 'TARGET DATE', width: '130px', minWidth: '110px', sortable: true, visible: true },
]

const projectsData = computed(() => {
  const list = projects.value.length > 0
    ? projects.value.map((p) => p.name)
    : ['drishti Core', 'ERPNext Impl', 'CRM Revamp', 'Core Platform 2.0', 'Mobile App']

  return list.map((pName, idx) => {
    const pTasks = tasks.value.filter((t) => t.project === pName)
    const completedTasks = pTasks.filter((t) => t.status === 'Completed').length
    const totalHours = pTasks.reduce((acc, t) => acc + (Number(t.logged_hours) || 0), 0)
    const estHours = pTasks.reduce((acc, t) => acc + (Number(t.estimated_hours) || 0), 0)
    const lead = members[idx % members.length]?.name || 'Talib Sheikh'
    const pct = pTasks.length > 0 ? Math.round((completedTasks / pTasks.length) * 100) : (idx === 1 ? 80 : 50)

    return {
      id: `PRJ-00${idx + 1}`,
      name: pName,
      status: completedTasks === pTasks.length && pTasks.length > 0 ? 'Completed' : 'Active',
      total_tasks: pTasks.length,
      open_tasks: pTasks.filter((t) => t.status !== 'Completed').length,
      completed_tasks: completedTasks,
      logged_hours: totalHours || (idx + 2) * 14,
      estimated_hours: estHours || (idx + 3) * 18,
      lead,
      progress: pct,
      due_date: `2026-10-${String(10 + idx * 3).padStart(2, '0')}`,
    }
  })
})

// --- 3. Team List View State & Columns ---
const selectedTeamKeys = ref([])
const teamColumns = [
  { key: 'member', label: 'MEMBER', width: '220px', minWidth: '180px', sortable: true, visible: true },
  { key: 'email', label: 'EMAIL', width: '220px', minWidth: '180px', sortable: true, visible: true },
  { key: 'role', label: 'ROLE', width: '160px', minWidth: '140px', sortable: true, visible: true },
  { key: 'department', label: 'DEPARTMENT', width: '160px', minWidth: '140px', sortable: true, visible: true },
  { key: 'active_tasks', label: 'ACTIVE TASKS', width: '120px', minWidth: '100px', align: 'right', sortable: true, visible: true },
  { key: 'logged_hours', label: 'HOURS LOGGED', width: '120px', minWidth: '100px', align: 'right', sortable: true, visible: true },
  { key: 'status', label: 'STATUS', width: '110px', minWidth: '90px', sortable: true, visible: true },
]

const teamData = computed(() => {
  return members.map((m, idx) => {
    const mTasks = tasks.value.filter((t) => t.assigned_to === m.name)
    const activeTasks = mTasks.filter((t) => t.status !== 'Completed').length
    const loggedHours = mTasks.reduce((acc, t) => acc + (Number(t.logged_hours) || 0), 0)

    return {
      id: `USR-${idx + 1}`,
      name: m.name,
      email: m.email,
      role: m.role,
      image: m.image,
      department: idx === 1 ? 'Engineering' : idx === 3 ? 'Design' : idx === 4 ? 'DevOps' : 'Product & Mgmt',
      active_tasks: activeTasks || (idx + 1),
      total_tasks: mTasks.length || (idx + 3),
      logged_hours: loggedHours || (idx + 1) * 12,
      status: 'Active',
    }
  })
})

// --- 4. Timesheet List View State & Columns ---
const selectedTimesheetKeys = ref([])
const timesheetColumns = [
  { key: 'id', label: 'ENTRY ID', width: '130px', minWidth: '110px', sortable: true, visible: true },
  { key: 'date', label: 'DATE', width: '120px', minWidth: '100px', sortable: true, visible: true },
  { key: 'user', label: 'USER', width: '180px', minWidth: '150px', sortable: true, visible: true },
  { key: 'task_title', label: 'TASK', width: '260px', minWidth: '200px', sortable: true, visible: true },
  { key: 'project', label: 'PROJECT', width: '140px', minWidth: '120px', sortable: true, visible: true },
  { key: 'activity_type', label: 'ACTIVITY', width: '140px', minWidth: '120px', sortable: true, visible: true },
  { key: 'hours', label: 'HOURS', width: '100px', minWidth: '80px', align: 'right', sortable: true, visible: true },
  { key: 'status', label: 'STATUS', width: '110px', minWidth: '90px', sortable: true, visible: true },
]

const timesheetData = computed(() => {
  const entries = []
  tasks.value.forEach((t, i) => {
    if (t.logged_hours > 0 || i < 6) {
      entries.push({
        id: `TS-2026-${String(1001 + i).padStart(4, '0')}`,
        task_id: t.id,
        task_title: t.title,
        project: t.project,
        user: t.assigned_to || 'Talib Sheikh',
        date: t.due_date || '2026-09-08',
        activity_type: i % 3 === 0 ? 'Development' : i % 3 === 1 ? 'Code Review' : 'UI/UX Design',
        hours: t.logged_hours || (4 + (i % 5)),
        status: i % 4 === 0 ? 'Submitted' : 'Approved',
      })
    }
  })
  return entries
})

// Load bootstrap data
async function loadData() {
  loading.value = true
  try {
    const data = await fetchBootstrap()
    tasks.value = data.tasks || []
    projects.value = data.projects || []
    people.value = data.people || []
    statuses.value = data.statuses || statuses.value
    priorities.value = data.priorities || priorities.value
  } catch (e) {
    console.error('Failed to load tasks', e)
  } finally {
    loading.value = false
  }
}

function openDetail(task) {
  activeTask.value = task
  detailModalOpen.value = true
}

async function onSaveTask(updatedTask) {
  const now = new Date()
  updatedTask.modified = now.toISOString()
  updatedTask.modified_pretty = 'Just now'
  const idx = tasks.value.findIndex((t) => t.id === updatedTask.id)
  if (idx !== -1) {
    tasks.value.splice(idx, 1, updatedTask)
  }
  await saveTask(updatedTask)
}

async function onCreateTask(formData) {
  const now = new Date()
  const newId = `TASK-${Math.floor(100000 + Math.random() * 900000)}`
  const newTask = {
    id: newId,
    title: formData.title,
    project: formData.project || (activeSpace.value !== 'All Tasks' ? activeSpace.value : 'General'),
    status: formData.status || 'Open',
    priority: formData.priority || 'Medium',
    assigned_to: formData.assigned_to || '',
    reporter: fullName.value,
    due_date: formData.due_date || '',
    description: formData.description || '',
    estimated_hours: 8,
    logged_hours: 0,
    starred: false,
    comments: [],
    creation: now.toISOString(),
    modified: now.toISOString(),
    modified_pretty: 'Just now',
  }
  tasks.value.unshift(newTask)
  await saveTask(newTask)
}

function toggleStar(row) {
  row.starred = !row.starred
}

onMounted(() => {
  loadData()
})
</script>

<template>
  <div class="h-screen w-full bg-surface-base text-ink-gray-9 antialiased">
    <DesktopShell>
      <!-- Collapsable Sidebar Slot (No icon-rail, exactly Task, Timesheet, Project, Team) -->
      <template #sidebar>
        <Sidebar
          v-model:collapsed="isSidebarCollapsed"
          width="15rem"
          collapsed-width="4.25rem"
          class="border-r border-outline-gray-2 bg-surface-base flex flex-col h-full"
        >
          <!-- Sidebar Header: Brand & Collapse Toggle -->
          <div class="flex h-14 items-center justify-between px-3 border-b border-outline-gray-1">
            <div class="flex items-center gap-2.5 overflow-hidden">
              <div class="flex size-8 shrink-0 items-center justify-center rounded-lg bg-black text-white font-bold text-xs shadow-xs select-none">
                TF
              </div>
              <div v-if="!isSidebarCollapsed" class="flex flex-col truncate transition-opacity">
                <span class="text-sm font-bold tracking-tight text-ink-gray-9 leading-tight">Taskflow</span>
                <span class="text-[11px] text-ink-gray-5 leading-tight">Workspace</span>
              </div>
            </div>

            <!-- Collapse Toggle Button -->
            <button
              type="button"
              class="flex size-7 items-center justify-center rounded-md text-ink-gray-5 hover:bg-surface-gray-2 hover:text-ink-gray-8 transition shrink-0"
              :title="isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'"
              @click="isSidebarCollapsed = !isSidebarCollapsed"
            >
              <span
                class="size-4 block"
                :class="isSidebarCollapsed ? 'lucide-panel-left-open' : 'lucide-panel-left-close'"
              />
            </button>
          </div>

          <!-- Navigation Items: Only Task, Timesheet, Project, Team with Icons -->
          <ScrollArea class="min-h-0 flex-1" viewport-class="px-2 pt-3 pb-6">
            <nav class="space-y-1">
              <SidebarItem
                v-for="item in navItems"
                :key="item.id"
                :active="activeSection === item.id"
                @click="activeSection = item.id"
              >
                <template #prefix>
                  <span :class="[item.icon, 'size-4 shrink-0']" aria-hidden="true" />
                </template>
                <span class="flex-1 truncate text-sm font-medium">{{ item.label }}</span>
                <template #suffix>
                  <span
                    v-if="!isSidebarCollapsed && item.badge"
                    class="mr-1 px-1.5 py-0.5 rounded-full text-[11px] font-semibold bg-surface-gray-2 text-ink-gray-6"
                  >
                    {{ item.badge }}
                  </span>
                </template>
              </SidebarItem>
            </nav>
          </ScrollArea>

          <!-- Sidebar Footer (User Account & Settings) -->
          <div class="p-2 border-t border-outline-gray-1 bg-surface-base">
            <Dropdown :options="userMenu">
              <template #trigger="{ open }">
                <button
                  type="button"
                  class="flex w-full items-center gap-2.5 rounded-lg p-1.5 hover:bg-surface-gray-1 transition text-left"
                  :class="{ 'justify-center': isSidebarCollapsed }"
                >
                  <Avatar
                    :image="userImage"
                    :label="fullName"
                    size="lg"
                    shape="circle"
                    class="shrink-0"
                  />
                  <div v-if="!isSidebarCollapsed" class="flex-1 min-w-0">
                    <p class="text-xs font-semibold text-ink-gray-9 truncate">{{ fullName }}</p>
                    <p class="text-[11px] text-ink-gray-5 truncate">Administrator</p>
                  </div>
                  <span
                    v-if="!isSidebarCollapsed"
                    class="lucide-chevron-up size-3.5 text-ink-gray-4 shrink-0"
                  />
                </button>
              </template>
            </Dropdown>
          </div>
        </Sidebar>
      </template>

      <!-- Pinned Page Header -->
      <PageHeader>
        <div class="flex items-center gap-2.5">
          <!-- Sidebar Toggle Button in Header -->
          <Button
            variant="ghost"
            :icon="isSidebarCollapsed ? 'lucide-panel-left-open' : 'lucide-panel-left-close'"
            :title="isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'"
            @click="isSidebarCollapsed = !isSidebarCollapsed"
          />
          <PageHeaderTitle>{{ activeSection }}</PageHeaderTitle>
        </div>

        <div class="flex items-center gap-2">
          <!-- View Switcher Toggle (Only in Task view) -->
          <div
            v-if="activeSection === 'Task'"
            class="inline-flex rounded-lg border border-outline-gray-2 bg-surface-base p-0.5 text-xs font-medium"
          >
            <button
              type="button"
              :class="[
                'px-2.5 py-1 rounded-md transition',
                currentView === 'feed' ? 'bg-black text-white' : 'text-ink-gray-6 hover:text-ink-gray-9',
              ]"
              @click="currentView = 'feed'"
            >
              Feed View
            </button>
            <button
              type="button"
              :class="[
                'px-2.5 py-1 rounded-md transition',
                currentView === 'table' ? 'bg-black text-white' : 'text-ink-gray-6 hover:text-ink-gray-9',
              ]"
              @click="currentView = 'table'"
            >
              Table View
            </button>
          </div>

          <!-- Add Task Button (in Task view) -->
          <Button
            v-if="activeSection === 'Task'"
            label="Add task"
            icon-left="lucide-plus"
            @click="createModalOpen = true"
          />

          <!-- Refresh Button -->
          <Button
            variant="ghost"
            icon="lucide-refresh-cw"
            :loading="loading"
            @click="loadData"
          />
        </div>
      </PageHeader>

      <!-- Main Body Container: Full width, minor padding, no unnecessary gaps -->
      <div class="w-full px-3 pt-3 pb-1">
        <!-- 1. TASK VIEW -->
        <template v-if="activeSection === 'Task'">
          <!-- Sub-Header Tabs & Task Count -->
          <div class="mb-2.5 flex flex-wrap items-center justify-between gap-2">
            <TabButtons
              v-model="feedTab"
              :options="[
                { label: 'All', value: 'All' },
                { label: 'Open', value: 'Open' },
                { label: 'In Progress', value: 'In Progress' },
                { label: 'Review', value: 'Review' },
                { label: 'On Hold', value: 'On Hold' },
                { label: 'Completed', value: 'Completed' },
                { label: 'Cancelled', value: 'Cancelled' },
                { label: 'Overdue', value: 'Overdue' },
              ]"
            />
            <div class="flex items-center gap-3 text-sm text-ink-gray-5">
              <span>{{ visibleTasks.length }} tasks</span>
            </div>
          </div>

          <!-- FEED VIEW -->
          <div v-if="currentView === 'feed'">
            <List
              :columns="['auto', 'minmax(0, 1fr)', 'auto']"
              class="-mx-3 sm:list-gap-2"
            >
              <ListRow
                v-for="task in visibleTasks"
                :key="task.id"
                class="h-16 px-4 cursor-pointer hover:bg-surface-gray-1 transition-colors rounded-lg items-center"
                @click="openDetail(task)"
              >
                <!-- Cell 1: Assignee Avatar -->
                <ListCell class="shrink-0">
                  <Avatar
                    :image="getAssignee(task.assigned_to).image"
                    :label="task.assigned_to || 'Task'"
                    size="2xl"
                    shape="circle"
                    :title="task.assigned_to ? 'Assigned to ' + task.assigned_to : 'Unassigned'"
                  />
                </ListCell>

                <!-- Cell 2: Title & Project/Assignee metadata (No description) -->
                <ListCell class="min-w-0 flex-1 px-3">
                  <div class="flex flex-col justify-center min-w-0">
                    <div class="flex items-center gap-2 truncate leading-snug text-ink-gray-9">
                      <span class="text-base-semibold truncate">
                        {{ task.title }}
                      </span>
                      <span
                        v-if="task.badge"
                        class="shrink-0 px-2 py-0.5 text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-md"
                      >
                        {{ task.badge }}
                      </span>
                    </div>
                    <div class="mt-1 flex items-center gap-2 text-xs text-ink-gray-5 truncate">
                      <span class="font-mono font-medium text-ink-gray-6">{{ task.id }}</span>
                      <span>·</span>
                      <span class="flex items-center gap-1 font-medium text-ink-gray-7 shrink-0">
                        <span class="lucide-folder size-3.5 text-ink-gray-4" aria-hidden="true" />
                        {{ task.project }}
                      </span>
                      <template v-if="task.assigned_to">
                        <span>·</span>
                        <span class="truncate">
                          Assigned to <strong class="font-medium text-ink-gray-8">{{ task.assigned_to }}</strong>
                        </span>
                      </template>
                    </div>
                  </div>
                </ListCell>

                <!-- Cell 3: Right meta (Due Date, Priority, Status Badge & Actions) -->
                <ListCell class="justify-end shrink-0">
                  <div class="flex items-center gap-3">
                    <div v-if="task.due_date" class="hidden sm:block text-right text-xs text-ink-gray-5 font-mono">
                      {{ task.due_date }}
                    </div>
                    <Badge
                      v-if="task.priority"
                      :theme="task.priority === 'Critical' ? 'red' : task.priority === 'High' ? 'amber' : 'gray'"
                      variant="subtle"
                      size="sm"
                    >
                      {{ task.priority }}
                    </Badge>
                    <Badge
                      :theme="getStatusTheme(task.status)"
                      variant="subtle"
                      size="sm"
                    >
                      {{ task.status }}
                    </Badge>
                    <button
                      type="button"
                      class="p-1.5 text-ink-gray-4 hover:text-amber-500 rounded hover:bg-surface-gray-2 transition"
                      @click.stop="toggleStar(task)"
                    >
                      <span
                        class="size-4 block"
                        :class="task.starred ? 'lucide-star fill-amber-500 text-amber-500' : 'lucide-star'"
                      />
                    </button>
                  </div>
                </ListCell>
              </ListRow>
            </List>
          </div>

          <!-- TABLE VIEW (Non-sticky ID & Title Horizontal Scroll Table) -->
          <div v-else>
            <CommonListView
              v-model:selectedRows="selectedRowKeys"
              :columns="tableColumns"
              :rows="paginatedTableTasks"
              :loading="loading"
              :sort-key="sortKey"
              :sort-order="sortOrder"
              :pagination="paginationInfo"
              @row-click="openDetail"
              @sort-change="handleSortChange"
              @page-change="(p) => (tablePage = p)"
              @page-size-change="(s) => { tablePageSize = s; tablePage = 1; }"
            >
              <template #cell-id="{ row }">
                <div class="flex items-center gap-1.5">
                  <button
                    type="button"
                    class="p-0.5 text-ink-gray-4 hover:text-amber-500 transition shrink-0"
                    title="Star task"
                    @click.stop="toggleStar(row)"
                  >
                    <span
                      class="size-3.5 block"
                      :class="row.starred ? 'lucide-star fill-amber-500 text-amber-500' : 'lucide-star'"
                    />
                  </button>
                  <span
                    class="font-mono font-bold text-blue-600 hover:underline cursor-pointer"
                    @click.stop="openDetail(row)"
                  >
                    {{ row.id }}
                  </span>
                </div>
              </template>

              <template #cell-title="{ row }">
                <div class="flex items-center gap-1.5 min-w-0 max-w-[150px]">
                  <span class="text-xs font-medium text-ink-gray-9 truncate" :title="row.title">{{ row.title }}</span>
                  <span
                    v-if="row.badge"
                    class="shrink-0 px-1 py-0.5 text-[9px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 rounded"
                  >
                    {{ row.badge }}
                  </span>
                </div>
              </template>

              <template #cell-project="{ row }">
                <span class="px-2 py-0.5 rounded-full text-xs font-medium border bg-blue-50 text-blue-700 border-blue-200">
                  {{ row.project }}
                </span>
              </template>

              <template #cell-status="{ row }">
                <Badge
                  :theme="getStatusTheme(row.status)"
                  variant="subtle"
                  size="sm"
                >
                  {{ row.status }}
                </Badge>
              </template>

              <template #cell-priority="{ row }">
                <Badge
                  v-if="row.priority"
                  :theme="row.priority === 'Critical' ? 'red' : row.priority === 'High' ? 'amber' : row.priority === 'Medium' ? 'blue' : 'gray'"
                  variant="subtle"
                  size="sm"
                >
                  {{ row.priority }}
                </Badge>
                <span v-else class="text-ink-gray-4">—</span>
              </template>

              <template #cell-assigned_to="{ row }">
                <div v-if="row.assigned_to" class="flex items-center gap-2">
                  <Avatar
                    :image="getAssignee(row.assigned_to).image"
                    :label="row.assigned_to"
                    size="sm"
                    shape="circle"
                  />
                  <span class="text-sm text-ink-gray-8 truncate">{{ row.assigned_to }}</span>
                </div>
                <span v-else class="text-ink-gray-4 italic text-sm">Unassigned</span>
              </template>

              <template #cell-due_date="{ row }">
                <span v-if="row.due_date" class="font-mono text-xs text-ink-gray-6">
                  {{ row.due_date }}
                </span>
                <span v-else class="text-ink-gray-4">—</span>
              </template>

              <template #cell-modified="{ row }">
                <span
                  class="text-xs text-ink-gray-6 font-medium whitespace-nowrap"
                  :title="row.modified ? `Modified: ${row.modified}` : ''"
                >
                  {{ formatPrettyDate(row) }}
                </span>
              </template>
            </CommonListView>
          </div>
        </template>

        <!-- 2. TIMESHEET VIEW (List view only) -->
        <template v-else-if="activeSection === 'Timesheet'">
          <div class="mb-4 flex items-center justify-between">
            <div>
              <h2 class="text-lg font-bold text-ink-gray-9">Timesheet Logs</h2>
              <p class="text-xs text-ink-gray-5">All time entries logged across active projects</p>
            </div>
            <div class="text-xs font-medium text-ink-gray-6">
              Total Logged: <strong class="text-ink-gray-9">{{ timesheetData.reduce((acc, t) => acc + (Number(t.hours) || 0), 0) }} hrs</strong>
            </div>
          </div>

          <CommonListView
            v-model:selectedRows="selectedTimesheetKeys"
            :columns="timesheetColumns"
            :rows="timesheetData"
            :loading="loading"
          >
            <template #cell-id="{ row }">
              <span class="font-mono font-bold text-ink-gray-7">{{ row.id }}</span>
            </template>

            <template #cell-user="{ row }">
              <div class="flex items-center gap-2">
                <Avatar
                  :image="getAssignee(row.user).image"
                  :label="row.user"
                  size="sm"
                  shape="circle"
                />
                <span class="font-medium text-ink-gray-8 truncate">{{ row.user }}</span>
              </div>
            </template>

            <template #cell-task_title="{ row }">
              <div class="truncate max-w-[260px] font-medium text-ink-gray-9" :title="row.task_title">
                {{ row.task_title }}
              </div>
            </template>

            <template #cell-project="{ row }">
              <span class="px-2 py-0.5 rounded-full text-xs font-medium border bg-blue-50 text-blue-700 border-blue-200">
                {{ row.project }}
              </span>
            </template>

            <template #cell-activity_type="{ row }">
              <span class="text-xs text-ink-gray-7">{{ row.activity_type }}</span>
            </template>

            <template #cell-status="{ row }">
              <Badge
                :theme="row.status === 'Approved' ? 'green' : 'amber'"
                variant="subtle"
                size="sm"
              >
                {{ row.status }}
              </Badge>
            </template>
          </CommonListView>
        </template>

        <!-- 3. PROJECT VIEW (List view only as requested) -->
        <template v-else-if="activeSection === 'Project'">
          <div class="mb-4 flex items-center justify-between">
            <div>
              <h2 class="text-lg font-bold text-ink-gray-9">Projects List</h2>
              <p class="text-xs text-ink-gray-5">Active project spaces and tracking metrics</p>
            </div>
            <span class="text-xs text-ink-gray-5 font-medium">{{ projectsData.length }} projects</span>
          </div>

          <CommonListView
            v-model:selectedRows="selectedProjectKeys"
            :columns="projectColumns"
            :rows="projectsData"
            :loading="loading"
          >
            <template #cell-name="{ row }">
              <div class="flex items-center gap-2">
                <span class="lucide-folder size-4 text-blue-600 shrink-0" aria-hidden="true" />
                <span class="font-semibold text-ink-gray-9">{{ row.name }}</span>
              </div>
            </template>

            <template #cell-status="{ row }">
              <Badge
                :theme="row.status === 'Completed' ? 'green' : 'blue'"
                variant="subtle"
                size="sm"
              >
                {{ row.status }}
              </Badge>
            </template>

            <template #cell-lead="{ row }">
              <div class="flex items-center gap-2">
                <Avatar
                  :image="getAssignee(row.lead).image"
                  :label="row.lead"
                  size="sm"
                  shape="circle"
                />
                <span class="font-medium text-ink-gray-8">{{ row.lead }}</span>
              </div>
            </template>

            <template #cell-progress="{ row }">
              <div class="flex items-center gap-2 w-full">
                <div class="flex-1 bg-surface-gray-2 rounded-full h-2 overflow-hidden">
                  <div
                    class="h-full bg-blue-600 rounded-full transition-all duration-300"
                    :style="{ width: `${row.progress}%` }"
                  />
                </div>
                <span class="text-xs font-mono text-ink-gray-6 w-8 text-right">{{ row.progress }}%</span>
              </div>
            </template>
          </CommonListView>
        </template>

        <!-- 4. TEAM VIEW (List view only as requested) -->
        <template v-else-if="activeSection === 'Team'">
          <div class="mb-4 flex items-center justify-between">
            <div>
              <h2 class="text-lg font-bold text-ink-gray-9">Team Members</h2>
              <p class="text-xs text-ink-gray-5">Workspace collaborators and task allocation</p>
            </div>
            <span class="text-xs text-ink-gray-5 font-medium">{{ teamData.length }} members</span>
          </div>

          <CommonListView
            v-model:selectedRows="selectedTeamKeys"
            :columns="teamColumns"
            :rows="teamData"
            :loading="loading"
          >
            <template #cell-member="{ row }">
              <div class="flex items-center gap-2.5">
                <Avatar
                  :image="row.image"
                  :label="row.name"
                  size="lg"
                  shape="circle"
                />
                <div>
                  <p class="font-semibold text-ink-gray-9 leading-tight">{{ row.name }}</p>
                  <p class="text-[11px] text-ink-gray-5 leading-tight">{{ row.role }}</p>
                </div>
              </div>
            </template>

            <template #cell-email="{ row }">
              <span class="font-mono text-xs text-ink-gray-6">{{ row.email }}</span>
            </template>

            <template #cell-department="{ row }">
              <span class="px-2 py-0.5 rounded-full text-xs font-medium border bg-purple-50 text-purple-700 border-purple-200">
                {{ row.department }}
              </span>
            </template>

            <template #cell-status="{ row }">
              <Badge
                theme="green"
                variant="subtle"
                size="sm"
              >
                {{ row.status }}
              </Badge>
            </template>
          </CommonListView>
        </template>
      </div>
    </DesktopShell>

    <!-- Settings Dialog (Exact snippet structure) -->
    <SettingsDialog v-model:open="showSettings" v-model:tab="settingsTab" size="5xl">
      <SettingsSidebar>
        <SettingsNavGroup label="User settings">
          <SettingsNavItem value="profile">
            <template #prefix>
              <Avatar
                size="xs"
                :image="userImage"
                :label="fullName"
                class="shrink-0"
              />
            </template>
            Profile
          </SettingsNavItem>
          <SettingsNavItem value="preferences">
            <template #prefix>
              <span class="lucide-sliders-horizontal size-4 shrink-0 text-ink-gray-6" />
            </template>
            Preferences
          </SettingsNavItem>
          <SettingsNavItem value="notifications">
            <template #prefix>
              <span class="lucide-bell size-4 shrink-0 text-ink-gray-6" />
            </template>
            Notifications
          </SettingsNavItem>
        </SettingsNavGroup>

        <SettingsNavGroup label="Administration">
          <SettingsNavItem value="users">
            <template #prefix>
              <span class="lucide-users size-4 shrink-0 text-ink-gray-6" />
            </template>
            Users & Roles
          </SettingsNavItem>
        </SettingsNavGroup>
      </SettingsSidebar>

      <SettingsContent>
        <!-- Profile Panel -->
        <SettingsPanel value="profile">
          <SettingsHeader title="Profile" />
          <SettingsBody>
            <div class="space-y-11 pt-6">
              <section class="space-y-6">
                <div class="flex items-center gap-4">
                  <Avatar
                    :image="userImage"
                    :label="fullName"
                    class="size-16"
                  />
                  <div>
                    <div class="text-base-medium text-ink-gray-8">Profile picture</div>
                    <p class="text-p-sm text-ink-gray-5">Helps people recognize you</p>
                  </div>
                </div>

                <div class="grid gap-6 sm:grid-cols-2">
                  <TextInput label="First name" class="w-full" v-model="firstName" />
                  <TextInput label="Last name" class="w-full" v-model="lastName" />
                </div>

                <Textarea label="Bio" class="w-full" maxlength="280" v-model="bio" />
              </section>

              <section>
                <h2 class="text-lg-semibold text-ink-gray-8">Account</h2>
                <div class="mt-2 divide-y divide-outline-gray-1">
                  <SettingsRow
                    title="Public profile"
                    description="View your public page or customize its card layout"
                  >
                    <div class="flex gap-2">
                      <Button icon-left="lucide-user">View</Button>
                      <Button icon-left="lucide-layout-dashboard">Customize</Button>
                    </div>
                  </SettingsRow>
                  <SettingsRow
                    title="Password"
                    description="Manage password and account access"
                  >
                    <Button>Update Password</Button>
                  </SettingsRow>
                </div>
              </section>
            </div>
          </SettingsBody>
        </SettingsPanel>

        <!-- Preferences Panel -->
        <SettingsPanel value="preferences">
          <SettingsHeader title="Preferences" />
          <SettingsBody>
            <div class="space-y-11 pt-6">
              <section>
                <div class="divide-y divide-outline-gray-1">
                  <SettingsRow
                    title="Appearance"
                    description="Choose a light, dark, or system-matched interface"
                  >
                    <Select
                      v-model="theme"
                      :options="[
                        { label: 'Light', value: 'light' },
                        { label: 'Dark', value: 'dark' },
                        { label: 'System Default', value: 'system' },
                      ]"
                    />
                  </SettingsRow>
                  <SettingsRow
                    title="Cursor"
                    description="Show the pointer on everything clickable, or only on external links"
                  >
                    <Select
                      v-model="cursorStyle"
                      :options="[
                        { label: 'Pointer', value: 'pointer' },
                        { label: 'Normal', value: 'normal' },
                      ]"
                    />
                  </SettingsRow>
                </div>
              </section>

              <section>
                <h2 class="text-lg-semibold text-ink-gray-8">Sidebar</h2>
                <div class="mt-2 divide-y divide-outline-gray-1">
                  <SettingsRow
                    title="Unread badge"
                    description="Show unread activity as a dot or a count"
                  >
                    <Select
                      v-model="badgeStyle"
                      :options="['Dot', 'Unread count']"
                    />
                  </SettingsRow>
                  <SettingsRow
                    title="Space sorting"
                    description="Choose how spaces are ordered in the current community sidebar"
                  >
                    <Select
                      v-model="spaceSort"
                      :options="['Recent activity', 'Alphabetical']"
                    />
                  </SettingsRow>
                  <SettingsRow
                    title="Inactive spaces"
                    description="Hide spaces with no activity for the last 2 months"
                  >
                    <Switch v-model="hideInactiveSpaces" />
                  </SettingsRow>
                </div>
              </section>
            </div>
          </SettingsBody>
        </SettingsPanel>

        <!-- Notifications Panel -->
        <SettingsPanel value="notifications">
          <SettingsHeader title="Notifications" />
          <SettingsBody>
            <div class="space-y-11 pt-6">
              <section>
                <div class="divide-y divide-outline-gray-1">
                  <SettingsRow
                    title="Enable email digests"
                    description="Send a summary of missed activity"
                  >
                    <Switch v-model="emailDigestEnabled" />
                  </SettingsRow>
                  <SettingsRow
                    v-if="emailDigestEnabled"
                    title="Digest frequency"
                    description="Choose how often you receive your digest"
                  >
                    <Select
                      v-model="digestFrequency"
                      :options="['Weekly', 'Fortnightly', 'Monthly']"
                    />
                  </SettingsRow>
                  <SettingsRow
                    v-if="emailDigestEnabled"
                    title="Send on"
                    description="Choose the weekday for your digest"
                  >
                    <Select
                      v-model="digestDay"
                      :options="['Monday', 'Wednesday', 'Friday']"
                    />
                  </SettingsRow>
                </div>
              </section>
            </div>
          </SettingsBody>
        </SettingsPanel>

        <!-- Users Panel -->
        <SettingsPanel value="users">
          <SettingsHeader title="Users">
            <template #actions>
              <Button icon-left="lucide-user-plus">Invite</Button>
            </template>
          </SettingsHeader>
          <SettingsBody>
            <div class="pt-4 divide-y divide-outline-gray-1">
              <div
                v-for="member in members"
                :key="member.email"
                class="py-3 flex items-center justify-between"
              >
                <div class="flex items-center gap-3">
                  <Avatar :image="member.image" :label="member.name" size="xl" />
                  <div>
                    <div class="text-base text-ink-gray-8 font-medium">{{ member.name }}</div>
                    <div class="text-sm text-ink-gray-5">{{ member.email }}</div>
                  </div>
                </div>
                <div class="flex items-center gap-3">
                  <span class="text-sm text-ink-gray-7">{{ member.role }}</span>
                  <Button variant="ghost" icon="lucide-ellipsis" label="Member options" />
                </div>
              </div>
            </div>
          </SettingsBody>
        </SettingsPanel>
      </SettingsContent>
    </SettingsDialog>

    <!-- Task Detail Modal (Backdrop Blur Glassmorphism) -->
    <TaskDetailModal
      v-model="detailModalOpen"
      :task="activeTask"
      :projects="projects"
      :people="people"
      :statuses="statuses"
      :priorities="priorities"
      @save="onSaveTask"
      @close="activeTask = null"
    />

    <!-- Task Create Modal -->
    <TaskCreateModal
      v-model="createModalOpen"
      :projects="projects"
      :people="people"
      :statuses="statuses"
      :priorities="priorities"
      @create="onCreateTask"
    />
  </div>
</template>
