<template>
  <section class="workspace-panel" :class="{ 'workspace-panel--task': isTaskSection }" :aria-label="sectionLabel">
    <div v-if="!isTaskSection" class="workspace-panel__head">
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

    <div v-else-if="isTaskSection && !rows.length" class="workspace-panel__empty workspace-panel__empty--task">
      <div class="workspace-panel__empty-title">No task here</div>
      <div class="workspace-panel__empty-text">This project does not have any tasks yet.</div>
      <button type="button" class="workspace-empty-action" @click="emit('primary-action')">Add new</button>
    </div>

    <div v-else-if="rows.length" class="workspace-table-wrap workspace-table-wrap--task">
      <table class="workspace-table workspace-task-table">
        <thead>
          <tr>
            <th v-for="column in columns" :key="column.key" :class="`workspace-col--${column.key}`">
              {{ column.label }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(row, index) in rows" :key="row.name || index" class="workspace-task-row" :class="{ 'is-recent': prettyModified(row.modified) === 'Just now' }" @click="emit('task-click', row)">
            <td v-for="column in columns" :key="column.key" :class="`workspace-cell--${column.key}`">
              <span v-if="column.key === 'task_title'" class="workspace-task-main">
                <strong class="workspace-task-main__title">{{ row.task_title || '—' }}</strong>
              </span>

              <span v-else-if="column.key === 'project_title'" class="workspace-task-project" :title="row.project_title || row.project || '—'">
                {{ row.project_title || row.project || '—' }}
              </span>

              <span v-else-if="column.key === 'assignee'" class="workspace-assignee">
                <span class="workspace-assignee__avatar">
                  <img v-if="row.assigned_to_image" :src="row.assigned_to_image" :alt="row.assigned_to_name || 'Assignee'" />
                  <span v-else>{{ initials(row.assigned_to_name || row.assigned_to || 'UA') }}</span>
                </span>
                <span class="workspace-assignee__name" :title="row.assigned_to_name || row.assigned_to || 'Unassigned'">
                  {{ row.assigned_to_name || 'Unassigned' }}
                </span>
              </span>

              <span v-else-if="column.key === 'status'" :class="statusClass(row)">
                {{ statusLabel(row) }}
              </span>

              <span v-else-if="column.key === 'start_date' || column.key === 'due_date' || column.key === 'estimated_completion_date'" class="workspace-task-date">
                {{ formatDate(row[column.key]) }}
              </span>

              <span v-else-if="column.key === 'age'" class="workspace-age-pill">
                {{ ageLabel(row) }}
              </span>

              <span v-else-if="column.key === 'priority'" :class="priorityClass(row)">
                {{ row.priority || '—' }}
              </span>

              <span v-else-if="column.key === 'modified'" class="workspace-task-modified workspace-task-modified--right">
                {{ prettyModified(row.modified) }}
              </span>

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

const emit = defineEmits(['primary-action', 'task-click'])
const isTaskSection = computed(() => props.section === 'task')

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

  if (isTaskSection.value) {
    return [
      { key: 'task_title', label: 'Task Name' },
      { key: 'project_title', label: 'Project' },
      { key: 'assignee', label: 'Assignee' },
      { key: 'status', label: 'Status' },
      { key: 'start_date', label: 'Start Date' },
      { key: 'due_date', label: 'Due Date' },
      { key: 'estimated_completion_date', label: 'Estimated Date' },
      { key: 'age', label: 'Age' },
      { key: 'priority', label: 'Priority' },
      { key: 'modified', label: 'Last modified' },
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
  if (key === 'project_title') return row.project_title || row.project_name || row.project || '—'
  if (key === 'task_title') return row.task_title || row.name || '—'
  if (key === 'assigned_to_name') return row.assigned_to_name || row.assigned_to || '—'
  if (key === 'due_date') return row.due_date || '—'
  if (key === 'start_date') return row.start_date || '—'
  if (key === 'estimated_completion_date') return row.estimated_completion_date || '—'
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
  return formatStatus(row.status)
}

function statusClass(row) {
  if (props.section === 'team') {
    return ['workspace-pill', row.is_active ? 'is-active' : 'is-muted']
  }

  const status = normalizeStatus(row.status)
  if (status.includes('completed') || status.includes('done') || status.includes('closed')) return ['workspace-pill', 'is-success']
  if (status.includes('blocked') || status.includes('cancel') || status.includes('rejected')) return ['workspace-pill', 'is-danger']
  if (status.includes('progress') || status.includes('working') || status.includes('review')) return ['workspace-pill', 'is-warning']
  if (status.includes('hold') || status.includes('pending') || status.includes('draft')) return ['workspace-pill', 'is-muted']
  if (status.includes('open')) return ['workspace-pill', 'is-danger']
  if (row.is_archived) return ['workspace-pill', 'is-muted']
  return ['workspace-pill', 'is-muted']
}

function normalizeStatus(value) {
  return String(value || 'Open').trim().toLowerCase()
}

function formatStatus(value) {
  const normalized = String(value || 'Open').trim()
  if (!normalized) return 'Open'
  return normalized
    .split(/\s+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ')
}

function priorityClass(row) {
  const priority = String(row.priority || '').toLowerCase()
  if (!priority) return ['workspace-pill', 'is-muted']
  if (priority.includes('critical') || priority.includes('high')) return ['workspace-pill', 'is-danger']
  if (priority.includes('medium')) return ['workspace-pill', 'is-info']
  return ['workspace-pill', 'is-muted']
}

function ageLabel(row) {
  const source = row.start_date
  if (!source) return '—'

  const startDate = new Date(String(source).replace(' ', 'T'))
  if (Number.isNaN(startDate.getTime())) return '—'

  // For completed tasks, use completed_on; otherwise use now
  const endDateValue = row.completed_on || row.completed_date
  const endDate = endDateValue ? new Date(String(endDateValue).replace(' ', 'T')) : new Date()
  if (Number.isNaN(endDate.getTime())) return '—'

  const diff = endDate - startDate
  if (diff <= 0) return '0d'

  const days = Math.floor(diff / 86400000)
  if (days > 0) return `${days}d`

  const hours = Math.floor(diff / 3600000)
  if (hours > 0) return `${hours}h`

  const minutes = Math.floor(diff / 60000)
  if (minutes > 0) return `${minutes}m`

  return '0m'
}

function formatDate(value) {
  if (!value) return '—'
  const date = new Date(String(value).replace(' ', 'T'))
  if (Number.isNaN(date.getTime())) return String(value)
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date)
}

function prettyModified(value) {
  if (!value) return '—'

  const date = new Date(String(value).replace(' ', 'T'))
  if (Number.isNaN(date.getTime())) return String(value)

  const diff = Date.now() - date.getTime()
  if (diff < 60000) return 'Just now'

  const minutes = Math.floor(diff / 60000)
  if (minutes < 60) return `${minutes}m ago`

  const hours = Math.floor(diff / 3600000)
  if (hours < 24) return `${hours}h ago`

  const days = Math.floor(diff / 86400000)
  if (days < 7) return `${days}d ago`

  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date)
}

function initials(value) {
  return String(value)
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || 'UA'
}
</script>
