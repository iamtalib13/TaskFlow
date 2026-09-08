<template>
  <div
    v-if="modelValue"
    class="fixed inset-0 z-50 overflow-y-auto bg-black/45 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 transition-opacity duration-200"
    @click.self="close"
  >
    <div
      class="bg-white rounded-2xl shadow-2xl border border-gray-100 w-full max-w-xl flex flex-col overflow-hidden transform transition-all duration-200 scale-100"
      role="dialog"
      aria-modal="true"
    >
      <!-- Modal Header -->
      <div class="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-white">
        <div class="flex items-center gap-2">
          <span class="w-8 h-8 rounded-lg bg-black text-white flex items-center justify-center text-sm font-bold">
            +
          </span>
          <div>
            <h3 class="text-sm font-bold text-gray-900">Create New Task</h3>
            <p class="text-xs text-gray-500">Add a new task to your Taskflow workspace</p>
          </div>
        </div>

        <button
          type="button"
          class="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition"
          @click="close"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- Modal Body -->
      <form class="p-6 space-y-4 text-xs" @submit.prevent="submit">
        <div>
          <label class="block font-semibold text-gray-700 mb-1">
            Task Title <span class="text-rose-500">*</span>
          </label>
          <input
            v-model="form.title"
            required
            type="text"
            placeholder="e.g. Implement Responsive Table View"
            class="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-black focus:border-black transition"
          />
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block font-medium text-gray-600 mb-1">Project</label>
            <select
              v-model="form.project"
              class="w-full bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs text-gray-800 focus:ring-2 focus:ring-black outline-none"
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
              class="w-full bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs text-gray-800 focus:ring-2 focus:ring-black outline-none"
            >
              <option value="">Unassigned</option>
              <option v-for="u in people" :key="u.email" :value="u.name">
                {{ u.name }}
              </option>
            </select>
          </div>
        </div>

        <div class="grid grid-cols-3 gap-3">
          <div>
            <label class="block font-medium text-gray-600 mb-1">Status</label>
            <select
              v-model="form.status"
              class="w-full bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs text-gray-800 focus:ring-2 focus:ring-black outline-none"
            >
              <option v-for="s in statuses" :key="s" :value="s">{{ s }}</option>
            </select>
          </div>

          <div>
            <label class="block font-medium text-gray-600 mb-1">Priority</label>
            <select
              v-model="form.priority"
              class="w-full bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs text-gray-800 focus:ring-2 focus:ring-black outline-none"
            >
              <option v-for="p in priorities" :key="p" :value="p">{{ p }}</option>
            </select>
          </div>

          <div>
            <label class="block font-medium text-gray-600 mb-1">Due Date</label>
            <input
              v-model="form.due_date"
              type="date"
              class="w-full bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs text-gray-800 focus:ring-2 focus:ring-black outline-none"
            />
          </div>
        </div>

        <div>
          <label class="block font-medium text-gray-600 mb-1">Description</label>
          <textarea
            v-model="form.description"
            rows="3"
            placeholder="Details or acceptance criteria..."
            class="w-full text-xs border border-gray-200 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-black focus:border-black transition resize-none"
          ></textarea>
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
            class="px-5 py-2 bg-black hover:bg-gray-800 text-white text-xs font-semibold rounded-lg shadow-xs disabled:opacity-40 transition flex items-center gap-2"
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
export default {
  name: 'TaskCreateModal',
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
      default: () => ['Open', 'In Progress', 'Review', 'Completed', 'On Hold'],
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
  methods: {
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
