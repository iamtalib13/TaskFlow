<template>
  <div class="flex flex-col flex-1 min-h-0 min-w-0 bg-surface-base border border-outline-gray-2 dark:border-gray-800/80 rounded-lg outline-none focus:outline-none focus:ring-0 ring-0 overflow-hidden">
    <!-- Optional Toolbar Slot (above the table) -->
    <div v-if="$slots.toolbar" class="shrink-0 p-3 border-b border-outline-gray-1 dark:border-gray-800 bg-surface-base">
      <slot name="toolbar" />
    </div>

    <!-- Scrollable Table Container (Horizontal & Vertical - ONLY rows scroll) -->
    <div
      ref="tableContainer"
      tabindex="-1"
      class="relative flex-1 min-h-0 overflow-auto outline-none focus:outline-none focus:ring-0 ring-0"
      @scroll="handleScroll"
    >
      <table class="w-full text-left border-collapse text-xs select-text outline-none focus:outline-none table-fixed">
        <!-- Table Header (Sticky at top) -->
        <thead ref="theadRef" class="sticky top-0 z-30 bg-surface-gray-2/95 dark:bg-gray-900/95 backdrop-blur-xs border-b border-outline-gray-2 dark:border-gray-800 text-ink-gray-6 dark:text-gray-300 font-semibold tracking-wide uppercase text-[11px] shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
          <tr>
            <!-- Select All Checkbox -->
            <th
              v-if="selectable"
              scope="col"
              :class="[
                'w-9 px-2 py-2 text-center bg-surface-gray-2 dark:bg-gray-900 border-r border-outline-gray-2/60 dark:border-gray-800',
                isCheckboxSticky ? 'sticky left-0 z-40' : '',
              ]"
            >
              <input
                type="checkbox"
                :checked="isAllSelected"
                :indeterminate.prop="isPartiallySelected"
                class="w-4 h-4 rounded border-outline-gray-3 dark:border-gray-700 text-black dark:text-white focus:ring-black cursor-pointer accent-black dark:accent-white transition"
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
                'px-3 py-2 whitespace-nowrap select-none',
                col.sticky ? 'sticky z-40 bg-surface-gray-2 dark:bg-gray-900 border-r border-outline-gray-2/70 dark:border-gray-800' : '',
                col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left',
              ]"
              :aria-sort="col.sortable ? (sortKey === col.key ? (sortOrder === 'asc' ? 'ascending' : 'descending') : 'none') : undefined"
            >
              <button
                v-if="col.sortable"
                type="button"
                class="group inline-flex max-w-full items-center gap-1 rounded text-[11px] font-medium text-ink-gray-6 transition-colors hover:text-ink-gray-9 focus:outline-none focus-visible:ring-1 focus-visible:ring-teal-600 dark:hover:text-white"
                :class="col.align === 'right' ? 'flex-row-reverse' : ''"
                :title="`Sort by ${col.label}`"
                @click.stop="handleHeaderSort(col.key)"
              >
                <span class="truncate">{{ col.label }}</span>
                <component
                  :is="sortIndicator(col.key)"
                  class="size-3 shrink-0 transition-colors"
                  :class="sortKey === col.key
                    ? 'text-teal-700 dark:text-teal-300'
                    : 'text-ink-gray-4 opacity-0 group-hover:opacity-100 dark:text-gray-500'"
                />
              </button>
              <span
                v-else
                class="text-[11px] font-medium text-ink-gray-6 dark:text-gray-300"
              >{{ col.label }}</span>
            </th>
          </tr>

        </thead>

        <!-- Column filter row. Kept in its own <tbody> rather than in <thead>,
             but pinned directly under the label row so both stay visible while
             the data scrolls.

             Gated on an explicit prop, not on "does a header-* slot exist": the
             Project and Team tables have columns called `team` and `modified`,
             the same keys as the Task table's filter slots, so slot sniffing
             gave them a phantom, empty filter row.

             Each cell is sticky on both axes when the column is. The background
             has to be on the cell itself: a sticky cell escapes the row's
             background box and would let the scrolled rows show through. -->
        <tbody
          v-if="showFilterRow"
          class="border-b border-outline-gray-1 dark:border-gray-800/80"
        >
          <tr>
            <td
              v-if="selectable"
              :style="{ top: headHeight + 'px' }"
              :class="[
                'sticky z-20 bg-surface-base w-9 px-2 py-1.5',
                isCheckboxSticky ? 'left-0' : '',
              ]"
            ></td>
            <td
              v-for="col in visibleColumns"
              :key="'filter-' + col.key"
              :style="{
                width: col.width || 'auto',
                minWidth: col.minWidth || '80px',
                maxWidth: col.width || 'none',
                top: headHeight + 'px',
              }"
              class="sticky z-20 bg-surface-base px-2 py-1.5"
            >
              <div class="w-full" @click.stop>
                <slot :name="'header-' + col.key" :col="col" />
              </div>
            </td>
          </tr>
        </tbody>

        <!-- Table Body -->
        <tbody class="divide-y divide-gray-100 dark:divide-gray-800/80 bg-surface-base">
          <!-- Loading State with frappe-ui Skeleton & LoadingIndicator -->
          <template v-if="loading">
            <tr v-for="i in 6" :key="'skeleton-' + i" class="border-b border-outline-gray-1 dark:border-gray-800/80">
              <td v-if="selectable" class="w-9 px-2 py-3 text-center">
                <Skeleton class="w-4 h-4 rounded mx-auto" />
              </td>
              <td
                v-for="(col, cIdx) in visibleColumns"
                :key="'skel-col-' + cIdx"
                class="px-3 py-3"
              >
                <!-- First column has avatar + title + subtitle style matching user snippet -->
                <div v-if="cIdx === 0" class="flex items-center gap-3">
                  <Skeleton class="size-8 rounded-full shrink-0" />
                  <div class="flex-1 space-y-1.5 min-w-0">
                    <Skeleton class="h-3.5 w-36 max-w-full rounded" />
                    <Skeleton class="h-2.5 w-20 max-w-full rounded" />
                  </div>
                </div>
                <div v-else-if="col.key === 'id' || col.key === 'sr_no'" class="w-16">
                  <Skeleton class="h-3.5 w-12 rounded" />
                </div>
                <div v-else-if="col.key === 'status' || col.key === 'priority'" class="w-20">
                  <Skeleton class="h-5 w-16 rounded-full" />
                </div>
                <div v-else-if="col.key === 'assigned_to'" class="flex items-center gap-2">
                  <Skeleton class="size-5 rounded-full shrink-0" />
                  <Skeleton class="h-3 w-20 rounded" />
                </div>
                <div v-else class="space-y-1">
                  <Skeleton class="h-3.5 w-24 max-w-full rounded" />
                </div>
              </td>
            </tr>
          </template>

          <!-- Empty State -->
          <tr v-else-if="rows.length === 0">
            <td :colspan="columnSpan" class="py-16 text-center text-gray-400 dark:text-gray-500">
              <div class="flex flex-col items-center justify-center gap-2">
                <slot name="empty">
                  <div class="w-10 h-10 rounded-full bg-surface-gray-3 dark:bg-gray-800 flex items-center justify-center text-gray-400 text-lg mb-1">
                    📂
                  </div>
                  <p class="text-sm font-medium text-ink-gray-7 dark:text-gray-300">{{ emptyText || 'No items found' }}</p>
                  <p class="text-xs text-gray-400 dark:text-gray-500">Try adjusting your filters or search query.</p>
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
                ? 'bg-blue-50/50 dark:bg-blue-900/20 hover:bg-blue-50/80 dark:hover:bg-blue-900/30'
                : isJustNowRow(row)
                  ? 'row-just-now is-just-now shadow-xs'
                  : (getRowClass(row, idx) || 'hover:bg-surface-gray-2 dark:hover:bg-gray-800/50'),
            ]"
            @click="onRowClick(row, $event)"
          >
            <!-- Row Checkbox -->
            <td
              v-if="selectable"
              :class="[
                'w-9 px-2 py-2 text-center border-r border-outline-gray-1 dark:border-gray-800 transition-colors',
                // Below the pinned filter row (z-20) so a row scrolled under the
                // filters never paints on top of them.
                isCheckboxSticky ? 'sticky left-0 z-10' : '',
                isRowSelected(row)
                  ? '!bg-blue-50/60 dark:!bg-blue-900/30'
                  : isJustNowRow(row)
                    ? '!bg-emerald-50/90 dark:!bg-emerald-900/20 group-hover:!bg-emerald-100/80 dark:group-hover:!bg-emerald-900/30'
                    : (isCheckboxSticky ? 'bg-surface-base group-hover:bg-surface-gray-2 dark:group-hover:bg-gray-800/50' : 'bg-transparent group-hover:bg-surface-gray-2 dark:group-hover:bg-gray-800/50'),
              ]"
              @click.stop
            >
              <input
                type="checkbox"
                :checked="isRowSelected(row)"
                class="w-4 h-4 rounded border-outline-gray-3 dark:border-gray-700 text-black dark:text-white focus:ring-black cursor-pointer accent-black dark:accent-white transition"
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
                'px-3 py-2 whitespace-nowrap text-ink-gray-7 dark:text-gray-200 text-xs transition-colors truncate',
                col.sticky ? 'sticky z-20 border-r border-outline-gray-1 dark:border-gray-800 font-medium' : '',
                col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left',
                isRowSelected(row)
                  ? (col.sticky ? '!bg-blue-50/60 dark:!bg-blue-900/30' : '')
                  : isJustNowRow(row)
                    ? (col.sticky ? '!bg-emerald-50/90 dark:!bg-emerald-900/20 group-hover:!bg-emerald-100/80 dark:group-hover:!bg-emerald-900/30' : '')
                    : (col.sticky ? 'bg-surface-base group-hover:bg-surface-gray-2 dark:group-hover:bg-gray-800/50' : ''),
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
      class="shrink-0 sticky bottom-0 z-30 px-4 py-2.5 bg-surface-base/95 dark:bg-gray-900/95 backdrop-blur-md border-t border-outline-gray-2 dark:border-gray-800 flex flex-wrap items-center justify-between gap-3 text-xs text-ink-gray-6 dark:text-gray-400 select-none shadow-[0_-2px_10px_rgba(0,0,0,0.04)]"
    >
      <!-- Left: Item Count & Progress Indicator -->
      <div class="flex items-center gap-3">
        <span class="text-ink-gray-6 dark:text-gray-400 font-medium">
          Showing <span class="text-ink-gray-9 dark:text-gray-100 font-bold">{{ loadedCount }}</span> of <span class="text-ink-gray-9 dark:text-gray-100 font-bold">{{ totalCount }}</span> {{ itemLabel }}
        </span>

        <!-- Sleek Mini Progress Bar -->
        <div class="hidden sm:block w-24 h-1.5 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
          <div
            class="h-full bg-black dark:bg-white rounded-full transition-all duration-300"
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
          class="inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-gray-900 dark:bg-white hover:bg-black dark:hover:bg-gray-100 text-white dark:text-gray-900 text-xs font-semibold shadow-xs hover:shadow transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
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
          class="px-2.5 py-1.5 rounded-lg border border-outline-gray-2 dark:border-gray-700 hover:bg-surface-gray-3 dark:hover:bg-gray-800 text-ink-gray-7 dark:text-gray-300 text-xs font-medium transition cursor-pointer"
          title="Load all remaining records"
          @click="$emit('load-all')"
        >
          Load all
        </button>

        <!-- All Loaded Badge -->
        <span
          v-if="!hasMore && totalCount > 0"
          class="inline-flex items-center gap-1.5 text-xs text-ink-gray-5 dark:text-gray-400 font-medium bg-surface-gray-3/90 dark:bg-gray-800 px-3 py-1 rounded-md"
        >
          <svg class="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
          All {{ totalCount }} {{ itemLabel }} loaded
        </span>
      </div>
    </div>
  </div>
</template>

<script>
import { Skeleton, LoadingIndicator } from 'frappe-ui'
import { ArrowUp, ArrowDown, ChevronsUpDown } from 'lucide-vue-next'

export default {
  name: 'CommonListView',
  components: {
    Skeleton,
    LoadingIndicator,
    ArrowUp,
    ArrowDown,
    ChevronsUpDown,
  },
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
    // Opt-in: render a filter row under the header for the columns that get a
    // `header-<key>` slot. Off by default so tables that pass no filter slots
    // don't get an empty band.
    filterRow: {
      type: Boolean,
      default: false,
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
    itemLabel: {
      type: String,
      default: 'tasks',
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
      // Height of the label row, so the filter row can pin directly beneath it.
      // The default is the measured height (py-2 + text-[11px] + 1px border) and
      // is used until the observer reports, which avoids a one-frame jump.
      headHeight: 33,
    }
  },
  mounted() {
    this.measureHeadHeight()
    if (typeof ResizeObserver !== 'undefined' && this.$refs.theadRef) {
      // Theme, font or browser zoom can change the label row's height, which
      // would otherwise leave a gap or an overlap under the pinned filter row.
      this.headResizeObserver = new ResizeObserver(this.measureHeadHeight)
      this.headResizeObserver.observe(this.$refs.theadRef)
    }
  },
  beforeDestroy() {
    if (this.headResizeObserver) {
      this.headResizeObserver.disconnect()
      this.headResizeObserver = null
    }
  },
  computed: {
    visibleColumns() {
      return this.columns.filter((col) => col.visible !== false)
    },
    isCheckboxSticky() {
      return this.stickyCheckbox && this.visibleColumns.some((col) => col.sticky)
    },
    // Whether to render the per-column filter row. Must be a computed, not a
    // method: `v-if="showFilterRow"` in the template evaluates the member
    // itself, and a method reference is a truthy function object, so the row
    // rendered on every table no matter what the prop said.
    showFilterRow() {
      return this.filterRow
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
    measureHeadHeight() {
      const h = this.$refs.theadRef && this.$refs.theadRef.offsetHeight
      if (h && h !== this.headHeight) this.headHeight = h
    },
    // lucide icon for a column's sort state: direction arrows when it is the
    // active sort, a neutral up/down pair as the hover affordance otherwise.
    sortIndicator(colKey) {
      if (this.sortKey === colKey) {
        return this.sortOrder === 'asc' ? ArrowUp : ArrowDown
      }
      return ChevronsUpDown
    },
    getRowClass(row, idx) {
      if (typeof this.rowClass === 'function') {
        return this.rowClass(row, idx)
      }
      return this.rowClass || ''
    },
    isJustNowRow(row) {
      if (!row) return false
      const rowCls = this.getRowClass(row)
      if (typeof rowCls === 'string' && rowCls.includes('just-now')) {
        return true
      }
      const p = (row.modified_pretty || '').toString().trim().toLowerCase()
      if (p === 'just now' || p === 'right now') return true
      if (row.modified) {
        try {
          const raw = String(row.modified).trim()
          const isoString = raw.includes('T') ? raw : raw.replace(' ', 'T')
          const d = new Date(isoString)
          if (!isNaN(d.getTime())) {
            const diffSec = Math.floor((Date.now() - d.getTime()) / 1000)
            if (diffSec >= 0 && diffSec < 300) return true
          }
        } catch {}
      }
      return false
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
