<template>
  <FrappeUIProvider>
    <div class="h-screen w-screen overflow-hidden bg-surface-gray-2 antialiased font-sans text-ink-gray-9">
      <router-view />
    </div>
  </FrappeUIProvider>
</template>

<script setup>
import { FrappeUIProvider } from 'frappe-ui'
</script>
