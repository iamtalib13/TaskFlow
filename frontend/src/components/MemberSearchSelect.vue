<template>
  <Combobox
    :model-value="modelValue"
    :options="options"
    size="sm"
    variant="outline"
    open-on-focus
    :placeholder="placeholder"
    empty-text="No members found"
    @update:model-value="(val) => emit('update:modelValue', val ?? '')"
  >
    <template #prefix>
      <Search class="size-3.5 text-ink-gray-4" />
    </template>
    <template #item-prefix="{ item }">
      <Avatar :image="item.image" :label="item.label" size="xs" shape="circle" />
    </template>
    <template #item-label="{ item }">
      <div class="min-w-0">
        <div class="truncate text-xs font-medium text-ink-gray-9">{{ item.label }}</div>
        <div v-if="item.description" class="truncate text-[11px] text-ink-gray-5">{{ item.description }}</div>
      </div>
    </template>
  </Combobox>
</template>

<script setup>
import { Avatar, Combobox } from 'frappe-ui'
import { Search } from 'lucide-vue-next'

// Searchable member picker. `options` come from memberOptionsFrom() so every
// picker shows the same people: members of a Taskflow Team or Taskflow Project.
defineProps({
  modelValue: { type: [String, Number], default: '' },
  options: { type: Array, default: () => [] },
  placeholder: { type: String, default: 'Search member...' },
})

const emit = defineEmits(['update:modelValue'])
</script>
