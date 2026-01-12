<script setup lang="ts">
import { RouterLink, RouterView } from 'vue-router'
</script>

<template>
  <div class="app">
    <header class="app__header">
      <h1 class="app__title">Nutrient Viewer Demo</h1>
      <nav class="app__nav">
        <RouterLink to="/" class="nav-link">Viewer</RouterLink>
        <RouterLink to="/convert" class="nav-link">Conversion</RouterLink>
      </nav>
    </header>

    <main class="app__main">
      <RouterView />
    </main>
  </div>
</template>

<style>
/* Reset and base styles */
*,
*::before,
*::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

html,
body,
#app {
  height: 100%;
  width: 100%;
}

body {
  font-family:
    -apple-system,
    BlinkMacSystemFont,
    'Segoe UI',
    Roboto,
    Oxygen,
    Ubuntu,
    Cantarell,
    sans-serif;
  font-size: 14px;
  line-height: 1.5;
  color: var(--color-text);
  background: var(--color-background);
}

:root {
  --color-background: #f5f7fa;
  --color-surface: #ffffff;
  --color-primary: #4a90d9;
  --color-primary-hover: #3a7bc8;
  --color-text: #1a1a1a;
  --color-text-secondary: #666666;
  --color-border: #e0e4e8;
  --color-error: #d32f2f;
  --color-success: #388e3c;

  --sidebar-width: 320px;
  --header-height: 56px;

  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;

  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);
  --shadow-md: 0 4px 6px rgba(0, 0, 0, 0.07);
  --shadow-lg: 0 10px 15px rgba(0, 0, 0, 0.1);

  --transition-fast: 150ms ease;
  --transition-normal: 250ms ease;
}
</style>

<style scoped>
.app {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
}

.app__header {
  display: flex;
  align-items: center;
  gap: 2rem;
  height: var(--header-height);
  padding: 0 1.5rem;
  background: var(--color-surface);
  border-bottom: 1px solid var(--color-border);
  flex-shrink: 0;
}

.app__title {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--color-text);
}

.app__nav {
  display: flex;
  gap: 0.5rem;
}

.nav-link {
  padding: 0.5rem 1rem;
  border-radius: var(--radius-md);
  text-decoration: none;
  color: var(--color-text-secondary);
  font-weight: 500;
  transition: all var(--transition-fast);
}

.nav-link:hover {
  background: var(--color-background);
  color: var(--color-text);
}

.nav-link.router-link-active {
  background: var(--color-primary);
  color: white;
}

.app__main {
  display: flex;
  flex: 1;
  min-height: 0;
}
</style>
