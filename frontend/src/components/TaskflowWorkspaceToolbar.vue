<template>
  <section class="workspace-toolbar">
    <div class="workspace-toolbar__titleblock">
      <div class="workspace-toolbar__eyebrow">Selected Project</div>
      <div class="workspace-toolbar__title-row">
        <h2 class="workspace-toolbar__title">{{ workspaceTitle }}</h2>
        <span class="workspace-toolbar__stats">{{ pendingTaskCount }} pending / {{ totalTaskCount }} total</span>
      </div>
    </div>

    <div v-if="statusCounts && Object.keys(statusCounts).length" class="status-kpis">
      <div v-for="(count, status) in statusCounts" :key="status" class="status-kpi-card">
        <span class="status-kpi-card__dot" :style="{ backgroundColor: statusDotColor(status) }"></span>
        <span class="status-kpi-card__label">{{ status }}</span>
        <strong class="status-kpi-card__count">{{ count }}</strong>
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
  statusCounts: {
    type: Object,
    default: () => ({}),
  },
})

function statusDotColor(status) {
  const norm = String(status).toLowerCase()
  if (norm.includes('completed') || norm.includes('done') || norm.includes('success')) return '#10b981' // Green
  if (norm.includes('progress') || norm.includes('working')) return '#3b82f6' // Blue
  if (norm.includes('review')) return '#8b5cf6' // Purple
  if (norm.includes('hold') || norm.includes('pending')) return '#f59e0b' // Orange
  if (norm.includes('open')) return '#ef4444' // Red
  if (norm.includes('cancel')) return '#6b7280' // Gray
  if (norm.includes('overdue')) return '#b91c1c' // Dark Red
  return '#6b7280'
}
</script>

<style scoped>
.status-kpis {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
}

.status-kpi-card {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  border-radius: 10px;
  border: 1px solid var(--tf-border);
  background: var(--tf-surface-subtle, #f9fafb);
  font-size: 12px;
  color: var(--tf-text, #1f2937);
  transition: all 0.2s ease;
}

.status-kpi-card:hover {
  background: var(--tf-border, #f3f4f6);
  transform: translateY(-1px);
}

.status-kpi-card__dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  display: inline-block;
}

.status-kpi-card__label {
  font-weight: 500;
  color: #4b5563;
}

.status-kpi-card__count {
  font-weight: 700;
  color: #111827;
  padding-left: 2px;
}
</style>
