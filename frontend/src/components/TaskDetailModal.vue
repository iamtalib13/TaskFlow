<template>
  <div
    v-if="modelValue"
    class="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 transition-opacity duration-200"
    @click.self="close"
  >
    <div
      class="bg-white rounded-2xl shadow-2xl border border-gray-200/90 w-full max-w-[96vw] 2xl:max-w-[1440px] h-[94vh] max-h-[960px] flex flex-col overflow-hidden transform transition-all duration-200 scale-100"
      role="dialog"
      aria-modal="true"
    >
      <!-- TOP ACTION BAR -->
      <header class="px-4 py-2.5 bg-white border-b border-gray-200 flex flex-wrap items-center justify-between gap-3 shrink-0 select-none">
        <!-- Left: Back Navigation & Breadcrumb -->
        <div class="flex items-center gap-3 min-w-0">
          <button
            type="button"
            class="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-700 hover:text-gray-950 transition cursor-pointer px-2 py-1 rounded-md hover:bg-gray-100"
            @click="close"
          >
            <ArrowLeft class="size-3.5 stroke-[2.2]" />
            <span>Back to Tasks</span>
          </button>

          <span class="text-gray-300">|</span>

          <nav class="flex items-center gap-1.5 text-xs truncate">
            <span class="text-gray-500 font-medium">Tasks</span>
            <span class="text-gray-400">/</span>
            <div class="inline-flex items-center gap-1 font-semibold text-[#417c7d] bg-[#417c7d]/10 px-2 py-0.5 rounded-md border border-[#417c7d]/30">
              <span class="size-1.5 rounded-full bg-[#417c7d]"></span>
              <span class="truncate max-w-[160px]">{{ form.project || 'Project' }}</span>
            </div>
            <span class="text-gray-400">/</span>
            <span class="font-mono font-bold text-[#417c7d]">{{ form.id || 'TASK' }}</span>
          </nav>
        </div>

        <!-- Right: Status / Priority Controls & Action Buttons -->
        <div class="flex items-end gap-3 shrink-0">
          <!-- Task Type Dropdown Selector with Label Above -->
          <div class="flex flex-col">
            <label class="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Task Type</label>
            <div class="relative">
              <select
                v-model="form.task_type"
                class="appearance-none pl-6 pr-6 py-1 text-xs font-semibold rounded-lg border cursor-pointer transition focus:ring-2 focus:ring-[#417c7d]/20 focus:border-[#417c7d] outline-none"
                :class="getTaskTypeSelectClass(form.task_type)"
              >
                <option v-for="t in taskTypes" :key="t" :value="t">{{ t }}</option>
              </select>
              <component
                :is="getTaskTypeIcon(form.task_type)"
                class="absolute left-2 top-1/2 -translate-y-1/2 size-3 pointer-events-none"
                :class="getTaskTypeIconClass(form.task_type)"
              />
              <ChevronDown class="absolute right-1.5 top-1/2 -translate-y-1/2 size-3 pointer-events-none opacity-60" />
            </div>
          </div>

          <!-- Status Dropdown Selector with Label Above -->
          <div class="flex flex-col">
            <label class="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Status</label>
            <div class="relative">
              <select
                v-model="form.status"
                class="appearance-none pl-5.5 pr-6 py-1 text-xs font-semibold rounded-lg border cursor-pointer transition focus:ring-2 focus:ring-[#417c7d]/20 focus:border-[#417c7d] outline-none"
                :class="getStatusSelectClass(form.status)"
              >
                <option v-for="s in statuses" :key="s" :value="s">{{ s }}</option>
              </select>
              <span
                class="absolute left-2 top-1/2 -translate-y-1/2 size-2 rounded-full pointer-events-none"
                :class="getStatusDotClass(form.status)"
              />
              <ChevronDown class="absolute right-1.5 top-1/2 -translate-y-1/2 size-3 pointer-events-none opacity-60" />
            </div>
          </div>

          <!-- Priority Dropdown Selector with Label Above -->
          <div class="flex flex-col">
            <label class="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Priority</label>
            <div class="relative">
              <select
                v-model="form.priority"
                class="appearance-none pl-5.5 pr-6 py-1 text-xs font-semibold rounded-lg border cursor-pointer transition focus:ring-2 focus:ring-[#417c7d]/20 focus:border-[#417c7d] outline-none bg-blue-50/60 text-blue-700 border-blue-200"
              >
                <option v-for="p in priorities" :key="p" :value="p">{{ p }}</option>
              </select>
              <Flag class="absolute left-2 top-1/2 -translate-y-1/2 size-3 pointer-events-none text-blue-600" />
              <ChevronDown class="absolute right-1.5 top-1/2 -translate-y-1/2 size-3 pointer-events-none text-blue-500" />
            </div>
          </div>

          <!-- Action Buttons -->
          <div class="flex items-center gap-2 pb-0.5">
            <!-- Delete Task Button -->
            <Button
              v-if="form.id"
              variant="subtle"
              theme="red"
              size="sm"
              :loading="deleting"
              :disabled="deleting || saving"
              title="Delete Task"
              @click="confirmDelete"
            >
              <template #prefix>
                <Trash2 v-if="!deleting" class="size-3.5" />
              </template>
              Delete
            </Button>

            <!-- Cancel Button -->
            <Button
              size="sm"
              :disabled="saving || deleting"
              @click="close"
            >
              Cancel
            </Button>

            <!-- Save Task Button -->
            <Button
              variant="solid"
              size="sm"
              :loading="saving"
              :disabled="saving || deleting"
              title="Save Task (⌘S)"
              @click="save"
            >
              <template #prefix>
                <Check v-if="!saving" class="size-3.5 stroke-[2.5]" />
              </template>
              <span>Save Task</span>
              <kbd class="ml-1 px-1 py-0.2 rounded text-[10px] bg-white/20 font-mono font-normal">⌘S</kbd>
            </Button>
          </div>
        </div>
      </header>

      <!-- Error Message Banner -->
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

      <!-- 3-COLUMN MAIN BODY LAYOUT -->
      <!-- 3-COLUMN MAIN BODY LAYOUT (Clean flat layout separated by Frappe UI Dividers) -->
      <div class="flex-1 min-h-0 flex flex-col xl:flex-row overflow-hidden bg-white">
        <!-- COLUMN 1: LEFT SIDEBAR (Assignment, Schedule & Ticket) -->
        <aside class="w-full xl:w-[320px] 2xl:w-[340px] shrink-0 overflow-y-auto p-4 space-y-4 text-xs select-none border-b xl:border-b-0 xl:border-r border-gray-200">
          <!-- Section 1: ASSIGNMENT -->
          <div class="space-y-3">
            <div class="flex items-center justify-between text-[11px] font-bold text-gray-500 uppercase tracking-wider">
              <span>Assignment</span>
              <Info class="size-3.5 text-gray-400 hover:text-gray-600 cursor-pointer" title="Assignment details" />
            </div>

            <!-- Project & Team selectors -->
            <div class="space-y-2.5 pb-1">
              <div>
                <label class="block font-medium text-[11px] text-gray-700 mb-1">Project</label>
                <select
                  v-model="form.project"
                  class="w-full bg-white border border-gray-200 hover:border-gray-300 rounded-lg px-2.5 py-1.5 text-xs text-gray-900 font-medium focus:ring-2 focus:ring-[#417c7d]/20 focus:border-[#417c7d] outline-none transition"
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
                  <label class="block font-medium text-[11px] text-gray-700">Team</label>
                  <span v-if="effectiveTeam" class="text-[10px] font-semibold text-[#417c7d] bg-[#417c7d]/10 px-1.5 py-0.5 rounded">
                    {{ effectiveTeam }}
                  </span>
                </div>
                <select
                  v-model="form.team"
                  class="w-full bg-white border border-gray-200 hover:border-gray-300 rounded-lg px-2.5 py-1.5 text-xs text-gray-900 font-medium focus:ring-2 focus:ring-[#417c7d]/20 focus:border-[#417c7d] outline-none transition"
                  @change="onTeamChange"
                >
                  <option value="">Select Team</option>
                  <option v-for="t in teams" :key="t.name || t" :value="t.name || t">
                    {{ t.team_name || t.name || t }}
                  </option>
                </select>
              </div>

              <div>
                <label class="block font-medium text-[11px] text-gray-700 mb-1">Task Type</label>
                <div class="relative flex items-center">
                  <select
                    v-model="form.task_type"
                    class="w-full bg-white border border-gray-200 hover:border-gray-300 rounded-lg pl-7 pr-7 py-1.5 text-xs text-gray-900 font-medium focus:ring-2 focus:ring-[#417c7d]/20 focus:border-[#417c7d] outline-none transition appearance-none cursor-pointer"
                  >
                    <option v-for="t in taskTypes" :key="t" :value="t">{{ t }}</option>
                  </select>
                  <component
                    :is="getTaskTypeIcon(form.task_type)"
                    class="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 pointer-events-none"
                    :class="getTaskTypeIconClass(form.task_type)"
                  />
                  <ChevronDown class="absolute right-2.5 top-1/2 -translate-y-1/2 size-3.5 pointer-events-none text-gray-400" />
                </div>
              </div>
            </div>

            <!-- Assigned to -->
            <div>
              <div class="flex items-center justify-between mb-1">
                <label class="block font-medium text-[11px] text-gray-700">Assigned to</label>
                <span v-if="assigneeOptions.length > 0" class="text-[10px] text-gray-400">
                  {{ assigneeOptions.length }} team members
                </span>
              </div>
              <!-- Selected assignees chips with avatar and remove icon -->
              <div v-if="form.assignees && form.assignees.length > 0" class="space-y-1 mb-1.5">
                <div
                  v-for="assignee in form.assignees"
                  :key="getAssigneeValue(assignee)"
                  class="flex items-center justify-between px-2 py-1 rounded-lg bg-gray-50 border border-gray-200 hover:bg-gray-100/70 transition"
                >
                  <div class="flex items-center gap-1.5 min-w-0">
                    <span class="size-4.5 rounded-full bg-[#417c7d] text-white font-bold text-[9px] flex items-center justify-center shrink-0">
                      {{ getInitials(getAssigneeName(assignee)) }}
                    </span>
                    <span class="text-[11px] font-semibold text-gray-800 truncate uppercase tracking-tight">
                      {{ getAssigneeName(assignee) }}
                    </span>
                  </div>
                  <button
                    type="button"
                    class="text-gray-400 hover:text-rose-600 p-0.5 rounded cursor-pointer transition shrink-0"
                    title="Remove assignee"
                    @click="removeAssignee(assignee)"
                  >
                    <X class="size-3" />
                  </button>
                </div>
              </div>

              <!-- MultiSelect employee search and select control -->
              <MultiSelect
                v-model="form.assignees"
                :options="assigneeOptions"
                :placeholder="effectiveTeam ? `Select ${effectiveTeam} member...` : 'Add Assignee...'"
                size="sm"
                class="w-full"
              />
              <p v-if="effectiveTeam && assigneeOptions.length === 0" class="text-[10px] text-amber-600 mt-1">
                No team members found in {{ effectiveTeam }}.
              </p>
            </div>

            <!-- Pending With -->
            <div>
              <label class="block font-medium text-[11px] text-gray-700 mb-1">Pending With</label>
              <input
                v-model="form.pending_with"
                type="text"
                placeholder="Pending with..."
                class="w-full bg-white border border-gray-200 hover:border-gray-300 rounded-lg px-2.5 py-1.5 text-xs text-gray-800 placeholder-gray-400 font-medium focus:ring-2 focus:ring-[#417c7d]/20 focus:border-[#417c7d] outline-none transition"
              />
            </div>

            <!-- Pending From -->
            <div>
              <label class="block font-medium text-[11px] text-gray-700 mb-1">Pending From</label>
              <input
                v-model="form.pending_from"
                type="text"
                placeholder="Pending from (vendor / client / dept)..."
                class="w-full bg-white border border-gray-200 hover:border-gray-300 rounded-lg px-2.5 py-1.5 text-xs text-gray-800 placeholder-gray-400 font-medium focus:ring-2 focus:ring-[#417c7d]/20 focus:border-[#417c7d] outline-none transition"
              />
            </div>

            <!-- Guided By -->
            <div>
              <label class="block font-medium text-[11px] text-gray-700 mb-1">Guided By</label>
              <input
                v-model="form.guided_by"
                type="text"
                placeholder="Guided by / mentor..."
                class="w-full bg-white border border-gray-200 hover:border-gray-300 rounded-lg px-2.5 py-1.5 text-xs text-gray-800 placeholder-gray-400 font-medium focus:ring-2 focus:ring-[#417c7d]/20 focus:border-[#417c7d] outline-none transition"
              />
            </div>

            <!-- Responsible Person -->
            <div>
              <label class="block font-medium text-[11px] text-gray-700 mb-1">Responsible Person</label>
              <input
                v-model="form.responsible_person"
                type="text"
                placeholder="Responsible person..."
                class="w-full bg-white border border-gray-200 hover:border-gray-300 rounded-lg px-2.5 py-1.5 text-xs text-gray-800 placeholder-gray-400 font-medium focus:ring-2 focus:ring-[#417c7d]/20 focus:border-[#417c7d] outline-none transition"
              />
            </div>
          </div>

          <!-- Section Divider -->
          <hr class="border-t border-gray-200 my-1" />

          <!-- Section 2: SCHEDULE -->
          <div class="space-y-3">
            <div class="flex items-center justify-between text-[11px] font-bold text-gray-500 uppercase tracking-wider">
              <span>Schedule</span>
              <Calendar class="size-3.5 text-gray-400" />
            </div>

            <!-- Start Date & Due Date (Side by Side) -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <!-- Start Date -->
              <div>
                <label class="block font-medium text-[11px] text-gray-700 mb-1">Start Date</label>
                <DatePicker
                  v-model="form.start_date"
                  format="DD-MM-YYYY"
                  placeholder="DD-MM-YYYY"
                  size="sm"
                  variant="outline"
                  class="w-full"
                >
                  <template #prefix>
                    <Calendar class="size-3.5 text-gray-400" />
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

              <!-- Due Date -->
              <div>
                <div class="flex items-center justify-between mb-1">
                  <label class="font-medium text-[11px] text-gray-700 truncate">Due Date</label>
                  <span
                    v-if="form.due_date"
                    class="px-1 py-0.2 rounded text-[9px] font-bold border tracking-wide uppercase shrink-0"
                    :class="isOverdue ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'"
                  >
                    {{ isOverdue ? 'OVERDUE' : 'On Time' }}
                  </span>
                </div>
                <DatePicker
                  v-model="form.due_date"
                  format="DD-MM-YYYY"
                  placeholder="DD-MM-YYYY"
                  size="sm"
                  variant="outline"
                  class="w-full"
                >
                  <template #prefix>
                    <AlertTriangle v-if="isOverdue" class="size-3.5 text-rose-500" />
                    <Calendar v-else class="size-3.5 text-gray-400" />
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

            <!-- Estimated Date & Completed Date (Side by Side) -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <!-- Estimated Date (Expected Resolution Date) -->
              <div>
                <label class="block font-medium text-[11px] text-gray-700 mb-1 truncate" title="Expected Resolution Date">Estimated Date</label>
                <DatePicker
                  v-model="form.expected_resolution_date"
                  format="DD-MM-YYYY"
                  placeholder="DD-MM-YYYY"
                  size="sm"
                  variant="outline"
                  class="w-full"
                >
                  <template #prefix>
                    <Calendar class="size-3.5 text-gray-400" />
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

              <!-- Completed Date (Completed On) -->
              <div>
                <label class="block font-medium text-[11px] text-gray-700 mb-1 truncate" title="Completed On">Completed Date</label>
                <DatePicker
                  v-model="form.completed_on"
                  format="DD-MM-YYYY"
                  placeholder="DD-MM-YYYY"
                  size="sm"
                  variant="outline"
                  class="w-full"
                >
                  <template #prefix>
                    <Calendar class="size-3.5 text-gray-400" />
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

            <!-- Time Estimate -->
            <div>
              <label class="block font-medium text-[11px] text-gray-700 mb-1">Time Estimate</label>
              <div class="relative flex items-center">
                <input
                  v-model.number="form.estimated_hours"
                  type="number"
                  step="0.25"
                  min="0"
                  placeholder="0.00"
                  class="w-full bg-white border border-gray-200 hover:border-gray-300 rounded-lg pl-2.5 pr-9 py-1.5 text-xs text-gray-800 font-mono focus:ring-2 focus:ring-[#417c7d]/20 focus:border-[#417c7d] outline-none transition"
                />
                <span class="absolute right-2 text-[10px] font-semibold text-gray-400 pointer-events-none">hrs</span>
              </div>
            </div>
          </div>

          <!-- Section Divider -->
          <hr class="border-t border-gray-200 my-1" />

          <!-- Section 3: 🎫 TICKET -->
          <div class="space-y-3">
            <div class="flex items-center justify-between text-[11px] font-bold text-gray-500 uppercase tracking-wider">
              <span class="flex items-center gap-1">
                <span>🎫</span>
                <span>Ticket</span>
              </span>
              <Ticket class="size-3.5 text-gray-400" />
            </div>

            <!-- Ticket Date -->
            <div>
              <label class="block font-medium text-[11px] text-gray-700 mb-1">Ticket Date</label>
              <DatePicker
                v-model="form.ticket_date"
                format="DD-MM-YYYY"
                placeholder="DD-MM-YYYY"
                size="sm"
                variant="outline"
                class="w-full"
              >
                <template #prefix>
                  <Calendar class="size-3.5 text-gray-400" />
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

            <!-- Toll ID -->
            <div>
              <label class="block font-medium text-[11px] text-gray-700 mb-1">Toll ID</label>
              <input
                v-model="form.toll_id"
                type="text"
                placeholder="Enter Toll ID"
                class="w-full bg-white border border-gray-200 hover:border-gray-300 rounded-lg px-2.5 py-1.5 text-xs text-gray-800 placeholder-gray-400 font-medium focus:ring-2 focus:ring-[#417c7d]/20 focus:border-[#417c7d] outline-none transition"
              />
            </div>

            <!-- Ticket ID -->
            <div>
              <label class="block font-medium text-[11px] text-gray-700 mb-1">Ticket ID</label>
              <input
                v-model="form.ticket_id"
                type="text"
                placeholder="e.g. TKT-001"
                class="w-full bg-white border border-gray-200 hover:border-gray-300 rounded-lg px-2.5 py-1.5 text-xs text-gray-800 placeholder-gray-400 font-mono font-medium focus:ring-2 focus:ring-[#417c7d]/20 focus:border-[#417c7d] outline-none transition"
              />
            </div>

            <!-- Raised By -->
            <div>
              <label class="block font-medium text-[11px] text-gray-700 mb-1">Raised By</label>
              <input
                v-model="form.ticket_raised_by"
                type="text"
                placeholder="Name or email"
                class="w-full bg-white border border-gray-200 hover:border-gray-300 rounded-lg px-2.5 py-1.5 text-xs text-gray-800 placeholder-gray-400 font-medium focus:ring-2 focus:ring-[#417c7d]/20 focus:border-[#417c7d] outline-none transition"
              />
            </div>

            <!-- Ticket Description -->
            <div>
              <label class="block font-medium text-[11px] text-gray-700 mb-1">Ticket Description</label>
              <textarea
                v-model="form.ticket_description"
                rows="2"
                placeholder="Brief description of the ticket..."
                class="w-full bg-white border border-gray-200 hover:border-gray-300 rounded-lg px-2.5 py-1.5 text-xs text-gray-800 placeholder-gray-400 font-medium focus:ring-2 focus:ring-[#417c7d]/20 focus:border-[#417c7d] outline-none transition resize-none"
              ></textarea>
            </div>
          </div>
        </aside>

        <!-- COLUMN 2: CENTER MAIN CONTENT (Header, Attachments, Title & Description) -->
        <main class="flex-1 min-w-0 overflow-y-auto p-4 sm:p-6 space-y-4">
          <!-- Attachments Section (Square Thumbnails + Add Tile) -->
          <div class="space-y-1.5 pt-0.5 pb-1">
            <div class="flex items-center justify-between">
              <span class="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-gray-500">
                <Paperclip class="size-3 text-gray-400" />
                <span>Attachments</span>
                <span
                  v-if="attachments.length > 0"
                  class="px-1.5 py-0.2 rounded-full text-[10px] font-semibold bg-gray-100 text-gray-600"
                >
                  {{ attachments.length }}
                </span>
              </span>

              <span v-if="attachments.length > 0" class="text-[10px] text-gray-400">
                Hover to view, download, or delete
              </span>
            </div>

            <div class="flex flex-wrap items-center gap-2.5">
              <!-- Square Thumbnail Cards -->
              <div
                v-for="(att, idx) in attachments"
                :key="att.id || att.name || idx"
                class="relative group size-20 sm:size-22 rounded-xl border border-gray-200 bg-white hover:border-[#417c7d]/40 shadow-xs hover:shadow-md transition-all overflow-hidden flex flex-col select-none"
              >
                <!-- If Image: Real Thumbnail Preview -->
                <div v-if="isImageFile(att)" class="relative w-full h-full bg-gray-100">
                  <img
                    :src="att.url || att.file_url"
                    :alt="att.name"
                    class="w-full h-full object-cover"
                    loading="lazy"
                  />
                  <!-- Bottom title scrim -->
                  <div class="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent pt-3 pb-1 px-1 text-[9px] font-medium text-white truncate text-center pointer-events-none">
                    {{ att.name }}
                  </div>
                </div>

                <!-- If Non-Image: Clean document/file tile -->
                <div
                  v-else
                  class="w-full h-full flex flex-col items-center justify-between p-1.5 bg-gradient-to-b from-gray-50 to-white"
                >
                  <!-- Top Badge with file extension -->
                  <span
                    class="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold border uppercase tracking-wide shrink-0"
                    :class="getFileTypeConfig(att).color"
                  >
                    {{ getFileTypeConfig(att).badge }}
                  </span>

                  <!-- Center Document Icon -->
                  <FileText class="size-5 shrink-0" :class="getFileTypeConfig(att).iconColor" />

                  <!-- Bottom File Info -->
                  <div class="w-full text-center min-w-0">
                    <p class="text-[9px] font-semibold text-gray-700 truncate w-full" :title="att.name">
                      {{ att.name }}
                    </p>
                    <span v-if="att.size" class="text-[8px] text-gray-400 font-mono block -mt-0.5">
                      {{ att.size }}
                    </span>
                  </div>
                </div>

                <!-- Hover Actions Overlay -->
                <div class="absolute inset-0 bg-black/60 backdrop-blur-xs opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 p-1 z-10">
                  <!-- View/Open File in New Tab -->
                  <a
                    :href="att.url || att.file_url || '#'"
                    target="_blank"
                    class="size-6 rounded-md bg-white/20 hover:bg-white text-white hover:text-gray-900 flex items-center justify-center transition cursor-pointer"
                    title="Open in new tab"
                  >
                    <ExternalLink class="size-3" />
                  </a>

                  <!-- Download File -->
                  <a
                    :href="att.url || att.file_url || '#'"
                    target="_blank"
                    download
                    class="size-6 rounded-md bg-white/20 hover:bg-white text-white hover:text-gray-900 flex items-center justify-center transition cursor-pointer"
                    title="Download"
                  >
                    <Download class="size-3" />
                  </a>

                  <!-- Delete File -->
                  <button
                    type="button"
                    class="size-6 rounded-md bg-white/20 hover:bg-rose-600 text-white flex items-center justify-center transition cursor-pointer"
                    title="Delete attachment"
                    @click.stop.prevent="confirmDeleteAttachment(att, idx)"
                  >
                    <Trash2 class="size-3" />
                  </button>
                </div>
              </div>

              <!-- + Add Attachment Square Tile -->
              <label
                class="relative size-20 sm:size-22 rounded-xl border-2 border-dashed border-gray-300 hover:border-[#417c7d] bg-gray-50/70 hover:bg-[#417c7d]/5 flex flex-col items-center justify-center gap-1 cursor-pointer transition select-none group text-gray-500 hover:text-[#417c7d] shadow-2xs shrink-0"
                title="Upload attachments"
              >
                <div class="size-6 rounded-full bg-white group-hover:bg-[#417c7d]/10 border border-gray-200 group-hover:border-[#417c7d]/30 flex items-center justify-center shadow-xs transition">
                  <Plus class="size-3.5 text-gray-500 group-hover:text-[#417c7d] stroke-[2.5]" />
                </div>
                <span class="text-[10px] font-semibold tracking-wide">Add</span>
                <span
                  v-if="uploadingAttachment"
                  class="absolute inset-0 bg-white/80 rounded-xl flex items-center justify-center"
                >
                  <Loader2 class="size-5 animate-spin text-[#417c7d]" />
                </span>
                <input
                  type="file"
                  multiple
                  class="sr-only"
                  @change="handleFileUpload"
                />
              </label>
            </div>
          </div>

          <!-- Task Title (Proper Input Box) -->
          <div class="space-y-1 pt-0.5">
            <div class="flex items-center justify-between">
              <label class="block text-[11px] font-bold text-gray-700 uppercase tracking-wider">
                Task Title <span class="text-rose-500">*</span>
              </label>
            </div>
            <input
              v-model="form.title"
              type="text"
              placeholder="Enter task title..."
              class="w-full bg-white border border-gray-200 hover:border-gray-300 focus:border-[#417c7d] focus:ring-2 focus:ring-[#417c7d]/15 rounded-xl px-3.5 py-2 text-sm sm:text-base font-semibold text-gray-900 placeholder-gray-400 outline-none transition shadow-2xs"
            />
          </div>

          <!-- Description Section (Directly below Title, zero blank gaps) -->
          <div class="space-y-1 pt-0.5">
            <div class="flex items-center justify-between">
              <label class="block text-[11px] font-bold text-gray-700 uppercase tracking-wider">
                Description
              </label>
              <span class="text-[10px] text-gray-400">
                Markdown & Rich formatting supported
              </span>
            </div>

            <TaskRichEditor
              v-model="form.description"
              :people="people"
              min-height="min-h-72"
              placeholder="Write description, acceptance criteria, or type / for blocks..."
            />
          </div>
        </main>

        <!-- COLUMN 3: RIGHT SIDEBAR (Comments & Activity Audit) -->
        <aside class="w-full xl:w-[320px] 2xl:w-[360px] shrink-0 flex flex-col bg-white overflow-hidden h-full border-t xl:border-t-0 xl:border-l border-gray-200">
          <!-- Top Tabs Header -->
          <div class="flex items-center justify-between px-3.5 py-2.5 shrink-0 select-none bg-white border-b border-gray-200">
            <div class="flex items-center gap-3">
              <button
                type="button"
                class="pb-1 text-xs font-bold transition border-b-2 cursor-pointer inline-flex items-center gap-1.5"
                :class="activeRightTab === 'comments' ? 'border-[#417c7d] text-[#417c7d]' : 'border-transparent text-gray-500 hover:text-gray-800'"
                @click="activeRightTab = 'comments'"
              >
                <span>Comments</span>
                <span
                  class="px-1.5 py-0.2 rounded-full text-[10px] font-semibold"
                  :class="activeRightTab === 'comments' ? 'bg-[#417c7d]/10 text-[#417c7d]' : 'bg-gray-100 text-gray-500'"
                >
                  {{ comments.length }}
                </span>
                <Loader2 v-if="loadingComments" class="size-3 animate-spin text-[#417c7d]" />
              </button>
              <button
                type="button"
                class="pb-1 text-xs font-bold transition border-b-2 cursor-pointer"
                :class="activeRightTab === 'activity' ? 'border-[#417c7d] text-[#417c7d]' : 'border-transparent text-gray-500 hover:text-gray-800'"
                @click="activeRightTab = 'activity'"
              >
                Activity Audit
              </button>
            </div>

            <button type="button" class="text-gray-400 hover:text-gray-700 cursor-pointer p-1 rounded hover:bg-gray-100" title="Timeline options">
              <SlidersHorizontal class="size-3.5" />
            </button>
          </div>

          <!-- Comments Feed Tab Content -->
          <div
            v-if="activeRightTab === 'comments'"
            ref="commentsContainer"
            class="flex-1 overflow-y-auto p-3 space-y-3 min-h-0 text-xs"
          >
            <!-- Loading indicator when fetching comments -->
            <div v-if="loadingComments && comments.length === 0" class="py-8 flex flex-col items-center justify-center gap-1.5 text-gray-400">
              <Loader2 class="size-4.5 animate-spin text-[#417c7d]" />
              <span class="text-xs text-gray-500 font-medium">Loading comments...</span>
            </div>

            <!-- Empty state when no comments exist -->
            <div v-else-if="comments.length === 0" class="py-8 text-center text-gray-400 space-y-1 select-none">
              <MessageSquare class="size-5 mx-auto stroke-1 text-gray-300 mb-1" />
              <p class="text-xs font-semibold text-gray-600">No comments yet</p>
              <p class="text-[11px] text-gray-400">Send a comment below to start the conversation.</p>
            </div>

            <!-- Comments List: Chat style with current user on right, others on left -->
            <template v-else v-for="(cmt, idx) in comments" :key="cmt.id || idx">
              <!-- CURRENT USER MESSAGE (Right-Aligned) -->
              <div
                v-if="isCurrentUser(cmt)"
                class="flex flex-col items-end group max-w-[90%] ml-auto"
              >
                <!-- Edit Mode -->
                <div v-if="editingCommentId === cmt.id" class="w-full space-y-1.5">
                  <textarea
                    v-model="editingCommentText"
                    rows="2"
                    class="w-full bg-white border border-[#417c7d] focus:ring-2 focus:ring-[#417c7d]/20 rounded-xl px-2.5 py-1.5 text-xs text-gray-800 outline-none resize-none transition leading-normal"
                    placeholder="Edit comment..."
                    @keydown.enter.exact.prevent="saveEditComment(cmt, idx)"
                    @keydown.escape.prevent="cancelEditComment"
                  ></textarea>
                  <div class="flex items-center justify-end gap-1.5 text-[11px]">
                    <button
                      type="button"
                      class="px-2 py-0.5 rounded text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition cursor-pointer"
                      @click="cancelEditComment"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      :disabled="updatingComment || !editingCommentText.trim()"
                      class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded bg-[#417c7d] hover:bg-[#366869] text-white font-semibold shadow-2xs transition cursor-pointer disabled:opacity-50"
                      @click="saveEditComment(cmt, idx)"
                    >
                      <Loader2 v-if="updatingComment" class="size-3 animate-spin" />
                      <span>Save</span>
                    </button>
                  </div>
                </div>

                <!-- Display Mode -->
                <template v-else>
                  <div class="bg-[#417c7d] text-white rounded-2xl rounded-br-xs px-3.5 py-2 text-xs shadow-xs leading-relaxed break-words whitespace-pre-wrap select-text">
                    {{ cmt.text }}
                  </div>
                  <div class="flex items-center gap-1.5 mt-0.5 text-[10px] text-gray-400">
                    <span>{{ cmt.time || 'Just now' }}</span>
                    <!-- Edit Button -->
                    <button
                      type="button"
                      class="opacity-0 group-hover:opacity-100 transition hover:text-[#417c7d] text-gray-400 cursor-pointer p-0.5"
                      title="Edit comment"
                      @click="startEditComment(cmt)"
                    >
                      <Pencil class="size-2.5" />
                    </button>
                    <!-- Delete Button -->
                    <button
                      v-if="cmt.can_delete || cmt.id"
                      type="button"
                      class="opacity-0 group-hover:opacity-100 transition hover:text-rose-600 text-gray-400 cursor-pointer p-0.5"
                      title="Delete comment"
                      @click="deleteComment(cmt.id, idx)"
                    >
                      <Trash2 class="size-2.5" />
                    </button>
                  </div>
                </template>
              </div>

              <!-- OTHER USERS MESSAGE (Left-Aligned) -->
              <div
                v-else
                class="flex items-start gap-2 group max-w-[90%] mr-auto"
              >
                <span
                  class="size-5 rounded-full text-white font-bold text-[9px] flex items-center justify-center shrink-0 mt-0.5"
                  :class="getAvatarColor(cmt.author)"
                >
                  {{ getInitials(cmt.author) }}
                </span>
                <div class="flex flex-col items-start min-w-0 flex-1">
                  <span class="text-[10px] font-semibold text-gray-600 mb-0.5 truncate max-w-[150px]">
                    {{ cmt.author }}
                  </span>

                  <!-- Edit Mode for other user (if permitted) -->
                  <div v-if="editingCommentId === cmt.id" class="w-full space-y-1.5">
                    <textarea
                      v-model="editingCommentText"
                      rows="2"
                      class="w-full bg-white border border-[#417c7d] focus:ring-2 focus:ring-[#417c7d]/20 rounded-xl px-2.5 py-1.5 text-xs text-gray-800 outline-none resize-none transition leading-normal"
                      placeholder="Edit comment..."
                      @keydown.enter.exact.prevent="saveEditComment(cmt, idx)"
                      @keydown.escape.prevent="cancelEditComment"
                    ></textarea>
                    <div class="flex items-center justify-end gap-1.5 text-[11px]">
                      <button
                        type="button"
                        class="px-2 py-0.5 rounded text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition cursor-pointer"
                        @click="cancelEditComment"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        :disabled="updatingComment || !editingCommentText.trim()"
                        class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded bg-[#417c7d] hover:bg-[#366869] text-white font-semibold shadow-2xs transition cursor-pointer disabled:opacity-50"
                        @click="saveEditComment(cmt, idx)"
                      >
                        <Loader2 v-if="updatingComment" class="size-3 animate-spin" />
                        <span>Save</span>
                      </button>
                    </div>
                  </div>

                  <!-- Display Mode -->
                  <template v-else>
                    <div class="bg-gray-100 hover:bg-gray-100/90 text-gray-800 border border-gray-200/80 rounded-2xl rounded-tl-xs px-3.5 py-2 text-xs leading-relaxed break-words whitespace-pre-wrap select-text">
                      {{ cmt.text }}
                    </div>
                    <div class="flex items-center gap-1.5 mt-0.5 text-[10px] text-gray-400">
                      <span>{{ cmt.time }}</span>
                      <button
                        v-if="cmt.can_edit"
                        type="button"
                        class="opacity-0 group-hover:opacity-100 transition hover:text-[#417c7d] text-gray-400 cursor-pointer p-0.5"
                        title="Edit comment"
                        @click="startEditComment(cmt)"
                      >
                        <Pencil class="size-2.5" />
                      </button>
                      <button
                        v-if="cmt.can_delete"
                        type="button"
                        class="opacity-0 group-hover:opacity-100 transition hover:text-rose-600 text-gray-400 cursor-pointer p-0.5"
                        title="Delete comment"
                        @click="deleteComment(cmt.id, idx)"
                      >
                        <Trash2 class="size-2.5" />
                      </button>
                    </div>
                  </template>
                </div>
              </div>
            </template>
          </div>

          <!-- Activity Audit Tab Content -->
          <div v-else class="flex-1 overflow-y-auto p-3 space-y-2.5 min-h-0 text-xs">
            <div v-if="activityLog.length === 0" class="py-8 text-center text-gray-400 space-y-1 select-none">
              <Clock class="size-5 mx-auto stroke-1 text-gray-300 mb-1" />
              <p class="text-xs font-semibold text-gray-600">No activity logged</p>
              <p class="text-[11px] text-gray-400">Activity changes will appear here.</p>
            </div>
            <div
              v-else
              v-for="(act, idx) in activityLog"
              :key="idx"
              class="flex items-start gap-2 text-gray-600 pb-2 border-b border-gray-100 last:border-b-0"
            >
              <div class="size-1.5 rounded-full bg-[#417c7d] mt-1.5 shrink-0"></div>
              <div class="flex-1">
                <p><strong class="text-gray-900">{{ act.user }}</strong> {{ act.action }}</p>
                <span class="text-[10px] text-gray-400">{{ act.time }}</span>
              </div>
            </div>
          </div>

          <!-- Comment Input Box (Pinned at bottom, compact, no extra gap, clean border-t) -->
          <div class="p-2.5 bg-gray-50/60 space-y-1.5 shrink-0 border-t border-gray-200">
            <textarea
              v-model="newComment"
              rows="2"
              placeholder="Write a comment... (Enter to send, Shift+Enter for newline)"
              class="w-full bg-white border border-gray-200 hover:border-gray-300 focus:border-[#417c7d] focus:ring-2 focus:ring-[#417c7d]/15 rounded-xl px-2.5 py-1.5 text-xs text-gray-800 outline-none transition resize-none placeholder-gray-400 leading-normal"
              @keydown.enter.exact.prevent="addComment"
              @keydown.meta.enter="addComment"
              @keydown.ctrl.enter="addComment"
            ></textarea>

            <div class="flex items-center justify-between">
              <!-- Mention, Attach, Emoji Actions -->
              <div class="flex items-center gap-0.5 text-gray-400">
                <button
                  type="button"
                  class="p-1 hover:text-gray-700 hover:bg-gray-200/60 rounded-md transition cursor-pointer"
                  title="Mention someone (@)"
                  @click="insertMentionShortcut"
                >
                  <AtSign class="size-3.5" />
                </button>
                <label class="p-1 hover:text-gray-700 hover:bg-gray-200/60 rounded-md transition cursor-pointer" title="Attach file">
                  <Paperclip class="size-3.5" />
                  <input type="file" class="sr-only" @change="handleFileUpload" />
                </label>
                <button
                  type="button"
                  class="p-1 hover:text-gray-700 hover:bg-gray-200/60 rounded-md transition cursor-pointer"
                  title="Add emoji"
                >
                  <Smile class="size-3.5" />
                </button>
              </div>

              <!-- Submit Comment Button -->
              <button
                type="button"
                :disabled="!newComment.trim() || submittingComment"
                class="inline-flex items-center gap-1.5 px-3 py-1 bg-[#417c7d] hover:bg-[#366869] active:bg-[#2b5354] disabled:opacity-40 text-white font-semibold text-xs rounded-lg shadow-xs transition cursor-pointer"
                @click="addComment"
              >
                <Loader2 v-if="submittingComment" class="size-3 animate-spin" />
                <Send v-else class="size-3" />
                <span>{{ submittingComment ? 'Sending...' : 'Send' }}</span>
              </button>
            </div>
          </div>
        </aside>
      </div>
    </div>
  </div>
</template>

<script>
import { MultiSelect, DatePicker, Button, toast } from 'frappe-ui'
import dayjs from 'dayjs'
import {
  fetchTaskComments,
  addTaskComment,
  updateTaskComment,
  deleteTaskComment,
  saveTask,
  deleteTask,
  getErrorMessage,
  fetchTeamMembers,
  fetchTaskAttachments,
  deleteTaskAttachment,
  uploadTaskAttachment,
} from '../data/api'
import TaskRichEditor from './TaskRichEditor.vue'
import {
  ArrowLeft,
  Cloud,
  Check,
  Info,
  X,
  Plus,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  CheckCircle,
  ChevronRight,
  ChevronDown,
  ChevronsUpDown,
  User,
  Clock,
  UploadCloud,
  Download,
  FileText,
  Image,
  SlidersHorizontal,
  AtSign,
  Paperclip,
  Smile,
  Flag,
  Search,
  Trash2,
  Ticket,
  MessageSquare,
  Loader2,
  Send,
  Pencil,
  ExternalLink,
  Bug,
  Sparkles,
  CheckSquare,
} from 'lucide-vue-next'

export default {
  name: 'TaskDetailModal',
  components: {
    Button,
    DatePicker,
    MultiSelect,
    TaskRichEditor,
    ArrowLeft,
    Cloud,
    Check,
    Info,
    X,
    Plus,
    Calendar,
    AlertTriangle,
    CheckCircle2,
    CheckCircle,
    ChevronRight,
    ChevronDown,
    ChevronsUpDown,
    User,
    Clock,
    UploadCloud,
    Download,
    FileText,
    Image,
    SlidersHorizontal,
    AtSign,
    Paperclip,
    Smile,
    Flag,
    Search,
    Trash2,
    Ticket,
    MessageSquare,
    Loader2,
    Send,
    Pencil,
    ExternalLink,
    Bug,
    Sparkles,
    CheckSquare,
  },
  props: {
    modelValue: {
      type: Boolean,
      default: false,
    },
    currentUser: {
      type: String,
      default: '',
    },
    task: {
      type: Object,
      default: null,
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
    onSave: {
      type: Function,
      default: null,
    },
    onDelete: {
      type: Function,
      default: null,
    },
  },
  emits: ['update:modelValue', 'save', 'delete', 'close'],
  data() {
    return {
      saving: false,
      deleting: false,
      errorMessage: '',
      loadingComments: false,
      submittingComment: false,
      updatingComment: false,
      editingCommentId: null,
      editingCommentText: '',
      newComment: '',
      activeRightTab: 'comments',
      localTeamMembers: [],
      taskTypes: ['Task', 'Bug', 'Customization Request'],
      form: {
        id: '',
        title: '',
        description: '',
        status: 'Open',
        priority: 'Medium',
        task_type: 'Task',
        project: '',
        team: '',
        assignees: [],
        assigned_to: '',
        reporter: '',
        pending_with: '',
        pending_from: '',
        guided_by: '',
        responsible_person: '',
        start_date: '',
        due_date: '',
        expected_resolution_date: '',
        completed_on: '',
        estimated_hours: '',
        logged_hours: '',
        ticket_date: '',
        toll_id: '',
        ticket_id: '',
        ticket_raised_by: '',
        ticket_description: '',
      },
      attachments: [],
      uploadingAttachment: false,
      comments: [],
      activityLog: [],
      rowCls: 'w-full rounded px-2.5 py-1.5 text-left text-xs font-medium text-ink-gray-7 hover:bg-surface-gray-2 hover:text-ink-gray-9 transition cursor-pointer whitespace-nowrap',
    }
  },
  watch: {
    task: {
      immediate: true,
      handler(t) {
        if (t) {
          let assigneesList = []
          if (Array.isArray(t.assignees)) {
            assigneesList = t.assignees.map((a) => (typeof a === 'object' ? (a.user_id || a.value || a.email || a.name) : a)).filter(Boolean)
          } else if (Array.isArray(t.table_gqbl)) {
            assigneesList = t.table_gqbl.map((row) => row.user_id || row.employee_name).filter(Boolean)
          } else if (typeof t.assigned_to === 'string' && t.assigned_to.trim()) {
            assigneesList = t.assigned_to.split(',').map((s) => s.trim()).filter(Boolean)
          }

          const matchedTeam = t.team || ((this.projects || []).find((p) => p.name === t.project || p.display_name === t.project)?.team) || ''

          this.form = {
            id: t.id || '',
            title: t.title || '',
            description: t.description || '',
            status: t.status || 'Open',
            priority: t.priority || 'Medium',
            task_type: t.task_type || (Array.isArray(t.labels) && t.labels[0]) || 'Task',
            project: t.project || '',
            team: matchedTeam || '',
            assignees: assigneesList,
            assigned_to: t.assigned_to || '',
            reporter: t.reporter || t.owner || '',
            pending_with: t.pending_with || '',
            pending_from: t.pending_from || '',
            guided_by: t.guided_by || '',
            responsible_person: t.responsible_person || '',
            start_date: this.normalizeDate(t.start_date),
            due_date: this.normalizeDate(t.due_date || t.due),
            expected_resolution_date: this.normalizeDate(t.expected_resolution_date),
            completed_on: this.normalizeDate(t.completed_on),
            estimated_hours: t.estimated_hours != null && t.estimated_hours !== 0 ? t.estimated_hours : '',
            logged_hours: t.logged_hours != null && t.logged_hours !== 0 ? t.logged_hours : '',
            ticket_date: this.normalizeDate(t.ticket_date),
            toll_id: t.toll_id || '',
            ticket_id: t.ticket_id || '',
            ticket_raised_by: t.ticket_raised_by || '',
            ticket_description: t.ticket_description || '',
          }

          if (Array.isArray(t.comments) && t.comments.length > 0) {
            this.comments = [...t.comments]
          } else {
            this.comments = []
          }

          if (Array.isArray(t.attachments) && t.attachments.length > 0) {
            this.attachments = [...t.attachments]
          } else {
            this.attachments = []
          }

          // Fetch fresh real comments from Frappe Comment doctype
          if (t.id && t.id !== 'new') {
            this.loadActualComments(t.id)
            this.loadActualAttachments(t.id)
          }

          if (matchedTeam) {
            this.loadTeamMembersForTeam(matchedTeam)
          }
        }
      },
    },
    modelValue(val) {
      if (val) {
        window.addEventListener('keydown', this.handleKeyDown)
      } else {
        window.removeEventListener('keydown', this.handleKeyDown)
      }
    },
  },
  beforeUnmount() {
    window.removeEventListener('keydown', this.handleKeyDown)
  },
  computed: {
    effectiveTeam() {
      if (this.form.team) return this.form.team
      if (this.task && this.task.team) return this.task.team
      const proj = (this.projects || []).find(
        (p) => p.name === this.form.project || p.display_name === this.form.project
      )
      if (proj && proj.team) return proj.team
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

      // If no team is associated yet, show all accessible team members
      if (!team && this.allAvailableTeamMembers.length > 0) {
        return this.allAvailableTeamMembers.map((m) => ({
          value: m.user || m.employee,
          label: m.employee_name ? `${m.employee_name} (${m.team})` : (m.user || m.employee),
        }))
      }

      return []
    },
    isOverdue() {
      if (this.form.status === 'Overdue') return true
      if (!this.form.due_date) return false
      const today = new Date().toISOString().slice(0, 10)
      return this.form.due_date < today && this.form.status !== 'Completed' && this.form.status !== 'Cancelled'
    },
    updatedTimeAgo() {
      return 'Just now'
    },
    displayStartDate: {
      get() {
        return this.formatDateDisplay(this.form.start_date)
      },
      set(val) {
        this.form.start_date = this.parseDateInput(val)
      },
    },
    displayDueDate: {
      get() {
        return this.formatDateDisplay(this.form.due_date)
      },
      set(val) {
        this.form.due_date = this.parseDateInput(val)
      },
    },
    displayResolutionDate: {
      get() {
        return this.formatDateDisplay(this.form.expected_resolution_date)
      },
      set(val) {
        this.form.expected_resolution_date = this.parseDateInput(val)
      },
    },
    displayCompletedOn: {
      get() {
        return this.formatDateDisplay(this.form.completed_on)
      },
      set(val) {
        this.form.completed_on = this.parseDateInput(val)
      },
    },
    displayTicketDate: {
      get() {
        return this.formatDateDisplay(this.form.ticket_date)
      },
      set(val) {
        this.form.ticket_date = this.parseDateInput(val)
      },
    },
  },
  methods: {
    getAssigneeValue(assignee) {
      if (!assignee) return ''
      return typeof assignee === 'object' ? (assignee.value || assignee.user_id || assignee.email || assignee.name) : assignee
    },
    getAssigneeName(assignee) {
      if (typeof assignee === 'object' && assignee.name && !assignee.name.includes('@')) {
        return assignee.name
      }
      const val = this.getAssigneeValue(assignee)
      if (!val) return ''
      const member = (this.allAvailableTeamMembers || []).find(
        (m) => m.user === val || m.employee === val || m.employee_name === val || m.name === val
      )
      if (member && member.employee_name) return member.employee_name
      const p = (this.people || []).find((x) => x.email === val || x.name === val)
      return p ? (p.name || p.email) : val
    },
    onProjectChange() {
      const selected = (this.projects || []).find(
        (p) => p.name === this.form.project || p.display_name === this.form.project
      )
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
    removeAssignee(assignee) {
      const targetVal = this.getAssigneeValue(assignee)
      this.form.assignees = this.form.assignees.filter((a) => this.getAssigneeValue(a) !== targetVal)
    },
    async loadActualComments(taskId) {
      if (!taskId) return
      this.loadingComments = true
      try {
        const comments = await fetchTaskComments(taskId)
        if (Array.isArray(comments) && comments.length > 0) {
          this.comments = comments
          this.$nextTick(() => {
            this.scrollToBottom()
          })
        }
      } catch (err) {
        console.warn('Failed to load actual comments:', err)
      } finally {
        this.loadingComments = false
      }
    },
    getDefaultDescription() {
      return ''
    },
    formatDateDisplay(isoDate) {
      if (!isoDate) return ''
      const parts = String(isoDate).split('-')
      if (parts.length === 3) {
        const [y, m, d] = parts
        return `${d}-${m}-${y}`
      }
      return isoDate
    },
    parseDisplayDate(displayDate) {
      if (!displayDate) return ''
      const parts = String(displayDate).trim().split(/[-/]/)
      if (parts.length === 3) {
        const [d, m, y] = parts
        if (y && y.length === 4) {
          return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
        }
      }
      return displayDate
    },
    parseDateInput(val) {
      return this.parseDisplayDate(val)
    },
    applyQuickDate(setDate, amount, unit, close) {
      const d = amount === 0 ? dayjs() : dayjs().add(amount, unit)
      setDate(d)
      if (typeof close === 'function') {
        close()
      }
    },
    normalizeDate(val) {
      if (!val) return ''
      const str = String(val).trim()
      if (str.length >= 10 && str[4] === '-' && str[7] === '-') {
        return str.slice(0, 10)
      }
      const d = dayjs(str)
      return d.isValid() ? d.format('YYYY-MM-DD') : ''
    },
    onNativeDateChange(e) {
      this.form.due_date = e.target.value
    },
    onStartDateChange(e) {
      this.form.start_date = e.target.value
    },
    getInitials(name) {
      if (!name) return 'U'
      const parts = name.trim().split(/\s+/)
      if (parts.length >= 2) {
        return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
      }
      return parts[0].slice(0, 2).toUpperCase()
    },
    getAvatarColor(name) {
      const colors = [
        'bg-[#417c7d]',
        'bg-blue-600',
        'bg-emerald-600',
        'bg-indigo-600',
        'bg-amber-600',
      ]
      const charCode = (name || '').charCodeAt(0) || 0
      return colors[charCode % colors.length]
    },
    isCurrentUser(cmt) {
      if (!cmt) return false
      if (cmt.is_current_user) return true
      if (cmt.author === 'You') return true
      const me = (this.currentUser || window.frappe?.session?.user || window.frappe_user || '').toLowerCase().trim()
      if (me) {
        if (cmt.author_email && cmt.author_email.toLowerCase().trim() === me) return true
        if (cmt.owner && cmt.owner.toLowerCase().trim() === me) return true
        if (cmt.comment_by && cmt.comment_by.toLowerCase().trim() === me) return true
        if (cmt.author && cmt.author.toLowerCase().trim() === me) return true
      }
      return false
    },
    scrollToBottom() {
      const el = this.$refs.commentsContainer
      if (el) {
        el.scrollTop = el.scrollHeight
      }
    },
    close() {
      this.$emit('update:modelValue', false)
      this.$emit('close')
    },
    handleKeyDown(e) {
      if (e.key === 'Escape') {
        this.close()
      } else if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault()
        this.save()
      }
    },
    async addComment() {
      const text = this.newComment.trim()
      if (!text || this.submittingComment) return

      this.submittingComment = true
      try {
        let added = null
        if (this.form.id && this.form.id !== 'new') {
          added = await addTaskComment(this.form.id, text)
        }
        if (!added) {
          added = {
            id: `temp-${Date.now()}`,
            author: 'You',
            time: 'Just now',
            text: text,
            can_delete: true,
            is_current_user: true,
          }
        }
        this.comments.push(added)
        this.activityLog.unshift({
          user: added.author || 'You',
          action: 'added a new comment',
          time: 'Just now',
        })
        this.newComment = ''
        this.$nextTick(() => {
          this.scrollToBottom()
        })
      } catch (e) {
        console.error('Error posting comment:', e)
      } finally {
        this.submittingComment = false
      }
    },
    startEditComment(cmt) {
      this.editingCommentId = cmt.id
      this.editingCommentText = cmt.text || ''
    },
    cancelEditComment() {
      this.editingCommentId = null
      this.editingCommentText = ''
    },
    async saveEditComment(cmt, index) {
      const newText = (this.editingCommentText || '').trim()
      if (!newText) {
        toast.error('Comment text cannot be empty')
        return
      }
      this.updatingComment = true
      try {
        if (cmt.id && !String(cmt.id).startsWith('temp-')) {
          await updateTaskComment(cmt.id, newText)
        }
        if (this.comments[index]) {
          this.comments[index].text = newText
        }
        this.editingCommentId = null
        this.editingCommentText = ''
        toast.success('Comment updated')
      } catch (err) {
        console.error('Error updating comment:', err)
        const msg = getErrorMessage(err, 'Failed to update comment')
        toast.error(msg)
      } finally {
        this.updatingComment = false
      }
    },
    async deleteComment(commentId, index) {
      if (!confirm('Are you sure you want to delete this comment?')) return
      try {
        if (commentId && !String(commentId).startsWith('temp-')) {
          await deleteTaskComment(commentId)
        }
        this.comments.splice(index, 1)
        this.activityLog.unshift({
          user: 'You',
          action: 'deleted a comment',
          time: 'Just now',
        })
        toast.success('Comment deleted')
      } catch (e) {
        console.error('Error deleting comment:', e)
        const msg = getErrorMessage(e, 'Failed to delete comment')
        toast.error(msg)
      }
    },
    insertMentionShortcut() {
      this.newComment += ' @'
    },
    isImageFile(att) {
      if (!att) return false
      const name = att.name || att.file_name || ''
      const type = att.type || ''
      return (
        type === 'Image' ||
        type === 'PNG Image' ||
        type.startsWith('image/') ||
        /\.(png|jpe?g|gif|webp|svg|bmp)$/i.test(name)
      )
    },
    getFileExtension(att) {
      const name = att?.name || att?.file_name || ''
      const parts = name.split('.')
      if (parts.length > 1) {
        return parts.pop().toUpperCase()
      }
      return 'FILE'
    },
    getFileTypeConfig(att) {
      if (this.isImageFile(att)) {
        return {
          badge: 'IMG',
          color: 'bg-teal-50 text-[#417c7d] border-teal-200',
          iconColor: 'text-[#417c7d]',
        }
      }
      const ext = this.getFileExtension(att).toLowerCase()
      if (['pdf'].includes(ext)) {
        return {
          badge: 'PDF',
          color: 'bg-rose-50 text-rose-700 border-rose-200',
          iconColor: 'text-rose-600',
        }
      }
      if (['xls', 'xlsx', 'csv'].includes(ext)) {
        return {
          badge: ext.toUpperCase(),
          color: 'bg-emerald-50 text-emerald-700 border-emerald-200',
          iconColor: 'text-emerald-600',
        }
      }
      if (['doc', 'docx', 'txt', 'rtf'].includes(ext)) {
        return {
          badge: ext.toUpperCase(),
          color: 'bg-blue-50 text-blue-700 border-blue-200',
          iconColor: 'text-blue-600',
        }
      }
      if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) {
        return {
          badge: 'ZIP',
          color: 'bg-amber-50 text-amber-700 border-amber-200',
          iconColor: 'text-amber-600',
        }
      }
      return {
        badge: ext ? ext.slice(0, 4).toUpperCase() : 'FILE',
        color: 'bg-gray-100 text-gray-700 border-gray-200',
        iconColor: 'text-gray-500',
      }
    },
    async loadActualAttachments(taskId) {
      if (!taskId || taskId === 'new') return
      try {
        const atts = await fetchTaskAttachments(taskId)
        if (Array.isArray(atts)) {
          this.attachments = atts
        }
      } catch (err) {
        console.warn('Failed to load attachments for task:', taskId, err)
      }
    },
    async confirmDeleteAttachment(att, idx) {
      const fileName = att?.name || att?.file_name || 'this attachment'
      if (!confirm(`Are you sure you want to delete "${fileName}"?`)) {
        return
      }

      const fileId = att?.id || att?.name
      try {
        if (fileId && !String(fileId).startsWith('temp-')) {
          await deleteTaskAttachment(fileId)
        }
        this.attachments.splice(idx, 1)
        toast.success(`Deleted "${fileName}"`)
      } catch (err) {
        const msg = getErrorMessage(err, 'Failed to delete attachment')
        toast.error(msg)
      }
    },
    async handleFileUpload(e) {
      const files = Array.from(e.target.files || [])
      if (files.length === 0) return

      const taskId = this.form.id || this.task?.id
      this.uploadingAttachment = true
      for (const file of files) {
        if (taskId && taskId !== 'new') {
          try {
            const uploaded = await uploadTaskAttachment(taskId, file)
            if (uploaded) {
              const fname = uploaded.file_name || file.name
              const fsize = uploaded.file_size || file.size
              const sizeStr = fsize > 1024 * 1024
                ? `${(fsize / (1024 * 1024)).toFixed(1)} MB`
                : `${Math.round(fsize / 1024)} KB`
              this.attachments.push({
                id: uploaded.name,
                name: fname,
                url: uploaded.file_url,
                file_url: uploaded.file_url,
                size: sizeStr,
                type: file.type || 'Document',
              })
              toast.success(`Attached "${file.name}"`)
            }
          } catch (err) {
            console.error('Failed to upload file:', err)
            const msg = getErrorMessage(err, 'Failed to upload attachment')
            toast.error(msg)
          }
        } else {
          this.attachments.push({
            id: `temp-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            name: file.name,
            size: `${Math.round(file.size / 1024)} KB`,
            type: file.type || 'Document',
            url: URL.createObjectURL(file),
            rawFile: file,
          })
          toast.info(`Attached "${file.name}"`)
        }
      }
      this.uploadingAttachment = false
      if (e.target) {
        e.target.value = ''
      }
    },
    async save() {
      if (!this.form.title || !this.form.title.trim()) {
        this.errorMessage = 'Task title is required'
        toast.error('Task title is required')
        return
      }
      this.saving = true
      this.errorMessage = ''
      const assigneeIds = (this.form.assignees || []).map((a) => this.getAssigneeValue(a)).filter(Boolean)
      const updated = {
        ...this.task,
        ...this.form,
        id: this.form.id || this.task?.id,
        team: this.effectiveTeam || this.form.team || this.task?.team || '',
        assignees: assigneeIds,
        assigned_to: assigneeIds.map((id) => this.getAssigneeName(id)).join(', '),
        table_gqbl: assigneeIds.map((id) => ({
          user_id: id,
          employee_name: this.getAssigneeName(id),
        })),
        comments: this.comments,
        attachments: this.attachments,
      }
      try {
        if (this.onSave) {
          await this.onSave(updated)
        } else {
          await saveTask(updated)
          this.$emit('save', updated)
          toast.success('Task saved successfully')
        }
        this.saving = false
        this.close()
      } catch (err) {
        this.saving = false
        const msg = getErrorMessage(err, 'Failed to save task')
        this.errorMessage = msg
        toast.error(msg)
      }
    },
    async confirmDelete() {
      const taskId = this.form.id || this.task?.id
      if (!taskId) return
      if (!confirm(`Are you sure you want to delete task "${this.form.title || taskId}"? This action cannot be undone.`)) {
        return
      }
      this.deleting = true
      this.errorMessage = ''
      try {
        if (this.onDelete) {
          await this.onDelete(taskId)
        } else {
          await deleteTask(taskId)
          this.$emit('delete', taskId)
          toast.success('Task deleted successfully')
        }
        this.deleting = false
        this.close()
      } catch (err) {
        this.deleting = false
        const msg = getErrorMessage(err, 'Failed to delete task')
        this.errorMessage = msg
        toast.error(msg)
      }
    },
    getStatusSelectClass(status) {
      switch (status) {
        case 'Completed':
          return 'bg-emerald-50 text-emerald-700 border-emerald-300'
        case 'Overdue':
          return 'bg-rose-50 text-rose-700 border-rose-300'
        case 'On Hold':
          return 'bg-blue-50 text-blue-700 border-blue-300'
        case 'In Progress':
          return 'bg-indigo-50 text-indigo-700 border-indigo-300'
        case 'Review':
          return 'bg-purple-50 text-purple-700 border-purple-300'
        default:
          return 'bg-gray-100 text-gray-700 border-gray-300'
      }
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
          return 'bg-gray-400'
      }
    },
    getTaskTypeSelectClass(type) {
      switch (type) {
        case 'Bug':
          return 'bg-rose-50/80 text-rose-700 border-rose-200'
        case 'Customization Request':
          return 'bg-purple-50/80 text-purple-700 border-purple-200'
        default:
          return 'bg-teal-50/80 text-teal-800 border-teal-200'
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
      return 'text-teal-700'
    },
  },
}
</script>
