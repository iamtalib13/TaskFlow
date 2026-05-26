import './index.css'

import { createApp } from 'vue'
import router from './router'
import App from './App.vue'

import { Button, Badge, Card, setConfig, frappeRequest, resourcesPlugin } from 'frappe-ui'

const app = createApp(App)

setConfig('resourceFetcher', frappeRequest)

app.use(router)
app.use(resourcesPlugin)

app.component('Button', Button)
app.component('Badge', Badge)
app.component('Card', Card)

app.mount('#app')
