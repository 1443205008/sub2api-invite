<template>
  <section class="panel table-panel">
    <div class="panel__header">
      <h3>{{ title }}</h3>
      <span>{{ rows.length }} 条</span>
    </div>
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th v-for="column in columns" :key="column.key">{{ column.label }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(row, index) in rows" :key="index">
            <td v-for="column in columns" :key="column.key">
              {{ renderCell(row, column) }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>

<script setup lang="ts">
interface DataTableColumn {
  key: string
  label: string
  formatter?: (value: unknown, row: Record<string, unknown>) => string
}

defineProps<{
  title: string
  columns: DataTableColumn[]
  rows: Array<Record<string, unknown>>
}>()

function renderCell(
  row: Record<string, unknown>,
  column: DataTableColumn
) {
  const value = row[column.key]
  if (column.formatter) {
    return column.formatter(value, row)
  }
  return value == null ? '-' : String(value)
}
</script>
