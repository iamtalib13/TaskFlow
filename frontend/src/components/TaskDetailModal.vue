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
        <div class="flex items-center gap-2.5 shrink-0">
          <!-- Save Status Indicator -->
          <div class="hidden sm:flex items-center gap-1.5 text-xs text-gray-500 font-medium mr-1">
            <Cloud class="size-3.5 text-[#417c7d]" />
            <span>All changes saved</span>
          </div>

          <!-- Status Dropdown Selector -->
          <div class="relative">
            <select
              v-model="form.status"
              class="appearance-none pl-6 pr-6 py-1 text-xs font-semibold rounded-full border cursor-pointer transition focus:ring-2 focus:ring-[#417c7d]/20 focus:border-[#417c7d] outline-none"
              :class="getStatusSelectClass(form.status)"
            >
              <option v-for="s in statuses" :key="s" :value="s">{{ s }}</option>
            </select>
            <span
              class="absolute left-2.5 top-1/2 -translate-y-1/2 size-2 rounded-full pointer-events-none"
              :class="getStatusDotClass(form.status)"
            />
            <ChevronDown class="absolute right-2 top-1/2 -translate-y-1/2 size-3 pointer-events-none opacity-60" />
          </div>

          <!-- Priority Dropdown Selector -->
          <div class="relative">
            <select
              v-model="form.priority"
              class="appearance-none pl-6 pr-6 py-1 text-xs font-semibold rounded-full border cursor-pointer transition focus:ring-2 focus:ring-[#417c7d]/20 focus:border-[#417c7d] outline-none bg-blue-50/60 text-blue-700 border-blue-200"
            >
              <option v-for="p in priorities" :key="p" :value="p">{{ p }}</option>
            </select>
            <Flag class="absolute left-2.5 top-1/2 -translate-y-1/2 size-3 pointer-events-none text-blue-600" />
            <ChevronDown class="absolute right-2 top-1/2 -translate-y-1/2 size-3 pointer-events-none text-blue-500" />
          </div>

          <!-- Cancel Button -->
          <button
            type="button"
            class="px-3 py-1 text-xs font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition cursor-pointer"
            @click="close"
          >
            Cancel
          </button>

          <!-- Save Task Button -->
          <button
            type="button"
            :disabled="saving"
            class="inline-flex items-center gap-1.5 px-3.5 py-1 bg-[#417c7d] hover:bg-[#366869] active:bg-[#2b5354] text-white text-xs font-semibold rounded-lg shadow-xs transition cursor-pointer disabled:opacity-50"
            title="Save Task (⌘S)"
            @click="save"
          >
            <Check v-if="!saving" class="size-3.5 stroke-[2.5]" />
            <span v-else class="size-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
            <span>Save Task</span>
            <kbd class="ml-0.5 px-1 py-0.2 rounded text-[10px] bg-white/20 font-mono font-normal">⌘S</kbd>
          </button>
        </div>
      </header>

      <!-- 3-COLUMN MAIN BODY LAYOUT -->
      <div class="flex-1 min-h-0 overflow-y-auto p-4 bg-[#f8fafc] flex flex-col xl:flex-row gap-4">
        <!-- COLUMN 1: LEFT SIDEBAR (Assignment, Schedule & Ticket) -->
        <aside class="w-full xl:w-[270px] shrink-0 space-y-3 text-xs select-none">
          <!-- Card 1: ASSIGNMENT -->
          <div class="bg-white rounded-xl border border-gray-200/80 shadow-xs p-3 space-y-2.5">
            <div class="flex items-center justify-between text-[11px] font-bold text-gray-500 uppercase tracking-wider">
              <span>ASSIGNMENT</span>
              <Info class="size-3.5 text-gray-400 hover:text-gray-600 cursor-pointer" title="Assignment details" />
            </div>

            <!-- Assigned to -->
            <div>
              <label class="block font-semibold text-[11px] text-gray-600 mb-1">Assigned to</label>
              <!-- Selected assignees chips with avatar and remove icon -->
              <div v-if="form.assignees && form.assignees.length > 0" class="space-y-1 mb-1.5">
                <div
                  v-for="assignee in form.assignees"
                  :key="getAssigneeValue(assignee)"
                  class="flex items-center justify-between px-2 py-1 rounded-lg bg-gray-50 border border-gray-200/80 hover:bg-gray-100/70 transition"
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
                placeholder="Add Assignee..."
                size="sm"
                class="w-full"
              />
            </div>

            <!-- Pending With -->
            <div>
              <label class="block font-semibold text-[11px] text-gray-600 mb-1">Pending With</label>
              <input
                v-model="form.pending_with"
                type="text"
                placeholder="Pending with..."
                class="w-full bg-white border border-gray-200 rounded-lg px-2.5 py-1 text-xs text-gray-800 placeholder-gray-400 font-medium focus:ring-2 focus:ring-[#417c7d]/20 focus:border-[#417c7d] outline-none transition"
              />
            </div>

            <!-- Pending From -->
            <div>
              <label class="block font-semibold text-[11px] text-gray-600 mb-1">Pending From</label>
              <input
                v-model="form.pending_from"
                type="text"
                placeholder="Whitestone Vendor"
                class="w-full bg-white border border-gray-200 rounded-lg px-2.5 py-1 text-xs text-gray-800 placeholder-gray-400 font-medium focus:ring-2 focus:ring-[#417c7d]/20 focus:border-[#417c7d] outline-none transition"
              />
            </div>

            <!-- Guided By -->
            <div>
              <label class="block font-semibold text-[11px] text-gray-600 mb-1">Guided By</label>
              <input
                v-model="form.guided_by"
                type="text"
                placeholder="MANSI DHARMARAJ YADAV"
                class="w-full bg-white border border-gray-200 rounded-lg px-2.5 py-1 text-xs text-gray-800 placeholder-gray-400 font-medium focus:ring-2 focus:ring-[#417c7d]/20 focus:border-[#417c7d] outline-none transition"
              />
            </div>

            <!-- Responsible Person -->
            <div>
              <label class="block font-semibold text-[11px] text-gray-600 mb-1">Responsible Person</label>
              <input
                v-model="form.responsible_person"
                type="text"
                placeholder="SNEHAL YADORAO BORKAR"
                class="w-full bg-white border border-gray-200 rounded-lg px-2.5 py-1 text-xs text-gray-800 placeholder-gray-400 font-medium focus:ring-2 focus:ring-[#417c7d]/20 focus:border-[#417c7d] outline-none transition"
              />
            </div>
          </div>

          <!-- Card 2: SCHEDULE -->
          <div class="bg-white rounded-xl border border-gray-200/80 shadow-xs p-3 space-y-2.5">
            <div class="flex items-center justify-between text-[11px] font-bold text-gray-500 uppercase tracking-wider">
              <span>SCHEDULE</span>
              <Calendar class="size-3.5 text-gray-400" />
            </div>

            <!-- Start Date -->
            <div>
              <label class="block font-semibold text-[11px] text-gray-600 mb-1">Start Date</label>
              <div class="relative flex items-center">
                <input
                  v-model="displayStartDate"
                  type="text"
                  placeholder="DD-MM-YYYY"
                  class="w-full bg-white border border-gray-200 rounded-lg pl-2.5 pr-7 py-1 text-xs text-gray-800 font-mono focus:ring-2 focus:ring-[#417c7d]/20 focus:border-[#417c7d] outline-none transition"
                />
                <label class="absolute right-2 text-gray-400 hover:text-gray-700 cursor-pointer">
                  <Calendar class="size-3.5" />
                  <input
                    type="date"
                    :value="form.start_date"
                    class="sr-only"
                    @change="onStartDateChange"
                  />
                </label>
              </div>
            </div>

            <!-- Due Date -->
            <div>
              <div class="flex items-center justify-between mb-1">
                <label class="font-semibold text-[11px] text-gray-600">Due Date</label>
                <span
                  class="px-1.5 py-0.2 rounded text-[10px] font-bold border tracking-wide uppercase"
                  :class="isOverdue ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'"
                >
                  {{ isOverdue ? 'OVERDUE' : 'On Time' }}
                </span>
              </div>
              <div class="relative flex items-center">
                <input
                  v-model="displayDueDate"
                  type="text"
                  placeholder="DD-MM-YYYY"
                  class="w-full rounded-lg pl-2.5 pr-7 py-1 text-xs font-mono outline-none transition"
                  :class="isOverdue ? 'bg-rose-50/50 border border-rose-300 text-rose-700 font-semibold focus:ring-2 focus:ring-rose-200 focus:border-rose-400' : 'bg-white border border-gray-200 text-gray-800 focus:ring-2 focus:ring-[#417c7d]/20 focus:border-[#417c7d]'"
                />
                <label class="absolute right-2 cursor-pointer">
                  <AlertTriangle v-if="isOverdue" class="size-3.5 text-rose-600" />
                  <Calendar v-else class="size-3.5 text-gray-400 hover:text-gray-700" />
                  <input
                    type="date"
                    :value="form.due_date"
                    class="sr-only"
                    @change="onNativeDateChange"
                  />
                </label>
              </div>
            </div>

            <!-- Expected Resolution Date -->
            <div>
              <label class="block font-semibold text-[11px] text-gray-600 mb-1">Expected Resolution Date</label>
              <div class="relative flex items-center">
                <input
                  v-model="displayResolutionDate"
                  type="text"
                  placeholder="DD-MM-YYYY"
                  class="w-full bg-white border border-gray-200 rounded-lg pl-2.5 pr-7 py-1 text-xs text-gray-800 font-mono focus:ring-2 focus:ring-[#417c7d]/20 focus:border-[#417c7d] outline-none transition"
                />
                <label class="absolute right-2 text-gray-400 hover:text-gray-700 cursor-pointer">
                  <Calendar class="size-3.5" />
                  <input
                    type="date"
                    :value="form.expected_resolution_date"
                    class="sr-only"
                    @change="form.expected_resolution_date = $event.target.value"
                  />
                </label>
              </div>
            </div>

            <!-- Completed On -->
            <div>
              <label class="block font-semibold text-[11px] text-gray-600 mb-1">Completed On</label>
              <div class="relative flex items-center">
                <input
                  v-model="displayCompletedOn"
                  type="text"
                  placeholder="DD-MM-YYYY"
                  class="w-full bg-white border border-gray-200 rounded-lg pl-2.5 pr-7 py-1 text-xs text-gray-800 font-mono focus:ring-2 focus:ring-[#417c7d]/20 focus:border-[#417c7d] outline-none transition"
                />
                <label class="absolute right-2 text-gray-400 hover:text-gray-700 cursor-pointer">
                  <Calendar class="size-3.5" />
                  <input
                    type="date"
                    :value="form.completed_on"
                    class="sr-only"
                    @change="form.completed_on = $event.target.value"
                  />
                </label>
              </div>
            </div>

            <!-- Time Estimate -->
            <div>
              <label class="block font-semibold text-[11px] text-gray-600 mb-1">Time Estimate</label>
              <div class="relative flex items-center">
                <input
                  v-model.number="form.estimated_hours"
                  type="number"
                  step="0.25"
                  min="0"
                  placeholder="0.00"
                  class="w-full bg-white border border-gray-200 rounded-lg pl-2.5 pr-9 py-1 text-xs text-gray-800 font-mono focus:ring-2 focus:ring-[#417c7d]/20 focus:border-[#417c7d] outline-none transition"
                />
                <span class="absolute right-2 text-[10px] font-semibold text-gray-400 pointer-events-none">hrs</span>
              </div>
            </div>
          </div>

          <!-- Card 3: 🎫 TICKET -->
          <div class="bg-white rounded-xl border border-gray-200/80 shadow-xs p-3 space-y-2.5">
            <div class="flex items-center justify-between text-[11px] font-bold text-gray-500 uppercase tracking-wider">
              <span class="flex items-center gap-1">
                <span>🎫</span>
                <span>Ticket</span>
              </span>
              <Ticket class="size-3.5 text-gray-400" />
            </div>

            <!-- Ticket Date -->
            <div>
              <label class="block font-semibold text-[11px] text-gray-600 mb-1">Ticket Date</label>
              <div class="relative flex items-center">
                <input
                  v-model="displayTicketDate"
                  type="text"
                  placeholder="DD-MM-YYYY"
                  class="w-full bg-white border border-gray-200 rounded-lg pl-2.5 pr-7 py-1 text-xs text-gray-800 font-mono focus:ring-2 focus:ring-[#417c7d]/20 focus:border-[#417c7d] outline-none transition"
                />
                <label class="absolute right-2 text-gray-400 hover:text-gray-700 cursor-pointer">
                  <Calendar class="size-3.5" />
                  <input
                    type="date"
                    :value="form.ticket_date"
                    class="sr-only"
                    @change="form.ticket_date = $event.target.value"
                  />
                </label>
              </div>
            </div>

            <!-- Toll ID -->
            <div>
              <label class="block font-semibold text-[11px] text-gray-600 mb-1">Toll ID</label>
              <input
                v-model="form.toll_id"
                type="text"
                placeholder="Enter Toll ID"
                class="w-full bg-white border border-gray-200 rounded-lg px-2.5 py-1 text-xs text-gray-800 placeholder-gray-400 font-medium focus:ring-2 focus:ring-[#417c7d]/20 focus:border-[#417c7d] outline-none transition"
              />
            </div>

            <!-- Ticket ID -->
            <div>
              <label class="block font-semibold text-[11px] text-gray-600 mb-1">Ticket ID</label>
              <input
                v-model="form.ticket_id"
                type="text"
                placeholder="e.g. TKT-001"
                class="w-full bg-white border border-gray-200 rounded-lg px-2.5 py-1 text-xs text-gray-800 placeholder-gray-400 font-mono font-medium focus:ring-2 focus:ring-[#417c7d]/20 focus:border-[#417c7d] outline-none transition"
              />
            </div>

            <!-- Raised By -->
            <div>
              <label class="block font-semibold text-[11px] text-gray-600 mb-1">Raised By</label>
              <input
                v-model="form.ticket_raised_by"
                type="text"
                placeholder="Name or email"
                class="w-full bg-white border border-gray-200 rounded-lg px-2.5 py-1 text-xs text-gray-800 placeholder-gray-400 font-medium focus:ring-2 focus:ring-[#417c7d]/20 focus:border-[#417c7d] outline-none transition"
              />
            </div>

            <!-- Ticket Description -->
            <div>
              <label class="block font-semibold text-[11px] text-gray-600 mb-1">Ticket Description</label>
              <textarea
                v-model="form.ticket_description"
                rows="2"
                placeholder="Brief description of the ticket..."
                class="w-full bg-white border border-gray-200 rounded-lg px-2.5 py-1 text-xs text-gray-800 placeholder-gray-400 font-medium focus:ring-2 focus:ring-[#417c7d]/20 focus:border-[#417c7d] outline-none transition resize-none"
              ></textarea>
            </div>
          </div>
        </aside>

        <!-- COLUMN 2: CENTER MAIN CONTENT (Header, Rich Description & Attachments) -->
        <main class="flex-1 min-w-0 space-y-4">
          <!-- Header Info Card -->
          <div class="bg-white rounded-xl border border-gray-200/80 shadow-xs p-5 space-y-3">
            <!-- Project & Task Type Pill Bar -->
            <div class="flex flex-wrap items-center justify-between gap-2">
              <div class="flex items-center gap-1.5">
                <span class="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#417c7d]/10 text-[#417c7d] border border-[#417c7d]/25">
                  {{ form.project || 'Drishti Core' }}
                </span>
                <ChevronRight class="size-3.5 text-gray-400" />
                <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-700 border border-gray-200/60">
                  <CheckCircle class="size-3 text-emerald-600 stroke-[2.5]" />
                  Task
                </span>
              </div>

              <div class="font-mono text-xs font-bold text-gray-500">
                ID: {{ form.id || '849204' }}
              </div>
            </div>

            <!-- Task Title (Editable headline input) -->
            <div>
              <input
                v-model="form.title"
                type="text"
                placeholder="Task title..."
                class="w-full text-xl sm:text-2xl font-bold text-gray-900 border-none p-0 focus:ring-0 focus:outline-none placeholder-gray-300 tracking-tight leading-snug"
              />
            </div>

            <!-- Meta: Created By & Updated Time -->
            <div class="flex flex-wrap items-center gap-3 text-xs text-gray-500 pt-1">
              <span class="inline-flex items-center gap-1.5">
                <User class="size-3.5 text-gray-400" />
                <span>Created by <strong class="text-gray-700">{{ form.reporter || 'Talib Sheikh' }}</strong></span>
              </span>
              <span class="text-gray-300">•</span>
              <span class="inline-flex items-center gap-1.5">
                <Clock class="size-3.5 text-gray-400" />
                <span>Updated {{ updatedTimeAgo }}</span>
              </span>
            </div>
          </div>

          <!-- Rich Text Description Card -->
          <div class="bg-white rounded-xl border border-gray-200/80 shadow-xs p-4 space-y-2">
            <div class="flex items-center justify-between mb-1">
              <h4 class="text-xs font-bold text-gray-600 uppercase tracking-wider">
                Description
              </h4>
              <span class="text-[11px] text-gray-400 italic font-normal">
                Markdown & Rich formatting supported
              </span>
            </div>

            <TaskRichEditor
              v-model="form.description"
              :people="people"
              min-height="min-h-64"
              placeholder="Write description, acceptance criteria, or type / for blocks..."
            />
          </div>

          <!-- Attachments Card -->
          <div class="bg-white rounded-xl border border-gray-200/80 shadow-xs p-4 space-y-3">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <h4 class="text-xs font-bold text-gray-800 uppercase tracking-wider">
                  Attachments
                </h4>
                <span class="px-2 py-0.5 rounded-full text-[11px] font-bold bg-gray-100 text-gray-600">
                  {{ attachments.length }}
                </span>
              </div>
              <button
                type="button"
                class="text-xs font-semibold text-[#417c7d] hover:text-[#2b5354] transition cursor-pointer"
                @click="downloadAll"
              >
                Download all
              </button>
            </div>

            <!-- Attachments Grid -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div
                v-for="att in attachments"
                :key="att.name"
                class="flex items-center justify-between p-2.5 bg-gray-50/70 hover:bg-gray-100/80 border border-gray-200/80 rounded-xl transition group"
              >
                <div class="flex items-center gap-2.5 min-w-0">
                  <div
                    class="size-8 rounded-lg flex items-center justify-center shrink-0"
                    :class="att.type.includes('png') || att.type.includes('image') ? 'bg-[#417c7d]/10 text-[#417c7d]' : 'bg-blue-100 text-blue-700'"
                  >
                    <Image v-if="att.type.includes('png') || att.type.includes('image')" class="size-4" />
                    <FileText v-else class="size-4" />
                  </div>
                  <div class="truncate">
                    <p class="text-xs font-semibold text-gray-800 truncate" :title="att.name">{{ att.name }}</p>
                    <p class="text-[11px] text-gray-500">{{ att.size }} • {{ att.type }}</p>
                  </div>
                </div>

                <a
                  :href="att.url || '#'"
                  download
                  class="p-1.5 text-gray-400 group-hover:text-gray-700 hover:bg-gray-200 rounded-lg transition shrink-0 cursor-pointer"
                  title="Download file"
                >
                  <Download class="size-3.5" />
                </a>
              </div>
            </div>

            <!-- Drag & Drop Upload Zone -->
            <label class="flex flex-col items-center justify-center border-2 border-dashed border-gray-200 hover:border-[#417c7d] hover:bg-[#417c7d]/5 rounded-xl p-4 cursor-pointer transition text-center group">
              <UploadCloud class="size-6 text-[#417c7d] group-hover:scale-110 transition-transform mb-1.5" />
              <p class="text-xs font-medium text-gray-700">
                <span class="text-[#417c7d] font-semibold underline">Click to upload</span> or drag and drop files here
              </p>
              <p class="text-[10px] text-gray-400 mt-0.5">PNG, JPG, PDF, DOCX up to 25MB</p>
              <input type="file" multiple class="sr-only" @change="handleFileUpload" />
            </label>
          </div>
        </main>

        <!-- COLUMN 3: RIGHT SIDEBAR (Comments Stream & Activity Audit) -->
        <aside class="w-full xl:w-[340px] shrink-0 flex flex-col bg-white rounded-xl border border-gray-200/80 shadow-xs overflow-hidden">
          <!-- Top Tabs Header -->
          <div class="flex items-center justify-between border-b border-gray-200 px-4 pt-3 shrink-0 select-none">
            <div class="flex items-center gap-4">
              <button
                type="button"
                class="pb-2.5 text-xs font-bold transition border-b-2 cursor-pointer inline-flex items-center gap-1.5"
                :class="activeRightTab === 'comments' ? 'border-[#417c7d] text-[#417c7d]' : 'border-transparent text-gray-500 hover:text-gray-800'"
                @click="activeRightTab = 'comments'"
              >
                <span>Comments ({{ comments.length }})</span>
                <Loader2 v-if="loadingComments" class="size-3 animate-spin text-[#417c7d]" />
              </button>
              <button
                type="button"
                class="pb-2.5 text-xs font-bold transition border-b-2 cursor-pointer"
                :class="activeRightTab === 'activity' ? 'border-[#417c7d] text-[#417c7d]' : 'border-transparent text-gray-500 hover:text-gray-800'"
                @click="activeRightTab = 'activity'"
              >
                Activity Audit
              </button>
            </div>

            <button type="button" class="pb-2 text-gray-400 hover:text-gray-700 cursor-pointer" title="Timeline options">
              <SlidersHorizontal class="size-3.5" />
            </button>
          </div>

          <!-- Comments Feed Tab Content -->
          <div v-if="activeRightTab === 'comments'" class="flex-1 overflow-y-auto p-4 space-y-3.5 min-h-[300px]">
            <!-- Loading indicator when fetching comments -->
            <div v-if="loadingComments && comments.length === 0" class="py-12 flex flex-col items-center justify-center gap-2 text-gray-400">
              <Loader2 class="size-5 animate-spin text-[#417c7d]" />
              <span class="text-xs text-gray-500 font-medium">Loading actual comments...</span>
            </div>

            <!-- Empty state when no comments exist -->
            <div v-else-if="comments.length === 0" class="py-12 text-center text-gray-400 space-y-1.5 select-none">
              <MessageSquare class="size-6 mx-auto stroke-1 text-gray-300 mb-1" />
              <p class="text-xs font-semibold text-gray-600">No comments yet</p>
              <p class="text-[11px] text-gray-400">Be the first to leave a comment or note.</p>
            </div>

            <!-- Comments List -->
            <template v-else v-for="(cmt, idx) in comments" :key="cmt.id || idx">
              <!-- Regular Comment Bubble -->
              <div v-if="!cmt.isDivider" class="space-y-1 text-xs group">
                <div class="flex items-center justify-between text-gray-500">
                  <div class="flex items-center gap-2 min-w-0">
                    <span
                      class="size-5 rounded-full text-white font-bold text-[9px] flex items-center justify-center shrink-0"
                      :class="getAvatarColor(cmt.author)"
                    >
                      {{ getInitials(cmt.author) }}
                    </span>
                    <span class="font-bold text-gray-800 truncate max-w-[150px]">{{ cmt.author }}</span>
                  </div>
                  <div class="flex items-center gap-1.5">
                    <span class="text-[10px] text-gray-400">{{ cmt.time }}</span>
                    <!-- Delete comment action -->
                    <button
                      v-if="cmt.can_delete || cmt.id"
                      type="button"
                      class="opacity-0 group-hover:opacity-100 transition p-1 rounded hover:bg-rose-50 text-gray-400 hover:text-rose-600 cursor-pointer"
                      title="Delete comment"
                      @click="deleteComment(cmt.id, idx)"
                    >
                      <Trash2 class="size-3" />
                    </button>
                  </div>
                </div>
                <div class="ml-7 p-2.5 bg-gray-50/80 hover:bg-gray-100/70 border border-gray-200/60 rounded-xl text-gray-700 leading-relaxed transition whitespace-pre-wrap">
                  {{ cmt.text }}
                </div>
              </div>

              <!-- Status Change Divider -->
              <div v-else class="relative py-2 flex items-center justify-center">
                <div class="border-t border-gray-200 w-full absolute"></div>
                <span class="relative bg-white px-2.5 text-[10px] font-bold tracking-wider text-gray-400 uppercase select-none">
                  {{ cmt.text }}
                </span>
              </div>
            </template>
          </div>

          <!-- Activity Audit Tab Content -->
          <div v-else class="flex-1 overflow-y-auto p-4 space-y-3 min-h-[300px] text-xs">
            <div
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

          <!-- Comment Input Box (Pinned at bottom) -->
          <div class="p-3 border-t border-gray-200 bg-gray-50/50 space-y-2 shrink-0">
            <textarea
              v-model="newComment"
              rows="3"
              placeholder="Write a comment or type @ to mention..."
              class="w-full bg-white border border-gray-200 rounded-xl p-2.5 text-xs text-gray-800 outline-none focus:ring-2 focus:ring-[#417c7d]/20 focus:border-[#417c7d] transition resize-none placeholder-gray-400"
              @keydown.meta.enter="addComment"
              @keydown.ctrl.enter="addComment"
            ></textarea>

            <div class="flex items-center justify-between">
              <!-- Mention, Attach, Emoji Actions -->
              <div class="flex items-center gap-1 text-gray-400">
                <button
                  type="button"
                  class="p-1 hover:text-gray-700 hover:bg-gray-200/70 rounded-md transition cursor-pointer"
                  title="Mention someone (@)"
                  @click="insertMentionShortcut"
                >
                  <AtSign class="size-3.5" />
                </button>
                <label class="p-1 hover:text-gray-700 hover:bg-gray-200/70 rounded-md transition cursor-pointer" title="Attach file">
                  <Paperclip class="size-3.5" />
                  <input type="file" class="sr-only" @change="handleFileUpload" />
                </label>
                <button
                  type="button"
                  class="p-1 hover:text-gray-700 hover:bg-gray-200/70 rounded-md transition cursor-pointer"
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
                <span>{{ submittingComment ? 'Posting...' : 'Comment' }}</span>
                <kbd v-if="!submittingComment" class="text-[10px] bg-white/20 px-1 py-0.2 rounded font-mono">⌘↵</kbd>
              </button>
            </div>
          </div>
        </aside>
      </div>
    </div>
  </div>
</template>

<script>
import { MultiSelect } from 'frappe-ui'
import { fetchTaskComments, addTaskComment, deleteTaskComment } from '../data/api'
import TaskRichEditor from './TaskRichEditor.vue'
import {
  ArrowLeft,
  Cloud,
  Check,
  Info,
  X,
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
} from 'lucide-vue-next'

export default {
  name: 'TaskDetailModal',
  components: {
    MultiSelect,
    TaskRichEditor,
    ArrowLeft,
    Cloud,
    Check,
    Info,
    X,
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
  },
  props: {
    modelValue: {
      type: Boolean,
      default: false,
    },
    task: {
      type: Object,
      default: null,
    },
    projects: {
      type: Array,
      default: () => [],
    },
    people: {
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
  },
  emits: ['update:modelValue', 'save', 'close'],
  data() {
    return {
      saving: false,
      loadingComments: false,
      submittingComment: false,
      newComment: '',
      activeRightTab: 'comments',
      form: {
        id: '',
        title: '',
        description: '',
        status: 'On Hold',
        priority: 'Medium',
        project: 'Drishti Core',
        assignees: [],
        assigned_to: '',
        reporter: 'Talib Sheikh',
        pending_with: '',
        pending_from: 'Whitestone Vendor',
        guided_by: 'MANSI DHARMARAJ YADAV',
        responsible_person: 'SNEHAL YADORAO BORKAR',
        start_date: '2026-09-05',
        due_date: '2026-09-11',
        expected_resolution_date: '',
        completed_on: '',
        estimated_hours: 0,
        logged_hours: 0,
        ticket_date: '',
        toll_id: '',
        ticket_id: '',
        ticket_raised_by: '',
        ticket_description: '',
      },
      attachments: [
        {
          name: 'wireframe_v2_mockup.png',
          size: '1.4 MB',
          type: 'PNG Image',
          url: '#',
        },
        {
          name: 'drishti_ui_specs.pdf',
          size: '420 KB',
          type: 'PDF Document',
          url: '#',
        },
      ],
      comments: [],
      activityLog: [
        { user: 'Talib Sheikh', action: 'changed status from Open to On Hold', time: '1h ago' },
        { user: 'Sarah Chen', action: 'approved layout changes', time: '2h ago' },
        { user: 'Talib Sheikh', action: 'created this task in Drishti Core', time: 'Yesterday' },
      ],
    }
  },
  watch: {
    task: {
      immediate: true,
      handler(t) {
        if (t) {
          let assigneesList = []
          if (Array.isArray(t.assignees)) {
            assigneesList = [...t.assignees]
          } else if (Array.isArray(t.table_gqbl)) {
            assigneesList = t.table_gqbl.map((row) => row.user_id || row.employee_name).filter(Boolean)
          } else if (typeof t.assigned_to === 'string' && t.assigned_to.trim()) {
            assigneesList = t.assigned_to.split(',').map((s) => s.trim()).filter(Boolean)
          }

          this.form = {
            id: t.id || '',
            title: t.title || '',
            description: t.description || this.getDefaultDescription(),
            status: t.status || 'Open',
            priority: t.priority || 'Medium',
            project: t.project || 'Drishti Core',
            assignees: assigneesList,
            assigned_to: t.assigned_to || '',
            reporter: t.reporter || t.owner || 'Talib Sheikh',
            pending_with: t.pending_with || '',
            pending_from: t.pending_from || 'Whitestone Vendor',
            guided_by: t.guided_by || 'MANSI DHARMARAJ YADAV',
            responsible_person: t.responsible_person || 'SNEHAL YADORAO BORKAR',
            start_date: t.start_date || '2026-09-05',
            due_date: t.due_date || t.due || '2026-09-11',
            expected_resolution_date: t.expected_resolution_date || '',
            completed_on: t.completed_on || '',
            estimated_hours: t.estimated_hours || 0,
            logged_hours: t.logged_hours || 0,
            ticket_date: t.ticket_date || '',
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

          // Fetch fresh real comments from Frappe Comment doctype
          if (t.id && t.id !== 'new') {
            this.loadActualComments(t.id)
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
    assigneeOptions() {
      const list = Array.isArray(this.people) ? this.people : []
      return list.map((p) => ({
        value: p.email || p.name,
        label: p.name || p.email,
      }))
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
      return typeof assignee === 'object' ? (assignee.value || assignee.name || assignee.email) : assignee
    },
    getAssigneeName(assignee) {
      const val = this.getAssigneeValue(assignee)
      if (!val) return ''
      const p = (this.people || []).find((x) => x.email === val || x.name === val)
      return p ? (p.name || p.email) : val
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
        }
      } catch (err) {
        console.warn('Failed to load actual comments:', err)
      } finally {
        this.loadingComments = false
      }
    },
    getDefaultDescription() {
      return `<p>During the client review meeting with the Regional Operations Directorate, it was reported that having <span class="px-1.5 py-0.5 rounded bg-[#417c7d]/10 text-[#417c7d] font-semibold">Branch Name</span> and <span class="px-1.5 py-0.5 rounded bg-[#417c7d]/10 text-[#417c7d] font-semibold">District Code</span> on stacked separate lines causes excessive vertical scrolling on 1080p dashboard terminals.</p>
<p><strong>Proposed Layout Modification:</strong></p>
<ul>
<li>Refactor the master filter header into a flex-grid layout aligning both selects on the horizontal axis.</li>
<li>Enforce responsive behavior: collapse into stacked fields below the <code>768px</code> tablet breakpoint.</li>
<li>Maintain existing autocomplete API throttle and pre-cache parameters without altering query parameters.</li>
</ul>`
    },
    formatDateDisplay(isoDate) {
      if (!isoDate) return ''
      const parts = String(isoDate).split('-')
      if (parts.length === 3) {
        const [y, m, d] = parts
        if (y.length === 4) return `${d.padStart(2, '0')}-${m.padStart(2, '0')}-${y}`
      }
      return isoDate
    },
    parseDateInput(val) {
      if (!val) return ''
      const parts = String(val).trim().split(/[-/]/)
      if (parts.length === 3) {
        const [d, m, y] = parts
        if (y && y.length === 4) {
          return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
        }
      }
      return val
    },
    onStartDateChange(e) {
      this.form.start_date = e.target.value
    },
    onNativeDateChange(e) {
      this.form.due_date = e.target.value
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
          }
        }
        this.comments.push(added)
        this.activityLog.unshift({
          user: added.author || 'You',
          action: 'added a new comment',
          time: 'Just now',
        })
        this.newComment = ''
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
      } catch (e) {
        console.error('Error deleting comment:', e)
      }
    },
    insertMentionShortcut() {
      this.newComment += ' @'
    },
    handleFileUpload(e) {
      const files = Array.from(e.target.files || [])
      files.forEach((f) => {
        this.attachments.push({
          name: f.name,
          size: `${Math.round(f.size / 1024)} KB`,
          type: f.type || 'Document',
          url: URL.createObjectURL(f),
        })
      })
    },
    downloadAll() {
      alert(`Downloading all ${this.attachments.length} attachments...`)
    },
    save() {
      this.saving = true
      const assigneeIds = (this.form.assignees || []).map((a) => this.getAssigneeValue(a)).filter(Boolean)
      const updated = {
        ...this.task,
        ...this.form,
        assignees: assigneeIds,
        assigned_to: assigneeIds.map((id) => this.getAssigneeName(id)).join(', '),
        table_gqbl: assigneeIds.map((id) => ({
          user_id: id,
          employee_name: this.getAssigneeName(id),
        })),
        comments: this.comments,
        attachments: this.attachments,
      }
      this.$emit('save', updated)
      setTimeout(() => {
        this.saving = false
        this.close()
      }, 250)
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
  },
}
</script>
