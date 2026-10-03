<template>
  <div
    v-if="modelValue"
    class="fixed inset-0 z-50 overflow-y-auto bg-black/55 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 transition-opacity duration-200"
  >
    <div
      class="bg-surface-base rounded-2xl shadow-2xl border border-outline-gray-1 dark:border-gray-800 w-full max-w-6xl xl:max-w-7xl max-h-[92vh] flex flex-col overflow-hidden transform transition-all duration-200 scale-100"
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
              :disabled="!form.title.trim() || !selectedTeamValue || !selectedProjectValue || !selectedGuidedByValue || creating"
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
          <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            <!-- Left Column (col-span-6): Task Title & Description (Matches right-side height) -->
            <div class="lg:col-span-6 flex flex-col space-y-4 max-h-[72vh] overflow-y-auto pr-2 h-full">
              <div class="shrink-0">
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

              <div class="flex-1 flex flex-col min-h-0">
                <label class="block font-medium text-ink-gray-6 dark:text-gray-300 mb-1 shrink-0">Description</label>
                <FrappeRichEditor
                  v-model="form.description"
                  :people="people"
                  min-height="min-h-[160px]"
                  placeholder="Write details, acceptance criteria, or type / for blocks..."
                  class="flex-1 min-h-0 h-full"
                />
              </div>
            </div>

            <!-- Right Column (col-span-6): Meta Fields (Independent Panel - 2 Column Form Layout) -->
            <div class="lg:col-span-6 flex flex-col bg-surface-gray-1/50 dark:bg-gray-900/40 p-4 rounded-xl border border-outline-gray-1 dark:border-gray-800 max-h-[72vh] overflow-y-auto">
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <!-- 1. Team Selection -->
                <div>
                  <div class="flex items-center justify-between mb-1">
                    <label class="block font-medium text-ink-gray-6 dark:text-gray-300">
                      Team <span class="text-rose-500">*</span>
                    </label>
                    <button
                      v-if="selectedTeamValue"
                      type="button"
                      class="text-[11px] text-ink-gray-5 hover:text-ink-gray-8 dark:hover:text-gray-200 transition-colors cursor-pointer"
                      @click="clearTeam"
                    >
                      Clear
                    </button>
                  </div>
                  <Combobox
                    v-model="form.team"
                    v-model:query="teamSearchQuery"
                    :options="teamOptions"
                    :filterable="false"
                    placeholder="Search and select team..."
                    size="sm"
                    class="w-full"
                    @change="onTeamChange"
                  >
                    <template #item-label="{ item }">
                      <div class="truncate font-semibold text-xs text-ink-gray-9 dark:text-gray-100 py-0.5">
                        {{ item.label }}
                      </div>
                    </template>
                  </Combobox>
                </div>

                <!-- 2. Project (Searchable Combobox filtered by Team) -->
                <div>
                  <div class="flex items-center justify-between mb-1">
                    <label class="block font-medium text-ink-gray-6 dark:text-gray-300">
                      Project <span class="text-rose-500">*</span>
                    </label>
                    <button
                      v-if="selectedProjectValue"
                      type="button"
                      class="text-[11px] text-ink-gray-5 hover:text-ink-gray-8 dark:hover:text-gray-200 transition-colors cursor-pointer"
                      @click="clearProject"
                    >
                      Clear
                    </button>
                  </div>
                  <Combobox
                    v-model="form.project"
                    v-model:query="projectSearchQuery"
                    :options="projectOptions"
                    :filterable="false"
                    :placeholder="selectedTeamValue ? `Select project from ${selectedTeamValue}...` : 'Search and select project...'"
                    size="sm"
                    class="w-full"
                    @change="onProjectChange"
                  >
                    <template #item-label="{ item }">
                      <div class="min-w-0 flex-1 py-0.5">
                        <div class="truncate font-semibold text-xs text-ink-gray-9 dark:text-gray-100">
                          {{ item.label }}
                        </div>
                        <div v-if="item.team && !selectedTeamValue" class="truncate text-[11px] text-ink-gray-5 dark:text-gray-400">
                          Team: {{ item.team }}
                        </div>
                      </div>
                    </template>
                  </Combobox>
                  <p v-if="selectedTeamValue && projectOptions.length === 0" class="text-[11px] text-amber-600 dark:text-amber-400 mt-1">
                    No projects found for {{ selectedTeamValue }}.
                  </p>
                </div>

                <!-- 3. Task Type -->
                <div>
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
                </div>

                <!-- 4. Status -->
                <div>
                  <FormControl
                    v-model="form.status"
                    type="select"
                    label="Status"
                    placeholder="Select status"
                    :options="statusOptions"
                    @change="onStatusChange"
                  >
                    <template #prefix>
                      <span
                        class="size-2 shrink-0 rounded-full"
                        :class="getStatusDotClass(form.status)"
                      />
                    </template>
                    <template #item-prefix="{ item }">
                      <span
                        class="size-2 shrink-0 rounded-full"
                        :class="getStatusDotClass(item.value)"
                      />
                    </template>
                  </FormControl>
                </div>

                <!-- 5. Priority -->
                <div>
                  <FormControl
                    v-model="form.priority"
                    type="select"
                    label="Priority"
                    placeholder="Select priority"
                    :options="priorityOptions"
                  >
                    <template #prefix>
                      <span
                        class="size-2 shrink-0 rounded-full"
                        :class="getPriorityDotClass(form.priority)"
                      />
                    </template>
                    <template #item-prefix="{ item }">
                      <span
                        class="size-2 shrink-0 rounded-full"
                        :class="getPriorityDotClass(item.value)"
                      />
                    </template>
                  </FormControl>
                </div>

                <!-- 6. Guided By -->
                <div>
                  <label class="block font-medium text-ink-gray-6 dark:text-gray-300 mb-1">
                    Guided By <span class="text-rose-500">*</span>
                  </label>
                  <Combobox
                    v-model="form.guided_by"
                    :options="guidedByOptions"
                    placeholder="Search guide..."
                    size="sm"
                    class="w-full"
                  />
                </div>

                <!-- 7. Assigned To (Full Width across 2 columns) -->
                <div class="sm:col-span-2">
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

                <!-- 8. Start Date -->
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

                <!-- 9. Due Date -->
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

                <!-- 10. Completion Date (Shown when status is Completed) -->
                <div v-if="isStatusCompleted" class="sm:col-span-2">
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

                <!-- 11. Pending From -->
                <div class="relative" ref="pendingFromRef">
                  <div class="flex items-center justify-between mb-1">
                    <label class="block font-medium text-ink-gray-6 dark:text-gray-300">Pending From</label>
                    <button
                      v-if="form.pending_from"
                      type="button"
                      tabindex="-1"
                      class="text-[10px] text-ink-gray-4 dark:text-gray-400 hover:text-ink-gray-7 dark:hover:text-gray-200 transition-colors cursor-pointer"
                      @click="clearPendingFrom"
                    >
                      Clear
                    </button>
                  </div>
                  <div class="relative flex items-center">
                    <input
                      type="text"
                      v-model="form.pending_from"
                      placeholder="Select or type..."
                      class="w-full bg-surface-base border border-outline-gray-2 dark:border-gray-700 rounded-lg px-2.5 py-1.5 pr-7 text-xs text-ink-gray-8 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-[#417c7d]/20 focus:border-[#417c7d] outline-none transition"
                      @focus="onPendingFromFocus"
                      @keydown.esc="showPendingFromDropdown = false"
                      @keydown.enter.prevent="showPendingFromDropdown = false"
                    />
                    <button
                      type="button"
                      tabindex="-1"
                      class="absolute right-1.5 p-1 text-ink-gray-4 dark:text-gray-400 hover:text-ink-gray-7 dark:hover:text-gray-200 rounded transition cursor-pointer"
                      @mousedown.prevent
                      @click="togglePendingFromDropdown"
                      title="Toggle options"
                    >
                      <ChevronDown class="size-3.5 transition-transform duration-200" :class="{ 'rotate-180': showPendingFromDropdown }" />
                    </button>
                  </div>
                  <!-- Dropdown Menu (Opens upwards to prevent clipping) -->
                  <div
                    v-if="showPendingFromDropdown"
                    class="absolute left-0 bottom-full mb-1 w-full max-h-48 overflow-y-auto bg-white dark:bg-gray-800 border border-outline-gray-2 dark:border-gray-700 rounded-lg shadow-xl z-50 py-1 text-xs"
                  >
                    <div
                      v-for="opt in pendingFromOptions"
                      :key="opt"
                      class="px-2.5 py-1.5 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-between text-ink-gray-8 dark:text-gray-100 transition-colors"
                      :class="{ 'font-semibold text-[#417c7d] bg-gray-50 dark:bg-gray-700/50': form.pending_from === opt }"
                      @mousedown.prevent="selectPendingFromOption(opt)"
                    >
                      <span>{{ opt }}</span>
                      <Check v-if="form.pending_from === opt" class="size-3 text-[#417c7d]" />
                    </div>
                  </div>
                </div>

                <!-- 12. Toll ID -->
                <div>
                  <label class="block font-medium text-ink-gray-6 dark:text-gray-300 mb-1">Toll ID</label>
                  <input
                    v-model="form.toll_id"
                    type="text"
                    placeholder="e.g. TL-1024"
                    class="w-full text-xs bg-surface-base border border-outline-gray-2 dark:border-gray-700 text-ink-gray-8 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 rounded-lg px-2.5 py-1.5 outline-none focus:ring-2 focus:ring-[#417c7d]/20 focus:border-[#417c7d] transition"
                  />
                </div>

                <!-- 13. Ticket Date -->
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

                <!-- 14. Ticket Raised By -->
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
import { Calendar, Bug, Sparkles, CheckSquare, ChevronDown, Check } from 'lucide-vue-next'

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
    Check,
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
    defaultTeam: {
      type: String,
      default: '',
    },
    defaultProject: {
      type: String,
      default: '',
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
      default: () => ['Open', 'In Progress', 'Review', 'On Hold', 'Completed', 'Overdue'],
    },
    priorities: {
      type: Array,
      default: () => ['Critical', 'High', 'Medium', 'Low'],
    },
    onCreate: {
      type: Function,
      default: null,
    },
    currentUser: {
      type: String,
      default: '',
    },
    currentUserName: {
      type: String,
      default: '',
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
      showPendingFromDropdown: false,
      teamSearchQuery: '',
      projectSearchQuery: '',
      form: {
        title: '',
        team: '',
        project: '',
        task_type: 'Task',
        assignees: [],
        assigned_to: '',
        status: 'Open',
        priority: 'Medium',
        start_date: dayjs().format('YYYY-MM-DD'),
        due_date: dayjs().format('YYYY-MM-DD'),
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
        this.teamSearchQuery = ''
        this.projectSearchQuery = ''
        const defaultProject = this.getDefaultProject()
        const defaultTeam = this.getDefaultTeam(defaultProject)
        const defaultAssignee = this.getDefaultAssignee()
        const defaultGuidedBy = defaultTeam ? this.getTeamLeadUser(defaultTeam) : ''
        this.form = {
          title: '',
          team: defaultTeam || '',
          project: defaultProject || '',
          task_type: 'Task',
          assignees: defaultAssignee ? [defaultAssignee] : [],
          assigned_to: defaultAssignee || '',
          status: 'Open',
          priority: 'Medium',
          start_date: dayjs().format('YYYY-MM-DD'),
          due_date: dayjs().format('YYYY-MM-DD'),
          completed_on: '',
          pending_from: '',
          guided_by: defaultGuidedBy || '',
          toll_id: '',
          ticket_date: '',
          ticket_raised_by: '',
          description: '',
        }
        if (defaultTeam) {
          this.onTeamChange(defaultTeam)
        }
        if (defaultProject) {
          this.onProjectChange(defaultProject)
        }
      }
    },
    projects: {
      immediate: true,
      handler(newProjects) {
        if (!this.form.project && Array.isArray(newProjects) && newProjects.length > 0) {
          const defaultProject = this.getDefaultProject()
          if (defaultProject) {
            this.form.project = defaultProject
            const pObj = (newProjects || []).find((p) => p.name === defaultProject)
            if (pObj && pObj.team && !this.form.team) {
              this.form.team = pObj.team
              this.onTeamChange(pObj.team)
            }
            this.onProjectChange(defaultProject)
          }
        }
      },
    },
    teams: {
      immediate: true,
      handler(newTeams) {
        if (!this.form.team && Array.isArray(newTeams) && newTeams.length > 0) {
          const first = this.getDefaultTeam(this.form.project)
          if (first) {
            this.form.team = first
            this.onTeamChange(first)
          }
        }
        if (this.effectiveTeam && !this.form.guided_by) {
          const lead = this.getTeamLeadUser(this.effectiveTeam)
          if (lead) {
            this.form.guided_by = lead
          }
        }
      },
    },
    'form.team'() {
      this.onTeamChange()
    },
    'form.project'() {
      this.onProjectChange()
    },
    'form.status'(newStatus) {
      const s = typeof newStatus === 'object' && newStatus ? (newStatus.value || newStatus.label) : newStatus
      if (s === 'Completed' && !this.form.completed_on) {
        this.form.completed_on = dayjs().format('YYYY-MM-DD')
      }
    },
  },
  mounted() {
    this.loadTaskflowSettings()
    window.addEventListener('keydown', this.handleKeyDown, true)
    document.addEventListener('click', this.handlePendingFromClickOutside)
    if (this.modelValue) {
      if (!this.form.project) {
        const defaultProject = this.getDefaultProject()
        if (defaultProject) {
          this.form.project = defaultProject
          const pObj = (this.projects || []).find((p) => p.name === defaultProject)
          if (pObj && pObj.team && !this.form.team) {
            this.form.team = pObj.team
            this.onTeamChange(pObj.team)
          }
          this.onProjectChange(defaultProject)
        }
      }
      if (!this.form.team) {
        const defaultTeam = this.getDefaultTeam(this.form.project)
        if (defaultTeam) {
          this.form.team = defaultTeam
          this.onTeamChange(defaultTeam)
        }
      }
      if (!this.form.guided_by && this.effectiveTeam) {
        const lead = this.getTeamLeadUser(this.effectiveTeam)
        if (lead) {
          this.form.guided_by = lead
        }
      }
      if (!this.form.assignees || this.form.assignees.length === 0) {
        const defaultAssignee = this.getDefaultAssignee()
        if (defaultAssignee) {
          this.form.assignees = [defaultAssignee]
          this.form.assigned_to = defaultAssignee
        }
      }
    }
  },
  beforeUnmount() {
    window.removeEventListener('keydown', this.handleKeyDown, true)
    document.removeEventListener('click', this.handlePendingFromClickOutside)
  },
  computed: {
    isStatusCompleted() {
      const s = typeof this.form.status === 'object' && this.form.status ? (this.form.status.value || this.form.status.label) : this.form.status
      return s === 'Completed'
    },
    // frappe-ui Select needs option objects; the plain string prop lists above
    // stay the single source of truth.
    statusOptions() {
      return (this.statuses || [])
        .filter((s) => s !== 'Cancelled')
        .map((s) => ({ label: s, value: s }))
    },
    priorityOptions() {
      return (this.priorities || []).map((p) => ({ label: p, value: p }))
    },
    taskTypeOptions() {
      return (this.taskTypes || []).map((t) => ({ label: t, value: t }))
    },

    selectedTeamValue() {
      if (!this.form.team) return ''
      return typeof this.form.team === 'object' ? (this.form.team.value || this.form.team.label || '') : this.form.team
    },
    selectedProjectValue() {
      if (!this.form.project) return ''
      return typeof this.form.project === 'object' ? (this.form.project.value || this.form.project.label || '') : this.form.project
    },
    selectedGuidedByValue() {
      if (!this.form.guided_by) return ''
      return typeof this.form.guided_by === 'object' ? (this.form.guided_by.value || '') : this.form.guided_by
    },
    teamOptions() {
      const q = (this.teamSearchQuery || '').trim().toLowerCase()
      let list = (this.teams || []).map((t) => {
        const val = typeof t === 'object' ? (t.name || t.team_name || '') : t
        const label = typeof t === 'object' ? (t.team_name || t.name || '') : t
        return { label, value: val }
      }).filter((t) => Boolean(t.value))

      if (q) {
        list = list.filter((t) => t.label.toLowerCase().includes(q) || t.value.toLowerCase().includes(q))
      }
      return list
    },
    projectOptions() {
      const q = (this.projectSearchQuery || '').trim().toLowerCase()
      let list = this.projects || []
      const currentTeam = this.selectedTeamValue

      // Filter by selected Team
      if (currentTeam) {
        list = list.filter((p) => p.team === currentTeam)
      }

      if (q) {
        list = list.filter((p) => {
          const name = (p.name || '').toLowerCase()
          const title = (p.title || p.project_name || p.display_name || '').toLowerCase()
          const team = (p.team || '').toLowerCase()
          return name.includes(q) || title.includes(q) || team.includes(q)
        })
      }
      const opts = list.map((p) => ({
        label: p.display_name || p.title || p.project_name || p.name,
        value: p.name,
        team: p.team || '',
      }))
      const currProj = this.selectedProjectValue
      if (currProj && !opts.some((o) => o.value === currProj)) {
        const p = (this.projects || []).find((x) => x.name === currProj)
        if (p) {
          opts.unshift({
            label: p.display_name || p.title || p.project_name || p.name,
            value: p.name,
            team: p.team || '',
          })
        }
      }
      return opts
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
      if (Array.isArray(this.people)) {
        for (const p of this.people) {
          const id = p.user_id || p.email || p.name
          if (id && !unique.has(id)) {
            unique.set(id, { label: p.name || p.email || id, value: id })
          }
        }
      }
      if (this.form.guided_by && !unique.has(this.form.guided_by)) {
        const val = this.form.guided_by
        const member = (this.allAvailableTeamMembers || []).find((m) => m.user === val || m.employee === val)
        const p = (this.people || []).find((x) => x.email === val || x.name === val)
        const label = member?.employee_name || p?.name || val
        unique.set(val, { label, value: val })
      }
      return Array.from(unique.values())
    },
    effectiveTeam() {
      if (this.selectedTeamValue) return this.selectedTeamValue
      const projVal = this.selectedProjectValue
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

      let opts = []
      if (members.length > 0) {
        opts = members.map((m) => ({
          value: m.user || m.employee,
          label: m.employee_name || m.user || m.employee,
        }))
      } else if (!team && this.allAvailableTeamMembers.length > 0) {
        opts = this.allAvailableTeamMembers.map((m) => ({
          value: m.user || m.employee,
          label: m.employee_name ? `${m.employee_name} (${m.team})` : (m.user || m.employee),
        }))
      }

      const def = this.getDefaultAssignee()
      if (def && !opts.some((o) => o.value === def)) {
        const p = (this.people || []).find((x) => x.email === def || x.name === def)
        opts.unshift({
          value: def,
          label: p?.name || this.currentUserName || def,
        })
      }

      return opts
    },
  },
  methods: {
    getTeamLeadUser(teamName) {
      if (!teamName) return ''
      const teamObj = (this.teams || []).find((t) => (t.name === teamName || t.team_name === teamName))
      if (teamObj) {
        if (teamObj.team_lead_user) return teamObj.team_lead_user
        const leadEmp = teamObj.team_lead
        if (leadEmp) {
          const member = (this.allAvailableTeamMembers || []).find((m) => m.employee === leadEmp || m.name === leadEmp)
          if (member && member.user) return member.user
          const person = (this.people || []).find((p) => p.employee === leadEmp || p.name === leadEmp)
          if (person && (person.user_id || person.email)) return person.user_id || person.email
        }
      }
      const leadMember = (this.allAvailableTeamMembers || []).find(
        (m) => m.team === teamName && (m.team_role === 'Team Lead' || m.role === 'Team Lead') && m.user
      )
      if (leadMember && leadMember.user) return leadMember.user
      return ''
    },
    getDefaultAssignee() {
      const email = (this.currentUser || (typeof window !== 'undefined' && window.frappe?.session?.user) || '').toLowerCase().trim()
      const name = (this.currentUserName || (typeof window !== 'undefined' && window.frappe?.boot?.user?.name) || '').toLowerCase().trim()
      if (!email && !name) return ''

      const member = (this.allAvailableTeamMembers || []).find((m) => {
        const u = (m.user || '').toLowerCase().trim()
        const emp = (m.employee || '').toLowerCase().trim()
        const empName = (m.employee_name || '').toLowerCase().trim()
        return (email && (u === email || emp === email)) || (name && (empName === name || u === name))
      })
      if (member) {
        return member.user || member.employee
      }

      const person = (this.people || []).find((p) => {
        const pEmail = (p.email || '').toLowerCase().trim()
        const pName = (p.name || '').toLowerCase().trim()
        return (email && pEmail === email) || (name && pName === name)
      })
      if (person) {
        return person.email || person.name
      }

      return this.currentUser || (typeof window !== 'undefined' && window.frappe?.session?.user) || ''
    },
    getDefaultProject() {
      if (this.defaultProject && (this.projects || []).some((p) => p.name === this.defaultProject)) {
        return this.defaultProject
      }
      try {
        const lastProj = localStorage.getItem('taskflow_last_selected_project')
        if (lastProj && (this.projects || []).some((p) => p.name === lastProj)) {
          return lastProj
        }
      } catch (e) {}
      return ''
    },
    getDefaultTeam(preselectedProject) {
      const proj = preselectedProject || this.defaultProject || (typeof window !== 'undefined' ? localStorage.getItem('taskflow_last_selected_project') : '')
      if (proj) {
        const pObj = (this.projects || []).find((p) => p.name === proj)
        if (pObj && pObj.team) {
          return pObj.team
        }
      }
      if (this.defaultTeam) {
        return this.defaultTeam
      }
      try {
        const lastTeam = localStorage.getItem('taskflow_last_selected_team')
        if (lastTeam && (this.teams || []).some((t) => (t.name === lastTeam || t.team_name === lastTeam))) {
          return lastTeam
        }
      } catch (e) {}
      if (Array.isArray(this.teams) && this.teams.length > 0) {
        const first = this.teams[0]
        return typeof first === 'object' ? (first.name || first.team_name || '') : first
      }
      return ''
    },
    onStatusChange(val) {
      const statusVal = typeof val === 'object' && val ? (val.value || val.label || '') : (val || this.form.status)
      if (statusVal === 'Completed') {
        if (!this.form.completed_on) {
          this.form.completed_on = dayjs().format('YYYY-MM-DD')
        }
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
    selectPendingFromOption(opt) {
      this.form.pending_from = opt
      this.showPendingFromDropdown = false
    },
    clearPendingFrom() {
      this.form.pending_from = ''
      this.showPendingFromDropdown = false
    },
    togglePendingFromDropdown() {
      this.showPendingFromDropdown = !this.showPendingFromDropdown
    },
    onPendingFromFocus() {
      this.showPendingFromDropdown = true
    },
    handlePendingFromClickOutside(e) {
      if (this.$refs.pendingFromRef && !this.$refs.pendingFromRef.contains(e.target)) {
        this.showPendingFromDropdown = false
      }
    },
    onProjectChange(val) {
      const projVal = typeof val === 'object' ? (val?.value || '') : (val || this.selectedProjectValue)
      if (projVal) {
        try {
          localStorage.setItem('taskflow_last_selected_project', projVal)
        } catch (e) {}
      }
      const selected = (this.projects || []).find((p) => p.name === projVal)
      if (selected && selected.team) {
        if (!this.selectedTeamValue || this.selectedTeamValue !== selected.team) {
          this.form.team = selected.team
          this.onTeamChange(selected.team)
        }
      }
      this.loadTeamMembersForTeam(this.effectiveTeam)
    },
    onTeamChange(val) {
      const teamVal = typeof val === 'object' ? (val?.value || '') : (val || this.selectedTeamValue)
      if (teamVal) {
        try {
          localStorage.setItem('taskflow_last_selected_team', teamVal)
        } catch (e) {}
      }
      const projVal = this.selectedProjectValue
      if (projVal && teamVal) {
        const proj = (this.projects || []).find((p) => p.name === projVal)
        if (proj && proj.team && proj.team !== teamVal) {
          this.form.project = ''
          this.projectSearchQuery = ''
        }
      }
      if (teamVal) {
        const lead = this.getTeamLeadUser(teamVal)
        if (lead) {
          this.form.guided_by = lead
        }
        this.loadTeamMembersForTeam(teamVal)
      }
    },
    clearTeam() {
      this.form.team = ''
      this.teamSearchQuery = ''
      try {
        localStorage.removeItem('taskflow_last_selected_team')
      } catch (e) {}
      this.onTeamChange('')
    },
    clearProject() {
      this.form.project = ''
      this.projectSearchQuery = ''
      try {
        localStorage.removeItem('taskflow_last_selected_project')
      } catch (e) {}
      this.onProjectChange('')
    },
    async loadTeamMembersForTeam(team) {
      if (!team) return
      const hasMembers = this.allAvailableTeamMembers.some((m) => m.team === team)
      if (!hasMembers) {
        try {
          const members = await fetchTeamMembers(team)
          if (Array.isArray(members) && members.length > 0) {
            this.localTeamMembers.push(...members)
            if (!this.form.guided_by) {
              const lead = this.getTeamLeadUser(team)
              if (lead) {
                this.form.guided_by = lead
              }
            }
          }
        } catch (err) {
          console.warn('Failed to load team members for team:', team, err)
        }
      }
    },
    applyQuickDate(setDate, amount, unit, close) {
      const d = amount === 0 ? dayjs() : dayjs().add(amount, unit)
      if (typeof setDate === 'function') {
        setDate(d)
      }
      this.form.due_date = d.format('YYYY-MM-DD')
      if (typeof close === 'function') {
        close()
      }
    },
    handleKeyDown(e) {
      if (!this.modelValue) return
      if (e.key === 'Escape') {
        this.close()
      } else if ((e.metaKey || e.ctrlKey) && (e.key === 's' || e.key === 'S' || e.code === 'KeyS')) {
        e.preventDefault()
        e.stopPropagation()
        if (document.activeElement && typeof document.activeElement.blur === 'function') {
          document.activeElement.blur()
        }
        this.$nextTick(() => {
          this.submit()
        })
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
      const projVal = this.selectedProjectValue
      const teamVal = this.effectiveTeam || this.selectedTeamValue
      if (!teamVal) {
        this.errorMessage = 'Team is required'
        toast.error('Team is required')
        return
      }
      if (!projVal) {
        this.errorMessage = 'Project is required'
        toast.error('Project is required')
        return
      }
      const guidedByVal = this.selectedGuidedByValue
      if (!guidedByVal) {
        this.errorMessage = 'Guided By is required'
        toast.error('Guided By is required')
        return
      }
      this.creating = true
      this.errorMessage = ''
      const statusVal = typeof this.form.status === 'object' && this.form.status ? (this.form.status.value || this.form.status.label || '') : (this.form.status || 'Open')
      const priorityVal = typeof this.form.priority === 'object' && this.form.priority ? (this.form.priority.value || this.form.priority.label || '') : (this.form.priority || 'Medium')
      const taskTypeVal = typeof this.form.task_type === 'object' && this.form.task_type ? (this.form.task_type.value || this.form.task_type.label || '') : (this.form.task_type || 'Task')
      const assigneeIds = (this.form.assignees || []).map((a) => (typeof a === 'object' ? (a.value || a.user_id || a.user || a.email) : a)).filter(Boolean)
      const dueDateVal = this.form.due_date ? dayjs(this.form.due_date).format('YYYY-MM-DD') : ''
      const startDateVal = this.form.start_date ? dayjs(this.form.start_date).format('YYYY-MM-DD') : ''
      const ticketDateVal = this.form.ticket_date ? dayjs(this.form.ticket_date).format('YYYY-MM-DD') : ''
      const payload = {
        ...this.form,
        start_date: startDateVal,
        due: dueDateVal,
        due_date: dueDateVal,
        ticket_date: ticketDateVal,
        status: statusVal,
        priority: priorityVal,
        task_type: taskTypeVal,
        project: projVal,
        guided_by: guidedByVal,
        team: teamVal || undefined,
        assignees: assigneeIds,
        assigned_to: assigneeIds[0] || '',
        completed_on: statusVal === 'Completed' ? (this.form.completed_on || dayjs().format('YYYY-MM-DD')) : '',
      }
      try {
        if (this.onCreate) {
          await this.onCreate(payload)
        } else {
          const res = await saveTask(payload)
          this.$emit('create', res || payload)
          toast.success('Task created successfully')
        }
        if (projVal) {
          try {
            localStorage.setItem('taskflow_last_selected_project', projVal)
          } catch (e) {}
        }
        if (teamVal) {
          try {
            localStorage.setItem('taskflow_last_selected_team', teamVal)
          } catch (e) {}
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
      const val = typeof status === 'object' && status ? (status.value || status.label) : status
      switch (val) {
        case 'Open':
          return 'bg-blue-500'
        case 'In Progress':
          return 'bg-amber-500'
        case 'Review':
          return 'bg-purple-500'
        case 'On Hold':
          return 'bg-orange-500'
        case 'Completed':
          return 'bg-green-500'
        case 'Overdue':
          return 'bg-red-500'
        default:
          return 'bg-blue-500'
      }
    },
    getPriorityDotClass(priority) {
      const val = typeof priority === 'object' && priority ? (priority.value || priority.label) : priority
      switch (val) {
        case 'Critical':
          return 'bg-red-600'
        case 'High':
          return 'bg-orange-600'
        case 'Medium':
          return 'bg-blue-600'
        case 'Low':
          return 'bg-green-600'
        default:
          return 'bg-blue-600'
      }
    },
  },
}
</script>
