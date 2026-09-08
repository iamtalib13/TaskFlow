<template>
  <div
    v-if="modelValue"
    class="fixed inset-0 z-50 overflow-y-auto bg-black/45 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 transition-opacity duration-200"
    @click.self="close"
  >
    <div
      class="bg-white rounded-2xl shadow-2xl border border-gray-100 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden transform transition-all duration-200 scale-100"
      role="dialog"
      aria-modal="true"
    >
      <!-- Modal Header -->
      <div class="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-white sticky top-0 z-10">
        <div class="flex items-center gap-3">
          <span class="px-2.5 py-1 text-xs font-mono font-semibold bg-gray-100 text-gray-800 rounded-md">
            {{ task?.id || 'New Task' }}
          </span>
          <span
            v-if="task?.status"
            :class="[
              'px-2.5 py-0.5 rounded-full text-xs font-medium inline-flex items-center gap-1.5',
              statusBadgeClass(task.status),
            ]"
          >
            <span class="w-1.5 h-1.5 rounded-full bg-current"></span>
            {{ task.status }}
          </span>
          <span
            v-if="task?.priority"
            :class="[
              'px-2 py-0.5 rounded text-xs font-medium',
              priorityBadgeClass(task.priority),
            ]"
          >
            {{ task.priority }}
          </span>
        </div>

        <div class="flex items-center gap-2">
          <button
            type="button"
            class="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition"
            title="Close"
            @click="close"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      <!-- Modal Body (Two Columns) -->
      <div class="flex-1 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
        <!-- Main Content (Left 2 Columns) -->
        <div class="md:col-span-2 space-y-6">
          <!-- Title Input -->
          <div>
            <label class="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
              Task Title
            </label>
            <input
              v-model="form.title"
              type="text"
              placeholder="Enter task title..."
              class="w-full text-lg font-semibold text-gray-900 border border-gray-200 rounded-lg px-3.5 py-2 focus:ring-2 focus:ring-black focus:border-black outline-none transition"
            />
          </div>

          <!-- Description -->
          <div>
            <label class="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
              Description
            </label>
            <textarea
              v-model="form.description"
              rows="5"
              placeholder="Add details, acceptance criteria, or notes..."
              class="w-full text-sm text-gray-800 border border-gray-200 rounded-lg p-3 focus:ring-2 focus:ring-black focus:border-black outline-none transition resize-y"
            ></textarea>
          </div>

          <!-- Comments & Activity Section -->
          <div class="border-t border-gray-100 pt-5 space-y-4">
            <h4 class="text-xs font-bold text-gray-600 uppercase tracking-wider flex items-center justify-between">
              <span>Activity & Comments</span>
              <span class="text-gray-400 font-normal">{{ comments.length }} entries</span>
            </h4>

            <!-- Comment List -->
            <div v-if="comments.length > 0" class="space-y-3 max-h-60 overflow-y-auto pr-1">
              <div
                v-for="(cmt, idx) in comments"
                :key="idx"
                class="p-3 bg-gray-50/80 rounded-xl border border-gray-100 text-xs space-y-1"
              >
                <div class="flex items-center justify-between text-gray-500">
                  <span class="font-semibold text-gray-800">{{ cmt.author }}</span>
                  <span class="text-[11px]">{{ cmt.time }}</span>
                </div>
                <p class="text-gray-700 leading-relaxed">{{ cmt.text }}</p>
              </div>
            </div>
            <div v-else class="text-xs text-gray-400 italic py-2">
              No comments yet. Start the conversation below.
            </div>

            <!-- Add Comment Input -->
            <div class="flex items-center gap-2 pt-2">
              <input
                v-model="newComment"
                type="text"
                placeholder="Write a comment..."
                class="flex-1 text-xs border border-gray-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-black focus:border-black transition"
                @keyup.enter="addComment"
              />
              <button
                type="button"
                :disabled="!newComment.trim()"
                class="px-3 py-2 bg-gray-900 hover:bg-black text-white rounded-lg text-xs font-medium disabled:opacity-30 disabled:cursor-not-allowed transition"
                @click="addComment"
              >
                Send
              </button>
            </div>
          </div>
        </div>

        <!-- Sidebar Attributes (Right 1 Column) -->
        <div class="space-y-4 bg-gray-50/70 p-4 rounded-xl border border-gray-100 text-xs">
          <h4 class="font-bold text-gray-800 text-xs uppercase tracking-wider mb-2">
            Attributes
          </h4>

          <!-- Status -->
          <div>
            <label class="block text-gray-500 font-medium mb-1">Status</label>
            <select
              v-model="form.status"
              class="w-full bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs text-gray-800 font-medium focus:ring-2 focus:ring-black outline-none"
            >
              <option v-for="s in statuses" :key="s" :value="s">{{ s }}</option>
            </select>
          </div>

          <!-- Priority -->
          <div>
            <label class="block text-gray-500 font-medium mb-1">Priority</label>
            <select
              v-model="form.priority"
              class="w-full bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs text-gray-800 font-medium focus:ring-2 focus:ring-black outline-none"
            >
              <option v-for="p in priorities" :key="p" :value="p">{{ p }}</option>
            </select>
          </div>

          <!-- Project -->
          <div>
            <label class="block text-gray-500 font-medium mb-1">Project</label>
            <select
              v-model="form.project"
              class="w-full bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs text-gray-800 font-medium focus:ring-2 focus:ring-black outline-none"
            >
              <option v-for="prj in projects" :key="prj.name" :value="prj.name">
                {{ prj.display_name || prj.name }}
              </option>
            </select>
          </div>

          <!-- Assigned To -->
          <div>
            <label class="block text-gray-500 font-medium mb-1">Assigned To</label>
            <select
              v-model="form.assigned_to"
              class="w-full bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs text-gray-800 font-medium focus:ring-2 focus:ring-black outline-none"
            >
              <option value="">Unassigned</option>
              <option v-for="person in people" :key="person.email" :value="person.name">
                {{ person.name }}
              </option>
            </select>
          </div>

          <!-- Reporter -->
          <div>
            <label class="block text-gray-500 font-medium mb-1">Reporter</label>
            <input
              v-model="form.reporter"
              type="text"
              class="w-full bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs text-gray-800 focus:ring-2 focus:ring-black outline-none"
            />
          </div>

          <!-- Pending With -->
          <div>
            <label class="block text-gray-500 font-medium mb-1">Pending With</label>
            <input
              v-model="form.pending_with"
              type="text"
              placeholder="e.g. Client, Team"
              class="w-full bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs text-gray-800 focus:ring-2 focus:ring-black outline-none"
            />
          </div>

          <!-- Due Date -->
          <div>
            <label class="block text-gray-500 font-medium mb-1">Due Date</label>
            <input
              v-model="form.due_date"
              type="date"
              class="w-full bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs text-gray-800 focus:ring-2 focus:ring-black outline-none"
            />
          </div>

          <!-- Estimated & Logged Hours -->
          <div class="grid grid-cols-2 gap-2">
            <div>
              <label class="block text-gray-500 font-medium mb-1">Est. Hours</label>
              <input
                v-model.number="form.estimated_hours"
                type="number"
                step="0.5"
                class="w-full bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs text-gray-800 focus:ring-2 focus:ring-black outline-none"
              />
            </div>
            <div>
              <label class="block text-gray-500 font-medium mb-1">Logged Hrs</label>
              <input
                v-model.number="form.logged_hours"
                type="number"
                step="0.5"
                class="w-full bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs text-gray-800 focus:ring-2 focus:ring-black outline-none"
              />
            </div>
          </div>
        </div>
      </div>

      <!-- Modal Footer Actions -->
      <div class="px-6 py-3.5 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
        <div class="text-[11px] text-gray-400">
          Press <kbd class="px-1.5 py-0.5 bg-gray-200 rounded text-gray-600 font-mono">ESC</kbd> to close
        </div>
        <div class="flex items-center gap-2">
          <button
            type="button"
            class="px-4 py-2 text-xs font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded-lg transition"
            @click="close"
          >
            Cancel
          </button>
          <button
            type="button"
            :disabled="saving"
            class="px-5 py-2 bg-black hover:bg-gray-800 text-white text-xs font-semibold rounded-lg shadow-xs disabled:opacity-50 transition flex items-center gap-2"
            @click="save"
          >
            <span v-if="saving" class="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
            <span>Save Changes</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'TaskDetailModal',
  props: {
    modelValue: {
      type: Boolean,
      default: false,
    },
    task: {
      type: Object,
      default: null,
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
      default: () => ['Open', 'In Progress', 'Review', 'Completed', 'On Hold', 'Cancelled'],
    },
    priorities: {
      type: Array,
      default: () => ['Critical', 'High', 'Medium', 'Low'],
    },
  },
  emits: ['update:modelValue', 'save', 'close'],
  data() {
    return {
      saving: false,
      newComment: '',
      form: {
        id: '',
        title: '',
        description: '',
        status: 'Open',
        priority: 'Medium',
        project: '',
        assigned_to: '',
        reporter: '',
        pending_with: '',
        due_date: '',
        estimated_hours: 0,
        logged_hours: 0,
      },
      comments: [],
    }
  },
  watch: {
    task: {
      immediate: true,
      handler(t) {
        if (t) {
          this.form = {
            id: t.id || '',
            title: t.title || '',
            description: t.description || '',
            status: t.status || 'Open',
            priority: t.priority || 'Medium',
            project: t.project || '',
            assigned_to: t.assigned_to || '',
            reporter: t.reporter || '',
            pending_with: t.pending_with || '',
            due_date: t.due_date || '',
            estimated_hours: t.estimated_hours || 0,
            logged_hours: t.logged_hours || 0,
          }
          this.comments = Array.isArray(t.comments) ? [...t.comments] : []
        }
      },
    },
    modelValue(val) {
      if (val) {
        window.addEventListener('keydown', this.handleKeyDown)
      } else {
        window.removeEventListener('keydown', this.handleKeyDown)
      }
    },
  },
  beforeUnmount() {
    window.removeEventListener('keydown', this.handleKeyDown)
  },
  methods: {
    close() {
      this.$emit('update:modelValue', false)
      this.$emit('close')
    },
    handleKeyDown(e) {
      if (e.key === 'Escape') {
        this.close()
      }
    },
    addComment() {
      if (!this.newComment.trim()) return
      this.comments.push({
        author: 'Administrator',
        time: 'Just now',
        text: this.newComment.trim(),
      })
      this.newComment = ''
    },
    save() {
      this.saving = true
      const updated = {
        ...this.task,
        ...this.form,
        comments: this.comments,
      }
      this.$emit('save', updated)
      setTimeout(() => {
        this.saving = false
        this.close()
      }, 200)
    },
    statusBadgeClass(status) {
      switch (status) {
        case 'In Progress':
          return 'bg-blue-50 text-blue-700 border border-blue-200/60'
        case 'Review':
          return 'bg-purple-50 text-purple-700 border border-purple-200/60'
        case 'Completed':
          return 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
        case 'On Hold':
          return 'bg-amber-50 text-amber-700 border border-amber-200/60'
        case 'Cancelled':
          return 'bg-rose-50 text-rose-700 border border-rose-200/60'
        default:
          return 'bg-gray-100 text-gray-700 border border-gray-200'
      }
    },
    priorityBadgeClass(priority) {
      switch (priority) {
        case 'Critical':
          return 'bg-rose-50 text-rose-700 font-bold border border-rose-200'
        case 'High':
          return 'bg-orange-50 text-orange-700 font-semibold border border-orange-200'
        case 'Medium':
          return 'bg-yellow-50 text-yellow-800 border border-yellow-200'
        default:
          return 'bg-gray-100 text-gray-600 border border-gray-200'
      }
    },
  },
}
</script>
