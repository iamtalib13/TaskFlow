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
            <div class="inline-flex items-center gap-1 font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md border border-purple-200/70">
              <span class="size-1.5 rounded-full bg-purple-600"></span>
              <span class="truncate max-w-[160px]">{{ form.project || 'Project' }}</span>
            </div>
            <span class="text-gray-400">/</span>
            <span class="font-mono font-bold text-purple-700">{{ form.id || 'TASK' }}</span>
          </nav>
        </div>

        <!-- Right: Status / Priority Controls & Action Buttons -->
        <div class="flex items-center gap-2.5 shrink-0">
          <!-- Save Status Indicator -->
          <div class="hidden sm:flex items-center gap-1.5 text-xs text-gray-500 font-medium mr-1">
            <Cloud class="size-3.5 text-blue-500" />
            <span>All changes saved</span>
          </div>

          <!-- Status Dropdown Selector -->
          <div class="relative">
            <select
              v-model="form.status"
              class="appearance-none pl-6 pr-6 py-1 text-xs font-semibold rounded-full border cursor-pointer transition focus:ring-2 focus:ring-purple-600 outline-none"
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
              class="appearance-none pl-6 pr-6 py-1 text-xs font-semibold rounded-full border cursor-pointer transition focus:ring-2 focus:ring-purple-600 outline-none bg-blue-50/60 text-blue-700 border-blue-200"
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
            class="inline-flex items-center gap-1.5 px-3.5 py-1 bg-purple-700 hover:bg-purple-800 active:bg-purple-900 text-white text-xs font-semibold rounded-lg shadow-xs transition cursor-pointer disabled:opacity-50"
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
        <!-- COLUMN 1: LEFT SIDEBAR (Assignment & Schedule) -->
        <aside class="w-full xl:w-[270px] shrink-0 space-y-4 text-xs select-none">
          <!-- Card 1: ASSIGNMENT -->
          <div class="bg-white rounded-xl border border-gray-200/80 shadow-xs p-4 space-y-3.5">
            <div class="flex items-center justify-between text-[11px] font-bold text-gray-500 uppercase tracking-wider">
              <span>ASSIGNMENT</span>
              <Info class="size-3.5 text-gray-400 hover:text-gray-600 cursor-pointer" title="Assignment information" />
            </div>

            <!-- Assigned To -->
            <div>
              <label class="block font-medium text-gray-600 mb-1.5">Assigned To</label>
              <div class="flex flex-wrap items-center gap-1.5">
                <div
                  v-if="form.assigned_to"
                  class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-purple-50 text-purple-800 border border-purple-200 font-semibold text-xs"
                >
                  <span class="size-4.5 rounded-full bg-purple-700 text-white font-bold text-[9px] flex items-center justify-center">
                    {{ getInitials(form.assigned_to) }}
                  </span>
                  <span class="truncate max-w-[130px]">{{ form.assigned_to }}</span>
                  <button
                    type="button"
                    class="text-purple-600 hover:text-purple-900 ml-0.5 cursor-pointer"
                    title="Remove assignee"
                    @click="form.assigned_to = ''"
                  >
                    <X class="size-3" />
                  </button>
                </div>

                <!-- Assign Dropdown / Button -->
                <div class="relative flex-1 min-w-[90px]">
                  <select
                    v-model="form.assigned_to"
                    class="w-full text-xs font-medium text-gray-600 bg-gray-50 hover:bg-gray-100 border border-dashed border-gray-300 rounded-lg px-2 py-1 outline-none cursor-pointer transition"
                  >
                    <option value="">+ Assign</option>
                    <option v-for="person in people" :key="person.email" :value="person.name">
                      {{ person.name }}
                    </option>
                  </select>
                </div>
              </div>
            </div>

            <!-- Pending With -->
            <div>
              <label class="block font-medium text-gray-600 mb-1">Pending With</label>
              <div class="relative">
                <select
                  v-model="form.pending_with"
                  class="w-full bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs text-gray-800 appearance-none font-medium focus:ring-2 focus:ring-purple-600 outline-none"
                >
                  <option value="">Unassigned</option>
                  <option value="Talib Sheikh (Tech Lead)">Talib Sheikh (Tech Lead)</option>
                  <option value="Frontend Architecture Team">Frontend Architecture Team</option>
                  <option value="Sarah Chen (Principal Arch)">Sarah Chen (Principal Arch)</option>
                  <option value="Faijan Qureshi">Faijan Qureshi</option>
                  <option value="Client Review Team">Client Review Team</option>
                </select>
                <ChevronsUpDown class="absolute right-2.5 top-1/2 -translate-y-1/2 size-3.5 text-gray-400 pointer-events-none" />
              </div>
            </div>

            <!-- Pending From -->
            <div>
              <label class="block font-medium text-gray-600 mb-1">Pending From</label>
              <div class="relative">
                <select
                  v-model="form.pending_from"
                  class="w-full bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs text-gray-800 appearance-none font-medium focus:ring-2 focus:ring-purple-600 outline-none"
                >
                  <option value="Frontend Architecture Team">Frontend Architecture Team</option>
                  <option value="Core Engineering">Core Engineering</option>
                  <option value="Product Operations">Product Operations</option>
                  <option value="QA Team">QA Team</option>
                </select>
                <ChevronDown class="absolute right-2.5 top-1/2 -translate-y-1/2 size-3.5 text-gray-400 pointer-events-none" />
              </div>
            </div>

            <!-- Guided By -->
            <div>
              <label class="block font-medium text-gray-600 mb-1">Guided By</label>
              <div class="relative">
                <select
                  v-model="form.guided_by"
                  class="w-full bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs text-gray-800 appearance-none font-medium focus:ring-2 focus:ring-purple-600 outline-none"
                >
                  <option value="Sarah Chen (Principal Arch)">Sarah Chen (Principal Arch)</option>
                  <option value="Talib Sheikh (Tech Lead)">Talib Sheikh (Tech Lead)</option>
                  <option value="Mukesh Khanna (Advisor)">Mukesh Khanna (Advisor)</option>
                </select>
                <ChevronDown class="absolute right-2.5 top-1/2 -translate-y-1/2 size-3.5 text-gray-400 pointer-events-none" />
              </div>
            </div>

            <!-- Responsible Person -->
            <div>
              <label class="block font-medium text-gray-600 mb-1">Responsible Person</label>
              <div class="flex items-center justify-between p-1.5 bg-gray-50 border border-gray-200 rounded-lg">
                <div class="flex items-center gap-2">
                  <span class="size-5 rounded-full bg-blue-600 text-white font-bold text-[9px] flex items-center justify-center">
                    {{ getInitials(form.responsible_person || 'Mukesh Khanna') }}
                  </span>
                  <span class="font-medium text-gray-800 text-xs">{{ form.responsible_person || 'Mukesh Khanna' }}</span>
                </div>
                <Search class="size-3.5 text-gray-400 cursor-pointer hover:text-gray-700" />
              </div>
            </div>
          </div>

          <!-- Card 2: SCHEDULE & ESTIMATES -->
          <div class="bg-white rounded-xl border border-gray-200/80 shadow-xs p-4 space-y-3">
            <div class="flex items-center justify-between text-[11px] font-bold text-gray-500 uppercase tracking-wider">
              <span>SCHEDULE & ESTIMATES</span>
              <Calendar class="size-3.5 text-gray-400" />
            </div>

            <!-- Start Date -->
            <div>
              <label class="block font-medium text-gray-600 mb-1">Start Date</label>
              <div class="relative flex items-center">
                <input
                  v-model="displayStartDate"
                  type="text"
                  placeholder="DD-MM-YYYY"
                  class="w-full bg-white border border-gray-200 rounded-lg pl-2.5 pr-8 py-1.5 text-xs text-gray-800 font-mono focus:ring-2 focus:ring-purple-600 outline-none"
                />
                <label class="absolute right-2.5 text-gray-400 hover:text-gray-700 cursor-pointer">
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
                <label class="font-medium text-gray-600">Due Date</label>
                <span v-if="isOverdue" class="px-1.5 py-0.2 rounded text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                  OVERDUE
                </span>
              </div>
              <div class="relative flex items-center">
                <input
                  v-model="displayDueDate"
                  type="text"
                  placeholder="DD-MM-YYYY"
                  class="w-full rounded-lg pl-2.5 pr-8 py-1.5 text-xs font-mono outline-none transition"
                  :class="isOverdue ? 'bg-rose-50/50 border border-rose-300 text-rose-700 font-semibold focus:ring-2 focus:ring-rose-500' : 'bg-white border border-gray-200 text-gray-800 focus:ring-2 focus:ring-purple-600'"
                />
                <label class="absolute right-2.5 cursor-pointer">
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
              <label class="block font-medium text-gray-600 mb-1">Expected Resolution Date</label>
              <div class="relative flex items-center">
                <input
                  v-model="displayResolutionDate"
                  type="text"
                  placeholder="DD-MM-YYYY"
                  class="w-full bg-white border border-gray-200 rounded-lg pl-2.5 pr-8 py-1.5 text-xs text-gray-800 font-mono focus:ring-2 focus:ring-purple-600 outline-none"
                />
                <label class="absolute right-2.5 text-gray-400 hover:text-gray-700 cursor-pointer">
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
              <label class="block font-medium text-gray-600 mb-1">Completed On</label>
              <div class="flex items-center justify-between px-2.5 py-1.5 bg-gray-50/70 border border-gray-200 rounded-lg text-xs">
                <span :class="form.status === 'Completed' ? 'font-mono text-emerald-700 font-medium' : 'italic text-gray-400'">
                  {{ form.status === 'Completed' ? (form.completed_on || '12-08-2026') : 'Not completed yet' }}
                </span>
                <CheckCircle2
                  class="size-3.5"
                  :class="form.status === 'Completed' ? 'text-emerald-600' : 'text-gray-300'"
                />
              </div>
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
                <span class="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200/80">
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
                class="text-xs font-semibold text-purple-700 hover:text-purple-900 transition cursor-pointer"
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
                    :class="att.type.includes('png') || att.type.includes('image') ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'"
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
            <label class="flex flex-col items-center justify-center border-2 border-dashed border-gray-200 hover:border-purple-400 hover:bg-purple-50/20 rounded-xl p-4 cursor-pointer transition text-center group">
              <UploadCloud class="size-6 text-purple-600 group-hover:scale-110 transition-transform mb-1.5" />
              <p class="text-xs font-medium text-gray-700">
                <span class="text-purple-700 font-semibold underline">Click to upload</span> or drag and drop files here
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
                class="pb-2.5 text-xs font-bold transition border-b-2 cursor-pointer"
                :class="activeRightTab === 'comments' ? 'border-purple-600 text-purple-700' : 'border-transparent text-gray-500 hover:text-gray-800'"
                @click="activeRightTab = 'comments'"
              >
                Comments ({{ comments.length }})
              </button>
              <button
                type="button"
                class="pb-2.5 text-xs font-bold transition border-b-2 cursor-pointer"
                :class="activeRightTab === 'activity' ? 'border-purple-600 text-purple-700' : 'border-transparent text-gray-500 hover:text-gray-800'"
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
            <template v-for="(cmt, idx) in comments" :key="idx">
              <!-- Regular Comment Bubble -->
              <div v-if="!cmt.isDivider" class="space-y-1 text-xs">
                <div class="flex items-center justify-between text-gray-500">
                  <div class="flex items-center gap-2">
                    <span
                      class="size-5 rounded-full text-white font-bold text-[9px] flex items-center justify-center shrink-0"
                      :class="getAvatarColor(cmt.author)"
                    >
                      {{ getInitials(cmt.author) }}
                    </span>
                    <span class="font-bold text-gray-800 truncate max-w-[150px]">{{ cmt.author }}</span>
                  </div>
                  <span class="text-[10px] text-gray-400">{{ cmt.time }}</span>
                </div>
                <div class="ml-7 p-2.5 bg-gray-50/80 hover:bg-gray-100/70 border border-gray-200/60 rounded-xl text-gray-700 leading-relaxed transition">
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
              <div class="size-1.5 rounded-full bg-purple-600 mt-1.5 shrink-0"></div>
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
              class="w-full bg-white border border-gray-200 rounded-xl p-2.5 text-xs text-gray-800 outline-none focus:ring-2 focus:ring-purple-600 focus:border-purple-600 transition resize-none placeholder-gray-400"
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
                :disabled="!newComment.trim()"
                class="inline-flex items-center gap-1.5 px-3 py-1 bg-purple-700 hover:bg-purple-800 disabled:opacity-40 text-white font-semibold text-xs rounded-lg shadow-xs transition cursor-pointer"
                @click="addComment"
              >
                <span>Comment</span>
                <kbd class="text-[10px] bg-white/20 px-1 py-0.2 rounded font-mono">⌘↵</kbd>
              </button>
            </div>
          </div>
        </aside>
      </div>
    </div>
  </div>
</template>

<script>
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
} from 'lucide-vue-next'

export default {
  name: 'TaskDetailModal',
  components: {
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
      newComment: '',
      activeRightTab: 'comments',
      form: {
        id: '',
        title: '',
        description: '',
        status: 'On Hold',
        priority: 'Medium',
        project: 'Drishti Core',
        assigned_to: 'Faijan Qureshi',
        reporter: 'Talib Sheikh',
        pending_with: 'Talib Sheikh (Tech Lead)',
        pending_from: 'Frontend Architecture Team',
        guided_by: 'Sarah Chen (Principal Arch)',
        responsible_person: 'Mukesh Khanna',
        start_date: '2026-08-10',
        due_date: '2026-08-10',
        expected_resolution_date: '2026-08-14',
        completed_on: '',
        estimated_hours: 12,
        logged_hours: 4.5,
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
      comments: [
        {
          author: 'Talib Sheikh',
          time: '2h ago',
          text: "Please ensure that district codes with prefix letters don't cause an ellipsis cutoff inside the select trigger wrapper.",
        },
        {
          author: 'Sarah Chen',
          time: '1h ago',
          text: 'Approved the updated layout draft. Faijan, make sure you merge against the release/2.4 branch once done.',
        },
        {
          isDivider: true,
          text: 'STATUS CHANGED TO ON HOLD',
        },
        {
          author: 'Faijan Qureshi',
          time: '25m ago',
          text: 'Working on the grid breakpoint now. Will ping QA once deployed to preview env.',
        },
      ],
      activityLog: [
        { user: 'Talib Sheikh', action: 'changed status from Open to On Hold', time: '1h ago' },
        { user: 'Sarah Chen', action: 'added comment and approved layout', time: '1h ago' },
        { user: 'Faijan Qureshi', action: 'assigned task to self', time: '2h ago' },
        { user: 'Talib Sheikh', action: 'created this task in Drishti Core', time: 'Yesterday' },
      ],
    }
  },
  watch: {
    task: {
      immediate: true,
      handler(t) {
        if (t) {
          this.form = {
            id: t.id || 'TASK-135459',
            title: t.title || 'Display Branch and District in a Single Row in the New UI',
            description: t.description || this.getDefaultDescription(),
            status: t.status || 'On Hold',
            priority: t.priority || 'Medium',
            project: t.project || 'Drishti Core',
            assigned_to: t.assigned_to || 'Faijan Qureshi',
            reporter: t.reporter || 'Talib Sheikh',
            pending_with: t.pending_with || 'Talib Sheikh (Tech Lead)',
            pending_from: t.pending_from || 'Frontend Architecture Team',
            guided_by: t.guided_by || 'Sarah Chen (Principal Arch)',
            responsible_person: t.responsible_person || 'Mukesh Khanna',
            start_date: t.start_date || '2026-08-10',
            due_date: t.due_date || '2026-08-10',
            expected_resolution_date: t.expected_resolution_date || '2026-08-14',
            completed_on: t.completed_on || '',
            estimated_hours: t.estimated_hours || 12,
            logged_hours: t.logged_hours || 4.5,
          }
          if (Array.isArray(t.comments) && t.comments.length > 0) {
            this.comments = [...t.comments]
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
    isOverdue() {
      return this.form.status === 'Overdue' || (this.form.due_date && this.form.due_date <= '2026-08-10')
    },
    updatedTimeAgo() {
      return '28 mins ago'
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
  },
  methods: {
    getDefaultDescription() {
      return `<p>During the client review meeting with the Regional Operations Directorate, it was reported that having <span class="px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 font-medium">Branch Name</span> and <span class="px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 font-medium">District Code</span> on stacked separate lines causes excessive vertical scrolling on 1080p dashboard terminals.</p>
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
        'bg-purple-700',
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
    addComment() {
      if (!this.newComment.trim()) return
      this.comments.push({
        author: 'Administrator',
        time: 'Just now',
        text: this.newComment.trim(),
      })
      this.activityLog.unshift({
        user: 'Administrator',
        action: 'added a new comment',
        time: 'Just now',
      })
      this.newComment = ''
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
      const updated = {
        ...this.task,
        ...this.form,
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
