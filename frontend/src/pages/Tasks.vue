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
  Rail,
  RailItem,
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
const statuses = ref(['Open', 'In Progress', 'Review', 'Completed', 'On Hold', 'Cancelled'])
const priorities = ref(['Critical', 'High', 'Medium', 'Low'])

// Rail / Workspaces
const communities = [
  {
    id: 'core',
    name: 'Taskflow Core',
    unread: 3,
    image: 'https://avatars.githubusercontent.com/u/6128107?v=4',
  },
  {
    id: 'design',
    name: 'Product & Design',
    unread: 0,
    image: 'https://github.com/figma.png?size=200',
  },
  {
    id: 'marketing',
    name: 'Marketing & Ops',
    unread: 1,
    image: 'https://avatars.githubusercontent.com/u/9919?v=4',
  },
]
const activeCommunity = ref('core')

// Spaces / Projects in Sidebar
const spaces = ref([
  { name: 'All Tasks', icon: 'lucide-layout-list', unread: 0 },
  { name: 'drishti Core', icon: 'lucide-folder-git-2', unread: 3 },
  { name: 'ERPNext Impl', icon: 'lucide-layers', unread: 2 },
  { name: 'CRM Revamp', icon: 'lucide-users', unread: 1 },
  { name: 'Core Platform 2.0', icon: 'lucide-cpu', unread: 0 },
  { name: 'Mobile App', icon: 'lucide-smartphone', unread: 1 },
])
const activeSpace = ref('All Tasks')

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
const currentView = ref('feed')
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

// Members list in Settings
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
    image: 'https://i.pravatar.cc/150?img=5',
  },
  {
    name: 'Marcus Brody',
    email: 'marcus.brody@example.com',
    role: 'Engineer',
    image: 'https://i.pravatar.cc/150?img=12',
  },
  {
    name: 'Elena Rostova',
    email: 'elena.rostova@example.com',
    role: 'Product Designer',
    image: 'https://i.pravatar.cc/150?img=20',
  },
]

// Table View Columns (non-sticky ID & Title as requested)
const tableColumns = [
  { key: 'id', label: 'ID', width: '130px', minWidth: '120px', sortable: true, visible: true },
  { key: 'title', label: 'TITLE & KEY TASK', width: '360px', minWidth: '320px', sortable: true, visible: true },
  { key: 'project', label: 'PROJECT', width: '150px', minWidth: '130px', sortable: true, visible: true },
  { key: 'status', label: 'STATUS', width: '130px', minWidth: '120px', sortable: true, visible: true },
  { key: 'priority', label: 'PRIORITY', width: '110px', minWidth: '100px', sortable: true, visible: true },
  { key: 'assigned_to', label: 'ASSIGNED TO', width: '180px', minWidth: '160px', sortable: true, visible: true },
  { key: 'reporter', label: 'REPORTER', width: '150px', minWidth: '130px', sortable: true, visible: true },
  { key: 'pending_with', label: 'PENDING WITH', width: '140px', minWidth: '130px', sortable: false, visible: true },
  { key: 'due_date', label: 'DUE DATE', width: '120px', minWidth: '110px', sortable: true, visible: true },
  { key: 'estimated_hours', label: 'EST. HRS', width: '100px', minWidth: '90px', align: 'right', sortable: true, visible: true },
  { key: 'logged_hours', label: 'LOGGED HRS', width: '100px', minWidth: '90px', align: 'right', sortable: true, visible: true },
  { key: 'actions', label: 'ACTIONS', width: '90px', minWidth: '80px', align: 'center', sortable: false, visible: true },
]

const selectedRowKeys = ref([])
const tablePage = ref(1)
const tablePageSize = ref(20)
const sortKey = ref('creation')
const sortOrder = ref('desc')

// Filtered tasks based on active space and feed tab
const visibleTasks = computed(() => {
  let list = [...tasks.value]

  // Filter by sidebar space/project
  if (activeSpace.value && activeSpace.value !== 'All Tasks') {
    list = list.filter((t) => t.project === activeSpace.value)
  }

  // Filter by tab
  if (feedTab.value === 'In Progress') {
    list = list.filter((t) => t.status === 'In Progress')
  } else if (feedTab.value === 'Review') {
    list = list.filter((t) => t.status === 'Review')
  } else if (feedTab.value === 'Completed') {
    list = list.filter((t) => t.status === 'Completed')
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
  const idx = tasks.value.findIndex((t) => t.id === updatedTask.id)
  if (idx !== -1) {
    tasks.value.splice(idx, 1, updatedTask)
  }
  await saveTask(updatedTask)
}

async function onCreateTask(formData) {
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
      <!-- Rail Slot -->
      <template #rail>
        <Rail class="border-r border-outline-gray-2 bg-surface-base">
          <!-- Taskflow Logo Cell -->
          <button
            type="button"
            class="flex size-7 items-center justify-center rounded-[7px] bg-black text-white font-bold text-xs transition hover:opacity-90 focus-visible:ring-0 focus-visible:focus-ring shadow-2xs"
            aria-label="Home"
          >
            TF
          </button>

          <!-- Communities / Workspaces -->
          <div class="flex w-full flex-1 flex-col items-center gap-3 pt-3">
            <RailItem
              v-for="c in communities"
              :key="c.id"
              :label="c.name"
              :active="activeCommunity === c.id"
              :badge="c.unread"
              badge-style="count"
              @click="activeCommunity = c.id"
            >
              <Avatar
                :image="c.image"
                :label="c.name"
                size="lg"
                shape="square"
                class="size-7"
              />
            </RailItem>
          </div>

          <!-- Bottom Cluster -->
          <div class="flex flex-col items-center gap-2.5">
            <RailItem label="Search" variant="ghost" icon="lucide-search" />
            <RailItem
              label="Settings"
              variant="ghost"
              icon="lucide-settings"
              @click="showSettings = true"
            />

            <!-- User Menu Trigger -->
            <Dropdown :options="userMenu">
              <template #trigger="{ open }">
                <button
                  type="button"
                  class="flex size-7 items-center justify-center rounded-full transition focus-visible:ring-0 focus-visible:focus-ring"
                  :class="open ? '' : 'hover:opacity-90'"
                  aria-label="Account"
                >
                  <Avatar
                    :image="userImage"
                    :label="fullName"
                    size="lg"
                    class="size-7"
                  />
                </button>
              </template>
            </Dropdown>
          </div>
        </Rail>
      </template>

      <!-- Sidebar Slot -->
      <template #sidebar>
        <Sidebar width="14rem" class="border-r border-outline-gray-2 bg-surface-base">
          <SidebarHeader
            title="Taskflow"
            subtitle="ERPNext Platform"
            :show-logo="false"
            :menu-items="[
              {
                label: 'Invite people',
                icon: 'lucide-user-plus',
                onClick: () => (showSettings = true),
              },
              {
                label: 'Workspace settings',
                icon: 'lucide-settings-2',
                onClick: () => (showSettings = true),
              },
            ]"
          />

          <!-- Scrollable Nav -->
          <ScrollArea class="min-h-0 flex-1" viewport-class="px-2 pt-0.5 pb-10">
            <nav class="space-y-0.5">
              <SidebarItem
                :active="activeSpace === 'All Tasks'"
                @click="activeSpace = 'All Tasks'"
              >
                <template #prefix>
                  <span class="lucide-layout-list size-4" aria-hidden="true" />
                </template>
                <span class="flex-1 truncate text-sm">All Tasks</span>
                <template #suffix>
                  <span class="mr-1 size-4 grid place-content-center text-xs text-ink-gray-5 font-medium">
                    {{ tasks.length }}
                  </span>
                </template>
              </SidebarItem>

              <SidebarItem>
                <template #prefix>
                  <span class="lucide-search size-4" aria-hidden="true" />
                </template>
                <span class="flex-1 truncate text-sm">Search</span>
              </SidebarItem>
            </nav>

            <!-- Spaces Section Label -->
            <div class="mt-4 flex h-7 items-center justify-between">
              <SidebarLabel>Projects & Spaces</SidebarLabel>
              <div class="flex items-center">
                <Button
                  variant="ghost"
                  size="sm"
                  icon="lucide-arrow-up-down text-ink-gray-5"
                  label="Sort spaces"
                />
              </div>
            </div>

            <!-- Project Spaces List -->
            <nav class="mt-0.5 space-y-0.5">
              <SidebarItem
                v-for="space in spaces.filter((s) => s.name !== 'All Tasks')"
                :key="space.name"
                :active="space.name === activeSpace"
                @click="activeSpace = space.name"
              >
                <template #prefix>
                  <span :class="space.icon" class="size-4" aria-hidden="true" />
                </template>
                <span class="flex-1 truncate text-sm">{{ space.name }}</span>
                <template #suffix>
                  <span
                    v-if="space.unread"
                    class="mr-1 size-4 grid place-content-center text-xs text-ink-gray-5"
                  >
                    {{ space.unread }}
                  </span>
                </template>
              </SidebarItem>
            </nav>
          </ScrollArea>
        </Sidebar>
      </template>

      <!-- Pinned Page Header -->
      <PageHeader>
        <div class="flex items-center gap-2">
          <PageHeaderTitle>{{ activeSpace }}</PageHeaderTitle>
          <Dropdown :options="spaceActions">
            <Button
              variant="ghost"
              icon="lucide-ellipsis"
              label="Space actions"
            />
          </Dropdown>
        </div>

        <div class="flex items-center gap-2">
          <!-- View Switcher Toggle -->
          <div class="inline-flex rounded-lg border border-outline-gray-2 bg-surface-base p-0.5 text-xs font-medium">
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

          <!-- Add Task Button -->
          <Button
            label="Add task"
            icon-left="lucide-plus"
            @click="createModalOpen = true"
          />
        </div>
      </PageHeader>

      <!-- Main Body Container -->
      <div class="mx-auto mt-5 w-full max-w-[1280px] px-4 pb-10 sm:px-6">
        <!-- Sub-Header Tabs & Task Count -->
        <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
          <TabButtons
            v-model="feedTab"
            :options="[
              { label: 'All', value: 'All' },
              { label: 'In Progress', value: 'In Progress' },
              { label: 'Review', value: 'Review' },
              { label: 'Completed', value: 'Completed' },
            ]"
          />
          <div class="flex items-center gap-3 text-sm text-ink-gray-5">
            <span>{{ visibleTasks.length }} tasks</span>
            <Button
              variant="ghost"
              size="sm"
              icon="lucide-refresh-cw"
              :loading="loading"
              @click="loadData"
            />
          </div>
        </div>

        <!-- 1. FEED LIST VIEW (Exact Frappe UI List Layout) -->
        <div v-if="currentView === 'feed'">
          <List class="-mx-3 sm:list-gap-4">
            <ListRow
              v-for="task in visibleTasks"
              :key="task.id"
              class="h-15 cursor-pointer hover:bg-surface-gray-1 transition"
              @click="openDetail(task)"
            >
              <!-- Cell 1: Avatar -->
              <ListCell>
                <Avatar
                  :label="task.assigned_to || 'Task'"
                  size="2xl"
                />
              </ListCell>

              <!-- Cell 2: Title, Project & Excerpt -->
              <ListCell>
                <div class="min-w-0 flex-1">
                  <div class="truncate leading-none text-ink-gray-8">
                    <span class="text-base-semibold">
                      {{ task.title }}
                    </span>
                    <span
                      v-if="task.badge"
                      class="ml-2 px-2 py-0.5 text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-md"
                    >
                      {{ task.badge }}
                    </span>
                  </div>
                  <div class="mt-1.5 flex min-w-0 items-center text-base text-ink-gray-5">
                    <span class="lucide-folder mr-1 size-4 shrink-0" aria-hidden="true" />
                    <span class="shrink-0 font-medium text-ink-gray-7">{{ task.project }}</span>
                    <span class="mx-1.5">·</span>
                    <span class="truncate">{{ task.description || 'No description provided' }}</span>
                  </div>
                </div>
              </ListCell>

              <!-- Cell 3: Right meta (Status Badge, Priority & Actions) -->
              <ListCell class="justify-end">
                <div class="flex items-center gap-3">
                  <div class="text-right text-sm text-ink-gray-5">
                    {{ task.due_date || 'No due date' }}
                  </div>
                  <Badge
                    :theme="task.status === 'Completed' ? 'green' : task.status === 'In Progress' ? 'blue' : task.status === 'Review' ? 'purple' : 'gray'"
                    variant="subtle"
                    size="sm"
                  >
                    {{ task.status }}
                  </Badge>
                  <button
                    type="button"
                    class="p-1 text-ink-gray-4 hover:text-amber-500 transition"
                    @click.stop="toggleStar(task)"
                  >
                    <span
                      class="size-4"
                      :class="task.starred ? 'lucide-star fill-amber-500 text-amber-500' : 'lucide-star'"
                    />
                  </button>
                </div>
              </ListCell>
            </ListRow>
          </List>
        </div>

        <!-- 2. TABLE VIEW (Non-sticky ID & Title Horizontal Scroll Table) -->
        <div v-else>
          <CommonListView
            v-model:selectedRows="selectedRowKeys"
            :columns="tableColumns"
            :rows="paginatedTableTasks"
            :loading="loading"
            :totals="true"
            :sort-key="sortKey"
            :sort-order="sortOrder"
            :pagination="paginationInfo"
            @row-click="openDetail"
            @page-change="(p) => (tablePage = p)"
            @page-size-change="(s) => { tablePageSize = s; tablePage = 1; }"
          >
            <template #cell-id="{ row }">
              <span
                class="font-mono font-bold text-blue-600 hover:underline cursor-pointer"
                @click.stop="openDetail(row)"
              >
                {{ row.id }}
              </span>
            </template>

            <template #cell-title="{ row }">
              <div class="flex items-center gap-2 min-w-[280px]">
                <span class="text-base font-medium text-ink-gray-9 truncate">{{ row.title }}</span>
                <span
                  v-if="row.badge"
                  class="px-2 py-0.5 text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-md"
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
                :theme="row.status === 'Completed' ? 'green' : row.status === 'In Progress' ? 'blue' : row.status === 'Review' ? 'purple' : 'gray'"
                variant="subtle"
                size="sm"
              >
                {{ row.status }}
              </Badge>
            </template>

            <template #cell-assigned_to="{ row }">
              <div v-if="row.assigned_to" class="flex items-center gap-2">
                <Avatar :label="row.assigned_to" size="sm" />
                <span class="text-sm text-ink-gray-8 truncate">{{ row.assigned_to }}</span>
              </div>
              <span v-else class="text-ink-gray-4 italic text-sm">Unassigned</span>
            </template>

            <template #cell-actions="{ row }">
              <div class="inline-flex items-center gap-2" @click.stop>
                <Button
                  variant="ghost"
                  size="sm"
                  icon="lucide-external-link"
                  @click="openDetail(row)"
                />
                <button
                  type="button"
                  class="p-1 text-ink-gray-4 hover:text-amber-500 transition"
                  @click="toggleStar(row)"
                >
                  <span
                    class="size-4"
                    :class="row.starred ? 'lucide-star fill-amber-500 text-amber-500' : 'lucide-star'"
                  />
                </button>
              </div>
            </template>
          </CommonListView>
        </div>
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
