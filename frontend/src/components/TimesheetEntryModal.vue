<template>
  <div
    v-if="modelValue"
    class="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 transition-all duration-200 animate-in fade-in"
    role="dialog"
    aria-modal="true"
    @click.self="close"
  >
    <div
      class="bg-surface-base rounded-2xl shadow-2xl border border-outline-gray-2/90 dark:border-gray-800 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden transform transition-all duration-200 scale-100"
    >
      <form class="flex flex-col flex-1 overflow-hidden" @submit.prevent="submit">
        <!-- Modal Header -->
        <div class="px-6 py-3.5 border-b border-outline-gray-1 dark:border-gray-800 flex items-center justify-between bg-surface-base shrink-0 select-none">
          <div class="flex items-center gap-3">
            <span class="w-8 h-8 rounded-lg bg-black dark:bg-white text-white dark:text-gray-950 flex items-center justify-center text-sm font-bold shadow-xs">
              <Clock class="size-4 text-white dark:text-gray-950" />
            </span>
            <div>
              <div class="flex items-center gap-2">
                <h3 class="text-sm font-bold text-ink-gray-9 dark:text-white">
                  {{ isEdit ? 'Edit Activity Entry' : 'Log Activity Entry' }}
                </h3>
              </div>
              <p class="text-xs text-ink-gray-5 dark:text-gray-400 mt-0.5">
                {{ formattedDateDisplay }}
              </p>
            </div>
          </div>

          <!-- Header Action Buttons -->
          <div class="flex items-center gap-2">
            <Button
              type="button"
              variant="subtle"
              size="sm"
              :disabled="saving"
              @click="close"
            >
              Cancel
            </Button>
            <Button
              variant="solid"
              theme="gray"
              type="submit"
              size="sm"
              :loading="saving"
              :disabled="saving || !isFormValid"
            >
              <template #prefix>
                <Check v-if="!saving" class="size-3.5 mr-0.5" />
              </template>
              {{ isEdit ? 'Update Entry' : 'Save Entry' }}
            </Button>
            <button
              type="button"
              class="p-1.5 text-gray-400 hover:text-ink-gray-7 dark:hover:text-white hover:bg-surface-gray-3 dark:hover:bg-gray-800 rounded-lg transition cursor-pointer ml-1"
              @click="close"
            >
              <XIcon class="size-4" />
            </button>
          </div>
        </div>

        <!-- Error Banner -->
        <div
          v-if="errorMessage"
          class="px-6 py-2.5 bg-rose-50 dark:bg-rose-950/40 border-b border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs flex items-center justify-between shrink-0"
        >
          <span class="font-medium flex items-center gap-1.5">
            <svg class="size-4 shrink-0 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10" stroke-width="2"/>
              <line x1="12" y1="8" x2="12" y2="12" stroke-width="2"/>
              <line x1="12" y1="16" x2="12.01" y2="16" stroke-width="2"/>
            </svg>
            {{ errorMessage }}
          </span>
          <button
            type="button"
            class="text-rose-500 hover:text-rose-700 dark:hover:text-rose-200 font-bold ml-2 cursor-pointer text-sm"
            @click="errorMessage = ''"
          >
            &times;
          </button>
        </div>

        <!-- Modal Body (Two-Column Layout: Equal Height Left & Right) -->
        <div class="p-6 flex-1 overflow-hidden text-xs">
          <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch h-full max-h-[72vh]">
            <!-- Left Column (col-span-7): Remark with FrappeRichEditor spanning full height -->
            <div class="lg:col-span-7 flex flex-col h-full overflow-hidden">
              <div class="flex items-center justify-between mb-1.5 shrink-0">
                <label class="block font-semibold text-ink-gray-7 dark:text-gray-200">
                  Remark / Work Description
                </label>
                <span class="text-[11px] text-ink-gray-4 dark:text-gray-500">Supports rich text & lists</span>
              </div>
              <div class="flex-1 flex flex-col min-h-0 overflow-hidden">
                <FrappeRichEditor
                  v-model="form.description"
                  :placeholder="'Describe what you worked on, accomplishments, or notes...'"
                  editor-class="h-full flex flex-col"
                  min-height="min-h-[220px]"
                  class="flex-1 flex flex-col h-full"
                />
              </div>
            </div>

            <!-- Right Column (col-span-5): Meta Fields Panel -->
            <div class="lg:col-span-5 flex flex-col space-y-3.5 bg-surface-gray-1/50 dark:bg-gray-900/40 p-4 rounded-xl border border-outline-gray-1 dark:border-gray-800 h-full overflow-y-auto">
                <!-- Date (Full width) -->
                <div>
                  <label class="block font-medium text-ink-gray-6 dark:text-gray-300 mb-1">
                    Date <span class="text-rose-500">*</span>
                  </label>
                  <DatePicker
                    v-model="form.date"
                    format="DD-MM-YYYY"
                    placeholder="DD-MM-YYYY"
                    size="sm"
                    variant="outline"
                    class="w-full"
                  />
                </div>

              <!-- Activity Type -->
              <div>
                <label class="block font-medium text-ink-gray-6 dark:text-gray-300 mb-1">
                  Activity Type <span class="text-rose-500">*</span>
                </label>
                <div class="relative flex items-center">
                  <select
                    v-model="form.activity_type"
                    class="w-full bg-surface-base border border-outline-gray-2 dark:border-gray-700 hover:border-outline-gray-3 dark:hover:border-gray-600 rounded-lg pl-7 pr-7 py-1.5 text-xs text-ink-gray-8 dark:text-gray-100 font-medium focus:ring-2 focus:ring-[#417c7d]/20 focus:border-[#417c7d] outline-none transition appearance-none cursor-pointer"
                    @change="onActivityTypeChange"
                  >
                    <option value="" disabled>Select Activity Type</option>
                    <option value="Task">Task</option>
                    <option value="Meeting">Meeting</option>
                    <option value="Research">Research</option>
                  </select>
                  <component
                    :is="getActivityIcon(form.activity_type)"
                    class="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 pointer-events-none"
                    :class="getActivityIconClass(form.activity_type)"
                  />
                  <ChevronDown class="absolute right-2.5 top-1/2 -translate-y-1/2 size-3.5 pointer-events-none text-gray-400 dark:text-gray-500" />
                </div>
              </div>

              <!-- Project & Task (Visible ONLY when Activity Type === 'Task') -->
              <transition
                enter-active-class="transition-all duration-200 ease-out"
                leave-active-class="transition-all duration-150 ease-in"
                enter-from-class="opacity-0 -translate-y-1"
                leave-to-class="opacity-0 -translate-y-1"
              >
                <div v-if="form.activity_type === 'Task'" class="space-y-3 pt-1 border-t border-outline-gray-1 dark:border-gray-800/80">
                  <!-- Project Field -->
                  <div>
                    <div class="flex items-center justify-between mb-1">
                      <label class="block font-medium text-ink-gray-6 dark:text-gray-300">
                        Project <span class="text-rose-500">*</span>
                      </label>
                      <span v-if="form.project" class="text-[10px] text-[#417c7d] font-semibold cursor-pointer hover:underline" @click="form.project = ''; form.task = ''">
                        Clear
                      </span>
                    </div>
                    <Combobox
                      v-model="form.project"
                      :options="projectOptions"
                      placeholder="Search and select project..."
                      size="sm"
                      class="w-full"
                      @update:modelValue="onProjectChange"
                    />
                  </div>

                  <!-- Task Field (Filtered by Selected Project using frappe-ui Combobox with status & title) -->
                  <div>
                    <div class="flex items-center justify-between mb-1">
                      <label class="block font-medium text-ink-gray-6 dark:text-gray-300">
                        Task <span class="text-rose-500">*</span>
                      </label>
                      <span v-if="form.task" class="text-[10px] text-[#417c7d] font-semibold cursor-pointer hover:underline" @click="form.task = ''; taskSearchQuery = ''">
                        Clear
                      </span>
                    </div>
                    <Combobox
                      v-model="form.task"
                      v-model:query="taskSearchQuery"
                      :options="taskOptions"
                      :loading="taskLoading"
                      :filterable="false"
                      :disabled="!form.project"
                      :placeholder="taskLoading ? 'Searching tasks...' : (taskOptions.length ? 'Search and select task...' : (form.project ? 'No tasks found' : 'Select project first'))"
                      empty-text="No tasks found"
                      size="sm"
                      class="w-full"
                      @update:query="onTaskSearchQueryChange"
                      @update:modelValue="onTaskChange"
                    >
                      <template #item-label="{ item }">
                        <div class="min-w-0 flex-1 py-0.5">
                          <div class="flex items-center justify-between gap-2 mb-0.5">
                            <span class="truncate font-semibold text-xs text-ink-gray-9 dark:text-gray-100">{{ item.label }}</span>
                            <span
                              v-if="item.status"
                              class="inline-flex items-center px-1.5 py-0.2 shrink-0 text-[10px] font-semibold rounded-sm tracking-wide"
                              :class="getStatusBadgeClass(item.status)"
                            >
                              {{ item.status }}
                            </span>
                          </div>
                          <div
                            v-if="item.description"
                            class="truncate text-[11px] text-ink-gray-5 dark:text-gray-400"
                          >
                            {{ item.description }}
                          </div>
                        </div>
                      </template>
                    </Combobox>
                    <p v-if="!form.project" class="text-[10px] text-ink-gray-4 dark:text-gray-500 mt-1">
                      Selecting a project filters the available tasks.
                    </p>
                  </div>
                </div>
              </transition>

              <!-- Time Range: From Time & To Time using frappe-ui TimePicker (12-hour AM/PM) -->
              <div class="pt-1 border-t border-outline-gray-1 dark:border-gray-800/80">
                <div class="grid grid-cols-2 gap-2.5 mb-2">
                  <div class="flex flex-col gap-1">
                    <span class="text-xs font-medium text-ink-gray-6 dark:text-gray-300">From Time</span>
                    <TimePicker
                      v-model="fromTimeSelected"
                      format="hh:mm A"
                      :interval="15"
                      class="w-full"
                      @update:modelValue="onFromTimeChange"
                    >
                      <template #prefix>
                        <Sunrise class="size-3.5 text-ink-gray-5 dark:text-gray-400" />
                      </template>
                    </TimePicker>
                  </div>
                  <div class="flex flex-col gap-1">
                    <span class="text-xs font-medium text-ink-gray-6 dark:text-gray-300">To Time</span>
                    <TimePicker
                      v-model="toTimeSelected"
                      format="hh:mm A"
                      :interval="15"
                      class="w-full"
                    >
                      <template #prefix>
                        <Sunset class="size-3.5 text-ink-gray-5 dark:text-gray-400" />
                      </template>
                    </TimePicker>
                  </div>
                </div>

                <!-- Calculated Duration Display -->
                <div class="flex items-center justify-between p-2 rounded-lg bg-surface-base dark:bg-gray-800 border border-outline-gray-1 dark:border-gray-700 text-xs">
                  <span class="text-ink-gray-5 dark:text-gray-400 font-medium">Calculated Duration:</span>
                  <span class="font-bold text-emerald-600 dark:text-emerald-400 font-mono text-sm">
                    {{ calculatedDuration }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Modal Footer -->
        <div class="shrink-0 px-6 py-3 border-t border-outline-gray-1 dark:border-gray-800 bg-surface-base flex items-center justify-between">
          <div>
            <button
              v-if="isEdit && onDelete"
              type="button"
              class="text-xs text-rose-500 hover:text-rose-700 dark:hover:text-rose-400 font-semibold cursor-pointer transition inline-flex items-center gap-1"
              @click="confirmDelete"
            >
              <Trash2 class="size-3.5" />
              <span>Delete Entry</span>
            </button>
          </div>

          <div class="flex items-center gap-2">
            <Button
              type="button"
              variant="subtle"
              size="sm"
              :disabled="saving"
              @click="close"
            >
              Cancel
            </Button>
            <Button
              variant="solid"
              theme="gray"
              type="submit"
              size="sm"
              :loading="saving"
              :disabled="saving || !isFormValid"
            >
              <template #prefix>
                <Check v-if="!saving" class="size-3.5 mr-0.5" />
              </template>
              {{ isEdit ? 'Update Entry' : 'Save Entry' }}
            </Button>
          </div>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, reactive, onBeforeUnmount } from 'vue'
import { Button, Combobox, DatePicker, TimePicker, Select } from 'frappe-ui'
import {
  Clock,
  Sunrise,
  Sunset,
  X as XIcon,
  CheckSquare,
  Users,
  Search,
  ChevronDown,
  Trash2,
  Check,
} from 'lucide-vue-next'
import FrappeRichEditor from './FrappeRichEditor.vue'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false,
  },
  entry: {
    type: Object,
    default: null,
  },
  date: {
    type: String,
    default: '',
  },
  projects: {
    type: Array,
    default: () => [],
  },
  tasks: {
    type: Array,
    default: () => [],
  },
  saving: {
    type: Boolean,
    default: false,
  },
  onSave: {
    type: Function,
    default: null,
  },
  onDelete: {
    type: Function,
    default: null,
  },
})

const emit = defineEmits(['update:modelValue', 'save', 'delete'])

const errorMessage = ref('')

const fromTimeSelected = ref('09:00')
const toTimeSelected = ref('10:00')

const form = reactive({
  activity_type: 'Task',
  project: '',
  task: '',
  from_time: '',
  to_time: '',
  description: '',
  date: '',
  status: 'Draft',
  _parentTs: null,
  name: '',
})

// Generate 15-minute slot options in 12-hour AM/PM format (e.g., 09:00 AM)
const timeSlotOptions = computed(() => {
  const slots = []
  for (let hour = 0; hour < 24; hour++) {
    for (let min = 0; min < 60; min += 15) {
      const hStr = String(hour).padStart(2, '0')
      const mStr = String(min).padStart(2, '0')
      const value = `${hStr}:${mStr}`

      const period = hour >= 12 ? 'PM' : 'AM'
      const displayHour = hour % 12 === 0 ? 12 : hour % 12
      const label = `${String(displayHour).padStart(2, '0')}:${mStr} ${period}`
      slots.push({ value, label })
    }
  }
  return slots
})

const isEdit = computed(() => Boolean(props.entry && (props.entry.name || props.entry.from_time)))

const formattedDateDisplay = computed(() => {
  const dStr = form.date || props.date || new Date().toISOString().slice(0, 10)
  try {
    const parts = dStr.split('-')
    let iso = dStr
    if (parts.length === 3 && parts[0].length === 2) {
      // DD-MM-YYYY to YYYY-MM-DD
      iso = `${parts[2]}-${parts[1]}-${parts[0]}`
    }
    const d = new Date(iso + 'T00:00:00')
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
    }
  } catch {}
  return dStr
})

// Project options
const projectOptions = computed(() => {
  return (props.projects || []).map((p) => ({
    label: p.project_name || p.name,
    value: p.name,
  }))
})

// Task search and remote loading state
const taskSearchQuery = ref('')
const serverProjectTasks = ref([])
const taskLoading = ref(false)
let taskSearchTimer = null

async function fetchProjectTasksFromServer(projectName, query = '') {
  if (!projectName) {
    serverProjectTasks.value = []
    return
  }
  taskLoading.value = true
  try {
    const qParam = query ? `&query=${encodeURIComponent(query.trim())}` : ''
    const res = await fetch(`/api/method/taskflow.taskflow.api.portal.search_project_tasks?project=${encodeURIComponent(projectName)}${qParam}&limit=5`)
    const data = await res.json()
    if (data && data.message) {
      serverProjectTasks.value = data.message || []
    } else {
      serverProjectTasks.value = []
    }
  } catch (err) {
    console.error('Failed to fetch project tasks from server', err)
    serverProjectTasks.value = []
  } finally {
    taskLoading.value = false
  }
}

function onTaskSearchQueryChange(q) {
  taskSearchQuery.value = typeof q === 'string' ? q : ''
  const projVal = form.project?.value || form.project || ''
  if (!projVal) return
  if (taskSearchTimer) clearTimeout(taskSearchTimer)
  taskSearchTimer = setTimeout(() => {
    fetchProjectTasksFromServer(projVal, taskSearchQuery.value)
  }, 250)
}

// Task options filtered by selected project (max 5 items, matching by project ID or name, with title and status)
const taskOptions = computed(() => {
  const selectedProjRaw = form.project?.value || form.project
  if (!selectedProjRaw) return []

  const selectedProjStr = String(selectedProjRaw).trim().toLowerCase()
  
  // Find project doc name and project_name from props.projects
  const projObj = (props.projects || []).find((p) => {
    const pName = String(p.name || '').trim().toLowerCase()
    const pTitle = String(p.project_name || '').trim().toLowerCase()
    return pName === selectedProjStr || pTitle === selectedProjStr
  })
  const targetProjName = (projObj?.name || selectedProjRaw).toString().trim().toLowerCase()
  const targetProjTitle = (projObj?.project_name || '').toString().trim().toLowerCase()

  // 1. Gather tasks from server response
  const remoteTasks = serverProjectTasks.value || []

  // 2. Gather tasks from props.tasks
  const propMatchingTasks = (props.tasks || []).filter((t) => {
    if (!t.project) return false
    const taskProj = String(t.project).trim().toLowerCase()
    return taskProj === targetProjName || (targetProjTitle && taskProj === targetProjTitle)
  })

  // Combine unique by task name
  const combinedMap = new Map()
  for (const t of remoteTasks) {
    if (t && t.name) combinedMap.set(t.name, t)
  }
  for (const t of propMatchingTasks) {
    if (t && t.name && !combinedMap.has(t.name)) combinedMap.set(t.name, t)
  }

  // If currently selected task is not in combined list, add it so Select displays it
  if (form.task) {
    const curTaskName = typeof form.task === 'object' ? form.task.value : form.task
    if (curTaskName && !combinedMap.has(curTaskName)) {
      const foundInProps = (props.tasks || []).find((t) => t.name === curTaskName)
      if (foundInProps) {
        combinedMap.set(curTaskName, foundInProps)
      } else {
        combinedMap.set(curTaskName, { name: curTaskName, task_title: curTaskName, status: 'Open' })
      }
    }
  }

  let combinedList = Array.from(combinedMap.values())

  // If user typed a search query, filter matching items locally too for instant responsiveness
  const q = taskSearchQuery.value.trim().toLowerCase()
  if (q) {
    combinedList = combinedList.filter((t) => {
      const title = String(t.task_title || t.title || '').toLowerCase()
      const name = String(t.name || '').toLowerCase()
      return title.includes(q) || name.includes(q)
    })
  }

  // Strictly limit to 5 response items as requested
  return combinedList.slice(0, 5).map((t) => {
    const title = t.task_title || t.title || t.name
    return {
      label: title,
      value: t.name,
      status: t.status || 'Open',
      description: `${t.name}${t.project ? ' · ' + t.project : ''}`,
    }
  })
})

const getStatusBadgeClass = (status) => {
  switch (status) {
    case 'Completed':
      return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
    case 'Overdue':
      return 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
    case 'Open':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300'
    case 'In Progress':
      return 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
    case 'Review':
      return 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300'
    case 'On Hold':
      return 'bg-orange-100 text-orange-800 dark:bg-orange-950/60 dark:text-orange-300'
    case 'Cancelled':
      return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
    default:
      return 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300'
  }
}

// Calculate duration in hours
const calculatedDuration = computed(() => {
  if (!fromTimeSelected.value || !toTimeSelected.value) return '0.00h'
  const [fh, fm] = fromTimeSelected.value.split(':').map(Number)
  const [th, tm] = toTimeSelected.value.split(':').map(Number)
  const diffMins = (th * 60 + tm) - (fh * 60 + fm)
  if (diffMins <= 0) return '0.00h'
  return (diffMins / 60).toFixed(2) + 'h'
})

// Form validity check
const isFormValid = computed(() => {
  if (!form.date || !fromTimeSelected.value || !toTimeSelected.value) return false
  if (form.activity_type === 'Task') {
    if (!form.project || !form.task) return false
  }
  const [fh, fm] = fromTimeSelected.value.split(':').map(Number)
  const [th, tm] = toTimeSelected.value.split(':').map(Number)
  if ((th * 60 + tm) <= (fh * 60 + fm)) return false
  return true
})

function extractTimeHHMM(dtStr, defaultTime = '09:00') {
  if (!dtStr) return defaultTime
  const clean = dtStr.includes('T') ? dtStr.split('T')[1] : (dtStr.includes(' ') ? dtStr.split(' ')[1] : dtStr)
  if (clean && clean.length >= 5) {
    return clean.slice(0, 5)
  }
  return defaultTime
}

function formatDateToDDMMYYYY(dStr) {
  if (!dStr) {
    const today = new Date()
    const dd = String(today.getDate()).padStart(2, '0')
    const mm = String(today.getMonth() + 1).padStart(2, '0')
    const yyyy = today.getFullYear()
    return `${dd}-${mm}-${yyyy}`
  }
  if (dStr.includes('-')) {
    const parts = dStr.split('-')
    if (parts[0].length === 4) {
      // YYYY-MM-DD -> DD-MM-YYYY
      return `${parts[2]}-${parts[1]}-${parts[0]}`
    }
  }
  return dStr
}

function normalizeDateToYYYYMMDD(dStr) {
  if (!dStr) return new Date().toISOString().slice(0, 10)
  if (dStr.includes('-')) {
    const parts = dStr.split('-')
    if (parts[0].length === 2 && parts[2]?.length === 4) {
      // DD-MM-YYYY -> YYYY-MM-DD
      return `${parts[2]}-${parts[1]}-${parts[0]}`
    }
  }
  return dStr
}

function initForm() {
  errorMessage.value = ''
  const curDate = props.date || new Date().toISOString().slice(0, 10)
  form.date = formatDateToDDMMYYYY(curDate)

  taskSearchQuery.value = ''
  if (props.entry) {
    form.activity_type = props.entry.activity_type || 'Task'
    form.project = props.entry.project || ''
    form.task = props.entry.task || ''
    fromTimeSelected.value = extractTimeHHMM(props.entry.from_time, '09:00')
    toTimeSelected.value = extractTimeHHMM(props.entry.to_time, '10:00')
    form.description = props.entry.description || ''
    form.status = props.entry.timesheet_status || props.entry._parentTs?.status || 'Draft'
    form._parentTs = props.entry._parentTs || null
    form.name = props.entry.name || ''

    if (props.entry.from_time) {
      const datePart = props.entry.from_time.includes('T') ? props.entry.from_time.split('T')[0] : props.entry.from_time.split(' ')[0]
      if (datePart) form.date = formatDateToDDMMYYYY(datePart)
    }
  } else {
    form.activity_type = 'Task'
    form.project = ''
    form.task = ''
    fromTimeSelected.value = '09:00'
    toTimeSelected.value = '10:00'
    form.description = ''
    form.status = 'Draft'
    form._parentTs = null
    form.name = ''
  }
}

function handleKeyDown(e) {
  if (e.key === 'Escape' && props.modelValue) {
    close()
  }
}

watch(
  () => props.modelValue,
  (val) => {
    if (val) {
      initForm()
      window.addEventListener('keydown', handleKeyDown)
    } else {
      window.removeEventListener('keydown', handleKeyDown)
    }
  },
  { immediate: true },
)

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeyDown)
})

function onFromTimeChange(newFrom) {
  if (!newFrom) return
  if (!toTimeSelected.value) {
    const [fh, fm] = newFrom.split(':').map(Number)
    const nextH = Math.min(fh + 1, 23)
    toTimeSelected.value = `${String(nextH).padStart(2, '0')}:${String(fm).padStart(2, '0')}`
    return
  }
  const [fh, fm] = newFrom.split(':').map(Number)
  const [th, tm] = toTimeSelected.value.split(':').map(Number)
  if ((th * 60 + tm) <= (fh * 60 + fm)) {
    const endMinutes = Math.min(fh * 60 + fm + 60, 23 * 60 + 45)
    const nh = Math.floor(endMinutes / 60)
    const nm = endMinutes % 60
    toTimeSelected.value = `${String(nh).padStart(2, '0')}:${String(nm).padStart(2, '0')}`
  }
}

watch(
  () => form.project,
  (newProj) => {
    const projVal = newProj?.value || newProj || ''
    if (projVal) {
      fetchProjectTasksFromServer(projVal)
    } else {
      serverProjectTasks.value = []
    }
  },
  { immediate: true },
)

function onActivityTypeChange() {
  if (form.activity_type !== 'Task') {
    form.project = ''
    form.task = ''
    serverProjectTasks.value = []
  }
}

function onProjectChange(val) {
  if (val && typeof val === 'object' && val.value) {
    form.project = val.value
  }
  taskSearchQuery.value = ''
  const projVal = form.project?.value || form.project || ''
  if (projVal) {
    fetchProjectTasksFromServer(projVal)
  }
  if (form.task) {
    const selectedProj = String(projVal).trim().toLowerCase()
    const allTasks = [...serverProjectTasks.value, ...(props.tasks || [])]
    const taskObj = allTasks.find((t) => t.name === form.task)
    if (taskObj && taskObj.project && String(taskObj.project).trim().toLowerCase() !== selectedProj) {
      form.task = ''
    }
  }
}

function onTaskChange(val) {
  if (val && typeof val === 'object' && val.value) {
    form.task = val.value
  }
  if (form.task && !form.project) {
    const taskObj = (props.tasks || []).find((t) => t.name === form.task)
    if (taskObj && taskObj.project) {
      form.project = taskObj.project
    }
  }
}

function getActivityIcon(type) {
  if (type === 'Meeting') return Users
  if (type === 'Research') return Search
  return CheckSquare
}

function getActivityIconClass(type) {
  if (type === 'Meeting') return 'text-amber-500'
  if (type === 'Research') return 'text-purple-500'
  return 'text-blue-500'
}

function close() {
  emit('update:modelValue', false)
}

function submit() {
  errorMessage.value = ''
  if (!fromTimeSelected.value || !toTimeSelected.value) {
    errorMessage.value = 'Please select both From and To time.'
    return
  }
  const [fh, fm] = fromTimeSelected.value.split(':').map(Number)
  const [th, tm] = toTimeSelected.value.split(':').map(Number)
  if ((th * 60 + tm) <= (fh * 60 + fm)) {
    errorMessage.value = 'To time must be after From time.'
    return
  }

  const projVal = form.project?.value || form.project || ''
  const taskVal = form.task?.value || form.task || ''

  if (form.activity_type === 'Task') {
    if (!projVal) {
      errorMessage.value = 'Project is required for Task activity.'
      return
    }
    if (!taskVal) {
      errorMessage.value = 'Task is required for Task activity.'
      return
    }
  }

  const yyyymmdd = normalizeDateToYYYYMMDD(form.date)
  const fullFrom = `${yyyymmdd} ${fromTimeSelected.value}:00`
  const fullTo = `${yyyymmdd} ${toTimeSelected.value}:00`

  const payload = {
    activity_type: form.activity_type,
    project: form.activity_type === 'Task' ? projVal : '',
    task: form.activity_type === 'Task' ? taskVal : '',
    from_time: fullFrom,
    to_time: fullTo,
    description: form.description || '',
    date: yyyymmdd,
    status: form.status,
    _parentTs: form._parentTs,
    name: form.name,
  }

  if (props.onSave) {
    props.onSave(payload)
  } else {
    emit('save', payload)
  }
}

function confirmDelete() {
  if (props.onDelete) {
    props.onDelete(props.entry)
  } else {
    emit('delete', props.entry)
  }
}
</script>
