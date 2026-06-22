<template>
  <Teleport to="body">
    <div v-if="modelValue" class="project-form-overlay" @click.self="close">
      <section class="project-form-card" role="dialog" aria-modal="true" :aria-label="dialogLabel">
        <header class="project-form-card__header" :style="headerStyle">
          <div>
            <div class="project-form-card__eyebrow">Project Form</div>
            <h3 class="project-form-card__title">{{ dialogTitle }}</h3>
          </div>
          <button type="button" class="project-form-card__close" @click="close">×</button>
        </header>

        <form class="project-form" @submit.prevent="submit">
          <div class="project-form__grid">
            <label class="project-form__field project-form__field--wide">
              <span class="project-form__label">Project Name</span>
              <input v-model="form.project_name" type="text" class="project-form__input" placeholder="Enter project name" required />
            </label>

            <label class="project-form__field">
              <span class="project-form__label">Project Code</span>
              <input v-model="form.project_code" type="text" class="project-form__input" placeholder="e.g. TF" />
            </label>

            <label class="project-form__field">
              <span class="project-form__label">Team</span>
              <select v-model="form.team" class="project-form__input">
                <option value="">Select team</option>
                <option v-for="team in teams" :key="team.name" :value="team.name">
                  {{ team.team_name || team.name }}
                </option>
              </select>
            </label>

            <label class="project-form__field">
              <span class="project-form__label">Project Lead</span>
              <select v-model="form.project_lead" class="project-form__input">
                <option value="">Select Lead</option>
                <option v-for="option in leadOptions" :key="option.value" :value="option.value">
                  {{ option.label }}
                </option>
              </select>
            </label>

            <label class="project-form__field">
              <span class="project-form__label">Status</span>
              <select v-model="form.status" class="project-form__input">
                <option v-for="option in statusOptions" :key="option" :value="option">{{ option }}</option>
              </select>
            </label>

            <label class="project-form__field">
              <span class="project-form__label">Priority</span>
              <select v-model="form.priority" class="project-form__input">
                <option v-for="option in priorityOptions" :key="option" :value="option">{{ option }}</option>
              </select>
            </label>

            <label class="project-form__field">
              <span class="project-form__label">Start Date</span>
              <input v-model="form.start_date" type="date" class="project-form__input" />
            </label>

            <label class="project-form__field">
              <span class="project-form__label">End Date</span>
              <input v-model="form.end_date" type="date" class="project-form__input" />
            </label>

            <label class="project-form__field">
              <span class="project-form__label">Expected Hours</span>
              <input v-model="form.expected_hours" type="number" min="0" step="0.25" class="project-form__input" />
            </label>
          </div>

          <label class="project-form__field project-form__field--wide mt-4">
            <span class="project-form__label">Description</span>
            <textarea v-model="form.description" class="project-form__textarea" rows="4" placeholder="Write project description or goals"></textarea>
          </label>

          <p v-if="errorMessage" class="project-form__error">{{ errorMessage }}</p>

          <footer class="project-form__footer">
            <button type="button" class="project-form__button project-form__button--ghost" @click="close">Cancel</button>
            <button type="submit" class="project-form__button project-form__button--primary" :disabled="saving">
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
  leadOptions: {
    type: Array,
    default: () => [],
  },
  statusOptions: {
    type: Array,
    default: () => ['Planning', 'Active', 'On Hold', 'Completed', 'Cancelled'],
  },
  priorityOptions: {
    type: Array,
    default: () => ['Low', 'Medium', 'High', 'Critical'],
  },
  initialProject: {
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

const dialogLabel = computed(() => (props.mode === 'edit' ? 'Edit Project Form' : 'Create Project Form'))
const dialogTitle = computed(() => (props.mode === 'edit' ? 'Edit Project Details' : 'Create New Project'))
const submitLabel = computed(() => (props.mode === 'edit' ? 'Save Changes' : 'Create Project'))

const headerStyle = computed(() => {
  return { background: 'linear-gradient(135deg, #4f46e5, #4338ca)', color: '#fff' }
})

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
  () => props.initialProject,
  () => {
    if (props.modelValue) {
      resetForm()
    }
  },
  { deep: true },
)

watch(
  () => form.project_name,
  (newName) => {
    if (props.mode === 'create') {
      form.project_code = newName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
    }
  },
)

function makeInitialForm() {
  return {
    name: '',
    project_name: '',
    project_code: '',
    team: '',
    project_lead: '',
    status: 'Planning',
    priority: 'Medium',
    start_date: '',
    end_date: '',
    expected_hours: '',
    description: '',
  }
}

function resetForm() {
  const next = makeInitialForm()
  Object.assign(form, next)

  if (props.initialProject) {
    Object.assign(form, {
      name: props.initialProject.name || '',
      project_name: props.initialProject.project_name || '',
      project_code: props.initialProject.project_code || '',
      team: props.initialProject.team || '',
      project_lead: props.initialProject.project_lead || '',
      status: props.initialProject.status || 'Planning',
      priority: props.initialProject.priority || 'Medium',
      start_date: props.initialProject.start_date || '',
      end_date: props.initialProject.end_date || '',
      expected_hours: props.initialProject.expected_hours ?? '',
      description: props.initialProject.description || '',
    })
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
    project_name: form.project_name.trim(),
    project_code: form.project_code.trim() || undefined,
    team: form.team || undefined,
    project_lead: form.project_lead || undefined,
    status: form.status,
    priority: form.priority,
    start_date: form.start_date || undefined,
    end_date: form.end_date || undefined,
    expected_hours: form.expected_hours !== '' ? Number(form.expected_hours) : undefined,
    description: form.description || '',
  }
}
</script>

<style scoped>
.project-form-overlay {
  position: fixed;
  inset: 0;
  z-index: 50;
  display: grid;
  place-items: center;
  padding: 18px;
  background: rgba(17, 24, 39, 0.35);
  backdrop-filter: blur(6px);
}

.project-form-card {
  width: min(720px, 100%);
  max-height: calc(100vh - 36px);
  overflow: auto;
  border-radius: 18px;
  border: 1px solid var(--tf-border);
  background: var(--tf-surface);
  box-shadow: 0 18px 60px rgba(15, 23, 42, 0.18);
}

.project-form-card__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding: 18px 20px 12px;
  border-bottom: 1px solid var(--tf-border);
}

.project-form-card__eyebrow {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.8);
}

.project-form-card__title {
  margin: 4px 0 0;
  font-size: 20px;
  line-height: 1.2;
  color: #fff;
}

.project-form-card__close {
  width: 34px;
  height: 34px;
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
  font-size: 22px;
  line-height: 1;
  cursor: pointer;
}

.project-form {
  padding: 18px 20px 20px;
}

.project-form__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.project-form__field {
  display: grid;
  gap: 6px;
}

.project-form__field--wide {
  grid-column: 1 / -1;
}

.project-form__label {
  font-size: 11px;
  font-weight: 600;
  color: #374151;
}

.project-form__input,
.project-form__textarea {
  width: 100%;
  border-radius: 12px;
  border: 1px solid var(--tf-border);
  background: #fff;
  color: var(--tf-text);
  outline: none;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

.project-form__input {
  min-height: 38px;
  padding: 0 12px;
}

.project-form__textarea {
  min-height: 100px;
  padding: 12px;
  resize: vertical;
}

.project-form__input:focus,
.project-form__textarea:focus {
  border-color: #d1d5db;
  box-shadow: 0 0 0 3px rgba(17, 24, 39, 0.04);
}

.project-form__error {
  margin: 14px 0 0;
  font-size: 12px;
  color: #b91c1c;
}

.project-form__footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding-top: 16px;
  border-top: 1px solid var(--tf-border);
  margin-top: 18px;
}

.project-form__button {
  min-height: 38px;
  padding: 0 14px;
  border-radius: 12px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}

.project-form__button--ghost {
  border: 1px solid var(--tf-border);
  background: #fff;
  color: var(--tf-text);
}

.project-form__button--primary {
  border: 1px solid var(--tf-accent);
  background: var(--tf-accent);
  color: #fff;
}

.project-form__button--primary:disabled {
  opacity: 0.7;
  cursor: wait;
}

.mt-4 {
  margin-top: 1rem;
}

@media (max-width: 640px) {
  .project-form__grid {
    grid-template-columns: 1fr;
  }
}
</style>
