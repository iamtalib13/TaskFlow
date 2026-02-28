<template>
  <div class="mx-auto max-w-6xl p-6">
    <div class="rounded-xl border border-gray-200 bg-white p-4">
      <div class="flex flex-wrap items-center gap-3">
        <label class="text-sm font-medium text-gray-700">Project</label>
        <select v-model="selectedProjectFilter" class="min-w-[240px] rounded-md border border-gray-300 px-3 py-2 text-sm" @change="fetchTasks">
          <option value="">All Projects</option>
          <option v-for="project in projects" :key="project.name" :value="project.name">
            {{ project.project_name }}
          </option>
        </select>
        <Button
          appearance="secondary"
          :disabled="!selectedProjectFilter"
          @click="openSelectedProjectEditor"
        >
          Edit Project
        </Button>
        <Button appearance="primary" class="ml-auto" @click="openNewTaskDialog">
          New Task
        </Button>
      </div>
    </div>

    <div v-if="tasksLoading" class="mt-4 rounded-xl border border-gray-200 bg-white p-4 text-sm text-gray-600">Loading tasks...</div>
    <div v-else-if="tasks.length === 0" class="mt-4 rounded-xl border border-gray-200 bg-white p-4 text-sm text-gray-600">No tasks found for selected project.</div>

    <template v-else>
      <section v-if="activeTab === 'kanban'" class="mt-4 overflow-x-auto">
        <div class="grid min-w-[900px] grid-cols-3 gap-4">
          <article
            v-for="column in kanbanColumns"
            :key="column.key"
            class="rounded-xl border border-gray-200 bg-white p-3 transition"
            :class="dropColumnKey === column.key ? 'border-blue-300 bg-blue-50/40' : ''"
            @dragover.prevent="onColumnDragOver(column.key)"
            @drop.prevent="onTaskDrop(column.key)"
            @dragleave="onColumnDragLeave(column.key)"
          >
            <div class="mb-3 flex items-center justify-between">
              <h2 class="text-sm font-semibold text-gray-900">{{ column.title }}</h2>
              <span class="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">{{ column.tasks.length }}</span>
            </div>

            <div class="space-y-2">
              <div
                v-for="task in column.tasks"
                :key="task.name"
                class="cursor-pointer rounded-lg border border-gray-200 bg-white p-3 hover:bg-gray-50"
                :class="dragTaskName === task.name ? 'opacity-50' : ''"
                draggable="true"
                @dragstart="onTaskDragStart(task)"
                @dragend="onTaskDragEnd"
                @click="selectTask(task)"
              >
                <p class="text-sm font-semibold text-gray-900">{{ task.subject }}</p>
                <p class="mt-1 text-xs text-gray-500">{{ task.project_title || selectedProjectName || task.project }}</p>
                <div class="mt-2 flex items-center justify-between text-xs text-gray-600">
                  <span>{{ task.priority || 'NA' }}</span>
                  <span>{{ task.exp_end_date || 'Not set' }}</span>
                </div>
              </div>
            </div>
          </article>
        </div>
      </section>

      <section v-else-if="activeTab === 'list'" class="mt-4 rounded-xl border border-gray-200 bg-white p-4">
        <div class="mb-3">
          <input
            v-model.trim="taskSearchQuery"
            type="text"
            placeholder="Search tasks by subject, project, status, or priority"
            class="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 placeholder:text-gray-400 focus:border-gray-400 focus:outline-none"
          />
        </div>

        <div class="overflow-x-auto">
          <table class="min-w-full text-left text-sm">
            <thead>
              <tr class="border-b border-gray-200 text-xs uppercase tracking-wide text-gray-500">
                <th class="w-16 px-3 py-2">Sr. No.</th>
                <th class="px-3 py-2">Task</th>
                <th class="px-3 py-2">Project</th>
                <th class="px-3 py-2">Status</th>
                <th class="px-3 py-2">Priority</th>
                <th class="px-3 py-2">Due</th>
                <th class="px-3 py-2">Days Left</th>
                <th class="px-3 py-2 text-right">Last Modified</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(task, index) in filteredTasks" :key="task.name" class="cursor-pointer border-b border-gray-100 hover:bg-gray-50" @click="selectTask(task)">
                <td class="px-3 py-2.5 text-gray-500">{{ index + 1 }}</td>
                <td class="px-3 py-2.5 font-medium text-gray-900">{{ task.subject }}</td>
                <td class="px-3 py-2.5 text-gray-700">{{ task.project_title || selectedProjectName || task.project }}</td>
                <td class="px-3 py-2.5 text-gray-700">{{ task.status }}</td>
                <td class="px-3 py-2.5 text-gray-700">{{ task.priority || 'NA' }}</td>
                <td class="px-3 py-2.5 text-gray-700">{{ task.exp_end_date || 'Not set' }}</td>
                <td class="px-3 py-2.5 text-gray-700">{{ task.days_left !== null && task.days_left !== undefined ? task.days_left : 'N/A' }}</td>
                <td class="px-3 py-2.5 text-right text-gray-600">{{ task.modified_pretty || 'N/A' }}</td>
              </tr>
              <tr v-if="filteredTasks.length === 0">
                <td colspan="8" class="px-3 py-6 text-center text-sm text-gray-500">No tasks match your search.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section v-else class="mt-4 rounded-xl border border-gray-200 bg-white p-5">
        <div class="mb-4 flex items-center justify-between gap-3">
          <h3 class="text-lg font-semibold text-gray-900">Task Form</h3>
          <select v-model="selectedTaskName" class="min-w-[260px] rounded-md border border-gray-300 px-3 py-2 text-sm" @change="loadSelectedTask">
            <option value="">Select task</option>
            <option v-for="task in tasks" :key="task.name" :value="task.name">
              {{ task.subject }}
            </option>
          </select>
        </div>

        <div v-if="!taskForm.name" class="rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600">
          Select a task to open form view.
        </div>

        <div v-else class="grid gap-3 md:grid-cols-2">
          <div class="md:col-span-2">
            <label class="mb-1 block text-xs font-medium uppercase tracking-wide text-gray-500">Subject</label>
            <input v-model="taskForm.subject" type="text" class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label class="mb-1 block text-xs font-medium uppercase tracking-wide text-gray-500">Status</label>
            <input v-model="taskForm.status" type="text" class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label class="mb-1 block text-xs font-medium uppercase tracking-wide text-gray-500">Priority</label>
            <input v-model="taskForm.priority" type="text" class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label class="mb-1 block text-xs font-medium uppercase tracking-wide text-gray-500">Owner</label>
            <input v-model="taskForm.owner" type="text" class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label class="mb-1 block text-xs font-medium uppercase tracking-wide text-gray-500">Due Date</label>
            <input v-model="taskForm.exp_end_date" type="text" class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
          </div>
        </div>
      </section>
    </template>

    <Dialog v-model="showTaskModal" :options="{ size: '2xl' }">
      <template #body>
        <div
          class="m-1 rounded-xl border border-blue-200 bg-white text-gray-900 shadow-[0_0_0_1px_rgba(96,165,250,0.25),0_12px_36px_rgba(37,99,235,0.16)] backdrop-blur-sm"
          @keydown="onDialogKeydown"
        >
          <div class="border-b border-gray-200 px-6 py-4">
            <h3 class="text-lg font-semibold">Create New Task</h3>
            <p class="mt-1 text-sm text-gray-600">Add a new task with project selection and assignment.</p>
          </div>

          <div class="space-y-4 px-6 py-5">
            <div class="relative">
              <CheckSquare class="pointer-events-none absolute left-3 top-[39px] h-4 w-4 text-gray-500" />
              <Input
                label="Task Title"
                type="text"
                :required="true"
                v-model="newTask.subject"
                :inputClass="'pl-9 border-gray-300 bg-white text-gray-900 placeholder-gray-400'"
              />
            </div>

            <div class="grid gap-4 md:grid-cols-2">
              <Input
                label="Priority"
                type="select"
                :options="['Low', 'Normal', 'High']"
                v-model="newTask.priority"
                :inputClass="'border-gray-300 bg-white text-gray-900'"
              />
              <Input
                label="Status"
                type="select"
                :options="['Open', 'Working', 'Pending Review', 'Overdue', 'Completed', 'Cancelled']"
                v-model="newTask.status"
                :inputClass="'border-gray-300 bg-white text-gray-900'"
              />
            </div>

            <div>
              <label class="mb-2 block text-sm leading-4 text-gray-700">Project Selection</label>
              <Autocomplete v-model="selectedProjectOption" :options="projectOptions" placeholder="Search project..." />
            </div>

            <div>
              <label class="mb-2 block text-sm leading-4 text-gray-700">Assignee</label>
              <Autocomplete v-model="selectedAssigneeOption" :options="assigneeOptions" placeholder="Search user..." />
              <div
                v-if="selectedAssigneeOption"
                class="mt-2 inline-flex items-center gap-2 rounded-md border border-gray-200 bg-gray-50 px-2.5 py-1.5"
              >
                <Avatar
                  size="sm"
                  :label="selectedAssigneeOption.label"
                  :imageURL="selectedAssigneeOption.user_image || ''"
                />
                <span class="text-xs text-gray-700">{{ selectedAssigneeOption.label }}</span>
              </div>
            </div>

            <div class="rounded-lg border border-gray-200 bg-gray-50">
              <button
                class="flex w-full items-center justify-between px-3 py-2 text-left text-sm font-medium text-gray-800"
                @click="showAdvanced = !showAdvanced"
              >
                <span>Advanced Options</span>
                <ChevronDown v-if="showAdvanced" class="h-4 w-4 text-gray-500" />
                <ChevronRight v-else class="h-4 w-4 text-gray-500" />
              </button>
              <div v-if="showAdvanced" class="border-t border-gray-200 px-3 py-3">
                <Input
                  type="textarea"
                  label="Description"
                  v-model="newTask.description"
                  :inputClass="'border-gray-300 bg-white text-gray-900 placeholder-gray-400'"
                />
              </div>
            </div>
          </div>

          <div class="flex items-center justify-end gap-2 border-t border-gray-200 px-6 py-4">
            <Button appearance="minimal" @click="showTaskModal = false">
              Cancel
            </Button>
            <Button appearance="primary" :loading="taskCreateResource.loading" @click="createTask">
              Create Task
            </Button>
          </div>
        </div>
      </template>
    </Dialog>

    <Dialog v-model="showTaskEditModal" :options="{ size: '2xl' }">
      <template #body>
        <div class="m-1 rounded-xl border border-gray-200 bg-white text-gray-900 shadow-xl">
          <div class="border-b border-gray-200 px-6 py-4">
            <h3 class="text-lg font-semibold">Edit Task</h3>
            <p class="mt-1 text-sm text-gray-600">Update task details and save changes.</p>
          </div>

          <div class="space-y-4 px-6 py-5">
            <div>
              <label class="mb-1 block text-xs font-medium uppercase tracking-wide text-gray-500">Subject</label>
              <input v-model.trim="taskForm.subject" type="text" class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
            </div>

            <div class="grid gap-4 md:grid-cols-2">
              <div>
                <label class="mb-1 block text-xs font-medium uppercase tracking-wide text-gray-500">Status</label>
                <select v-model="taskForm.status" class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm">
                  <option v-for="status in taskStatusOptions" :key="status" :value="status">{{ status }}</option>
                </select>
              </div>
              <div>
                <label class="mb-1 block text-xs font-medium uppercase tracking-wide text-gray-500">Priority</label>
                <select v-model="taskForm.priority" class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm">
                  <option v-for="priority in taskPriorityOptions" :key="priority" :value="priority">{{ priority }}</option>
                </select>
              </div>
            </div>

            <div class="grid gap-4 md:grid-cols-2">
              <div>
                <label class="mb-1 block text-xs font-medium uppercase tracking-wide text-gray-500">Owner</label>
                <input :value="taskForm.owner || 'Not set'" type="text" disabled class="w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-600" />
              </div>
              <div>
                <label class="mb-1 block text-xs font-medium uppercase tracking-wide text-gray-500">Due Date</label>
                <input v-model="taskForm.exp_end_date" type="date" class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
              </div>
            </div>

            <div>
              <label class="mb-2 block text-xs font-medium uppercase tracking-wide text-gray-500">Assigned To</label>
              <Autocomplete v-model="taskAssignedOption" :options="assigneeOptions" placeholder="Search assignee..." />
              <div
                v-if="taskAssignedOption"
                class="mt-2 inline-flex items-center gap-2 rounded-md border border-gray-200 bg-gray-50 px-2.5 py-1.5"
              >
                <Avatar
                  size="sm"
                  :label="taskAssignedOption.label"
                  :imageURL="taskAssignedOption.user_image || ''"
                />
                <span class="text-xs text-gray-700">{{ taskAssignedOption.label }}</span>
              </div>
            </div>

            <div>
              <label class="mb-1 block text-xs font-medium uppercase tracking-wide text-gray-500">Description</label>
              <textarea v-model="taskForm.description" rows="3" class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"></textarea>
            </div>

            <p v-if="taskEditError" class="text-sm text-red-700">{{ taskEditError }}</p>
          </div>

          <div class="flex items-center justify-end gap-2 border-t border-gray-200 px-6 py-4">
            <Button appearance="minimal" @click="showTaskEditModal = false">Cancel</Button>
            <Button appearance="primary" :loading="taskEditSaving" @click="saveTaskEdits">Save Changes</Button>
          </div>
        </div>
      </template>
    </Dialog>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { Autocomplete, Avatar, Dialog, Input, createResource, frappeRequest } from 'frappe-ui'
import { CheckSquare, ChevronDown, ChevronRight } from 'lucide-vue-next'
import { useRoute, useRouter } from 'vue-router'
import { ensureManagerOverviewLoaded, managerOverview } from '../resources'

const activeTab = ref('kanban')
const selectedProjectFilter = ref('')
const selectedTaskName = ref('')
const taskSearchQuery = ref('')
const tasks = ref([])
const tasksLoading = ref(false)
const showTaskModal = ref(false)
const showTaskEditModal = ref(false)
const showAdvanced = ref(false)
const selectedProjectOption = ref(null)
const selectedAssigneeOption = ref(null)
const taskAssignedOption = ref(null)
const currentTaskAssignees = ref([])
const dragTaskName = ref('')
const dropColumnKey = ref('')
const statusUpdateLoading = ref(false)
const taskEditSaving = ref(false)
const taskEditError = ref('')
const newTask = ref({
  subject: '',
  description: '',
  priority: 'Normal',
  status: 'Open',
})
const taskForm = ref({
  name: '',
  subject: '',
  status: '',
  priority: '',
  owner: '',
  exp_end_date: '',
  description: '',
})
const route = useRoute()
const router = useRouter()
const taskCreateResource = createResource({
  url: 'frappe.client.insert',
})

const projects = computed(() => managerOverview.data?.projects || [])
const selectedProjectName = computed(() => {
  if (!selectedProjectFilter.value) return 'All Projects'
  const project = projects.value.find((p) => p.name === selectedProjectFilter.value)
  return project?.project_name || ''
})
const projectOptions = computed(() =>
  projects.value.map((project) => ({
    label: project.project_name || project.name,
    value: project.name,
  })),
)
const taskStatusOptions = ['Open', 'Working', 'Pending Review', 'Overdue', 'Completed', 'Cancelled']
const taskPriorityOptions = ['Low', 'Medium', 'High', 'Urgent']
const assigneeOptions = computed(() => {
  const users = new Map()
  for (const project of projects.value) {
    for (const member of project.team || []) {
      if (!member?.user) continue
      if (!users.has(member.user)) {
        users.set(member.user, {
          label: member.full_name || member.user,
          value: member.user,
          user_image: member.user_image || '',
        })
      }
    }
  }
  return Array.from(users.values()).sort((a, b) => a.label.localeCompare(b.label))
})
const filteredTasks = computed(() => {
  const q = taskSearchQuery.value.trim().toLowerCase()
  if (!q) return tasks.value
  return tasks.value.filter((task) => {
    const subject = (task.subject || '').toLowerCase()
    const status = (task.status || '').toLowerCase()
    const priority = (task.priority || '').toLowerCase()
    const project = (task.project_title || task.project || '').toLowerCase()
    return subject.includes(q) || status.includes(q) || priority.includes(q) || project.includes(q)
  })
})

const kanbanColumns = computed(() => {
  const columns = {
    todo: { key: 'todo', title: 'To Do', tasks: [] },
    doing: { key: 'doing', title: 'In Progress', tasks: [] },
    done: { key: 'done', title: 'Done', tasks: [] },
  }

  for (const task of tasks.value) {
    const columnKey = getKanbanColumnKey(task.status)
    columns[columnKey].tasks.push(task)
  }

  return [columns.todo, columns.doing, columns.done]
})

function getKanbanColumnKey(status) {
  const normalized = String(status || '').trim().toLowerCase()
  if (['completed', 'cancelled', 'done', 'closed'].includes(normalized)) return 'done'
  if (['working', 'pending review', 'in progress', 'doing', 'on hold'].includes(normalized)) return 'doing'
  return 'todo'
}

function getColumnStatus(columnKey) {
  if (columnKey === 'doing') return 'Working'
  if (columnKey === 'done') return 'Completed'
  return 'Open'
}

async function selectTask(task, openEditor = true) {
  selectedTaskName.value = task.name
  taskEditError.value = ''
  taskAssignedOption.value = null
  currentTaskAssignees.value = []

  try {
    const response = await frappeRequest({
      url: 'taskflow.taskflow.api.taskflow.get_task_details',
      params: { task: task.name },
    })
    const doc = response?.doc || {}
    taskForm.value = {
      name: doc.name || task.name,
      subject: doc.subject || task.subject || '',
      status: doc.status || task.status || 'Open',
      priority: doc.priority || task.priority || 'Medium',
      owner: doc.owner || task.owner_name || task.owner || '',
      exp_end_date: doc.exp_end_date || task.exp_end_date || '',
      description: doc.description || '',
    }

    const assignees = await fetchTaskAssignees(task.name)
    currentTaskAssignees.value = assignees
    const primaryAssignee = assignees[0] || ''
    if (primaryAssignee) {
      const matchedOption = assigneeOptions.value.find((option) => option.value === primaryAssignee)
      taskAssignedOption.value =
        matchedOption ||
        {
          label: primaryAssignee,
          value: primaryAssignee,
          user_image: '',
        }
    }
  } catch (error) {
    taskForm.value = {
      name: task.name,
      subject: task.subject || '',
      status: task.status || 'Open',
      priority: task.priority || 'Medium',
      owner: task.owner_name || task.owner || '',
      exp_end_date: task.exp_end_date || '',
      description: '',
    }
    taskEditError.value = 'Unable to load complete task details. You can still edit basic fields.'
  }

  if (openEditor) {
    showTaskEditModal.value = true
  }
}

async function fetchTaskAssignees(taskName) {
  const rows = await frappeRequest({
    url: 'frappe.client.get_list',
    params: {
      doctype: 'ToDo',
      filters: {
        reference_type: 'Task',
        reference_name: taskName,
        status: ['!=', 'Cancelled'],
      },
      fields: ['allocated_to'],
      order_by: 'creation desc',
      limit_page_length: 20,
    },
  })
  const users = (rows || []).map((row) => row.allocated_to).filter(Boolean)
  return Array.from(new Set(users))
}

function loadSelectedTask() {
  const task = tasks.value.find((item) => item.name === selectedTaskName.value)
  if (task) {
    selectTask(task, true)
  }
}

function setActiveTab(tab) {
  const next = tab === 'list' ? 'list' : 'kanban'
  activeTab.value = next
  router.replace({
    path: route.path,
    query: { ...route.query, view: next },
  })
}

function onTaskDragStart(task) {
  if (activeTab.value !== 'kanban' || statusUpdateLoading.value) return
  dragTaskName.value = task.name
}

function onTaskDragEnd() {
  dragTaskName.value = ''
  dropColumnKey.value = ''
}

function onColumnDragOver(columnKey) {
  if (!dragTaskName.value || statusUpdateLoading.value) return
  dropColumnKey.value = columnKey
}

function onColumnDragLeave(columnKey) {
  if (dropColumnKey.value === columnKey) {
    dropColumnKey.value = ''
  }
}

async function onTaskDrop(columnKey) {
  if (!dragTaskName.value || statusUpdateLoading.value) return
  const task = tasks.value.find((item) => item.name === dragTaskName.value)
  if (!task) {
    onTaskDragEnd()
    return
  }

  const nextStatus = getColumnStatus(columnKey)
  const currentColumn = getKanbanColumnKey(task.status)
  if (currentColumn === columnKey || String(task.status || '') === nextStatus) {
    onTaskDragEnd()
    return
  }

  statusUpdateLoading.value = true
  try {
    await frappeRequest({
      url: 'taskflow.taskflow.api.taskflow.update_task_status',
      params: {
        task_name: task.name,
        status: nextStatus,
      },
    })
    task.status = nextStatus
    if (selectedTaskName.value === task.name) {
      taskForm.value.status = nextStatus
    }
  } catch (error) {
    await fetchTasks()
  } finally {
    statusUpdateLoading.value = false
    onTaskDragEnd()
  }
}

function resetNewTask() {
  newTask.value = {
    subject: '',
    description: '',
    priority: 'Normal',
    status: 'Open',
  }
  showAdvanced.value = false
  selectedProjectOption.value = null
  selectedAssigneeOption.value = null
}

function openNewTaskDialog() {
  resetNewTask()
  if (selectedProjectFilter.value) {
    const matched = projectOptions.value.find((option) => option.value === selectedProjectFilter.value)
    selectedProjectOption.value = matched || null
  }
  showTaskModal.value = true
}

function mapPriority(value) {
  if (value === 'Normal') return 'Medium'
  return value || 'Medium'
}

function onDialogKeydown(event) {
  if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
    event.preventDefault()
    createTask()
  }
}

function onWindowKeydown(event) {
  if (!showTaskModal.value) return
  if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
    event.preventDefault()
    createTask()
  }
}

function openSelectedProjectEditor() {
  if (!selectedProjectFilter.value) return
  router.push({
    path: '/projects',
    query: {
      edit_project: selectedProjectFilter.value,
    },
  })
}

async function createTask() {
  const subject = (newTask.value.subject || '').trim()
  if (!subject) return
  try {
    const inserted = await taskCreateResource.submit({
      doc: {
        doctype: 'Task',
        subject,
        description: newTask.value.description || '',
        priority: mapPriority(newTask.value.priority),
        status: newTask.value.status || 'Open',
        project: selectedProjectOption.value?.value || null,
      },
    })

    if (selectedAssigneeOption.value?.value && inserted?.name) {
      await frappeRequest({
        url: 'taskflow.taskflow.api.taskflow.assign_task_user',
        params: {
          task_name: inserted.name,
          user: selectedAssigneeOption.value.value,
        },
      })
    }

    showTaskModal.value = false
    resetNewTask()
    await fetchTasks()
  } catch (error) {
    // Keep dialog open for correction/retry.
  }
}

async function saveTaskEdits() {
  if (!taskForm.value.name) return
  const subject = (taskForm.value.subject || '').trim()
  if (!subject) {
    taskEditError.value = 'Subject is required.'
    return
  }

  taskEditSaving.value = true
  taskEditError.value = ''
  try {
    await frappeRequest({
      url: 'taskflow.taskflow.api.taskflow.update_task_details',
      params: {
        task_name: taskForm.value.name,
        values: {
          subject,
          status: taskForm.value.status || 'Open',
          priority: taskForm.value.priority || 'Medium',
          exp_end_date: taskForm.value.exp_end_date || null,
          description: taskForm.value.description || '',
        },
      },
    })

    const nextAssignee = taskAssignedOption.value?.value || ''
    const existingAssignees = Array.from(new Set(currentTaskAssignees.value.filter(Boolean)))
    const unchangedSingle =
      existingAssignees.length === 1 &&
      existingAssignees[0] === nextAssignee

    if (!unchangedSingle) {
      for (const assignee of existingAssignees) {
        await frappeRequest({
          url: 'frappe.desk.form.assign_to.remove',
          params: {
            doctype: 'Task',
            name: taskForm.value.name,
            user: assignee,
          },
        })
      }

      if (nextAssignee) {
        await frappeRequest({
          url: 'taskflow.taskflow.api.taskflow.assign_task_user',
          params: {
            task_name: taskForm.value.name,
            user: nextAssignee,
          },
        })
      }
    }

    showTaskEditModal.value = false
    await fetchTasks()
  } catch (error) {
    taskEditError.value = error?.messages?.[0] || error?.message || 'Unable to save task changes.'
  } finally {
    taskEditSaving.value = false
  }
}

async function fetchTasks() {
  tasksLoading.value = true
  try {
    const response = await frappeRequest({
      url: 'taskflow.taskflow.api.taskflow.get_task_list',
      params: {
        project: selectedProjectFilter.value || null,
        start: 0,
        page_length: 30,
        only_my_tasks: 0,
      },
    })
    tasks.value = response?.tasks || []
    if (tasks.value.length > 0 && !tasks.value.find((item) => item.name === selectedTaskName.value)) {
      selectTask(tasks.value[0], false)
    }
  } catch (error) {
    tasks.value = []
    taskForm.value = { name: '', subject: '', status: '', priority: '', owner: '', exp_end_date: '' }
    selectedTaskName.value = ''
  } finally {
    tasksLoading.value = false
  }
}

function applyRouteProjectFilter() {
  const routeProject = typeof route.query.project === 'string' ? route.query.project : ''
  if (!routeProject) {
    selectedProjectFilter.value = ''
    return
  }

  const matchedProject = projects.value.find((project) => project.name === routeProject)
  selectedProjectFilter.value = matchedProject ? matchedProject.name : ''
}

onMounted(async () => {
  window.addEventListener('keydown', onWindowKeydown)
  if (!managerOverview.data) {
    await ensureManagerOverviewLoaded()
  }
  applyRouteProjectFilter()
  await fetchTasks()
})

onUnmounted(() => {
  window.removeEventListener('keydown', onWindowKeydown)
})

watch(
  () => route.query.view,
  (view) => {
    activeTab.value = view === 'list' ? 'list' : 'kanban'
  },
  { immediate: true },
)

watch(
  () => route.query.new_task,
  async (flag) => {
    if (flag !== '1') return
    if (!managerOverview.data) {
      await ensureManagerOverviewLoaded()
    }
    openNewTaskDialog()
    const { new_task, ...rest } = route.query
    router.replace({ path: route.path, query: rest })
  },
  { immediate: true },
)

watch(
  () => route.query.project,
  async () => {
    if (!managerOverview.data) {
      await ensureManagerOverviewLoaded()
    }
    applyRouteProjectFilter()
    await fetchTasks()
  },
)
</script>
