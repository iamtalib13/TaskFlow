<script setup>

import { computed, reactive, ref, onMounted, onUnmounted, watch } from 'vue'
import {
  Avatar,
  Combobox,
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
  Moon,
  Sun,
  Search,
  X as XIcon,
} from 'lucide-vue-next'

import CommonListView from '@/components/CommonListView.vue'
import TaskDetailModal from '@/components/TaskDetailModal.vue'
import TaskCreateModal from '@/components/TaskCreateModal.vue'
import ProjectCreateModal from '@/components/ProjectCreateModal.vue'
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
  deleteProject,
  fetchEmployees,
  addTeamMember,
  fetchMemberTimesheets,
  fetchAllTimesheets,
  saveTimesheet,
  deleteTimesheet,
} from '@/data/api.js'
import TimesheetCalendar from '@/components/TimesheetCalendar.vue'

// --- State & Data ---
const MAX_VISIBLE = 5
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

// Redirect Team to Task if not System Manager
function validateSection() {
  if (activeSection.value === 'Team' && !isSystemManager.value) {
    activeSection.value = 'Task'
    try {
      const url = new URL(window.location.href)
      url.searchParams.set('section', 'Task')
      window.history.replaceState(null, '', url.toString())
    } catch {}
  }
}

const SIDEBAR_COLLAPSED_KEY = 'taskflow:sidebar_collapsed'
const getStoredSidebarState = () => {
  return true
}
const isDark = ref(false)
function toggleTheme() {
  isDark.value = !isDark.value
  if (isDark.value) {
    document.documentElement.setAttribute('data-theme', 'dark')
    localStorage.setItem('taskflow-theme', 'dark')
  } else {
    document.documentElement.removeAttribute('data-theme')
    localStorage.setItem('taskflow-theme', 'light')
  }
}

const isSidebarCollapsed = ref(getStoredSidebarState())
const isSystemManager = ref(false)

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
  validateSection()
  if (val === 'Timesheet') {
    loadTimesheetCalendar(selectedTimesheetUser.value || currentUserEmail.value)
  }
})

// Handle browser back/forward
const onPopState = () => {
  const section = getSectionFromURL()
  if (VALID_SECTIONS.includes(section)) {
    activeSection.value = section
  }
  validateSection()
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
    { id: 'Timesheet', label: 'Timesheet', icon: Clock, badge: totalTsMonthlyHours.value ? `${totalTsMonthlyHours.value}h` : '' },
    { id: 'Project', label: 'Project', icon: FolderKanban, badge: projectsData.value.length },
    ...(isSystemManager.value ? [{ id: 'Team', label: 'Team', icon: Users, badge: teamData.value.length }] : []),
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
  { key: 'team', label: 'TEAM', width: '150px', minWidth: '120px', sortable: true, visible: true },
  { key: 'priority', label: 'PRIORITY', width: '100px', minWidth: '90px', sortable: true, visible: true },
  { key: 'assigned_to', label: 'ASSIGNED TO', width: '160px', minWidth: '140px', sortable: true, visible: true },
  { key: 'due_date', label: 'DUE DATE', width: '110px', minWidth: '100px', sortable: true, visible: true },
  { key: 'modified', label: 'MODIFIED', width: '120px', minWidth: '100px', sortable: true, visible: true },
]

const selectedRowKeys = ref([])
const tasksDisplayLimit = ref(20)
const sortKey = ref('modified')
const sortOrder = ref('desc')
const taskSearch = ref('')
const taskSearchInput = ref(null)
const isSearchFocused = ref(false)

function handleSortChange({ key, order }) {
  sortKey.value = key
  sortOrder.value = order
}

watch([statusTab, selectedProjects, showAssignedToMe, taskSearch], () => {
  tasksDisplayLimit.value = 20
})

function formatDueDate(dateVal) {
  if (!dateVal) return '—'
  const str = String(dateVal).trim().split(' ')[0]
  const parts = str.split('-')
  if (parts.length === 3) {
    const [y, m, d] = parts
    if (y.length === 4) {
      return `${d.padStart(2, '0')}-${m.padStart(2, '0')}-${y}`
    }
    if (d.length === 4) {
      return `${y.padStart(2, '0')}-${m.padStart(2, '0')}-${d}`
    }
  }
  const slashParts = str.split('/')
  if (slashParts.length === 3) {
    const [p1, p2, p3] = slashParts
    if (p3.length === 4) {
      return `${p1.padStart(2, '0')}-${p2.padStart(2, '0')}-${p3}`
    }
    if (p1.length === 4) {
      return `${p3.padStart(2, '0')}-${p2.padStart(2, '0')}-${p1}`
    }
  }
  return dateVal
}

function isTaskOverdue(row) {
  if (!row?.due_date) return false
  if (['Completed', 'Cancelled'].includes(row.status)) return false
  const today = new Date().toISOString().split('T')[0]
  let isoDate = String(row.due_date).trim().split(' ')[0]
  const parts = isoDate.split('-')
  if (parts.length === 3 && parts[2].length === 4) {
    isoDate = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`
  }
  return isoDate < today
}

function formatPrettyDate(row) {
  if (row?.modified_pretty) {
    const p = String(row.modified_pretty).trim()
    if (p.toLowerCase() === 'just now' || p.toLowerCase() === 'right now') return 'Just now'
    return p
  }
  if (!row?.modified) return '—'

  try {
    const raw = String(row.modified).trim()
    const isoString = raw.includes('T') ? raw : raw.replace(' ', 'T')
    const d = new Date(isoString)
    if (isNaN(d.getTime())) return row.modified

    const now = new Date()
    const diffSec = (now.getTime() - d.getTime()) / 1000

    if (diffSec >= -10 && diffSec < 60) return 'Just now'
    const diffMin = Math.floor(diffSec / 60)
    if (diffMin < 60) return `${Math.max(1, diffMin)}m ago`
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
  if (p === 'just now' || p === 'right now') return true
  if (row.modified) {
    try {
      const raw = String(row.modified).trim()
      const isoString = raw.includes('T') ? raw : raw.replace(' ', 'T')
      const d = new Date(isoString)
      if (!isNaN(d.getTime())) {
        const diffSec = (Date.now() - d.getTime()) / 1000
        if (diffSec >= -10 && diffSec <= 45) return true
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
  if (row && (row.status === 'Completed' || row.status === 'completed')) {
    return 'bg-emerald-50/70 dark:bg-emerald-950/30 hover:bg-emerald-100/80 dark:hover:bg-emerald-900/40 transition-colors'
  }
  return 'hover:bg-[#f0f7f7] dark:hover:bg-gray-800/70 transition-colors'
}

// Light green highlight for projects modified 'Just now'
function getProjectRowClass(row) {
  if (isRowJustNow(row)) {
    return 'row-just-now is-just-now'
  }
  return 'hover:bg-[#f0f7f7] dark:hover:bg-gray-800/70'
}

// Colorful status badge styling: Completed (Green), Overdue (Red), Open (Blue), In Progress (Yellow/Amber), etc.
const getStatusBadgeClass = (status) => {
  switch (status) {
    case 'Completed':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200 ring-1 ring-emerald-500/10 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900/60'
    case 'Overdue':
      return 'bg-rose-50 text-rose-700 border-rose-200 ring-1 ring-rose-500/10 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900/60'
    case 'Open':
      return 'bg-blue-50 text-blue-700 border-blue-200 ring-1 ring-blue-500/10 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900/60'
    case 'In Progress':
      return 'bg-amber-50 text-amber-800 border-amber-200 ring-1 ring-amber-500/10 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900/60'
    case 'Review':
      return 'bg-purple-50 text-purple-700 border-purple-200 ring-1 ring-purple-500/10 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-900/60'
    case 'On Hold':
      return 'bg-orange-50 text-orange-700 border-orange-200 ring-1 ring-orange-500/10 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-900/60'
    case 'Cancelled':
      return 'bg-gray-100 text-gray-700 border-gray-200 ring-1 ring-gray-500/10 dark:bg-gray-800/60 dark:text-gray-300 dark:border-gray-700'
    default:
      return 'bg-blue-50 text-blue-700 border-blue-200 ring-1 ring-blue-500/10 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900/60'
  }
}

const statusThemeMap = {
  'Open': 'blue',
  'In Progress': 'amber',
  'Review': 'purple',
  'On Hold': 'amber',
  'Completed': 'green',
  'Cancelled': 'gray',
  'Overdue': 'red',
}

const statusDotClassMap = {
  'Open': 'bg-surface-blue-7',
  'In Progress': 'bg-surface-amber-7',
  'Review': 'bg-surface-purple-7',
  'On Hold': 'bg-surface-amber-7',
  'Completed': 'bg-surface-green-7',
  'Cancelled': 'bg-surface-gray-8',
  'Overdue': 'bg-surface-red-7',
}

const getStatusDotClass = (status) => {
  switch (status) {
    case 'Completed':
      return 'bg-emerald-700 dark:bg-emerald-400'
    case 'Overdue':
      return 'bg-rose-600 dark:bg-rose-400 animate-pulse'
    case 'Open':
      return 'bg-blue-600 dark:bg-blue-400'
    case 'In Progress':
      return 'bg-amber-600 dark:bg-amber-400'
    case 'Review':
      return 'bg-purple-600 dark:bg-purple-400'
    case 'On Hold':
      return 'bg-orange-600 dark:bg-orange-400'
    case 'Cancelled':
      return 'bg-gray-500 dark:bg-gray-400'
    default:
      return 'bg-blue-600 dark:bg-blue-400'
  }
}

const getPriorityTextClass = (priority) => {
  switch (priority) {
    case 'Critical':
      return 'text-red-600 dark:text-red-400 font-bold'
    case 'High':
      return 'text-orange-500 dark:text-orange-400 font-semibold'
    case 'Medium':
      return 'text-amber-500 dark:text-amber-400 font-medium'
    case 'Low':
      return 'text-blue-500 dark:text-blue-400 font-medium'
    default:
      return 'text-gray-500 dark:text-gray-400 font-normal'
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

// Filtered tasks based on status tab, project filter, search query, and sort
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

  // Smart search — title, id, project, status, priority, assigned_to, team
  const q = taskSearch.value.trim().toLowerCase()
  if (q) {
    const tokens = q.split(/\s+/).filter(Boolean)
    list = list.filter((t) => {
      const assigneesText = (t.assignees || []).map((a) => a.name || '').join(' ')
      const fullText = [
        t.title,
        t.id,
        t.project,
        t.status,
        t.priority,
        t.assigned_to,
        t.team,
        t.owner,
        assigneesText,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()

      return tokens.every((token) => fullText.includes(token))
    })
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
const selectedProjectTeamFilter = ref('')
const projectStatusTab = ref('All')
const selectedProjectKeys = ref([])
const projectTableColumns = [
  { key: 'sr_no', label: 'SR', width: '42px', minWidth: '36px', align: 'center', sortable: false, visible: true },
  { key: 'name', label: 'PROJECT', width: '180px', minWidth: '130px', sortable: true, visible: true },
  { key: 'parent_project', label: 'PARENT PROJECT', width: '130px', minWidth: '100px', sortable: true, visible: true },
  { key: 'team', label: 'TEAM', width: '110px', minWidth: '90px', sortable: true, visible: true },
  { key: 'lead', label: 'LEAD', width: '130px', minWidth: '100px', sortable: true, visible: true },
  { key: 'start_date', label: 'START DATE', width: '95px', minWidth: '85px', sortable: true, visible: true },
  { key: 'end_date', label: 'END DATE', width: '95px', minWidth: '85px', sortable: true, visible: true },
  { key: 'progress', label: 'PROGRESS', width: '110px', minWidth: '95px', sortable: true, visible: true },
  { key: 'modified', label: 'MODIFIED', width: '110px', minWidth: '95px', sortable: true, visible: true },
]

const selectedProjectMemberFilter = ref('')
const memberFilterQuery = ref('')

const uniqueMemberOptions = computed(() => {
  const map = new Map()
  let list = teamMembers.value || []

  const filterTeam = typeof selectedProjectTeamFilter.value === 'object'
    ? selectedProjectTeamFilter.value.value
    : selectedProjectTeamFilter.value

  if (filterTeam) {
    list = list.filter(m => m.team === filterTeam || m.parent === filterTeam)
  }

  list.forEach(m => {
    const id = m.employee || m.user || m.name
    if (id && !map.has(id)) {
      map.set(id, {
        label: m.employee_name || m.user || m.employee || id,
        value: id,
        description: m.user || m.employee || '',
        image: m.user_image || '',
      })
    }
    if (m.user && !map.has(m.user)) {
      map.set(m.user, {
        label: m.employee_name || m.user,
        value: m.user,
        description: m.user,
        image: m.user_image || '',
      })
    }
  })

  return Array.from(map.values())
})

function matchTokens(text, query) {
  if (!query) return true
  if (!text) return false
  const textLower = String(text).toLowerCase()
  const tokens = String(query).toLowerCase().trim().split(/\s+/).filter(Boolean)
  return tokens.every(token => textLower.includes(token))
}

const filteredMemberFilterOptions = computed(() => {
  const q = memberFilterQuery.value.trim()
  let list = uniqueMemberOptions.value
  if (q) {
    list = list.filter(m => matchTokens(`${m.label} ${m.description}`, q))
  }
  return [{ label: 'All Team Members', value: '', image: '', description: '' }, ...list.slice(0, MAX_VISIBLE)]
})

// O(1) Pre-indexed Projects Data
const projectsData = computed(() => {
  if (!projects.value || projects.value.length === 0) return []

  // Pre-index tasks by project name for O(1) task lookup
  const tasksByProject = new Map()
  for (const t of tasks.value || []) {
    if (!t.project) continue
    if (!tasksByProject.has(t.project)) {
      tasksByProject.set(t.project, [])
    }
    tasksByProject.get(t.project).push(t)
  }

  // Pre-index employees and people for O(1) lead lookup
  const empMap = new Map()
  for (const e of employees.value || []) {
    if (e.name) empMap.set(e.name, e)
    if (e.user_id) empMap.set(e.user_id, e)
  }

  const peopleMap = new Map()
  for (const p of people.value || []) {
    if (p.email) peopleMap.set(p.email, p)
    if (p.name) peopleMap.set(p.name, p)
  }

  return projects.value.map((proj) => {
    const pName = proj.name || proj.project_name
    const pTasks = tasksByProject.get(pName) || []
    const completedTasks = pTasks.filter((t) => t.status === 'Completed').length
    const pct = pTasks.length > 0 ? Math.round((completedTasks / pTasks.length) * 100) : 0

    // Resolve project lead employee name & image
    let leadName = proj.project_lead_name || ''
    let leadImage = proj.project_lead_image || ''
    const rawLead = proj.project_lead || ''
    if (rawLead) {
      const emp = empMap.get(rawLead)
      if (emp) {
        leadName = emp.employee_name || emp.name
        leadImage = emp.user_image || emp.image || ''
      } else {
        const person = peopleMap.get(rawLead)
        if (person) {
          leadName = person.name || person.email
          leadImage = person.image || ''
        } else if (!leadName) {
          leadName = rawLead
        }
      }
    } else {
      leadName = '—'
    }

    // Build Set of associated member IDs for fast O(1) team member filtering
    const memberIds = new Set()
    if (rawLead) memberIds.add(rawLead)
    if (proj.project_lead) memberIds.add(proj.project_lead)
    if (proj.project_team_members && Array.isArray(proj.project_team_members)) {
      proj.project_team_members.forEach(m => {
        if (m.employee) memberIds.add(m.employee)
        if (m.user) memberIds.add(m.user)
      })
    }
    pTasks.forEach(t => {
      if (t.owner) memberIds.add(t.owner)
      if (t.guided_by) memberIds.add(t.guided_by)
      if (t.responsible_person) memberIds.add(t.responsible_person)
      if (t.assignees && Array.isArray(t.assignees)) {
        t.assignees.forEach(a => {
          if (a.user_id) memberIds.add(a.user_id)
          if (a.name) memberIds.add(a.name)
          if (a.employee_name) memberIds.add(a.employee_name)
        })
      }
    })

    return {
      id: proj.name,
      name: pName,
      status: proj.status || (completedTasks === pTasks.length && pTasks.length > 0 ? 'Completed' : 'Draft'),
      team: proj.team || 'Unassigned',
      lead: leadName,
      lead_image: leadImage,
      raw_lead: rawLead,
      project_lead: proj.project_lead || '',
      project_team_members: proj.project_team_members || [],
      member_ids: memberIds,
      total_tasks: pTasks.length,
      open_tasks: pTasks.filter((t) => t.status !== 'Completed').length,
      completed_tasks: completedTasks,
      progress: proj.completion_percent || pct,
      start_date: proj.start_date || '',
      end_date: proj.end_date || proj.due_date || '',
      parent_project: proj.parent_project || '',
      modified: proj.modified || '',
      modified_pretty: proj.modified_pretty || '',
    }
  })
})

// Dynamic Project status tab options with badge counts
const projectStatusOptions = computed(() => {
  const counts = { All: 0, Draft: 0, Open: 0, 'In Progress': 0, Completed: 0, Cancelled: 0 }
  let baseList = projectsData.value

  const filterTeam = typeof selectedProjectTeamFilter.value === 'object'
    ? selectedProjectTeamFilter.value.value
    : selectedProjectTeamFilter.value
  if (filterTeam) {
    baseList = baseList.filter(p => p.team === filterTeam)
  }

  const filterEmp = typeof selectedProjectMemberFilter.value === 'object'
    ? selectedProjectMemberFilter.value.value
    : selectedProjectMemberFilter.value
  if (filterEmp) {
    baseList = baseList.filter(p => p.member_ids && p.member_ids.has(filterEmp))
  }

  counts.All = baseList.length
  baseList.forEach(p => {
    const s = p.status || 'Draft'
    if (counts[s] !== undefined) {
      counts[s]++
    }
  })

  return [
    { label: `All (${counts.All})`, value: 'All' },
    { label: `Draft (${counts.Draft})`, value: 'Draft' },
    { label: `Open (${counts.Open})`, value: 'Open' },
    { label: `In Progress (${counts['In Progress']})`, value: 'In Progress' },
    { label: `Completed (${counts.Completed})`, value: 'Completed' },
    { label: `Cancelled (${counts.Cancelled})`, value: 'Cancelled' },
  ]
})

const filteredProjectsData = computed(() => {
  let list = projectsData.value

  if (selectedProjectTeamFilter.value) {
    const filterVal = typeof selectedProjectTeamFilter.value === 'object' 
      ? selectedProjectTeamFilter.value.value 
      : selectedProjectTeamFilter.value
    if (filterVal) {
      list = list.filter(p => p.team === filterVal)
    }
  }

  if (selectedProjectMemberFilter.value) {
    const filterEmp = typeof selectedProjectMemberFilter.value === 'object'
      ? selectedProjectMemberFilter.value.value
      : selectedProjectMemberFilter.value

    if (filterEmp) {
      list = list.filter(p => p.member_ids && p.member_ids.has(filterEmp))
    }
  }

  if (projectStatusTab.value && projectStatusTab.value !== 'All') {
    list = list.filter(p => p.status === projectStatusTab.value)
  }

  return list
})

const projectSortField = ref('modified')
const projectSortDirection = ref('desc')
const projectsDisplayLimit = ref(20)

function handleProjectSortChange({ key, order }) {
  projectSortField.value = key
  projectSortDirection.value = order
}

watch([selectedProjectTeamFilter, selectedProjectMemberFilter, projectStatusTab], () => {
  projectsDisplayLimit.value = 20
})

const sortedProjects = computed(() => {
  const factor = projectSortDirection.value === 'desc' ? -1 : 1
  return [...filteredProjectsData.value].sort((a, b) => {
    let valA = a[projectSortField.value] || ''
    let valB = b[projectSortField.value] || ''
    if (typeof valA === 'string') valA = valA.toLowerCase()
    if (typeof valB === 'string') valB = valB.toLowerCase()
    return factor * (valA > valB ? 1 : (valA < valB ? -1 : 0))
  }).map((item, idx) => ({ ...item, sr_no: idx + 1 }))
})

const paginatedProjects = computed(() => {
  return sortedProjects.value.slice(0, projectsDisplayLimit.value)
})

const projectPaginationInfo = computed(() => ({
  loaded: paginatedProjects.value.length,
  total: sortedProjects.value.length,
  step: 20,
}))

function handleProjectLoadMore() {
  projectsDisplayLimit.value += 20
}

function handleProjectLoadAll() {
  projectsDisplayLimit.value = sortedProjects.value.length
}

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

// --- 4. Timesheet Direct Component State & Methods ---
const selectedTimesheetUser = ref('')
const timesheetCalendarEvents = ref([])
const timesheetCalendarLoading = ref(false)
const selectedTsDayDate = ref(new Date().toISOString().slice(0, 10))
const selectedTsDayEntries = ref([])
const timesheetFormOpen = ref(false)
const timesheetFormDate = ref('')
const timesheetFormItems = ref([])
const timesheetFormStatus = ref('Draft')
const timesheetFormSaving = ref(false)
const currentUserName = ref('')

const availableTimesheetMembers = computed(() => {
  const list = []
  const seen = new Set()
  const me = (currentUserEmail.value || '').toLowerCase()
  if (me) {
    seen.add(me)
  }
  for (const m of (teamMembers.value || [])) {
    const email = (m.user || m.email || '').toLowerCase()
    if (email && !seen.has(email)) {
      seen.add(email)
      list.push(m)
    }
  }
  for (const p of (people.value || [])) {
    const email = (p.email || p.user || '').toLowerCase()
    if (email && !seen.has(email)) {
      seen.add(email)
      list.push(p)
    }
  }
  return list
})

const selectedTsUserDisplayName = computed(() => {
  const user = (selectedTimesheetUser.value || currentUserEmail.value || '').toLowerCase()
  if (!user) return ''
  if (user === (currentUserEmail.value || '').toLowerCase() && currentUserName.value) {
    return currentUserName.value
  }
  const found = [...(teamMembers.value || []), ...(people.value || [])].find((m) => {
    return (m.user || m.email || '').toLowerCase() === user
  })
  return found?.employee_name || found?.name || found?.user || found?.email || selectedTimesheetUser.value
})

const selectedTsUserImage = computed(() => {
  const user = (selectedTimesheetUser.value || currentUserEmail.value || '').toLowerCase()
  if (!user) return ''
  const found = [...(teamMembers.value || []), ...(people.value || [])].find((m) => {
    return (m.user || m.email || '').toLowerCase() === user
  })
  return found?.user_image || ''
})

const totalTsMonthlyHours = computed(() => {
  return timesheetCalendarEvents.value.reduce((sum, ev) => sum + (Number(ev._hours) || 0), 0)
})

const tsWorkingDaysCount = computed(() => {
  return timesheetCalendarEvents.value.filter((ev) => (Number(ev._hours) || 0) > 0).length
})

const tsAvgHoursPerDay = computed(() => {
  if (!tsWorkingDaysCount.value) return '0.0'
  return (totalTsMonthlyHours.value / tsWorkingDaysCount.value).toFixed(1)
})

async function loadTimesheetCalendar(user) {
  const targetUser = user || selectedTimesheetUser.value || currentUserEmail.value
  if (!targetUser) return
  timesheetCalendarLoading.value = true
  try {
    const now = new Date()
    const year = now.getFullYear()
    const fromDate = `${year}-01-01`
    const toDate = `${year}-12-31`
    const data = await fetchMemberTimesheets(targetUser, fromDate, toDate)
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
    if (!selectedTsDayDate.value) {
      selectedTsDayDate.value = new Date().toISOString().slice(0, 10)
    }
    selectedTsDayEntries.value = timesheetCalendarEvents.value
      .filter((ev) => ev.fromDate === selectedTsDayDate.value)
      .map((ev) => ev._ts)
      .filter(Boolean)
  } catch (e) {
    console.error('Failed to load timesheet calendar', e)
    timesheetCalendarEvents.value = []
  } finally {
    timesheetCalendarLoading.value = false
  }
}

function handleTsCalendarClick(dateStr) {
  const date = typeof dateStr === 'string' ? dateStr : (dateStr?.date || dateStr)
  selectedTsDayDate.value = date
  selectedTsDayEntries.value = timesheetCalendarEvents.value
    .filter((ev) => ev.fromDate === date)
    .map((ev) => ev._ts)
    .filter(Boolean)
}

function openTimesheetForm(date, existingTs = null) {
  timesheetFormDate.value = date || selectedTsDayDate.value || new Date().toISOString().slice(0, 10)
  if (existingTs && existingTs.items && existingTs.items.length > 0) {
    timesheetFormStatus.value = existingTs.status || 'Draft'
    timesheetFormItems.value = existingTs.items.map((it) => ({
      activity_type: it.activity_type || 'Task',
      project: it.project || '',
      task: it.task || '',
      from_time: it.from_time ? (it.from_time.includes(' ') ? it.from_time.replace(' ', 'T').slice(0, 16) : it.from_time) : (timesheetFormDate.value ? `${timesheetFormDate.value}T09:00` : ''),
      to_time: it.to_time ? (it.to_time.includes(' ') ? it.to_time.replace(' ', 'T').slice(0, 16) : it.to_time) : (timesheetFormDate.value ? `${timesheetFormDate.value}T10:00` : ''),
      description: it.description || '',
    }))
  } else {
    timesheetFormStatus.value = 'Draft'
    const curDate = timesheetFormDate.value || new Date().toISOString().slice(0, 10)
    timesheetFormItems.value = [{
      activity_type: 'Task',
      project: '',
      task: '',
      from_time: `${curDate}T09:00`,
      to_time: `${curDate}T10:00`,
      description: '',
    }]
  }
  timesheetFormOpen.value = true
}

function addTsFormItem() {
  const curDate = timesheetFormDate.value || new Date().toISOString().slice(0, 10)
  timesheetFormItems.value.push({
    activity_type: 'Task',
    project: '',
    task: '',
    from_time: `${curDate}T10:00`,
    to_time: `${curDate}T11:00`,
    description: '',
  })
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
    await loadTimesheetCalendar(selectedTimesheetUser.value || currentUserEmail.value)
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
    await loadTimesheetCalendar(selectedTimesheetUser.value || currentUserEmail.value)
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
      currentUserName.value = data.me.name || ''
      isSystemManager.value = data.me.is_system_manager || false
      if (!selectedTimesheetUser.value) {
        selectedTimesheetUser.value = data.me.email || ''
      }
      if (activeSection.value === 'Timesheet') {
        loadTimesheetCalendar(selectedTimesheetUser.value)
      }
    }
    loadEmployees()
    validateSection()
  } catch (e) {
    console.error('Failed to load tasks', e)
  } finally {
    loading.value = false
  }
}

// Load teams and team members from backend
async function loadTeams() {
  if (!isSystemManager.value) return
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
  const guidedByVal = typeof formData.guided_by === 'object' ? (formData.guided_by.value || '') : (formData.guided_by || '')
  const newTask = {
    ...formData,
    title: formData.title,
    project: formData.project || '',
    team: formData.team || '',
    status: formData.status || 'Open',
    priority: formData.priority || 'Medium',
    task_type: formData.task_type || 'Task',
    description: formData.description || '',
    start_date: formData.start_date || '',
    due_date: formData.due_date || '',
    pending_from: formData.pending_from || '',
    guided_by: guidedByVal,
    toll_id: formData.toll_id || '',
    ticket_date: formData.ticket_date || '',
    ticket_raised_by: formData.ticket_raised_by || '',
    estimated_hours: 8,
    assignees: assigneeList,
  }

  try {
    const result = await saveTask(newTask)
    if (result && result.id) {
      const savedTask = {
        ...result,
        id: result.id,
        title: result.title || formData.title,
        project: result.project || formData.project || '',
        team: result.team || formData.team || '',
        status: result.status || 'Open',
        priority: result.priority || 'Medium',
        task_type: result.task_type || formData.task_type || 'Task',
        assignees: result.assignees || assigneeList,
        reporter: fullName.value,
        start_date: result.start_date || formData.start_date || '',
        due_date: result.due || formData.due_date || '',
        pending_from: result.pending_from || formData.pending_from || '',
        guided_by: result.guided_by || guidedByVal || '',
        toll_id: result.toll_id || formData.toll_id || '',
        ticket_date: result.ticket_date || formData.ticket_date || '',
        ticket_raised_by: result.ticket_raised_by || formData.ticket_raised_by || '',
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
const createProjectModalOpen = ref(false)
const editProjectModalOpen = ref(false)
const projectToEdit = ref(null)
const newTeamName = ref('')

function openEditProject(project) {
  projectToEdit.value = project
  loadEmployees()
  editProjectModalOpen.value = true
}

function handleProjectUpdated() {
  editProjectModalOpen.value = false
  projectToEdit.value = null
  loadData()
}

async function deleteProjectConfirm(project) {
  if (!confirm(`Delete project "${project.name}"? This cannot be undone.`)) return
  try {
    await deleteProject(project.name)
    toast.success('Project deleted!')
    loadData()
  } catch (e) {
    toast.error(e.message || 'Failed to delete project')
  }
}

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
    case 'Viewer': return 'bg-surface-gray-3 text-ink-gray-6 border-outline-gray-2'
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

onMounted(async () => {
  const theme = localStorage.getItem('taskflow-theme')
  if (theme === 'dark' || (!theme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
    isDark.value = true
    document.documentElement.setAttribute('data-theme', 'dark')
  }

  window.addEventListener('popstate', onPopState)
  // Keyboard shortcut: press '/' to focus search (when not typing in an input)
  window.addEventListener('keydown', handleGlobalKeydown)
  await loadData()
  if (isSystemManager.value) {
    loadTeams()
  }
  loadEmployees()
  if (activeSection.value === 'Timesheet') {
    loadTimesheetCalendar(selectedTimesheetUser.value || currentUserEmail.value)
  }
})

function handleGlobalKeydown(e) {
  // '/' shortcut — focus search in Task section
  if (
    e.key === '/' &&
    activeSection.value === 'Task' &&
    !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)
  ) {
    e.preventDefault()
    taskSearchInput.value?.focus()
  }
}

onUnmounted(() => {
  window.removeEventListener('popstate', onPopState)
  window.removeEventListener('keydown', handleGlobalKeydown)
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
            class="flex h-14 items-center border-b border-outline-gray-1 dark:border-neutral-800 transition-all"
            :class="isSidebarCollapsed ? 'justify-center px-1' : 'justify-between px-3'"
          >
            <div
              class="flex items-center gap-2.5 overflow-hidden justify-center w-full"
            >
              <div class="flex size-8 shrink-0 items-center justify-center rounded-lg bg-black dark:bg-white text-white dark:text-gray-950 font-bold text-xs shadow-xs select-none">
                TF
              </div>
              <div v-if="!isSidebarCollapsed" class="flex flex-col truncate transition-opacity">
                <span class="text-sm font-bold tracking-tight text-ink-gray-9 dark:text-white leading-tight">Taskflow</span>
                <span class="text-[11px] text-ink-gray-5 dark:text-neutral-400 leading-tight">Workspace</span>
              </div>
            </div>
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
                      ? 'bg-surface-gray-3 dark:bg-neutral-800 text-gray-950 dark:text-white font-semibold shadow-xs border border-outline-gray-2/80 dark:border-neutral-700'
                      : 'text-ink-gray-6 dark:text-neutral-400 hover:bg-surface-gray-2 dark:hover:bg-neutral-800/60 hover:text-ink-gray-9 dark:hover:text-white border border-transparent'
                  ]"
                  @click="activeSection = item.id"
                >
                  <component
                    :is="item.icon"
                    class="size-4 shrink-0 transition-colors"
                    :class="activeSection === item.id ? 'text-gray-950 dark:text-white stroke-[2.2]' : 'text-ink-gray-5 dark:text-neutral-400 group-hover:text-ink-gray-8 dark:group-hover:text-white'"
                  />
                  <span
                    class="text-[10px] leading-tight mt-1 text-center truncate max-w-full font-medium"
                    :class="activeSection === item.id ? 'text-gray-950 dark:text-white font-semibold' : 'text-ink-gray-5 dark:text-neutral-400 group-hover:text-ink-gray-7 dark:group-hover:text-neutral-200'"
                  >
                    {{ item.label }}
                  </span>
                  <span
                    v-if="item.badge"
                    class="absolute top-1 right-1.5 size-1.5 rounded-full bg-blue-600 dark:bg-blue-500"
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
                      ? '!bg-surface-gray-3 dark:!bg-neutral-800 !text-gray-950 dark:!text-white font-semibold shadow-xs border border-outline-gray-2/80 dark:border-neutral-700'
                      : 'text-ink-gray-6 dark:text-neutral-300 hover:!bg-surface-gray-2 dark:hover:!bg-neutral-800/60 hover:!text-ink-gray-9 dark:hover:!text-white border border-transparent'
                  ]"
                  @click="activeSection = item.id"
                >
                  <template #prefix>
                    <component
                      :is="item.icon"
                      class="size-4 shrink-0 transition-colors"
                      :class="activeSection === item.id ? 'text-gray-950 dark:text-white stroke-[2.2]' : 'text-ink-gray-5 dark:text-neutral-400'"
                    />
                  </template>
                  <span
                    class="flex-1 truncate text-sm"
                    :class="activeSection === item.id ? 'font-semibold text-gray-950 dark:text-white' : 'font-medium text-ink-gray-6 dark:text-neutral-300'"
                  >
                    {{ item.label }}
                  </span>
                  <template #suffix>
                    <span
                      v-if="item.badge !== undefined"
                      class="mr-1 px-2 py-0.5 rounded-full text-[11px] font-semibold transition-colors"
                      :class="activeSection === item.id ? 'bg-gray-200 dark:bg-neutral-700 text-ink-gray-9 dark:text-white font-bold' : 'bg-surface-gray-3 dark:bg-neutral-800 text-ink-gray-5 dark:text-neutral-400'"
                    >
                      {{ item.badge }}
                    </span>
                  </template>
                </SidebarItem>
              </template>
            </nav>
          </ScrollArea>

          <!-- Sidebar Footer (User Account & Settings) -->
          <div class="p-2 border-t border-outline-gray-1 dark:border-neutral-800 bg-surface-base">
            <Dropdown :options="userMenu">
              <template #trigger="{ open }">
                <button
                  type="button"
                  class="flex w-full items-center gap-2.5 rounded-lg p-1.5 hover:bg-surface-gray-1 dark:hover:bg-neutral-800 transition text-left cursor-pointer"
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
                    <p class="text-xs font-semibold text-ink-gray-9 dark:text-white truncate">{{ fullName }}</p>
                    <p class="text-[11px] text-ink-gray-5 dark:text-neutral-400 truncate">Administrator</p>
                  </div>
                  <ChevronUp
                    v-if="!isSidebarCollapsed"
                    class="size-3.5 text-ink-gray-4 dark:text-neutral-400 shrink-0"
                  />
                </button>
              </template>
            </Dropdown>
          </div>
        </Sidebar>
      </template>

      <!-- Pinned Page Header -->
      <PageHeader class="border-b border-outline-gray-2 bg-surface-base">
        <div class="flex items-center gap-3 flex-1 min-w-0">
          <!-- Breadcrumbs for current section -->
          <Breadcrumbs :items="currentBreadcrumbs" />

          <!-- Smart Search (only in Task section) -->
          <div
            v-if="activeSection === 'Task'"
            class="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-surface-gray-2 transition-all duration-200"
            :class="isSearchFocused || taskSearch ? 'w-56' : 'w-36'"
          >
            <Search class="size-3.5 text-ink-gray-4 shrink-0" />
            <input
              ref="taskSearchInput"
              v-model="taskSearch"
              type="text"
              placeholder="Search tasks..."
              class="flex-1 bg-transparent outline-none text-xs text-ink-gray-7 placeholder:text-ink-gray-4 min-w-0"
              @focus="isSearchFocused = true"
              @blur="isSearchFocused = false"
              @keydown.escape="taskSearch = ''; taskSearchInput?.blur()"
            />
            <button
              v-if="taskSearch"
              type="button"
              class="shrink-0 text-ink-gray-4 hover:text-ink-gray-7 transition-colors cursor-pointer"
              @click="taskSearch = ''; taskSearchInput?.focus()"
            >
              <XIcon class="size-3" />
            </button>
            <kbd v-else class="shrink-0 text-[10px] font-mono text-ink-gray-3">/</kbd>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <!-- Theme Toggle -->
          <Button
            variant="ghost"
            title="Toggle Theme"
            @click="toggleTheme"
          >
            <template #icon>
              <Moon v-if="!isDark" class="size-4 text-ink-gray-7 hover:text-ink-gray-9 transition-colors" />
              <Sun v-else class="size-4 text-ink-gray-7 hover:text-ink-gray-9 transition-colors" />
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
                class="size-4 text-ink-gray-7 hover:text-gray-950 transition-colors"
                :class="{ 'animate-spin': loading }"
              />
            </template>
          </Button>

          <!-- Add Task Button (in Task view) -->
          <Button
            v-if="activeSection === 'Task'"
            variant="solid"
            theme="gray"
            label="Add task"
            @click="createModalOpen = true"
          >
            <template #prefix>
              <Plus class="size-4 mr-0.5" />
            </template>
          </Button>

          <!-- Create Project Button (in Project view) -->
          <Button
            v-if="activeSection === 'Project'"
            variant="solid"
            theme="gray"
            label="Create Project"
            @click="loadEmployees(); createProjectModalOpen = true"
          >
            <template #prefix>
              <Plus class="size-4 mr-0.5" />
            </template>
          </Button>
        </div>
      </PageHeader>

      <!-- Main Body Container: Full height flex layout, no page scroll -->
      <div class="w-full flex-1 min-h-0 flex flex-col px-3 pt-2 pb-2 overflow-hidden">
        <!-- 1. TASK VIEW -->
        <template v-if="activeSection === 'Task'">
          <!-- Sub-Header Tabs & Task Count (Locked sticky filter header) -->
          <div class="shrink-0 pb-2 mb-2 bg-surface-base flex flex-wrap items-center justify-between gap-2 border-b border-outline-gray-1">
            <div class="flex items-center gap-2">
              <div class="flex items-center gap-1.5">
                <Switch v-model="showAssignedToMe" />
                <span class="text-xs font-medium text-ink-gray-7 select-none cursor-pointer" @click="showAssignedToMe = !showAssignedToMe">Assigned to Me</span>
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
                <span class="text-xs font-medium text-ink-gray-7 truncate block max-w-[140px]" :title="row.project">
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
                  class="text-xs select-none"
                  :class="getPriorityTextClass(row.priority)"
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
                      class="relative flex items-center justify-center size-7 rounded-full bg-surface-gray-3 text-[10px] font-bold text-ink-gray-6"
                    >
                      +{{ row.assignees.length - 3 }}
                    </div>
                  </div>
                </div>
                <span v-else class="text-ink-gray-4 italic text-sm">Unassigned</span>
              </template>

              <template #cell-due_date="{ row }">
                <span
                  v-if="row.due_date"
                  class="font-mono text-xs"
                  :class="isTaskOverdue(row) ? 'text-rose-600 font-bold' : 'text-ink-gray-6'"
                  :title="isTaskOverdue(row) ? 'Task is overdue' : ''"
                >
                  {{ formatDueDate(row.due_date) }}
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

        <!-- 2. TIMESHEET VIEW (Profile top + 2 columns) -->
        <template v-else-if="activeSection === 'Timesheet'">
          <div class="shrink-0 mb-3 flex items-center justify-between">
            <div>
              <h2 class="text-lg font-bold text-ink-gray-9">Timesheet</h2>
              <p class="text-xs text-ink-gray-5">
                Log and track work hours
                <span v-if="selectedTsUserDisplayName" class="text-[#417c7d] font-semibold">
                  — {{ selectedTsUserDisplayName }}
                </span>
              </p>
            </div>
            <div class="flex items-center gap-2.5">
              <div v-if="availableTimesheetMembers.length > 0" class="relative">
                <select
                  v-model="selectedTimesheetUser"
                  class="bg-surface-base border border-outline-gray-2 rounded-lg px-2.5 py-1.5 text-xs text-ink-gray-8 font-medium focus:ring-2 focus:ring-[#417c7d]/20 focus:border-[#417c7d] outline-none transition cursor-pointer"
                  @change="loadTimesheetCalendar(selectedTimesheetUser)"
                >
                  <option :value="currentUserEmail">
                    {{ currentUserName ? `${currentUserName} (Me)` : 'My Timesheet' }}
                  </option>
                  <option
                    v-for="m in availableTimesheetMembers"
                    :key="m.user || m.email || m.employee"
                    :value="m.user || m.email || m.employee"
                  >
                    {{ m.employee_name || m.name || m.user || m.email }}
                  </option>
                </select>
              </div>
              <Button
                variant="solid"
                class="!bg-[#417c7d] hover:!bg-[#356667] !text-white"
                @click="openTimesheetForm(selectedTsDayDate || '')"
              >
                <template #prefix><Plus class="size-3.5" /></template>
                <span>Log Hours</span>
              </Button>
            </div>
          </div>

          <!-- User Profile Card at Top -->
          <div class="shrink-0 flex items-center gap-4 p-4 bg-surface-base border border-outline-gray-2 rounded-xl mb-3">
            <div class="flex flex-col items-center">
              <div class="size-14 rounded-full bg-surface-base ring-2 ring-gray-200 shadow-sm overflow-hidden flex items-center justify-center">
                <Avatar
                  :image="selectedTsUserImage"
                  :label="selectedTsUserDisplayName || selectedTimesheetUser || 'User'"
                  size="xl"
                  shape="circle"
                />
              </div>
            </div>
            <div class="flex-1 min-w-0">
              <h3 class="text-sm font-bold text-ink-gray-9 leading-tight">
                {{ selectedTsUserDisplayName || selectedTimesheetUser || 'My Timesheet' }}
              </h3>
              <p class="text-[11px] text-ink-gray-5 truncate">{{ selectedTimesheetUser || currentUserEmail }}</p>
            </div>
            <div class="flex items-center gap-4">
              <div class="text-center">
                <p class="text-lg font-bold text-emerald-600">{{ totalTsMonthlyHours }}h</p>
                <p class="text-[10px] text-ink-gray-5">Logged</p>
              </div>
              <div class="text-center">
                <p class="text-lg font-bold text-ink-gray-8">{{ tsWorkingDaysCount }}</p>
                <p class="text-[10px] text-ink-gray-5">Days</p>
              </div>
              <div class="text-center">
                <p class="text-lg font-bold text-purple-600">{{ tsAvgHoursPerDay }}h</p>
                <p class="text-[10px] text-ink-gray-5">Avg/Day</p>
              </div>
            </div>
          </div>

          <!-- 2 Columns: Calendar + Activity Log -->
          <div class="flex-1 min-h-0 flex gap-3 overflow-hidden">
            <!-- Left: Timesheet Calendar -->
            <div class="flex-1 min-w-0 flex flex-col overflow-hidden bg-surface-base border border-outline-gray-2 rounded-xl">
              <TimesheetCalendar
                :events="timesheetCalendarEvents"
                :loading="timesheetCalendarLoading"
                :selected-date="selectedTsDayDate"
                @cellClick="handleTsCalendarClick"
                class="flex-1 min-h-0"
              />
            </div>

            <!-- Right: Activity Log -->
            <div class="w-[340px] xl:w-[380px] shrink-0 min-w-0 flex flex-col overflow-hidden bg-surface-base border border-outline-gray-2 rounded-xl">
              <div class="shrink-0 px-4 py-3 border-b border-outline-gray-1 flex items-center justify-between">
                <div>
                  <h4 class="text-xs font-bold text-ink-gray-8 uppercase tracking-wide">Activity Log</h4>
                  <p v-if="selectedTsDayDate" class="text-[11px] text-[#417c7d] font-semibold mt-0.5">
                    {{ selectedTsDayDate }}
                  </p>
                </div>
                <Button
                  v-if="selectedTsDayDate"
                  variant="ghost"
                  size="sm"
                  class="text-[11px] text-[#417c7d] font-semibold"
                  @click="openTimesheetForm(selectedTsDayDate)"
                >
                  <template #prefix><Plus class="size-3" /></template>
                  <span>Add Entry</span>
                </Button>
              </div>

              <div v-if="!selectedTsDayDate" class="flex-1 flex flex-col items-center justify-center text-center px-4">
                <div class="size-10 rounded-xl bg-surface-gray-3 flex items-center justify-center mb-3">
                  <Clock class="size-5 text-gray-400" />
                </div>
                <p class="text-xs font-semibold text-ink-gray-7 mb-1">Select a timesheet day</p>
                <p class="text-[10px] text-gray-400 max-w-[200px]">
                  Click on any day in the calendar to view or log your work activities
                </p>
              </div>

              <div v-else-if="selectedTsDayEntries.length === 0" class="flex-1 flex flex-col items-center justify-center text-center px-4 py-10">
                <div class="size-10 rounded-xl bg-rose-50 flex items-center justify-center mb-3">
                  <Clock class="size-5 text-rose-400" />
                </div>
                <p class="text-xs font-semibold text-ink-gray-7 mb-1">No timesheet logged</p>
                <p class="text-[10px] text-gray-400 mb-4">No hours logged for {{ selectedTsDayDate }}</p>
                <Button
                  variant="subtle"
                  size="sm"
                  class="text-xs"
                  @click="openTimesheetForm(selectedTsDayDate)"
                >
                  <template #prefix><Plus class="size-3" /></template>
                  <span>Log Hours for this Day</span>
                </Button>
              </div>

              <div v-else class="flex-1 overflow-y-auto p-3 space-y-3">
                <div
                  v-for="(ts, tIdx) in selectedTsDayEntries"
                  :key="ts.name || tIdx"
                  class="p-3 rounded-lg border border-outline-gray-1 bg-surface-gray-2/80 space-y-2"
                >
                  <div class="flex items-center justify-between">
                    <div class="flex items-center gap-2">
                      <span class="text-xs font-bold text-ink-gray-8">{{ ts.name }}</span>
                      <Badge :theme="ts.status === 'Submitted' ? 'green' : 'blue'" variant="subtle" size="sm">
                        {{ ts.status }}
                      </Badge>
                    </div>
                    <div class="flex items-center gap-2">
                      <span class="text-xs font-bold text-emerald-600">{{ ts.total_hours }}h</span>
                      <button
                        type="button"
                        class="text-[10px] text-blue-600 hover:text-blue-800 font-medium cursor-pointer"
                        @click="openTimesheetForm(ts.date || selectedTsDayDate, ts)"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        class="text-[10px] text-rose-500 hover:text-rose-700 font-medium cursor-pointer"
                        @click="deleteTimesheetConfirm(ts)"
                      >
                        Delete
                      </button>
                    </div>
                  </div>

                  <div class="space-y-1.5">
                    <div
                      v-for="(item, iIdx) in ts.items"
                      :key="iIdx"
                      class="flex items-center gap-2 text-[10px] bg-surface-base border border-outline-gray-1 rounded-md px-2.5 py-2 shadow-2xs"
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
                        <span v-if="item.project" class="text-ink-gray-8 font-medium truncate block">{{ item.project }}</span>
                        <span v-if="item.task" class="text-ink-gray-5 truncate block">{{ item.task }}</span>
                        <span v-if="item.description" class="text-gray-400 truncate block text-[9px]">{{ item.description }}</span>
                      </div>
                      <span class="text-ink-gray-8 font-bold shrink-0">{{ item.hrs }}h</span>
                      <span v-if="item.from_time || item.to_time" class="text-gray-400 font-mono text-[9px] shrink-0">
                        {{ item.from_time?.slice(11, 16) || item.from_time }} – {{ item.to_time?.slice(11, 16) || item.to_time }}
                      </span>
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
                <div class="relative bg-surface-base rounded-xl shadow-2xl border border-outline-gray-2 w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
                  <!-- Header -->
                  <div class="flex items-center justify-between px-5 py-3.5 border-b border-outline-gray-1 shrink-0">
                    <h3 class="text-sm font-bold text-ink-gray-9">Log Timesheet</h3>
                    <button type="button" class="inline-flex items-center justify-center size-7 rounded-lg text-gray-400 hover:text-ink-gray-6 hover:bg-surface-gray-3 transition cursor-pointer" @click="timesheetFormOpen = false">
                      <svg class="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
                    </button>
                  </div>

                  <!-- Body -->
                  <div class="overflow-y-auto flex-1 px-5 py-4 space-y-4">
                    <!-- Date + Status -->
                    <div class="grid grid-cols-2 gap-3">
                      <div>
                        <label class="text-xs font-semibold text-ink-gray-7 mb-1 block">Date</label>
                        <input type="date" v-model="timesheetFormDate" class="w-full text-sm border border-outline-gray-2 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition" />
                      </div>
                      <div>
                        <label class="text-xs font-semibold text-ink-gray-7 mb-1 block">Status</label>
                        <select v-model="timesheetFormStatus" class="w-full text-sm border border-outline-gray-2 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition">
                          <option value="Draft">Draft</option>
                          <option value="Submitted">Submitted</option>
                        </select>
                      </div>
                    </div>

                    <!-- Items -->
                    <div>
                      <div class="flex items-center justify-between mb-2">
                        <label class="text-xs font-semibold text-ink-gray-7">Time Entries</label>
                        <button type="button" class="text-[10px] font-medium text-blue-600 hover:text-blue-700 cursor-pointer transition" @click="addTsFormItem">+ Add Row</button>
                      </div>
                      <div v-for="(item, idx) in timesheetFormItems" :key="idx" class="bg-surface-gray-2 rounded-lg p-3 mb-2 border border-outline-gray-1">
                        <div class="grid grid-cols-3 gap-2 mb-2">
                          <div>
                            <label class="text-[10px] text-ink-gray-5 mb-0.5 block">Activity</label>
                            <select v-model="item.activity_type" class="w-full text-xs border border-outline-gray-2 rounded px-2 py-1.5 outline-none focus:ring-1 focus:ring-blue-200">
                              <option value="Task">Task</option>
                              <option value="Meeting">Meeting</option>
                              <option value="Research">Research</option>
                            </select>
                          </div>
                          <div>
                            <label class="text-[10px] text-ink-gray-5 mb-0.5 block">Project</label>
                            <input v-model="item.project" type="text" class="w-full text-xs border border-outline-gray-2 rounded px-2 py-1.5 outline-none focus:ring-1 focus:ring-blue-200" placeholder="Project name" />
                          </div>
                          <div>
                            <label class="text-[10px] text-ink-gray-5 mb-0.5 block">Task ID</label>
                            <input v-model="item.task" type="text" class="w-full text-xs border border-outline-gray-2 rounded px-2 py-1.5 outline-none focus:ring-1 focus:ring-blue-200" placeholder="TFT-XXXXX" />
                          </div>
                        </div>
                        <div class="grid grid-cols-2 gap-2 mb-2">
                          <div>
                            <label class="text-[10px] text-ink-gray-5 mb-0.5 block">From</label>
                            <input v-model="item.from_time" type="datetime-local" class="w-full text-xs border border-outline-gray-2 rounded px-2 py-1.5 outline-none focus:ring-1 focus:ring-blue-200" />
                          </div>
                          <div>
                            <label class="text-[10px] text-ink-gray-5 mb-0.5 block">To</label>
                            <input v-model="item.to_time" type="datetime-local" class="w-full text-xs border border-outline-gray-2 rounded px-2 py-1.5 outline-none focus:ring-1 focus:ring-blue-200" />
                          </div>
                        </div>
                        <div class="flex items-center justify-between">
                          <input v-model="item.description" type="text" class="flex-1 text-[10px] border border-outline-gray-2 rounded px-2 py-1 outline-none focus:ring-1 focus:ring-blue-200 mr-2" placeholder="Description (optional)" />
                          <button v-if="timesheetFormItems.length > 1" type="button" class="text-red-400 hover:text-red-600 cursor-pointer transition text-[10px]" @click="removeTsFormItem(idx)">Remove</button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <!-- Footer -->
                  <div class="shrink-0 px-5 py-3 border-t border-outline-gray-1 flex items-center justify-end gap-2">
                    <button type="button" class="px-4 py-2 text-xs font-medium text-ink-gray-7 bg-surface-gray-3 rounded-lg hover:bg-gray-200 transition cursor-pointer" @click="timesheetFormOpen = false">Cancel</button>
                    <button type="button" class="px-4 py-2 text-xs font-medium text-white bg-gray-900 dark:bg-white dark:text-gray-900 rounded-lg hover:bg-black dark:hover:bg-gray-100 transition cursor-pointer disabled:opacity-50" :disabled="timesheetFormSaving" @click="submitTimesheet">
                      {{ timesheetFormSaving ? 'Saving...' : 'Save Timesheet' }}
                    </button>
                  </div>
                </div>
              </div>
            </transition>
          </teleport>
        </template>

        <!-- 3. PROJECT VIEW (List view with CommonListView + Pagination) -->
        <template v-else-if="activeSection === 'Project'">
          <!-- Sub-Header Tabs & Project Count (Locked sticky filter header) -->
          <div class="shrink-0 pb-2 mb-2 bg-surface-base flex flex-wrap items-center justify-between gap-2 border-b border-outline-gray-1">
            <div class="flex items-center gap-2">
              <TabButtons
                v-model="projectStatusTab"
                :options="projectStatusOptions"
              />
            </div>
            <div class="flex items-center gap-3 text-xs font-medium text-ink-gray-6">
              <Combobox
                v-model="selectedProjectMemberFilter"
                v-model:query="memberFilterQuery"
                :options="filteredMemberFilterOptions"
                :filterable="false"
                placeholder="Filter by Team Member"
                size="sm"
                class="w-56"
              >
                <template #prefix="{ selectedOption }">
                  <Avatar
                    v-if="selectedOption && selectedOption.value"
                    :image="selectedOption.image"
                    :label="selectedOption.label"
                    size="xs"
                  />
                </template>
                <template #item-prefix="{ item }">
                  <Avatar v-if="item.value" :image="item.image" :label="item.label" size="xs" />
                </template>
                <template #item-label="{ item }">
                  <div class="min-w-0 flex justify-between items-center w-full">
                    <div class="truncate font-medium text-ink-gray-9 text-xs">{{ item.label }}</div>
                    <div v-if="item.description" class="truncate text-[10px] text-ink-gray-5 ml-2">{{ item.description }}</div>
                  </div>
                </template>
              </Combobox>
              <Combobox
                v-model="selectedProjectTeamFilter"
                :options="[{label: 'All Teams', value: ''}, ...teams.map(t => ({label: t.name, value: t.name}))]"
                placeholder="Filter by Team"
                size="sm"
                class="w-48"
              />
              <span class="whitespace-nowrap">{{ sortedProjects.length }} projects</span>
            </div>
          </div>

          <!-- Projects List Table View: Fills remaining height -->
          <div class="flex-1 min-h-0 flex flex-col overflow-hidden outline-none focus:outline-none ring-0">
            <CommonListView
              :columns="projectTableColumns"
              :rows="paginatedProjects"
              :loading="loading"
              :sort-key="projectSortField"
              :sort-order="projectSortDirection"
              :pagination="projectPaginationInfo"
              :selectable="false"
              :row-key="'id'"
              :item-label="'projects'"
              :row-class="getProjectRowClass"
              @sort-change="handleProjectSortChange"
              @load-more="handleProjectLoadMore"
              @load-all="handleProjectLoadAll"
              @row-click="openEditProject"
            >
              <template #cell-sr_no="{ row }">
                <span class="text-xs font-medium text-ink-gray-6 dark:text-gray-400">{{ row.sr_no }}</span>
              </template>

              <template #cell-name="{ row }">
                <div class="flex items-center gap-2">
                  <Folder class="size-4 text-blue-500 shrink-0" />
                  <div class="min-w-0">
                    <div class="truncate font-semibold text-sm text-ink-gray-8 dark:text-gray-100">{{ row.name }}</div>
                  </div>
                </div>
              </template>

              <template #cell-parent_project="{ row }">
                <span class="text-xs text-ink-gray-7 dark:text-gray-300 truncate">{{ row.parent_project || '—' }}</span>
              </template>

              <template #cell-status="{ row }">
                <Badge :theme="row.status === 'Completed' ? 'green' : row.status === 'In Progress' ? 'blue' : row.status === 'Cancelled' ? 'red' : 'gray'" variant="subtle" size="sm">
                  {{ row.status }}
                </Badge>
              </template>

              <template #cell-team="{ row }">
                <span class="text-xs font-medium text-ink-gray-7 dark:text-gray-300 truncate">{{ row.team }}</span>
              </template>

              <template #cell-lead="{ row }">
                <div v-if="row.lead && row.lead !== '—'" class="flex items-center gap-2 min-w-0">
                  <Avatar :image="row.lead_image" :label="row.lead" size="sm" class="shrink-0" />
                  <span class="font-medium text-xs text-ink-gray-7 dark:text-gray-200 truncate">{{ row.lead }}</span>
                </div>
                <span v-else class="text-xs text-ink-gray-4 dark:text-gray-500">—</span>
              </template>

              <template #cell-progress="{ row }">
                <div class="flex items-center gap-2 w-full pr-4">
                  <div class="flex-1 h-1.5 bg-surface-gray-3 dark:bg-gray-800 rounded-full overflow-hidden">
                    <div
                      class="h-full bg-blue-500 rounded-full transition-all duration-500"
                      :style="{ width: row.progress + '%' }"
                    />
                  </div>
                  <span class="text-[11px] font-medium text-ink-gray-6 dark:text-gray-300 w-8 text-right">{{ row.progress }}%</span>
                </div>
              </template>

              <template #cell-start_date="{ row }">
                <span v-if="row.start_date" class="font-mono text-xs text-ink-gray-6 dark:text-gray-300">
                  {{ formatDueDate(row.start_date) }}
                </span>
                <span v-else class="text-ink-gray-4 dark:text-gray-500">—</span>
              </template>

              <template #cell-end_date="{ row }">
                <span v-if="row.end_date" class="font-mono text-xs text-ink-gray-6 dark:text-gray-300">
                  {{ formatDueDate(row.end_date) }}
                </span>
                <span v-else class="text-ink-gray-4 dark:text-gray-500">—</span>
              </template>

              <template #cell-modified="{ row }">
                <span
                  class="text-xs"
                  :class="isRowJustNow(row) ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : 'text-ink-gray-5 dark:text-gray-400'"
                >
                  {{ formatPrettyDate(row) }}
                </span>
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
                : 'bg-surface-base text-ink-gray-7 border-outline-gray-2 hover:bg-surface-gray-2 hover:border-outline-gray-3'"
              @click="selectAllTeams"
            >
              <span class="size-1.5 rounded-full shrink-0" :class="allTeamsSelected ? 'bg-surface-base' : 'bg-blue-500'" />
              All Teams
              <span class="font-bold" :class="allTeamsSelected ? 'text-blue-100' : 'text-ink-gray-5'">({{ teamData.length }})</span>
            </button>
            <button
              v-for="team in teams"
              :key="team.name"
              type="button"
              class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all cursor-pointer select-none"
              :class="selectedTeam && selectedTeam.name === team.name
                ? 'bg-blue-600 text-white border-blue-600 shadow-sm ring-2 ring-blue-200'
                : 'bg-surface-base text-ink-gray-7 border-outline-gray-2 hover:bg-surface-gray-2 hover:border-outline-gray-3'"
              @click="selectTeam(team)"
            >
              <span class="size-1.5 rounded-full shrink-0" :class="selectedTeam && selectedTeam.name === team.name ? 'bg-surface-base' : (team.is_active ? 'bg-green-500' : 'bg-gray-400')" />
              {{ team.team_name || team.name }}
              <span class="font-bold" :class="selectedTeam && selectedTeam.name === team.name ? 'text-blue-100' : 'text-ink-gray-5'">({{ team.member_count || 0 }})</span>
            </button>
            <button
              type="button"
              title="Create new team"
              class="inline-flex items-center justify-center size-7 rounded-full border border-dashed border-outline-gray-3 text-gray-400 hover:border-gray-400 hover:text-ink-gray-6 hover:bg-surface-gray-2 transition-all cursor-pointer"
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
              <div class="size-14 rounded-2xl bg-surface-gray-3 flex items-center justify-center mb-4">
                <Users class="size-7 text-gray-400" />
              </div>
              <p class="text-sm font-semibold text-ink-gray-7 mb-1">No team members yet</p>
              <p class="text-xs text-gray-400 mb-4 max-w-xs">
                This team has no members. Add someone to get started.
              </p>
              <Button
                variant="solid"
                theme="gray"
                label="Add Member"
                
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
              <div class="w-[260px] shrink-0 overflow-y-auto border-r border-outline-gray-2 bg-surface-base">
                <div class="py-5 px-5">
                  <!-- Back button -->
                  <button
                    type="button"
                    class="inline-flex items-center gap-1.5 text-xs font-medium text-ink-gray-5 hover:text-ink-gray-7 mb-4 cursor-pointer transition"
                    @click="backToList"
                  >
                    <svg class="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
                    Back to members
                  </button>

                  <!-- Avatar + Name -->
                  <div class="flex flex-col items-center text-center mb-5">
                    <div class="size-20 rounded-full bg-surface-gray-3 overflow-hidden shadow-md mb-3">
                      <Avatar
                        :image="selectedMember.image"
                        :label="selectedMember.name"
                        size="3xl"
                        shape="circle"
                        class="size-20"
                      />
                    </div>
                    <h3 class="text-base font-bold text-ink-gray-9 leading-tight">{{ selectedMember.name }}</h3>
                    <p class="text-xs text-ink-gray-5 mt-0.5">{{ selectedMember.email }}</p>
                    <span
                      class="inline-flex mt-2 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border"
                      :class="getMemberRoleBadgeClass(selectedMember.role)"
                    >
                      {{ selectedMember.role }}
                    </span>
                  </div>

                  <!-- Stats -->
                  <div class="grid grid-cols-2 gap-2.5 mb-5">
                    <div class="text-center p-2.5 bg-surface-gray-2 rounded-lg">
                      <p class="text-lg font-bold text-ink-gray-9">{{ selectedMember.active_tasks || 0 }}</p>
                      <p class="text-[10px] text-ink-gray-5">Active</p>
                    </div>
                    <div class="text-center p-2.5 bg-surface-gray-2 rounded-lg">
                      <p class="text-lg font-bold text-ink-gray-9">{{ selectedMember.completed_tasks || 0 }}</p>
                      <p class="text-[10px] text-ink-gray-5">Done</p>
                    </div>
                    <div class="text-center p-2.5 bg-surface-gray-2 rounded-lg">
                      <p class="text-lg font-bold text-ink-gray-9">{{ selectedMember.total_tasks || 0 }}</p>
                      <p class="text-[10px] text-ink-gray-5">Total</p>
                    </div>
                    <div class="text-center p-2.5 rounded-lg" :class="(selectedMember.overdue_tasks || 0) > 0 ? 'bg-red-50' : 'bg-surface-gray-2'">
                      <p class="text-lg font-bold" :class="(selectedMember.overdue_tasks || 0) > 0 ? 'text-red-600' : 'text-ink-gray-9'">{{ selectedMember.overdue_tasks || 0 }}</p>
                      <p class="text-[10px] text-ink-gray-5">Overdue</p>
                    </div>
                  </div>

                  <!-- Details -->
                  <div class="divide-y divide-gray-100 border-t border-outline-gray-1">
                    <div class="flex items-center justify-between py-2.5">
                      <span class="text-xs text-ink-gray-5">Status</span>
                      <Badge :theme="selectedMember.status === 'Active' ? 'green' : 'gray'" variant="subtle" size="sm">
                        {{ selectedMember.status }}
                      </Badge>
                    </div>
                    <div class="flex items-center justify-between py-2.5">
                      <span class="text-xs text-ink-gray-5">Access</span>
                      <span class="text-xs font-medium text-ink-gray-7">{{ selectedMember.access_level || 'Operate' }}</span>
                    </div>
                    <div class="flex items-center justify-between py-2.5">
                      <span class="text-xs text-ink-gray-5">Team</span>
                      <span class="text-xs font-medium text-ink-gray-7 truncate ml-2">{{ selectedTeam?.team_name || selectedTeam?.name || '—' }}</span>
                    </div>
                    <div class="flex items-center justify-between py-2.5">
                      <span class="text-xs text-ink-gray-5">Employee</span>
                      <span class="text-xs font-mono text-ink-gray-6">{{ selectedMember.employee || '—' }}</span>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Calendar + Activity list (50/50) -->
              <div class="flex-1 min-w-0 flex overflow-hidden">
                <!-- Calendar (50%) -->
                <div class="w-1/2 min-w-0 flex flex-col overflow-hidden bg-surface-base border-r border-outline-gray-2">
                  <TimesheetCalendar
                    :events="calendarEvents"
                    :loading="calendarLoading"
                    @cellClick="handleCalendarClick"
                    class="flex-1 min-h-0"
                  />
                </div>

                <!-- Activity list (50%) -->
                <div class="w-1/2 min-w-0 flex flex-col overflow-hidden bg-surface-base">
                  <!-- Header -->
                  <div class="shrink-0 px-4 py-2.5 border-b border-outline-gray-1">
                    <h4 class="text-xs font-bold text-ink-gray-7 uppercase tracking-wide">Activity Log</h4>
                    <p v-if="selectedDayDate" class="text-[11px] text-ink-gray-5 mt-0.5">{{ selectedDayDate }}</p>
                  </div>

                  <!-- Placeholder when no day selected -->
                  <div
                    v-if="!selectedDayDate"
                    class="flex-1 flex flex-col items-center justify-center text-center px-4"
                  >
                    <div class="size-10 rounded-xl bg-surface-gray-3 flex items-center justify-center mb-3">
                      <Clock class="size-5 text-gray-400" />
                    </div>
                    <p class="text-xs font-semibold text-ink-gray-6 mb-1">Select a timesheet day</p>
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
                      <p class="text-xs font-semibold text-ink-gray-6 mb-1">No timesheet logged</p>
                      <p class="text-[10px] text-gray-400">No work entries found for this day</p>
                    </div>

                    <!-- Timesheet entries -->
                    <div v-else>
                      <div v-for="(ts, tIdx) in selectedDayEntries" :key="ts.name || tIdx" class="px-4 py-3 border-b border-gray-50 last:border-b-0">
                        <div class="flex items-center justify-between mb-2">
                          <div class="flex items-center gap-2">
                            <span class="text-[11px] font-bold text-ink-gray-8">{{ ts.name }}</span>
                            <Badge :theme="ts.status === 'Submitted' ? 'green' : 'blue'" variant="subtle" size="sm">{{ ts.status }}</Badge>
                          </div>
                          <span class="text-[11px] font-bold text-green-600">{{ ts.total_hours }}h</span>
                        </div>
                        <div class="space-y-1.5">
                          <div
                            v-for="(item, iIdx) in ts.items"
                            :key="iIdx"
                            class="flex items-center gap-2 text-[10px] bg-surface-gray-2 rounded-lg px-2.5 py-2"
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
                              <span v-if="item.project" class="text-ink-gray-7 font-medium truncate block">{{ item.project }}</span>
                              <span v-if="item.task" class="text-ink-gray-5 truncate block">/ {{ item.task }}</span>
                            </div>
                            <span class="text-ink-gray-7 font-bold shrink-0">{{ item.hrs }}h</span>
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
      :current-user="currentUserEmail"
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
      <div class="relative bg-surface-base rounded-xl shadow-2xl w-full max-w-sm mx-4">
        <div class="flex items-center justify-between px-5 py-4 border-b border-outline-gray-2">
          <h3 class="text-base font-bold text-ink-gray-9">Create New Team</h3>
          <button
            type="button"
            class="size-7 flex items-center justify-center rounded-lg text-gray-400 hover:bg-surface-gray-3 hover:text-ink-gray-6 transition cursor-pointer"
            @click="createTeamOpen = false"
          >
            <span class="text-lg leading-none">&times;</span>
          </button>
        </div>
        <div class="px-5 py-4">
          <label class="block text-xs font-semibold text-ink-gray-7 mb-1">Team Name *</label>
          <TextInput
            v-model="newTeamName"
            placeholder="e.g. Engineering Team"
            class="w-full"
            @keydown.enter="submitCreateTeam"
          />
        </div>
        <div class="flex items-center justify-end gap-2 px-5 py-3 border-t border-outline-gray-1 bg-surface-gray-2 rounded-b-xl">
          <Button variant="subtle" label="Cancel" @click="createTeamOpen = false" />
          <Button
            variant="solid"
            theme="gray"
            label="Create"
            
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
      <div class="relative bg-surface-base rounded-xl shadow-2xl w-full max-w-lg mx-4">
        <!-- Header -->
        <div class="flex items-center justify-between px-5 py-4 border-b border-outline-gray-2">
          <div class="flex items-center gap-2.5">
            <div class="size-8 rounded-lg bg-blue-50 flex items-center justify-center">
              <UserPlus class="size-4 text-blue-600" />
            </div>
            <div>
              <h3 class="text-base font-bold text-ink-gray-9">Add Team Member</h3>
              <p class="text-xs text-ink-gray-5">Assign an employee to a team with a role</p>
            </div>
          </div>
          <button
            type="button"
            class="size-7 flex items-center justify-center rounded-lg text-gray-400 hover:bg-surface-gray-3 hover:text-ink-gray-6 transition cursor-pointer"
            @click="addMemberOpen = false"
          >
            <span class="text-lg leading-none">&times;</span>
          </button>
        </div>

        <!-- Body -->
        <div class="px-5 py-5 space-y-4">

          <!-- Step 1: Team (always visible) -->
          <div>
            <label class="block text-xs font-semibold text-ink-gray-7 mb-1.5">Step 1 — Select Team *</label>
            <select
              :value="memberForm.team"
              class="w-full text-sm border border-outline-gray-2 rounded-lg px-3 py-2 bg-surface-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
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
            <label class="block text-xs font-semibold text-ink-gray-7 mb-1.5">Step 2 — Select Employee *</label>

            <!-- Selected employee display / trigger -->
            <div
              v-if="memberForm.employee && !empDropdownOpen"
              class="flex items-center justify-between w-full text-sm border border-outline-gray-2 rounded-lg px-3 py-2 bg-surface-base hover:border-outline-gray-3 transition cursor-pointer"
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
                  class="w-full text-sm border border-outline-gray-2 rounded-lg pl-3 pr-8 py-2 bg-surface-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
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
              class="absolute z-20 mt-1 w-full bg-surface-base border border-outline-gray-2 rounded-lg shadow-lg max-h-60 overflow-y-auto"
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
                    ? 'bg-surface-gray-2 text-gray-400 cursor-not-allowed opacity-60'
                    : memberForm.employee === emp.name
                      ? 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                      : 'text-ink-gray-7 hover:bg-surface-gray-2'
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
                  class="shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-gray-200 text-ink-gray-5"
                >
                  Already added
                </span>
              </button>
            </div>

            <p v-if="memberSubmitted && memberErrors.employee" class="text-xs text-red-600 mt-1">{{ memberErrors.employee }}</p>
          </div>

          <!-- Employee Preview Card -->
          <div v-if="selectedEmployee" class="flex items-center gap-3 p-3 bg-surface-gray-2 rounded-lg border border-outline-gray-2 transition-all duration-200">
            <Avatar
              :label="selectedEmployee.employee_name || selectedEmployee.name"
              size="lg"
              shape="circle"
              class="shrink-0"
            />
            <div class="min-w-0 flex-1">
              <p class="text-sm font-semibold text-ink-gray-9 truncate">{{ selectedEmployee.employee_name || selectedEmployee.name }}</p>
              <p v-if="selectedEmployee.designation" class="text-xs text-ink-gray-5 truncate">{{ selectedEmployee.designation }}</p>
              <p v-if="selectedEmployee.department" class="text-xs text-gray-400 truncate">{{ selectedEmployee.department }}</p>
            </div>
            <span class="shrink-0 px-2 py-0.5 text-[10px] font-medium bg-green-50 text-green-700 border border-green-200 rounded-full">Active</span>
          </div>

          <!-- Step 3: Role & Access (only after employee selected) -->
          <div v-if="memberForm.employee" class="grid grid-cols-2 gap-4 transition-all duration-200">
            <div>
              <label class="block text-xs font-semibold text-ink-gray-7 mb-1.5">Step 3 — Role</label>
              <select
                v-model="memberForm.team_role"
                class="w-full text-sm border border-outline-gray-2 rounded-lg px-3 py-2 bg-surface-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
              >
                <option v-for="r in teamRoleOptions" :key="r" :value="r">{{ r }}</option>
              </select>
            </div>
            <div>
              <label class="block text-xs font-semibold text-ink-gray-7 mb-1.5">Access Level</label>
              <select
                v-model="memberForm.access_level"
                class="w-full text-sm border border-outline-gray-2 rounded-lg px-3 py-2 bg-surface-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
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
        <div class="flex items-center justify-between px-5 py-3.5 border-t border-outline-gray-1 bg-surface-gray-2 rounded-b-xl">
          <p v-if="memberForm.team" class="text-[11px] text-gray-400">
            Adding to: <span class="font-medium text-ink-gray-6">{{ teams.find((t) => t.name === memberForm.team)?.team_name || memberForm.team }}</span>
          </p>
          <div v-else />
          <div class="flex items-center gap-2">
            <Button variant="subtle" label="Cancel" @click="addMemberOpen = false" />
            <Button
              variant="solid"
              theme="gray"
              label="Add Member"
              
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
    
    <ProjectCreateModal
      v-model="createProjectModalOpen"
      :teams="teams"
      :employees="employees"
      :projects="projects"
      @create="loadData"
    />
    <ProjectCreateModal
      v-model="editProjectModalOpen"
      :teams="teams"
      :employees="employees"
      :projects="projects"
      :editProject="projectToEdit"
      @create="loadData"
      @update="handleProjectUpdated"
    />
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
