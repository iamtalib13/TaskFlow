<template>
  <section class="workspace-toolbar">
    <div class="workspace-toolbar__top">
      <div class="workspace-toolbar__titleblock">
        <div class="workspace-toolbar__eyebrow">Selected Project</div>
        <div class="workspace-toolbar__title-row">
          <h2 class="workspace-toolbar__title">{{ workspaceTitle }}</h2>
          <span class="workspace-toolbar__stats">{{ pendingTaskCount }} pending / {{ totalTaskCount }} total</span>
        </div>
      </div>
    </div>

    <div class="workspace-toolbar__bottom">
      <div class="workspace-toolbar__left">
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
            placeholder="Search records"
            @input="emit('update:searchQuery', $event.target.value)"
          />
        </label>
      </div>
    </div>
  </section>
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
  workspaceTitle: {
    type: String,
    default: 'All Projects',
  },
  pendingTaskCount: {
    type: Number,
    default: 0,
  },
  totalTaskCount: {
    type: Number,
    default: 0,
  },
})

const emit = defineEmits(['primary-action', 'update:activeView', 'update:searchQuery'])
</script>
