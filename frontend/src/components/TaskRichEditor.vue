<script setup>
import { computed } from 'vue'
import {
  Editor,
  EditorContent,
  EditorFixedMenu,
  EditorBubbleMenu,
  EditorFloatingMenu,
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
          class="overflow-hidden rounded-xl border border-gray-200 bg-surface-base shadow-2xs focus-within:ring-2 focus-within:ring-[#417c7d]/20 focus-within:border-[#417c7d] transition"
        >
          <EditorBubbleMenu :items="bubbleToolbar" />
          <EditorFloatingMenu :items="toolbar" />
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
}
:deep(.ProseMirror:focus) {
  outline: none !important;
  box-shadow: none !important;
}
</style>
