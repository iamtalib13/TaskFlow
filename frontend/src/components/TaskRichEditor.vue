<script setup>
import { computed } from 'vue'
import {
  Editor,
  EditorContent,
  EditorFixedMenu,
  EditorBubbleMenu,
  RichTextKit,
  HeadingGroup,
  Separator,
  Bold,
  Italic,
  Strike,
  FontColor,
  FontHighlight,
  BulletList,
  OrderedList,
  Blockquote,
  InsertLink,
  InsertImage,
  InsertTable,
  InsertIframe,
  HorizontalRule,
  AlignLeft,
  AlignCenter,
  AlignRight,
} from 'frappe-ui/editor'

const model = defineModel({
  type: String,
  default: '',
})

const props = defineProps({
  placeholder: {
    type: String,
    default: 'Write something…',
  },
  people: {
    type: Array,
    default: () => [],
  },
  minHeight: {
    type: String,
    default: 'min-h-56',
  },
})

const defaultPeople = [
  { id: 'sarah', label: 'Sarah Chen' },
  { id: 'faris', label: 'Faris Ansari' },
  { id: 'maria', label: 'Maria Garcia' },
  { id: 'talib', label: 'Talib Sheikh' },
]

const mentionItems = computed(() => {
  if (props.people && props.people.length > 0) {
    return props.people.map((p) => ({
      id: p.name || p.email || p.id,
      label: p.name || p.label || p.email,
    }))
  }
  return defaultPeople
})

const tags = [
  { id: 'onboarding', label: 'onboarding' },
  { id: 'billing', label: 'billing' },
  { id: 'urgent', label: 'urgent' },
  { id: 'bug', label: 'bug' },
  { id: 'feature', label: 'feature' },
]

const extensions = computed(() => [
  RichTextKit.configure({
    mention: { items: mentionItems.value },
    tag: { items: tags },
  }),
])

const toolbar = [
  HeadingGroup,
  Separator,
  Bold,
  Italic,
  Strike,
  FontColor,
  FontHighlight,
  Separator,
  BulletList,
  OrderedList,
  Blockquote,
  Separator,
  InsertLink,
  InsertImage,
  InsertTable,
  InsertIframe,
  HorizontalRule,
]

const bubbleToolbar = [
  Bold,
  Italic,
  Strike,
  InsertLink,
  Separator,
  AlignLeft,
  AlignCenter,
  AlignRight,
]

const uploadFunction = async (file) => ({
  file_url: URL.createObjectURL(file),
  file_name: file.name,
})
</script>

<template>
  <div class="w-full">
    <Editor
      v-model="model"
      :extensions="extensions"
      :upload-function="uploadFunction"
      :placeholder="placeholder"
    >
      <template #default>
        <!-- Inside <Editor>, the building blocks read the editor from context — no :editor prop needed -->
        <div
          class="overflow-hidden rounded-xl border border-gray-200 bg-surface-base shadow-2xs focus-within:border-gray-300 transition"
        >
          <EditorBubbleMenu :items="bubbleToolbar" />
          <div class="border-b border-outline-gray-1 px-2 py-1.5 bg-surface-gray-1">
            <EditorFixedMenu :items="toolbar" class="flex-wrap gap-1" />
          </div>
          <EditorContent
            :class="[minHeight, 'max-h-[420px] overflow-y-auto px-5 py-4 text-ink-gray-8 text-sm leading-relaxed outline-none focus:outline-none prose prose-v3 max-w-none']"
          />
        </div>
      </template>
    </Editor>
  </div>
</template>

<style scoped>
:deep(.ProseMirror) {
  outline: none !important;
  box-shadow: none !important;
  border: none !important;
  white-space: pre-wrap !important;
  white-space: break-spaces !important;
  word-wrap: break-word !important;
  caret-color: #111827 !important;
}

:deep(.ProseMirror:focus),
:deep(.ProseMirror-focused) {
  outline: none !important;
  box-shadow: none !important;
  border: none !important;
}

:deep(.tiptap:focus),
:deep(.tiptap-focused) {
  outline: none !important;
  box-shadow: none !important;
  border: none !important;
}

/* Ensure empty paragraphs and line breaks have full line height so Enter clearly creates new lines */
:deep(.ProseMirror p) {
  margin-top: 0.35rem !important;
  margin-bottom: 0.35rem !important;
  min-height: 1.5rem !important;
  line-height: 1.625 !important;
}

:deep(.ProseMirror p:empty),
:deep(.ProseMirror p:has(> br.ProseMirror-trailingBreak:only-child)) {
  min-height: 1.5rem !important;
  line-height: 1.625 !important;
}

:deep(.ProseMirror p:empty::before),
:deep(.ProseMirror p:has(> br.ProseMirror-trailingBreak:only-child)::before) {
  content: '\200B';
  display: inline-block;
  width: 0;
  pointer-events: none;
}

:deep(.ProseMirror br.ProseMirror-trailingBreak) {
  display: inline !important;
}

:deep(.ProseMirror ul),
:deep(.ProseMirror ol) {
  padding-left: 1.25rem !important;
  margin-top: 0.35rem !important;
  margin-bottom: 0.35rem !important;
}

:deep(.ProseMirror li) {
  margin-top: 0.2rem !important;
  margin-bottom: 0.2rem !important;
  min-height: 1.5rem !important;
}

:deep(.ProseMirror blockquote) {
  border-left: 3px solid #417c7d !important;
  padding-left: 0.75rem !important;
  margin-top: 0.5rem !important;
  margin-bottom: 0.5rem !important;
  color: #4b5563 !important;
  font-style: italic;
}
</style>
