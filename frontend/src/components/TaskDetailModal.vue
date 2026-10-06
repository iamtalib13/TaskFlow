<template>
  <div
    v-if="modelValue"
    class="w-full h-full min-h-0 flex flex-col overflow-hidden"
    aria-labelledby="task-title-input"
  >
    <div
      class="bg-surface-base dark:bg-neutral-900 w-full h-full min-h-0 flex flex-col overflow-hidden"
    >
      <!-- Task primary controls: rendered into the Tasks page header (#task-form-header-slot)
           so they sit on the same bar as the breadcrumb, without exposing the form state. -->
      <Teleport to="#task-form-header-slot">
        <div class="flex items-center gap-1.5 sm:gap-2">
          <!-- Task Type: frappe-ui Select, type icon in the prefix slot -->
          <Select
            v-model="form.task_type"
            :options="taskTypeOptions"
            size="sm"
            variant="subtle"
            side="bottom"
            :disabled="saving || deleting"
            class="w-[9.5rem] shrink-0"
          >
            <template #prefix>
              <component
                :is="getTaskTypeIcon(form.task_type)"
                class="size-3 shrink-0"
                :class="getTaskTypeIconClass(form.task_type)"
              />
            </template>
            <template #item-prefix="{ item }">
              <component
                :is="getTaskTypeIcon(item.value)"
                class="size-3 shrink-0"
                :class="getTaskTypeIconClass(item.value)"
              />
            </template>
          </Select>

          <!-- Priority: frappe-ui Select, flag in the prefix slot.
               `sm:inline-flex`, not `sm:block` — Select puts this class straight on
               its trigger button, and forcing display:block there drops the
               trigger out of flex layout (it grew to 47px vs the 28px its
               siblings render at) and scattered the flag/value/chevron. -->
          <Select
            v-model="form.priority"
            :options="priorityOptions"
            size="sm"
            variant="subtle"
            side="bottom"
            :disabled="saving || deleting"
            class="w-[7.5rem] shrink-0 hidden sm:inline-flex"
          >
            <template #prefix>
              <Flag class="size-2.5 shrink-0" :class="getPriorityFlagClass(form.priority)" />
            </template>
            <template #item-prefix="{ item }">
              <Flag class="size-2.5 shrink-0" :class="getPriorityFlagClass(item.value)" />
            </template>
          </Select>
        </div>
      </Teleport>

      <!-- Autosave indicator + form actions: rendered into the page header's action group
           so the form no longer needs a header bar of its own. -->
      <Teleport to="#task-form-actions-slot">
        <div class="flex items-center gap-2 sm:gap-3 shrink-0">
          <!-- Save Status Indicator -->
          <div
            class="flex items-center gap-1.5 px-2 py-0.5 rounded-md transition-colors"
            :class="isDirty && !saving ? 'bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60' : ''"
          >
            <span
              class="size-2 rounded-full shrink-0"
              :class="saving ? 'bg-amber-500 animate-pulse' : (isDirty ? 'bg-red-600 dark:bg-red-500 animate-pulse' : 'bg-teal-600')"
            ></span>
            <span
              class="text-xs transition-colors"
              :class="saving ? 'text-amber-600 dark:text-amber-400 font-medium' : (isDirty ? 'text-red-600 dark:text-red-500 font-bold' : 'text-ink-gray-4 font-normal')"
              :style="isDirty && !saving ? 'color: #dc2626 !important; font-weight: 700;' : ''"
            >
              {{ saving ? 'Saving...' : (isDirty ? 'Please Save' : 'Saved') }}
            </span>
          </div>

          <!-- Secondary actions (Share / Delete) tucked behind an overflow menu.
               Placed before the status picker and Save so Save stays the last,
               most prominent control on the right. -->
          <Dropdown :options="overflowMenuOptions" align="end">
            <template #trigger>
              <button
                type="button"
                class="p-1.5 text-ink-gray-4 hover:text-ink-gray-7 hover:bg-surface-gray-3 rounded-md transition-colors cursor-pointer"
                title="More actions"
                :disabled="saving || deleting"
              >
                <MoreHorizontal class="size-3.5" />
              </button>
            </template>
          </Dropdown>

          <!-- Status: frappe-ui Select, status dot in the prefix slot -->
          <Select
            v-model="form.status"
            :options="statusOptions"
            size="sm"
            variant="subtle"
            side="bottom"
            :disabled="saving || deleting"
            class="w-[8.5rem] shrink-0"
            @update:model-value="onStatusChange"
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
          </Select>

          <!-- Save Task Button -->
          <Button
            variant="solid"
            :loading="saving"
            :disabled="saving || deleting"
            @click="save"
            class="shrink-0"
          >
            <template #prefix>
              <Check v-if="!saving" class="size-3 stroke-[3]" />
            </template>
            Save Task
          </Button>
        </div>
      </Teleport>

      <!-- Error Message Banner -->
      <div
        v-if="errorMessage"
        class="px-6 py-2 bg-rose-50 border-b border-rose-200 text-rose-700 text-xs flex items-center justify-between shrink-0"
      >
        <span class="font-medium flex items-center gap-1.5">
          <AlertTriangle class="size-3.5 text-rose-500 shrink-0" />
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

      <!-- 3-COLUMN BALANCED DESKTOP LAYOUT -->
      <main class="flex-1 flex flex-col lg:flex-row overflow-hidden">
        
        <!-- FAR LEFT PANEL: Responsibilities & Status -->
        <aside
          aria-label="Responsibilities Panel"
          class="w-full lg:w-72 lg:shrink-0 border-b lg:border-b-0 lg:border-r border-outline-gray-2 bg-surface-gray-1 flex flex-col overflow-y-auto"
        >
          <div class="p-4 space-y-5">
            <!-- Section: Assignment -->
            <div class="space-y-3">
              <div class="flex items-center justify-between">
                <h2 class="text-xs font-semibold text-ink-gray-6">Assignment</h2>
                <span class="font-mono text-[10px] text-ink-gray-4">{{ form.id || 'NEW' }}</span>
              </div>

              <div class="space-y-3.5">
                <!-- Project -->
                <div class="space-y-1">
                  <div class="flex items-center justify-between">
                    <label class="text-[11px] font-medium text-ink-gray-5">Project</label>
                    <button
                      v-if="form.project"
                      type="button"
                      class="text-[11px] font-medium text-ink-gray-4 hover:text-ink-gray-7 transition-colors cursor-pointer"
                      @click="form.project = ''; onProjectChange()"
                    >
                      Clear
                    </button>
                  </div>
                  <Combobox
                    v-model="form.project"
                    v-model:query="projectSearchQuery"
                    :options="projectOptions"
                    :filterable="false"
                    placeholder="Search and select project..."
                    size="sm"
                    variant="subtle"
                    class="w-full"
                    @change="onProjectChange"
                  >
                    <template #item-label="{ item }">
                      <div class="min-w-0 flex-1 py-0.5">
                        <div class="truncate font-medium text-xs text-ink-gray-8 dark:text-gray-100">
                          {{ item.label }}
                        </div>
                        <div v-if="item.team" class="truncate text-[11px] text-ink-gray-5 dark:text-gray-400">
                          Team: {{ item.team }}
                        </div>
                      </div>
                    </template>
                  </Combobox>
                </div>

                <!-- Parent Project -->
                <div class="space-y-1">
                  <div class="flex items-center justify-between">
                    <label class="text-[11px] font-medium text-ink-gray-5">Parent Project</label>
                    <button
                      v-if="form.parent_project"
                      type="button"
                      class="text-[11px] font-medium text-ink-gray-4 hover:text-ink-gray-7 transition-colors cursor-pointer"
                      @click="form.parent_project = ''"
                    >
                      Clear
                    </button>
                  </div>
                  <Combobox
                    v-model="form.parent_project"
                    v-model:query="parentProjectSearchQuery"
                    :options="parentProjectOptions"
                    :filterable="false"
                    placeholder="Search and select parent project..."
                    size="sm"
                    variant="subtle"
                    class="w-full"
                  >
                    <template #item-label="{ item }">
                      <div class="min-w-0 flex-1 py-0.5">
                        <div class="truncate font-medium text-xs text-ink-gray-8 dark:text-gray-100">
                          {{ item.label }}
                        </div>
                      </div>
                    </template>
                  </Combobox>
                </div>

                <!-- Task Created By -->
                <div class="space-y-1">
                  <label class="text-[11px] font-medium text-ink-gray-5">Task Created By</label>
                  <div
                    class="flex items-center gap-2 rounded-md border border-outline-gray-2 bg-surface-base px-2 py-1.5 select-none"
                  >
                    <div
                      v-if="taskCreator"
                      class="size-5 shrink-0 rounded-full text-white text-[9px] font-semibold flex items-center justify-center"
                      :class="getAvatarColor(taskCreator)"
                    >
                      {{ getInitials(taskCreator) }}
                    </div>
                    <div class="min-w-0 flex-1">
                      <p
                        class="truncate text-xs font-medium"
                        :class="taskCreator ? 'text-ink-gray-8' : 'text-ink-gray-4'"
                      >
                        {{ taskCreator || '—' }}
                      </p>
                      <p
                        v-if="taskCreatorEmail && taskCreatorEmail !== taskCreator"
                        class="truncate text-[10px] text-ink-gray-4"
                      >
                        {{ taskCreatorEmail }}
                      </p>
                    </div>
                  </div>
                </div>

                <!-- Assigned To -->
                <div class="space-y-1.5">
                  <div class="flex items-center justify-between">
                    <label class="text-[11px] font-medium text-ink-gray-5">Assigned To</label>
                    <span v-if="form.assignees && form.assignees.length > 0" class="text-[11px] text-ink-gray-4">
                      {{ form.assignees.length }} assigned
                    </span>
                  </div>

                  <div v-if="form.assignees && form.assignees.length > 0" class="space-y-1.5">
                    <div
                      v-for="assignee in form.assignees"
                      :key="getAssigneeValue(assignee)"
                      class="group flex items-center gap-2 rounded-md border border-outline-gray-2 bg-surface-base px-2 py-1.5 hover:border-outline-gray-3 transition-colors"
                    >
                      <div
                        class="size-5 shrink-0 rounded-full text-white text-[9px] font-semibold flex items-center justify-center"
                        :class="getAvatarColor(getAssigneeName(assignee))"
                      >
                        {{ getInitials(getAssigneeName(assignee)) }}
                      </div>
                      <div class="min-w-0 flex-1">
                        <p class="truncate text-xs font-medium text-ink-gray-8">
                          {{ getAssigneeName(assignee) }}
                        </p>
                        <p v-if="getAssigneeRole(assignee)" class="truncate text-[10px] text-ink-gray-4">
                          {{ getAssigneeRole(assignee) }}
                        </p>
                      </div>
                      <button
                        type="button"
                        class="shrink-0 text-ink-gray-4 hover:text-rose-600 transition-colors cursor-pointer opacity-0 group-hover:opacity-100 focus:opacity-100"
                        :title="'Remove ' + getAssigneeName(assignee)"
                        @click="removeAssignee(assignee)"
                      >
                        <X class="size-3" />
                      </button>
                    </div>
                  </div>

                  <Combobox
                    :modelValue="null"
                    v-model:query="assigneeSearchQuery"
                    :options="assigneeOptions"
                    :filterable="false"
                    :placeholder="effectiveTeam ? `+ Add ${effectiveTeam} member...` : '+ Add Assignee...'"
                    size="sm"
                    variant="subtle"
                    class="w-full"
                    trigger="button"
                    @update:modelValue="addAssignee"
                  />
                </div>
              </div>
            </div>

            <!-- Section: People & Roles -->
            <div class="space-y-3 pt-5 border-t border-outline-gray-2">
              <h2 class="text-xs font-semibold text-ink-gray-6">People &amp; Roles</h2>

              <div class="space-y-3.5">
                <div class="space-y-1 relative" ref="pendingFromRef">
                  <div class="flex items-center justify-between">
                    <label class="text-[11px] font-medium text-ink-gray-5">Pending From</label>
                    <button
                      v-if="form.pending_from"
                      type="button"
                      tabindex="-1"
                      class="text-[10px] text-ink-gray-4 hover:text-ink-gray-7 transition-colors cursor-pointer"
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
                      class="w-full text-xs bg-surface-gray-2 hover:bg-surface-gray-3 focus:bg-surface-white border border-transparent focus:border-outline-gray-3 rounded-md px-2.5 py-1.5 pr-7 text-ink-gray-8 placeholder-ink-gray-4 outline-none transition"
                      @focus="onPendingFromFocus"
                      @keydown.esc="showPendingFromDropdown = false"
                      @keydown.enter.prevent="showPendingFromDropdown = false"
                    />
                    <button
                      type="button"
                      tabindex="-1"
                      class="absolute right-1 p-1 text-ink-gray-4 hover:text-ink-gray-7 rounded transition cursor-pointer"
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
                    class="absolute left-0 bottom-full mb-1 w-full max-h-52 overflow-y-auto bg-white dark:bg-gray-800 border border-outline-gray-2 dark:border-gray-700 rounded-lg shadow-xl z-50 py-1 text-xs"
                  >
                    <div
                      v-for="opt in pendingFromOptions"
                      :key="opt"
                      class="px-2.5 py-1.5 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-between text-ink-gray-8 dark:text-gray-100 transition-colors"
                      :class="{ 'font-semibold text-primary-600 bg-gray-50 dark:bg-gray-700/50': form.pending_from === opt }"
                      @mousedown.prevent="selectPendingFromOption(opt)"
                    >
                      <span>{{ opt }}</span>
                      <Check v-if="form.pending_from === opt" class="size-3 text-primary-600" />
                    </div>
                  </div>
                </div>

                <div class="space-y-1">
                  <label class="text-[11px] font-medium text-ink-gray-5">Guided By</label>
                  <Combobox
                    v-model="form.guided_by"
                    :options="guidedByOptions"
                    placeholder="Select or search..."
                    size="sm"
                    variant="subtle"
                    class="w-full"
                  />
                </div>
              </div>
            </div>

            <!-- Section: Schedule & Dates -->
            <div class="space-y-3 pt-5 border-t border-outline-gray-2" data-purpose="schedule-section">
              <div class="flex items-center justify-between">
                <h2 class="text-xs font-semibold text-ink-gray-6">Schedule &amp; Dates</h2>
                <span class="text-[11px] font-medium text-ink-gray-4">
                  Duration: {{ computedDuration }}
                </span>
              </div>

              <div class="space-y-3.5">
                <!-- Start Date -->
                <div class="space-y-1">
                  <label class="text-[11px] font-medium text-ink-gray-5">Start Date</label>
                  <DatePicker
                    v-model="form.start_date"
                    format="DD-MM-YYYY"
                    placeholder="DD-MM-YYYY"
                    size="sm"
                    variant="subtle"
                    class="w-full text-xs"
                  >
                    <template #actions="{ setDate, close }">
                      <button type="button" :class="rowCls" @click="applyQuickDate(setDate, 0, 'day', close)">Today</button>
                      <button type="button" :class="rowCls" @click="applyQuickDate(setDate, 1, 'day', close)">Tomorrow</button>
                      <button type="button" :class="rowCls" @click="applyQuickDate(setDate, 7, 'day', close)">One Week</button>
                      <button type="button" :class="rowCls" @click="applyQuickDate(setDate, 15, 'day', close)">15 Days</button>
                      <button type="button" :class="rowCls" @click="applyQuickDate(setDate, 1, 'month', close)">1 Month</button>
                    </template>
                  </DatePicker>
                </div>

                <!-- Due Date -->
                <div class="space-y-1">
                  <div class="flex items-center justify-between">
                    <label
                      class="text-[11px] font-medium"
                      :class="isOverdue ? 'text-rose-600' : 'text-ink-gray-5'"
                    >
                      Due Date
                    </label>
                    <Badge
                      v-if="isOverdue"
                      theme="red"
                      variant="subtle"
                      size="sm"
                      :label="`${overdueDays}d overdue`"
                    />
                  </div>
                  <DatePicker
                    v-model="form.due_date"
                    format="DD-MM-YYYY"
                    placeholder="DD-MM-YYYY"
                    size="sm"
                    variant="subtle"
                    class="w-full text-xs font-medium"
                    :class="isOverdue ? 'text-rose-600' : ''"
                  >
                    <template #actions="{ setDate, close }">
                      <button type="button" :class="rowCls" @click="applyQuickDate(setDate, 0, 'day', close)">Today</button>
                      <button type="button" :class="rowCls" @click="applyQuickDate(setDate, 1, 'day', close)">Tomorrow</button>
                      <button type="button" :class="rowCls" @click="applyQuickDate(setDate, 7, 'day', close)">One Week</button>
                      <button type="button" :class="rowCls" @click="applyQuickDate(setDate, 15, 'day', close)">15 Days</button>
                      <button type="button" :class="rowCls" @click="applyQuickDate(setDate, 1, 'month', close)">1 Month</button>
                    </template>
                  </DatePicker>
                </div>

                <!-- Estimated Date -->
                <div class="space-y-1">
                  <label class="text-[11px] font-medium text-ink-gray-5">Estimated Date</label>
                  <DatePicker
                    v-model="form.expected_resolution_date"
                    format="DD-MM-YYYY"
                    placeholder="DD-MM-YYYY"
                    size="sm"
                    variant="subtle"
                    class="w-full text-xs"
                  >
                    <template #actions="{ setDate, close }">
                      <button type="button" :class="rowCls" @click="applyQuickDate(setDate, 0, 'day', close)">Today</button>
                      <button type="button" :class="rowCls" @click="applyQuickDate(setDate, 1, 'day', close)">Tomorrow</button>
                      <button type="button" :class="rowCls" @click="applyQuickDate(setDate, 7, 'day', close)">One Week</button>
                      <button type="button" :class="rowCls" @click="applyQuickDate(setDate, 15, 'day', close)">15 Days</button>
                      <button type="button" :class="rowCls" @click="applyQuickDate(setDate, 1, 'month', close)">1 Month</button>
                    </template>
                  </DatePicker>
                </div>

                <!-- Completed Date -->
                <div class="space-y-1">
                  <label class="text-[11px] font-medium text-ink-gray-5">Completed Date</label>
                  <DatePicker
                    v-model="form.completed_on"
                    format="DD-MM-YYYY"
                    placeholder="DD-MM-YYYY"
                    size="sm"
                    variant="subtle"
                    class="w-full text-xs"
                  >
                    <template #actions="{ setDate, close }">
                      <button type="button" :class="rowCls" @click="applyQuickDate(setDate, 0, 'day', close)">Today</button>
                      <button type="button" :class="rowCls" @click="applyQuickDate(setDate, 1, 'day', close)">Tomorrow</button>
                      <button type="button" :class="rowCls" @click="applyQuickDate(setDate, 7, 'day', close)">One Week</button>
                      <button type="button" :class="rowCls" @click="applyQuickDate(setDate, 15, 'day', close)">15 Days</button>
                      <button type="button" :class="rowCls" @click="applyQuickDate(setDate, 1, 'month', close)">1 Month</button>
                    </template>
                  </DatePicker>
                </div>
              </div>
            </div>
          </div>
        </aside>

        <!-- MIDDLE MAIN AREA: Work, Document Flow, Attachments, Dates & Ticket.
             No padding and no max-width here on purpose: the canvas has to sit
             flush against the sidebar divider and the comments-panel divider,
             otherwise the vertical rules float in the middle of the page
             instead of running into the page edges. Section spacing lives on
             the canvas sections themselves (p-4). -->
        <section
          aria-label="Task Content and Document Area"
          class="flex-1 overflow-y-auto border-b lg:border-b-0 lg:border-r border-outline-gray-2"
        >
          <div class="min-h-full">


            <!-- Unified Document Canvas: no outer border/radius — the page
                 background already frames it, so a card inside it only
                 doubled the edges and ate horizontal space. -->
            <div class="bg-surface-base" data-purpose="document-canvas">
              <!-- Sticky title bar. It lives outside the padded sections so the
                   divider runs the full width, and it carries its own opaque
                   background so scrolling content passes under it cleanly. -->
              <div
                class="sticky top-0 z-10 bg-surface-base border-b border-slate-200 px-4 py-2.5"
                data-purpose="task-title-section"
              >
                <input
                  id="task-title-input"
                  v-model="form.title"
                  class="w-full text-2xl font-bold text-ink-gray-9 placeholder-slate-300 border-0 border-b border-transparent hover:border-outline-gray-2 focus:border-teal-600 focus:ring-0 px-0 py-0.5 bg-transparent tracking-tight transition-colors"
                  placeholder="Task title..."
                  type="text"
                />
                <div class="text-[11px] text-ink-gray-4 font-normal flex items-center gap-2">
                  <span>{{ form.project || 'Audit Management' }}</span>
                  <span>•</span>
                  <span>{{ createdTimeAgo }}</span>
                  <span v-if="form.estimated_hours">• {{ form.estimated_hours }}h estimated</span>
                </div>
              </div>

              <div class="divide-y divide-slate-200" data-purpose="task-title-and-description-section">
                <!-- Rich Text Description Editor Component -->
                <div class="p-4" data-purpose="task-description-editor">
                  <FrappeRichEditor
                    v-model="form.description"
                    :people="people"
                    min-height="min-h-32"
                    placeholder="Review the server farm cabling alignment and verify calibration records... (Markdown supported)"
                  />
                </div>

              <!-- Section 2: Attachments Section -->
              <div class="p-4 space-y-3" data-purpose="attachments-section">
                <div class="flex items-center justify-between pb-1">
                  <div class="flex items-center space-x-2">
                    <Paperclip class="size-3 text-ink-gray-4" />
                    <h2 class="text-xs font-bold uppercase tracking-wider text-ink-gray-6">Attachments</h2>
                    <span class="bg-surface-gray-3 text-ink-gray-6 text-[10px] font-semibold px-2 py-0.2 rounded-full">
                      {{ attachments.length }} {{ attachments.length === 1 ? 'File' : 'Files' }}
                    </span>
                  </div>
                  <span class="text-[11px] text-ink-gray-4">Max size 25MB per file</span>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <!-- File Cards -->
                  <div
                    v-for="(att, idx) in attachments"
                    :key="att.id || att.name || idx"
                    class="flex items-center p-2.5 rounded-lg border border-outline-gray-2 bg-surface-gray-2/80 hover:bg-surface-base hover:border-teal-300 hover:shadow-xs transition-all group relative"
                  >
                    <div
                      class="w-8 h-8 rounded flex items-center justify-center mr-2.5 shrink-0"
                      :class="getFileTypePill(att).bg"
                    >
                      <component :is="getFileTypePill(att).icon" class="size-4" :class="getFileTypePill(att).iconColor" />
                    </div>
                    <div class="min-w-0 flex-1">
                      <p class="text-xs font-medium text-ink-gray-8 truncate" :title="att.name">
                        {{ att.name }}
                      </p>
                      <p class="text-[10px] text-ink-gray-4 font-mono">
                        {{ att.size || 'File' }} • {{ getFileExtension(att) }}
                      </p>
                    </div>
                    <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <a
                        :href="att.url || att.file_url || '#'"
                        target="_blank"
                        download
                        class="text-ink-gray-4 hover:text-ink-gray-7 p-1"
                        title="Download"
                      >
                        <Download class="size-3.5" />
                      </a>
                      <button
                        type="button"
                        class="text-ink-gray-4 hover:text-rose-600 p-1"
                        title="Delete"
                        @click.stop="confirmDeleteAttachment(att, idx)"
                      >
                        <Trash2 class="size-3.5" />
                      </button>
                    </div>
                  </div>

                  <!-- Upload Files Card -->
                  <label
                    class="relative border border-dashed border-outline-gray-3 hover:border-teal-500 rounded-lg p-2.5 flex items-center justify-center gap-2 text-ink-gray-5 hover:text-teal-700 hover:bg-teal-50/30 cursor-pointer transition-all"
                  >
                    <UploadCloud class="size-3.5 text-ink-gray-4" />
                    <span class="text-xs font-medium">+ Upload files</span>
                    <Loader2 v-if="uploadingAttachment" class="size-3.5 animate-spin text-teal-600 ml-1" />
                    <input type="file" multiple class="sr-only" @change="handleFileUpload" />
                  </label>
                </div>
              </div>

              <!-- Section 4: Ticket Details -->
              <div class="p-4 space-y-3.5" data-purpose="ticket-details-section">
                <div class="flex items-center justify-between">
                  <div class="flex items-center space-x-2">
                    <Ticket class="size-3 text-ink-gray-4" />
                    <h2 class="text-xs font-bold uppercase tracking-wider text-ink-gray-6">Ticket Details</h2>
                    <Badge
                      v-if="form.ticket_id || form.toll_id"
                      theme="blue"
                      variant="subtle"
                      size="sm"
                      label="Linked Ticket"
                    />
                  </div>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3.5">
                  <!-- Ticket Date -->
                  <div class="space-y-1">
                    <label class="text-[11px] font-medium text-ink-gray-5">Ticket Date</label>
                    <DatePicker
                      v-model="form.ticket_date"
                      format="DD-MM-YYYY"
                      placeholder="DD-MM-YYYY"
                      size="sm"
                      variant="subtle"
                      class="w-full text-xs"
                    >
                      <template #actions="{ setDate, close }">
                        <button type="button" :class="rowCls" @click="applyQuickDate(setDate, 0, 'day', close)">Today</button>
                        <button type="button" :class="rowCls" @click="applyQuickDate(setDate, 1, 'day', close)">Yesterday</button>
                        <button type="button" :class="rowCls" @click="applyQuickDate(setDate, 7, 'day', close)">One Week</button>
                      </template>
                    </DatePicker>
                  </div>

                  <!-- Raised By -->
                  <div class="space-y-1">
                    <label class="text-[11px] font-medium text-ink-gray-5">Raised By</label>
                    <TextInput
                      v-model="form.ticket_raised_by"
                      size="sm"
                      variant="subtle"
                      placeholder="Name / Email"
                    >
                      <template #prefix>
                        <span
                          class="size-4 shrink-0 rounded-full text-white text-[8px] font-semibold flex items-center justify-center"
                          :class="getAvatarColor(form.ticket_raised_by || 'TK')"
                        >
                          {{ getInitials(form.ticket_raised_by || 'TK') }}
                        </span>
                      </template>
                    </TextInput>
                  </div>

                  <!-- Ticket ID -->
                  <div class="space-y-1">
                    <label class="text-[11px] font-medium text-ink-gray-5">Ticket ID</label>
                    <TextInput
                      v-model="form.ticket_id"
                      size="sm"
                      variant="subtle"
                      placeholder="TCK-XXXX"
                      class="font-mono font-medium"
                    >
                      <template #suffix>
                        <button
                          v-if="form.ticket_id"
                          type="button"
                          class="text-ink-gray-4 hover:text-ink-gray-7 transition-colors cursor-pointer"
                          title="Copy Ticket ID"
                          @click="copyText(form.ticket_id)"
                        >
                          <Copy class="size-3" />
                        </button>
                      </template>
                    </TextInput>
                  </div>

                  <!-- Toll ID -->
                  <div class="space-y-1">
                    <label class="text-[11px] font-medium text-ink-gray-5">Toll ID</label>
                    <TextInput
                      v-model="form.toll_id"
                      size="sm"
                      variant="subtle"
                      placeholder="TL-XXXX"
                      class="font-mono"
                    >
                      <template #prefix>
                        <Flag class="size-3 text-ink-gray-4" />
                      </template>
                    </TextInput>
                  </div>

                  <!-- Ticket Description -->
                  <div class="space-y-1 sm:col-span-2">
                    <label class="text-[11px] font-medium text-ink-gray-5">Ticket Description</label>
                    <Textarea
                      v-model="form.ticket_description"
                      size="sm"
                      variant="subtle"
                      :rows="3"
                      placeholder="Ticket details or incident report..."
                    />
                  </div>
                </div>
              </div>
              </div>
            </div>
          </div>
        </section>

        <!-- RIGHT PANEL: Comments & Activity (chat). No `lg:border-l`: the centre
             section already draws its own right border, and both together made a
             2px divider that read heavier than the 1px one on the left. One
             border per divider, owned by the left-hand panel. -->
        <aside
          aria-label="Task Comments and Activity"
          class="w-full lg:w-[380px] xl:w-[410px] bg-surface-base dark:bg-neutral-900 border-t lg:border-t-0 border-outline-gray-2 dark:border-neutral-800 flex flex-col shrink-0 h-full overflow-hidden"
        >
            <!-- Comments & Activity Audit (chat) -->
            <div class="flex-1 flex flex-col min-h-0 bg-surface-gray-2/80 dark:bg-neutral-950">
              <!-- Tabs Header -->
              <div class="px-4 sm:px-5 pt-3 pb-2 bg-surface-base dark:bg-neutral-900 border-b border-outline-gray-2 dark:border-neutral-800 flex items-center justify-between shrink-0 select-none">
                <div class="flex items-center space-x-4">
                  <button
                    type="button"
                    class="text-xs pb-2 -mb-2 flex items-center gap-1.5 cursor-pointer transition"
                    :class="activeRightTab === 'comments' ? 'font-bold text-teal-700 dark:text-emerald-400 border-b-2 border-teal-600 dark:border-emerald-500' : 'font-medium text-ink-gray-4 dark:text-neutral-400 hover:text-ink-gray-7 dark:hover:text-neutral-200 border-b-2 border-transparent'"
                    @click="activeRightTab = 'comments'"
                  >
                    <span>Chat</span>
                    <span
                      class="text-[10px] font-semibold px-1.5 py-0.2 rounded-full border"
                      :class="activeRightTab === 'comments' ? 'bg-teal-50 dark:bg-emerald-950/60 text-teal-700 dark:text-emerald-300 border-teal-200/60 dark:border-emerald-800/60' : 'bg-surface-gray-3 dark:bg-neutral-800 text-ink-gray-5 dark:text-neutral-400 border-outline-gray-2 dark:border-neutral-700'"
                    >
                      {{ chatCount }}
                    </span>
                  </button>

                  <button
                    type="button"
                    class="text-xs pb-2 -mb-2 flex items-center gap-1.5 cursor-pointer transition"
                    :class="activeRightTab === 'activity' ? 'font-bold text-teal-700 dark:text-emerald-400 border-b-2 border-teal-600 dark:border-emerald-500' : 'font-medium text-ink-gray-4 dark:text-neutral-400 hover:text-ink-gray-7 dark:hover:text-neutral-200 border-b-2 border-transparent'"
                    @click="activeRightTab = 'activity'"
                  >
                    <span>Activity Audit</span>
                  </button>
                </div>
              </div>

              <!-- Chat (Telegram-style, Comment-backed). v-show keeps drafts while on Activity. -->
              <TaskChat
                v-show="activeRightTab === 'comments'"
                :task-id="form.id || ''"
                :members="allAvailableTeamMembers"
                @count="chatCount = $event"
              />

              <!-- Activity Tab Content -->
              <div v-if="activeRightTab === 'activity'" class="flex-1 p-4 overflow-y-auto space-y-2.5 min-h-0 text-xs">
                <div v-if="activityLog.length === 0" class="py-6 text-center text-ink-gray-4 select-none">
                  <Clock class="size-5 mx-auto text-slate-300 mb-1" />
                  <p class="font-medium text-ink-gray-6 text-xs">No activity logged yet</p>
                </div>
                <div
                  v-else
                  v-for="(act, idx) in activityLog"
                  :key="idx"
                  class="flex items-start gap-2 text-ink-gray-6 pb-2 border-b border-outline-gray-3 last:border-b-0"
                >
                  <div class="size-1.5 rounded-full bg-teal-600 mt-1.5 shrink-0"></div>
                  <div class="flex-1">
                    <p><strong class="text-ink-gray-8">{{ act.user }}</strong> {{ act.action }}</p>
                    <span class="text-[10px] text-ink-gray-4">{{ act.time }}</span>
                  </div>
                </div>
              </div>

            </div>
        </aside>
      </main>
    </div>
  </div>
</template>

<script>
import { Combobox, MultiSelect, DatePicker, Dropdown, Select, TextInput, Textarea, Badge, toast, Button } from 'frappe-ui'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
dayjs.extend(relativeTime)

import {
  fetchTaskComments,
  addTaskComment,
  updateTaskComment,
  deleteTaskComment,
  saveTask,
  deleteTask,
  getErrorMessage,
  fetchTeamMembers,
  fetchAllAssignableMembers,
  fetchTaskAttachments,
  deleteTaskAttachment,
  uploadTaskAttachment,
  fetchTaskflowSettings
} from '../data/api'
import { writeToClipboard } from '../utils/clipboard'
import FrappeRichEditor from './FrappeRichEditor.vue'
import TaskChat from './TaskChat.vue'
import {
  ArrowLeft,
  Copy,
  Share2,
  Trash2,
  Check,
  MoreHorizontal,
  AlertTriangle,
  ArrowRight,
  Paperclip,
  Ticket,
  SlidersHorizontal,
  MessageSquare,
  Clock,
  Loader2,
  Plus,
  Download,
  UploadCloud,
  FileText,
  Image as ImageIcon,
  FileSpreadsheet,
  Flag,
  Bug,
  Sparkles,
  CheckSquare,
  AtSign,
  X,
  ChevronDown,
} from 'lucide-vue-next'

const DEFAULT_GUIDES = [
  'SHREYASH SUNIL THANTHARATE',
  'JUBER YUSUF SHEIKH',
  'PALASH VIJAY SHENDE',
  'MANSI DHARMARAJ YADAV',
  'FAIJAN QURESHI',
  'RISHAB SUSHIL BOSE',
  'SIDDHARTH P TIRPUDE',
  'SNEHAL YADORAO BORKAR',
  'SURAIYYA RAFIK SUTRIYA',
  'ATUL GANESH NADEKAR',
  'SURENDRA MAIYADEEN PRAJAPATI',
  'HARISH DEEPAK EKNATHE',
  'RISHABH RAHANGDALE',
  'SABA JAVED SHEIKH',
  'TALIB KALAM SHEIKH',
  'NISHANT ASHOK KASHYAP',
  'VIVEK CHANDRAKANT RAVAL',
  'MANSOOR JIWANI',
  'AKASH SHYAMSUNDAR TAMGIRE',
  'PURVI RAJENDRA MASKARE',
  'NIKHIL SHAMRAO BHOYAR',
  'PRATIK MANOJ RAUT',
  'ASTHA SHAILESH GAJBHIYE',
  'PARESH VILASCHANDRA PASHINE',
  'ANKIT ARUN RAMTEKE',
]

export default {
  name: 'TaskDetailModal',
  components: {
    Badge,
    Button,
    Combobox,
    DatePicker,
    Dropdown,
    Select,
    TextInput,
    Textarea,
    MultiSelect,
    FrappeRichEditor,
    TaskChat,
    ArrowLeft,
    Copy,
    Share2,
    Trash2,
    Check,
    MoreHorizontal,
    AlertTriangle,
    ArrowRight,
    Paperclip,
    Ticket,
    SlidersHorizontal,
    MessageSquare,
    Clock,
    Loader2,
    Plus,
    Download,
    UploadCloud,
    FileText,
    ImageIcon,
    FileSpreadsheet,
    Flag,
    Bug,
    Sparkles,
    CheckSquare,
    AtSign,
    X,
    ChevronDown,
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
      default: () => ['Open', 'In Progress', 'Review', 'On Hold', 'Completed', 'Overdue'],
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
      isInitializing: false,
      isDirty: false,
      initialSnapshot: '',
      loadingComments: false,
      submittingComment: false,
      activeRightTab: 'comments',
      chatCount: 0,
      localTeamMembers: [],
      allAssignableMembers: [],
      taskTypes: ['Task', 'Bug', 'Customization Request'],
      pendingFromOptions: ['User', 'Team', 'Client', 'Management', 'External Partner', 'Vendor'],
      showPendingFromDropdown: false,
      projectSearchQuery: '',
      assigneeSearchQuery: '',
      parentProjectSearchQuery: '',
      form: {
        id: '',
        title: '',
        description: '',
        status: 'Open',
        priority: 'Medium',
        task_type: 'Task',
        project: '',
        parent_project: '',
        team: '',
        assignees: [],
        assigned_to: '',
        owner: '',
        reporter: '',
        pending_with: '',
        pending_from: '',
        guided_by: '',
        responsible_person: '',
        start_date: dayjs().format('YYYY-MM-DD'),
        due_date: dayjs().format('YYYY-MM-DD'),
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
      newComment: '',
      rowCls: 'w-full rounded px-2.5 py-1.5 text-left text-xs font-medium text-ink-gray-7 hover:bg-surface-gray-3 hover:text-ink-gray-9 transition cursor-pointer whitespace-nowrap',
    }
  },
  computed: {
    // frappe-ui Select wants option objects when a row needs more than a bare
    // label; the plain string lists are kept as the single source of truth.
    statusOptions() {
      return (this.statuses || [])
        .filter((s) => s !== 'Cancelled')
        .map((s) => ({ label: s, value: s }))
    },
    priorityOptions() {
      return this.priorities.map((p) => ({ label: p, value: p }))
    },
    taskTypeOptions() {
      return this.taskTypes.map((t) => ({ label: t, value: t }))
    },

    // Overflow menu behind the three-dots trigger in the form header.
    // Delete is hidden for an unsaved task, matching the old inline button.
    overflowMenuOptions() {
      return [
        {
          label: 'Share',
          icon: Share2,
          onClick: () => this.copyShareLink(),
        },
        {
          label: 'Delete',
          icon: Trash2,
          theme: 'red',
          condition: () => Boolean(this.form.id && this.form.id !== 'new'),
          onClick: () => this.confirmDelete(),
        },
      ]
    },
    guidedByOptions() {
      // Unique members mapped for Combobox format {label, value}
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
    currentUserInitials() {
      // Basic placeholder for now, you could map this to frappe.session.user
      return 'ME'
    },
    projectOptions() {
      const q = (this.projectSearchQuery || '').trim().toLowerCase()
      let list = this.projects || []
      const parentProj = typeof this.form.parent_project === 'object' && this.form.parent_project
        ? (this.form.parent_project.value || this.form.parent_project.label || '')
        : this.form.parent_project

      // Filter by selected Parent Project — sirf sub-projects dikhao
      if (parentProj) {
        list = list.filter((p) => p.parent_project === parentProj)
      }

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
    parentProjectOptions() {
      const q = (this.parentProjectSearchQuery || '').trim().toLowerCase()
      let list = this.projects || []
      if (q) {
        list = list.filter((p) => {
          const name = (p.name || '').toLowerCase()
          const title = (p.title || p.project_name || p.display_name || '').toLowerCase()
          return name.includes(q) || title.includes(q)
        })
      }
      const opts = list.slice(0, 5).map((p) => ({
        label: p.display_name || p.title || p.project_name || p.name,
        value: p.name,
      }))
      const currVal = typeof this.form.parent_project === 'object' && this.form.parent_project
        ? (this.form.parent_project.value || this.form.parent_project.label || '')
        : this.form.parent_project
      if (currVal && !opts.some((o) => o.value === currVal)) {
        const p = (this.projects || []).find((x) => x.name === currVal)
        if (p) {
          opts.unshift({
            label: p.display_name || p.title || p.project_name || p.name,
            value: p.name,
          })
        }
      }
      return opts
    },
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
      // Common list from all teams; fall back to loaded team members until it arrives
      const members = [
        ...(this.allAssignableMembers || []),
        ...this.allAvailableTeamMembers.filter(
          (m) => m.is_active === undefined || m.is_active === 1 || m.is_active === true
        ),
      ]

      // Show each employee only once, even if they belong to multiple teams
      const selected = new Set((this.form.assignees || []).map((a) => this.canonicalAssignee(a)))
      const seen = new Set()
      const options = []
      for (const m of members) {
        const value = m.user || m.employee
        const key = m.employee || value
        if (!value || seen.has(key) || seen.has(value)) continue
        seen.add(key)
        seen.add(value)
        if (selected.has(value)) continue
        options.push({ value, label: m.employee_name || m.user || m.employee, employee: m.employee || '' })
      }

      const q = (this.assigneeSearchQuery || '').trim().toLowerCase()
      if (!q) return options.map(({ value, label }) => ({ value, label }))

      // Rank: label starts with query > word starts with query > contains (label/id/email)
      const rank = (o) => {
        const label = o.label.toLowerCase()
        if (label.startsWith(q)) return 0
        if (label.split(/\s+/).some((w) => w.startsWith(q))) return 1
        if (label.includes(q)) return 2
        if (o.employee.toLowerCase().startsWith(q) || o.value.toLowerCase().startsWith(q)) return 3
        if (o.value.toLowerCase().includes(q)) return 4
        return -1
      }
      return options
        .map((o) => ({ o, r: rank(o) }))
        .filter((x) => x.r >= 0)
        .sort((a, b) => a.r - b.r || a.o.label.localeCompare(b.o.label))
        .map(({ o }) => ({ value: o.value, label: o.label }))
    },
    guideOptions() {
      const list = []
      if (Array.isArray(this.people) && this.people.length > 0) {
        for (const p of this.people) {
          const name = p.name || p.employee_name || p.full_name
          if (name && !list.includes(name)) list.push(name)
        }
      }
      if (Array.isArray(this.allAvailableTeamMembers) && this.allAvailableTeamMembers.length > 0) {
        for (const m of this.allAvailableTeamMembers) {
          const name = m.employee_name || m.user || m.employee
          if (name && !list.includes(name)) list.push(name)
        }
      }
      for (const name of DEFAULT_GUIDES) {
        if (!list.includes(name)) list.push(name)
      }
      return list
    },
    isOverdue() {
      if (this.form.status === 'Overdue') return true
      if (!this.form.due_date) return false
      const today = dayjs().format('YYYY-MM-DD')
      return this.form.due_date < today && this.form.status !== 'Completed' && this.form.status !== 'Cancelled'
    },
    overdueDays() {
      if (!this.form.due_date) return 0
      const due = dayjs(this.form.due_date)
      const now = dayjs()
      const diff = now.diff(due, 'day')
      return Math.max(1, diff)
    },
    formattedDueDate() {
      if (!this.form.due_date) return ''
      const d = dayjs(this.form.due_date)
      return d.isValid() ? d.format('MMMM D, YYYY') : this.form.due_date
    },
    computedDuration() {
      const start = this.form.start_date ? dayjs(this.form.start_date) : null
      const end = this.form.completed_on ? dayjs(this.form.completed_on) : (this.form.due_date ? dayjs(this.form.due_date) : null)
      if (start && end && start.isValid() && end.isValid()) {
        const days = end.diff(start, 'day')
        if (days >= 0) return `${days + 1} days`
      }
      return '37 days'
    },
    createdTimeAgo() {
      if (this.task && (this.task.creation || this.task.created_on)) {
        return dayjs(this.task.creation || this.task.created_on).fromNow()
      }
      return 'Created recently'
    },
    taskCreator() {
      const ownerVal = this.form.owner || (this.task && (this.task.owner || this.task.reporter)) || ''
      if (!ownerVal) return ''
      return this.getAssigneeName(ownerVal) || ownerVal
    },
    taskCreatorEmail() {
      return this.form.owner || (this.task && (this.task.owner || this.task.reporter)) || ''
    },
  },
  watch: {
    task: {
      immediate: true,
      handler(t) {
        if (t) {
          this.isInitializing = true
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
            parent_project: t.parent_project || '',
            team: matchedTeam || '',
            assignees: this.normalizeAssignees(assigneesList),
            assigned_to: t.assigned_to || '',
            owner: t.owner || '',
            reporter: t.reporter || t.owner || '',
            pending_with: t.pending_with || '',
            pending_from: t.pending_from || '',
            guided_by: t.guided_by || '',
            responsible_person: t.responsible_person || '',
            start_date: this.normalizeDate(t.start_date) || (!t.id || t.id === 'new' ? dayjs().format('YYYY-MM-DD') : ''),
            due_date: this.normalizeDate(t.due_date || t.due) || (!t.id || t.id === 'new' ? dayjs().format('YYYY-MM-DD') : ''),
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

          if (t.id && t.id !== 'new') {
            this.loadActualAttachments(t.id)
          }

          if (matchedTeam) {
            this.loadTeamMembersForTeam(matchedTeam)
          }

          this.$nextTick(() => {
            this.initialSnapshot = JSON.stringify(this.form)
            this.isDirty = false
            this.isInitializing = false
          })
        }
      },
    },
    form: {
      deep: true,
      handler() {
        if (this.isInitializing) return
        if (this.initialSnapshot) {
          this.isDirty = JSON.stringify(this.form) !== this.initialSnapshot
        } else {
          this.isDirty = true
        }
      },
    },
    'form.status'(newStatus, oldStatus) {
      if (this.isInitializing) return
      const sNew = typeof newStatus === 'object' && newStatus ? (newStatus.value || newStatus.label) : newStatus
      const sOld = typeof oldStatus === 'object' && oldStatus ? (oldStatus.value || oldStatus.label) : oldStatus
      if (sNew === 'Completed' && sOld && sOld !== 'Completed') {
        this.form.completed_on = dayjs().format('YYYY-MM-DD')
      }
    },
    modelValue: {
      immediate: true,
      handler(val) {
        if (val) {
          window.addEventListener('keydown', this.handleKeyDown, true)
        } else {
          window.removeEventListener('keydown', this.handleKeyDown, true)
        }
      },
    },
  },
  beforeUnmount() {
    window.removeEventListener('keydown', this.handleKeyDown, true)
    document.removeEventListener('click', this.handlePendingFromClickOutside)
  },
  mounted() {
    this.loadTaskflowSettings()
    this.loadAllAssignableMembers()
    if (this.modelValue) {
      window.addEventListener('keydown', this.handleKeyDown, true)
    }
    document.addEventListener('click', this.handlePendingFromClickOutside)
  },
  methods: {
    // Resolve any assignee form (user, employee id or name) to one canonical value
    canonicalAssignee(assignee) {
      const val = this.getAssigneeValue(assignee)
      if (!val) return ''
      const lower = String(val).toLowerCase()
      const member = [...(this.allAssignableMembers || []), ...(this.allAvailableTeamMembers || [])].find(
        (m) =>
          m.user === val ||
          m.employee === val ||
          (m.employee_name && m.employee_name.toLowerCase() === lower)
      )
      return member ? member.user || member.employee : val
    },
    normalizeAssignees(list) {
      const seen = new Set()
      const result = []
      for (const a of list || []) {
        const key = this.canonicalAssignee(a)
        if (key && !seen.has(key)) {
          seen.add(key)
          result.push(key)
        }
      }
      return result
    },
    addAssignee(option) {
      const value = option && (option.value || option)
      if (value) {
        this.form.assignees = this.normalizeAssignees([...(this.form.assignees || []), value])
      }
      this.assigneeSearchQuery = ''
    },
    async loadAllAssignableMembers() {
      try {
        this.allAssignableMembers = await fetchAllAssignableMembers()
        this.form.assignees = this.normalizeAssignees(this.form.assignees)
      } catch (err) {
        console.warn('Failed to load assignable members:', err)
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
    formatCommentDisplay(text) {
      if (!text) return ''
      const parts = text.split(/(<[^>]*>)/g);
      
      // Get all known member names/ids to match against safely
      const validNames = []
      if (this.allAvailableTeamMembers) {
        this.allAvailableTeamMembers.forEach(m => {
          if (m.employee_name) validNames.push(m.employee_name.toLowerCase())
          if (m.user) validNames.push(m.user.toLowerCase())
          if (m.employee) validNames.push(m.employee.toLowerCase())
        })
      }
      
      for (let i = 0; i < parts.length; i++) {
        if (!parts[i].startsWith('<')) {
          // It's text, let's find any @ occurrences
          // We match @ followed by anything up to 4 words.
          parts[i] = parts[i].replace(/(?:^|\s)(@([a-zA-Z0-9_.-]+(?:\s+[a-zA-Z0-9_.-]+){0,3}))/g, (match, fullMention, namePart) => {
            const nameLower = namePart.trim().toLowerCase()
            
            // Check if the exact matched words or a subset of them match a known team member
            // E.g., if matched "@SHREYASH SUNIL THANTHARATE sfbd", we check if "shreyash sunil thantharate sfbd" is valid.
            // If not, we try dropping the last word: "shreyash sunil thantharate"
            let words = nameLower.split(' ')
            let matchedName = null
            let originalCase = null
            
            while (words.length > 0) {
              let testName = words.join(' ')
              if (validNames.includes(testName)) {
                matchedName = testName
                originalCase = namePart.split(' ').slice(0, words.length).join(' ')
                break
              }
              words.pop()
            }
            
            if (matchedName) {
               const replacement = `<span class="mention" style="color: #0284c7; background-color: #e0f2fe; padding: 0.1rem 0.35rem; border-radius: 0.25rem; font-weight: 600; white-space: nowrap;">@${originalCase}</span>`
               // Replace only the matched portion
               return match.replace('@' + originalCase, replacement)
            }
            
            // Fallback: If no strict match but it's a single word (like @admin), just highlight it
            if (nameLower.split(' ').length === 1 && nameLower.length > 2) {
               return match.replace('@' + namePart.trim(), `<span class="mention" style="color: #0284c7; background-color: #e0f2fe; padding: 0.1rem 0.35rem; border-radius: 0.25rem; font-weight: 600; white-space: nowrap;">@${namePart.trim()}</span>`)
            }
            
            return match
          })
        }
      }
      return parts.join('')
    },
    async loadTaskflowSettings() {
      try {
        const settings = await fetchTaskflowSettings()
        if (settings && settings.pending_from) {
          this.pendingFromOptions = settings.pending_from.split('\n').map(s => s.trim()).filter(Boolean)
        }
      } catch(e) {
        console.error("Failed to load Taskflow Settings", e)
      }
    },
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
      const member = [...(this.allAvailableTeamMembers || []), ...(this.allAssignableMembers || [])].find(
        (m) => m.user === val || m.employee === val || m.employee_name === val || m.name === val
      )
      if (member && member.employee_name) return member.employee_name
      const p = (this.people || []).find((x) => x.email === val || x.name === val)
      return p ? (p.name || p.email) : val
    },
    getAssigneeRole(assignee) {
      const val = this.getAssigneeValue(assignee)
      const member = (this.allAvailableTeamMembers || []).find(
        (m) => m.user === val || m.employee === val || m.employee_name === val || m.name === val
      )
      if (member && (member.role || member.designation || member.department)) {
        return member.role || member.designation || member.department
      }
      const p = (this.people || []).find((x) => x.email === val || x.name === val)
      if (p && (p.designation || p.department)) {
        return p.designation || p.department
      }
      return 'Assignee'
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
      const targetKey = this.canonicalAssignee(targetVal)
      this.form.assignees = this.form.assignees.filter((a) => this.canonicalAssignee(a) !== targetKey)
    },
    onStatusChange(val) {
      const statusVal = typeof val === 'object' && val ? (val.value || val.label) : val
      if (statusVal === 'Completed') {
        this.form.completed_on = dayjs().format('YYYY-MM-DD')
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
    extendDueDate(days = 7) {
      const base = this.form.due_date ? dayjs(this.form.due_date) : dayjs()
      this.form.due_date = base.add(days, 'day').format('YYYY-MM-DD')
      toast.success(`Due date extended by ${days} days`)
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
        'bg-teal-700',
        'bg-slate-900',
        'bg-blue-700',
        'bg-emerald-700',
        'bg-indigo-700',
        'bg-amber-700',
      ]
      const charCode = (name || '').charCodeAt(0) || 0
      return colors[charCode % colors.length]
    },
    async copyTaskId() {
      if (!this.form.id) return
      try {
        await writeToClipboard(this.form.id)
        toast.success(`Task ID "${this.form.id}" copied`)
      } catch (e) {
        console.error('Failed to copy task ID', e)
        toast.error('Could not copy task ID')
      }
    },
    async copyShareLink() {
      const url = window.location.href
      try {
        await writeToClipboard(url)
        toast.success('URL Copied', { description: url })
      } catch (e) {
        console.error('Failed to copy task URL', e)
        toast.error('Could not copy URL', { description: url })
      }
    },
    async copyText(text) {
      if (!text) return
      try {
        await writeToClipboard(text)
        toast.success('Copied to clipboard')
      } catch (e) {
        console.error('Failed to copy text', e)
        toast.error('Could not copy to clipboard')
      }
    },
    getFileExtension(att) {
      const name = att?.name || att?.file_name || ''
      const parts = name.split('.')
      if (parts.length > 1) {
        return parts.pop().toUpperCase()
      }
      return 'FILE'
    },
    getFileTypePill(att) {
      const ext = this.getFileExtension(att).toLowerCase()
      if (['png', 'jpg', 'jpeg', 'svg', 'webp', 'gif'].includes(ext)) {
        return {
          bg: 'bg-sky-50 border border-sky-100 text-sky-600',
          icon: 'ImageIcon',
          iconColor: 'text-sky-600',
        }
      }
      if (ext === 'pdf') {
        return {
          bg: 'bg-rose-50 border border-rose-100 text-rose-600',
          icon: 'FileText',
          iconColor: 'text-rose-600',
        }
      }
      if (['xls', 'xlsx', 'csv'].includes(ext)) {
        return {
          bg: 'bg-emerald-50 border border-emerald-100 text-emerald-600',
          icon: 'FileSpreadsheet',
          iconColor: 'text-emerald-600',
        }
      }
      return {
        bg: 'bg-surface-gray-3 border border-outline-gray-2 text-ink-gray-6',
        icon: 'FileText',
        iconColor: 'text-ink-gray-6',
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
        console.warn('Failed to load attachments:', err)
      }
    },
    async confirmDeleteAttachment(att, idx) {
      const fileName = att?.name || att?.file_name || 'this attachment'
      if (!confirm(`Are you sure you want to delete "${fileName}"?`)) return
      const fileId = att?.id || att?.name
      try {
        if (fileId && !String(fileId).startsWith('temp-')) {
          await deleteTaskAttachment(fileId)
        }
        this.attachments.splice(idx, 1)
        toast.success(`Deleted "${fileName}"`)
      } catch (err) {
        toast.error(getErrorMessage(err, 'Failed to delete attachment'))
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
            toast.error(getErrorMessage(err, 'Failed to upload attachment'))
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
      if (e.target) e.target.value = ''
    },
    async loadActualComments(taskId) {
      if (!taskId) return
      this.loadingComments = true
      try {
        const comments = await fetchTaskComments(taskId)
        if (Array.isArray(comments)) {
          this.comments = comments
          this.$nextTick(() => {
            this.scrollToBottom()
          })
        }
      } catch (err) {
        console.warn('Failed to load comments:', err)
      } finally {
        this.loadingComments = false
      }
    },
    scrollToBottom() {
      const el = this.$refs.commentsContainer
      if (el) el.scrollTop = el.scrollHeight
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
    formatCommentBold() {
      this.newComment += '**bold** '
    },
    formatCommentItalic() {
      this.newComment += '*italic* '
    },
    insertMentionShortcut() {
      this.newComment += ' @'
    },
    async addComment(htmlContent) {
      const text = htmlContent ? htmlContent.trim() : this.newComment.trim()
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
        toast.error(getErrorMessage(e, 'Failed to delete comment'))
      }
    },
    handleKeyDown(e) {
      if (e.key === 'Escape') {
        this.close()
      } else if ((e.metaKey || e.ctrlKey) && (e.key === 's' || e.key === 'S' || e.code === 'KeyS')) {
        e.preventDefault()
        e.stopPropagation()
        if (document.activeElement && typeof document.activeElement.blur === 'function') {
          document.activeElement.blur()
        }
        this.$nextTick(() => {
          this.save()
        })
      }
    },
    close() {
      this.$emit('update:modelValue', false)
      this.$emit('close')
    },
    async save() {
      if (this.saving) return
      if (!this.form.title || !this.form.title.trim()) {
        this.errorMessage = 'Task title is required'
        toast.error('Task title is required')
        return
      }
      this.saving = true
      this.errorMessage = ''
      const assigneeIds = (this.form.assignees || []).map((a) => this.getAssigneeValue(a)).filter(Boolean)
      const normalizedDueDate = this.normalizeDate(this.form.due_date)
      const getVal = (v) => (typeof v === 'object' && v ? (v.value || v.label || '') : (v || ''))
      const statusVal = getVal(this.form.status) || 'Open'
      const { parent_project: _parentProject, ...formWithoutParent } = this.form
      const updated = {
        ...this.task,
        ...formWithoutParent,
        id: this.form.id || this.task?.id,
        title: this.form.title.trim(),
        status: statusVal,
        priority: getVal(this.form.priority) || 'Medium',
        task_type: getVal(this.form.task_type) || 'Task',
        project: getVal(this.form.project),
        guided_by: getVal(this.form.guided_by),
        due: normalizedDueDate,
        due_date: normalizedDueDate,
        start_date: this.normalizeDate(this.form.start_date),
        expected_resolution_date: this.normalizeDate(this.form.expected_resolution_date),
        completed_on: statusVal === 'Completed'
          ? (this.normalizeDate(this.form.completed_on) || dayjs().format('YYYY-MM-DD'))
          : '',
        ticket_date: this.normalizeDate(this.form.ticket_date),
        ticket_id: this.form.ticket_id || '',
        ticket_raised_by: this.form.ticket_raised_by || '',
        toll_id: this.form.toll_id || '',
        ticket_description: this.form.ticket_description || '',
        description: this.form.description || '',
        pending_from: this.form.pending_from || '',
        pending_with: this.form.pending_with || '',
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
        let res = null
        if (this.onSave) {
          res = await this.onSave(updated)
        } else {
          res = await saveTask(updated)
          this.$emit('save', res || updated)
          toast.success('Task saved successfully')
        }
        if (res && res.id) {
          if (!this.form.id) this.form.id = res.id
          if (res.due_date || res.due) this.form.due_date = this.normalizeDate(res.due_date || res.due)
          if (res.start_date !== undefined) this.form.start_date = this.normalizeDate(res.start_date)
          if (res.expected_resolution_date !== undefined) this.form.expected_resolution_date = this.normalizeDate(res.expected_resolution_date)
          if (res.completed_on !== undefined) this.form.completed_on = this.normalizeDate(res.completed_on)
          if (res.ticket_date !== undefined) this.form.ticket_date = this.normalizeDate(res.ticket_date)
          if (res.status) this.form.status = res.status
          if (res.priority) this.form.priority = res.priority
          if (res.task_type) this.form.task_type = res.task_type
          if (res.project !== undefined) this.form.project = res.project
          if (res.guided_by !== undefined) this.form.guided_by = res.guided_by
          if (res.pending_from !== undefined) this.form.pending_from = res.pending_from || ''
        }
        this.initialSnapshot = JSON.stringify(this.form)
        this.isDirty = false
        this.saving = false
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
    getPriorityFlagClass(priority) {
      const val = typeof priority === 'object' && priority ? (priority.value || priority.label) : priority
      switch (val) {
        case 'Critical':
          return 'text-red-600'
        case 'High':
          return 'text-orange-600'
        case 'Medium':
          return 'text-blue-600'
        case 'Low':
          return 'text-green-600'
        default:
          return 'text-blue-600'
      }
    },
  },
}
</script>

<style scoped>
::-webkit-scrollbar {
  width: 5px;
  height: 5px;
}
::-webkit-scrollbar-track {
  background: transparent;
}
::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 9999px;
}
::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}
</style>
