<script setup>
import { ref, watch } from 'vue'
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

const props = defineProps({
  modelValue: {
    type: String,
    default: ''
  },
  placeholder: {
    type: String,
    default: 'Write something…'
  },
  editorClass: {
    type: String,
    default: ''
  },
  minHeight: {
    type: String,
    default: 'min-h-48'
  }
})

const emit = defineEmits(['update:modelValue'])

const internalContent = ref(props.modelValue || '')

watch(() => props.modelValue, (newVal) => {
  if (newVal !== internalContent.value) {
    internalContent.value = newVal || ''
  }
})

function handleChange(val) {
  if (internalContent.value !== val) {
    internalContent.value = val
    emit('update:modelValue', val)
  }
}

const people = [
  { id: 'sarah', label: 'Sarah Chen' },
  { id: 'faris', label: 'Faris Ansari' },
  { id: 'maria', label: 'Maria Garcia' },
]

const tags = [
  { id: 'onboarding', label: 'onboarding' },
  { id: 'billing', label: 'billing' },
]

const extensions = [
  RichTextKit.configure({
    mention: { items: people },
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
      :model-value="internalContent"
      @change="handleChange"
      :extensions="extensions"
      :upload-function="uploadFunction"
      :placeholder="placeholder"
    >
      <template #default>
        <div class="overflow-hidden rounded-md border border-outline-gray-2 dark:border-gray-700 bg-surface-base flex flex-col flex-1" :class="editorClass">
          <EditorBubbleMenu :items="bubbleToolbar" />
          <EditorFloatingMenu :items="toolbar" />
          <div class="border-b border-outline-gray-2 dark:border-gray-700 bg-surface-gray-2/80 dark:bg-gray-800 px-2 py-1.5 shrink-0">
            <EditorFixedMenu :items="toolbar" class="flex-wrap" />
          </div>
          <EditorContent :class="[minHeight, 'px-5 py-4 text-ink-gray-8 dark:text-gray-100 focus:outline-none flex-1 overflow-y-auto']" />
        </div>
      </template>
    </Editor>
  </div>
</template>
