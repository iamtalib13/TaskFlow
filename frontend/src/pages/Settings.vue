<template>
  <div class="mx-auto max-w-4xl p-6">
    <h1 class="text-2xl font-bold mb-6">Team Configuration</h1>
    <div v-if="loading" class="text-center py-10">Loading...</div>
    <div v-else class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div class="flex justify-between items-center mb-6">
        <h2 class="text-lg font-semibold">Manage Team Members</h2>
        <button @click="save" class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">Save Changes</button>
      </div>
      
      <table class="w-full text-left">
        <thead>
          <tr class="border-b">
            <th class="py-3">User</th>
            <th class="py-3">Role</th>
            <th class="py-3">Enabled</th>
            <th class="py-3">Action</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(row, index) in config.team_details" :key="index" class="border-b">
            <td class="py-3">{{ row.user_name || row.user }}</td>
            <td class="py-3">
              <select v-model="row.role" class="border rounded px-2 py-1">
                <option v-for="role in config.available_roles" :key="role" :value="role">{{ role }}</option>
              </select>
            </td>
            <td class="py-3">
              <input type="checkbox" v-model="row.enabled" :true-value="1" :false-value="0">
            </td>
            <td class="py-3">
              <button @click="config.team_details.splice(index, 1)" class="text-red-500">Remove</button>
            </td>
          </tr>
        </tbody>
      </table>
      
      <div class="mt-6">
        <select v-model="newUser" class="border rounded px-3 py-2 mr-2">
          <option value="">Select User to Add</option>
          <option v-for="user in config.available_users" :key="user.name" :value="user.name">{{ user.full_name }}</option>
        </select>
        <button @click="addUser" class="bg-gray-100 px-4 py-2 rounded-lg border hover:bg-gray-200">Add Member</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'

const config = ref({})
const loading = ref(true)
const newUser = ref('')

async function load() {
  const res = await fetch('/api/method/taskflow.taskflow.api.taskflow.get_team_configuration')
  const data = await res.json()
  config.value = data.message
  loading.value = false
}

function addUser() {
  if (!newUser.value) return
  const user = config.value.available_users.find(u => u.name === newUser.value)
  config.value.team_details.push({
    user: user.name,
    user_name: user.full_name,
    role: 'Team Member',
    enabled: 1
  })
  newUser.value = ''
}

async function save() {
  loading.value = true
  await fetch('/api/method/taskflow.taskflow.api.taskflow.save_team_configuration', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Frappe-CSRF-Token': window.csrf_token },
    body: JSON.stringify({ team_details: config.value.team_details })
  })
  await load()
}

onMounted(load)
</script>
