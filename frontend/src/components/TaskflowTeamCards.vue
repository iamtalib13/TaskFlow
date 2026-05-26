<template>
  <div class="team-cards-grid">
    <div v-for="team in teams" :key="team.name" class="team-card">
      <div class="team-card__header">
        <h3 class="team-card__title">{{ team.team_name }}</h3>
        <span class="team-card__meta">{{ team.team_code }}</span>
      </div>
      
      <div class="team-card__stats">
        <div class="stat">
          <span class="stat__label">Total Tasks</span>
          <span class="stat__value">{{ team.task_count || 0 }}</span>
        </div>
        <div class="stat">
          <span class="stat__label">Pending</span>
          <span class="stat__value text-warning">{{ team.pending_task_count || 0 }}</span>
        </div>
      </div>
      
      <div class="team-card__footer">
        <div class="team-members">
           <!-- Placeholder for avatars -->
           <div class="avatar-placeholder">{{ initials(team.team_name) }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  teams: { type: Array, default: () => [] }
})

function initials(name) {
  return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
}
</script>

<style scoped>
.team-cards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
  padding: 16px;
}
.team-card {
  padding: 16px;
  border: 1px solid var(--tf-border);
  border-radius: 12px;
  background: white;
}
.team-card__header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
.team-card__title { font-size: 16px; font-weight: 600; margin: 0; }
.team-card__stats { display: flex; gap: 20px; margin-bottom: 16px; }
.stat { display: flex; flex-direction: column; }
.stat__label { font-size: 10px; color: #6b7280; text-transform: uppercase; }
.stat__value { font-weight: 700; font-size: 18px; }
.text-warning { color: #d97706; }
.avatar-placeholder { width: 32px; height: 32px; border-radius: 50%; background: #eef2f7; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 600; }
</style>