<template>
  <div class="flex h-screen" :class="themeClass">
    <!-- Sidebar -->
    <div class="w-64 border-r border-gray-100 flex flex-col bg-white">
      <div class="p-6">
        <div class="flex items-center gap-2 mb-8">
          <div class="w-8 h-8 bg-gray-900 rounded-lg flex items-center justify-center">
            <span class="text-white font-bold text-xl">T</span>
          </div>
          <span class="font-bold text-xl tracking-tight text-gray-900">TaskFlow</span>
        </div>

        <nav class="space-y-1">
          <router-link
            v-for="item in menuItems"
            :key="item.label"
            :to="item.to"
            class="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
            :class="[
              $route.name === item.name
                ? 'bg-gray-50 text-gray-900'
                : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
            ]"
          >
            <component :is="item.icon" class="w-4 h-4" />
            {{ item.label }}
          </router-link>
        </nav>
      </div>

      <div class="mt-auto p-6 border-t border-gray-100">
        <button
          class="mb-4 flex w-full items-center justify-center gap-2 rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          @click="toggleTheme"
        >
          <Moon v-if="isDark" class="h-4 w-4" />
          <Sun v-else class="h-4 w-4" />
          {{ isDark ? 'Dark Mode' : 'Light Mode' }}
        </button>
        <div class="flex items-center gap-3">
          <div class="w-8 h-8 bg-gray-100 rounded-full"></div>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium text-gray-900 truncate">Talib Sheikh</p>
            <p class="text-xs text-gray-500 truncate">Manager</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Main Content -->
    <main class="flex-1 overflow-y-auto">
      <slot></slot>
    </main>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { 
  LayoutDashboard, 
  Briefcase, 
  CheckSquare, 
  Users, 
  Settings,
  Moon,
  Sun,
} from 'lucide-vue-next'

const menuItems = [
  { label: 'Dashboard', icon: LayoutDashboard, to: '/', name: 'Home' },
  { label: 'Projects', icon: Briefcase, to: '/projects', name: 'Projects' },
  { label: 'Tasks', icon: CheckSquare, to: '/tasks', name: 'Tasks' },
  { label: 'Team', icon: Users, to: '/team', name: 'Team' },
  { label: 'Settings', icon: Settings, to: '/settings', name: 'Settings' },
]

const STORAGE_KEY = 'taskflow-theme'
const isDark = ref(false)

if (typeof window !== 'undefined') {
  const stored = window.localStorage.getItem(STORAGE_KEY)
  isDark.value = stored === 'dark'
}

const themeClass = computed(() => (isDark.value ? 'theme-dark bg-slate-950' : 'theme-light bg-gray-50'))

if (typeof document !== 'undefined') {
  document.documentElement.classList.toggle('theme-dark', isDark.value)
  document.body.classList.toggle('theme-dark', isDark.value)
}

watch(isDark, (value) => {
  if (typeof document !== 'undefined') {
    document.documentElement.classList.toggle('theme-dark', value)
    document.body.classList.toggle('theme-dark', value)
  }
})

function toggleTheme() {
  isDark.value = !isDark.value
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(STORAGE_KEY, isDark.value ? 'dark' : 'light')
  }
}
</script>
