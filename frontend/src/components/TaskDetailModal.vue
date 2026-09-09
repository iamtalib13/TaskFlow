<template>
  <div
    v-if="modelValue"
    class="fixed inset-0 z-50 overflow-y-auto bg-slate-900/40 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 md:p-6 transition-all duration-200 animate-in fade-in"
    role="dialog"
    aria-modal="true"
    aria-labelledby="task-title-input"
    @click.self="close"
  >
    <div
      class="bg-white rounded-2xl shadow-2xl border border-slate-200/90 w-full max-w-[96vw] 2xl:max-w-[1480px] h-[95vh] max-h-[980px] flex flex-col overflow-hidden transform transition-all duration-200 scale-100"
    >
      <!-- TOP HEADER / BREADCRUMBS BAR (Clarity Minimal Design) -->
      <header class="h-11 sm:h-12 bg-white border-b border-slate-200/80 px-4 sm:px-6 flex items-center justify-between shrink-0 z-30 select-none">
        <!-- Left: Sleek Breadcrumbs & Subtle Auto-save indicator -->
        <div class="flex items-center space-x-3 text-xs min-w-0">
          <button
            type="button"
            class="text-slate-400 hover:text-slate-700 hover:bg-slate-100 p-1 -ml-1 rounded transition-colors inline-flex items-center justify-center cursor-pointer"
            title="Back to Tasks"
            @click="close"
          >
            <ArrowLeft class="size-3.5 text-slate-500" />
          </button>

          <div class="h-3.5 w-px bg-slate-200"></div>

          <nav aria-label="Breadcrumb" class="flex items-center space-x-2 text-xs truncate">
            <button
              type="button"
              class="text-slate-500 hover:text-slate-800 transition-colors font-medium cursor-pointer"
              @click="close"
            >
              Tasks
            </button>
            <span class="text-slate-300 font-normal">/</span>
            <span class="text-slate-600 hover:text-slate-900 font-medium truncate max-w-[140px] sm:max-w-[200px]">
              {{ form.project || 'Audit Management' }}
            </span>
            <span class="text-slate-300 font-normal">/</span>
            <div
              class="flex items-center gap-1 group cursor-pointer"
              title="Click to copy task ID"
              @click="copyTaskId"
            >
              <span class="font-mono text-slate-800 font-medium text-[11px]">
                {{ form.id || 'NEW-TASK' }}
              </span>
              <button
                type="button"
                class="text-slate-400 hover:text-slate-600 p-0.5 rounded opacity-60 group-hover:opacity-100 transition-opacity"
                title="Copy task ID"
              >
                <Copy class="size-2.5" />
              </button>
            </div>
          </nav>

          <div class="h-3 w-px bg-slate-200 hidden md:block"></div>

          <!-- Save Status Indicator -->
          <div class="hidden md:flex items-center gap-1.5 text-[11px] font-normal">
            <span
              class="w-1.5 h-1.5 rounded-full"
              :class="saving ? 'bg-amber-500 animate-pulse' : 'bg-teal-600'"
            ></span>
            <span class="text-slate-400">{{ saving ? 'Saving...' : 'Saved' }}</span>
          </div>
        </div>

        <!-- Right: Refined lightweight actions & selectors -->
        <div class="flex items-center space-x-1.5 sm:space-x-2 shrink-0">
          <!-- Task Type Dropdown Selector -->
          <div class="relative flex items-center">
            <select
              v-model="form.task_type"
              class="appearance-none text-[11px] font-semibold pl-6 pr-5 py-1 rounded-md border border-slate-200 bg-slate-50/70 hover:bg-slate-100 text-slate-700 cursor-pointer focus:ring-1 focus:ring-teal-600 focus:outline-none transition"
              :class="getTaskTypeSelectClass(form.task_type)"
            >
              <option v-for="t in taskTypes" :key="t" :value="t">{{ t }}</option>
            </select>
            <component
              :is="getTaskTypeIcon(form.task_type)"
              class="absolute left-2 size-3 pointer-events-none"
              :class="getTaskTypeIconClass(form.task_type)"
            />
            <ChevronDown class="absolute right-1.5 size-2.5 text-slate-400 pointer-events-none" />
          </div>

          <!-- Status Dropdown Selector -->
          <div class="relative flex items-center">
            <select
              v-model="form.status"
              class="appearance-none text-[11px] font-semibold pl-5 pr-5 py-1 rounded-md border border-slate-200 bg-slate-50/70 hover:bg-slate-100 text-slate-700 cursor-pointer focus:ring-1 focus:ring-teal-600 focus:outline-none transition"
            >
              <option v-for="s in statuses" :key="s" :value="s">{{ s }}</option>
            </select>
            <span
              class="absolute left-2 size-2 rounded-full pointer-events-none"
              :class="getStatusDotClass(form.status)"
            />
            <ChevronDown class="absolute right-1.5 size-2.5 text-slate-400 pointer-events-none" />
          </div>

          <!-- Priority Dropdown Selector -->
          <div class="relative flex items-center hidden sm:flex">
            <select
              v-model="form.priority"
              class="appearance-none text-[11px] font-semibold pl-5 pr-5 py-1 rounded-md border border-slate-200 bg-slate-50/70 hover:bg-slate-100 text-slate-700 cursor-pointer focus:ring-1 focus:ring-teal-600 focus:outline-none transition"
            >
              <option v-for="p in priorities" :key="p" :value="p">{{ p }}</option>
            </select>
            <Flag class="absolute left-2 size-2.5 text-blue-600 pointer-events-none" />
            <ChevronDown class="absolute right-1.5 size-2.5 text-slate-400 pointer-events-none" />
          </div>

          <!-- Share Button -->
          <button
            type="button"
            class="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-md transition-colors text-xs inline-flex items-center gap-1.5 px-2 cursor-pointer"
            title="Share Task Link"
            @click="copyShareLink"
          >
            <Share2 class="size-3 text-slate-400" />
            <span class="hidden sm:inline-block font-normal">Share</span>
          </button>

          <!-- Delete Task Button -->
          <button
            v-if="form.id && form.id !== 'new'"
            type="button"
            class="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
            title="Delete Task"
            :disabled="deleting || saving"
            @click="confirmDelete"
          >
            <Trash2 class="size-3.5" />
          </button>

          <div class="h-3.5 w-px bg-slate-200 mx-1"></div>

          <!-- Cancel Button -->
          <button
            type="button"
            class="px-2.5 py-1 text-xs font-medium text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
            @click="close"
          >
            Cancel
          </button>

          <!-- Save Task Button (Dark slate button with teal checkmark) -->
          <button
            type="button"
            class="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 active:bg-slate-950 rounded-md shadow-xs transition-colors cursor-pointer disabled:opacity-50"
            :disabled="saving || deleting"
            @click="save"
          >
            <Loader2 v-if="saving" class="size-3 animate-spin text-teal-400" />
            <Check v-else class="size-3 text-teal-400 stroke-[2.5]" />
            <span>Save Task</span>
            <kbd class="ml-1 px-1 py-0.2 rounded text-[9px] bg-white/20 font-mono font-normal hidden sm:inline-block">⌘S</kbd>
          </button>
        </div>
      </header>

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

      <!-- 2-COLUMN BALANCED DESKTOP LAYOUT (68% Work Area / 32% Inspector Sidebar) -->
      <main class="flex-1 flex flex-col lg:flex-row overflow-hidden">
        <!-- LEFT MAIN AREA: Work, Document Flow, Attachments, Dates & Ticket (~68%) -->
        <section
          aria-label="Task Content and Document Area"
          class="flex-1 overflow-y-auto px-4 sm:px-8 py-5 border-b lg:border-b-0 lg:border-r border-slate-200"
        >
          <div class="max-w-4xl mx-auto space-y-4">
            <!-- SLA Overdue Alert Strip (shown dynamically when overdue) -->
            <div
              v-if="isOverdue"
              class="flex items-center justify-between px-3.5 py-2 bg-amber-50/70 border border-amber-200/80 rounded-lg text-xs text-amber-900 shadow-xs animate-in fade-in"
              data-purpose="sla-warning-banner"
            >
              <div class="flex items-center space-x-2.5 min-w-0">
                <span class="w-5 h-5 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 shrink-0 text-[11px]">
                  <AlertTriangle class="size-3 text-amber-700" />
                </span>
                <div class="flex flex-wrap items-center gap-1.5 min-w-0">
                  <span class="font-semibold text-amber-950">
                    Task is overdue by {{ overdueDays }} {{ overdueDays === 1 ? 'day' : 'days' }}.
                  </span>
                  <span class="text-amber-800">
                    Target completion date was {{ formattedDueDate || 'not met' }}. Please expedite or update timelines.
                  </span>
                </div>
              </div>
              <button
                type="button"
                class="text-amber-900 font-semibold hover:text-amber-950 text-xs inline-flex items-center gap-1 px-2 py-0.5 rounded hover:bg-amber-100/60 transition-colors shrink-0 cursor-pointer"
                @click="extendDueDate(7)"
              >
                <span>Extend / Reschedule (+7d)</span>
                <ArrowRight class="size-2.5" />
              </button>
            </div>

            <!-- Unified Document Canvas -->
            <div
              class="bg-white divide-y overflow-hidden divide-slate-200 border border-slate-200/80 rounded-xl shadow-xs"
              data-purpose="document-canvas"
            >
              <!-- Section 1: Task Title & Description Editor -->
              <div class="p-5 space-y-3" data-purpose="task-title-and-description-section">
                <div class="space-y-1" data-purpose="task-title-section">
                  <input
                    id="task-title-input"
                    v-model="form.title"
                    class="w-full text-2xl font-bold text-slate-900 placeholder-slate-300 border-0 border-b border-transparent hover:border-slate-200 focus:border-teal-600 focus:ring-0 px-0 py-0.5 bg-transparent tracking-tight transition-colors"
                    placeholder="Task title..."
                    type="text"
                  />
                  <div class="text-[11px] text-slate-400 font-normal flex items-center gap-2">
                    <span>{{ form.project || 'Audit Management' }}</span>
                    <span>•</span>
                    <span>{{ createdTimeAgo }}</span>
                    <span v-if="form.estimated_hours">• {{ form.estimated_hours }}h estimated</span>
                  </div>
                </div>

                <!-- Rich Text Description Editor Component -->
                <div class="rounded-lg border border-slate-200/80 overflow-hidden" data-purpose="task-description-editor">
                  <TaskRichEditor
                    v-model="form.description"
                    :people="people"
                    min-height="min-h-48"
                    placeholder="Review the server farm cabling alignment and verify calibration records... (Markdown supported)"
                  />
                </div>
              </div>

              <!-- Section 2: Attachments Section -->
              <div class="p-5 space-y-3" data-purpose="attachments-section">
                <div class="flex items-center justify-between pb-1">
                  <div class="flex items-center space-x-2">
                    <Paperclip class="size-3 text-slate-400" />
                    <h2 class="text-xs font-bold uppercase tracking-wider text-slate-600">Attachments</h2>
                    <span class="bg-slate-100 text-slate-600 text-[10px] font-semibold px-2 py-0.2 rounded-full">
                      {{ attachments.length }} {{ attachments.length === 1 ? 'File' : 'Files' }}
                    </span>
                  </div>
                  <span class="text-[11px] text-slate-400">Max size 25MB per file</span>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <!-- File Cards -->
                  <div
                    v-for="(att, idx) in attachments"
                    :key="att.id || att.name || idx"
                    class="flex items-center p-2.5 rounded-lg border border-slate-200 bg-slate-50/50 hover:bg-white hover:border-teal-300 hover:shadow-xs transition-all group relative"
                  >
                    <div
                      class="w-8 h-8 rounded flex items-center justify-center mr-2.5 shrink-0"
                      :class="getFileTypePill(att).bg"
                    >
                      <component :is="getFileTypePill(att).icon" class="size-4" :class="getFileTypePill(att).iconColor" />
                    </div>
                    <div class="min-w-0 flex-1">
                      <p class="text-xs font-medium text-slate-800 truncate" :title="att.name">
                        {{ att.name }}
                      </p>
                      <p class="text-[10px] text-slate-400 font-mono">
                        {{ att.size || 'File' }} • {{ getFileExtension(att) }}
                      </p>
                    </div>
                    <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <a
                        :href="att.url || att.file_url || '#'"
                        target="_blank"
                        download
                        class="text-slate-400 hover:text-slate-700 p-1"
                        title="Download"
                      >
                        <Download class="size-3.5" />
                      </a>
                      <button
                        type="button"
                        class="text-slate-400 hover:text-rose-600 p-1"
                        title="Delete"
                        @click.stop="confirmDeleteAttachment(att, idx)"
                      >
                        <Trash2 class="size-3.5" />
                      </button>
                    </div>
                  </div>

                  <!-- Upload Files Card -->
                  <label
                    class="border border-dashed border-slate-300 hover:border-teal-500 rounded-lg p-2.5 flex items-center justify-center gap-2 text-slate-500 hover:text-teal-700 hover:bg-teal-50/30 cursor-pointer transition-all"
                  >
                    <UploadCloud class="size-3.5 text-slate-400" />
                    <span class="text-xs font-medium">+ Upload files</span>
                    <Loader2 v-if="uploadingAttachment" class="size-3.5 animate-spin text-teal-600 ml-1" />
                    <input type="file" multiple class="sr-only" @change="handleFileUpload" />
                  </label>
                </div>
              </div>

              <!-- Section 3: Schedule & Dates -->
              <div class="p-5 space-y-3" data-purpose="schedule-section">
                <div class="flex items-center justify-between pb-1">
                  <div class="flex items-center space-x-2">
                    <Calendar class="size-3 text-teal-600" />
                    <h2 class="text-xs font-bold uppercase tracking-wider text-slate-600">Schedule & Dates</h2>
                  </div>
                  <span class="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-xs font-mono font-medium">
                    Duration: {{ computedDuration }}
                  </span>
                </div>
                <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <!-- Start Date -->
                  <div class="p-2.5 rounded-lg border border-slate-200 bg-slate-50/50 flex flex-col justify-between">
                    <span class="text-[11px] font-medium text-slate-500 mb-1 flex items-center gap-1.5">
                      <Calendar class="size-3 text-slate-400" />
                      Start Date
                    </span>
                    <DatePicker
                      v-model="form.start_date"
                      format="DD-MM-YYYY"
                      placeholder="DD-MM-YYYY"
                      size="sm"
                      variant="outline"
                      class="w-full text-xs font-semibold font-mono"
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

                  <!-- Due Date (with Overdue alert styling) -->
                  <div
                    class="p-2.5 rounded-lg border flex flex-col justify-between"
                    :class="isOverdue ? 'border-rose-200 bg-rose-50/50' : 'border-slate-200 bg-slate-50/50'"
                  >
                    <div class="flex items-center justify-between mb-1">
                      <span
                        class="text-[11px] font-medium flex items-center gap-1.5"
                        :class="isOverdue ? 'text-rose-700' : 'text-slate-500'"
                      >
                        <AlertTriangle v-if="isOverdue" class="size-3 text-rose-500" />
                        <Calendar v-else class="size-3 text-slate-400" />
                        Due Date
                      </span>
                      <span
                        v-if="isOverdue"
                        class="text-[10px] font-semibold text-rose-700 bg-rose-100 px-1.5 py-0.2 rounded"
                      >
                        {{ overdueDays }}d Overdue
                      </span>
                    </div>
                    <DatePicker
                      v-model="form.due_date"
                      format="DD-MM-YYYY"
                      placeholder="DD-MM-YYYY"
                      size="sm"
                      variant="outline"
                      class="w-full text-xs font-bold font-mono"
                      :class="isOverdue ? 'text-rose-700' : 'text-slate-800'"
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
                  <div class="p-2.5 rounded-lg border border-slate-200 bg-slate-50/50 flex flex-col justify-between">
                    <span class="text-[11px] font-medium text-slate-500 mb-1 flex items-center gap-1.5">
                      <Calendar class="size-3 text-slate-400" />
                      Estimated Date
                    </span>
                    <DatePicker
                      v-model="form.expected_resolution_date"
                      format="DD-MM-YYYY"
                      placeholder="DD-MM-YYYY"
                      size="sm"
                      variant="outline"
                      class="w-full text-xs font-semibold font-mono text-slate-800"
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
                  <div class="p-2.5 rounded-lg border border-slate-200 bg-slate-50/50 flex flex-col justify-between">
                    <span class="text-[11px] font-medium text-slate-500 mb-1 flex items-center gap-1.5">
                      <Calendar class="size-3 text-slate-400" />
                      Completed Date
                    </span>
                    <DatePicker
                      v-model="form.completed_on"
                      format="DD-MM-YYYY"
                      placeholder="DD-MM-YYYY"
                      size="sm"
                      variant="outline"
                      class="w-full text-xs font-semibold font-mono text-slate-800"
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

              <!-- Section 4: Ticket Details -->
              <div class="p-5 space-y-3" data-purpose="ticket-details-section">
                <div class="flex items-center justify-between pb-1">
                  <div class="flex items-center space-x-2">
                    <Ticket class="size-3 text-teal-600" />
                    <h2 class="text-xs font-bold uppercase tracking-wider text-slate-600">Ticket Details</h2>
                    <span
                      v-if="form.ticket_id || form.toll_id"
                      class="bg-teal-50 text-teal-800 border border-teal-200/60 text-[10px] font-semibold px-2 py-0.2 rounded-full"
                    >
                      Linked Ticket
                    </span>
                  </div>
                  <span v-if="form.ticket_id || form.toll_id" class="font-mono text-[11px] text-slate-400">
                    {{ form.ticket_id || 'TCK-NEW' }} {{ form.toll_id ? '• ' + form.toll_id : '' }}
                  </span>
                </div>

                <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <!-- Ticket Date -->
                  <div class="p-2.5 rounded-lg border border-slate-200 bg-slate-50/50 flex flex-col justify-between">
                    <span class="text-[11px] font-medium text-slate-500 mb-1 flex items-center gap-1.5">
                      <Calendar class="size-3 text-slate-400" />
                      Ticket Date
                    </span>
                    <DatePicker
                      v-model="form.ticket_date"
                      format="DD-MM-YYYY"
                      placeholder="DD-MM-YYYY"
                      size="sm"
                      variant="outline"
                      class="w-full text-xs font-semibold font-mono"
                    >
                      <template #actions="{ setDate, close }">
                        <button type="button" :class="rowCls" @click="applyQuickDate(setDate, 0, 'day', close)">Today</button>
                        <button type="button" :class="rowCls" @click="applyQuickDate(setDate, 1, 'day', close)">Yesterday</button>
                        <button type="button" :class="rowCls" @click="applyQuickDate(setDate, 7, 'day', close)">One Week</button>
                      </template>
                    </DatePicker>
                  </div>

                  <!-- Toll ID -->
                  <div class="p-2.5 rounded-lg border border-slate-200 bg-slate-50/50 flex flex-col justify-between">
                    <span class="text-[11px] font-medium text-slate-500 mb-1 flex items-center gap-1.5">
                      <Flag class="size-3 text-slate-400" />
                      Toll ID
                    </span>
                    <input
                      v-model="form.toll_id"
                      type="text"
                      placeholder="TL-XXXX"
                      class="w-full text-xs font-semibold text-slate-800 font-mono bg-transparent border-0 p-0 focus:ring-0 outline-none"
                    />
                  </div>

                  <!-- Ticket ID -->
                  <div class="p-2.5 rounded-lg border border-slate-200 bg-slate-50/50 flex flex-col justify-between group">
                    <span class="text-[11px] font-medium text-slate-500 mb-1 flex items-center justify-between">
                      <span class="flex items-center gap-1.5">
                        <Ticket class="size-3 text-amber-500" />
                        Ticket ID
                      </span>
                      <button
                        v-if="form.ticket_id"
                        type="button"
                        class="text-slate-400 hover:text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                        title="Copy Ticket ID"
                        @click="copyText(form.ticket_id)"
                      >
                        <Copy class="size-2.5" />
                      </button>
                    </span>
                    <input
                      v-model="form.ticket_id"
                      type="text"
                      placeholder="TCK-XXXX"
                      class="w-full text-xs font-bold text-slate-800 font-mono bg-transparent border-0 p-0 focus:ring-0 outline-none"
                    />
                  </div>

                  <!-- Raised By -->
                  <div class="p-2.5 rounded-lg border border-slate-200 bg-slate-50/50 flex flex-col justify-between">
                    <span class="text-[11px] font-medium text-slate-500 mb-1 flex items-center gap-1.5">
                      <User class="size-3 text-slate-400" />
                      Raised By
                    </span>
                    <div class="flex items-center gap-1.5 min-w-0">
                      <div class="w-4 h-4 rounded-full bg-teal-700 text-white text-[8px] font-bold flex items-center justify-center shrink-0">
                        {{ getInitials(form.ticket_raised_by || 'TK') }}
                      </div>
                      <input
                        v-model="form.ticket_raised_by"
                        type="text"
                        placeholder="Name / Email"
                        class="w-full text-xs font-semibold text-slate-800 bg-transparent border-0 p-0 focus:ring-0 outline-none truncate"
                      />
                    </div>
                  </div>
                </div>

                <div class="space-y-1.5">
                  <label class="text-[11px] font-medium text-slate-500 block">Ticket Description</label>
                  <textarea
                    v-model="form.ticket_description"
                    rows="2"
                    placeholder="Ticket details or incident report..."
                    class="w-full p-3 rounded-lg border border-slate-200 bg-slate-50/50 text-xs text-slate-700 leading-relaxed font-sans focus:border-teal-600 focus:bg-white transition-colors outline-none resize-none"
                  ></textarea>
                </div>
              </div>
            </div>
          </div>
        </section>

        <!-- RIGHT INSPECTOR SIDEBAR (~32% width, approx 380px-420px) -->
        <aside
          aria-label="Task Inspector and Activity Timeline"
          class="w-full lg:w-[380px] xl:w-[410px] bg-white border-t lg:border-t-0 lg:border-l border-slate-200 flex flex-col shrink-0 h-full overflow-hidden"
        >
          <div class="flex-1 flex flex-col min-h-0 overflow-hidden">
            <!-- TOP INSPECTOR SECTION: Assignment & Attributes -->
            <div class="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
              <div class="flex items-center justify-between pb-3 border-b border-slate-200">
                <div class="flex items-center space-x-2">
                  <UserCheck class="size-3.5 text-teal-600" />
                  <h2 class="text-xs font-bold uppercase tracking-wider text-slate-700">Assignment</h2>
                </div>
                <span class="font-mono text-[10px] text-slate-400">{{ form.id || 'NEW' }}</span>
              </div>

              <div class="space-y-3.5 text-xs">
                <!-- Project Selector -->
                <div class="space-y-1">
                  <label class="text-[11px] font-semibold text-slate-600 block">Project</label>
                  <select
                    v-model="form.project"
                    class="w-full text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50/50 hover:bg-white focus:bg-white focus:border-teal-600 focus:outline-none focus:ring-0 text-slate-800 transition-colors"
                    @change="onProjectChange"
                  >
                    <option value="">Select Project</option>
                    <option v-for="p in projects" :key="p.name" :value="p.name">
                      {{ p.display_name || p.name }}
                    </option>
                  </select>
                </div>

                <!-- Assigned To List -->
                <div class="space-y-2">
                  <div class="flex items-center justify-between">
                    <label class="text-[11px] font-semibold text-slate-600">Assigned To</label>
                    <span v-if="form.assignees && form.assignees.length > 0" class="text-[10px] text-slate-400">
                      {{ form.assignees.length }} assigned
                    </span>
                  </div>

                  <div v-if="form.assignees && form.assignees.length > 0" class="space-y-2">
                    <div
                      v-for="assignee in form.assignees"
                      :key="getAssigneeValue(assignee)"
                      class="flex items-center justify-between p-2 rounded-lg border border-slate-200 bg-slate-50 hover:bg-white hover:border-slate-300 transition-colors group"
                    >
                      <div class="flex items-center space-x-2.5 min-w-0">
                        <div
                          class="w-7 h-7 rounded-full text-white text-[10px] font-bold flex items-center justify-center shrink-0 shadow-xs"
                          :class="getAvatarColor(getAssigneeName(assignee))"
                        >
                          {{ getInitials(getAssigneeName(assignee)) }}
                        </div>
                        <div class="min-w-0">
                          <p class="font-semibold text-slate-800 text-xs truncate">
                            {{ getAssigneeName(assignee) }}
                          </p>
                          <p class="text-[10px] text-slate-400 truncate">
                            {{ getAssigneeRole(assignee) }}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        class="text-slate-400 hover:text-rose-600 p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                        :title="'Remove ' + getAssigneeName(assignee)"
                        @click="removeAssignee(assignee)"
                      >
                        <Trash2 class="size-3" />
                      </button>
                    </div>
                  </div>

                  <!-- MultiSelect employee selector -->
                  <div class="pt-0.5">
                    <MultiSelect
                      v-model="form.assignees"
                      :options="assigneeOptions"
                      :placeholder="effectiveTeam ? `+ Add ${effectiveTeam} member...` : '+ Add Assignee...'"
                      size="sm"
                      class="w-full"
                    />
                  </div>
                </div>

                <div class="space-y-3 pt-3 border-t border-slate-200">
                  <!-- Pending With -->
                  <div class="space-y-1">
                    <label class="text-[11px] font-semibold text-slate-600 block">Pending With</label>
                    <input
                      v-model="form.pending_with"
                      type="text"
                      placeholder="Pending with..."
                      class="w-full text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50/50 hover:bg-white focus:bg-white focus:border-teal-600 focus:outline-none focus:ring-0 text-slate-800 placeholder-slate-400 transition-colors"
                    />
                  </div>

                  <!-- Pending From -->
                  <div class="space-y-1">
                    <label class="text-[11px] font-semibold text-slate-600 block">Pending From</label>
                    <select
                      v-model="form.pending_from"
                      class="w-full text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50/50 hover:bg-white focus:bg-white focus:border-teal-600 focus:outline-none focus:ring-0 text-slate-800 transition-colors"
                    >
                      <option value="" disabled selected>Pending from...</option>
                      <option v-for="v in vendorOptions" :key="v" :value="v">{{ v }}</option>
                    </select>
                  </div>

                  <!-- Guided By -->
                  <div class="space-y-1">
                    <label class="text-[11px] font-semibold text-slate-600 block">Guided By</label>
                    <select
                      v-model="form.guided_by"
                      class="w-full text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50/50 hover:bg-white focus:bg-white focus:border-teal-600 focus:outline-none focus:ring-0 text-slate-800 transition-colors"
                    >
                      <option value="" disabled selected>Guided by...</option>
                      <option v-for="person in guideOptions" :key="person" :value="person">{{ person }}</option>
                    </select>
                  </div>

                  <!-- Responsible Person -->
                  <div class="space-y-1">
                    <label class="text-[11px] font-semibold text-slate-600 block">Responsible Person</label>
                    <select
                      v-model="form.responsible_person"
                      class="w-full text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50/50 hover:bg-white focus:bg-white focus:border-teal-600 focus:outline-none focus:ring-0 text-slate-800 transition-colors"
                    >
                      <option value="" disabled selected>Select responsible person...</option>
                      <option v-for="person in guideOptions" :key="person" :value="person">{{ person }}</option>
                    </select>
                  </div>

                  <!-- Hours tracking -->
                  <div class="grid grid-cols-2 gap-2 pt-1">
                    <div>
                      <label class="text-[11px] font-semibold text-slate-600 block mb-1">Est. Hours</label>
                      <input
                        v-model="form.estimated_hours"
                        type="number"
                        step="0.5"
                        placeholder="e.g. 8"
                        class="w-full text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50/50 hover:bg-white focus:bg-white focus:border-teal-600 focus:outline-none focus:ring-0 text-slate-800 transition-colors font-mono"
                      />
                    </div>
                    <div>
                      <label class="text-[11px] font-semibold text-slate-600 block mb-1">Logged Hours</label>
                      <input
                        v-model="form.logged_hours"
                        type="number"
                        step="0.5"
                        placeholder="e.g. 4"
                        class="w-full text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50/50 hover:bg-white focus:bg-white focus:border-teal-600 focus:outline-none focus:ring-0 text-slate-800 transition-colors font-mono"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- BOTTOM INSPECTOR SECTION: Comments & Activity Audit -->
            <div class="flex-1 flex flex-col min-h-[280px] max-h-[46vh] border-t border-slate-200 bg-slate-50/50">
              <!-- Tabs Header -->
              <div class="px-4 sm:px-5 pt-3 pb-2 bg-white border-b border-slate-200 flex items-center justify-between shrink-0 select-none">
                <div class="flex items-center space-x-4">
                  <button
                    type="button"
                    class="text-xs pb-2 -mb-2 flex items-center gap-1.5 cursor-pointer transition"
                    :class="activeRightTab === 'comments' ? 'font-bold text-teal-700 border-b-2 border-teal-600' : 'font-medium text-slate-400 hover:text-slate-700 border-b-2 border-transparent'"
                    @click="activeRightTab = 'comments'"
                  >
                    <span>Comments</span>
                    <span
                      class="text-[10px] font-semibold px-1.5 py-0.2 rounded-full border"
                      :class="activeRightTab === 'comments' ? 'bg-teal-50 text-teal-700 border-teal-200/60' : 'bg-slate-100 text-slate-500 border-slate-200'"
                    >
                      {{ comments.length }}
                    </span>
                    <Loader2 v-if="loadingComments" class="size-2.5 animate-spin text-teal-600" />
                  </button>

                  <button
                    type="button"
                    class="text-xs pb-2 -mb-2 flex items-center gap-1.5 cursor-pointer transition"
                    :class="activeRightTab === 'activity' ? 'font-bold text-teal-700 border-b-2 border-teal-600' : 'font-medium text-slate-400 hover:text-slate-700 border-b-2 border-transparent'"
                    @click="activeRightTab = 'activity'"
                  >
                    <span>Activity Audit</span>
                  </button>
                </div>
              </div>

              <!-- Comments Feed -->
              <div
                v-if="activeRightTab === 'comments'"
                ref="commentsContainer"
                class="flex-1 p-4 overflow-y-auto space-y-3 min-h-0 text-xs"
              >
                <div v-if="loadingComments && comments.length === 0" class="py-6 text-center text-slate-400">
                  <Loader2 class="size-4 animate-spin text-teal-600 mx-auto mb-1" />
                  <span class="text-xs">Loading comments...</span>
                </div>
                <div v-else-if="comments.length === 0" class="py-6 text-center text-slate-400 select-none">
                  <MessageSquare class="size-5 mx-auto text-slate-300 mb-1" />
                  <p class="font-medium text-slate-600 text-xs">No comments yet</p>
                  <p class="text-[10px] text-slate-400">Add a comment below to start discussion.</p>
                </div>
                <div
                  v-else
                  v-for="(cmt, idx) in comments"
                  :key="cmt.id || idx"
                  class="space-y-1.5 group"
                >
                  <div class="flex items-center justify-between">
                    <div class="flex items-center space-x-2 min-w-0">
                      <div
                        class="w-5 h-5 rounded-full text-white text-[9px] font-bold flex items-center justify-center shrink-0"
                        :class="getAvatarColor(cmt.author)"
                      >
                        {{ getInitials(cmt.author) }}
                      </div>
                      <span class="text-xs font-semibold text-slate-800 truncate">{{ cmt.author }}</span>
                    </div>
                    <div class="flex items-center gap-1.5 text-[10px] text-slate-400 shrink-0">
                      <span>{{ cmt.time || 'Just now' }}</span>
                      <button
                        v-if="cmt.can_delete || isCurrentUser(cmt)"
                        type="button"
                        class="opacity-0 group-hover:opacity-100 transition hover:text-rose-600 p-0.5 cursor-pointer"
                        title="Delete comment"
                        @click="deleteComment(cmt.id, idx)"
                      >
                        <Trash2 class="size-2.5" />
                      </button>
                    </div>
                  </div>
                  <div class="bg-white border border-slate-200 rounded-lg p-2.5 text-xs text-slate-700 shadow-xs leading-relaxed break-words whitespace-pre-wrap select-text">
                    {{ cmt.text }}
                  </div>
                </div>
              </div>

              <!-- Activity Tab Content -->
              <div v-else class="flex-1 p-4 overflow-y-auto space-y-2.5 min-h-0 text-xs">
                <div v-if="activityLog.length === 0" class="py-6 text-center text-slate-400 select-none">
                  <Clock class="size-5 mx-auto text-slate-300 mb-1" />
                  <p class="font-medium text-slate-600 text-xs">No activity logged yet</p>
                </div>
                <div
                  v-else
                  v-for="(act, idx) in activityLog"
                  :key="idx"
                  class="flex items-start gap-2 text-slate-600 pb-2 border-b border-slate-100 last:border-b-0"
                >
                  <div class="size-1.5 rounded-full bg-teal-600 mt-1.5 shrink-0"></div>
                  <div class="flex-1">
                    <p><strong class="text-slate-800">{{ act.user }}</strong> {{ act.action }}</p>
                    <span class="text-[10px] text-slate-400">{{ act.time }}</span>
                  </div>
                </div>
              </div>

              <!-- Sticky Comment Input Box -->
              <div class="p-3 bg-white border-t border-slate-200 shrink-0">
                <div class="border border-slate-200 rounded-lg overflow-hidden focus-within:border-teal-600 focus-within:bg-white bg-slate-50">
                  <textarea
                    v-model="newComment"
                    rows="2"
                    class="w-full text-xs p-2 bg-transparent border-0 resize-none focus:ring-0 focus:outline-none placeholder-slate-400 text-slate-800 leading-relaxed"
                    placeholder="Add a comment or mention @team..."
                    @keydown.enter.exact.prevent="addComment"
                    @keydown.meta.enter="addComment"
                    @keydown.ctrl.enter="addComment"
                  ></textarea>
                  <div class="flex items-center justify-between px-2 py-1.5 bg-white border-t border-slate-200/80">
                    <div class="flex items-center space-x-1">
                      <button
                        type="button"
                        class="w-6 h-6 rounded flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
                        title="Bold"
                        @click="formatCommentBold"
                      >
                        <span class="font-bold text-[11px]">B</span>
                      </button>
                      <button
                        type="button"
                        class="w-6 h-6 rounded flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
                        title="Italic"
                        @click="formatCommentItalic"
                      >
                        <span class="italic text-[11px]">I</span>
                      </button>
                      <label
                        class="w-6 h-6 rounded flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
                        title="Attach file"
                      >
                        <Paperclip class="size-3" />
                        <input type="file" class="sr-only" @change="handleFileUpload" />
                      </label>
                      <button
                        type="button"
                        class="w-6 h-6 rounded flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
                        title="Mention someone (@)"
                        @click="insertMentionShortcut"
                      >
                        <AtSign class="size-3" />
                      </button>
                    </div>
                    <button
                      type="button"
                      :disabled="!newComment.trim() || submittingComment"
                      class="inline-flex items-center gap-1 px-2.5 py-1 bg-teal-600 hover:bg-teal-700 active:bg-teal-800 text-white rounded text-[11px] font-medium transition-colors cursor-pointer disabled:opacity-50"
                      @click="addComment"
                    >
                      <Loader2 v-if="submittingComment" class="size-2.5 animate-spin" />
                      <span>Send</span>
                      <ArrowRight v-if="!submittingComment" class="size-2.5" />
                    </button>
                  </div>
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
import { MultiSelect, DatePicker, toast } from 'frappe-ui'
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
  fetchTaskAttachments,
  deleteTaskAttachment,
  uploadTaskAttachment,
} from '../data/api'
import TaskRichEditor from './TaskRichEditor.vue'
import {
  ArrowLeft,
  Copy,
  Share2,
  Trash2,
  Check,
  AlertTriangle,
  ArrowRight,
  Paperclip,
  Calendar,
  Ticket,
  User,
  UserCheck,
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
  ChevronDown,
  Flag,
  Bug,
  Sparkles,
  CheckSquare,
  AtSign,
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
    DatePicker,
    MultiSelect,
    TaskRichEditor,
    ArrowLeft,
    Copy,
    Share2,
    Trash2,
    Check,
    AlertTriangle,
    ArrowRight,
    Paperclip,
    Calendar,
    Ticket,
    User,
    UserCheck,
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
    ChevronDown,
    Flag,
    Bug,
    Sparkles,
    CheckSquare,
    AtSign,
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
      activeRightTab: 'comments',
      localTeamMembers: [],
      taskTypes: ['Task', 'Bug', 'Customization Request'],
      vendorOptions: [
        'Netwin Vendor',
        'SIL Vendor',
        'Whitestone Vendor',
        'Perfios Vendor',
        'Infosys Vendor',
        'Operation Team',
        'Our Side',
        'Rhythmflows',
      ],
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
      newComment: '',
      rowCls: 'w-full rounded px-2.5 py-1.5 text-left text-xs font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition cursor-pointer whitespace-nowrap',
    }
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

      if (!team && this.allAvailableTeamMembers.length > 0) {
        return this.allAvailableTeamMembers.map((m) => ({
          value: m.user || m.employee,
          label: m.employee_name ? `${m.employee_name} (${m.team})` : (m.user || m.employee),
        }))
      }

      return []
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
      this.form.assignees = this.form.assignees.filter((a) => this.getAssigneeValue(a) !== targetVal)
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
      setDate(d)
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
    copyTaskId() {
      if (!this.form.id) return
      navigator.clipboard.writeText(this.form.id)
      toast.success(`Task ID "${this.form.id}" copied`)
    },
    copyShareLink() {
      navigator.clipboard.writeText(window.location.href)
      toast.success('Task link copied to clipboard')
    },
    copyText(text) {
      if (!text) return
      navigator.clipboard.writeText(text)
      toast.success('Copied to clipboard')
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
        bg: 'bg-slate-100 border border-slate-200 text-slate-600',
        icon: 'FileText',
        iconColor: 'text-slate-600',
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
      } else if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault()
        this.save()
      }
    },
    close() {
      this.$emit('update:modelValue', false)
      this.$emit('close')
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
        let res = null
        if (this.onSave) {
          res = await this.onSave(updated)
        } else {
          res = await saveTask(updated)
          this.$emit('save', res || updated)
          toast.success('Task saved successfully')
        }
        if (res && res.id && !this.form.id) {
          this.form.id = res.id
        }
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
