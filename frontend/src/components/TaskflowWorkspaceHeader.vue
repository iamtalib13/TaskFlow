<template>
  <header class="workspace-header">
    <div class="workspace-header__left">
      <button type="button" class="workspace-add-btn" @click="emit('primary-action')">
        {{ props.primaryActionLabel }}
      </button>

      <div class="workspace-tabs" role="tablist" aria-label="Workspace views">
        <button
          type="button"
          class="workspace-tab"
          :class="{ active: props.activeView === 'table' }"
          @click="emit('update:activeView', 'table')"
        >
          Table view
        </button>
        <button
          type="button"
          class="workspace-tab"
          :class="{ active: props.activeView === 'kanban' }"
          @click="emit('update:activeView', 'kanban')"
        >
          Kanban board
        </button>
      </div>

      <label class="workspace-search">
        <span class="sr-only">Search</span>
        <input
          type="search"
          :value="props.searchQuery"
          placeholder="Search"
          @input="emit('update:searchQuery', $event.target.value)"
        />
      </label>
    </div>

    <div class="workspace-header__right">
      <div class="workspace-profile" aria-label="Talib Sheikh profile user">
        <div class="workspace-avatar">TS</div>
        <div class="workspace-profile__text">
          <strong>Talib Sheikh</strong>
          <span>Profile user</span>
        </div>
      </div>
    </div>
  </header>
</template>

<script setup>
const props = defineProps({
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
