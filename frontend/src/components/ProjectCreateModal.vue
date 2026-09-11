<template>
  <div v-if="modelValue" class="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 backdrop-blur-sm" @click.self="close">
    <div class="w-full max-w-2xl my-8 bg-surface-base rounded-xl border border-outline-gray-2 shadow-2xl overflow-hidden">
      <!-- Header with buttons -->
      <div class="flex items-center justify-between px-6 py-4 border-b border-outline-gray-2 bg-surface-gray-1">
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

      <!-- Form Body -->
      <form class="px-6 py-5 space-y-5 max-h-[70vh] overflow-y-auto" @submit.prevent="submit">
        <!-- Project Name -->
        <FormControl
          v-model="form.project_name"
          type="text"
          label="Project Name"
          placeholder="E.g., CRM Revamp"
          :error="errors.project_name"
          required
        />

        <!-- Team + Priority -->
        <div class="grid grid-cols-2 gap-4">
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
        </div>

        <!-- Project Lead - Custom Search Select -->
        <div class="space-y-1.5" ref="leadDropdownRef">
          <label class="text-sm font-medium text-ink-gray-8">Project Lead</label>
          <div class="relative">
            <!-- Selected display / Search input -->
            <div
              class="flex items-center gap-2 w-full px-3 py-2 border rounded-lg bg-surface-base text-sm transition cursor-pointer"
              :class="leadSearchOpen ? 'border-blue-400 ring-2 ring-blue-100' : 'border-outline-gray-2 hover:border-outline-gray-3'"
              @click="openLeadSearch"
            >
              <div v-if="leadSelected && !leadSearchOpen" class="flex items-center gap-2 flex-1 min-w-0">
                <Avatar :image="leadSelected.image" :label="leadSelected.label" size="sm" />
                <span class="truncate text-ink-gray-9 font-medium">{{ leadSelected.label }}</span>
                <span class="text-xs text-ink-gray-5 truncate">{{ leadSelected.description }}</span>
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
              <div class="max-h-60 overflow-y-auto">
                <div v-if="leadFilteredOptions.length === 0" class="py-4 text-center text-xs text-ink-gray-4">
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
              <div class="px-3 py-1.5 border-t border-outline-gray-1 text-[11px] text-ink-gray-4 text-center">
                {{ leadFilteredOptions.length }} result{{ leadFilteredOptions.length !== 1 ? 's' : '' }} — type to search more
              </div>
            </div>
          </div>
        </div>

        <!-- Start + End Date -->
        <div class="grid grid-cols-2 gap-4">
          <div class="space-y-1.5">
            <label class="text-sm font-medium text-ink-gray-8">Start Date</label>
            <DatePicker
              v-model="form.start_date"
              format="dd-MM-yyyy"
              placeholder="Pick start date"
            />
          </div>
          <div class="space-y-1.5">
            <label class="text-sm font-medium text-ink-gray-8">End Date</label>
            <DatePicker
              v-model="form.end_date"
              format="dd-MM-yyyy"
              placeholder="Pick end date"
            />
          </div>
        </div>

        <!-- Parent Project -->
        <FormControl
          v-model="form.parent_project"
          type="select"
          label="Parent Project"
          placeholder="None"
          :options="[{ label: 'None', value: '' }, ...projectOptions]"
        />

        <!-- Team Members Section -->
        <div class="space-y-2">
          <div class="flex items-center justify-between">
            <label class="text-sm font-semibold text-ink-gray-8">Project Team Members</label>
            <Button size="sm" variant="subtle" @click.prevent="addMember">
              <template #prefix><Plus class="size-3.5" /></template>
              Add Member
            </Button>
          </div>

          <div v-if="form.project_team_members.length === 0" class="border border-dashed border-outline-gray-2 rounded-lg py-6 text-center text-ink-gray-4 text-xs">
            No team members added yet.
          </div>

          <div v-else class="border border-outline-gray-2 rounded-lg overflow-hidden">
            <table class="w-full text-left text-xs">
              <thead class="bg-surface-gray-2 border-b border-outline-gray-2">
                <tr>
                  <th class="py-2 px-3 font-semibold text-ink-gray-6">#</th>
                  <th class="py-2 px-3 font-semibold text-ink-gray-6">Employee</th>
                  <th class="py-2 px-3 font-semibold text-ink-gray-6">Role</th>
                  <th class="py-2 px-3 font-semibold text-ink-gray-6 w-10"></th>
                </tr>
              </thead>
              <tbody class="divide-y divide-outline-gray-1">
                <tr v-for="(row, idx) in form.project_team_members" :key="idx" class="hover:bg-surface-gray-1 transition">
                  <td class="py-2 px-3 text-ink-gray-5">{{ idx + 1 }}</td>
                  <td class="py-2 px-3">
                    <div class="relative" :ref="el => setMemberRef(idx, el)">
                      <!-- Selected / Input -->
                      <div
                        class="flex items-center gap-2 w-full px-3 py-1.5 border rounded-lg bg-surface-base text-xs transition cursor-pointer"
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
                          <Search class="size-3.5 text-ink-gray-4 shrink-0" />
                          <input
                            :ref="el => setInputRef(idx, el)"
                            v-model="memberQ"
                            type="text"
                            class="flex-1 bg-transparent outline-none text-xs text-ink-gray-9 placeholder:text-ink-gray-4"
                            placeholder="Search employee..."
                            @focus="memberOpenIdx = idx"
                          />
                        </template>
                      </div>
                      <!-- Dropdown -->
                      <div
                        v-if="memberOpenIdx === idx"
                        class="absolute z-50 mt-1 left-0 w-full bg-surface-base border border-outline-gray-2 rounded-lg shadow-lg overflow-hidden"
                      >
                        <div class="max-h-48 overflow-y-auto">
                          <div v-if="memberFiltered.length === 0" class="py-3 text-center text-[11px] text-ink-gray-4">
                            No employees found
                          </div>
                          <button
                            v-for="opt in memberFiltered"
                            :key="opt.value"
                            type="button"
                            class="w-full flex items-center gap-2 px-3 py-1.5 text-left hover:bg-surface-gray-2 transition text-xs cursor-pointer"
                            :class="row.employee === opt.value ? 'bg-surface-gray-2' : ''"
                            @click="pickMember(idx, opt)"
                          >
                            <Avatar :image="opt.image" :label="opt.label" size="xs" />
                            <div class="min-w-0 flex-1">
                              <div class="truncate text-ink-gray-9 font-medium">{{ opt.label }}</div>
                              <div class="truncate text-[11px] text-ink-gray-5">{{ opt.description }}</div>
                            </div>
                          </button>
                        </div>
                        <div class="px-3 py-1 border-t border-outline-gray-1 text-[10px] text-ink-gray-4 text-center">
                          {{ memberFiltered.length }} result{{ memberFiltered.length !== 1 ? 's' : '' }} — type to search more
                        </div>
                      </div>
                    </div>
                  </td>
                  <td class="py-2 px-3">
                    <FormControl
                      v-model="row.team_role"
                      type="select"
                      placeholder="Select role"
                      :options="roleOptions"
                    />
                  </td>
                  <td class="py-2 px-3 text-right">
                    <button type="button" class="text-ink-gray-4 hover:text-rose-500 transition p-1 cursor-pointer" @click="form.project_team_members.splice(idx, 1)">
                      <Trash2 class="size-3.5" />
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick, onMounted, onBeforeUnmount } from 'vue'
import { FormControl, Avatar, Button, DatePicker, toast } from 'frappe-ui'
import { saveProject } from '../data/api'
import { Plus, Trash2, Search, X } from 'lucide-vue-next'

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
  label: `${e.name} - ${e.employee_name || e.name}`,
  value: e.name,
  description: e.employee_name || '',
  image: e.user_image || '',
})))
const projectOptions = computed(() => props.projects.map(p => ({ label: p.project_name || p.name, value: p.name })))

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

function openMember(idx) {
  memberOpenIdx.value = idx
  memberQ.value = ''
  nextTick(() => memberInputs.value[idx]?.focus())
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

onMounted(() => document.addEventListener('click', handleClickOutside, true))
onBeforeUnmount(() => document.removeEventListener('click', handleClickOutside, true))

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
