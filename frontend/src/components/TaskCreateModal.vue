<template>
  <div
    v-if="modelValue"
    class="fixed inset-0 z-50 overflow-y-auto bg-black/55 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 transition-opacity duration-200"
    @click.self="close"
  >
    <div
      class="bg-surface-base rounded-2xl shadow-2xl border border-outline-gray-1 dark:border-gray-800 w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden transform transition-all duration-200 scale-100"
      role="dialog"
      aria-modal="true"
    >
      <form class="flex flex-col flex-1 overflow-hidden" @submit.prevent="submit">
        <!-- Modal Header with Action Buttons -->
        <div class="px-6 py-3.5 border-b border-outline-gray-1 dark:border-gray-800 flex items-center justify-between bg-surface-base shrink-0">
          <div class="flex items-center gap-2.5">
            <span class="w-8 h-8 rounded-lg bg-black dark:bg-white text-white dark:text-gray-950 flex items-center justify-center text-sm font-bold shadow-xs">
              +
            </span>
            <div>
              <h3 class="text-sm font-bold text-ink-gray-9 dark:text-white">Create New Task</h3>
              <p class="text-xs text-ink-gray-5 dark:text-gray-400">Add a new task to your Taskflow workspace</p>
            </div>
          </div>

          <!-- Header Buttons -->
          <div class="flex items-center gap-2">
            <Button
              type="button"
              :disabled="creating"
              size="sm"
              @click="close"
            >
              Cancel
            </Button>
            <Button
              variant="solid"
              type="submit"
              size="sm"
              :loading="creating"
              :disabled="!form.title.trim() || creating"
            >
              Create Task
            </Button>
            <button
              type="button"
              class="p-1.5 text-gray-400 hover:text-ink-gray-7 dark:hover:text-white hover:bg-surface-gray-3 dark:hover:bg-gray-800 rounded-lg transition cursor-pointer ml-1"
              @click="close"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
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

        <!-- Modal Body (Two-Column Layout) -->
        <div class="p-6 flex-1 overflow-hidden text-xs">
          <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <!-- Left Column (col-span-7): Task Title & Description (Scrolls independently) -->
            <div class="lg:col-span-7 flex flex-col space-y-4 max-h-[72vh] overflow-y-auto pr-2">
              <div>
                <label class="block font-semibold text-ink-gray-7 dark:text-gray-200 mb-1">
                  Task Title <span class="text-rose-500">*</span>
                </label>
                <input
                  v-model="form.title"
                  required
                  type="text"
                  placeholder="e.g. Implement Responsive Table View"
                  class="w-full text-sm bg-surface-base border border-outline-gray-2 dark:border-gray-700 text-ink-gray-9 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-[#417c7d]/20 focus:border-[#417c7d] transition font-medium"
                />
              </div>

              <div class="flex-1 flex flex-col">
                <label class="block font-medium text-ink-gray-6 dark:text-gray-300 mb-1">Description</label>
                <FrappeRichEditor
                  v-model="form.description"
                  :people="people"
                  min-height="min-h-[300px]"
                  placeholder="Write details, acceptance criteria, or type / for blocks..."
                  class="flex-1"
                />
              </div>
            </div>

            <!-- Right Column (col-span-5): Meta Fields (Independent Panel) -->
            <div class="lg:col-span-5 flex flex-col space-y-3.5 bg-surface-gray-1/50 dark:bg-gray-900/40 p-4 rounded-xl border border-outline-gray-1 dark:border-gray-800 max-h-[72vh] overflow-y-auto">
              <!-- Project (Searchable Combobox with 5 items limit and Team subtitle) -->
              <div>
                <label class="block font-medium text-ink-gray-6 dark:text-gray-300 mb-1">Project</label>
                <Combobox
                  v-model="form.project"
                  v-model:query="projectSearchQuery"
                  :options="projectOptions"
                  :filterable="false"
                  placeholder="Search and select project..."
                  size="sm"
                  class="w-full"
                  @change="onProjectChange"
                >
                  <template #item-label="{ item }">
                    <div class="min-w-0 flex-1 py-0.5">
                      <div class="truncate font-semibold text-xs text-ink-gray-9 dark:text-gray-100">
                        {{ item.label }}
                      </div>
                      <div v-if="item.team" class="truncate text-[11px] text-ink-gray-5 dark:text-gray-400">
                        Team: {{ item.team }}
                      </div>
                    </div>
                  </template>
                </Combobox>
              </div>

              <!-- Task Type & Status -->
              <div class="grid grid-cols-2 gap-2.5">
                <FormControl
                  v-model="form.task_type"
                  type="select"
                  label="Task Type"
                  placeholder="Select task type"
                  :options="taskTypeOptions"
                >
                  <template #item-prefix="{ item }">
                    <component
                      :is="getTaskTypeIcon(item.value)"
                      class="size-3.5 shrink-0"
                      :class="getTaskTypeIconClass(item.value)"
                    />
                  </template>
                </FormControl>

                <FormControl
                  v-model="form.status"
                  type="select"
                  label="Status"
                  placeholder="Select status"
                  :options="statusOptions"
                  @change="onStatusChange"
                >
                  <template #item-prefix="{ item }">
                    <span
                      class="size-2 shrink-0 rounded-full"
                      :class="getStatusDotClass(item.value)"
                    />
                  </template>
                </FormControl>
              </div>

              <!-- Priority -->
              <FormControl
                v-model="form.priority"
                type="select"
                label="Priority"
                placeholder="Select priority"
                :options="priorityOptions"
              >
                <template #item-prefix="{ item }">
                  <span
                    class="size-2 shrink-0 rounded-full"
                    :class="getPriorityDotClass(item.value)"
                  />
                </template>
              </FormControl>

              <!-- Assigned To -->
              <div>
                <div class="flex items-center justify-between mb-1">
                  <label class="block font-medium text-ink-gray-6 dark:text-gray-300">Assigned To (Team Members)</label>
                  <span v-if="assigneeOptions.length > 0" class="text-[10px] text-gray-400 dark:text-gray-500">
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
                <p v-if="effectiveTeam && assigneeOptions.length === 0" class="text-[10px] text-amber-600 dark:text-amber-400 mt-1">
                  No team members found in {{ effectiveTeam }}.
                </p>
              </div>

              <!-- Start Date & Due Date -->
              <div class="grid grid-cols-2 gap-2.5">
                <div>
                  <label class="block font-medium text-ink-gray-6 dark:text-gray-300 mb-1">Start Date</label>
                  <DatePicker
                    v-model="form.start_date"
                    format="DD-MM-YYYY"
                    placeholder="DD-MM-YYYY"
                    size="sm"
                    variant="outline"
                    class="w-full"
                  >
                    <template #prefix>
                      <Calendar class="size-3.5 text-gray-400 dark:text-gray-500" />
                    </template>
                    <template #actions="{ setDate, close }">
                      <button
                        type="button"
                        :class="rowCls"
                        @click="applyQuickDate(setDate, 0, 'day', close)"
                      >
                        Today
                      </button>
                      <button
                        type="button"
                        :class="rowCls"
                        @click="applyQuickDate(setDate, 1, 'day', close)"
                      >
                        Tomorrow
                      </button>
                      <button
                        type="button"
                        :class="rowCls"
                        @click="applyQuickDate(setDate, 7, 'day', close)"
                      >
                        One Week
                      </button>
                      <button
                        type="button"
                        :class="rowCls"
                        @click="applyQuickDate(setDate, 15, 'day', close)"
                      >
                        15 Days
                      </button>
                      <button
                        type="button"
                        :class="rowCls"
                        @click="applyQuickDate(setDate, 1, 'month', close)"
                      >
                        1 Month
                      </button>
                    </template>
                  </DatePicker>
                </div>

                <div>
                  <label class="block font-medium text-ink-gray-6 dark:text-gray-300 mb-1">Due Date</label>
                  <DatePicker
                    v-model="form.due_date"
                    format="DD-MM-YYYY"
                    placeholder="DD-MM-YYYY"
                    size="sm"
                    variant="outline"
                    class="w-full"
                  >
                    <template #prefix>
                      <Calendar class="size-3.5 text-gray-400 dark:text-gray-500" />
                    </template>
                    <template #actions="{ setDate, close }">
                      <button
                        type="button"
                        :class="rowCls"
                        @click="applyQuickDate(setDate, 0, 'day', close)"
                      >
                        Today
                      </button>
                      <button
                        type="button"
                        :class="rowCls"
                        @click="applyQuickDate(setDate, 1, 'day', close)"
                      >
                        Tomorrow
                      </button>
                      <button
                        type="button"
                        :class="rowCls"
                        @click="applyQuickDate(setDate, 7, 'day', close)"
                      >
                        One Week
                      </button>
                      <button
                        type="button"
                        :class="rowCls"
                        @click="applyQuickDate(setDate, 15, 'day', close)"
                      >
                        15 Days
                      </button>
                      <button
                        type="button"
                        :class="rowCls"
                        @click="applyQuickDate(setDate, 1, 'month', close)"
                      >
                        1 Month
                      </button>
                    </template>
                  </DatePicker>
                </div>
              </div>

              <!-- Completion Date (Shown when status is Completed) -->
              <div v-if="form.status === 'Completed'">
                <label class="block font-medium text-ink-gray-6 dark:text-gray-300 mb-1">Completion Date</label>
                <DatePicker
                  v-model="form.completed_on"
                  format="DD-MM-YYYY"
                  placeholder="DD-MM-YYYY"
                  size="sm"
                  variant="outline"
                  class="w-full"
                >
                  <template #prefix>
                    <Calendar class="size-3.5 text-gray-400 dark:text-gray-500" />
                  </template>
                  <template #actions="{ setDate, close }">
                    <button
                      type="button"
                      :class="rowCls"
                      @click="applyQuickDate(setDate, 0, 'day', close)"
                    >
                      Today
                    </button>
                    <button
                      type="button"
                      :class="rowCls"
                      @click="applyQuickDate(setDate, -1, 'day', close)"
                    >
                      Yesterday
                    </button>
                  </template>
                </DatePicker>
              </div>

              <!-- Pending From & Guided By -->
              <div class="grid grid-cols-2 gap-2.5">
                <div>
                  <label class="block font-medium text-ink-gray-6 dark:text-gray-300 mb-1">Pending From</label>
                  <select
                    v-model="form.pending_from"
                    class="w-full bg-surface-base border border-outline-gray-2 dark:border-gray-700 rounded-lg px-2.5 py-1.5 text-xs text-ink-gray-8 dark:text-gray-100 focus:ring-2 focus:ring-[#417c7d]/20 focus:border-[#417c7d] outline-none transition"
                  >
                    <option value="" class="bg-surface-base text-ink-gray-8 dark:text-gray-100">Pending from...</option>
                    <option v-for="v in pendingFromOptions" :key="v" :value="v" class="bg-surface-base text-ink-gray-8 dark:text-gray-100">{{ v }}</option>
                  </select>
                </div>

                <div>
                  <label class="block font-medium text-ink-gray-6 dark:text-gray-300 mb-1">Guided By</label>
                  <Combobox
                    v-model="form.guided_by"
                    :options="guidedByOptions"
                    placeholder="Search guide..."
                    size="sm"
                    class="w-full"
                  />
                </div>
              </div>

              <!-- Toll ID, Ticket Date & Ticket Raised By -->
              <div class="grid grid-cols-3 gap-2">
                <div>
                  <label class="block font-medium text-ink-gray-6 dark:text-gray-300 mb-1">Toll ID</label>
                  <input
                    v-model="form.toll_id"
                    type="text"
                    placeholder="e.g. TL-1024"
                    class="w-full text-xs bg-surface-base border border-outline-gray-2 dark:border-gray-700 text-ink-gray-8 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 rounded-lg px-2.5 py-1.5 outline-none focus:ring-2 focus:ring-[#417c7d]/20 focus:border-[#417c7d] transition"
                  />
                </div>

                <div>
                  <label class="block font-medium text-ink-gray-6 dark:text-gray-300 mb-1">Ticket Date</label>
                  <DatePicker
                    v-model="form.ticket_date"
                    format="DD-MM-YYYY"
                    placeholder="DD-MM-YYYY"
                    size="sm"
                    variant="outline"
                    class="w-full"
                  >
                    <template #prefix>
                      <Calendar class="size-3.5 text-gray-400 dark:text-gray-500" />
                    </template>
                  </DatePicker>
                </div>

                <div>
                  <label class="block font-medium text-ink-gray-6 dark:text-gray-300 mb-1">Ticket Raised By</label>
                  <input
                    v-model="form.ticket_raised_by"
                    type="text"
                    placeholder="Name/Email"
                    class="w-full text-xs bg-surface-base border border-outline-gray-2 dark:border-gray-700 text-ink-gray-8 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 rounded-lg px-2.5 py-1.5 outline-none focus:ring-2 focus:ring-[#417c7d]/20 focus:border-[#417c7d] transition"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  </div>
</template>

<script>
import { MultiSelect, DatePicker, Combobox, Button, FormControl, toast } from 'frappe-ui'
import dayjs from 'dayjs'
import { saveTask, getErrorMessage, fetchTeamMembers, fetchTaskflowSettings } from '../data/api'
import FrappeRichEditor from './FrappeRichEditor.vue'
import { Calendar, Bug, Sparkles, CheckSquare, ChevronDown } from 'lucide-vue-next'

export default {
  name: 'TaskCreateModal',
  components: {
    Button,
    DatePicker,
    Combobox,
    MultiSelect,
    FormControl,
    FrappeRichEditor,
    Calendar,
    Bug,
    Sparkles,
    CheckSquare,
    ChevronDown,
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
      taskTypes: ['Task', 'Bug', 'Customization Request'],
      pendingFromOptions: ['User', 'Team', 'Client', 'Management', 'External Partner', 'Vendor'],
      projectSearchQuery: '',
      form: {
        title: '',
        project: '',
        team: '',
        task_type: 'Task',
        assignees: [],
        assigned_to: '',
        status: 'Open',
        priority: 'Medium',
        start_date: '',
        due_date: '',
        completed_on: '',
        pending_from: '',
        guided_by: '',
        toll_id: '',
        ticket_date: '',
        ticket_raised_by: '',
        description: '',
      },
      rowCls: 'w-full rounded px-2.5 py-1.5 text-left text-xs font-medium text-ink-gray-7 dark:text-gray-300 hover:bg-surface-gray-2 dark:hover:bg-gray-800 hover:text-ink-gray-9 dark:hover:text-white transition cursor-pointer whitespace-nowrap',
    }
  },
  watch: {
    modelValue(val) {
      if (val) {
        this.loadTaskflowSettings()
        this.errorMessage = ''
        const defaultTeam = this.teams[0]?.name || ''
        this.form = {
          title: '',
          project: '',
          team: defaultTeam,
          task_type: 'Task',
          assignees: [],
          assigned_to: '',
          status: 'Open',
          priority: 'Medium',
          start_date: '',
          due_date: '',
          completed_on: '',
          pending_from: '',
          guided_by: '',
          toll_id: '',
          ticket_date: '',
          ticket_raised_by: '',
          description: '',
        }
        if (defaultTeam) {
          this.loadTeamMembersForTeam(defaultTeam)
        }
      }
    },
    'form.project'() {
      this.onProjectChange()
    },
    'form.status'(newStatus) {
      if (newStatus === 'Completed') {
        this.form.completed_on = dayjs().format('YYYY-MM-DD')
      }
    },
  },
  mounted() {
    this.loadTaskflowSettings()
  },
  computed: {
    // frappe-ui Select needs option objects; the plain string prop lists above
    // stay the single source of truth.
    statusOptions() {
      return (this.statuses || []).map((s) => ({ label: s, value: s }))
    },
    priorityOptions() {
      return (this.priorities || []).map((p) => ({ label: p, value: p }))
    },
    taskTypeOptions() {
      return (this.taskTypes || []).map((t) => ({ label: t, value: t }))
    },

    projectOptions() {
      const q = (this.projectSearchQuery || '').trim().toLowerCase()
      let list = this.projects || []
      if (q) {
        list = list.filter((p) => {
          const name = (p.name || '').toLowerCase()
          const title = (p.title || p.project_name || p.display_name || '').toLowerCase()
          const team = (p.team || '').toLowerCase()
          return name.includes(q) || title.includes(q) || team.includes(q)
        })
      }
      return list.slice(0, 5).map((p) => ({
        label: p.display_name || p.title || p.project_name || p.name,
        value: p.name,
        team: p.team || '',
      }))
    },
    guidedByOptions() {
      const unique = new Map()
      for (const m of this.allAvailableTeamMembers) {
        const id = m.user || m.employee
        if (id) {
          const label = m.employee_name || m.user || m.employee
          if (!unique.has(id)) {
            unique.set(id, { label: label, value: id })
          }
        }
      }
      return Array.from(unique.values())
    },
    effectiveTeam() {
      if (this.form.team) return this.form.team
      const projVal = typeof this.form.project === 'object' ? (this.form.project.value || '') : (this.form.project || '')
      const selected = (this.projects || []).find((p) => p.name === projVal)
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
  },
  methods: {
    onStatusChange(val) {
      const statusVal = typeof val === 'object' ? (val?.value || '') : (val || this.form.status)
      if (statusVal === 'Completed') {
        this.form.completed_on = dayjs().format('YYYY-MM-DD')
      }
    },
    async loadTaskflowSettings() {
      try {
        const settings = await fetchTaskflowSettings()
        if (settings && settings.pending_from) {
          const opts = settings.pending_from.split('\n').map(s => s.trim()).filter(Boolean)
          if (opts.length > 0) {
            this.pendingFromOptions = opts
          }
        }
      } catch (e) {
        console.error('Failed to load Taskflow Settings in TaskCreateModal', e)
      }
    },
    onProjectChange() {
      const projVal = typeof this.form.project === 'object' ? (this.form.project.value || '') : (this.form.project || '')
      const selected = (this.projects || []).find((p) => p.name === projVal)
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
    applyQuickDate(setDate, amount, unit, close) {
      const d = amount === 0 ? dayjs() : dayjs().add(amount, unit)
      setDate(d)
      if (typeof close === 'function') {
        close()
      }
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
      const projVal = typeof this.form.project === 'object' ? (this.form.project.value || '') : (this.form.project || '')
      const assigneeIds = (this.form.assignees || []).map((a) => (typeof a === 'object' ? (a.value || a.user_id || a.user || a.email) : a)).filter(Boolean)
      const guidedByVal = typeof this.form.guided_by === 'object' ? (this.form.guided_by.value || '') : (this.form.guided_by || '')
      const payload = {
        ...this.form,
        project: projVal,
        guided_by: guidedByVal,
        team: this.effectiveTeam || this.form.team || undefined,
        assignees: assigneeIds,
        assigned_to: assigneeIds[0] || '',
        completed_on: this.form.status === 'Completed' ? (this.form.completed_on || dayjs().format('YYYY-MM-DD')) : '',
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
    getTaskTypeIcon(type) {
      if (type === 'Bug') return 'Bug'
      if (type === 'Customization Request') return 'Sparkles'
      return 'CheckSquare'
    },
    getTaskTypeIconClass(type) {
      if (type === 'Bug') return 'text-rose-600'
      if (type === 'Customization Request') return 'text-purple-600'
      return 'text-[#417c7d]'
    },
    getStatusDotClass(status) {
      switch (status) {
        case 'Completed':
          return 'bg-emerald-500'
        case 'Overdue':
          return 'bg-rose-500'
        case 'On Hold':
          return 'bg-blue-500'
        case 'In Progress':
          return 'bg-indigo-500'
        case 'Review':
          return 'bg-purple-500'
        default:
          return 'bg-slate-400'
      }
    },
    getPriorityDotClass(priority) {
      switch (priority) {
        case 'Critical':
          return 'bg-rose-500'
        case 'High':
          return 'bg-orange-500'
        case 'Medium':
          return 'bg-amber-400'
        case 'Low':
          return 'bg-slate-400'
        default:
          return 'bg-slate-400'
      }
    },
  },
}
</script>
