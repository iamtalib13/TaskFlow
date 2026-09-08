<script setup>
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
    default: 'Write description, acceptance criteria, or type / for blocks...',
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

const tags = [
  { id: 'onboarding', label: 'onboarding' },
  { id: 'billing', label: 'billing' },
  { id: 'urgent', label: 'urgent' },
  { id: 'bug', label: 'bug' },
  { id: 'feature', label: 'feature' },
]

const extensions = [
  RichTextKit.configure({
    mention: {
      items: (query) => {
        const list = props.people && props.people.length > 0 ? props.people : defaultPeople
        return list
          .map((p) => ({ id: p.name || p.email || p.id, label: p.name || p.label || p.email }))
          .filter((p) => p.label.toLowerCase().includes((query || '').toLowerCase()))
      },
    },
    tag: { items: tags },
  }),
]

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
          class="overflow-hidden rounded-xl border border-gray-200 bg-surface-base shadow-2xs focus-within:border-gray-300 transition"
        >
          <EditorBubbleMenu :items="bubbleToolbar" />
          <EditorFloatingMenu :items="toolbar" />
          <div class="border-b border-outline-gray-1 px-2 py-1.5 bg-surface-gray-1">
            <EditorFixedMenu :items="toolbar" class="flex-wrap gap-1" />
          </div>
          <EditorContent
            :class="[minHeight, 'max-h-[420px] overflow-y-auto px-5 py-4 text-ink-gray-8 prose-p-spacing']"
          />
        </div>
      </template>
    </Editor>
  </div>
</template>
