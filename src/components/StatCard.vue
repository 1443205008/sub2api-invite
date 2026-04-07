<template>
  <section class="stat-card">
    <div class="stat-card__label">{{ label }}</div>
    <div class="stat-card__value">{{ value }}</div>
    <div class="stat-card__hint">{{ hint }}</div>
  </section>
</template>

<script setup lang="ts">
defineProps<{
  label: string
  value: string
  hint: string
}>()
</script>
