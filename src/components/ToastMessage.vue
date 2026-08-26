<script setup>
import { useMallAppContext } from '../composables/mallContext'

const { toast } = useMallAppContext()
</script>

<template>
  <transition name="toast">
    <div v-if="toast" class="toast-message">✓ {{ toast }}</div>
  </transition>
</template>
