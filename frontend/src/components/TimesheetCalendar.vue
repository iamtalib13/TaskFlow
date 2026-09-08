<script setup>
import { computed, ref } from 'vue'
import { Button } from 'frappe-ui'
import { ChevronLeft, ChevronRight } from 'lucide-vue-next'

const props = defineProps({
  events: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
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
  const remaining = 42 - cells.length
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
</script>

<template>
  <div class="flex flex-col h-full min-h-0">
    <!-- Header -->
    <div class="flex items-center justify-between px-4 py-2 shrink-0">
      <h3 class="text-sm font-bold text-gray-900">{{ monthLabel }}</h3>
      <div class="flex items-center gap-1">
        <Button variant="ghost" size="sm" label="Today" @click="goToToday" />
        <button type="button" class="p-1 rounded hover:bg-gray-100 transition cursor-pointer" @click="prevMonth">
          <ChevronLeft class="size-4 text-gray-500" />
        </button>
        <button type="button" class="p-1 rounded hover:bg-gray-100 transition cursor-pointer" @click="nextMonth">
          <ChevronRight class="size-4 text-gray-500" />
        </button>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="flex-1 flex items-center justify-center">
      <span class="text-sm text-gray-400">Loading calendar...</span>
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
            :class="isSunday(i) ? 'text-gray-400' : 'text-gray-500'"
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
          class="grid grid-cols-[1fr_48px] border-t border-gray-200"
        >
          <!-- Days row -->
          <div class="grid grid-cols-7">
            <div
              v-for="(cell, dIdx) in week"
              :key="cell.key"
              class="relative min-h-[52px] border-r border-gray-200 last:border-r-0 px-1 py-1 transition"
              :class="{
                'bg-gray-50/80': !cell.isCurrentMonth,
                'bg-gray-100/60 cursor-not-allowed': cell.isCurrentMonth && isSunday(dIdx),
                'cursor-pointer hover:bg-gray-50/50': !(cell.isCurrentMonth && isSunday(dIdx)),
              }"
              @click="!(cell.isCurrentMonth && isSunday(dIdx)) && emit('cellClick', cell.key)"
            >
              <!-- Day number -->
              <div class="flex items-center justify-between mb-0.5">
                <span
                  class="text-[10px] font-medium inline-flex items-center justify-center size-5 rounded-full"
                  :class="{
                    'bg-blue-600 text-white': isToday(cell.key),
                    'text-gray-900': cell.isCurrentMonth && !isToday(cell.key) && !isSunday(dIdx),
                    'text-gray-300': !cell.isCurrentMonth,
                    'text-gray-400': cell.isCurrentMonth && isSunday(dIdx) && !isToday(cell.key),
                  }"
                >
                  {{ cell.day }}
                </span>
                <!-- Status dot (hidden on holidays) -->
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
                    'bg-green-100 text-green-700': hoursMap[cell.key] > 0,
                    'bg-red-50 text-red-500': !hoursMap[cell.key],
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
                <span class="text-[9px] font-medium text-red-400">0h</span>
              </div>

              <!-- Holiday label -->
              <div
                v-else-if="cell.isCurrentMonth && isSunday(dIdx)"
                class="text-center mt-1"
              >
                <span class="text-[9px] font-medium text-gray-400">Off</span>
              </div>
            </div>
          </div>

          <!-- Weekly total -->
          <div class="flex items-center justify-center border-l border-gray-200">
            <span
              class="text-[11px] font-bold"
              :class="weeklyTotals[wIdx] > 0 ? 'text-green-600' : 'text-red-400'"
            >
              {{ weeklyTotals[wIdx].toFixed(1) }}h
            </span>
          </div>
        </div>
      </div>

      <!-- Monthly KPI badges -->
      <div class="shrink-0 border-t border-gray-200 px-4 py-2.5 flex items-center gap-3 flex-wrap">
        <div class="flex items-center gap-1.5 px-2.5 py-1 bg-green-50 rounded-lg border border-green-200">
          <span class="text-[10px] font-semibold text-green-700">Total Hours</span>
          <span class="text-sm font-bold text-green-800">{{ totalMonthlyHours.toFixed(1) }}</span>
        </div>
        <div class="flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 rounded-lg border border-blue-200">
          <span class="text-[10px] font-semibold text-blue-700">Working Days</span>
          <span class="text-sm font-bold text-blue-800">{{ workingDaysCount }}</span>
        </div>
        <div class="flex items-center gap-1.5 px-2.5 py-1 bg-purple-50 rounded-lg border border-purple-200">
          <span class="text-[10px] font-semibold text-purple-700">Avg/Day</span>
          <span class="text-sm font-bold text-purple-800">{{ avgHoursPerDay }}h</span>
        </div>
        <!-- Legend -->
        <div class="ml-auto flex items-center gap-3 text-[9px] text-gray-500">
          <span class="flex items-center gap-1"><span class="size-1.5 rounded-full bg-green-500" /> Logged</span>
          <span class="flex items-center gap-1"><span class="size-1.5 rounded-full bg-red-400" /> Missed</span>
          <span class="flex items-center gap-1"><span class="size-1.5 rounded-full bg-gray-300" /> Holiday</span>
        </div>
      </div>
    </template>
  </div>
</template>
