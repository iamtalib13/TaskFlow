<template>
  <FrappeUIProvider>
    <div class="h-screen w-screen overflow-hidden bg-surface-gray-2 antialiased font-sans text-ink-gray-9">
      <router-view />
    </div>
    <!-- frappe-ui's `toast` is a thin wrapper over vue-sonner, which only paints
         when a <Toaster /> is mounted. Without it every toast.*() call across
         the app is queued and silently dropped — including "URL Copied" on
         the task form's Share action. -->
    <Toaster position="bottom-right" rich-colors />
  </FrappeUIProvider>
</template>

<script setup>
import { FrappeUIProvider } from 'frappe-ui'
import { Toaster } from 'vue-sonner'
</script>
