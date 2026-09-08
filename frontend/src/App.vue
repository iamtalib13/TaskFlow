<template>
  <FrappeUIProvider>
    <div class="h-screen w-screen overflow-hidden bg-gray-50 antialiased font-sans text-gray-900">
      <router-view />
    </div>
  </FrappeUIProvider>
</template>

<script setup>
import { FrappeUIProvider } from 'frappe-ui'
</script>
