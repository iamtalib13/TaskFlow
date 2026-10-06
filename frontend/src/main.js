import './index.css'

import { createApp } from 'vue'
import router from './router'
import App from './App.vue'

import { Button, setConfig, frappeRequest, resourcesPlugin, toast } from 'frappe-ui'

// Show every toast for 2 seconds unless a caller passes its own duration
const TOAST_DURATION = 2000
for (const type of ['success', 'error', 'warning', 'info', 'message']) {
  const original = toast[type]
  toast[type] = (message, data) => original(message, { duration: TOAST_DURATION, ...data })
}

let app = createApp(App)

setConfig('resourceFetcher', frappeRequest)

app.use(router)
app.use(resourcesPlugin)

app.component('Button', Button)
app.mount('#app')
