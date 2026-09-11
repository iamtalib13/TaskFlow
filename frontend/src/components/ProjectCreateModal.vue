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
                  <th class="py-1.5 px-2.5 font-semibold text-ink-gray-6">#</th>
                  <th class="py-1.5 px-2.5 font-semibold text-ink-gray-6">Employee</th>
                  <th class="py-1.5 px-2.5 font-semibold text-ink-gray-6">Role</th>
                  <th class="py-1.5 px-2.5 font-semibold text-ink-gray-6 w-8"></th>
                </tr>
              </thead>
              <tbody class="divide-y divide-outline-gray-1">
                <tr v-for="(row, idx) in form.project_team_members" :key="idx" class="hover:bg-surface-gray-1 transition">
                  <td class="py-1.5 px-2.5 text-ink-gray-5">{{ idx + 1 }}</td>
                  <td class="py-1.5 px-2.5">
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
                  <td class="py-1.5 px-2.5">
                    <FormControl
                      v-model="row.team_role"
                      type="select"
                      size="sm"
                      placeholder="Role"
                      :options="roleOptions"
                    />
                  </td>
                  <td class="py-1.5 px-2.5 text-right">
                    <button type="button" class="text-ink-gray-4 hover:text-rose-500 transition p-1 cursor-pointer" @click="form.project_team_members.splice(idx, 1)">
                      <Trash2 class="size-3.5" />
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Div 3: Child Projects / Tree Structure (Span 3 / Bottom Right) -->
        <div class="div3 col-span-3 space-y-3 bg-surface-gray-1 p-4 rounded-xl border border-outline-gray-2 flex flex-col min-h-[260px]">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-ink-gray-7">
              <GitFork class="size-3.5 text-blue-600" />
              <span>Linked Child Projects</span>
            </div>
            <button
              v-if="form.child_projects.length > 0"
              type="button"
              class="text-[11px] text-rose-600 hover:underline font-medium cursor-pointer"
              @click="form.child_projects = []"
            >
              Clear Children
            </button>
          </div>

          <!-- Current Selected Children Status Card -->
          <div class="p-2 rounded-lg border border-outline-gray-2 bg-surface-base text-xs flex items-center justify-between shadow-xs">
            <span class="text-ink-gray-5 font-medium">Sub-Projects Linked:</span>
            <span class="font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
              {{ form.child_projects.length }} project{{ form.child_projects.length !== 1 ? 's' : '' }}
            </span>
          </div>

          <!-- Add Child Project Combobox Searcher -->
          <div class="space-y-1">
            <Combobox
              :modelValue="selectedAddChild"
              v-model:query="childProjectQuery"
              :options="availableChildProjectOptions"
              :filterable="false"
              placeholder="+ Add child project..."
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
          <div class="flex-1 rounded-lg border border-outline-gray-2 bg-surface-base p-2 overflow-y-auto max-h-[190px]">
            <div v-if="projectTreeNodes.length === 0" class="py-6 text-center text-xs text-ink-gray-4">
              No child projects linked yet.<br/>Use the search above to add child projects.
            </div>
            <Tree v-else :nodes="projectTreeNodes" node-key="value" guides="connectors">
              <template #item-prefix>
                <Folder class="size-3.5 text-blue-500 shrink-0" />
              </template>
              <template #item-label="{ node }">
                <span class="text-xs font-medium text-ink-gray-9 truncate">{{ node.label }}</span>
              </template>
              <template #item-suffix="{ node }">
                <button
                  type="button"
                  class="text-ink-gray-4 hover:text-rose-600 transition p-0.5 rounded cursor-pointer"
                  title="Remove child project"
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

const errors = computed(() => {
  if (!submitted.value) return {}
  const e = {}
  if (!form.value.project_name.trim()) e.project_name = 'Project name is required.'
  if (!form.value.team) e.team = 'Team is required.'
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
const employeeOptions = computed(() => props.employees.map(e => ({
  label: e.employee_name || e.name,
  value: e.name,
  description: e.name,
  image: e.user_image || '',
})))

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

// --- Child Projects Search & Tree ---
const childProjectQuery = ref('')
const selectedAddChild = ref(null)

const availableChildProjectOptions = computed(() => {
  const currentId = props.editProject ? (props.editProject.name || props.editProject.id) : null
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
  const idx = form.value.child_projects.indexOf(projId)
  if (idx > -1) {
    form.value.child_projects.splice(idx, 1)
  }
}

const projectTreeNodes = computed(() => {
  if (!form.value.child_projects || form.value.child_projects.length === 0) return []

  const linkedIds = new Set(form.value.child_projects)
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
  const pName = project.name || project.project_name || project.id
  const existingChildren = (props.projects || [])
    .filter(p => p.parent_project === pName)
    .map(p => p.name || p.project_name)

  form.value = {
    project_name: project.name || project.project_name || '',
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
          team_role: m.team_role || 'Team Member',
          access_level: m.access_level || 'Operate',
          is_active: m.is_active !== undefined ? m.is_active : 1,
          query: '',
        }))
      : [],
  }
}

watch(() => props.modelValue, (val) => {
  if (val) {
    submitted.value = false
    leadQuery.value = ''
    childProjectQuery.value = ''
    selectedAddChild.value = null
    if (props.editProject) {
      fillForm(props.editProject)
    } else {
      form.value = defaultForm()
    }
  }
})

function addMember() {
  form.value.project_team_members.push({
    employee: '',
    team_role: 'Team Member',
    access_level: 'Operate',
    is_active: 1,
    query: '',
  })
}

function close() {
  emit('update:modelValue', false)
}

async function submit() {
  submitted.value = true
  if (!isValid.value) return

  saving.value = true
  try {
    const doc = {
      doctype: 'Taskflow Project',
      project_name: form.value.project_name,
      team: form.value.team,
      status: 'Draft',
      priority: form.value.priority,
      project_lead: form.value.project_lead || undefined,
      start_date: form.value.start_date || undefined,
      end_date: form.value.end_date || undefined,
      parent_project: form.value.parent_project || undefined,
      child_projects: form.value.child_projects,
      project_team_members: form.value.project_team_members.filter(r => r.employee),
    }

    if (props.editProject) {
      doc.name = props.editProject.name || props.editProject.id
    }

    const res = await saveProject(doc)
    toast.success(props.editProject ? 'Project updated!' : 'Project created!')
    emit(props.editProject ? 'update' : 'create', res.message)
    close()
  } catch (err) {
    toast.error(err.message || 'Failed to save project')
  } finally {
    saving.value = false
  }
}
</script>
