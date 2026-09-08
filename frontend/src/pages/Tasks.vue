<script setup>
import { computed, reactive, ref, onMounted, onUnmounted, watch } from 'vue'
import {
  Avatar,
  Badge,
  Breadcrumbs,
  Button,
  DesktopShell,
  Dropdown,
  FormControl,
  MobileNav,
  MobileShell,
  MultiSelect,
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
  toast,
} from 'frappe-ui'
import {
  CheckSquare,
  Clock,
  FolderKanban,
  Users,
  RefreshCw,
  Plus,
  PanelLeftOpen,
  PanelLeftClose,
  Star,
  ChevronUp,
  Folder,
  SlidersHorizontal,
  Bell,
  User,
  Settings,
  LogOut,
  Link as LinkIcon,
  Check,
  Archive,
  UserPlus,
  MoreHorizontal,
  LayoutDashboard,
  UserCheck,
} from 'lucide-vue-next'

import CommonListView from '@/components/CommonListView.vue'
import TaskDetailModal from '@/components/TaskDetailModal.vue'
import TaskCreateModal from '@/components/TaskCreateModal.vue'
import {
  fetchBootstrap,
  saveTask,
  deleteTask,
  getErrorMessage,
  fetchTeams,
  fetchTeamMembers,
  createTeam,
  updateTeam,
  deleteTeam,
  fetchEmployees,
  addTeamMember,
  fetchMemberTimesheets,
  fetchAllTimesheets,
  saveTimesheet,
  deleteTimesheet,
} from '@/data/api.js'
import TimesheetCalendar from '@/components/TimesheetCalendar.vue'

// --- State & Data ---
const loading = ref(false)
const tasks = ref([])
const projects = ref([])
const people = ref([])
const statuses = ref(['Open', 'In Progress', 'Review', 'On Hold', 'Completed', 'Cancelled', 'Overdue'])
const priorities = ref(['Critical', 'High', 'Medium', 'Low'])

// Teams & Team Members state
const teams = ref([])
const teamMembers = ref([])
const employees = ref([])
const teamLoading = ref(false)
const selectedTeam = ref(null)
const allTeamsSelected = computed(() => !selectedTeam.value)
const activeSpace = ref('All Tasks')

// Active Navigation: ONLY Task, Timesheet, Project, Team
const VALID_SECTIONS = ['Task', 'Timesheet', 'Project', 'Team']
const getSectionFromURL = () => {
  try {
    const params = new URLSearchParams(window.location.search)
    const section = params.get('section')
    if (section && VALID_SECTIONS.includes(section)) return section
  } catch {}
  return 'Task'
}
const activeSection = ref(getSectionFromURL())

const SIDEBAR_COLLAPSED_KEY = 'taskflow:sidebar_collapsed'
const getStoredSidebarState = () => {
  try {
    return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === 'true'
  } catch {
    return false
  }
}
const isSidebarCollapsed = ref(getStoredSidebarState())

watch(isSidebarCollapsed, (val) => {
  try {
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(val))
  } catch (e) {
    console.error('Failed to save sidebar state to localStorage', e)
  }
})

// Sync activeSection with URL query param
watch(activeSection, (val) => {
  try {
    const url = new URL(window.location.href)
    url.searchParams.set('section', val)
    window.history.replaceState(null, '', url.toString())
  } catch {}
})

// Handle browser back/forward
const onPopState = () => {
  const section = getSectionFromURL()
  if (VALID_SECTIONS.includes(section)) {
    activeSection.value = section
  }
  // Restore member from URL
  try {
    const params = new URLSearchParams(window.location.search)
    const memberEmail = params.get('member')
    if (memberEmail && activeSection.value === 'Team') {
      const found = teamData.value.find((m) => m.email === memberEmail || m.id === memberEmail)
      if (found) {
        selectedMember.value = found
        loadMemberTimesheets(found)
      }
    } else if (!memberEmail) {
      selectedMember.value = null
      calendarEvents.value = []
    }
  } catch {}
}

// User Profile Settings State
const settingsTab = ref('profile')
const firstName = ref('Talib')
const lastName = ref('Sheikh')
const bio = ref('Product & Engineering. Building high-performance task management.')
const fullName = computed(() => `${firstName.value} ${lastName.value}`.trim())
const userImage = 'https://avatars.githubusercontent.com/u/499550?v=4'
const currentUserEmail = ref('')

// Active status tab filter
const statusTab = ref('All')

const STORAGE_KEY_ASSIGNED_TO_ME = 'taskflow_assigned_to_me'

function getInitialAssignedToMe() {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY_ASSIGNED_TO_ME)
      if (saved !== null) {
        return saved === 'true'
      }
    } catch (e) {
      console.warn('Failed to read assigned_to_me from localStorage', e)
    }
  }
  return true
}

const showAssignedToMe = ref(getInitialAssignedToMe())

watch(showAssignedToMe, (val) => {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.setItem(STORAGE_KEY_ASSIGNED_TO_ME, String(val))
    } catch (e) {
      console.warn('Failed to save assigned_to_me to localStorage', e)
    }
  }
})

function isAssignedToCurrentUser(t) {
  if (!t) return false
  const userEmail = (currentUserEmail.value || '').toLowerCase().trim()
  const userName = (fullName.value || '').toLowerCase().trim()
  if (!userEmail && !userName) return true

  // 1. Array assignees (strings or objects)
  if (Array.isArray(t.assignees) && t.assignees.length > 0) {
    const matched = t.assignees.some((a) => {
      if (!a) return false
      if (typeof a === 'string') {
        const val = a.toLowerCase().trim()
        return (userEmail && val === userEmail) || (userName && val === userName)
      }
      if (typeof a === 'object') {
        const uid = (a.user_id || a.email || a.name || '').toLowerCase().trim()
        const uname = (a.full_name || a.name || '').toLowerCase().trim()
        return (userEmail && (uid === userEmail || uname === userEmail)) || (userName && uname === userName)
      }
      return false
    })
    if (matched) return true
  }

  // 2. Child table_gqbl
  if (Array.isArray(t.table_gqbl) && t.table_gqbl.length > 0) {
    const matched = t.table_gqbl.some((r) => {
      if (!r) return false
      const uid = (r.user_id || r.email || '').toLowerCase().trim()
      const uname = (r.employee_name || '').toLowerCase().trim()
      return (userEmail && (uid === userEmail || uname === userEmail)) || (userName && uname === userName)
    })
    if (matched) return true
  }

  // 3. assigned_to field (comma separated string or single name/email)
  if (typeof t.assigned_to === 'string' && t.assigned_to.trim()) {
    const parts = t.assigned_to.split(',').map((p) => p.toLowerCase().trim())
    if (userEmail && parts.includes(userEmail)) return true
    if (userName && parts.includes(userName)) return true
  }

  return false
}

const navItems = computed(() => {
  let taskCount = tasks.value
  if (showAssignedToMe.value) {
    taskCount = taskCount.filter(isAssignedToCurrentUser)
  }
  if (selectedProjects.value && selectedProjects.value.length > 0) {
    taskCount = taskCount.filter((t) => selectedProjects.value.includes(t.project))
  }

  return [
    { id: 'Task', label: 'Task', icon: CheckSquare, badge: taskCount.length },
    { id: 'Timesheet', label: 'Timesheet', icon: Clock, badge: timesheetListData.value.length },
    { id: 'Project', label: 'Project', icon: FolderKanban, badge: projectsData.value.length },
    { id: 'Team', label: 'Team', icon: Users, badge: teamData.value.length },
  ]
})

const currentBreadcrumbs = computed(() => {
  const sectionLabel = {
    Task: 'Tasks',
    Timesheet: 'Timesheet',
    Project: 'Projects',
    Team: 'Team',
  }[activeSection.value] || activeSection.value

  return [
    { label: 'Workspace', route: '#' },
    { label: sectionLabel, route: '#' },
  ]
})

// User Menu
const userMenu = [
  { label: 'My profile', icon: User },
  {
    label: 'Settings',
    icon: Settings,
    onClick: () => (showSettings.value = true),
  },
  { label: 'Log out', icon: LogOut },
]

// Toast notification
const toastMessage = ref('')
const toastVisible = ref(false)
function showToast(msg) {
  toastMessage.value = msg
  toastVisible.value = true
  setTimeout(() => { toastVisible.value = false }, 3000)
}

// Multi-select project filter
const selectedProjects = ref([])

const projectOptions = computed(() => {
  const set = new Set()
  if (Array.isArray(projects.value)) {
    projects.value.forEach((p) => {
      const val = p.name || p.display_name
      if (val) set.add(val)
    })
  }
  if (Array.isArray(tasks.value)) {
    tasks.value.forEach((t) => {
      if (t.project) set.add(t.project)
    })
  }
  return Array.from(set).map((p) => ({
    value: p,
    label: p,
  }))
})

// Modals
const detailModalOpen = ref(false)
const activeTask = ref(null)
const createModalOpen = ref(false)
const showSettings = ref(false)

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
  { label: 'Copy link', icon: LinkIcon },
  { label: 'Mark all as read', icon: Check },
  { label: 'Manage access', icon: Users },
  { label: 'Archive', icon: Archive },
]

// Members list in Settings & Avatar lookup
const members = computed(() => {
  return (people.value || []).map((p) => ({
    name: p.name,
    email: p.email,
    image: p.image || '',
  }))
})

const getAssignee = (email) => {
  if (!email) return { name: 'Unassigned', image: '' }
  const found = members.value.find(
    (m) => m.email.toLowerCase() === email.toLowerCase()
  )
  if (found) return found
  return {
    name: email,
    image: '',
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
const tasksDisplayLimit = ref(20)
const sortKey = ref('modified')
const sortOrder = ref('desc')

function handleSortChange({ key, order }) {
  sortKey.value = key
  sortOrder.value = order
}

watch([statusTab, selectedProjects, showAssignedToMe], () => {
  tasksDisplayLimit.value = 20
})

function formatPrettyDate(row) {
  if (row?.modified_pretty) {
    const p = String(row.modified_pretty).trim()
    if (p.toLowerCase() === 'just now' || p.toLowerCase().includes('second') || p.toLowerCase() === 'right now') return 'Just now'
    return p
  }
  if (!row?.modified) return '—'

  try {
    const raw = String(row.modified).trim()
    const isoString = raw.includes('T') ? raw : raw.replace(' ', 'T')
    const d = new Date(isoString)
    if (isNaN(d.getTime())) return row.modified

    const now = new Date()
    const diffSec = Math.floor((now.getTime() - d.getTime()) / 1000)

    if (diffSec < 0 || diffSec < 300) return 'Just now'
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

function isRowJustNow(row) {
  if (!row) return false
  const p = (row.modified_pretty || '').toString().trim().toLowerCase()
  if (p === 'just now' || p === 'right now' || p.includes('just now') || p.includes('second')) return true
  const computed = formatPrettyDate(row).toString().trim().toLowerCase()
  if (computed === 'just now' || computed === 'right now' || computed.includes('just now') || computed.includes('second')) return true
  if (row.modified) {
    try {
      const raw = String(row.modified).trim()
      const isoString = raw.includes('T') ? raw : raw.replace(' ', 'T')
      const d = new Date(isoString)
      if (!isNaN(d.getTime())) {
        const diffSec = Math.floor((Date.now() - d.getTime()) / 1000)
        if (diffSec >= 0 && diffSec < 300) return true
      }
    } catch {}
  }
  return false
}

// Light green highlight for tasks modified 'Just now'
function getTaskRowClass(row) {
  if (isRowJustNow(row)) {
    return 'row-just-now is-just-now'
  }
  return 'hover:bg-[#f0f7f7]'
}

// Colorful status badge styling: Completed (Green), Overdue (Red), Open (Blue), etc.
const getStatusBadgeClass = (status) => {
  switch (status) {
    case 'Completed':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200 ring-1 ring-emerald-500/10'
    case 'Overdue':
      return 'bg-rose-50 text-rose-700 border-rose-200 ring-1 ring-rose-500/10'
    case 'Open':
      return 'bg-blue-50 text-blue-700 border-blue-200 ring-1 ring-blue-500/10'
    case 'In Progress':
      return 'bg-indigo-50 text-indigo-700 border-indigo-200 ring-1 ring-indigo-500/10'
    case 'Review':
      return 'bg-purple-50 text-purple-700 border-purple-200 ring-1 ring-purple-500/10'
    case 'On Hold':
      return 'bg-amber-50 text-amber-700 border-amber-200 ring-1 ring-amber-500/10'
    case 'Cancelled':
      return 'bg-gray-100 text-gray-600 border-gray-200 ring-1 ring-gray-500/10'
    default:
      return 'bg-blue-50 text-blue-700 border-blue-200 ring-1 ring-blue-500/10'
  }
}

const statusThemeMap = {
  'Open': 'blue',
  'In Progress': 'indigo',
  'Review': 'purple',
  'On Hold': 'amber',
  'Completed': 'green',
  'Cancelled': 'gray',
  'Overdue': 'red',
}

const statusDotClassMap = {
  'Open': 'bg-surface-blue-7',
  'In Progress': 'bg-surface-indigo-7',
  'Review': 'bg-surface-purple-7',
  'On Hold': 'bg-surface-amber-7',
  'Completed': 'bg-surface-green-7',
  'Cancelled': 'bg-surface-gray-8',
  'Overdue': 'bg-surface-red-7',
}

const getStatusDotClass = (status) => {
  switch (status) {
    case 'Completed':
      return 'bg-emerald-500'
    case 'Overdue':
      return 'bg-rose-500 animate-pulse'
    case 'Open':
      return 'bg-blue-500'
    case 'In Progress':
      return 'bg-indigo-500'
    case 'Review':
      return 'bg-purple-500'
    case 'On Hold':
      return 'bg-amber-500'
    case 'Cancelled':
      return 'bg-gray-400'
    default:
      return 'bg-blue-500'
  }
}

const getPriorityBadgeClass = (priority) => {
  switch (priority) {
    case 'Critical':
      return 'bg-rose-50 text-rose-700 border-rose-200 font-semibold'
    case 'High':
      return 'bg-orange-50 text-orange-700 border-orange-200 font-medium'
    case 'Medium':
      return 'bg-amber-50 text-amber-700 border-amber-200 font-medium'
    case 'Low':
    default:
      return 'bg-gray-100 text-gray-600 border-gray-200'
  }
}

// Reactive status tab options with counts for each status
const statusOptions = computed(() => {
  const counts = {
    All: 0,
    Open: 0,
    'In Progress': 0,
    Review: 0,
    'On Hold': 0,
    Completed: 0,
    Cancelled: 0,
    Overdue: 0,
  }

  let baseTasks = tasks.value

  // When "Assigned to Me" is checked, only count user's tasks in all status badges
  if (showAssignedToMe.value) {
    baseTasks = baseTasks.filter(isAssignedToCurrentUser)
  }

  if (selectedProjects.value && selectedProjects.value.length > 0) {
    baseTasks = baseTasks.filter((t) => selectedProjects.value.includes(t.project))
  }

  counts.All = baseTasks.length

  baseTasks.forEach((t) => {
    const s = t.status || 'Open'
    if (counts[s] !== undefined) {
      counts[s]++
    }
  })

  return [
    { label: `All (${counts.All})`, value: 'All' },
    { label: `Open (${counts.Open})`, value: 'Open' },
    { label: `In Progress (${counts['In Progress']})`, value: 'In Progress' },
    { label: `Review (${counts.Review})`, value: 'Review' },
    { label: `On Hold (${counts['On Hold']})`, value: 'On Hold' },
    { label: `Completed (${counts.Completed})`, value: 'Completed' },
    { label: `Cancelled (${counts.Cancelled})`, value: 'Cancelled' },
    { label: `Overdue (${counts.Overdue})`, value: 'Overdue' },
  ]
})

// Filtered tasks based on status tab, project filter, and sort
const visibleTasks = computed(() => {
  let list = [...tasks.value]

  // Assigned to Me filter — checks user assignment via table_gqbl, assignees, or assigned_to
  if (showAssignedToMe.value) {
    list = list.filter(isAssignedToCurrentUser)
  }

  if (selectedProjects.value && selectedProjects.value.length > 0) {
    list = list.filter((t) => selectedProjects.value.includes(t.project))
  }

  if (statusTab.value && statusTab.value !== 'All') {
    list = list.filter((t) => t.status === statusTab.value)
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
  loaded: paginatedTableTasks.value.length,
  total: visibleTasks.value.length,
  step: 20,
}))

const paginatedTableTasks = computed(() => {
  return visibleTasks.value.slice(0, tasksDisplayLimit.value)
})

function handleLoadMore() {
  tasksDisplayLimit.value += 20
}

function handleLoadAll() {
  tasksDisplayLimit.value = visibleTasks.value.length
}

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
  { key: 'active_tasks', label: 'ACTIVE TASKS', width: '120px', minWidth: '100px', align: 'right', sortable: true, visible: true },
  { key: 'logged_hours', label: 'HOURS LOGGED', width: '120px', minWidth: '100px', align: 'right', sortable: true, visible: true },
  { key: 'status', label: 'STATUS', width: '110px', minWidth: '90px', sortable: true, visible: true },
]

// Team data from backend (Taskflow Team member table)
const teamData = computed(() => {
  if (teamMembers.value && teamMembers.value.length > 0) {
    return teamMembers.value.map((m, idx) => ({
      id: m.name || `USR-${idx + 1}`,
      name: m.employee_name || m.user || m.employee || 'Unknown',
      email: m.user || '',
      role: m.team_role || 'Team Member',
      image: m.user_image || '',
      department: m.department || 'General',
      designation: m.designation || '',
      active_tasks: m.pending_tasks || 0,
      total_tasks: m.total_tasks || 0,
      completed_tasks: m.completed_tasks || 0,
      overdue_tasks: m.overdue_tasks || 0,
      logged_hours: 0,
      status: m.is_active ? 'Active' : 'Inactive',
      team: m.team || '',
      employee: m.employee || '',
      access_level: m.access_level || 'Operate',
    }))
  }
  // Fallback: show teams as rows if no members loaded
  if (teams.value && teams.value.length > 0) {
    return teams.value.map((t, idx) => ({
      id: t.name || `TEAM-${idx + 1}`,
      name: t.team_name || t.name,
      email: t.team_lead || '',
      role: 'Team',
      image: '',
      department: t.company || '',
      active_tasks: 0,
      total_tasks: 0,
      completed_tasks: 0,
      logged_hours: 0,
      status: t.is_active ? 'Active' : 'Inactive',
      team: t.name,
      member_count: t.member_count || 0,
      project_count: t.project_count || 0,
    }))
  }
  return []
})

// --- 4. Timesheet List View State & Columns ---
const selectedTimesheetKeys = ref([])
const timesheetListData = ref([])
const timesheetListLoading = ref(false)
const selectedTimesheet = ref(null)
const timesheetCalendarEvents = ref([])
const timesheetCalendarLoading = ref(false)
const selectedTsDayDate = ref('')
const selectedTsDayEntries = ref([])
const timesheetFormOpen = ref(false)
const timesheetFormDate = ref('')
const timesheetFormItems = ref([])
const timesheetFormStatus = ref('Draft')
const timesheetFormSaving = ref(false)

const timesheetColumns = [
  { key: 'employee_name', label: 'USER', width: '200px', minWidth: '160px', sortable: true, visible: true },
  { key: 'timesheet_date', label: 'DATE', width: '120px', minWidth: '100px', sortable: true, visible: true },
  { key: 'total_working_hours', label: 'HOURS', width: '100px', minWidth: '80px', align: 'right', sortable: true, visible: true },
  { key: 'status', label: 'STATUS', width: '110px', minWidth: '90px', sortable: true, visible: true },
]

async function loadTimesheetList() {
  timesheetListLoading.value = true
  try {
    const now = new Date()
    const year = now.getFullYear()
    const month = now.getMonth()
    const fromDate = `${year}-${String(month + 1).padStart(2, '0')}-01`
    const lastDay = new Date(year, month + 1, 0).getDate()
    const toDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
    timesheetListData.value = await fetchAllTimesheets(fromDate, toDate) || []
  } catch (e) {
    console.error('Failed to load timesheets', e)
    timesheetListData.value = []
  } finally {
    timesheetListLoading.value = false
  }
}

function selectTimesheet(ts) {
  selectedTimesheet.value = ts
  loadTimesheetCalendar(ts.user)
}

function backToTimesheetList() {
  selectedTimesheet.value = null
  timesheetCalendarEvents.value = []
  selectedTsDayDate.value = ''
  selectedTsDayEntries.value = []
}

async function loadTimesheetCalendar(user) {
  if (!user) return
  timesheetCalendarLoading.value = true
  try {
    const now = new Date()
    const year = now.getFullYear()
    const month = now.getMonth()
    const fromDate = `${year}-${String(month + 1).padStart(2, '0')}-01`
    const lastDay = new Date(year, month + 1, 0).getDate()
    const toDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
    const data = await fetchMemberTimesheets(user, fromDate, toDate)
    timesheetCalendarEvents.value = (data || []).map((ts) => ({
      id: ts.name,
      title: `${ts.total_hours}h logged`,
      fromDate: ts.date,
      toDate: ts.date,
      fromTime: '00:00',
      toTime: '23:59',
      isFullDay: true,
      color: ts.status === 'Submitted' ? 'green' : 'blue',
      _ts: ts,
      _hours: ts.total_hours || 0,
    }))
  } catch (e) {
    console.error('Failed to load timesheet calendar', e)
    timesheetCalendarEvents.value = []
  } finally {
    timesheetCalendarLoading.value = false
  }
}

function handleTsCalendarClick(dateStr) {
  selectedTsDayDate.value = dateStr
  selectedTsDayEntries.value = timesheetCalendarEvents.value
    .filter((ev) => ev.fromDate === dateStr)
    .map((ev) => ev._ts)
    .filter(Boolean)
}

function openTimesheetForm(date) {
  timesheetFormDate.value = date || new Date().toISOString().slice(0, 10)
  timesheetFormStatus.value = 'Draft'
  timesheetFormItems.value = [{ activity_type: 'Task', project: '', task: '', from_time: '', to_time: '', description: '' }]
  timesheetFormOpen.value = true
}

function addTsFormItem() {
  timesheetFormItems.value.push({ activity_type: 'Task', project: '', task: '', from_time: '', to_time: '', description: '' })
}

function removeTsFormItem(idx) {
  timesheetFormItems.value.splice(idx, 1)
}

async function submitTimesheet() {
  timesheetFormSaving.value = true
  try {
    const items = timesheetFormItems.value.filter((item) => item.from_time && item.to_time)
    await saveTimesheet(timesheetFormDate.value, items, timesheetFormStatus.value)
    timesheetFormOpen.value = false
    await loadTimesheetList()
    if (selectedTimesheet.value) {
      await loadTimesheetCalendar(selectedTimesheet.value.user)
    }
  } catch (e) {
    console.error('Failed to save timesheet', e)
  } finally {
    timesheetFormSaving.value = false
  }
}

async function deleteTimesheetConfirm(ts) {
  if (!ts || !ts.name) return
  try {
    await deleteTimesheet(ts.name)
    if (selectedTimesheet.value && selectedTimesheet.value.name === ts.name) {
      backToTimesheetList()
    }
    await loadTimesheetList()
  } catch (e) {
    console.error('Failed to delete timesheet', e)
  }
}

// Load bootstrap data
async function loadData() {
  loading.value = true
  try {
    const data = await fetchBootstrap()
    tasks.value = data.tasks || []
    projects.value = data.projects || []
    people.value = data.people || []
    if (data.teams && data.teams.length > 0) {
      teams.value = data.teams
    }
    if (data.team_members && data.team_members.length > 0) {
      teamMembers.value = data.team_members
    }
    statuses.value = data.statuses || statuses.value
    priorities.value = data.priorities || priorities.value
    if (data.me) {
      currentUserEmail.value = data.me.email || ''
    }
  } catch (e) {
    console.error('Failed to load tasks', e)
  } finally {
    loading.value = false
  }
}

// Load teams and team members from backend
async function loadTeams() {
  teamLoading.value = true
  try {
    const [teamsData, membersData] = await Promise.all([
      fetchTeams(),
      fetchTeamMembers('all'),
    ])
    teams.value = teamsData || []
    teamMembers.value = membersData || []
  } catch (e) {
    console.error('Failed to load teams', e)
  } finally {
    teamLoading.value = false
  }
}

// Load employees for member selection
async function loadEmployees() {
  try {
    employees.value = await fetchEmployees()
  } catch (e) {
    console.error('Failed to load employees', e)
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
  try {
    const res = await saveTask(updatedTask)
    if (res && res.id) {
      const freshIdx = tasks.value.findIndex((t) => t.id === updatedTask.id)
      if (freshIdx !== -1) {
        tasks.value.splice(freshIdx, 1, { ...tasks.value[freshIdx], ...res })
      }
    }
    toast.success('Task saved successfully')
    return res
  } catch (err) {
    const msg = getErrorMessage(err, 'Failed to save task')
    toast.error(msg)
    throw err
  }
}

async function onCreateTask(formData) {
  const assigneeList = Array.isArray(formData.assignees) && formData.assignees.length > 0
    ? formData.assignees.map((a) => (typeof a === 'object' ? (a.value || a.user_id || a.user || a.email) : a)).filter(Boolean)
    : (formData.assigned_to ? [formData.assigned_to] : [])
  const newTask = {
    title: formData.title,
    project: formData.project || '',
    team: formData.team || '',
    status: formData.status || 'Open',
    priority: formData.priority || 'Medium',
    description: formData.description || '',
    due_date: formData.due_date || '',
    estimated_hours: 8,
    assignees: assigneeList,
  }

  try {
    const result = await saveTask(newTask)
    if (result && result.id) {
      const savedTask = {
        id: result.id,
        title: result.title || formData.title,
        project: result.project || formData.project || '',
        team: result.team || formData.team || '',
        status: result.status || 'Open',
        priority: result.priority || 'Medium',
        task_type: result.task_type || 'Task',
        assignees: result.assignees || assigneeList,
        reporter: fullName.value,
        due_date: result.due || formData.due_date || '',
        description: result.description || formData.description || '',
        estimated_hours: result.estimated_hours || 8,
        logged_hours: 0,
        starred: false,
        comments: [],
        creation: result.creation || new Date().toISOString(),
        modified: result.modified || new Date().toISOString(),
        modified_pretty: 'Just now',
      }
      tasks.value.unshift(savedTask)
      toast.success('Task created successfully')
      return savedTask
    }
  } catch (err) {
    const msg = getErrorMessage(err, 'Failed to create task')
    toast.error(msg)
    throw err
  }
}

async function onDeleteTask(taskId) {
  if (!taskId) return
  try {
    await deleteTask(taskId)
    const idx = tasks.value.findIndex((t) => t.id === taskId)
    if (idx !== -1) {
      tasks.value.splice(idx, 1)
    }
    if (activeTask.value && activeTask.value.id === taskId) {
      activeTask.value = null
      detailModalOpen.value = false
    }
    toast.success('Task deleted successfully')
  } catch (err) {
    const msg = getErrorMessage(err, 'Failed to delete task')
    toast.error(msg)
    throw err
  }
}

function toggleStar(row) {
  row.starred = !row.starred
}

// --- Team CRUD State & Functions ---
const teamRoleOptions = ['Team Lead', 'Project Manager', 'Team Member', 'Viewer', 'Auditor', 'Coordinator']

const employeeOptions = computed(() => {
  return (employees.value || []).map((emp) => ({
    value: emp.name,
    label: emp.employee_name || emp.name,
  }))
})

const teamOptions = computed(() => {
  return (teams.value || []).map((t) => ({
    value: t.name,
    label: t.team_name || t.name,
  }))
})

// Create Team (simple popup)
const createTeamOpen = ref(false)
const newTeamName = ref('')

function openCreateTeam() {
  newTeamName.value = ''
  createTeamOpen.value = true
}

async function submitCreateTeam() {
  const name = (newTeamName.value || '').trim()
  if (!name) return
  try {
    await createTeam({ team_name: name })
    createTeamOpen.value = false
    await loadTeams()
  } catch (e) {
    console.error('Failed to create team', e)
  }
}

// Add Member dialog
const addMemberOpen = ref(false)
const memberLoading = ref(false)
const memberSubmitted = ref(false)
const memberSubmitError = ref('')
const empSearch = ref('')
const empDropdownOpen = ref(false)

const memberForm = reactive({
  employee: '',
  team: '',
  team_role: 'Team Member',
  access_level: 'Operate',
})

const filteredEmployees = computed(() => {
  const q = (empSearch.value || '').toLowerCase().trim()
  let list = employees.value || []
  if (q) {
    list = list.filter((emp) => {
      const name = (emp.employee_name || emp.name || '').toLowerCase()
      const desig = (emp.designation || '').toLowerCase()
      const dept = (emp.department || '').toLowerCase()
      return name.includes(q) || desig.includes(q) || dept.includes(q)
    })
  }
  return list.slice(0, 20)
})

const teamMemberEmployeeIds = computed(() => {
  return new Set(
    (teamMembers.value || [])
      .filter((m) => m.team === memberForm.team && m.is_active)
      .map((m) => m.employee)
      .filter(Boolean)
  )
})

const selectedMember = ref(null)
const calendarEvents = ref([])
const calendarLoading = ref(false)
const selectedDayEntries = ref([])
const selectedDayDate = ref('')

function selectMember(member) {
  selectedMember.value = member
  calendarEvents.value = []
  if (member) {
    loadMemberTimesheets(member)
    // Push member into URL
    try {
      const url = new URL(window.location.href)
      url.searchParams.set('member', member.email || member.name)
      window.history.pushState(null, '', url.toString())
    } catch {}
  }
}

function backToList() {
  selectedMember.value = null
  calendarEvents.value = []
  // Remove member from URL
  try {
    const url = new URL(window.location.href)
    url.searchParams.delete('member')
    window.history.pushState(null, '', url.toString())
  } catch {}
}

async function loadMemberTimesheets(member) {
  if (!member || !member.email) return
  calendarLoading.value = true
  try {
    const year = new Date().getFullYear()
    const month = new Date().getMonth()
    const fromDate = `${year}-${String(month + 1).padStart(2, '0')}-01`
    const lastDay = new Date(year, month + 1, 0).getDate()
    const toDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
    const data = await fetchMemberTimesheets(member.email, fromDate, toDate)
    calendarEvents.value = (data || []).map((ts) => ({
      id: ts.name,
      title: `${ts.total_hours}h logged`,
      fromDate: ts.date,
      toDate: ts.date,
      fromTime: '00:00',
      toTime: '23:59',
      isFullDay: true,
      color: ts.status === 'Submitted' ? 'green' : 'blue',
      _ts: ts,
      _hours: ts.total_hours || 0,
    }))
  } catch (e) {
    console.error('Failed to load timesheets', e)
    calendarEvents.value = []
  } finally {
    calendarLoading.value = false
  }
}

function handleCalendarClick(dateStr) {
  selectedDayDate.value = dateStr
  selectedDayEntries.value = calendarEvents.value
    .filter((ev) => ev.fromDate === dateStr)
    .map((ev) => ev._ts)
    .filter(Boolean)
}

function getMemberRoleBadgeClass(role) {
  switch (role) {
    case 'Team Lead': return 'bg-amber-50 text-amber-700 border-amber-200'
    case 'Project Manager': return 'bg-blue-50 text-blue-700 border-blue-200'
    case 'Coordinator': return 'bg-purple-50 text-purple-700 border-purple-200'
    case 'Viewer': return 'bg-gray-100 text-gray-600 border-gray-200'
    case 'Auditor': return 'bg-indigo-50 text-indigo-700 border-indigo-200'
    default: return 'bg-green-50 text-green-700 border-green-200'
  }
}

const memberErrors = computed(() => {
  if (!memberSubmitted.value) return {}
  const e = {}
  if (!memberForm.team) e.team = 'Team is required.'
  else if (!memberForm.employee) e.employee = 'Employee is required.'
  return e
})

const memberFormValid = computed(() => !memberErrors.value.team && !memberErrors.value.employee)

const selectedEmployee = computed(() => {
  if (!memberForm.employee) return null
  return (employees.value || []).find((emp) => emp.name === memberForm.employee) || null
})

const accessLevelOptions = [
  { label: 'View', value: 'View' },
  { label: 'Operate', value: 'Operate' },
  { label: 'Manage', value: 'Manage' },
  { label: 'Admin', value: 'Admin' },
]

function openAddMember() {
  Object.assign(memberForm, {
    employee: '',
    team: selectedTeam.value ? selectedTeam.value.name : '',
    team_role: 'Team Member',
    access_level: 'Operate',
  })
  memberSubmitted.value = false
  memberSubmitError.value = ''
  empSearch.value = ''
  empDropdownOpen.value = false
  addMemberOpen.value = true
  loadEmployees()
}

function resetMemberForm() {
  Object.assign(memberForm, {
    employee: '',
    team: '',
    team_role: 'Team Member',
    access_level: 'Operate',
  })
  memberSubmitted.value = false
  memberSubmitError.value = ''
  empSearch.value = ''
  empDropdownOpen.value = false
}

function onMemberTeamChange(val) {
  memberForm.team = val
  memberForm.employee = ''
  memberSubmitted.value = false
  memberSubmitError.value = ''
  empSearch.value = ''
  empDropdownOpen.value = false
  if (val) {
    loadTeamMembersForTeam(val)
  }
}

function selectEmployee(emp) {
  memberForm.employee = emp.name
  empSearch.value = ''
  empDropdownOpen.value = false
  memberSubmitted.value = false
  memberSubmitError.value = ''
}

async function submitAddMember() {
  memberSubmitted.value = true
  memberSubmitError.value = ''
  if (!memberFormValid.value) return
  memberLoading.value = true
  const keepTeam = memberForm.team
  try {
    await addTeamMember(
      memberForm.team,
      memberForm.employee,
      memberForm.team_role,
      memberForm.access_level,
    )
    addMemberOpen.value = false
    resetMemberForm()
    await loadTeams()
    // Keep same team selected after adding
    if (keepTeam) {
      const team = teams.value.find((t) => t.name === keepTeam)
      if (team) {
        selectedTeam.value = team
        await loadTeamMembersForTeam(team.name)
      }
    }
  } catch (e) {
    memberSubmitError.value = e?.message || 'Failed to add member. They may already be in this team.'
  } finally {
    memberLoading.value = false
  }
}

async function deleteTeamConfirm(team) {
  if (!team || !team.name) return
  try {
    await deleteTeam(team.name)
    if (selectedTeam.value && selectedTeam.value.name === team.name) {
      selectedTeam.value = null
    }
    await loadTeams()
  } catch (e) {
    console.error('Failed to delete team', e)
  }
}

function selectTeam(team) {
  if (selectedTeam.value && selectedTeam.value.name === team.name) {
    selectedTeam.value = null
    loadTeams()
  } else {
    selectedTeam.value = team
    loadTeamMembersForTeam(team.name)
  }
}

function selectAllTeams() {
  if (selectedTeam.value) {
    selectedTeam.value = null
    loadTeams()
  }
}

async function loadTeamMembersForTeam(teamName) {
  teamLoading.value = true
  try {
    const data = await fetchTeamMembers(teamName)
    teamMembers.value = data || []
  } catch (e) {
    console.error('Failed to load team members', e)
  } finally {
    teamLoading.value = false
  }
}

onMounted(() => {
  window.addEventListener('popstate', onPopState)
  loadData()
  loadTeams()
  loadTimesheetList()
})

onUnmounted(() => {
  window.removeEventListener('popstate', onPopState)
})
</script>

<template>
  <div class="h-screen w-full bg-surface-base text-ink-gray-9 antialiased">
    <DesktopShell :scroll="false">
      <!-- Collapsable Sidebar Slot (No icon-rail, exactly Task, Timesheet, Project, Team) -->
      <template #sidebar>
        <Sidebar
          v-model:collapsed="isSidebarCollapsed"
          width="15rem"
          collapsed-width="4.25rem"
          class="border-r border-outline-gray-2 bg-surface-base flex flex-col h-full"
        >
          <!-- Sidebar Header: Brand & Collapse Toggle -->
          <div
            class="flex h-14 items-center border-b border-outline-gray-1 transition-all"
            :class="isSidebarCollapsed ? 'justify-center px-1' : 'justify-between px-3'"
          >
            <div
              class="flex items-center gap-2.5 overflow-hidden"
              :class="{ 'justify-center w-full cursor-pointer': isSidebarCollapsed }"
              :title="isSidebarCollapsed ? 'Click to expand sidebar' : ''"
              @click="isSidebarCollapsed ? (isSidebarCollapsed = false) : null"
            >
              <div class="flex size-8 shrink-0 items-center justify-center rounded-lg bg-black text-white font-bold text-xs shadow-xs select-none">
                TF
              </div>
              <div v-if="!isSidebarCollapsed" class="flex flex-col truncate transition-opacity">
                <span class="text-sm font-bold tracking-tight text-ink-gray-9 leading-tight">Taskflow</span>
                <span class="text-[11px] text-ink-gray-5 leading-tight">Workspace</span>
              </div>
            </div>

            <!-- Collapse Toggle Button (Shown when expanded) -->
            <button
              v-if="!isSidebarCollapsed"
              type="button"
              class="flex size-7 items-center justify-center rounded-md text-ink-gray-5 hover:bg-surface-gray-2 hover:text-ink-gray-8 transition shrink-0 cursor-pointer"
              title="Collapse sidebar"
              @click="isSidebarCollapsed = true"
            >
              <PanelLeftClose class="size-4" />
            </button>
          </div>

          <!-- Navigation Items: Only Task, Timesheet, Project, Team with Icons -->
          <ScrollArea class="min-h-0 flex-1" :viewport-class="isSidebarCollapsed ? 'px-1 pt-2 pb-6' : 'px-2 pt-3 pb-6'">
            <nav class="space-y-1">
              <!-- Collapsed Mode: Centered icon with small label underneath -->
              <template v-if="isSidebarCollapsed">
                <button
                  v-for="item in navItems"
                  :key="item.id"
                  type="button"
                  :title="item.label"
                  :class="[
                    'w-full flex flex-col items-center justify-center py-2 px-0.5 mb-1 rounded-lg cursor-pointer transition-all duration-150 select-none relative group',
                    activeSection === item.id
                      ? 'bg-gray-100 text-gray-950 font-semibold shadow-xs border border-gray-200/80'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 border border-transparent'
                  ]"
                  @click="activeSection = item.id"
                >
                  <component
                    :is="item.icon"
                    class="size-4 shrink-0 transition-colors"
                    :class="activeSection === item.id ? 'text-gray-950 stroke-[2.2]' : 'text-gray-500 group-hover:text-gray-800'"
                  />
                  <span
                    class="text-[10px] leading-tight mt-1 text-center truncate max-w-full font-medium"
                    :class="activeSection === item.id ? 'text-gray-950 font-semibold' : 'text-gray-500 group-hover:text-gray-700'"
                  >
                    {{ item.label }}
                  </span>
                  <span
                    v-if="item.badge"
                    class="absolute top-1 right-1.5 size-1.5 rounded-full bg-blue-600"
                  />
                </button>
              </template>

              <!-- Expanded Mode: Standard SidebarItem with row layout -->
              <template v-else>
                <SidebarItem
                  v-for="item in navItems"
                  :key="item.id"
                  :active="activeSection === item.id"
                  :icon="item.icon"
                  :class="[
                    '!h-9 cursor-pointer transition-all duration-150 mb-1 rounded-lg',
                    activeSection === item.id
                      ? '!bg-gray-100 !text-gray-950 font-semibold shadow-xs border border-gray-200/80'
                      : 'text-gray-600 hover:!bg-gray-50 hover:!text-gray-900 border border-transparent'
                  ]"
                  @click="activeSection = item.id"
                >
                  <template #prefix>
                    <component
                      :is="item.icon"
                      class="size-4 shrink-0 transition-colors"
                      :class="activeSection === item.id ? 'text-gray-950 stroke-[2.2]' : 'text-gray-500'"
                    />
                  </template>
                  <span
                    class="flex-1 truncate text-sm"
                    :class="activeSection === item.id ? 'font-semibold text-gray-950' : 'font-medium text-gray-600'"
                  >
                    {{ item.label }}
                  </span>
                  <template #suffix>
                    <span
                      v-if="item.badge !== undefined"
                      class="mr-1 px-2 py-0.5 rounded-full text-[11px] font-semibold transition-colors"
                      :class="activeSection === item.id ? 'bg-gray-200 text-gray-900 font-bold' : 'bg-gray-100 text-gray-500'"
                    >
                      {{ item.badge }}
                    </span>
                  </template>
                </SidebarItem>
              </template>
            </nav>
          </ScrollArea>

          <!-- Sidebar Footer (User Account & Settings) -->
          <div class="p-2 border-t border-outline-gray-1 bg-surface-base">
            <Dropdown :options="userMenu">
              <template #trigger="{ open }">
                <button
                  type="button"
                  class="flex w-full items-center gap-2.5 rounded-lg p-1.5 hover:bg-surface-gray-1 transition text-left cursor-pointer"
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
                  <ChevronUp
                    v-if="!isSidebarCollapsed"
                    class="size-3.5 text-ink-gray-4 shrink-0"
                  />
                </button>
              </template>
            </Dropdown>
          </div>
        </Sidebar>
      </template>

      <!-- Pinned Page Header -->
      <PageHeader class="border-b border-outline-gray-2 bg-surface-base">
        <div class="flex items-center gap-3">
          <!-- Sidebar Toggle Button in Header -->
          <Button
            variant="ghost"
            :title="isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'"
            @click="isSidebarCollapsed = !isSidebarCollapsed"
          >
            <template #icon>
              <PanelLeftOpen v-if="isSidebarCollapsed" class="size-4 text-gray-600" />
              <PanelLeftClose v-else class="size-4 text-gray-600" />
            </template>
          </Button>

          <!-- Breadcrumbs for current section -->
          <Breadcrumbs :items="currentBreadcrumbs" />
        </div>

        <div class="flex items-center gap-2">
          <!-- Add Task Button (in Task view) -->
          <Button
            v-if="activeSection === 'Task'"
            variant="solid"
            theme="gray"
            label="Add task"
            class="bg-gray-900 hover:bg-black text-white"
            @click="createModalOpen = true"
          >
            <template #prefix>
              <Plus class="size-4 mr-0.5" />
            </template>
          </Button>

          <!-- Refresh Button -->
          <Button
            variant="ghost"
            title="Refresh"
            :loading="loading"
            @click="loadData"
          >
            <template #icon>
              <RefreshCw
                class="size-4 text-gray-700 hover:text-gray-950 transition-colors"
                :class="{ 'animate-spin': loading }"
              />
            </template>
          </Button>
        </div>
      </PageHeader>

      <!-- Main Body Container: Full height flex layout, no page scroll -->
      <div class="w-full flex-1 min-h-0 flex flex-col px-3 pt-2 pb-2 overflow-hidden">
        <!-- 1. TASK VIEW -->
        <template v-if="activeSection === 'Task'">
          <!-- Sub-Header Tabs & Task Count (Locked sticky filter header) -->
          <div class="shrink-0 pb-2 mb-2 bg-white flex flex-wrap items-center justify-between gap-2 border-b border-outline-gray-1">
            <div class="flex items-center gap-2">
              <div class="flex items-center gap-1.5">
                <Switch v-model="showAssignedToMe" />
                <span class="text-xs font-medium text-gray-700 select-none cursor-pointer" @click="showAssignedToMe = !showAssignedToMe">Assigned to Me</span>
              </div>
              <div class="w-px h-4 bg-gray-300"></div>
              <TabButtons
                v-model="statusTab"
                :options="statusOptions"
              />
            </div>
            <div class="flex items-center gap-3 text-xs font-medium text-ink-gray-6">
              <MultiSelect
                v-model="selectedProjects"
                :options="projectOptions"
                placeholder="Select Project"
                class="w-64"
              />
              <span class="whitespace-nowrap">{{ visibleTasks.length }} tasks</span>
            </div>
          </div>

          <!-- Tasks List Table View: Fills remaining height, rows scroll under sticky thead -->
          <div class="flex-1 min-h-0 flex flex-col overflow-hidden outline-none focus:outline-none ring-0">
            <CommonListView
              v-model:selectedRows="selectedRowKeys"
              :columns="tableColumns"
              :rows="paginatedTableTasks"
              :loading="loading"
              :sort-key="sortKey"
              :sort-order="sortOrder"
              :pagination="paginationInfo"
              :row-class="getTaskRowClass"
              @row-click="openDetail"
              @sort-change="handleSortChange"
              @load-more="handleLoadMore"
              @load-all="handleLoadAll"
            >
              <template #cell-id="{ row }">
                <span
                  class="font-mono font-semibold text-ink-gray-8 hover:text-[#417c7d] hover:underline cursor-pointer"
                  @click.stop="openDetail(row)"
                >
                  {{ row.id }}
                </span>
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
                <span class="text-xs font-medium text-gray-700 truncate block max-w-[140px]" :title="row.project">
                  {{ row.project }}
                </span>
              </template>

              <template #cell-status="{ row }">
                <Badge :theme="statusThemeMap[row.status] || 'gray'" class="justify-self-start">
                  <template #prefix>
                    <span class="size-1 rounded-full" :class="statusDotClassMap[row.status] || 'bg-surface-gray-8'" />
                  </template>
                  {{ row.status }}
                </Badge>
              </template>

              <template #cell-priority="{ row }">
                <span
                  v-if="row.priority"
                  class="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border select-none"
                  :class="getPriorityBadgeClass(row.priority)"
                >
                  {{ row.priority }}
                </span>
                <span v-else class="text-ink-gray-4">—</span>
              </template>

              <template #cell-assigned_to="{ row }">
                <div v-if="row.assignees && row.assignees.length" class="flex items-center">
                  <div class="flex -space-x-1.5">
                    <Tooltip
                      v-for="a in row.assignees.slice(0, 3)"
                      :key="a.user_id"
                      :text="a.name"
                    >
                      <Avatar
                        :image="a.image"
                        :label="a.name"
                        size="sm"
                      />
                    </Tooltip>
                    <div
                      v-if="row.assignees.length > 3"
                      class="relative flex items-center justify-center size-7 rounded-full bg-gray-100 text-[10px] font-bold text-gray-600"
                    >
                      +{{ row.assignees.length - 3 }}
                    </div>
                  </div>
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
                  class="text-xs font-medium whitespace-nowrap inline-flex items-center gap-1.5"
                  :class="isRowJustNow(row) ? 'text-emerald-700 font-bold' : 'text-ink-gray-6'"
                  :title="row.modified ? `Modified: ${row.modified}` : ''"
                >
                  <span
                    v-if="isRowJustNow(row)"
                    class="size-2 rounded-full bg-emerald-500 shrink-0 animate-pulse"
                  />
                  {{ formatPrettyDate(row) }}
                </span>
              </template>
            </CommonListView>
          </div>
        </template>

        <!-- 2. TIMESHEET VIEW (List view only) -->
        <template v-else-if="activeSection === 'Timesheet'">
          <div class="shrink-0 mb-3 flex items-center justify-between">
            <div>
              <h2 class="text-lg font-bold text-ink-gray-9">Timesheet</h2>
              <p class="text-xs text-ink-gray-5">
                Log and track your daily work hours
                <span v-if="selectedTimesheet" class="text-blue-600 font-medium">
                  — {{ selectedTimesheet.employee_name || selectedTimesheet.user }}
                </span>
              </p>
            </div>
            <div class="flex items-center gap-2">
              <span class="text-xs text-ink-gray-5 font-medium">{{ timesheetListData.length }} entries</span>
              <Button
                v-if="!selectedTimesheet"
                variant="solid"
                theme="gray"
                label="Log Hours"
                class="bg-gray-900 hover:bg-black text-white"
                @click="openTimesheetForm()"
              >
                <template #prefix><Plus class="size-3.5" /></template>
              </Button>
            </div>
          </div>

          <div class="flex-1 min-h-0 flex flex-col overflow-hidden outline-none focus:outline-none ring-0">
            <!-- Empty state -->
            <div
              v-if="!selectedTimesheet && !timesheetListLoading && timesheetListData.length === 0"
              class="flex-1 flex flex-col items-center justify-center text-center py-12"
            >
              <div class="size-14 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
                <Clock class="size-7 text-gray-400" />
              </div>
              <p class="text-sm font-semibold text-gray-700 mb-1">No timesheets yet</p>
              <p class="text-xs text-gray-400 mb-4 max-w-xs">Start logging your work hours for this month.</p>
              <Button variant="solid" theme="gray" label="Log Hours" class="bg-gray-900 hover:bg-black text-white" @click="openTimesheetForm()">
                <template #prefix><Plus class="size-3.5" /></template>
              </Button>
            </div>

            <!-- Timesheet list -->
            <div v-else-if="!selectedTimesheet" class="flex-1 min-h-0 overflow-auto">
              <CommonListView
                v-model:selectedRows="selectedTimesheetKeys"
                :columns="timesheetColumns"
                :rows="timesheetListData"
                :loading="timesheetListLoading"
                @row-click="(row) => selectTimesheet(row)"
              >
                <template #cell-employee_name="{ row }">
                  <span class="font-medium text-ink-gray-9">{{ row.employee_name || row.user }}</span>
                </template>

                <template #cell-timesheet_date="{ row }">
                  <span class="font-mono text-xs text-ink-gray-7">{{ row.timesheet_date }}</span>
                </template>

                <template #cell-total_working_hours="{ row }">
                  <span class="text-xs font-bold text-ink-gray-8">{{ row.total_working_hours }}h</span>
                </template>

                <template #cell-status="{ row }">
                  <Badge
                    :theme="row.status === 'Submitted' ? 'green' : 'blue'"
                    variant="subtle"
                    size="sm"
                  >
                    {{ row.status }}
                  </Badge>
                </template>
              </CommonListView>
            </div>

            <!-- Timesheet detail: list + calendar + activity log -->
            <div v-else class="flex-1 min-h-0 flex overflow-hidden">
              <!-- Profile card (260px) -->
              <div class="w-[260px] shrink-0 overflow-y-auto border-r border-gray-200 bg-white">
                <div class="py-5 px-5">
                  <button
                    type="button"
                    class="inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-gray-700 mb-4 cursor-pointer transition"
                    @click="backToTimesheetList"
                  >
                    <svg class="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
                    Back to list
                  </button>

                  <div class="flex flex-col items-center text-center mb-5">
                    <div class="size-20 rounded-full bg-gray-100 overflow-hidden shadow-md mb-3">
                      <Avatar
                        :label="selectedTimesheet.employee_name || selectedTimesheet.user"
                        size="3xl"
                        shape="circle"
                        class="size-20"
                      />
                    </div>
                    <h3 class="text-base font-bold text-gray-900 leading-tight">{{ selectedTimesheet.employee_name || selectedTimesheet.user }}</h3>
                    <p class="text-xs text-gray-500 mt-0.5">{{ selectedTimesheet.user }}</p>
                    <Badge
                      :theme="selectedTimesheet.status === 'Submitted' ? 'green' : 'blue'"
                      variant="subtle"
                      size="sm"
                      class="mt-2"
                    >
                      {{ selectedTimesheet.status }}
                    </Badge>
                  </div>

                  <div class="grid grid-cols-2 gap-2.5 mb-5">
                    <div class="text-center p-2.5 bg-gray-50 rounded-lg">
                      <p class="text-lg font-bold text-gray-900">{{ selectedTimesheet.total_working_hours || 0 }}h</p>
                      <p class="text-[10px] text-gray-500">Total</p>
                    </div>
                    <div class="text-center p-2.5 bg-gray-50 rounded-lg">
                      <p class="text-lg font-bold text-gray-900">{{ selectedTimesheet.timesheet_date }}</p>
                      <p class="text-[10px] text-gray-500">Date</p>
                    </div>
                  </div>

                  <div class="flex gap-2">
                    <button
                      type="button"
                      class="flex-1 px-3 py-2 text-xs font-medium bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition cursor-pointer border border-blue-200"
                      @click="openTimesheetForm(selectedTimesheet.timesheet_date)"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      class="flex-1 px-3 py-2 text-xs font-medium bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition cursor-pointer border border-red-200"
                      @click="deleteTimesheetConfirm(selectedTimesheet)"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>

              <!-- Calendar + Activity log (50/50) -->
              <div class="flex-1 min-w-0 flex overflow-hidden">
                <!-- Calendar (50%) -->
                <div class="w-1/2 min-w-0 flex flex-col overflow-hidden bg-white border-r border-gray-200">
                  <TimesheetCalendar
                    :events="timesheetCalendarEvents"
                    :loading="timesheetCalendarLoading"
                    @cellClick="handleTsCalendarClick"
                    class="flex-1 min-h-0"
                  />
                </div>

                <!-- Activity list (50%) -->
                <div class="w-1/2 min-w-0 flex flex-col overflow-hidden bg-white">
                  <div class="shrink-0 px-4 py-2.5 border-b border-gray-200 flex items-center justify-between">
                    <div>
                      <h4 class="text-xs font-bold text-gray-700 uppercase tracking-wide">Activity Log</h4>
                      <p v-if="selectedTsDayDate" class="text-[11px] text-gray-500 mt-0.5">{{ selectedTsDayDate }}</p>
                    </div>
                    <button
                      v-if="selectedTsDayDate"
                      type="button"
                      class="text-[10px] font-medium text-blue-600 hover:text-blue-700 cursor-pointer transition"
                      @click="openTimesheetForm(selectedTsDayDate)"
                    >
                      + Add Entry
                    </button>
                  </div>

                  <!-- Placeholder -->
                  <div v-if="!selectedTsDayDate" class="flex-1 flex flex-col items-center justify-center text-center px-4">
                    <div class="size-10 rounded-xl bg-gray-100 flex items-center justify-center mb-3">
                      <Clock class="size-5 text-gray-400" />
                    </div>
                    <p class="text-xs font-semibold text-gray-600 mb-1">Select a timesheet day</p>
                    <p class="text-[10px] text-gray-400">Click on any day in the calendar to view work entries</p>
                  </div>

                  <!-- No entries -->
                  <div v-else-if="selectedTsDayEntries.length === 0" class="flex flex-col items-center justify-center text-center px-4 py-10">
                    <div class="size-10 rounded-xl bg-red-50 flex items-center justify-center mb-3">
                      <Clock class="size-5 text-red-400" />
                    </div>
                    <p class="text-xs font-semibold text-gray-600 mb-1">No timesheet logged</p>
                    <p class="text-[10px] text-gray-400">No work entries found for this day</p>
                  </div>

                  <!-- Entries -->
                  <div v-else class="flex-1 overflow-y-auto">
                    <div v-for="(ts, tIdx) in selectedTsDayEntries" :key="ts.name || tIdx" class="px-4 py-3 border-b border-gray-50 last:border-b-0">
                      <div class="flex items-center justify-between mb-2">
                        <div class="flex items-center gap-2">
                          <span class="text-[11px] font-bold text-gray-800">{{ ts.name }}</span>
                          <Badge :theme="ts.status === 'Submitted' ? 'green' : 'blue'" variant="subtle" size="sm">{{ ts.status }}</Badge>
                        </div>
                        <span class="text-[11px] font-bold text-green-600">{{ ts.total_hours }}h</span>
                      </div>
                      <div class="space-y-1.5">
                        <div
                          v-for="(item, iIdx) in ts.items"
                          :key="iIdx"
                          class="flex items-center gap-2 text-[10px] bg-gray-50 rounded-lg px-2.5 py-2"
                        >
                          <span
                            class="inline-flex px-1.5 py-0.5 rounded text-[8px] font-semibold border shrink-0"
                            :class="{
                              'bg-blue-50 text-blue-700 border-blue-200': item.activity_type === 'Task',
                              'bg-amber-50 text-amber-700 border-amber-200': item.activity_type === 'Meeting',
                              'bg-purple-50 text-purple-700 border-purple-200': item.activity_type === 'Research',
                            }"
                          >
                            {{ item.activity_type }}
                          </span>
                          <div class="min-w-0 flex-1">
                            <span v-if="item.project" class="text-gray-700 font-medium truncate block">{{ item.project }}</span>
                            <span v-if="item.task" class="text-gray-500 truncate block">/ {{ item.task }}</span>
                          </div>
                          <span class="text-gray-700 font-bold shrink-0">{{ item.hrs }}h</span>
                          <span class="text-gray-400 shrink-0">
                            {{ item.from_time?.slice(11, 16) }} – {{ item.to_time?.slice(11, 16) }}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Timesheet Form Modal -->
          <teleport to="body">
            <transition
              enter-active-class="transition-opacity duration-150"
              leave-active-class="transition-opacity duration-100"
              enter-from-class="opacity-0"
              leave-to-class="opacity-0"
            >
              <div v-if="timesheetFormOpen" class="fixed inset-0 z-50 flex items-center justify-center p-4">
                <div class="absolute inset-0 bg-black/30" @click="timesheetFormOpen = false" />
                <div class="relative bg-white rounded-xl shadow-2xl border border-gray-200 w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
                  <!-- Header -->
                  <div class="flex items-center justify-between px-5 py-3.5 border-b border-gray-100 shrink-0">
                    <h3 class="text-sm font-bold text-gray-900">Log Timesheet</h3>
                    <button type="button" class="inline-flex items-center justify-center size-7 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition cursor-pointer" @click="timesheetFormOpen = false">
                      <svg class="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
                    </button>
                  </div>

                  <!-- Body -->
                  <div class="overflow-y-auto flex-1 px-5 py-4 space-y-4">
                    <!-- Date + Status -->
                    <div class="grid grid-cols-2 gap-3">
                      <div>
                        <label class="text-xs font-semibold text-gray-700 mb-1 block">Date</label>
                        <input type="date" v-model="timesheetFormDate" class="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition" />
                      </div>
                      <div>
                        <label class="text-xs font-semibold text-gray-700 mb-1 block">Status</label>
                        <select v-model="timesheetFormStatus" class="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition">
                          <option value="Draft">Draft</option>
                          <option value="Submitted">Submitted</option>
                        </select>
                      </div>
                    </div>

                    <!-- Items -->
                    <div>
                      <div class="flex items-center justify-between mb-2">
                        <label class="text-xs font-semibold text-gray-700">Time Entries</label>
                        <button type="button" class="text-[10px] font-medium text-blue-600 hover:text-blue-700 cursor-pointer transition" @click="addTsFormItem">+ Add Row</button>
                      </div>
                      <div v-for="(item, idx) in timesheetFormItems" :key="idx" class="bg-gray-50 rounded-lg p-3 mb-2 border border-gray-100">
                        <div class="grid grid-cols-3 gap-2 mb-2">
                          <div>
                            <label class="text-[10px] text-gray-500 mb-0.5 block">Activity</label>
                            <select v-model="item.activity_type" class="w-full text-xs border border-gray-200 rounded px-2 py-1.5 outline-none focus:ring-1 focus:ring-blue-200">
                              <option value="Task">Task</option>
                              <option value="Meeting">Meeting</option>
                              <option value="Research">Research</option>
                            </select>
                          </div>
                          <div>
                            <label class="text-[10px] text-gray-500 mb-0.5 block">Project</label>
                            <input v-model="item.project" type="text" class="w-full text-xs border border-gray-200 rounded px-2 py-1.5 outline-none focus:ring-1 focus:ring-blue-200" placeholder="Project name" />
                          </div>
                          <div>
                            <label class="text-[10px] text-gray-500 mb-0.5 block">Task ID</label>
                            <input v-model="item.task" type="text" class="w-full text-xs border border-gray-200 rounded px-2 py-1.5 outline-none focus:ring-1 focus:ring-blue-200" placeholder="TFT-XXXXX" />
                          </div>
                        </div>
                        <div class="grid grid-cols-2 gap-2 mb-2">
                          <div>
                            <label class="text-[10px] text-gray-500 mb-0.5 block">From</label>
                            <input v-model="item.from_time" type="datetime-local" class="w-full text-xs border border-gray-200 rounded px-2 py-1.5 outline-none focus:ring-1 focus:ring-blue-200" />
                          </div>
                          <div>
                            <label class="text-[10px] text-gray-500 mb-0.5 block">To</label>
                            <input v-model="item.to_time" type="datetime-local" class="w-full text-xs border border-gray-200 rounded px-2 py-1.5 outline-none focus:ring-1 focus:ring-blue-200" />
                          </div>
                        </div>
                        <div class="flex items-center justify-between">
                          <input v-model="item.description" type="text" class="flex-1 text-[10px] border border-gray-200 rounded px-2 py-1 outline-none focus:ring-1 focus:ring-blue-200 mr-2" placeholder="Description (optional)" />
                          <button v-if="timesheetFormItems.length > 1" type="button" class="text-red-400 hover:text-red-600 cursor-pointer transition text-[10px]" @click="removeTsFormItem(idx)">Remove</button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <!-- Footer -->
                  <div class="shrink-0 px-5 py-3 border-t border-gray-100 flex items-center justify-end gap-2">
                    <button type="button" class="px-4 py-2 text-xs font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition cursor-pointer" @click="timesheetFormOpen = false">Cancel</button>
                    <button type="button" class="px-4 py-2 text-xs font-medium text-white bg-gray-900 rounded-lg hover:bg-black transition cursor-pointer disabled:opacity-50" :disabled="timesheetFormSaving" @click="submitTimesheet">
                      {{ timesheetFormSaving ? 'Saving...' : 'Save Timesheet' }}
                    </button>
                  </div>
                </div>
              </div>
            </transition>
          </teleport>
        </template>

        <!-- 3. PROJECT VIEW (List view only as requested) -->
        <template v-else-if="activeSection === 'Project'">
          <div class="shrink-0 mb-3 flex items-center justify-between">
            <div>
              <h2 class="text-lg font-bold text-ink-gray-9">Projects List</h2>
              <p class="text-xs text-ink-gray-5">Active project spaces and tracking metrics</p>
            </div>
            <span class="text-xs text-ink-gray-5 font-medium">{{ projectsData.length }} projects</span>
          </div>

          <div class="flex-1 min-h-0 flex flex-col overflow-hidden outline-none focus:outline-none ring-0">
            <CommonListView
              v-model:selectedRows="selectedProjectKeys"
              :columns="projectColumns"
              :rows="projectsData"
              :loading="loading"
            >
              <template #cell-name="{ row }">
                <div class="flex items-center gap-2">
                  <Folder class="size-4 text-blue-600 shrink-0" />
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
          </div>
        </template>

        <!-- 4. TEAM VIEW (List view only as requested) -->
        <template v-else-if="activeSection === 'Team'">
          <div class="shrink-0 mb-3 flex items-center justify-between">
            <div>
              <h2 class="text-lg font-bold text-ink-gray-9">Team Members</h2>
              <p class="text-xs text-ink-gray-5">
                Workspace collaborators and task allocation
                <span v-if="selectedTeam" class="text-blue-600 font-medium">
                  — {{ selectedTeam.team_name || selectedTeam.name }}
                </span>
              </p>
            </div>
            <div class="flex items-center gap-2">
              <span class="text-xs text-ink-gray-5 font-medium">{{ teamData.length }} members</span>
              <Button
                variant="solid"
                theme="gray"
                label="Add Member"
                class="bg-gray-900 hover:bg-black text-white"
                @click="openAddMember"
              >
                <template #prefix><UserPlus class="size-4" /></template>
              </Button>
            </div>
          </div>

          <!-- Teams capsule list with + button -->
          <div v-if="teams.length > 0" class="shrink-0 mb-3 flex flex-wrap items-center gap-2">
            <!-- All Teams badge (default selected) -->
            <button
              type="button"
              class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all cursor-pointer select-none"
              :class="allTeamsSelected
                ? 'bg-blue-600 text-white border-blue-600 shadow-sm ring-2 ring-blue-200'
                : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50 hover:border-gray-300'"
              @click="selectAllTeams"
            >
              <span class="size-1.5 rounded-full shrink-0" :class="allTeamsSelected ? 'bg-white' : 'bg-blue-500'" />
              All Teams
              <span class="font-bold" :class="allTeamsSelected ? 'text-blue-100' : 'text-gray-500'">({{ teamData.length }})</span>
            </button>
            <button
              v-for="team in teams"
              :key="team.name"
              type="button"
              class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all cursor-pointer select-none"
              :class="selectedTeam && selectedTeam.name === team.name
                ? 'bg-blue-600 text-white border-blue-600 shadow-sm ring-2 ring-blue-200'
                : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50 hover:border-gray-300'"
              @click="selectTeam(team)"
            >
              <span class="size-1.5 rounded-full shrink-0" :class="selectedTeam && selectedTeam.name === team.name ? 'bg-white' : (team.is_active ? 'bg-green-500' : 'bg-gray-400')" />
              {{ team.team_name || team.name }}
              <span class="font-bold" :class="selectedTeam && selectedTeam.name === team.name ? 'text-blue-100' : 'text-gray-500'">({{ team.member_count || 0 }})</span>
            </button>
            <button
              type="button"
              title="Create new team"
              class="inline-flex items-center justify-center size-7 rounded-full border border-dashed border-gray-300 text-gray-400 hover:border-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-all cursor-pointer"
              @click="openCreateTeam"
            >
              <Plus class="size-3.5" />
            </button>
          </div>

          <div class="flex-1 min-h-0 flex flex-col overflow-hidden outline-none focus:outline-none ring-0">
            <!-- Empty state: team selected but no members -->
            <div
              v-if="selectedTeam && !teamLoading && teamData.length === 0 && !selectedMember"
              class="flex-1 flex flex-col items-center justify-center text-center py-12"
            >
              <div class="size-14 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
                <Users class="size-7 text-gray-400" />
              </div>
              <p class="text-sm font-semibold text-gray-700 mb-1">No team members yet</p>
              <p class="text-xs text-gray-400 mb-4 max-w-xs">
                This team has no members. Add someone to get started.
              </p>
              <Button
                variant="solid"
                theme="gray"
                label="Add Member"
                class="bg-gray-900 hover:bg-black text-white"
                @click="openAddMember"
              >
                <template #prefix><UserPlus class="size-3.5" /></template>
              </Button>
            </div>

            <!-- Member list (hidden when profile is open) -->
            <div
              v-else-if="!selectedMember"
              class="flex-1 min-h-0 overflow-auto"
            >
              <CommonListView
                v-model:selectedRows="selectedTeamKeys"
                :columns="teamColumns"
                :rows="teamData"
                :loading="teamLoading"
                @row-click="(row) => selectMember(row)"
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

                <template #cell-active_tasks="{ row }">
                  <div class="flex items-center justify-end gap-1.5">
                    <span class="text-xs font-mono text-ink-gray-8">{{ row.active_tasks }}</span>
                    <span v-if="row.overdue_tasks > 0" class="text-[10px] text-red-500 font-medium">({{ row.overdue_tasks }} late)</span>
                  </div>
                </template>

                <template #cell-status="{ row }">
                  <Badge
                    :theme="row.status === 'Active' ? 'green' : 'gray'"
                    variant="subtle"
                    size="sm"
                  >
                    {{ row.status }}
                  </Badge>
                </template>
              </CommonListView>
            </div>

            <!-- Full profile view (replaces list) -->
            <div
              v-else
              class="flex-1 min-h-0 flex overflow-hidden"
            >
              <!-- Profile card (left, ~260px) -->
              <div class="w-[260px] shrink-0 overflow-y-auto border-r border-gray-200 bg-white">
                <div class="py-5 px-5">
                  <!-- Back button -->
                  <button
                    type="button"
                    class="inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-gray-700 mb-4 cursor-pointer transition"
                    @click="backToList"
                  >
                    <svg class="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
                    Back to members
                  </button>

                  <!-- Avatar + Name -->
                  <div class="flex flex-col items-center text-center mb-5">
                    <div class="size-20 rounded-full bg-gray-100 overflow-hidden shadow-md mb-3">
                      <Avatar
                        :image="selectedMember.image"
                        :label="selectedMember.name"
                        size="3xl"
                        shape="circle"
                        class="size-20"
                      />
                    </div>
                    <h3 class="text-base font-bold text-gray-900 leading-tight">{{ selectedMember.name }}</h3>
                    <p class="text-xs text-gray-500 mt-0.5">{{ selectedMember.email }}</p>
                    <span
                      class="inline-flex mt-2 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border"
                      :class="getMemberRoleBadgeClass(selectedMember.role)"
                    >
                      {{ selectedMember.role }}
                    </span>
                  </div>

                  <!-- Stats -->
                  <div class="grid grid-cols-2 gap-2.5 mb-5">
                    <div class="text-center p-2.5 bg-gray-50 rounded-lg">
                      <p class="text-lg font-bold text-gray-900">{{ selectedMember.active_tasks || 0 }}</p>
                      <p class="text-[10px] text-gray-500">Active</p>
                    </div>
                    <div class="text-center p-2.5 bg-gray-50 rounded-lg">
                      <p class="text-lg font-bold text-gray-900">{{ selectedMember.completed_tasks || 0 }}</p>
                      <p class="text-[10px] text-gray-500">Done</p>
                    </div>
                    <div class="text-center p-2.5 bg-gray-50 rounded-lg">
                      <p class="text-lg font-bold text-gray-900">{{ selectedMember.total_tasks || 0 }}</p>
                      <p class="text-[10px] text-gray-500">Total</p>
                    </div>
                    <div class="text-center p-2.5 rounded-lg" :class="(selectedMember.overdue_tasks || 0) > 0 ? 'bg-red-50' : 'bg-gray-50'">
                      <p class="text-lg font-bold" :class="(selectedMember.overdue_tasks || 0) > 0 ? 'text-red-600' : 'text-gray-900'">{{ selectedMember.overdue_tasks || 0 }}</p>
                      <p class="text-[10px] text-gray-500">Overdue</p>
                    </div>
                  </div>

                  <!-- Details -->
                  <div class="divide-y divide-gray-100 border-t border-gray-100">
                    <div class="flex items-center justify-between py-2.5">
                      <span class="text-xs text-gray-500">Status</span>
                      <Badge :theme="selectedMember.status === 'Active' ? 'green' : 'gray'" variant="subtle" size="sm">
                        {{ selectedMember.status }}
                      </Badge>
                    </div>
                    <div class="flex items-center justify-between py-2.5">
                      <span class="text-xs text-gray-500">Access</span>
                      <span class="text-xs font-medium text-gray-700">{{ selectedMember.access_level || 'Operate' }}</span>
                    </div>
                    <div class="flex items-center justify-between py-2.5">
                      <span class="text-xs text-gray-500">Team</span>
                      <span class="text-xs font-medium text-gray-700 truncate ml-2">{{ selectedTeam?.team_name || selectedTeam?.name || '—' }}</span>
                    </div>
                    <div class="flex items-center justify-between py-2.5">
                      <span class="text-xs text-gray-500">Employee</span>
                      <span class="text-xs font-mono text-gray-600">{{ selectedMember.employee || '—' }}</span>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Calendar + Activity list (50/50) -->
              <div class="flex-1 min-w-0 flex overflow-hidden">
                <!-- Calendar (50%) -->
                <div class="w-1/2 min-w-0 flex flex-col overflow-hidden bg-white border-r border-gray-200">
                  <TimesheetCalendar
                    :events="calendarEvents"
                    :loading="calendarLoading"
                    @cellClick="handleCalendarClick"
                    class="flex-1 min-h-0"
                  />
                </div>

                <!-- Activity list (50%) -->
                <div class="w-1/2 min-w-0 flex flex-col overflow-hidden bg-white">
                  <!-- Header -->
                  <div class="shrink-0 px-4 py-2.5 border-b border-gray-100">
                    <h4 class="text-xs font-bold text-gray-700 uppercase tracking-wide">Activity Log</h4>
                    <p v-if="selectedDayDate" class="text-[11px] text-gray-500 mt-0.5">{{ selectedDayDate }}</p>
                  </div>

                  <!-- Placeholder when no day selected -->
                  <div
                    v-if="!selectedDayDate"
                    class="flex-1 flex flex-col items-center justify-center text-center px-4"
                  >
                    <div class="size-10 rounded-xl bg-gray-100 flex items-center justify-center mb-3">
                      <Clock class="size-5 text-gray-400" />
                    </div>
                    <p class="text-xs font-semibold text-gray-600 mb-1">Select a timesheet day</p>
                    <p class="text-[10px] text-gray-400">Click on any day in the calendar to view work entries</p>
                  </div>

                  <!-- Entries when day selected -->
                  <div v-else class="flex-1 overflow-y-auto">
                    <!-- No entries for this day -->
                    <div
                      v-if="selectedDayEntries.length === 0"
                      class="flex flex-col items-center justify-center text-center px-4 py-10"
                    >
                      <div class="size-10 rounded-xl bg-red-50 flex items-center justify-center mb-3">
                        <Clock class="size-5 text-red-400" />
                      </div>
                      <p class="text-xs font-semibold text-gray-600 mb-1">No timesheet logged</p>
                      <p class="text-[10px] text-gray-400">No work entries found for this day</p>
                    </div>

                    <!-- Timesheet entries -->
                    <div v-else>
                      <div v-for="(ts, tIdx) in selectedDayEntries" :key="ts.name || tIdx" class="px-4 py-3 border-b border-gray-50 last:border-b-0">
                        <div class="flex items-center justify-between mb-2">
                          <div class="flex items-center gap-2">
                            <span class="text-[11px] font-bold text-gray-800">{{ ts.name }}</span>
                            <Badge :theme="ts.status === 'Submitted' ? 'green' : 'blue'" variant="subtle" size="sm">{{ ts.status }}</Badge>
                          </div>
                          <span class="text-[11px] font-bold text-green-600">{{ ts.total_hours }}h</span>
                        </div>
                        <div class="space-y-1.5">
                          <div
                            v-for="(item, iIdx) in ts.items"
                            :key="iIdx"
                            class="flex items-center gap-2 text-[10px] bg-gray-50 rounded-lg px-2.5 py-2"
                          >
                            <span
                              class="inline-flex px-1.5 py-0.5 rounded text-[8px] font-semibold border shrink-0"
                              :class="{
                                'bg-blue-50 text-blue-700 border-blue-200': item.activity_type === 'Task',
                                'bg-amber-50 text-amber-700 border-amber-200': item.activity_type === 'Meeting',
                                'bg-purple-50 text-purple-700 border-purple-200': item.activity_type === 'Research',
                              }"
                            >
                              {{ item.activity_type }}
                            </span>
                            <div class="min-w-0 flex-1">
                              <span v-if="item.project" class="text-gray-700 font-medium truncate block">{{ item.project }}</span>
                              <span v-if="item.task" class="text-gray-500 truncate block">/ {{ item.task }}</span>
                            </div>
                            <span class="text-gray-700 font-bold shrink-0">{{ item.hrs }}h</span>
                            <span class="text-gray-400 shrink-0">
                              {{ item.from_time?.slice(11, 16) }} – {{ item.to_time?.slice(11, 16) }}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </template>
      </div>
    </DesktopShell>

    <!-- Toast -->
    <Transition name="toast">
      <div
        v-if="toastVisible"
        class="fixed bottom-5 right-5 z-50 flex items-center gap-2 px-4 py-2.5 bg-green-600 text-white text-sm font-medium rounded-lg shadow-lg"
      >
        <Check class="size-4" />
        {{ toastMessage }}
      </div>
    </Transition>

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
              <SlidersHorizontal class="size-4 shrink-0 text-ink-gray-6" />
            </template>
            Preferences
          </SettingsNavItem>
          <SettingsNavItem value="notifications">
            <template #prefix>
              <Bell class="size-4 shrink-0 text-ink-gray-6" />
            </template>
            Notifications
          </SettingsNavItem>
        </SettingsNavGroup>

        <SettingsNavGroup label="Administration">
          <SettingsNavItem value="users">
            <template #prefix>
              <Users class="size-4 shrink-0 text-ink-gray-6" />
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
                      <Button>
                        <template #prefix><User class="size-4 mr-1" /></template>
                        View
                      </Button>
                      <Button>
                        <template #prefix><LayoutDashboard class="size-4 mr-1" /></template>
                        Customize
                      </Button>
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
              <Button>
                <template #prefix><UserPlus class="size-4 mr-1" /></template>
                Invite
              </Button>
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
                  <Button variant="ghost" label="Member options">
                    <template #icon><MoreHorizontal class="size-4" /></template>
                  </Button>
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
      :teams="teams"
      :people="people"
      :team-members="teamMembers"
      :statuses="statuses"
      :priorities="priorities"
      :on-save="onSaveTask"
      :on-delete="onDeleteTask"
      @save="onSaveTask"
      @delete="onDeleteTask"
      @close="activeTask = null"
    />

    <!-- Task Create Modal -->
    <TaskCreateModal
      v-model="createModalOpen"
      :projects="projects"
      :teams="teams"
      :people="people"
      :team-members="teamMembers"
      :statuses="statuses"
      :priorities="priorities"
      :on-create="onCreateTask"
      @create="onCreateTask"
    />

    <!-- Create Team Modal (Simple) -->
    <div v-if="createTeamOpen" class="fixed inset-0 z-50 flex items-center justify-center">
      <div class="fixed inset-0 bg-black/40 backdrop-blur-sm" @click="createTeamOpen = false" />
      <div class="relative bg-white rounded-xl shadow-2xl w-full max-w-sm mx-4">
        <div class="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <h3 class="text-base font-bold text-gray-900">Create New Team</h3>
          <button
            type="button"
            class="size-7 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition cursor-pointer"
            @click="createTeamOpen = false"
          >
            <span class="text-lg leading-none">&times;</span>
          </button>
        </div>
        <div class="px-5 py-4">
          <label class="block text-xs font-semibold text-gray-700 mb-1">Team Name *</label>
          <TextInput
            v-model="newTeamName"
            placeholder="e.g. Engineering Team"
            class="w-full"
            @keydown.enter="submitCreateTeam"
          />
        </div>
        <div class="flex items-center justify-end gap-2 px-5 py-3 border-t border-gray-100 bg-gray-50 rounded-b-xl">
          <Button variant="subtle" label="Cancel" @click="createTeamOpen = false" />
          <Button
            variant="solid"
            theme="gray"
            label="Create"
            class="bg-gray-900 hover:bg-black text-white"
            :loading="teamLoading"
            :disabled="!newTeamName.trim()"
            @click="submitCreateTeam"
          >
            <template #prefix><Plus class="size-3.5" /></template>
          </Button>
        </div>
      </div>
    </div>

    <!-- Add Member Modal -->
    <div v-if="addMemberOpen" class="fixed inset-0 z-50 flex items-center justify-center">
      <div class="fixed inset-0 bg-black/40 backdrop-blur-sm" @click="addMemberOpen = false" />
      <div class="relative bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4">
        <!-- Header -->
        <div class="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <div class="flex items-center gap-2.5">
            <div class="size-8 rounded-lg bg-blue-50 flex items-center justify-center">
              <UserPlus class="size-4 text-blue-600" />
            </div>
            <div>
              <h3 class="text-base font-bold text-gray-900">Add Team Member</h3>
              <p class="text-xs text-gray-500">Assign an employee to a team with a role</p>
            </div>
          </div>
          <button
            type="button"
            class="size-7 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition cursor-pointer"
            @click="addMemberOpen = false"
          >
            <span class="text-lg leading-none">&times;</span>
          </button>
        </div>

        <!-- Body -->
        <div class="px-5 py-5 space-y-4">

          <!-- Step 1: Team (always visible) -->
          <div>
            <label class="block text-xs font-semibold text-gray-700 mb-1.5">Step 1 — Select Team *</label>
            <select
              :value="memberForm.team"
              class="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
              @change="onMemberTeamChange($event.target.value)"
            >
              <option value="" disabled>Choose a team...</option>
              <option v-for="t in teams" :key="t.name" :value="t.name">
                {{ t.team_name || t.name }} ({{ t.member_count || 0 }} members)
              </option>
            </select>
            <p v-if="memberSubmitted && memberErrors.team" class="text-xs text-red-600 mt-1">{{ memberErrors.team }}</p>
          </div>

          <!-- Step 2: Employee (only after team selected) -->
          <div v-if="memberForm.team" class="transition-all duration-200 relative">
            <label class="block text-xs font-semibold text-gray-700 mb-1.5">Step 2 — Select Employee *</label>

            <!-- Selected employee display / trigger -->
            <div
              v-if="memberForm.employee && !empDropdownOpen"
              class="flex items-center justify-between w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white hover:border-gray-300 transition cursor-pointer"
              @click="empDropdownOpen = true; empSearch = ''"
            >
              <div class="flex items-center gap-2 min-w-0">
                <Avatar :label="selectedEmployee?.employee_name || memberForm.employee" size="sm" class="shrink-0" />
                <span class="truncate">{{ selectedEmployee?.employee_name || memberForm.employee }}</span>
              </div>
              <span class="text-gray-400 text-xs shrink-0 ml-2">&#10005;</span>
            </div>

            <!-- Search input -->
            <div v-else>
              <div class="relative">
                <input
                  ref="empSearchInput"
                  v-model="empSearch"
                  type="text"
                  placeholder="Type to search employee..."
                  autocomplete="off"
                  autocorrect="off"
                  autocapitalize="off"
                  spellcheck="false"
                  class="w-full text-sm border border-gray-200 rounded-lg pl-3 pr-8 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                  @focus="empDropdownOpen = true"
                  @keydown.escape="empDropdownOpen = false"
                />
                <span class="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs pointer-events-none">
                  {{ filteredEmployees.length }}
                </span>
              </div>
            </div>

            <!-- Dropdown list -->
            <div v-if="empDropdownOpen" class="fixed inset-0 z-10" @click="empDropdownOpen = false" />
            <div
              v-if="empDropdownOpen"
              class="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto"
              @click.stop
            >
              <div v-if="filteredEmployees.length === 0" class="px-3 py-4 text-center text-sm text-gray-400">
                No employees found
              </div>
              <button
                v-for="emp in filteredEmployees"
                :key="emp.name"
                type="button"
                class="w-full flex items-center gap-2.5 px-3 py-2 text-left text-sm transition cursor-pointer"
                :class="[
                  teamMemberEmployeeIds.has(emp.name)
                    ? 'bg-gray-50 text-gray-400 cursor-not-allowed opacity-60'
                    : memberForm.employee === emp.name
                      ? 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                      : 'text-gray-700 hover:bg-gray-50'
                ]"
                :disabled="teamMemberEmployeeIds.has(emp.name)"
                @click="!teamMemberEmployeeIds.has(emp.name) && selectEmployee(emp)"
              >
                <Avatar :label="emp.employee_name || emp.name" size="sm" class="shrink-0" />
                <div class="min-w-0 flex-1">
                  <p class="font-medium truncate">{{ emp.employee_name || emp.name }}</p>
                  <p v-if="emp.designation || emp.department" class="text-xs text-gray-400 truncate">
                    {{ emp.designation }}{{ emp.department ? ' · ' + emp.department : '' }}
                  </p>
                </div>
                <span
                  v-if="teamMemberEmployeeIds.has(emp.name)"
                  class="shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-gray-200 text-gray-500"
                >
                  Already added
                </span>
              </button>
            </div>

            <p v-if="memberSubmitted && memberErrors.employee" class="text-xs text-red-600 mt-1">{{ memberErrors.employee }}</p>
          </div>

          <!-- Employee Preview Card -->
          <div v-if="selectedEmployee" class="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200 transition-all duration-200">
            <Avatar
              :label="selectedEmployee.employee_name || selectedEmployee.name"
              size="lg"
              shape="circle"
              class="shrink-0"
            />
            <div class="min-w-0 flex-1">
              <p class="text-sm font-semibold text-gray-900 truncate">{{ selectedEmployee.employee_name || selectedEmployee.name }}</p>
              <p v-if="selectedEmployee.designation" class="text-xs text-gray-500 truncate">{{ selectedEmployee.designation }}</p>
              <p v-if="selectedEmployee.department" class="text-xs text-gray-400 truncate">{{ selectedEmployee.department }}</p>
            </div>
            <span class="shrink-0 px-2 py-0.5 text-[10px] font-medium bg-green-50 text-green-700 border border-green-200 rounded-full">Active</span>
          </div>

          <!-- Step 3: Role & Access (only after employee selected) -->
          <div v-if="memberForm.employee" class="grid grid-cols-2 gap-4 transition-all duration-200">
            <div>
              <label class="block text-xs font-semibold text-gray-700 mb-1.5">Step 3 — Role</label>
              <select
                v-model="memberForm.team_role"
                class="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
              >
                <option v-for="r in teamRoleOptions" :key="r" :value="r">{{ r }}</option>
              </select>
            </div>
            <div>
              <label class="block text-xs font-semibold text-gray-700 mb-1.5">Access Level</label>
              <select
                v-model="memberForm.access_level"
                class="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
              >
                <option v-for="l in accessLevelOptions" :key="l.value" :value="l.value">{{ l.label }}</option>
              </select>
            </div>
          </div>

          <!-- Submit Error -->
          <div v-if="memberSubmitError" class="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
            <span class="text-red-500 text-xs mt-0.5">&#9888;</span>
            <p class="text-xs text-red-700">{{ memberSubmitError }}</p>
          </div>
        </div>

        <!-- Footer -->
        <div class="flex items-center justify-between px-5 py-3.5 border-t border-gray-100 bg-gray-50 rounded-b-xl">
          <p v-if="memberForm.team" class="text-[11px] text-gray-400">
            Adding to: <span class="font-medium text-gray-600">{{ teams.find((t) => t.name === memberForm.team)?.team_name || memberForm.team }}</span>
          </p>
          <div v-else />
          <div class="flex items-center gap-2">
            <Button variant="subtle" label="Cancel" @click="addMemberOpen = false" />
            <Button
              variant="solid"
              theme="gray"
              label="Add Member"
              class="bg-gray-900 hover:bg-black text-white"
              :loading="memberLoading"
              :disabled="!memberForm.employee || memberLoading"
              @click="submitAddMember"
            >
              <template #prefix><UserPlus class="size-3.5" /></template>
            </Button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.toast-enter-active,
.toast-leave-active {
  transition: all 0.3s ease;
}
.toast-enter-from {
  opacity: 0;
  transform: translateY(10px);
}
.toast-leave-to {
  opacity: 0;
  transform: translateY(10px);
}
</style>
