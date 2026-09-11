<template>
  <div v-if="modelValue" class="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 backdrop-blur-sm" @click.self="close">
    <div class="w-full max-w-5xl my-6 bg-surface-base rounded-xl border border-outline-gray-2 shadow-2xl overflow-hidden flex flex-col">
      <!-- Header with buttons -->
      <div class="flex items-center justify-between px-6 py-4 border-b border-outline-gray-2 bg-surface-gray-1 shrink-0">
        <div>
          <h2 class="text-lg font-bold text-ink-gray-9">{{ editProject ? 'Edit Project' : 'Create Project' }}</h2>
          <p class="text-xs text-ink-gray-5 mt-0.5">{{ editProject ? 'Update project details' : 'Fill in the details to start a new project' }}</p>
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
        <div class="div1 col-span-6 space-y-4 bg-surface-gray-1/50 p-4 rounded-xl border border-outline-gray-2">
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
            <!-- Project Lead Custom Search -->
            <div class="space-y-1.5" ref="leadDropdownRef">
              <label class="text-sm font-medium text-ink-gray-8">Project Lead</label>
              <div class="relative">
                <div
                  class="flex items-center gap-2 w-full px-3 py-2 border rounded-lg bg-surface-base text-sm transition cursor-pointer"
                  :class="leadSearchOpen ? 'border-blue-400 ring-2 ring-blue-100' : 'border-outline-gray-2 hover:border-outline-gray-3'"
                  @click="openLeadSearch"
                >
                  <div v-if="leadSelected && !leadSearchOpen" class="flex items-center gap-2 flex-1 min-w-0">
                    <Avatar :image="leadSelected.image" :label="leadSelected.label" size="sm" />
                    <span class="truncate text-ink-gray-9 font-medium">{{ leadSelected.label }}</span>
                    <button type="button" class="ml-auto shrink-0 text-ink-gray-4 hover:text-rose-500" @click.stop="clearLead">
                      <X class="size-3.5" />
                    </button>
                  </div>
                  <div v-else class="flex items-center gap-2 flex-1 min-w-0">
                    <Search class="size-4 text-ink-gray-4 shrink-0" />
                    <input
                      ref="leadSearchInput"
                      v-model="leadSearchQuery"
                      type="text"
                      class="flex-1 bg-transparent outline-none text-sm text-ink-gray-9 placeholder:text-ink-gray-4"
                      placeholder="Search employee..."
                      @focus="leadSearchOpen = true"
                    />
                  </div>
                </div>

                <!-- Dropdown -->
                <div
                  v-if="leadSearchOpen"
                  class="absolute z-50 mt-1 w-full bg-surface-base border border-outline-gray-2 rounded-lg shadow-lg overflow-hidden"
                >
                  <div class="max-h-56 overflow-y-auto">
                    <div v-if="leadFilteredOptions.length === 0" class="py-3 text-center text-xs text-ink-gray-4">
                      No employees found
                    </div>
                    <button
                      v-for="opt in leadFilteredOptions"
                      :key="opt.value"
                      type="button"
                      class="w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-surface-gray-2 transition text-sm cursor-pointer"
                      :class="form.project_lead === opt.value ? 'bg-surface-gray-2' : ''"
                      @click="selectLead(opt)"
                    >
                      <Avatar :image="opt.image" :label="opt.label" size="sm" />
                      <div class="min-w-0 flex-1">
                        <div class="truncate text-ink-gray-9 font-medium">{{ opt.label }}</div>
                        <div class="truncate text-xs text-ink-gray-5">{{ opt.description }}</div>
                      </div>
                    </button>
                  </div>
                </div>
              </div>
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
                    <div class="relative" :ref="el => setMemberRef(idx, el)">
                      <!-- Selected / Input -->
                      <div
                        class="flex items-center gap-1.5 w-full px-2 py-1 border rounded-md bg-surface-base text-xs transition cursor-pointer"
                        :class="memberOpenIdx === idx ? 'border-blue-400 ring-2 ring-blue-100' : 'border-outline-gray-2 hover:border-outline-gray-3'"
                        @click="openMember(idx)"
                      >
                        <template v-if="getMemberOpt(idx) && memberOpenIdx !== idx">
                          <Avatar :image="getMemberOpt(idx).image" :label="getMemberOpt(idx).label" size="xs" />
                          <span class="truncate text-ink-gray-9 font-medium">{{ getMemberOpt(idx).label }}</span>
                          <button type="button" class="ml-auto shrink-0 text-ink-gray-4 hover:text-rose-500" @click.stop="row.employee = ''">
                            <X class="size-3" />
                          </button>
                        </template>
                        <template v-else>
                          <Search class="size-3 text-ink-gray-4 shrink-0" />
                          <input
                            :ref="el => setInputRef(idx, el)"
                            v-model="memberQ"
                            type="text"
                            class="flex-1 bg-transparent outline-none text-xs text-ink-gray-9 placeholder:text-ink-gray-4 min-w-0"
                            placeholder="Search..."
                            @focus="memberOpenIdx = idx"
                          />
                        </template>
                      </div>
                      <!-- Dropdown via Teleport to avoid overflow clipping -->
                      <Teleport to="body">
                        <div
                          v-if="memberOpenIdx === idx"
                          class="fixed z-[9999] bg-surface-base border border-outline-gray-2 rounded-lg shadow-xl overflow-hidden"
                          :style="memberDropdownStyle"
                        >
                          <div class="max-h-44 overflow-y-auto">
                            <div v-if="memberFiltered.length === 0" class="py-2.5 text-center text-[11px] text-ink-gray-4">
                              No employees found
                            </div>
                            <button
                              v-for="opt in memberFiltered"
                              :key="opt.value"
                              type="button"
                              class="w-full flex items-center gap-2 px-2.5 py-1.5 text-left hover:bg-surface-gray-2 transition text-xs cursor-pointer"
                              :class="row.employee === opt.value ? 'bg-surface-gray-2' : ''"
                              @click="pickMember(idx, opt)"
                            >
                              <Avatar :image="opt.image" :label="opt.label" size="xs" />
                              <div class="min-w-0 flex-1">
                                <div class="truncate text-ink-gray-9 font-medium">{{ opt.label }}</div>
                                <div class="truncate text-[10px] text-ink-gray-5">{{ opt.description }}</div>
                              </div>
                            </button>
                          </div>
                        </div>
                      </Teleport>
                    </div>
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
              <span>Project Hierarchy & Tree</span>
            </div>
            <button
              v-if="form.parent_project"
              type="button"
              class="text-[11px] text-rose-600 hover:underline font-medium cursor-pointer"
              @click="form.parent_project = ''"
            >
              Clear Parent
            </button>
          </div>

          <!-- Current Selected Parent Status Card -->
          <div class="p-2 rounded-lg border border-outline-gray-2 bg-surface-base text-xs flex items-center justify-between shadow-xs">
            <span class="text-ink-gray-5 font-medium">Selected Parent:</span>
            <span class="font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 truncate max-w-[170px]">
              {{ selectedParentLabel }}
            </span>
          </div>

          <!-- Tree Component Container -->
          <div class="flex-1 rounded-lg border border-outline-gray-2 bg-surface-base p-2 overflow-y-auto max-h-[190px]">
            <Tree :nodes="projectTreeNodes" node-key="value">
              <template #item="{ node }">
                <div
                  class="flex items-center justify-between px-2 py-1 rounded-md text-xs cursor-pointer transition-all duration-150 group"
                  :class="form.parent_project === node.value ? 'bg-blue-50 text-blue-700 font-semibold border border-blue-200' : 'hover:bg-surface-gray-2 text-ink-gray-8'"
                  @click="form.parent_project = node.value"
                >
                  <div class="flex items-center gap-1.5 min-w-0">
                    <Folder class="size-3.5 text-blue-500 shrink-0" />
                    <span class="truncate">{{ node.label }}</span>
                  </div>
                  <span
                    v-if="form.parent_project === node.value"
                    class="text-[10px] bg-blue-600 text-white px-1.5 py-0.5 rounded font-medium shrink-0 ml-1"
                  >
                    Parent
                  </span>
                </div>
              </template>
            </Tree>
          </div>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick, onMounted, onBeforeUnmount } from 'vue'
import { FormControl, Avatar, Button, DatePicker, Tree, toast } from 'frappe-ui'
import { saveProject } from '../data/api'
import { Plus, Trash2, Search, X, Folder, GitFork } from 'lucide-vue-next'

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
const projectOptions = computed(() => props.projects.map(p => ({ label: p.project_name || p.name, value: p.name })))

const selectedParentLabel = computed(() => {
  if (!form.value.parent_project) return 'None (Top Level)'
  const p = props.projects.find(proj => (proj.name || proj.project_name) === form.value.parent_project)
  return p ? (p.project_name || p.name) : form.value.parent_project
})

const projectTreeNodes = computed(() => {
  const currentId = props.editProject ? (props.editProject.name || props.editProject.id) : null
  const filtered = props.projects.filter(p => {
    const id = p.name || p.project_name
    return id !== currentId
  })

  const map = {}
  const roots = [
    {
      name: '',
      label: 'None (Top Level Project)',
      value: '',
      children: [],
    }
  ]

  filtered.forEach(p => {
    const id = p.name || p.project_name
    map[id] = {
      name: id,
      label: p.project_name || p.name,
      value: id,
      expanded: true,
      children: [],
    }
  })

  filtered.forEach(p => {
    const id = p.name || p.project_name
    const parentId = p.parent_project
    if (parentId && map[parentId]) {
      map[parentId].children.push(map[id])
    } else {
      roots.push(map[id])
    }
  })

  return roots
})

// --- Project Lead Search ---
const leadSearchOpen = ref(false)
const leadSearchQuery = ref('')
const leadSearchInput = ref(null)
const leadDropdownRef = ref(null)

const leadSelected = computed(() => {
  if (!form.value.project_lead) return null
  return employeeOptions.value.find(e => e.value === form.value.project_lead) || null
})

const leadFilteredOptions = computed(() => {
  const q = leadSearchQuery.value.toLowerCase().trim()
  let list = employeeOptions.value
  if (q) {
    list = list.filter(e =>
      e.label.toLowerCase().includes(q) ||
      e.description.toLowerCase().includes(q)
    )
  }
  return list.slice(0, MAX_VISIBLE)
})

function openLeadSearch() {
  leadSearchOpen.value = true
  leadSearchQuery.value = ''
  nextTick(() => leadSearchInput.value?.focus())
}

function selectLead(opt) {
  form.value.project_lead = opt.value
  leadSearchOpen.value = false
  leadSearchQuery.value = ''
}

function clearLead() {
  form.value.project_lead = ''
}

// --- Team Members Search ---
const memberOpenIdx = ref(-1)
const memberQ = ref('')
const memberRefs = ref({})
const memberInputs = ref({})

function setMemberRef(idx, el) {
  if (el) memberRefs.value[idx] = el
}
function setInputRef(idx, el) {
  if (el) memberInputs.value[idx] = el
}

// Teleport dropdown position
const memberDropdownPos = ref({ top: 0, left: 0, width: 200 })

const memberDropdownStyle = computed(() => ({
  top: `${memberDropdownPos.value.top}px`,
  left: `${memberDropdownPos.value.left}px`,
  width: `${memberDropdownPos.value.width}px`,
}))

function openMember(idx) {
  memberOpenIdx.value = idx
  memberQ.value = ''
  nextTick(() => {
    memberInputs.value[idx]?.focus()
    // Trigger element ki position calculate karo
    const triggerEl = memberRefs.value[idx]
    if (triggerEl) {
      const rect = triggerEl.getBoundingClientRect()
      const spaceBelow = window.innerHeight - rect.bottom
      const dropdownHeight = 220 // approximate max height

      memberDropdownPos.value = {
        // Agar neeche jagah nahi to upar dikhaao
        top: spaceBelow < dropdownHeight
          ? rect.top - dropdownHeight + window.scrollY
          : rect.bottom + 4 + window.scrollY,
        left: rect.left + window.scrollX,
        width: rect.width,
      }
    }
  })
}

function pickMember(idx, opt) {
  form.value.project_team_members[idx].employee = opt.value
  memberOpenIdx.value = -1
  memberQ.value = ''
}

function getMemberOpt(idx) {
  const emp = form.value.project_team_members[idx]?.employee
  if (!emp) return null
  return employeeOptions.value.find(e => e.value === emp) || null
}

const memberFiltered = computed(() => {
  const q = memberQ.value.toLowerCase().trim()
  let list = employeeOptions.value
  if (q) {
    list = list.filter(e =>
      e.label.toLowerCase().includes(q) ||
      e.description.toLowerCase().includes(q)
    )
  }
  return list.slice(0, MAX_VISIBLE)
})

// Close dropdowns on outside click
function handleClickOutside(e) {
  if (leadDropdownRef.value && !leadDropdownRef.value.contains(e.target)) {
    leadSearchOpen.value = false
  }
  if (memberOpenIdx.value >= 0) {
    const ref = memberRefs.value[memberOpenIdx.value]
    if (ref && !ref.contains(e.target)) {
      memberOpenIdx.value = -1
    }
  }
}

// Close modal on Escape key
function handleKeydown(e) {
  if (e.key === 'Escape') {
    // Agar koi dropdown open hai to pehle use band karo
    if (leadSearchOpen.value) {
      leadSearchOpen.value = false
      return
    }
    if (memberOpenIdx.value >= 0) {
      memberOpenIdx.value = -1
      return
    }
    close()
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside, true)
  document.addEventListener('keydown', handleKeydown)
})
onBeforeUnmount(() => {
  document.removeEventListener('click', handleClickOutside, true)
  document.removeEventListener('keydown', handleKeydown)
})

function fillForm(project) {
  if (!project) return
  form.value = {
    project_name: project.name || project.project_name || '',
    team: project.team || '',
    priority: project.priority || 'Medium',
    project_lead: project.project_lead || project.lead || '',
    start_date: project.start_date || '',
    end_date: project.due_date || project.end_date || '',
    parent_project: project.parent_project || '',
    project_team_members: project.project_team_members
      ? project.project_team_members.map(m => ({
          employee: m.employee || '',
          team_role: m.team_role || 'Team Member',
          access_level: m.access_level || 'Operate',
          is_active: m.is_active !== undefined ? m.is_active : 1,
        }))
      : [],
  }
}

watch(() => props.modelValue, (val) => {
  if (val) {
    submitted.value = false
    leadSearchOpen.value = false
    memberOpenIdx.value = -1
    memberQ.value = ''
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
