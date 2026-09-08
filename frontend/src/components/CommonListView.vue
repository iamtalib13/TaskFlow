<template>
  <div class="flex flex-col flex-1 min-h-0 min-w-0 bg-white border border-gray-200 rounded-lg outline-none focus:outline-none focus:ring-0 ring-0 overflow-hidden">
    <!-- Optional Toolbar Slot (above the table) -->
    <div v-if="$slots.toolbar" class="shrink-0 p-3 border-b border-gray-100 bg-white">
      <slot name="toolbar" />
    </div>

    <!-- Scrollable Table Container (Horizontal & Vertical - ONLY rows scroll) -->
    <div
      ref="tableContainer"
      tabindex="-1"
      class="relative flex-1 min-h-0 overflow-auto outline-none focus:outline-none focus:ring-0 ring-0"
      @scroll="handleScroll"
    >
      <table class="w-full text-left border-collapse text-xs select-text outline-none focus:outline-none">
        <!-- Table Header (Sticky at top) -->
        <thead class="sticky top-0 z-30 bg-gray-50/95 backdrop-blur-xs border-b border-gray-200 text-gray-600 font-semibold tracking-wide uppercase text-[11px] shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
          <tr>
            <!-- Select All Checkbox -->
            <th
              v-if="selectable"
              scope="col"
              :class="[
                'w-9 px-2 py-2 text-center bg-gray-50 border-r border-gray-200/60',
                isCheckboxSticky ? 'sticky left-0 z-40' : '',
              ]"
            >
              <input
                type="checkbox"
                :checked="isAllSelected"
                :indeterminate.prop="isPartiallySelected"
                class="w-4 h-4 rounded border-gray-300 text-black focus:ring-black cursor-pointer accent-black transition"
                @change="toggleSelectAll"
              />
            </th>

            <!-- Column Headers -->
            <th
              v-for="col in visibleColumns"
              :key="col.key"
              scope="col"
              :style="{
                width: col.width || 'auto',
                minWidth: col.minWidth || '80px',
                maxWidth: col.width || 'none',
                left: col.sticky ? col.stickyLeft || '48px' : 'auto',
              }"
              :class="[
                'px-3 py-2 whitespace-nowrap transition-colors select-none',
                col.sticky ? 'sticky z-40 bg-gray-50 border-r border-gray-200/70' : '',
                col.sortable ? 'cursor-pointer hover:text-gray-900' : '',
                col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left',
              ]"
              @click="col.sortable && handleHeaderSort(col.key)"
            >
              <div class="inline-flex items-center gap-1.5 font-semibold text-gray-600">
                <span>{{ col.label }}</span>
                <span v-if="col.sortable" class="text-gray-400 text-[10px]">
                  <template v-if="sortKey === col.key">
                    {{ sortOrder === 'asc' ? '▲' : '▼' }}
                  </template>
                  <template v-else>↕</template>
                </span>
              </div>
            </th>
          </tr>
        </thead>

        <!-- Table Body -->
        <tbody class="divide-y divide-gray-100 bg-white">
          <!-- Loading State -->
          <tr v-if="loading">
            <td :colspan="columnSpan" class="py-16 text-center text-gray-500">
              <div class="flex flex-col items-center justify-center gap-2">
                <div class="w-6 h-6 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                <span class="text-xs text-gray-500 font-medium">Loading records...</span>
              </div>
            </td>
          </tr>

          <!-- Empty State -->
          <tr v-else-if="rows.length === 0">
            <td :colspan="columnSpan" class="py-16 text-center text-gray-400">
              <div class="flex flex-col items-center justify-center gap-2">
                <slot name="empty">
                  <div class="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 text-lg mb-1">
                    📂
                  </div>
                  <p class="text-sm font-medium text-gray-700">{{ emptyText || 'No items found' }}</p>
                  <p class="text-xs text-gray-400">Try adjusting your filters or search query.</p>
                </slot>
              </div>
            </td>
          </tr>

          <!-- Data Rows -->
          <tr
            v-for="(row, idx) in rows"
            v-else
            :key="getRowKey(row, idx)"
            :class="[
              'group transition-colors duration-150 cursor-pointer',
              isRowSelected(row)
                ? 'bg-blue-50/50 hover:bg-blue-50/80'
                : (getRowClass(row, idx) || 'hover:bg-gray-50/80'),
            ]"
            @click="onRowClick(row, $event)"
          >
            <!-- Row Checkbox -->
            <td
              v-if="selectable"
              :class="[
                'w-9 px-2 py-2 text-center border-r border-gray-100 transition-colors',
                isCheckboxSticky ? 'sticky left-0 z-20 bg-white' : 'bg-transparent',
                isRowSelected(row) ? '!bg-blue-50/60' : '',
              ]"
              @click.stop
            >
              <input
                type="checkbox"
                :checked="isRowSelected(row)"
                class="w-4 h-4 rounded border-gray-300 text-black focus:ring-black cursor-pointer accent-black transition"
                @change="toggleRowSelection(row)"
              />
            </td>

            <!-- Row Cells -->
            <td
              v-for="col in visibleColumns"
              :key="col.key"
              :style="{
                width: col.width || 'auto',
                minWidth: col.minWidth || '80px',
                maxWidth: col.width || 'none',
                left: col.sticky ? col.stickyLeft || '48px' : 'auto',
              }"
              :class="[
                'px-3 py-2 whitespace-nowrap text-gray-700 text-xs',
                col.sticky ? 'sticky z-20 bg-white group-hover:bg-gray-50/90 border-r border-gray-100 font-medium' : '',
                col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left',
                isRowSelected(row) && col.sticky ? '!bg-blue-50/60' : '',
              ]"
            >
              <!-- Scoped Cell Slot -->
              <slot
                :name="'cell-' + col.key"
                :row="row"
                :value="row[col.key]"
                :col="col"
              >
                <!-- Default cell fallback -->
                <span>{{ row[col.key] ?? '—' }}</span>
              </slot>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Sticky Bottom Bar: Load More & Counter -->
    <div
      v-if="pagination"
      class="shrink-0 sticky bottom-0 z-30 px-4 py-2.5 bg-white/95 backdrop-blur-md border-t border-gray-200 flex flex-wrap items-center justify-between gap-3 text-xs text-gray-600 select-none shadow-[0_-2px_10px_rgba(0,0,0,0.04)]"
    >
      <!-- Left: Item Count & Progress Indicator -->
      <div class="flex items-center gap-3">
        <span class="text-gray-600 font-medium">
          Showing <span class="text-gray-900 font-bold">{{ loadedCount }}</span> of <span class="text-gray-900 font-bold">{{ totalCount }}</span> tasks
        </span>

        <!-- Sleek Mini Progress Bar -->
        <div class="hidden sm:block w-24 h-1.5 bg-gray-200 rounded-full overflow-hidden">
          <div
            class="h-full bg-black rounded-full transition-all duration-300"
            :style="{ width: `${progressPercent}%` }"
          />
        </div>
      </div>

      <!-- Right: Load More Controls -->
      <div class="flex items-center gap-2">
        <!-- Load More Button -->
        <button
          v-if="hasMore"
          type="button"
          :disabled="loading"
          class="inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-gray-900 hover:bg-black text-white text-xs font-semibold shadow-xs hover:shadow transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          @click="$emit('load-more')"
        >
          <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <polyline points="19 12 12 19 5 12"></polyline>
          </svg>
          <span>Load More ({{ nextBatchCount }} remaining)</span>
        </button>

        <!-- Load All Button (if more than 1 batch remaining) -->
        <button
          v-if="hasMore && remainingCount > nextBatchCount"
          type="button"
          :disabled="loading"
          class="px-2.5 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-100 text-gray-700 text-xs font-medium transition cursor-pointer"
          title="Load all remaining records"
          @click="$emit('load-all')"
        >
          Load all
        </button>

        <!-- All Loaded Badge -->
        <span
          v-if="!hasMore && totalCount > 0"
          class="inline-flex items-center gap-1.5 text-xs text-gray-500 font-medium bg-gray-100/90 px-3 py-1 rounded-md"
        >
          <svg class="w-3.5 h-3.5 text-emerald-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
          All {{ totalCount }} tasks loaded
        </span>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'CommonListView',
  props: {
    columns: {
      type: Array,
      required: true,
    },
    rows: {
      type: Array,
      default: () => [],
    },
    rowKey: {
      type: String,
      default: 'id',
    },
    selectable: {
      type: Boolean,
      default: true,
    },
    selectedRows: {
      type: Array,
      default: () => [],
    },
    loading: {
      type: Boolean,
      default: false,
    },
    emptyText: {
      type: String,
      default: 'No records found',
    },
    sortKey: {
      type: String,
      default: '',
    },
    sortOrder: {
      type: String,
      default: 'desc', // 'asc' or 'desc'
    },
    pagination: {
      type: Object,
      default: null, // { page: 1, pageSize: 20, total: 100 }
    },
    stickyCheckbox: {
      type: Boolean,
      default: false,
    },
    rowClass: {
      type: [Function, String],
      default: null,
    },
  },
  emits: [
    'update:selectedRows',
    'row-click',
    'sort-change',
    'load-more',
    'load-all',
    'page-change',
    'page-size-change',
  ],
  data() {
    return {
      pageSizes: [20, 50, 100, 500],
      isScrolledHorizontally: false,
    }
  },
  computed: {
    visibleColumns() {
      return this.columns.filter((col) => col.visible !== false)
    },
    isCheckboxSticky() {
      return this.stickyCheckbox && this.visibleColumns.some((col) => col.sticky)
    },
    columnSpan() {
      return this.visibleColumns.length + (this.selectable ? 1 : 0)
    },
    isAllSelected() {
      if (!this.rows.length) return false
      return this.rows.every((row) => this.isRowSelected(row))
    },
    isPartiallySelected() {
      if (!this.rows.length) return false
      const count = this.rows.filter((row) => this.isRowSelected(row)).length
      return count > 0 && count < this.rows.length
    },
    loadedCount() {
      if (this.pagination && this.pagination.loaded !== undefined) {
        return this.pagination.loaded
      }
      return this.rows.length
    },
    totalCount() {
      if (this.pagination && this.pagination.total !== undefined) {
        return this.pagination.total
      }
      return this.rows.length
    },
    hasMore() {
      return this.loadedCount < this.totalCount
    },
    remainingCount() {
      return Math.max(0, this.totalCount - this.loadedCount)
    },
    stepCount() {
      return (this.pagination && this.pagination.step) || 20
    },
    nextBatchCount() {
      return Math.min(this.stepCount, this.remainingCount)
    },
    progressPercent() {
      if (!this.totalCount) return 100
      return Math.min(100, Math.round((this.loadedCount / this.totalCount) * 100))
    },
    totalPages() {
      if (!this.pagination || !this.pagination.total) return 1
      return Math.max(1, Math.ceil(this.pagination.total / (this.pagination.pageSize || 20)))
    },
    startIndex() {
      if (!this.pagination || !this.pagination.total) return 0
      return (this.pagination.page - 1) * (this.pagination.pageSize || 20) + 1
    },
    endIndex() {
      if (!this.pagination || !this.pagination.total) return 0
      return Math.min(this.pagination.total, (this.pagination.page || 1) * (this.pagination.pageSize || 20))
    },
  },
  methods: {
    getRowClass(row, idx) {
      if (typeof this.rowClass === 'function') {
        return this.rowClass(row, idx)
      }
      return this.rowClass || ''
    },
    getRowKey(row, idx) {
      return row[this.rowKey] || idx
    },
    isRowSelected(row) {
      const key = this.getRowKey(row)
      return this.selectedRows.includes(key)
    },
    toggleRowSelection(row) {
      const key = this.getRowKey(row)
      let updated = [...this.selectedRows]
      if (updated.includes(key)) {
        updated = updated.filter((k) => k !== key)
      } else {
        updated.push(key)
      }
      this.$emit('update:selectedRows', updated)
    },
    toggleSelectAll() {
      if (this.isAllSelected) {
        this.$emit('update:selectedRows', [])
      } else {
        const allKeys = this.rows.map((r, i) => this.getRowKey(r, i))
        this.$emit('update:selectedRows', allKeys)
      }
    },
    handleHeaderSort(colKey) {
      let order = 'asc'
      if (this.sortKey === colKey) {
        order = this.sortOrder === 'asc' ? 'desc' : 'asc'
      }
      this.$emit('sort-change', { key: colKey, order })
    },
    onRowClick(row, event) {
      // Don't trigger row click if clicked on an input, button, or link
      if (['INPUT', 'BUTTON', 'A', 'SVG', 'PATH'].includes(event.target.tagName)) {
        return
      }
      this.$emit('row-click', row)
    },
    onPageChange(newPage) {
      if (newPage >= 1 && newPage <= this.totalPages) {
        this.$emit('page-change', newPage)
      }
    },
    onPageSizeChange(size) {
      this.$emit('page-size-change', size)
    },
    handleScroll(e) {
      this.isScrolledHorizontally = e.target.scrollLeft > 10
    },
  },
}
</script>
