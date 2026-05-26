<template>
  <section class="workspace-panel" :aria-label="sectionLabel">
    <div class="workspace-panel__head">
      <div class="workspace-panel__title-wrap">
        <div class="workspace-panel__eyebrow">{{ sectionLabel }}</div>
        <h2 class="workspace-panel__title">{{ sectionTitle }}</h2>
      </div>
      <div class="workspace-panel__count">{{ rows.length }} records</div>
    </div>

    <div v-if="section === 'mom'" class="workspace-panel__empty">
      Minutes of Meeting records will appear here.
    </div>

    <div v-else-if="rows.length" class="workspace-table-wrap">
      <table class="workspace-table">
        <thead>
          <tr>
            <th>Sr No.</th>
            <th v-for="column in columns" :key="column.key">
              {{ column.label }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(row, index) in rows" :key="row.name || index">
            <td class="workspace-table__index">{{ index + 1 }}</td>
            <td v-for="column in columns" :key="column.key">
              <span v-if="column.key === 'status'" :class="statusClass(row)">
                {{ statusLabel(row) }}
              </span>
              <span v-else-if="column.key === 'progress'">{{ progressLabel(row) }}</span>
              <span v-else>{{ valueFor(row, column.key) }}</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-else class="workspace-panel__empty">
      {{ emptyLabel }}
    </div>
  </section>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  section: {
    type: String,
    default: 'overview',
  },
  rows: {
    type: Array,
    default: () => [],
  },
})

const sectionLabel = computed(() => {
  if (props.section === 'team') return 'Team Records'
  if (props.section === 'mom') return 'Minutes of Meeting'
  return 'Project Records'
})

const sectionTitle = computed(() => {
  if (props.section === 'team') return 'Existing Teams'
  if (props.section === 'mom') return 'Meeting Log'
  return 'Existing Projects'
})

const emptyLabel = computed(() => {
  if (props.section === 'team') return 'No team records available.'
  if (props.section === 'mom') return 'No meeting records available yet.'
  return 'No project records available.'
})

const columns = computed(() => {
  if (props.section === 'team') {
    return [
      { key: 'team_name', label: 'Team' },
      { key: 'team_code', label: 'Code' },
      { key: 'company', label: 'Company' },
      { key: 'project_count', label: 'Projects' },
      { key: 'member_count', label: 'Members' },
      { key: 'status', label: 'Status' },
    ]
  }

  return [
    { key: 'project_name', label: 'Project' },
    { key: 'project_code', label: 'Code' },
    { key: 'team_name', label: 'Team' },
    { key: 'status', label: 'Status' },
    { key: 'progress', label: 'Progress' },
    { key: 'task_count', label: 'Tasks' },
  ]
})

function valueFor(row, key) {
  if (key === 'company') return row.company || '—'
  if (key === 'team_name') return row.team_name || '—'
  if (key === 'team_code') return row.team_code || '—'
  if (key === 'project_code') return row.project_code || '—'
  if (key === 'project_name') return row.project_name || row.name || '—'
  if (key === 'team') return row.team_name || row.team || '—'
  if (key === 'task_count') return row.task_count ?? 0
  if (key === 'member_count') return row.member_count ?? 0
  if (key === 'project_count') return row.project_count ?? 0
  return row[key] || '—'
}

function statusLabel(row) {
  if (props.section === 'team') return row.is_active ? 'Active' : 'Inactive'
  if (row.is_archived) return 'Archived'
  return row.status || 'Open'
}

function statusClass(row) {
  if (props.section === 'team') {
    return ['workspace-pill', row.is_active ? 'is-active' : 'is-muted']
  }
  if (row.is_archived) {
    return ['workspace-pill', 'is-muted']
  }
  return ['workspace-pill', 'is-active']
}

function progressLabel(row) {
  const value = Number(row.completion_percent || 0)
  return `${value}%`
}
</script>

<style scoped>
.workspace-panel {
  display: grid;
  gap: 14px;
  padding: 18px;
}

.workspace-panel__head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
}

.workspace-panel__eyebrow {
  font-size: 11px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--tf-muted);
}

.workspace-panel__title {
  margin: 4px 0 0;
  font-size: 22px;
  line-height: 1.1;
  letter-spacing: -0.03em;
}

.workspace-panel__count {
  font-size: 13px;
  font-weight: 700;
  color: var(--tf-muted);
}

.workspace-table-wrap {
  overflow: auto;
  border: 1px solid var(--tf-border);
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.82);
  box-shadow: 0 16px 40px rgba(15, 23, 42, 0.06);
}

.workspace-table {
  width: 100%;
  border-collapse: collapse;
  min-width: 860px;
}

.workspace-table thead th {
  position: sticky;
  top: 0;
  z-index: 1;
  background: #f8fafc;
  color: #475569;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  text-align: left;
  padding: 14px 14px;
  border-bottom: 1px solid rgba(15, 23, 42, 0.08);
}

.workspace-table tbody td {
  padding: 14px 14px;
  border-bottom: 1px solid rgba(15, 23, 42, 0.06);
  font-size: 14px;
  color: #0f172a;
  vertical-align: top;
}

.workspace-table tbody tr:hover {
  background: rgba(37, 99, 235, 0.03);
}

.workspace-table__index {
  width: 72px;
  color: var(--tf-muted);
  font-weight: 700;
}

.workspace-pill {
  display: inline-flex;
  align-items: center;
  min-height: 28px;
  padding: 0 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
}

.workspace-pill.is-active {
  background: rgba(16, 185, 129, 0.12);
  color: #047857;
}

.workspace-pill.is-muted {
  background: rgba(148, 163, 184, 0.16);
  color: #475569;
}

.workspace-panel__empty {
  padding: 20px;
  border: 1px dashed rgba(148, 163, 184, 0.4);
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.72);
  color: var(--tf-muted);
}

@media (max-width: 1180px) {
  .workspace-panel {
    padding: 14px;
  }

  .workspace-panel__head {
    align-items: flex-start;
    flex-direction: column;
  }

  .workspace-table {
    min-width: 760px;
  }
}
</style>
