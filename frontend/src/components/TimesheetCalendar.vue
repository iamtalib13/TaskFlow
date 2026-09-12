<script setup>
import { computed, ref } from 'vue'
import { Button, Skeleton } from 'frappe-ui'
import { ChevronLeft, ChevronRight } from 'lucide-vue-next'

const props = defineProps({
  events: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
  selectedDate: { type: String, default: '' },
})

const emit = defineEmits(['cellClick'])

const today = new Date()
const currentMonth = ref(today.getMonth())
const currentYear = ref(today.getFullYear())

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December']
const DAY_NAMES = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']

const monthLabel = computed(() => `${MONTH_NAMES[currentMonth.value]} ${currentYear.value}`)

function prevMonth() {
  if (currentMonth.value === 0) {
    currentMonth.value = 11
    currentYear.value--
  } else {
    currentMonth.value--
  }
}

function nextMonth() {
  if (currentMonth.value === 11) {
    currentMonth.value = 0
    currentYear.value++
  } else {
    currentMonth.value++
  }
}

function goToToday() {
  currentMonth.value = today.getMonth()
  currentYear.value = today.getFullYear()
}

function pad(n) {
  return String(n).padStart(2, '0')
}

function dateKey(y, m, d) {
  return `${y}-${pad(m + 1)}-${pad(d)}`
}

const hoursMap = computed(() => {
  const map = {}
  for (const ev of props.events) {
    const date = ev.fromDate || ev.date
    if (!date) continue
    if (!map[date]) map[date] = 0
    map[date] += ev._hours || ev.total_hours || 0
  }
  return map
})

const calendarDays = computed(() => {
  const year = currentYear.value
  const month = currentMonth.value
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const daysInPrev = new Date(year, month, 0).getDate()

  const cells = []
  for (let i = firstDay - 1; i >= 0; i--) {
    const d = daysInPrev - i
    const m = month === 0 ? 11 : month - 1
    const y = month === 0 ? year - 1 : year
    cells.push({ day: d, key: dateKey(y, m, d), isCurrentMonth: false })
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ day: d, key: dateKey(year, month, d), isCurrentMonth: true })
  }
  const remaining = 35 - cells.length
  for (let d = 1; d <= remaining; d++) {
    const m = month === 11 ? 0 : month + 1
    const y = month === 11 ? year + 1 : year
    cells.push({ day: d, key: dateKey(y, m, d), isCurrentMonth: false })
  }
  return cells
})

const weeks = computed(() => {
  const result = []
  for (let i = 0; i < calendarDays.value.length; i += 7) {
    result.push(calendarDays.value.slice(i, i + 7))
  }
  return result
})

const weeklyTotals = computed(() => {
  return weeks.value.map((week) => {
    let total = 0
    for (const cell of week) {
      total += hoursMap.value[cell.key] || 0
    }
    return total
  })
})

const totalMonthlyHours = computed(() => {
  return Object.values(hoursMap.value).reduce((a, b) => a + b, 0)
})

const workingDaysCount = computed(() => {
  return Object.values(hoursMap.value).filter((h) => h > 0).length
})

const avgHoursPerDay = computed(() => {
  if (!workingDaysCount.value) return 0
  return (totalMonthlyHours.value / workingDaysCount.value).toFixed(1)
})

function isToday(key) {
  return key === dateKey(today.getFullYear(), today.getMonth(), today.getDate())
}

function isSunday(dayOfWeek) {
  return dayOfWeek === 0
}

function getDayStatus(cell, dayOfWeek) {
  if (isSunday(dayOfWeek)) return 'holiday'
  const hrs = hoursMap.value[cell.key] || 0
  if (hrs > 0) return 'logged'
  if (cell.isCurrentMonth) return 'missed'
  return 'other'
}

function getCellBg(cell, dayOfWeek) {
  const status = getDayStatus(cell, dayOfWeek)
  if (status === 'logged') return 'bg-green-100 dark:bg-green-900/30'
  if (status === 'missed') return 'bg-red-100 dark:bg-red-900/30'
  if (status === 'holiday') return 'bg-surface-gray-3 dark:bg-gray-700/50'
  if (!cell.isCurrentMonth) return 'bg-surface-gray-2/60 dark:bg-gray-800/40'
  return ''
}

function getDayNumberClass(cell, dayOfWeek) {
  const status = getDayStatus(cell, dayOfWeek)
  if (isToday(cell.key)) return 'bg-blue-600 text-white'
  if (status === 'logged') return 'text-green-600 dark:text-green-400 font-bold'
  if (status === 'missed') return 'text-red-500 dark:text-red-400'
  if (status === 'holiday') return 'text-gray-400 dark:text-gray-500'
  if (!cell.isCurrentMonth) return 'text-gray-300 dark:text-gray-600'
  return 'text-ink-gray-9 dark:text-gray-100'
}
</script>

<template>
  <div class="flex flex-col h-full min-h-0">
    <!-- Header: Centered < Month Year > -->
    <div class="flex items-center justify-center gap-3 px-4 py-2.5 shrink-0 border-b border-outline-gray-1 dark:border-gray-800">
      <button
        type="button"
        class="size-6 flex items-center justify-center rounded-md hover:bg-surface-gray-3 dark:hover:bg-gray-800 text-ink-gray-6 dark:text-gray-400 hover:text-ink-gray-9 dark:hover:text-white transition cursor-pointer"
        title="Previous Month"
        @click="prevMonth"
      >
        <ChevronLeft class="size-4" />
      </button>
      <h3 class="text-xs font-bold text-ink-gray-9 dark:text-white select-none min-w-[120px] text-center">
        {{ monthLabel }}
      </h3>
      <button
        type="button"
        class="size-6 flex items-center justify-center rounded-md hover:bg-surface-gray-3 dark:hover:bg-gray-800 text-ink-gray-6 dark:text-gray-400 hover:text-ink-gray-9 dark:hover:text-white transition cursor-pointer"
        title="Next Month"
        @click="nextMonth"
      >
        <ChevronRight class="size-4" />
      </button>
    </div>

    <!-- Loading: Skeleton Calendar Grid matching exact month layout -->
    <div v-if="loading" class="flex-1 flex flex-col min-h-0 overflow-hidden">
      <!-- Skeleton Day headers -->
      <div class="grid grid-cols-[1fr_48px] gap-0 shrink-0">
        <div class="grid grid-cols-7">
          <span
            v-for="(day, i) in DAY_NAMES"
            :key="day"
            class="text-center text-[10px] font-semibold py-1.5"
            :class="isSunday(i) ? 'text-gray-400' : 'text-ink-gray-5'"
          >
            {{ day }}
          </span>
        </div>
        <span class="text-center text-[9px] font-semibold text-gray-400 py-1.5">Wk</span>
      </div>

      <!-- Skeleton Weeks (5 rows of 7 cells + week col) -->
      <div class="flex-1 min-h-0 overflow-y-auto p-1">
        <div v-for="w in 5" :key="'w-skel-' + w" class="grid grid-cols-[1fr_48px] border-t border-outline-gray-2 dark:border-gray-800">
          <div class="grid grid-cols-7">
            <div
              v-for="d in 7"
              :key="'d-skel-' + w + '-' + d"
              class="min-h-[52px] border-r border-outline-gray-2 dark:border-gray-800 last:border-r-0 p-1.5 flex flex-col justify-between"
            >
              <div class="flex items-center justify-between">
                <Skeleton class="size-4 rounded-full" />
                <Skeleton class="size-1.5 rounded-full" />
              </div>
              <Skeleton class="h-3.5 w-7 rounded mx-auto mt-1" />
            </div>
          </div>
          <div class="flex items-center justify-center border-l border-outline-gray-2 dark:border-gray-800">
            <Skeleton class="h-3 w-5 rounded" />
          </div>
        </div>
      </div>
    </div>

    <!-- Calendar grid -->
    <template v-else>
      <!-- Day headers -->
      <div class="grid grid-cols-[1fr_48px] gap-0 shrink-0">
        <div class="grid grid-cols-7">
          <span
            v-for="(day, i) in DAY_NAMES"
            :key="day"
            class="text-center text-[10px] font-semibold py-1.5"
            :class="isSunday(i) ? 'text-gray-400' : 'text-ink-gray-5'"
          >
            {{ day }}
          </span>
        </div>
        <span class="text-center text-[9px] font-semibold text-gray-400 py-1.5">Wk</span>
      </div>

      <!-- Weeks -->
      <div class="flex-1 min-h-0 overflow-y-auto">
        <div
          v-for="(week, wIdx) in weeks"
          :key="wIdx"
          class="grid grid-cols-[1fr_48px] border-t border-outline-gray-2"
        >
          <!-- Days row -->
          <div class="grid grid-cols-7">
            <div
              v-for="(cell, dIdx) in week"
              :key="cell.key"
              class="relative min-h-[52px] border-r border-outline-gray-2 last:border-r-0 px-1 py-1 transition-colors rounded-sm m-px"
              :class="[
                getCellBg(cell, dIdx),
                cell.isCurrentMonth && isSunday(dIdx) ? 'cursor-not-allowed' : 'cursor-pointer',
                !(cell.isCurrentMonth && isSunday(dIdx)) ? 'hover:opacity-80' : '',
                selectedDate && cell.key === selectedDate ? 'ring-2 ring-[#417c7d] ring-inset z-10' : '',
              ]"
              @click="!(cell.isCurrentMonth && isSunday(dIdx)) && emit('cellClick', cell.key)"
            >
              <!-- Day number -->
              <div class="flex items-center justify-between mb-0.5">
                <span
                  class="text-[10px] font-medium inline-flex items-center justify-center size-5 rounded-full"
                  :class="getDayNumberClass(cell, dIdx)"
                >
                  {{ cell.day }}
                </span>
                <!-- Status dot (hidden on holidays and other month) -->
                <span
                  v-if="cell.isCurrentMonth && !isSunday(dIdx)"
                  class="size-1.5 rounded-full shrink-0"
                  :class="{
                    'bg-green-500': getDayStatus(cell, dIdx) === 'logged',
                    'bg-red-400': getDayStatus(cell, dIdx) === 'missed',
                  }"
                />
              </div>

              <!-- Hours badge -->
              <div
                v-if="cell.isCurrentMonth && hoursMap[cell.key]"
                class="text-center"
              >
                <span
                  class="inline-flex items-center justify-center px-1.5 py-0.5 rounded text-[10px] font-bold leading-none"
                  :class="{
                    'bg-green-200 dark:bg-green-900/40 text-green-700 dark:text-green-300': hoursMap[cell.key] > 0,
                    'bg-red-100 dark:bg-red-900/40 text-red-500 dark:text-red-400': !hoursMap[cell.key],
                  }"
                >
                  {{ hoursMap[cell.key].toFixed(1) }}h
                </span>
              </div>

              <!-- No hours indicator for current month working days -->
              <div
                v-else-if="cell.isCurrentMonth && !isSunday(dIdx) && !hoursMap[cell.key]"
                class="text-center mt-1"
              >
                <span class="text-[9px] font-medium text-red-400 dark:text-red-500">0h</span>
              </div>

              <!-- Holiday label -->
              <div
                v-else-if="cell.isCurrentMonth && isSunday(dIdx)"
                class="text-center mt-1"
              >
                <span class="text-[9px] font-medium text-gray-400 dark:text-gray-500">Off</span>
              </div>
            </div>
          </div>

          <!-- Weekly total -->
          <div class="flex items-center justify-center border-l border-outline-gray-2 dark:border-gray-700/50">
            <span
              class="text-[11px] font-bold"
              :class="weeklyTotals[wIdx] > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-400 dark:text-red-500'"
            >
              {{ weeklyTotals[wIdx].toFixed(1) }}h
            </span>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
