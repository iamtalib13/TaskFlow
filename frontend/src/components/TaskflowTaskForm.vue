<template>
  <Teleport to="body">
    <div v-if="modelValue" class="task-form-overlay" @click.self="close">
      <section class="task-form-card" role="dialog" aria-modal="true" :aria-label="dialogLabel">
        <header class="task-form-card__header">
          <div>
            <div class="task-form-card__eyebrow">Task Form</div>
            <h3 class="task-form-card__title">{{ dialogTitle }}</h3>
          </div>
          <button type="button" class="task-form-card__close" @click="close">×</button>
        </header>

        <form class="task-form" @submit.prevent="submit">
          <div class="task-form__grid">
            <label class="task-form__field task-form__field--wide">
              <span class="task-form__label">Task Title</span>
              <input v-model="form.task_title" type="text" class="task-form__input" placeholder="Enter task title" required />
            </label>

            <label class="task-form__field">
              <span class="task-form__label">Project</span>
              <select v-model="form.project" class="task-form__input" @change="handleProjectChange($event.target.value)">
                <option value="">Select project</option>
                <option v-for="project in filteredProjects" :key="project.name" :value="project.name">
                  {{ project.project_name || project.name }}
                </option>
              </select>
            </label>

            <label class="task-form__field">
              <span class="task-form__label">Team</span>
              <select v-model="form.team" class="task-form__input" @change="handleTeamChange($event.target.value)">
                <option value="">Select team</option>
                <option v-for="team in teams" :key="team.name" :value="team.name">
                  {{ team.team_name || team.name }}
                </option>
              </select>
            </label>

            <label class="task-form__field">
              <span class="task-form__label">Assignee</span>
              <select v-model="form.assigned_to" class="task-form__input">
                <option value="">Unassigned</option>
                <option v-for="option in filteredAssignees" :key="option.value" :value="option.value">
                  {{ option.label }}
                </option>
              </select>
            </label>

            <label class="task-form__field">
              <span class="task-form__label">Status</span>
              <select v-model="form.status" class="task-form__input">
                <option v-for="option in statusOptions" :key="option" :value="option">{{ option }}</option>
              </select>
            </label>

            <label class="task-form__field">
              <span class="task-form__label">Priority</span>
              <select v-model="form.priority" class="task-form__input">
                <option v-for="option in priorityOptions" :key="option" :value="option">{{ option }}</option>
              </select>
            </label>

            <label class="task-form__field">
              <span class="task-form__label">Task Type</span>
              <select v-model="form.task_type" class="task-form__input">
                <option v-for="option in taskTypeOptions" :key="option" :value="option">{{ option }}</option>
              </select>
            </label>

            <label class="task-form__field">
              <span class="task-form__label">Start Date</span>
              <input v-model="form.start_date" type="date" class="task-form__input" />
            </label>

            <label class="task-form__field">
              <span class="task-form__label">Due Date</span>
              <input v-model="form.due_date" type="date" class="task-form__input" />
            </label>

            <label class="task-form__field">
              <span class="task-form__label">Estimated Date</span>
              <input v-model="form.estimated_completion_date" type="date" class="task-form__input" />
            </label>

            <label class="task-form__field">
              <span class="task-form__label">Progress %</span>
              <input v-model.number="form.progress_percent" type="number" min="0" max="100" class="task-form__input" />
            </label>

            <label class="task-form__field">
              <span class="task-form__label">Estimated Hours</span>
              <input v-model="form.estimated_hours" type="number" min="0" step="0.25" class="task-form__input" />
            </label>

            <label class="task-form__field">
              <span class="task-form__label">Actual Hours</span>
              <input v-model="form.actual_hours" type="number" min="0" step="0.25" class="task-form__input" />
            </label>
          </div>

          <div class="task-form__checks">
            <label class="task-form__check">
              <input v-model="form.is_milestone" type="checkbox" />
              <span>Milestone</span>
            </label>
            <label class="task-form__check">
              <input v-model="form.is_blocked" type="checkbox" />
              <span>Blocked</span>
            </label>
          </div>

          <label class="task-form__field task-form__field--wide">
            <span class="task-form__label">Description</span>
            <textarea v-model="form.description" class="task-form__textarea" rows="5" placeholder="Write task notes or requirements"></textarea>
          </label>

          <p v-if="errorMessage" class="task-form__error">{{ errorMessage }}</p>

          <footer class="task-form__footer">
            <button type="button" class="task-form__button task-form__button--ghost" @click="close">Cancel</button>
            <button type="submit" class="task-form__button task-form__button--primary" :disabled="saving">
              {{ saving ? 'Saving...' : submitLabel }}
            </button>
          </footer>
        </form>
      </section>
    </div>
  </Teleport>
</template>

<script setup>
import { computed, reactive, watch } from 'vue'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false,
  },
  mode: {
    type: String,
    default: 'create',
  },
  teams: {
    type: Array,
    default: () => [],
  },
  projects: {
    type: Array,
    default: () => [],
  },
  assigneeOptions: {
    type: Array,
    default: () => [],
  },
  statusOptions: {
    type: Array,
    default: () => ['Open', 'In Progress', 'Review', 'On Hold', 'Completed', 'Cancelled'],
  },
  priorityOptions: {
    type: Array,
    default: () => ['Low', 'Medium', 'High', 'Critical'],
  },
  taskTypeOptions: {
    type: Array,
    default: () => ['Task', 'Bug', 'Story', 'Approval', 'Research', 'Meeting'],
  },
  defaultTeam: {
    type: String,
    default: '',
  },
  defaultProject: {
    type: String,
    default: '',
  },
  initialTask: {
    type: Object,
    default: null,
  },
  saving: {
    type: Boolean,
    default: false,
  },
  errorMessage: {
    type: String,
    default: '',
  },
})

const emit = defineEmits(['update:modelValue', 'submit', 'cancel'])

const form = reactive(makeInitialForm())

const projectMap = computed(() => Object.fromEntries(props.projects.map((project) => [project.name, project])))

const filteredProjects = computed(() => {
  if (!form.team) return props.projects
  return props.projects.filter((project) => project.team === form.team)
})

const filteredAssignees = computed(() => {
  if (!form.team) return props.assigneeOptions
  return props.assigneeOptions.filter((option) => !option.team || option.team === form.team)
})

const dialogTitle = computed(() => (props.mode === 'edit' ? 'Update Task' : 'Create Task'))
const dialogLabel = computed(() => `${dialogTitle.value} dialog`)
const submitLabel = computed(() => (props.mode === 'edit' ? 'Update Task' : 'Save Task'))

watch(
  () => props.modelValue,
  (open) => {
    if (open) {
      resetForm()
    }
  },
  { immediate: true },
)

watch(
  () => props.initialTask,
  () => {
    if (props.modelValue) {
      resetForm()
    }
  },
  { deep: true },
)

function makeInitialForm() {
  return {
    name: '',
    task_title: '',
    project: props.defaultProject || '',
    team: props.defaultTeam || '',
    assigned_to: '',
    status: props.statusOptions[0] || 'Open',
    priority: props.priorityOptions[1] || props.priorityOptions[0] || 'Medium',
    task_type: props.taskTypeOptions[0] || 'Task',
    start_date: '',
    due_date: '',
    estimated_completion_date: '',
    progress_percent: 0,
    estimated_hours: '',
    actual_hours: '',
    is_milestone: false,
    is_blocked: false,
    description: '',
  }
}

function resetForm() {
  const next = makeInitialForm()
  Object.assign(form, next)

  if (props.initialTask) {
    Object.assign(form, {
      name: props.initialTask.name || '',
      task_title: props.initialTask.task_title || '',
      project: props.initialTask.project || props.defaultProject || '',
      team: props.initialTask.team || props.defaultTeam || '',
      assigned_to: props.initialTask.assigned_to || '',
      status: props.initialTask.status || next.status,
      priority: props.initialTask.priority || next.priority,
      task_type: props.initialTask.task_type || next.task_type,
      start_date: props.initialTask.start_date || '',
      due_date: props.initialTask.due_date || '',
      estimated_completion_date: props.initialTask.estimated_completion_date || '',
      progress_percent: props.initialTask.progress_percent ?? 0,
      estimated_hours: props.initialTask.estimated_hours ?? '',
      actual_hours: props.initialTask.actual_hours ?? '',
      is_milestone: Boolean(props.initialTask.is_milestone),
      is_blocked: Boolean(props.initialTask.is_blocked),
      description: props.initialTask.description || '',
    })
  }

  syncTeamFromProject()
}

function syncTeamFromProject() {
  if (!form.project) return
  const project = projectMap.value[form.project]
  if (project?.team) {
    form.team = project.team
  }
}

function handleProjectChange(projectName) {
  form.project = projectName
  syncTeamFromProject()
}

function handleTeamChange(teamName) {
  form.team = teamName
  if (form.project) {
    const selectedProject = projectMap.value[form.project]
    if (selectedProject && selectedProject.team !== teamName) {
      form.project = ''
    }
  }
}

function close() {
  emit('update:modelValue', false)
  emit('cancel')
}

function submit() {
  emit('submit', buildPayload())
}

function buildPayload() {
  return {
    name: form.name || undefined,
    task_title: form.task_title.trim(),
    project: form.project || undefined,
    team: form.team || undefined,
    assigned_to: form.assigned_to || undefined,
    status: form.status,
    priority: form.priority,
    task_type: form.task_type,
    start_date: form.start_date || undefined,
    due_date: form.due_date || undefined,
    estimated_completion_date: form.estimated_completion_date || undefined,
    progress_percent: Number(form.progress_percent || 0),
    estimated_hours: numericOrEmpty(form.estimated_hours),
    actual_hours: numericOrEmpty(form.actual_hours),
    is_milestone: form.is_milestone ? 1 : 0,
    is_blocked: form.is_blocked ? 1 : 0,
    description: form.description || '',
  }
}

function numericOrEmpty(value) {
  if (value === '' || value == null) return ''
  const numberValue = Number(value)
  return Number.isFinite(numberValue) ? numberValue : ''
}
</script>

<style scoped>
.task-form-overlay {
  position: fixed;
  inset: 0;
  z-index: 50;
  display: grid;
  place-items: center;
  padding: 18px;
  background: rgba(17, 24, 39, 0.35);
  backdrop-filter: blur(6px);
}

.task-form-card {
  width: min(980px, 100%);
  max-height: calc(100vh - 36px);
  overflow: auto;
  border-radius: 18px;
  border: 1px solid var(--tf-border);
  background: var(--tf-surface);
  box-shadow: 0 18px 60px rgba(15, 23, 42, 0.18);
}

.task-form-card__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding: 18px 20px 12px;
  border-bottom: 1px solid var(--tf-border);
}

.task-form-card__eyebrow {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--tf-muted);
}

.task-form-card__title {
  margin: 4px 0 0;
  font-size: 20px;
  line-height: 1.2;
  color: var(--tf-text);
}

.task-form-card__close {
  width: 34px;
  height: 34px;
  border-radius: 10px;
  border: 1px solid var(--tf-border);
  background: var(--tf-surface-subtle);
  color: var(--tf-muted);
  font-size: 22px;
  line-height: 1;
  cursor: pointer;
}

.task-form {
  padding: 18px 20px 20px;
}

.task-form__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.task-form__field {
  display: grid;
  gap: 6px;
}

.task-form__field--wide {
  grid-column: 1 / -1;
}

.task-form__label {
  font-size: 11px;
  font-weight: 600;
  color: #374151;
}

.task-form__input,
.task-form__textarea {
  width: 100%;
  border-radius: 12px;
  border: 1px solid var(--tf-border);
  background: #fff;
  color: var(--tf-text);
  outline: none;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

.task-form__input {
  min-height: 38px;
  padding: 0 12px;
}

.task-form__textarea {
  min-height: 120px;
  padding: 12px;
  resize: vertical;
}

.task-form__input:focus,
.task-form__textarea:focus {
  border-color: #d1d5db;
  box-shadow: 0 0 0 3px rgba(17, 24, 39, 0.04);
}

.task-form__checks {
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
  margin: 16px 0;
}

.task-form__check {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: #374151;
}

.task-form__error {
  margin: 0 0 14px;
  font-size: 12px;
  color: #b91c1c;
}

.task-form__footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding-top: 6px;
}

.task-form__button {
  min-height: 38px;
  padding: 0 14px;
  border-radius: 12px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}

.task-form__button--ghost {
  border: 1px solid var(--tf-border);
  background: #fff;
  color: var(--tf-text);
}

.task-form__button--primary {
  border: 1px solid var(--tf-accent);
  background: var(--tf-accent);
  color: #fff;
}

.task-form__button--primary:disabled {
  opacity: 0.7;
  cursor: wait;
}

@media (max-width: 860px) {
  .task-form__grid {
    grid-template-columns: 1fr;
  }

  .task-form-card {
    max-height: calc(100vh - 24px);
  }
}
</style>
