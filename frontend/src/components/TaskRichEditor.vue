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
    default: 'Add details, acceptance criteria, or notes…',
  },
  people: {
    type: Array,
    default: () => [],
  },
  minHeight: {
    type: String,
    default: 'min-h-[140px]',
  },
})

const defaultPeople = [
  { id: 'talib', label: 'Talib Sheikh' },
  { id: 'sarah', label: 'Sarah Chen' },
  { id: 'marcus', label: 'Marcus Brody' },
  { id: 'elena', label: 'Elena Rostova' },
  { id: 'faris', label: 'Faris Ansari' },
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
  { id: 'urgent', label: 'urgent' },
  { id: 'bug', label: 'bug' },
  { id: 'feature', label: 'feature' },
  { id: 'design', label: 'design' },
  { id: 'review', label: 'review' },
  { id: 'onboarding', label: 'onboarding' },
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
        <div
          class="overflow-hidden rounded-lg border border-outline-gray-2 bg-surface-base shadow-2xs focus-within:ring-2 focus-within:ring-black focus-within:border-black transition"
        >
          <EditorBubbleMenu :items="bubbleToolbar" />
          <EditorFloatingMenu :items="toolbar" />
          <div class="border-b border-outline-gray-1 px-2 py-1.5 bg-gray-50/70">
            <EditorFixedMenu :items="toolbar" class="flex-wrap" button-size="xs" />
          </div>
          <EditorContent
            :class="[minHeight, 'max-h-[360px] overflow-y-auto px-4 py-3 text-ink-gray-8 text-xs leading-relaxed outline-none focus:outline-none']"
          />
        </div>
      </template>
    </Editor>
  </div>
</template>
