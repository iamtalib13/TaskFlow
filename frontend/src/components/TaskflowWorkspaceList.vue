<template>
  <section class="workspace-panel" :class="{ 'workspace-panel--task': section === 'task' }" :aria-label="sectionLabel">
    <div v-if="section !== 'task'" class="workspace-panel__head">
      <div class="workspace-panel__title-wrap">
        <div class="workspace-panel__eyebrow">{{ sectionLabel }}</div>
        <h2 class="workspace-panel__title">{{ sectionTitle }}</h2>
      </div>
      <div class="workspace-panel__count">{{ loading ? 'Loading...' : `${rows.length} records` }}</div>
    </div>

    <div v-if="loading" class="workspace-panel__loading" aria-live="polite">
      <div v-for="n in 5" :key="n" class="workspace-skeleton-row">
        <span class="workspace-skeleton workspace-skeleton--index"></span>
        <span class="workspace-skeleton"></span>
        <span class="workspace-skeleton"></span>
        <span class="workspace-skeleton"></span>
      </div>
    </div>

    <div v-else-if="section === 'mom'" class="workspace-panel__empty">
      Minutes of Meeting records will appear here.
    </div>

    <div v-else-if="section === 'task' && !rows.length" class="workspace-panel__empty workspace-panel__empty--task">
      <div class="workspace-panel__empty-title">No task here</div>
      <div class="workspace-panel__empty-text">This project does not have any tasks yet.</div>
      <button type="button" class="workspace-empty-action" @click="emit('primary-action')">Add new</button>
    </div>

    <div v-else-if="rows.length" class="workspace-table-wrap workspace-table-wrap--task">
      <table class="workspace-table">
        <thead>
          <tr>
            <th class="workspace-table__index-head">Sr No.</th>
            <th v-for="column in columns" :key="column.key" :class="`workspace-col--${column.key}`">
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
  loading: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['primary-action'])

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

  if (props.section === 'task') {
    return [
      { key: 'task_title', label: 'Task' },
      { key: 'status', label: 'Status' },
      { key: 'priority', label: 'Priority' },
      { key: 'assigned_to_name', label: 'Assigned To' },
      { key: 'due_date', label: 'Due Date' },
      { key: 'progress', label: 'Progress' },
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
  if (key === 'task_title') return row.task_title || row.name || '—'
  if (key === 'assigned_to_name') return row.assigned_to_name || row.assigned_to || '—'
  if (key === 'due_date') return row.due_date || '—'
  if (key === 'priority') return row.priority || '—'
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
