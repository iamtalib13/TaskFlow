<template>
  <header class="workspace-header">
    <div class="workspace-header__left">
      <div class="workspace-breadcrumb">
        <div class="workspace-breadcrumb__label">Selection Path</div>
        <div class="workspace-breadcrumb__path">{{ selectionPath }}</div>
      </div>
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
defineProps({
  selectionPath: {
    type: String,
    default: 'Overview',
  },
})
</script>
