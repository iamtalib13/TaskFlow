<script setup>
import { ref, computed } from 'vue'
import { Button } from 'frappe-ui'
import {
  Editor,
  EditorContent,
  EditorFixedMenu,
  EditorBubbleMenu,
  CommentKit,
  commentToolbar,
} from 'frappe-ui/editor'

const props = defineProps({
  teamMembers: {
    type: Array,
    default: () => [],
  },
  currentUserInitials: {
    type: String,
    default: 'ME',
  },
  isSubmitting: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['submit'])

const people = computed(() => {
  const unique = new Map()
  for (const m of props.teamMembers) {
    if (m && (m.user || m.employee || m.name)) {
      const id = m.user || m.employee || m.name
      const label = m.employee_name || m.user || m.employee || m.name
      if (!unique.has(id)) {
        unique.set(id, { id, label })
      }
    }
  }
  return Array.from(unique.values())
})

const tags = [
  { id: 'urgent', label: 'urgent' },
  { id: 'review', label: 'review' },
  { id: 'info', label: 'info' },
  { id: 'blocker', label: 'blocker' },
  { id: 'bug', label: 'bug' },
  { id: 'feature', label: 'feature' },
]

const extensions = computed(() => [
  CommentKit.configure({
    mention: { items: people.value },
    tag: { items: tags },
  }),
])

const draft = ref('')

function submit() {
  if (!draft.value || draft.value === '<p></p>') return
  emit('submit', draft.value)
  draft.value = ''
}
</script>

<template>
  <div class="w-full px-1">
    <div class="w-full">
      <Editor
        v-model="draft"
        :extensions="extensions"
        placeholder="Write a comment… use @ to mention and # to tag"
      >
        <template #default="{ isEmpty }">
          <div
            class="min-w-0 flex-1 rounded-lg border border-outline-gray-2 bg-surface-base focus-within:border-teal-500 shadow-sm transition-colors"
          >
            <EditorBubbleMenu :items="commentToolbar" />
            <EditorContent
              class="max-h-56 min-h-[3.5rem] overflow-y-auto px-3 py-2 text-ink-gray-8 text-xs"
            />
            <div
              class="flex items-center justify-between gap-2 border-t border-outline-gray-1 px-2 py-1.5 bg-surface-gray-2 rounded-b-lg"
            >
              <EditorFixedMenu :items="commentToolbar" />
              <div class="flex gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  :disabled="isEmpty || isSubmitting"
                  @click="draft = ''"
                >
                  Discard
                </Button>
                <Button
                  size="sm"
                  variant="solid"
                  :loading="isSubmitting"
                  :disabled="isEmpty || isSubmitting"
                  @click="submit"
                >
                  Comment
                </Button>
              </div>
            </div>
          </div>
        </template>
      </Editor>
    </div>
  </div>
</template>
