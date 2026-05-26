<template>
  <section class="workspace-toolbar">
    <div class="workspace-toolbar__titleblock">
      <div class="workspace-toolbar__eyebrow">Selected Project</div>
      <div class="workspace-toolbar__title-row">
        <h2 class="workspace-toolbar__title">{{ workspaceTitle }}</h2>
        <span class="workspace-toolbar__stats">{{ pendingTaskCount }} pending / {{ totalTaskCount }} total</span>
      </div>
    </div>
  </section>
</template>

<script setup>
defineProps({
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
</script>
