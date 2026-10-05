<template>
  <div
    :class="[
      embedded
        ? 'w-full rounded-xl border border-outline-gray-2 dark:border-neutral-800 bg-surface-base dark:bg-neutral-900 shadow-xs overflow-hidden flex flex-col'
        : 'flex-1 min-h-0 flex flex-col overflow-hidden bg-[#f8fafc] dark:bg-gray-950 text-ink-gray-9 dark:text-gray-100'
    ]"
  >
    <!-- Header Controls Banner -->
    <div
      :class="[
        embedded
          ? 'px-4 py-3 bg-surface-base dark:bg-neutral-900 border-b border-outline-gray-2 dark:border-neutral-800 flex flex-wrap items-center justify-between gap-3'
          : 'shrink-0 px-6 py-4 bg-white dark:bg-gray-900 border-b border-outline-gray-2 dark:border-gray-800 flex flex-wrap items-center justify-between gap-4'
      ]"
    >
      <!-- Title & Subtitle with Clock Badge -->
      <div class="flex items-center gap-2.5 sm:gap-3">
        <div
          :class="[
            embedded
              ? 'p-1 rounded-md bg-teal-50 dark:bg-teal-950/50 text-[#468373] dark:text-emerald-400'
              : 'size-11 rounded-2xl bg-blue-50 dark:bg-blue-950/60 border border-blue-100 dark:border-blue-900/50 flex items-center justify-center text-blue-600 dark:text-blue-400 shadow-xs shrink-0'
          ]"
        >
          <Clock :class="embedded ? 'size-4' : 'size-5 stroke-[2.2]'" />
        </div>
        <div>
          <h2
            :class="[
              embedded
                ? 'text-xs sm:text-sm font-semibold text-ink-gray-9 dark:text-neutral-100'
                : 'text-xl font-bold tracking-tight text-ink-gray-9 dark:text-white leading-tight'
            ]"
          >
            Timesheet Master Report
          </h2>
          <p
            :class="[
              embedded
                ? 'text-[11px] text-ink-gray-5 dark:text-neutral-400'
                : 'text-xs text-ink-gray-5 dark:text-gray-400 mt-0.5'
            ]"
          >
            Track and monitor employee time spent on tasks and projects
          </p>
        </div>
      </div>

      <!-- Action & Filter Bar -->
      <div class="flex items-center gap-2 sm:gap-3 flex-wrap">
        <!-- Search Input -->
        <div class="relative flex items-center">
          <Search class="size-3.5 text-ink-gray-4 absolute left-3 pointer-events-none" />
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Search employees..."
            class="pl-8.5 pr-3 py-1.5 text-xs bg-surface-base dark:bg-neutral-800 border border-outline-gray-2 dark:border-neutral-700 rounded-lg outline-none focus:ring-2 focus:ring-[#468373]/20 focus:border-[#468373] w-48 sm:w-56 text-ink-gray-8 dark:text-neutral-200 transition"
            @input="onSearchInput"
          />
        </div>

        <!-- Date Range Filter Picker / Indicator -->
        <div class="inline-flex items-center gap-2 px-3 py-1.5 bg-surface-base dark:bg-neutral-800 border border-outline-gray-2 dark:border-neutral-700 rounded-lg text-xs font-medium text-ink-gray-7 dark:text-neutral-300 shadow-xs">
          <Calendar class="size-3.5 text-ink-gray-4" />
          <span>{{ dateRangeDisplay }}</span>
        </div>

        <!-- View Mode Segmented Controls: Daily | Weekly | Monthly -->
        <div class="inline-flex p-1 bg-surface-gray-2 dark:bg-neutral-800 rounded-lg border border-outline-gray-2 dark:border-neutral-700 text-xs font-semibold">
          <button
            type="button"
            class="px-2.5 sm:px-3 py-1 rounded-md transition-colors cursor-pointer"
            :class="viewType === 'Daily' ? (embedded ? 'bg-[#468373] text-white shadow-xs' : 'bg-blue-600 text-white shadow-xs') : 'text-ink-gray-6 dark:text-neutral-400 hover:text-ink-gray-9 dark:hover:text-white'"
            @click="changeViewType('Daily')"
          >
            Daily
          </button>
          <button
            type="button"
            class="px-2.5 sm:px-3 py-1 rounded-md transition-colors cursor-pointer"
            :class="viewType === 'Weekly' ? (embedded ? 'bg-[#468373] text-white shadow-xs' : 'bg-blue-600 text-white shadow-xs') : 'text-ink-gray-6 dark:text-neutral-400 hover:text-ink-gray-9 dark:hover:text-white'"
            @click="changeViewType('Weekly')"
          >
            Weekly
          </button>
          <button
            type="button"
            class="px-2.5 sm:px-3 py-1 rounded-md transition-colors cursor-pointer"
            :class="viewType === 'Monthly' ? (embedded ? 'bg-[#468373] text-white shadow-xs' : 'bg-blue-600 text-white shadow-xs') : 'text-ink-gray-6 dark:text-neutral-400 hover:text-ink-gray-9 dark:hover:text-white'"
            @click="changeViewType('Monthly')"
          >
            Monthly
          </button>
        </div>

        <!-- Export Dropdown / Button -->
        <Button
          variant="outline"
          size="sm"
          class="text-xs font-medium gap-1.5"
          @click="exportToCSV"
        >
          <template #prefix><Download class="size-3.5 text-ink-gray-5" /></template>
          <span>Export</span>
        </Button>
      </div>
    </div>

    <!-- Main Table Container -->
    <div :class="embedded ? 'w-full overflow-hidden flex flex-col' : 'flex-1 min-h-0 flex flex-col p-4 sm:p-6'">
      <div :class="embedded ? 'w-full overflow-hidden flex flex-col' : 'min-h-0 bg-white dark:bg-gray-900 border border-outline-gray-2 dark:border-gray-800 rounded-xl shadow-xs overflow-hidden flex flex-col'">
        <!-- Table Scroll Area -->
        <div class="overflow-auto" :class="embedded ? 'max-h-[500px]' : 'min-h-0 flex-1'">
          <table class="w-full text-left border-collapse">
            <!-- Table Header -->
            <thead class="sticky top-0 z-20 shadow-[0_1px_0_0_var(--outline-gray-2,#e5e7eb)]">
              <!-- Top Header Row -->
              <tr class="border-b border-outline-gray-2 dark:border-gray-800 bg-surface-gray-1 dark:bg-gray-800 text-[11px] font-semibold text-ink-gray-6 dark:text-gray-400 uppercase tracking-wider select-none">
                <th class="sticky left-0 z-10 w-10 min-w-[40px] max-w-[40px] bg-surface-gray-1 dark:bg-gray-800 px-3 py-2.5 text-center">#</th>
                <th class="sticky left-[40px] z-10 shadow-[1px_0_0_0_var(--outline-gray-2,#e5e7eb)] bg-surface-gray-1 dark:bg-gray-800 min-w-[200px] px-3 py-2.5">Employee</th>

                <!-- Date Navigation Header (e.g. Week 1 / Days) -->
                <th :colspan="daysInView.length" class="px-3 py-2.5 text-center border-l border-r border-outline-gray-2 dark:border-gray-800 bg-surface-gray-2/70 dark:bg-gray-800/80">
                  <div class="flex items-center justify-between px-2">
                    <button
                      type="button"
                      class="p-0.5 rounded hover:bg-surface-gray-3 dark:hover:bg-gray-700 text-ink-gray-5 cursor-pointer transition"
                      title="Previous Period"
                      @click="prevPeriod"
                    >
                      <ChevronLeft class="size-3.5" />
                    </button>
                    <span class="font-bold text-ink-gray-8 dark:text-gray-200">
                      {{ periodHeaderLabel }}
                    </span>
                    <button
                      type="button"
                      class="p-0.5 rounded hover:bg-surface-gray-3 dark:hover:bg-gray-700 text-ink-gray-5 cursor-pointer transition"
                      title="Next Period"
                      @click="nextPeriod"
                    >
                      <ChevronRight class="size-3.5" />
                    </button>
                  </div>
                </th>

                <!-- Weekly Total Header Group -->
                <th colspan="2" class="min-w-[150px] px-3 py-2 text-center border-r border-outline-gray-2 dark:border-gray-800 bg-surface-gray-1/40 dark:bg-gray-800/30">
                  Weekly Total
                </th>

                <!-- Monthly Total Header Group -->
                <th colspan="2" class="min-w-[160px] px-3 py-2 text-center bg-surface-gray-1/40 dark:bg-gray-800/30">
                  Monthly Total
                </th>
              </tr>

              <!-- Sub-header Row for Days, Hours & % -->
              <tr class="border-b border-outline-gray-2 dark:border-gray-800 bg-surface-base dark:bg-gray-900 text-[10px] font-semibold text-ink-gray-5 dark:text-gray-400 select-none">
                <th class="sticky left-0 z-10 w-10 min-w-[40px] max-w-[40px] bg-surface-base dark:bg-gray-900 px-3 py-1.5"></th>
                <th class="sticky left-[40px] z-10 shadow-[1px_0_0_0_var(--outline-gray-2,#e5e7eb)] bg-surface-base dark:bg-gray-900 px-3 py-1.5"></th>

                <!-- Specific Days (Mon 01, Tue 02 ...) -->
                <th
                  v-for="d in daysInView"
                  :key="d.date"
                  class="px-2 py-1.5 text-center min-w-[52px] border-r border-outline-gray-1 dark:border-gray-800"
                  :class="d.is_weekend ? 'bg-surface-gray-2/40 dark:bg-gray-800/40 text-ink-gray-4' : ''"
                >
                  <div class="leading-tight">
                    <span class="block text-[10px] text-ink-gray-5">{{ d.day_name }}</span>
                    <span class="block text-xs font-mono font-bold text-ink-gray-8 dark:text-gray-200">{{ d.day_num }}</span>
                  </div>
                </th>

                <!-- Weekly Sub-headers -->
                <th class="px-2 py-1.5 text-right w-14 border-r border-outline-gray-1 dark:border-gray-800">Hours</th>
                <th class="px-2 py-1.5 text-left w-24 border-r border-outline-gray-2 dark:border-gray-800">%</th>

                <!-- Monthly Sub-headers -->
                <th class="px-2 py-1.5 text-right w-14 border-r border-outline-gray-1 dark:border-gray-800">Hours</th>
                <th class="px-2 py-1.5 text-left w-24">%</th>
              </tr>
            </thead>

            <!-- Table Body -->
            <tbody class="divide-y divide-outline-gray-1 dark:divide-gray-800 text-xs">
              <!-- Loading Skeleton -->
              <template v-if="loading">
                <tr v-for="n in 8" :key="n" class="animate-pulse">
                  <td class="sticky left-0 z-10 w-10 min-w-[40px] max-w-[40px] bg-surface-base dark:bg-gray-900 px-3 py-3 text-center"><Skeleton class="h-4 w-4 mx-auto" /></td>
                  <td class="sticky left-[40px] z-10 shadow-[1px_0_0_0_var(--outline-gray-2,#e5e7eb)] bg-surface-base dark:bg-gray-900 px-3 py-3">
                    <div class="flex items-center gap-2.5">
                      <Skeleton class="size-7 rounded-full shrink-0" />
                      <div class="space-y-1">
                        <Skeleton class="h-3.5 w-28" />
                        <Skeleton class="h-2.5 w-16" />
                      </div>
                    </div>
                  </td>
                  <td v-for="m in daysInView.length" :key="m" class="px-2 py-3 text-center">
                    <Skeleton class="h-3.5 w-7 mx-auto" />
                  </td>
                  <td class="px-2 py-3 text-right"><Skeleton class="h-3.5 w-8 ml-auto" /></td>
                  <td class="px-2 py-3"><Skeleton class="h-2 w-16 rounded-full" /></td>
                  <td class="px-2 py-3 text-right"><Skeleton class="h-3.5 w-8 ml-auto" /></td>
                  <td class="px-2 py-3"><Skeleton class="h-2 w-16 rounded-full" /></td>
                </tr>
              </template>

              <!-- Empty State -->
              <tr v-else-if="rows.length === 0">
                <td :colspan="6 + daysInView.length" class="text-center py-12 text-ink-gray-5 dark:text-gray-400">
                  <div class="flex flex-col items-center justify-center gap-2">
                    <Clock class="size-8 text-ink-gray-3 stroke-1" />
                    <p class="font-medium text-sm">No employee timesheet records found for this period</p>
                    <p class="text-xs text-ink-gray-4">Try adjusting search or select another date range</p>
                  </div>
                </td>
              </tr>

              <!-- Data Rows -->
              <tr
                v-else
                v-for="row in rows"
                :key="row.employee_id || row.idx"
                class="group hover:bg-[#F4F9F7] dark:hover:bg-gray-800/40 transition-colors"
              >
                <!-- # Index -->
                <td class="sticky left-0 z-10 w-10 min-w-[40px] max-w-[40px] bg-surface-base dark:bg-gray-900 group-hover:bg-[#F4F9F7] dark:group-hover:bg-gray-800 px-3 py-2.5 text-center font-mono text-ink-gray-4 dark:text-gray-500 text-[11px] transition-colors">
                  {{ row.idx }}
                </td>

                <!-- Employee Info (Avatar + Name) -->
                <td class="sticky left-[40px] z-10 shadow-[1px_0_0_0_var(--outline-gray-2,#e5e7eb)] bg-surface-base dark:bg-gray-900 group-hover:bg-[#F4F9F7] dark:group-hover:bg-gray-800 min-w-[200px] max-w-[240px] px-3 py-2.5 transition-colors">
                  <div class="flex items-center gap-2.5 min-w-0">
                    <Avatar
                      :image="row.image"
                      :label="row.employee_name"
                      size="sm"
                      shape="circle"
                      class="shrink-0 ring-1 ring-outline-gray-2 dark:ring-gray-700"
                    />
                    <div class="min-w-0 flex flex-col">
                      <span class="font-semibold text-ink-gray-9 dark:text-gray-100 truncate text-xs" :title="row.employee_name">
                        {{ row.employee_name }}
                      </span>
                      <span class="text-[10px] text-ink-gray-4 dark:text-gray-500 font-mono truncate">
                        {{ row.employee_id }}
                      </span>
                    </div>
                  </div>
                </td>

                <!-- Daily Hours Cells -->
                <td
                  v-for="d in daysInView"
                  :key="d.date"
                  class="px-1.5 py-2 text-center font-mono text-xs border-r border-outline-gray-1 dark:border-gray-800 cursor-pointer hover:bg-teal-50 dark:hover:bg-teal-950/30 transition-colors"
                  :class="d.is_weekend ? 'bg-surface-gray-2/20 dark:bg-gray-800/20' : ''"
                  :title="`View logs for ${formatShortDate(d.date)}`"
                  @click="openDayLogs(row, d)"
                >
                  <span
                    v-if="(row.daily_hours[d.date] || 0) > 0"
                    class="inline-block px-2 py-0.5 rounded font-bold hours-active-badge"
                  >
                    {{ formatHoursVal(row.daily_hours[d.date]) }}
                  </span>
                  <span v-else class="hours-zero-text">
                    0.00
                  </span>
                </td>

                <!-- Weekly Total Hours -->
                <td class="px-2 py-2.5 text-right font-mono border-r border-outline-gray-1 dark:border-gray-800" :class="row.weekly_total > 0 ? 'hours-total-active' : 'text-ink-gray-4 dark:text-gray-500'">
                  {{ formatHoursVal(row.weekly_total) }}
                </td>

                <!-- Weekly % Progress Bar -->
                <td class="px-2.5 py-2.5 border-r border-outline-gray-2 dark:border-gray-800">
                  <div class="flex items-center gap-2">
                    <div class="flex-1 h-2.5 bg-gray-200/80 dark:bg-gray-700/80 rounded-full overflow-hidden min-w-[55px] p-[1px] shadow-inner">
                      <div
                        v-if="row.weekly_pct > 0"
                        class="h-full rounded-full transition-all duration-500 shadow-xs"
                        :class="getProgressColorClass(row.weekly_pct)"
                        :style="{ width: `${Math.min(100, Math.max(8, row.weekly_pct))}%` }"
                      />
                    </div>
                    <span
                      class="text-[11px] font-mono font-bold w-9 text-right shrink-0"
                      :class="getProgressTextClass(row.weekly_pct)"
                    >
                      {{ row.weekly_pct }}%
                    </span>
                  </div>
                </td>

                <!-- Monthly Total Hours -->
                <td class="px-2 py-2.5 text-right font-mono border-r border-outline-gray-1 dark:border-gray-800" :class="row.monthly_total > 0 ? 'hours-total-active' : 'text-ink-gray-4 dark:text-gray-500'">
                  {{ formatHoursVal(row.monthly_total) }}
                </td>

                <!-- Monthly % Progress Bar -->
                <td class="px-2.5 py-2.5">
                  <div class="flex items-center gap-2">
                    <div class="flex-1 h-2.5 bg-gray-200/80 dark:bg-gray-700/80 rounded-full overflow-hidden min-w-[55px] p-[1px] shadow-inner">
                      <div
                        v-if="row.monthly_pct > 0"
                        class="h-full rounded-full transition-all duration-500 shadow-xs"
                        :class="getProgressColorClass(row.monthly_pct)"
                        :style="{ width: `${Math.min(100, Math.max(8, row.monthly_pct))}%` }"
                      />
                    </div>
                    <span
                      class="text-[11px] font-mono font-bold w-9 text-right shrink-0"
                      :class="getProgressTextClass(row.monthly_pct)"
                    >
                      {{ row.monthly_pct }}%
                    </span>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Table Footer Pagination & Summary -->
        <div class="shrink-0 px-4 py-3 border-t border-outline-gray-2 dark:border-gray-800 bg-surface-gray-1/40 dark:bg-gray-800/30 flex items-center justify-between text-xs text-ink-gray-5">
          <div>
            Showing <span class="font-bold text-ink-gray-9 dark:text-white">{{ rows.length }}</span> of <span class="font-bold text-ink-gray-9 dark:text-white">{{ totalEmployees }}</span> employees
          </div>

          <div v-if="totalPages > 1" class="flex items-center gap-1.5">
            <Button
              variant="subtle"
              size="sm"
              :disabled="currentPage === 1 || loading"
              @click="goToPage(currentPage - 1)"
            >
              <ChevronLeft class="size-3.5" />
            </Button>
            <span class="px-2 font-medium">Page {{ currentPage }} of {{ totalPages }}</span>
            <Button
              variant="subtle"
              size="sm"
              :disabled="currentPage === totalPages || loading"
              @click="goToPage(currentPage + 1)"
            >
              <ChevronRight class="size-3.5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
    <!-- Day Logs Dialog: opened by clicking a day cell -->
    <Dialog v-model="dayLogsOpen" size="4xl">
      <template #title>
        <div class="flex items-center gap-2.5 min-w-0">
          <Avatar
            :image="dayLogsTarget?.row?.image"
            :label="dayLogsTarget?.row?.employee_name"
            size="md"
            shape="circle"
            class="shrink-0"
          />
          <div class="min-w-0">
            <h3 class="text-sm font-semibold text-ink-gray-9 dark:text-white truncate">
              {{ dayLogsTarget?.row?.employee_name }}
            </h3>
            <p class="text-xs text-ink-gray-5 dark:text-neutral-400">
              {{ dayLogsTarget ? formatLongDate(dayLogsTarget.date) : '' }}
            </p>
          </div>
        </div>
      </template>
      <template #default>
        <div v-if="dayLogsLoading" class="space-y-2 py-2">
          <Skeleton v-for="n in 3" :key="n" class="h-14 w-full rounded-lg" />
        </div>

        <div v-else-if="dayLogs.length === 0" class="flex flex-col items-center justify-center gap-2 py-10 text-ink-gray-5 dark:text-neutral-400">
          <Clock class="size-8 text-ink-gray-3 stroke-1" />
          <p class="text-sm font-medium">No timesheet logs for this day</p>
        </div>

        <div v-else class="space-y-3">
          <div
            v-for="ts in dayLogs"
            :key="ts.name"
            class="space-y-2"
          >
            <div class="flex flex-wrap items-center justify-between gap-2 text-xs">
              <span class="font-mono text-ink-gray-5 dark:text-neutral-400">{{ ts.name }}</span>
              <div class="flex items-center gap-2">
                <span class="px-2 py-0.5 rounded-full bg-teal-50 dark:bg-teal-950/50 text-[#468373] dark:text-emerald-400 font-semibold border border-[#468373]/30">
                  {{ ts.status }}
                </span>
                <span class="font-bold text-ink-gray-9 dark:text-white">
                  Total: {{ formatHoursVal(ts.total_hours) }}h
                </span>
              </div>
            </div>

            <div class="overflow-x-auto rounded-lg border border-outline-gray-2 dark:border-neutral-800">
              <table class="w-full text-left text-xs border-collapse">
                <thead>
                  <tr class="bg-surface-gray-2 dark:bg-neutral-800 text-ink-gray-7 dark:text-neutral-300 font-semibold uppercase tracking-wider text-[10px]">
                    <th class="py-2 px-3 whitespace-nowrap">Time</th>
                    <th class="py-2 px-3 text-right">Hrs</th>
                    <th class="py-2 px-3">Project</th>
                    <th class="py-2 px-3">Task</th>
                    <th class="py-2 px-3">Activity</th>
                    <th class="py-2 px-3 min-w-[180px]">Description</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-outline-gray-1 dark:divide-neutral-800 text-ink-gray-8 dark:text-neutral-200">
                  <tr v-if="!ts.items || ts.items.length === 0">
                    <td colspan="6" class="py-3 px-3 text-center text-ink-gray-5">No entries</td>
                  </tr>
                  <tr v-for="it in ts.items" :key="it.name" class="align-top">
                    <td class="py-2 px-3 font-mono whitespace-nowrap">
                      {{ formatTime(it.from_time) }} – {{ formatTime(it.to_time) }}
                    </td>
                    <td class="py-2 px-3 text-right font-mono font-bold text-[#468373] dark:text-emerald-400">
                      {{ formatHoursVal(it.hrs) }}
                    </td>
                    <td class="py-2 px-3">{{ it.project || '—' }}</td>
                    <td class="py-2 px-3">
                      <div v-if="it.task" class="min-w-0">
                        <div class="font-medium">{{ it.task_title || it.task }}</div>
                        <div class="text-[10px] text-ink-gray-5 font-mono">
                          {{ it.task }}<span v-if="it.task_status"> · {{ it.task_status }}</span>
                        </div>
                      </div>
                      <span v-else>—</span>
                    </td>
                    <td class="py-2 px-3">{{ it.activity_type || '—' }}</td>
                    <td class="py-2 px-3 whitespace-pre-line">{{ stripHtml(it.description) || '—' }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </template>
    </Dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { Button, Avatar, Skeleton, Dialog } from 'frappe-ui'
import {
  Clock,
  Calendar,
  Download,
  ChevronLeft,
  ChevronRight,
  Search,
} from 'lucide-vue-next'
import { fetchTimesheetMasterReport, fetchMemberTimesheets } from '@/data/api.js'

const props = defineProps({
  embedded: {
    type: Boolean,
    default: false,
  },
  team: {
    type: String,
    default: '',
  },
})

watch(() => props.team, () => {
  currentPage.value = 1
  loadReportData()
})

const loading = ref(false)
const viewType = ref('Weekly') // 'Daily' | 'Weekly' | 'Monthly'
const searchQuery = ref('')
const rows = ref([])
const days = ref([])
const totalEmployees = ref(0)
const currentPage = ref(1)
const pageSize = 50

// Date Anchor (default: current date)
const currentDateAnchor = ref(new Date())

let searchDebounceTimer = null
function onSearchInput() {
  if (searchDebounceTimer) clearTimeout(searchDebounceTimer)
  searchDebounceTimer = setTimeout(() => {
    currentPage.value = 1
    loadReportData()
  }, 300)
}

const totalPages = computed(() => {
  return Math.ceil((totalEmployees.value || 1) / pageSize)
})

function goToPage(page) {
  if (page < 1 || page > totalPages.value) return
  currentPage.value = page
  loadReportData()
}

function formatLocalYMD(d) {
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// Compute Current Range Dates based on viewType & currentDateAnchor
const dateRange = computed(() => {
  const d = new Date(currentDateAnchor.value)
  if (viewType.value === 'Weekly') {
    // Current week: Monday to Saturday (excluding Sunday)
    const day = d.getDay()
    const diffToMon = (day === 0 ? -6 : 1) - day
    const mon = new Date(d.getFullYear(), d.getMonth(), d.getDate() + diffToMon)
    const sat = new Date(d.getFullYear(), d.getMonth(), d.getDate() + diffToMon + 5)
    return {
      start: formatLocalYMD(mon),
      end: formatLocalYMD(sat),
    }
  } else if (viewType.value === 'Daily') {
    // Current date
    const iso = formatLocalYMD(d)
    return { start: iso, end: iso }
  } else {
    // Monthly: 1st of month to end of month
    const start = new Date(d.getFullYear(), d.getMonth(), 1)
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 0)
    return {
      start: formatLocalYMD(start),
      end: formatLocalYMD(end),
    }
  }
})

const dateRangeDisplay = computed(() => {
  const s = dateRange.value.start
  const e = dateRange.value.end
  return `${formatShortDate(s)} — ${formatShortDate(e)}`
})

const periodHeaderLabel = computed(() => {
  const s = dateRange.value.start
  const e = dateRange.value.end
  if (viewType.value === 'Weekly') {
    const d = new Date(s)
    const dateNum = d.getDate()
    const weekNum = Math.ceil(dateNum / 7)
    return `Week ${weekNum} (${formatShortDate(s)} – ${formatShortDate(e)})`
  } else if (viewType.value === 'Daily') {
    return formatShortDate(s)
  } else {
    const d = new Date(s)
    return d.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
  }
})

// Limit displayed daily columns to max 7 in weekly view, or all in month
const daysInView = computed(() => {
  if (days.value && days.value.length) {
    return days.value
  }
  return []
})

function formatShortDate(iso) {
  if (!iso) return ''
  try {
    const d = new Date(iso + 'T00:00:00')
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
  } catch {
    return iso
  }
}

function formatHoursVal(val) {
  if (val === undefined || val === null || val === '') return '0.00'
  const n = Number(val)
  if (isNaN(n) || n === 0) return '0.00'
  return n.toFixed(2)
}

function getProgressColorClass(pct) {
  if (pct >= 90) return 'progress-bar-emerald'
  if (pct >= 80) return 'progress-bar-green'
  if (pct >= 65) return 'progress-bar-amber'
  if (pct >= 40) return 'progress-bar-orange'
  return 'progress-bar-rose'
}

function getProgressTextClass(pct) {
  if (pct >= 80) return 'progress-text-emerald'
  if (pct >= 65) return 'progress-text-amber'
  if (pct >= 40) return 'progress-text-orange'
  if (pct > 0) return 'progress-text-rose'
  return 'text-ink-gray-4 dark:text-gray-500'
}

function getStatusClass(status) {
  switch (status) {
    case 'On Track':
      return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
    case 'Pending':
      return 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
    case 'At Risk':
      return 'bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
    default:
      return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
  }
}

function getStatusDotClass(status) {
  switch (status) {
    case 'On Track':
      return 'bg-emerald-500'
    case 'Pending':
      return 'bg-amber-500'
    case 'At Risk':
      return 'bg-rose-500'
    default:
      return 'bg-gray-400'
  }
}

function changeViewType(newType) {
  if (viewType.value === newType) return
  viewType.value = newType
  currentPage.value = 1
  loadReportData()
}

function prevPeriod() {
  const d = new Date(currentDateAnchor.value)
  if (viewType.value === 'Weekly') {
    d.setDate(d.getDate() - 7)
  } else if (viewType.value === 'Daily') {
    d.setDate(d.getDate() - 1)
  } else {
    d.setMonth(d.getMonth() - 1)
  }
  currentDateAnchor.value = d
  currentPage.value = 1
  loadReportData()
}

function nextPeriod() {
  const d = new Date(currentDateAnchor.value)
  if (viewType.value === 'Weekly') {
    d.setDate(d.getDate() + 7)
  } else if (viewType.value === 'Daily') {
    d.setDate(d.getDate() + 1)
  } else {
    d.setMonth(d.getMonth() + 1)
  }
  currentDateAnchor.value = d
  currentPage.value = 1
  loadReportData()
}

async function loadReportData() {
  loading.value = true
  try {
    const res = await fetchTimesheetMasterReport({
      fromDate: dateRange.value.start,
      toDate: dateRange.value.end,
      viewType: viewType.value,
      search: searchQuery.value,
      team: props.team,
      limit: pageSize,
      start: (currentPage.value - 1) * pageSize,
    })

    if (res) {
      days.value = res.days || []
      rows.value = res.rows || []
      totalEmployees.value = res.total_employees || 0
    }
  } catch (err) {
    console.error('Failed to load timesheet master report', err)
  } finally {
    loading.value = false
  }
}

// --- Day Logs Popup ---
const dayLogsOpen = ref(false)
const dayLogsLoading = ref(false)
const dayLogsTarget = ref(null)
const dayLogs = ref([])
let dayLogsRequestId = 0

async function openDayLogs(row, day) {
  const user = row.user_id || row.employee_id
  dayLogsTarget.value = { row, date: day.date }
  dayLogs.value = []
  dayLogsOpen.value = true
  if (!user) return

  const requestId = ++dayLogsRequestId
  dayLogsLoading.value = true
  try {
    const res = await fetchMemberTimesheets(user, day.date, day.date)
    if (requestId === dayLogsRequestId) dayLogs.value = res || []
  } catch (err) {
    console.error('Failed to load day timesheet logs', err)
  } finally {
    if (requestId === dayLogsRequestId) dayLogsLoading.value = false
  }
}

function formatLongDate(iso) {
  if (!iso) return ''
  const d = new Date(iso + 'T00:00:00')
  return d.toLocaleDateString('en-GB', { weekday: 'long', day: '2-digit', month: 'short', year: 'numeric' })
}

// from_time / to_time may be a full datetime or a bare time string
function formatTime(val) {
  if (!val) return '--:--'
  const m = String(val).match(/(\d{1,2}):(\d{2})/)
  if (!m) return String(val)
  let h = Number(m[1])
  const suffix = h >= 12 ? 'PM' : 'AM'
  h = h % 12 || 12
  return `${h}:${m[2]} ${suffix}`
}

function stripHtml(html) {
  if (!html) return ''
  const div = document.createElement('div')
  div.innerHTML = html
  return (div.textContent || '').trim()
}

function exportToCSV() {
  if (!rows.value || rows.value.length === 0) return

  const dayCols = daysInView.value.map((d) => d.date)
  const headers = ['#', 'Employee', 'Employee ID', ...dayCols, 'Weekly Total', 'Weekly %', 'Monthly Total', 'Monthly %']

  const csvRows = [headers.join(',')]

  for (const r of rows.value) {
    const dayVals = dayCols.map((d) => (r.daily_hours[d] || 0).toFixed(2))
    const rowData = [
      r.idx,
      `"${r.employee_name}"`,
      `"${r.employee_id}"`,
      ...dayVals,
      r.weekly_total.toFixed(2),
      `${r.weekly_pct}%`,
      r.monthly_total.toFixed(2),
      `${r.monthly_pct}%`,
    ]
    csvRows.push(rowData.join(','))
  }

  const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.setAttribute('href', url)
  link.setAttribute('download', `Timesheet_Master_Report_${dateRange.value.start}_${dateRange.value.end}.csv`)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

onMounted(() => {
  loadReportData()
})
</script>
