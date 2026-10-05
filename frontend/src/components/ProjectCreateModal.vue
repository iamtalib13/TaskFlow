<template>
  <div v-if="modelValue" class="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/55 backdrop-blur-sm" @click.self="close">
    <div class="w-full max-w-5xl my-6 bg-surface-base rounded-xl border border-outline-gray-2 dark:border-gray-800 shadow-2xl overflow-hidden flex flex-col">
      <!-- Header with buttons -->
      <div class="flex items-center justify-between px-6 py-4 border-b border-outline-gray-2 dark:border-gray-800 bg-surface-gray-1 dark:bg-gray-900 shrink-0">
        <div>
          <h2 class="text-lg font-bold text-ink-gray-9 dark:text-white">{{ editProject ? 'Edit Project' : 'Create Project' }}</h2>
          <p class="text-xs text-ink-gray-5 dark:text-gray-400 mt-0.5">{{ editProject ? 'Update project details' : 'Fill in the details to start a new project' }}</p>
        </div>
        <div class="flex items-center gap-2">
          <Button variant="subtle" type="button" @click="close">Cancel</Button>
          <Button variant="solid" @click="submit" :loading="saving">
            {{ editProject ? 'Update' : 'Create' }}
          </Button>
        </div>
      </div>

      <!-- Form Body with 6-Column Grid Layout -->
      <form class="p-6 grid grid-cols-6 gap-4 max-h-[80vh] overflow-y-auto" @submit.prevent="submit">
        <!-- Div 1: Project Fields (Span 6 / Top) -->
        <div class="div1 col-span-6 space-y-4 bg-surface-gray-1/50 dark:bg-gray-900/50 p-4 rounded-xl border border-outline-gray-2 dark:border-gray-800">
          <!-- Project Name -->
          <FormControl
            v-model="form.project_name"
            type="text"
            label="Project Name"
            placeholder="E.g., CRM Revamp"
            :error="errors.project_name"
            required
          />

          <!-- Team + Priority + Parent Project -->
          <div class="grid grid-cols-3 gap-4">
            <FormControl
              v-model="form.team"
              type="select"
              label="Team"
              placeholder="Select team"
              :options="teamOptions"
              :error="errors.team"
              required
            />
            <FormControl
              v-model="form.priority"
              type="select"
              label="Priority"
              placeholder="Select priority"
              :options="priorityOptions"
              :error="errors.priority"
            />
            <FormControl
              v-model="form.parent_project"
              type="select"
              label="Parent Project"
              placeholder="None"
              :options="[{ label: 'None', value: '' }, ...projectOptions]"
            />
          </div>

          <!-- Project Lead + Start Date + End Date -->
          <div class="grid grid-cols-3 gap-4 items-start">
            <!-- Project Lead (Frappe UI Combobox) -->
            <div class="space-y-1.5">
              <label class="text-sm font-medium text-ink-gray-8">Project Lead</label>
              <Combobox
                v-model="form.project_lead"
                v-model:query="leadQuery"
                :options="filteredEmployeeOptions"
                :filterable="false"
                placeholder="Search employee..."
                class="w-full"
              >
                <template #prefix="{ selectedOption }">
                  <Avatar
                    v-if="selectedOption"
                    :image="selectedOption.image"
                    :label="selectedOption.label"
                    size="sm"
                  />
                </template>
                <template #item-prefix="{ item }">
                  <Avatar :image="item.image" :label="item.label" size="sm" />
                </template>
                <template #item-label="{ item }">
                  <div class="min-w-0 flex justify-between items-center w-full">
                    <div class="truncate font-medium text-ink-gray-9 text-xs">{{ item.label }}</div>
                    <div class="truncate text-[11px] text-ink-gray-5 ml-2">{{ item.description }}</div>
                  </div>
                </template>
              </Combobox>
            </div>

            <!-- Start Date -->
            <div class="space-y-1.5">
              <label class="text-sm font-medium text-ink-gray-8">Start Date</label>
              <DatePicker
                v-model="form.start_date"
                format="DD-MM-YYYY"
                placeholder="DD-MM-YYYY"
              />
            </div>

            <!-- End Date -->
            <div class="space-y-1.5">
              <label class="text-sm font-medium text-ink-gray-8">End Date</label>
              <DatePicker
                v-model="form.end_date"
                format="DD-MM-YYYY"
                placeholder="DD-MM-YYYY"
              />
            </div>
          </div>
        </div>

        <!-- Div 2: Team Members (Span 3 / Bottom Left) -->
        <div class="div2 col-span-3 space-y-3 bg-surface-base p-4 rounded-xl border border-outline-gray-2 flex flex-col min-h-[260px]">
          <div class="flex items-center justify-between">
            <label class="text-xs font-bold uppercase tracking-wider text-ink-gray-7">Project Team Members</label>
            <Button size="sm" variant="subtle" @click.prevent="addMember">
              <template #prefix><Plus class="size-3.5" /></template>
              Add Member
            </Button>
          </div>

          <div v-if="form.project_team_members.length === 0" class="flex-1 border border-dashed border-outline-gray-2 rounded-lg p-6 flex flex-col items-center justify-center text-center text-ink-gray-4 text-xs">
            No team members added yet.
          </div>

          <div v-else class="flex-1 border border-outline-gray-2 rounded-lg overflow-y-auto max-h-[220px]">
            <table class="w-full text-left text-xs">
              <thead class="bg-surface-gray-2 border-b border-outline-gray-2 sticky top-0 z-10">
                <tr>
                  <th class="py-1.5 px-2 font-semibold text-ink-gray-6">#</th>
                  <th class="py-1.5 px-2 font-semibold text-ink-gray-6">Employee</th>
                  <th class="py-1.5 px-2 font-semibold text-ink-gray-6 text-center w-14">Read</th>
                  <th class="py-1.5 px-2 font-semibold text-ink-gray-6 text-center w-14">Write</th>
                  <th class="py-1.5 px-2 font-semibold text-ink-gray-6 w-8"></th>
                </tr>
              </thead>
              <tbody class="divide-y divide-outline-gray-1">
                <tr v-for="(row, idx) in form.project_team_members" :key="idx" class="hover:bg-surface-gray-1 transition">
                  <td class="py-1.5 px-2 text-ink-gray-5 text-center">{{ idx + 1 }}</td>
                  <td class="py-1.5 px-2">
                    <Combobox
                      v-model="row.employee"
                      v-model:query="row.query"
                      :options="getFilteredEmployeeOptions(row.query, row.employee)"
                      :filterable="false"
                      placeholder="Search employee..."
                      size="sm"
                      class="w-full"
                    >
                      <template #prefix="{ selectedOption }">
                        <Avatar
                          v-if="selectedOption"
                          :image="selectedOption.image"
                          :label="selectedOption.label"
                          size="xs"
                        />
                      </template>
                      <template #item-prefix="{ item }">
                        <Avatar :image="item.image" :label="item.label" size="xs" />
                      </template>
                      <template #item-label="{ item }">
                        <div class="min-w-0 flex justify-between items-center w-full">
                          <div class="truncate font-medium text-ink-gray-9 text-xs">{{ item.label }}</div>
                          <div class="truncate text-[10px] text-ink-gray-5 ml-2">{{ item.description }}</div>
                        </div>
                      </template>
                    </Combobox>
                  </td>
                  <td class="py-1.5 px-2 text-center">
                    <input
                      type="checkbox"
                      v-model="row.read"
                      :true-value="1"
                      :false-value="0"
                      class="rounded text-[#417c7d] focus:ring-[#417c7d] cursor-pointer size-4"
                    />
                  </td>
                  <td class="py-1.5 px-2 text-center">
                    <input
                      type="checkbox"
                      v-model="row.write"
                      :true-value="1"
                      :false-value="0"
                      class="rounded text-[#417c7d] focus:ring-[#417c7d] cursor-pointer size-4"
                    />
                  </td>
                  <td class="py-1.5 px-2 text-right">
                    <button type="button" class="text-ink-gray-4 hover:text-rose-500 transition p-1 cursor-pointer" @click="form.project_team_members.splice(idx, 1)">
                      <Trash2 class="size-3.5" />
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Div 3: Sub-Projects / Child Projects (Span 3 / Bottom Right) -->
        <div class="div3 col-span-3 space-y-3 bg-surface-gray-1 dark:bg-gray-900/50 p-4 rounded-xl border border-outline-gray-2 dark:border-gray-800 flex flex-col min-h-[300px]">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-ink-gray-7 dark:text-gray-300">
              <GitFork class="size-3.5 text-blue-600" />
              <span>Sub-Projects</span>
            </div>
            <div class="flex items-center gap-2">
              <span class="text-[11px] font-medium text-ink-gray-5 dark:text-gray-400">
                {{ totalSubProjectsCount }} sub-project{{ totalSubProjectsCount !== 1 ? 's' : '' }}
              </span>
              <button
                v-if="form.child_projects.length > 0 || stagedSubProjects.length > 0"
                type="button"
                class="text-[11px] text-rose-600 hover:underline font-medium cursor-pointer"
                @click="clearAllSubProjects"
              >
                Clear All
              </button>
            </div>
          </div>

          <!-- Quick Create Sub-Project Card with Inherited Settings -->
          <div class="p-3 bg-surface-base dark:bg-gray-800/80 rounded-lg border border-outline-gray-2 dark:border-gray-700 shadow-xs space-y-2">
            <div class="flex items-center justify-between">
              <span class="text-xs font-semibold text-ink-gray-8 dark:text-gray-200">Create Sub-Project</span>
              <span class="text-[10px] font-medium text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 px-1.5 py-0.5 rounded border border-emerald-200 dark:border-emerald-800/60">
                Same settings as parent
              </span>
            </div>

            <div class="flex items-center gap-1.5">
              <input
                v-model="newSubProjectName"
                type="text"
                placeholder="Sub-project name (e.g. Mobile App)..."
                class="flex-1 min-w-0 text-xs px-2.5 py-1.5 rounded-md border border-outline-gray-2 dark:border-gray-700 bg-surface-base dark:bg-gray-900 text-ink-gray-9 dark:text-gray-100 placeholder:text-ink-gray-4 focus:outline-none focus:ring-1 focus:ring-blue-500"
                @keydown.enter.prevent="addSubProjectWithSameSettings"
              />
              <Button
                type="button"
                variant="solid"
                size="sm"
                :disabled="!newSubProjectName.trim()"
                :loading="creatingSubProject"
                @click.prevent="addSubProjectWithSameSettings"
              >
                <template #prefix><Plus class="size-3.5" /></template>
                Add
              </Button>
            </div>

            <!-- Inherited Settings Summary -->
            <div class="text-[10px] text-ink-gray-5 dark:text-gray-400 flex flex-wrap items-center gap-x-2 gap-y-0.5 pt-0.5">
              <span>Inherits:</span>
              <span class="font-medium text-ink-gray-7 dark:text-gray-300">{{ form?.team || 'No team yet' }}</span>
              <span>•</span>
              <span class="font-medium text-ink-gray-7 dark:text-gray-300">{{ form?.priority }} priority</span>
              <span>•</span>
              <span class="font-medium text-ink-gray-7 dark:text-gray-300">{{ form?.project_lead || 'No lead' }}</span>
              <span>•</span>
              <span class="font-medium text-ink-gray-7 dark:text-gray-300">{{ form?.project_team_members?.length || 0 }} member(s)</span>
            </div>
          </div>

          <!-- Add Existing Child Project Combobox Searcher -->
          <div class="space-y-1">
            <label class="text-[11px] font-medium text-ink-gray-6 dark:text-gray-400">Or link an existing project:</label>
            <Combobox
              :modelValue="selectedAddChild"
              v-model:query="childProjectQuery"
              :options="availableChildProjectOptions"
              :filterable="false"
              placeholder="+ Search and link existing project..."
              size="sm"
              class="w-full"
              @update:modelValue="addChildProject"
            >
              <template #item-prefix>
                <Folder class="size-3.5 text-blue-500 shrink-0" />
              </template>
              <template #item-label="{ item }">
                <div class="min-w-0 flex justify-between items-center w-full">
                  <div class="truncate font-medium text-ink-gray-9 text-xs">{{ item.label }}</div>
                  <div v-if="item.description" class="truncate text-[10px] text-ink-gray-5 ml-2">{{ item.description }}</div>
                </div>
              </template>
            </Combobox>
          </div>

          <!-- Linked Tree Container -->
          <div class="flex-1 rounded-lg border border-outline-gray-2 dark:border-gray-800 bg-surface-base dark:bg-gray-900/60 p-2 overflow-y-auto max-h-[180px]">
            <div v-if="projectTreeNodes.length === 0" class="py-6 text-center text-xs text-ink-gray-4 dark:text-gray-500">
              No sub-projects added yet.<br/>Type a name above to create one with the same settings.
            </div>
            <Tree v-else :nodes="projectTreeNodes" node-key="value" guides="connectors">
              <template #item-prefix>
                <Folder class="size-3.5 text-blue-500 shrink-0" />
              </template>
              <template #item-label="{ node }">
                <div class="flex items-center gap-1.5 min-w-0">
                  <span class="text-xs font-medium text-ink-gray-9 dark:text-gray-100 truncate">{{ node.label }}</span>
                  <span
                    v-if="node.is_staged"
                    class="text-[9px] font-semibold text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-300 px-1.5 py-0.2 rounded border border-emerald-200 dark:border-emerald-800 shrink-0"
                  >
                    New
                  </span>
                </div>
              </template>
              <template #item-suffix="{ node }">
                <button
                  type="button"
                  class="text-ink-gray-4 hover:text-rose-600 transition p-0.5 rounded cursor-pointer"
                  title="Remove sub-project"
                  @click.stop="removeChildProject(node.value)"
                >
                  <X class="size-3.5" />
                </button>
              </template>
            </Tree>
          </div>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { FormControl, Avatar, Button, DatePicker, Tree, Combobox, toast } from 'frappe-ui'
import { saveProject } from '../data/api'
import { Plus, Trash2, Folder, GitFork, X } from 'lucide-vue-next'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  teams: { type: Array, default: () => [] },
  employees: { type: Array, default: () => [] },
  teamMembers: { type: Array, default: () => [] },
  people: { type: Array, default: () => [] },
  projects: { type: Array, default: () => [] },
  editProject: { type: Object, default: null },
})
const emit = defineEmits(['update:modelValue', 'create', 'update'])

const MAX_VISIBLE = 5

const saving = ref(false)
const submitted = ref(false)

const defaultForm = () => ({
  project_name: '',
  team: '',
  priority: 'Medium',
  project_lead: '',
  start_date: '',
  end_date: '',
  parent_project: '',
  child_projects: [],
  project_team_members: [],
})

const form = ref(defaultForm())

const extractVal = (v) => {
  if (v === null || v === undefined) return ''
  if (typeof v === 'object') {
    const val = v.value !== undefined ? v.value : v.label
    return val !== undefined && val !== null ? String(val).trim() : ''
  }
  const s = String(v).trim()
  return (s.toLowerCase() === 'none' || s.toLowerCase() === 'null') ? '' : s
}

const errors = computed(() => {
  if (!submitted.value) return {}
  const e = {}
  if (!extractVal(form.value.project_name)) e.project_name = 'Project name is required.'
  if (!extractVal(form.value.team)) e.team = 'Team is required.'
  return e
})

const isValid = computed(() => Object.keys(errors.value).length === 0)

const priorityOptions = [
  { label: 'Low', value: 'Low' },
  { label: 'Medium', value: 'Medium' },
  { label: 'High', value: 'High' },
  { label: 'Critical', value: 'Critical' },
]

const roleOptions = [
  { label: 'Team Lead', value: 'Team Lead' },
  { label: 'Project Manager', value: 'Project Manager' },
  { label: 'Team Member', value: 'Team Member' },
  { label: 'Viewer', value: 'Viewer' },
  { label: 'Auditor', value: 'Auditor' },
  { label: 'Coordinator', value: 'Coordinator' },
]

const teamOptions = computed(() => props.teams.map(t => ({ label: t.name || t, value: t.name || t })))
const employeeOptions = computed(() => {
  const map = new Map()
  const selectedTeamName = form.value.team
  const members = Array.isArray(props.teamMembers) ? props.teamMembers : []
  members.forEach((m) => {
    if (!selectedTeamName || m.team === selectedTeamName || m.parent === selectedTeamName) {
      const val = m.employee || m.user || m.name
      if (val && !map.has(val)) {
        map.set(val, {
          label: m.employee_name || m.user_name || m.user || val,
          value: val,
          description: m.designation || m.user || m.employee || '',
          image: m.user_image || '',
        })
      }
    }
  })

  const peopleList = Array.isArray(props.people) ? props.people : []
  peopleList.forEach((p) => {
    const val = p.email || p.name
    if (val && !map.has(val)) {
      map.set(val, {
        label: p.name || val,
        value: val,
        description: p.email || '',
        image: p.image || '',
      })
    }
  })

  if (map.size === 0 && Array.isArray(props.employees)) {
    props.employees.forEach((e) => {
      map.set(e.name, {
        label: e.employee_name || e.name,
        value: e.name,
        description: e.designation || e.name,
        image: e.user_image || '',
      })
    })
  }

  return Array.from(map.values())
})

function matchTokens(text, query) {
  if (!query) return true
  if (!text) return false
  const textLower = String(text).toLowerCase()
  const tokens = String(query).toLowerCase().trim().split(/\s+/).filter(Boolean)
  return tokens.every(token => textLower.includes(token))
}

function getFilteredEmployeeOptions(query = '', selectedValue = '') {
  const q = (query || '').trim()
  let list = employeeOptions.value
  if (q) {
    list = list.filter(e => matchTokens(`${e.label} ${e.description}`, q))
  }
  const sliced = list.slice(0, MAX_VISIBLE)
  if (selectedValue && !sliced.some(e => e.value === selectedValue)) {
    const selectedOpt = employeeOptions.value.find(e => e.value === selectedValue)
    if (selectedOpt) {
      return [selectedOpt, ...sliced]
    }
  }
  return sliced
}

const leadQuery = ref('')
const filteredEmployeeOptions = computed(() => getFilteredEmployeeOptions(leadQuery.value, form.value.project_lead))
const projectOptions = computed(() => props.projects.map(p => ({ label: p.project_name || p.name, value: p.name })))

// --- Sub-Projects (Creation with Inherited Settings & Linking) ---
const childProjectQuery = ref('')
const selectedAddChild = ref(null)
const stagedSubProjects = ref([])
const newSubProjectName = ref('')

const totalSubProjectsCount = computed(() => {
  return (form.value.child_projects ? form.value.child_projects.length : 0) + stagedSubProjects.value.length
})

const creatingSubProject = ref(false)

async function addSubProjectWithSameSettings() {
  const name = newSubProjectName.value.trim()
  if (!name || creatingSubProject.value) return

  const pTeam = extractVal(form.value.team)
  if (!pTeam) {
    toast.error('Please select a Team for the project first.')
    return
  }

  // Check if sub-project with this name is already staged or linked
  const isDuplicateStaged = stagedSubProjects.value.some(s => s.project_name.toLowerCase() === name.toLowerCase())
  const isDuplicateExisting = (props.projects || []).some(
    p => (p.project_name || p.name || '').toLowerCase() === name.toLowerCase() && form.value.child_projects.includes(p.name || p.project_name)
  )

  if (isDuplicateStaged || isDuplicateExisting) {
    toast.error(`A sub-project named "${name}" is already added.`)
    return
  }

  const subData = {
    project_name: name,
    team: pTeam,
    priority: extractVal(form.value.priority) || 'Medium',
    project_lead: extractVal(form.value.project_lead) || undefined,
    start_date: form.value.start_date || undefined,
    end_date: form.value.end_date || undefined,
    project_team_members: form.value.project_team_members
      .filter(r => extractVal(r.employee))
      .map(r => ({ ...r, employee: extractVal(r.employee) })),
  }

  // Editing an existing project: the parent already exists, so create the sub-project right away
  if (props.editProject) {
    const parentId = props.editProject.raw_name || props.editProject.id || props.editProject.name
    creatingSubProject.value = true
    try {
      const res = await saveProject({ doctype: 'Taskflow Project', status: 'Draft', ...subData, parent_project: parentId })
      const created = res?.name || res?.message?.name
      // Keep it linked so the parent's Update does not unlink it
      if (created && !form.value.child_projects.includes(created)) {
        form.value.child_projects.push(created)
      }
      newSubProjectName.value = ''
      toast.success(`Sub-project "${name}" created!`)
      emit('create', res)
    } catch (err) {
      toast.error(err.message || 'Failed to create sub-project')
    } finally {
      creatingSubProject.value = false
    }
    return
  }

  // New project: the parent does not exist yet, so stage it and create it together on Create
  stagedSubProjects.value.push({
    temp_id: `temp_sub_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
    ...subData,
  })

  newSubProjectName.value = ''
  toast.info(`Sub-project "${name}" will be created when you click Create.`)
}

const availableChildProjectOptions = computed(() => {
  const currentId = props.editProject ? (props.editProject.raw_name || props.editProject.id || props.editProject.name) : null
  const q = childProjectQuery.value.trim()

  let list = (props.projects || []).filter(p => {
    const id = p.name || p.project_name
    return id !== currentId && !form.value.child_projects.includes(id)
  }).map(p => ({
    label: p.project_name || p.name,
    value: p.name || p.project_name,
    description: p.team ? `Team: ${p.team}` : '',
  }))

  if (q) {
    list = list.filter(p => matchTokens(`${p.label} ${p.description}`, q))
  }

  return list.slice(0, MAX_VISIBLE)
})

function addChildProject(val) {
  if (!val) return
  const projId = typeof val === 'object' ? val.value : val
  if (projId && !form.value.child_projects.includes(projId)) {
    form.value.child_projects.push(projId)
  }
  selectedAddChild.value = null
  childProjectQuery.value = ''
}

function removeChildProject(projId) {
  if (!projId) return
  const sIdx = stagedSubProjects.value.findIndex(s => s.temp_id === projId)
  if (sIdx > -1) {
    stagedSubProjects.value.splice(sIdx, 1)
    return
  }
  const idx = form.value.child_projects.indexOf(projId)
  if (idx > -1) {
    form.value.child_projects.splice(idx, 1)
  }
}

function clearAllSubProjects() {
  form.value.child_projects = []
  stagedSubProjects.value = []
}

const projectTreeNodes = computed(() => {
  const linkedIds = new Set(form.value.child_projects || [])
  const allProjects = props.projects || []

  const map = {}
  const roots = []

  allProjects.forEach(p => {
    const id = p.name || p.project_name
    if (linkedIds.has(id)) {
      map[id] = {
        name: id,
        label: p.project_name || p.name,
        value: id,
        is_staged: false,
        expanded: true,
        children: [],
      }
    }
  })

  allProjects.forEach(p => {
    const id = p.name || p.project_name
    if (map[id]) {
      const parentId = p.parent_project
      if (parentId && map[parentId]) {
        map[parentId].children.push(map[id])
      } else {
        roots.push(map[id])
      }
    }
  })

  stagedSubProjects.value.forEach(s => {
    roots.push({
      name: s.temp_id,
      label: s.project_name,
      value: s.temp_id,
      is_staged: true,
      expanded: true,
      children: [],
    })
  })

  return roots
})

// Close modal on Escape key
function handleKeydown(e) {
  if (e.key === 'Escape') {
    close()
  }
}

onMounted(() => {
  document.addEventListener('keydown', handleKeydown)
})
onBeforeUnmount(() => {
  document.removeEventListener('keydown', handleKeydown)
})

function fillForm(project) {
  if (!project) return
  stagedSubProjects.value = []
  newSubProjectName.value = ''
  const pId = project.raw_name || project.id || project.name
  const existingChildren = (props.projects || [])
    .filter(p => p.parent_project === pId || (project.raw_name && p.parent_project === project.raw_name) || (project.name && p.parent_project === project.name))
    .map(p => p.name || p.project_name)

  form.value = {
    project_name: project.project_name || (project.name !== pId ? project.name : '') || project.name || '',
    team: project.team || '',
    priority: project.priority || 'Medium',
    project_lead: project.project_lead || project.lead || '',
    start_date: project.start_date || '',
    end_date: project.due_date || project.end_date || '',
    parent_project: project.parent_project || '',
    child_projects: existingChildren,
    project_team_members: project.project_team_members
      ? project.project_team_members.map(m => ({
          employee: m.employee || '',
          read: m.read !== undefined ? (m.read ? 1 : 0) : 1,
          write: m.write !== undefined ? (m.write ? 1 : 0) : 1,
          team_role: m.team_role || 'Team Member',
          access_level: m.access_level || 'Operate',
          is_active: m.is_active !== undefined ? m.is_active : 1,
          query: '',
        }))
      : [],
  }
}

watch(
  () => [props.modelValue, props.editProject],
  ([val, editProj]) => {
    if (val) {
      submitted.value = false
      leadQuery.value = ''
      childProjectQuery.value = ''
      selectedAddChild.value = null
      stagedSubProjects.value = []
      newSubProjectName.value = ''
      if (editProj) {
        fillForm(editProj)
      } else {
        form.value = defaultForm()
      }
    }
  },
  { immediate: true },
)

function addMember() {
  form.value.project_team_members.push({
    employee: '',
    read: 1,
    write: 1,
    team_role: 'Team Member',
    access_level: 'Operate',
    is_active: 1,
    query: '',
  })
}

function close() {
  if (stagedSubProjects.value.length > 0 && !confirm('Sub-projects you added are not saved yet. Discard them?')) return
  stagedSubProjects.value = []
  emit('update:modelValue', false)
}

async function submit() {
  submitted.value = true
  if (!isValid.value) return

  const pName = extractVal(form.value.project_name)
  const pTeam = extractVal(form.value.team)
  const pPriority = extractVal(form.value.priority) || 'Medium'
  const pLead = extractVal(form.value.project_lead)
  const pParent = extractVal(form.value.parent_project)

  if (!pName) {
    toast.error('Project Name is required.')
    return
  }
  if (!pTeam) {
    toast.error('Team is required.')
    return
  }

  saving.value = true
  try {
    const doc = {
      doctype: 'Taskflow Project',
      project_name: pName,
      team: pTeam,
      status: 'Draft',
      priority: pPriority,
      project_lead: pLead || undefined,
      start_date: form.value.start_date || undefined,
      end_date: form.value.end_date || undefined,
      parent_project: pParent || undefined,
      child_projects: form.value.child_projects,
      new_sub_projects: stagedSubProjects.value.map(s => ({
        project_name: extractVal(s.project_name),
        team: pTeam,
        priority: pPriority,
        project_lead: pLead || undefined,
        start_date: form.value.start_date || undefined,
        end_date: form.value.end_date || undefined,
        project_team_members: form.value.project_team_members
          .filter(r => extractVal(r.employee))
          .map(r => ({ ...r, employee: extractVal(r.employee) })),
      })),
      project_team_members: form.value.project_team_members
        .filter(r => extractVal(r.employee))
        .map(r => ({ ...r, employee: extractVal(r.employee) })),
    }

    if (props.editProject) {
      doc.name = props.editProject.raw_name || props.editProject.id || props.editProject.name
    }

    const res = await saveProject(doc)
    const numSub = stagedSubProjects.value.length
    if (numSub > 0) {
      toast.success(props.editProject ? `Project updated with ${numSub} sub-project(s)!` : `Project created with ${numSub} sub-project(s)!`)
    } else {
      toast.success(props.editProject ? 'Project updated!' : 'Project created!')
    }
    stagedSubProjects.value = []
    emit(props.editProject ? 'update' : 'create', res.message)
    close()
  } catch (err) {
    toast.error(err.message || 'Failed to save project')
  } finally {
    saving.value = false
  }
}
</script>
