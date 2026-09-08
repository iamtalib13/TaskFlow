<template>
  <div
    v-if="modelValue"
    class="fixed inset-0 z-50 overflow-y-auto bg-black/45 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 transition-opacity duration-200"
    @click.self="close"
  >
    <div
      class="bg-white rounded-2xl shadow-2xl border border-gray-100 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden transform transition-all duration-200 scale-100"
      role="dialog"
      aria-modal="true"
    >
      <!-- Modal Header -->
      <div class="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-white shrink-0">
        <div class="flex items-center gap-2.5">
          <span class="w-8 h-8 rounded-lg bg-black text-white flex items-center justify-center text-sm font-bold shadow-xs">
            +
          </span>
          <div>
            <h3 class="text-sm font-bold text-gray-900">Create New Task</h3>
            <p class="text-xs text-gray-500">Add a new task to your Taskflow workspace</p>
          </div>
        </div>

        <button
          type="button"
          class="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition cursor-pointer"
          @click="close"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- Modal Body -->
      <form class="p-6 space-y-4 text-xs overflow-y-auto flex-1" @submit.prevent="submit">
        <div>
          <label class="block font-semibold text-gray-700 mb-1">
            Task Title <span class="text-rose-500">*</span>
          </label>
          <input
            v-model="form.title"
            required
            type="text"
            placeholder="e.g. Implement Responsive Table View"
            class="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-[#417c7d]/20 focus:border-[#417c7d] transition"
          />
        </div>

        <!-- 4-Column Grid for Metadata -->
        <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <label class="block font-medium text-gray-600 mb-1">Project</label>
            <select
              v-model="form.project"
              class="w-full bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs text-gray-800 focus:ring-2 focus:ring-[#417c7d]/20 focus:border-[#417c7d] outline-none transition"
            >
              <option value="">Select Project</option>
              <option v-for="p in projects" :key="p.name" :value="p.name">
                {{ p.display_name || p.name }}
              </option>
            </select>
          </div>

          <div>
            <label class="block font-medium text-gray-600 mb-1">Assigned To</label>
            <select
              v-model="form.assigned_to"
              class="w-full bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs text-gray-800 focus:ring-2 focus:ring-[#417c7d]/20 focus:border-[#417c7d] outline-none transition"
            >
              <option value="">Unassigned</option>
              <option v-for="u in people" :key="u.email" :value="u.name">
                {{ u.name }}
              </option>
            </select>
          </div>

          <div>
            <label class="block font-medium text-gray-600 mb-1">Status</label>
            <select
              v-model="form.status"
              class="w-full bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs text-gray-800 focus:ring-2 focus:ring-[#417c7d]/20 focus:border-[#417c7d] outline-none transition"
            >
              <option v-for="s in statuses" :key="s" :value="s">{{ s }}</option>
            </select>
          </div>

          <div>
            <label class="block font-medium text-gray-600 mb-1">Priority</label>
            <select
              v-model="form.priority"
              class="w-full bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs text-gray-800 focus:ring-2 focus:ring-[#417c7d]/20 focus:border-[#417c7d] outline-none transition"
            >
              <option v-for="p in priorities" :key="p" :value="p">{{ p }}</option>
            </select>
          </div>
        </div>

        <!-- Second Row: Due Date & Estimated Hours -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-md">
          <div>
            <label class="block font-medium text-gray-600 mb-1">Due Date</label>
            <div class="relative flex items-center">
              <input
                v-model="displayDueDate"
                type="text"
                placeholder="DD-MM-YYYY"
                maxlength="10"
                class="w-full bg-white border border-gray-200 rounded-lg pl-2.5 pr-8 py-1.5 text-xs text-gray-800 font-mono focus:ring-2 focus:ring-[#417c7d]/20 focus:border-[#417c7d] outline-none transition"
              />
              <label class="absolute right-2 text-gray-400 hover:text-gray-700 cursor-pointer" title="Pick date">
                <Calendar class="size-4" />
                <input
                  type="date"
                  :value="form.due_date"
                  class="sr-only"
                  @change="onNativeDateChange"
                />
              </label>
            </div>
          </div>
        </div>

        <div>
          <label class="block font-medium text-gray-600 mb-1">Description</label>
          <TaskRichEditor
            v-model="form.description"
            :people="people"
            min-height="min-h-48"
            placeholder="Write details, acceptance criteria, or type / for blocks..."
          />
        </div>

        <!-- Actions -->
        <div class="pt-3 border-t border-gray-100 flex items-center justify-end gap-2">
          <button
            type="button"
            class="px-4 py-2 text-xs font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition"
            @click="close"
          >
            Cancel
          </button>
          <button
            type="submit"
            :disabled="!form.title.trim() || creating"
            class="px-5 py-2 bg-[#417c7d] hover:bg-[#366869] active:bg-[#2b5354] text-white text-xs font-semibold rounded-lg shadow-xs disabled:opacity-40 transition flex items-center gap-2"
          >
            <span v-if="creating" class="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
            <span>Create Task</span>
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script>
import TaskRichEditor from './TaskRichEditor.vue'
import { Calendar } from 'lucide-vue-next'

export default {
  name: 'TaskCreateModal',
  components: {
    TaskRichEditor,
    Calendar,
  },
  props: {
    modelValue: {
      type: Boolean,
      default: false,
    },
    projects: {
      type: Array,
      default: () => [],
    },
    people: {
      type: Array,
      default: () => [],
    },
    statuses: {
      type: Array,
      default: () => ['Open', 'In Progress', 'Review', 'On Hold', 'Completed', 'Cancelled', 'Overdue'],
    },
    priorities: {
      type: Array,
      default: () => ['Critical', 'High', 'Medium', 'Low'],
    },
  },
  emits: ['update:modelValue', 'create', 'close'],
  data() {
    return {
      creating: false,
      form: {
        title: '',
        project: '',
        assigned_to: '',
        status: 'Open',
        priority: 'Medium',
        due_date: '',
        description: '',
      },
    }
  },
  watch: {
    modelValue(val) {
      if (val) {
        this.form = {
          title: '',
          project: this.projects[0]?.name || '',
          assigned_to: '',
          status: 'Open',
          priority: 'Medium',
          due_date: '',
          description: '',
        }
      }
    },
  },
  computed: {
    displayDueDate: {
      get() {
        if (!this.form.due_date) return ''
        const parts = String(this.form.due_date).split('-')
        if (parts.length === 3) {
          const [y, m, d] = parts
          if (y.length === 4) return `${d.padStart(2, '0')}-${m.padStart(2, '0')}-${y}`
        }
        return this.form.due_date
      },
      set(val) {
        if (!val) {
          this.form.due_date = ''
          return
        }
        const parts = String(val).trim().split(/[-/]/)
        if (parts.length === 3) {
          const [d, m, y] = parts
          if (y && y.length === 4) {
            this.form.due_date = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
            return
          }
        }
        this.form.due_date = val
      },
    },
  },
  methods: {
    onNativeDateChange(e) {
      this.form.due_date = e.target.value
    },
    close() {
      this.$emit('update:modelValue', false)
      this.$emit('close')
    },
    submit() {
      if (!this.form.title.trim()) return
      this.creating = true
      this.$emit('create', { ...this.form })
      setTimeout(() => {
        this.creating = false
        this.close()
      }, 200)
    },
  },
}
</script>
