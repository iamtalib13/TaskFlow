<template>
  <div
    v-if="modelValue"
    class="fixed inset-0 z-50 overflow-y-auto bg-black/45 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 transition-opacity duration-200"
    @click.self="close"
  >
    <div
      class="bg-white rounded-2xl shadow-2xl border border-gray-100 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden transform transition-all duration-200 scale-100"
      role="dialog"
      aria-modal="true"
    >
      <!-- Modal Header -->
      <div class="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-white shrink-0">
        <div class="flex items-center gap-2.5">
          <span class="w-8 h-8 rounded-lg bg-black text-white flex items-center justify-center text-sm font-bold shadow-xs">
            +
          </span>
          <div>
            <h3 class="text-sm font-bold text-gray-900">Create New Task</h3>
            <p class="text-xs text-gray-500">Add a new task to your Taskflow workspace</p>
          </div>
        </div>

        <button
          type="button"
          class="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition cursor-pointer"
          @click="close"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- Error Banner -->
      <div
        v-if="errorMessage"
        class="px-6 py-2.5 bg-rose-50 border-b border-rose-200 text-rose-700 text-xs flex items-center justify-between shrink-0"
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
          class="text-rose-500 hover:text-rose-700 font-bold ml-2 cursor-pointer text-sm"
          @click="errorMessage = ''"
        >
          &times;
        </button>
      </div>

      <!-- Modal Body -->
      <form class="p-6 space-y-4 text-xs overflow-y-auto flex-1" @submit.prevent="submit">
        <div>
          <label class="block font-semibold text-gray-700 mb-1">
            Task Title <span class="text-rose-500">*</span>
          </label>
          <input
            v-model="form.title"
            required
            type="text"
            placeholder="e.g. Implement Responsive Table View"
            class="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-[#417c7d]/20 focus:border-[#417c7d] transition"
          />
        </div>

        <!-- Row 1: Project & Team & Status & Priority -->
        <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <label class="block font-medium text-gray-600 mb-1">Project</label>
            <select
              v-model="form.project"
              class="w-full bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs text-gray-800 focus:ring-2 focus:ring-[#417c7d]/20 focus:border-[#417c7d] outline-none transition"
              @change="onProjectChange"
            >
              <option value="">Select Project</option>
              <option v-for="p in projects" :key="p.name" :value="p.name">
                {{ p.display_name || p.name }}
              </option>
            </select>
          </div>

          <div>
            <div class="flex items-center justify-between mb-1">
              <label class="block font-medium text-gray-600">Team</label>
              <span v-if="effectiveTeam" class="text-[10px] font-semibold text-[#417c7d] bg-[#417c7d]/10 px-1.5 py-0.5 rounded">
                {{ effectiveTeam }}
              </span>
            </div>
            <select
              v-model="form.team"
              class="w-full bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs text-gray-800 focus:ring-2 focus:ring-[#417c7d]/20 focus:border-[#417c7d] outline-none transition"
              @change="onTeamChange"
            >
              <option value="">Select Team</option>
              <option v-for="t in teams" :key="t.name || t" :value="t.name || t">
                {{ t.team_name || t.name || t }}
              </option>
            </select>
          </div>

          <div>
            <label class="block font-medium text-gray-600 mb-1">Status</label>
            <select
              v-model="form.status"
              class="w-full bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs text-gray-800 focus:ring-2 focus:ring-[#417c7d]/20 focus:border-[#417c7d] outline-none transition"
            >
              <option v-for="s in statuses" :key="s" :value="s">{{ s }}</option>
            </select>
          </div>

          <div>
            <label class="block font-medium text-gray-600 mb-1">Priority</label>
            <select
              v-model="form.priority"
              class="w-full bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs text-gray-800 focus:ring-2 focus:ring-[#417c7d]/20 focus:border-[#417c7d] outline-none transition"
            >
              <option v-for="p in priorities" :key="p" :value="p">{{ p }}</option>
            </select>
          </div>
        </div>

        <!-- Row 2: Assigned To (MultiSelect) & Due Date -->
        <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          <div class="md:col-span-2">
            <div class="flex items-center justify-between mb-1">
              <label class="block font-medium text-gray-600">Assigned To (Team Members)</label>
              <span v-if="assigneeOptions.length > 0" class="text-[10px] text-gray-400">
                {{ assigneeOptions.length }} team members
              </span>
            </div>
            <MultiSelect
              v-model="form.assignees"
              :options="assigneeOptions"
              :placeholder="effectiveTeam ? `Select ${effectiveTeam} member...` : 'Select Team Members...'"
              size="sm"
              class="w-full"
            />
            <p v-if="effectiveTeam && assigneeOptions.length === 0" class="text-[10px] text-amber-600 mt-1">
              No team members found in {{ effectiveTeam }}.
            </p>
          </div>

          <div>
            <label class="block font-medium text-gray-600 mb-1">Due Date</label>
            <div class="relative flex items-center">
              <input
                v-model="displayDueDate"
                type="text"
                placeholder="DD-MM-YYYY"
                maxlength="10"
                class="w-full bg-white border border-gray-200 rounded-lg pl-2.5 pr-8 py-1.5 text-xs text-gray-800 font-mono focus:ring-2 focus:ring-[#417c7d]/20 focus:border-[#417c7d] outline-none transition"
              />
              <label class="absolute right-2 text-gray-400 hover:text-gray-700 cursor-pointer" title="Pick date">
                <Calendar class="size-4" />
                <input
                  type="date"
                  :value="form.due_date"
                  class="sr-only"
                  @change="onNativeDateChange"
                />
              </label>
            </div>
          </div>
        </div>

        <div>
          <label class="block font-medium text-gray-600 mb-1">Description</label>
          <TaskRichEditor
            v-model="form.description"
            :people="people"
            min-height="min-h-48"
            placeholder="Write details, acceptance criteria, or type / for blocks..."
          />
        </div>

        <!-- Actions -->
        <div class="pt-3 border-t border-gray-100 flex items-center justify-end gap-2">
          <button
            type="button"
            :disabled="creating"
            class="px-4 py-2 text-xs font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition disabled:opacity-50 cursor-pointer"
            @click="close"
          >
            Cancel
          </button>
          <button
            type="submit"
            :disabled="!form.title.trim() || creating"
            class="px-5 py-2 bg-[#417c7d] hover:bg-[#366869] active:bg-[#2b5354] text-white text-xs font-semibold rounded-lg shadow-xs disabled:opacity-40 transition flex items-center gap-2 cursor-pointer"
          >
            <span v-if="creating" class="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
            <span>{{ creating ? 'Creating...' : 'Create Task' }}</span>
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script>
import { MultiSelect, toast } from 'frappe-ui'
import { saveTask, getErrorMessage, fetchTeamMembers } from '../data/api'
import TaskRichEditor from './TaskRichEditor.vue'
import { Calendar } from 'lucide-vue-next'

export default {
  name: 'TaskCreateModal',
  components: {
    MultiSelect,
    TaskRichEditor,
    Calendar,
  },
  props: {
    modelValue: {
      type: Boolean,
      default: false,
    },
    projects: {
      type: Array,
      default: () => [],
    },
    teams: {
      type: Array,
      default: () => [],
    },
    people: {
      type: Array,
      default: () => [],
    },
    teamMembers: {
      type: Array,
      default: () => [],
    },
    statuses: {
      type: Array,
      default: () => ['Open', 'In Progress', 'Review', 'On Hold', 'Completed', 'Cancelled', 'Overdue'],
    },
    priorities: {
      type: Array,
      default: () => ['Critical', 'High', 'Medium', 'Low'],
    },
    onCreate: {
      type: Function,
      default: null,
    },
  },
  emits: ['update:modelValue', 'create', 'close'],
  data() {
    return {
      creating: false,
      errorMessage: '',
      localTeamMembers: [],
      form: {
        title: '',
        project: '',
        team: '',
        assignees: [],
        assigned_to: '',
        status: 'Open',
        priority: 'Medium',
        due_date: '',
        description: '',
      },
    }
  },
  watch: {
    modelValue(val) {
      if (val) {
        this.errorMessage = ''
        const defaultProject = this.projects[0]?.name || ''
        const defaultTeam = this.projects[0]?.team || this.teams[0]?.name || ''
        this.form = {
          title: '',
          project: defaultProject,
          team: defaultTeam,
          assignees: [],
          assigned_to: '',
          status: 'Open',
          priority: 'Medium',
          due_date: '',
          description: '',
        }
        if (defaultTeam) {
          this.loadTeamMembersForTeam(defaultTeam)
        }
      }
    },
  },
  computed: {
    effectiveTeam() {
      if (this.form.team) return this.form.team
      const selected = (this.projects || []).find((p) => p.name === this.form.project)
      if (selected && selected.team) return selected.team
      return ''
    },
    allAvailableTeamMembers() {
      const combined = [...(this.teamMembers || []), ...(this.localTeamMembers || [])]
      const seen = new Set()
      const list = []
      for (const m of combined) {
        const key = `${m.team || ''}_${m.user || ''}_${m.employee || ''}`
        if (!seen.has(key)) {
          seen.add(key)
          list.push(m)
        }
      }
      return list
    },
    assigneeOptions() {
      const team = this.effectiveTeam
      let members = this.allAvailableTeamMembers
      if (team) {
        members = members.filter(
          (m) => m.team === team && (m.is_active === undefined || m.is_active === 1 || m.is_active === true)
        )
      }

      if (members.length > 0) {
        return members.map((m) => ({
          value: m.user || m.employee,
          label: m.employee_name || m.user || m.employee,
        }))
      }

      if (!team && this.allAvailableTeamMembers.length > 0) {
        return this.allAvailableTeamMembers.map((m) => ({
          value: m.user || m.employee,
          label: m.employee_name ? `${m.employee_name} (${m.team})` : (m.user || m.employee),
        }))
      }

      return []
    },
    displayDueDate: {
      get() {
        if (!this.form.due_date) return ''
        const parts = String(this.form.due_date).split('-')
        if (parts.length === 3) {
          const [y, m, d] = parts
          if (y.length === 4) return `${d.padStart(2, '0')}-${m.padStart(2, '0')}-${y}`
        }
        return this.form.due_date
      },
      set(val) {
        if (!val) {
          this.form.due_date = ''
          return
        }
        const parts = String(val).trim().split(/[-/]/)
        if (parts.length === 3) {
          const [d, m, y] = parts
          if (y && y.length === 4) {
            this.form.due_date = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
            return
          }
        }
        this.form.due_date = val
      },
    },
  },
  methods: {
    onProjectChange() {
      const selected = this.projects.find((p) => p.name === this.form.project)
      if (selected && selected.team) {
        this.form.team = selected.team
      }
      this.loadTeamMembersForTeam(this.effectiveTeam)
    },
    onTeamChange() {
      this.loadTeamMembersForTeam(this.effectiveTeam)
    },
    async loadTeamMembersForTeam(team) {
      if (!team) return
      const hasMembers = this.allAvailableTeamMembers.some((m) => m.team === team)
      if (!hasMembers) {
        try {
          const members = await fetchTeamMembers(team)
          if (Array.isArray(members) && members.length > 0) {
            this.localTeamMembers.push(...members)
          }
        } catch (err) {
          console.warn('Failed to load team members for team:', team, err)
        }
      }
    },
    onNativeDateChange(e) {
      this.form.due_date = e.target.value
    },
    close() {
      this.$emit('update:modelValue', false)
      this.$emit('close')
    },
    async submit() {
      if (!this.form.title.trim()) {
        this.errorMessage = 'Task Title is required'
        toast.error('Task Title is required')
        return
      }
      this.creating = true
      this.errorMessage = ''
      const assigneeIds = (this.form.assignees || []).map((a) => (typeof a === 'object' ? (a.value || a.user_id || a.user || a.email) : a)).filter(Boolean)
      const payload = {
        ...this.form,
        team: this.effectiveTeam || this.form.team || undefined,
        assignees: assigneeIds,
        assigned_to: assigneeIds[0] || '',
      }
      try {
        if (this.onCreate) {
          await this.onCreate(payload)
        } else {
          const res = await saveTask(payload)
          this.$emit('create', res || payload)
          toast.success('Task created successfully')
        }
        this.creating = false
        this.close()
      } catch (err) {
        this.creating = false
        const msg = getErrorMessage(err, 'Failed to create task')
        this.errorMessage = msg
        toast.error(msg)
      }
    },
  },
}
</script>
