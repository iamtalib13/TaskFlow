<template>
  <header class="workspace-toolbar">
    <div class="workspace-header__left">
      <button type="button" class="workspace-add-btn" @click="emit('primary-action')">
        {{ primaryActionLabel }}
      </button>

      <div class="workspace-tabs" role="tablist" aria-label="Workspace views">
        <button
          type="button"
          class="workspace-tab"
          :class="{ active: activeView === 'table' }"
          @click="emit('update:activeView', 'table')"
        >
          Table view
        </button>
        <button
          type="button"
          class="workspace-tab"
          :class="{ active: activeView === 'kanban' }"
          @click="emit('update:activeView', 'kanban')"
        >
          Kanban board
        </button>
      </div>

      <label class="workspace-search">
        <span class="sr-only">Search</span>
        <input
          type="search"
          :value="searchQuery"
          placeholder="Search"
          @input="emit('update:searchQuery', $event.target.value)"
        />
      </label>
    </div>
  </header>
</template>

<script setup>
defineProps({
  activeView: {
    type: String,
    default: 'table',
  },
  primaryActionLabel: {
    type: String,
    default: 'New Task +',
  },
  searchQuery: {
    type: String,
    default: '',
  },
})

const emit = defineEmits(['primary-action', 'update:activeView', 'update:searchQuery'])
</script>
