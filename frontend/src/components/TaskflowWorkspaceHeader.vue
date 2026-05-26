<template>
  <header class="workspace-header">
    <div class="workspace-header__left">
      <div class="workspace-breadcrumb">
        <div class="workspace-breadcrumb__label">Current selection</div>
        <div class="workspace-breadcrumb__path">{{ selectionPath }}</div>
      </div>
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
  selectionPath: {
    type: String,
    default: 'Overview',
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
