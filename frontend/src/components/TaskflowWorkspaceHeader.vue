<template>
  <header class="workspace-header">
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
          placeholder="Search records"
          @input="emit('update:searchQuery', $event.target.value)"
        />
      </label>
    </div>

    <div class="workspace-header__right">
      <div class="workspace-profile" aria-label="Current user profile">
        <div class="workspace-avatar">
          <img v-if="userImage" :src="userImage" :alt="`${userName} avatar`" />
          <span v-else>{{ userInitials }}</span>
        </div>
        <div class="workspace-profile__text">
          <strong>{{ userName }}</strong>
          <span>Signed in user</span>
        </div>
      </div>
    </div>
  </header>
</template>

<script setup>
import { computed } from 'vue'

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
  userName: {
    type: String,
    default: '',
  },
  userImage: {
    type: String,
    default: '',
  },
})

const emit = defineEmits(['primary-action', 'update:activeView', 'update:searchQuery'])

const userInitials = computed(() => {
  if (!props.userName) return 'U'
  return (
    props.userName
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('') || 'U'
  )
})
</script>
