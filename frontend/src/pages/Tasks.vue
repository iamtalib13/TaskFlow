<template>
  <div class="flex h-screen w-screen overflow-hidden bg-gray-50 text-gray-900 select-none">
    <!-- Left Sidebar (Frappe v16 / OmniTask Style) -->
    <aside class="w-64 flex-shrink-0 bg-white border-r border-gray-200/80 flex flex-col justify-between z-20">
      <!-- Top Brand & Nav -->
      <div class="p-3 space-y-4">
        <!-- Brand / Workspace Switcher -->
        <div class="flex items-center justify-between p-2 rounded-xl hover:bg-gray-50 cursor-pointer transition">
          <div class="flex items-center gap-3">
            <div class="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-sm shadow-xs">
              TF
            </div>
            <div>
              <h1 class="text-sm font-bold text-gray-900 tracking-tight flex items-center gap-1.5">
                Taskflow
              </h1>
              <p class="text-[11px] text-gray-400 font-medium">ERPNext Platform</p>
            </div>
          </div>
          <svg class="w-4 h-4 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        </div>

        <!-- Global Search -->
        <div
          class="flex items-center justify-between px-3 py-1.5 bg-gray-50 hover:bg-gray-100/80 border border-gray-200/60 rounded-lg cursor-pointer transition text-gray-500"
          @click="focusSearch"
        >
          <div class="flex items-center gap-2">
            <svg class="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            <span class="text-xs">Search</span>
          </div>
          <kbd class="text-[10px] font-mono px-1.5 py-0.5 bg-white border border-gray-200 rounded text-gray-400">Ctrl+K</kbd>
        </div>

        <!-- Notification -->
        <div class="flex items-center justify-between px-3 py-1.5 rounded-lg hover:bg-gray-50 cursor-pointer text-gray-600 transition text-xs font-medium">
          <div class="flex items-center gap-2.5">
            <svg class="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            <span>Notifications</span>
          </div>
          <span class="px-1.5 py-0.2 text-[10px] font-semibold bg-blue-100 text-blue-700 rounded-full">3</span>
        </div>

        <!-- Navigation Links -->
        <nav class="space-y-0.5 pt-1">
          <a
            href="javascript:void(0)"
            class="flex items-center justify-between px-3 py-2 rounded-lg bg-gray-100 text-gray-900 font-semibold text-xs transition"
          >
            <div class="flex items-center gap-2.5">
              <svg class="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" stroke-width="2"></rect>
                <polyline points="9 11 12 14 22 4" stroke-width="2"></polyline>
              </svg>
              <span>Tasks</span>
            </div>
            <span class="text-[11px] font-medium text-gray-500">{{ tasks.length }}</span>
          </a>

          <a
            href="javascript:void(0)"
            class="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-gray-50 text-gray-600 text-xs font-medium transition"
          >
            <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
            <span>Projects</span>
          </a>

          <a
            href="javascript:void(0)"
            class="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-gray-50 text-gray-600 text-xs font-medium transition"
          >
            <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10" stroke-width="2"></circle>
              <polyline points="12 6 12 12 16 14" stroke-width="2"></polyline>
            </svg>
            <span>Timesheets</span>
          </a>

          <a
            href="javascript:void(0)"
            class="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-gray-50 text-gray-600 text-xs font-medium transition"
          >
            <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span>Reports</span>
          </a>

          <a
            href="javascript:void(0)"
            class="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-gray-50 text-gray-600 text-xs font-medium transition"
          >
            <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
            <span>Roles Permissions</span>
          </a>

          <a
            href="javascript:void(0)"
            class="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-gray-50 text-gray-600 text-xs font-medium transition"
          >
            <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="3" stroke-width="2"></circle>
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" />
            </svg>
            <span>Settings</span>
          </a>
        </nav>
      </div>

      <!-- Bottom Profile Bar -->
      <div class="p-3 border-t border-gray-100">
        <div class="flex items-center gap-3 p-2 rounded-xl hover:bg-gray-50 cursor-pointer transition">
          <div class="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold text-xs shadow-2xs">
            {{ userInitial }}
          </div>
          <div class="min-w-0 flex-1">
            <h4 class="text-xs font-semibold text-gray-900 truncate">
              {{ me?.name || 'Administrator' }}
            </h4>
            <p class="text-[11px] text-gray-400 truncate">
              {{ me?.email || 'admin@example.com' }}
            </p>
          </div>
        </div>
      </div>
    </aside>

    <!-- Main Workspace -->
    <main class="flex-1 flex flex-col min-w-0 overflow-hidden bg-gray-50">
      <!-- Top Workspace Header (Breadcrumbs + Global Actions) -->
      <header class="h-14 px-6 bg-white border-b border-gray-200/80 flex items-center justify-between flex-shrink-0 z-10">
        <!-- Breadcrumb -->
        <div class="flex items-center gap-2 text-sm">
          <button type="button" class="text-gray-400 hover:text-gray-700 transition" title="Home">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
          </button>
          <span class="text-gray-300">/</span>
          <span class="font-bold text-gray-900 text-base">Tasks</span>
        </div>

        <!-- Action Buttons -->
        <div class="flex items-center gap-2 text-xs">
          <!-- View Switcher -->
          <button
            type="button"
            class="px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50 font-medium inline-flex items-center gap-1.5 shadow-2xs transition"
          >
            <span>List View</span>
            <svg class="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
            </svg>
          </button>

          <!-- Saved Filters -->
          <button
            type="button"
            class="px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50 font-medium inline-flex items-center gap-1.5 shadow-2xs transition"
          >
            <span>Saved Filters</span>
            <svg class="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
            </svg>
          </button>

          <!-- Refresh Button -->
          <button
            type="button"
            class="p-1.5 bg-white border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 hover:text-gray-900 shadow-2xs transition"
            title="Reload Tasks"
            @click="loadData"
          >
            <svg
              class="w-4 h-4"
              :class="loading ? 'animate-spin text-black' : ''"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>

          <!-- More Options Menu -->
          <button
            type="button"
            class="p-1.5 bg-white border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 shadow-2xs transition"
            title="More Options"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="1"></circle>
              <circle cx="19" cy="12" r="1"></circle>
              <circle cx="5" cy="12" r="1"></circle>
            </svg>
          </button>

          <!-- + Add Task Primary Button -->
          <button
            type="button"
            class="px-3.5 py-1.5 bg-black hover:bg-gray-800 text-white font-semibold rounded-lg shadow-xs inline-flex items-center gap-1.5 transition ml-1 cursor-pointer"
            @click="openCreateModal"
          >
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4" />
            </svg>
            <span>Add Task</span>
          </button>
        </div>
      </header>

      <!-- Main Content Area -->
      <div class="flex-1 overflow-hidden p-5 flex flex-col gap-3">
        <!-- Toolbar & Filter Bar -->
        <div class="flex flex-wrap items-center justify-between gap-3 text-xs">
          <!-- Left: Filter Search Input + Pill Indicator -->
          <div class="flex items-center gap-2.5 flex-1 min-w-[320px]">
            <div class="relative flex-1 max-w-lg">
              <input
                ref="searchInput"
                v-model="searchQuery"
                type="text"
                placeholder="Filter by ID, Title, Project or Tag (e.g. status:In Progress) ≈"
                class="w-full bg-white border border-gray-200 rounded-lg pl-3 pr-8 py-1.5 text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-black focus:border-black shadow-2xs transition"
              />
              <span class="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs select-none">
                ≈
              </span>
            </div>

            <!-- Scrollable Table Badge -->
            <div class="hidden lg:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-[11px] font-medium whitespace-nowrap shadow-2xs">
              <span class="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
              <span>Scrollable View • 12 Columns</span>
              <span class="text-indigo-400 text-[10px] font-bold">⇄</span>
            </div>
          </div>

          <!-- Right: Filter, Sort & Columns Controls -->
          <div class="flex items-center gap-2">
            <!-- Filter Toggle Button -->
            <button
              type="button"
              :class="[
                'px-2.5 py-1.5 rounded-lg border text-xs font-medium inline-flex items-center gap-1.5 shadow-2xs transition',
                hasActiveFilters
                  ? 'bg-black text-white border-black'
                  : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50',
              ]"
              @click="toggleFilterDrawer"
            >
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              <span>Filter</span>
              <span
                v-if="hasActiveFilters"
                class="hover:opacity-80 ml-0.5"
                title="Clear Filters"
                @click.stop="clearFilters"
              >
                ✕
              </span>
            </button>

            <!-- Sort Dropdown -->
            <div class="relative">
              <button
                type="button"
                class="px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50 font-medium inline-flex items-center gap-1.5 shadow-2xs transition"
                @click="showSortMenu = !showSortMenu"
              >
                <svg class="w-3.5 h-3.5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
                </svg>
                <span>{{ currentSortLabel }}</span>
                <svg class="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              </button>

              <div
                v-if="showSortMenu"
                class="absolute right-0 mt-1 w-40 bg-white border border-gray-200 rounded-xl shadow-lg py-1 z-30 text-xs"
              >
                <button
                  v-for="opt in sortOptions"
                  :key="opt.key"
                  type="button"
                  class="w-full px-3 py-1.5 text-left hover:bg-gray-50 flex items-center justify-between text-gray-700"
                  @click="applySort(opt.key)"
                >
                  <span>{{ opt.label }}</span>
                  <span v-if="sortKey === opt.key" class="text-blue-600 font-bold">✓</span>
                </button>
              </div>
            </div>

            <!-- Columns Selector -->
            <div class="relative">
              <button
                type="button"
                class="px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50 font-medium inline-flex items-center gap-1.5 shadow-2xs transition"
                @click="showColumnsMenu = !showColumnsMenu"
              >
                <svg class="w-3.5 h-3.5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2" stroke-width="2"></rect>
                  <line x1="9" y1="3" x2="9" y2="21" stroke-width="2"></line>
                  <line x1="15" y1="3" x2="15" y2="21" stroke-width="2"></line>
                </svg>
                <span>Columns</span>
              </button>

              <div
                v-if="showColumnsMenu"
                class="absolute right-0 mt-1 w-48 bg-white border border-gray-200 rounded-xl shadow-lg p-2 z-30 text-xs space-y-1"
              >
                <div class="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-2 py-1">
                  Toggle Columns
                </div>
                <label
                  v-for="col in columns"
                  :key="col.key"
                  class="flex items-center gap-2 px-2 py-1 rounded hover:bg-gray-50 cursor-pointer text-gray-700"
                >
                  <input
                    v-model="col.visible"
                    type="checkbox"
                    :disabled="col.sticky"
                    class="rounded border-gray-300 text-black focus:ring-black accent-black"
                  />
                  <span>{{ col.label }}</span>
                </label>
              </div>
            </div>
          </div>
        </div>

        <!-- Quick Filter Pills Drawer (Expandable) -->
        <div
          v-if="filterDrawerOpen"
          class="p-3 bg-white border border-gray-200/80 rounded-xl shadow-xs grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs"
        >
          <!-- Project Filter -->
          <div>
            <label class="block text-gray-500 font-medium mb-1">Project</label>
            <select
              v-model="selectedProject"
              class="w-full bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs text-gray-800 outline-none focus:ring-1 focus:ring-black"
            >
              <option value="">All Projects</option>
              <option v-for="p in projects" :key="p.name" :value="p.name">
                {{ p.display_name || p.name }}
              </option>
            </select>
          </div>

          <!-- Status Filter -->
          <div>
            <label class="block text-gray-500 font-medium mb-1">Status</label>
            <select
              v-model="selectedStatus"
              class="w-full bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs text-gray-800 outline-none focus:ring-1 focus:ring-black"
            >
              <option value="">All Statuses</option>
              <option v-for="s in statuses" :key="s" :value="s">{{ s }}</option>
            </select>
          </div>

          <!-- Priority Filter -->
          <div>
            <label class="block text-gray-500 font-medium mb-1">Priority</label>
            <select
              v-model="selectedPriority"
              class="w-full bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs text-gray-800 outline-none focus:ring-1 focus:ring-black"
            >
              <option value="">All Priorities</option>
              <option v-for="p in priorities" :key="p" :value="p">{{ p }}</option>
            </select>
          </div>

          <!-- Assignee Filter -->
          <div>
            <label class="block text-gray-500 font-medium mb-1">Assignee</label>
            <select
              v-model="selectedAssignee"
              class="w-full bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs text-gray-800 outline-none focus:ring-1 focus:ring-black"
            >
              <option value="">All Assignees</option>
              <option v-for="u in people" :key="u.email" :value="u.name">
                {{ u.name }}
              </option>
            </select>
          </div>
        </div>

        <!-- Common List View Component -->
        <CommonListView
          v-model:selectedRows="selectedRowKeys"
          :columns="columns"
          :rows="paginatedTasks"
          :loading="loading"
          :totals="true"
          :sort-key="sortKey"
          :sort-order="sortOrder"
          :pagination="paginationInfo"
          @sort-change="handleSortChange"
          @row-click="openDetailModal"
          @page-change="handlePageChange"
          @page-size-change="handlePageSizeChange"
        >
          <!-- Custom Cell: ID -->
          <template #cell-id="{ row }">
            <span
              class="font-mono font-bold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
              @click.stop="openDetailModal(row)"
            >
              {{ row.id }}
            </span>
          </template>

          <!-- Custom Cell: Title & Key Task -->
          <template #cell-title="{ row }">
            <div class="flex items-center gap-2 min-w-[280px]">
              <span
                class="font-medium text-gray-900 truncate hover:text-blue-600 transition"
                :title="row.title"
              >
                {{ row.title }}
              </span>
              <span
                v-if="row.badge"
                class="px-2 py-0.5 text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-md whitespace-nowrap"
              >
                {{ row.badge }}
              </span>
            </div>
          </template>

          <!-- Custom Cell: Project -->
          <template #cell-project="{ row }">
            <span
              :class="[
                'px-2 py-0.5 rounded-full text-xs font-medium border inline-flex items-center gap-1',
                getProjectBadgeClass(row.project),
              ]"
            >
              {{ row.project || 'General' }}
            </span>
          </template>

          <!-- Custom Cell: Status -->
          <template #cell-status="{ row }">
            <span
              :class="[
                'px-2 py-0.5 rounded-md text-xs font-medium inline-flex items-center gap-1.5 border',
                getStatusBadgeClass(row.status),
              ]"
            >
              <span class="w-1.5 h-1.5 rounded-full bg-current"></span>
              {{ row.status || 'Open' }}
            </span>
          </template>

          <!-- Custom Cell: Priority -->
          <template #cell-priority="{ row }">
            <span
              :class="[
                'px-2 py-0.5 rounded text-xs font-medium border inline-block',
                getPriorityBadgeClass(row.priority),
              ]"
            >
              {{ row.priority || 'Medium' }}
            </span>
          </template>

          <!-- Custom Cell: Assigned To -->
          <template #cell-assigned_to="{ row }">
            <div v-if="row.assigned_to" class="flex items-center gap-2">
              <span
                class="w-6 h-6 rounded-full text-white flex items-center justify-center font-bold text-[10px] shadow-2xs"
                :class="getPersonColor(row.assigned_to)"
              >
                {{ getInitials(row.assigned_to) }}
              </span>
              <span class="text-xs text-gray-800 truncate font-medium">{{ row.assigned_to }}</span>
            </div>
            <span v-else class="text-gray-400 italic">Unassigned</span>
          </template>

          <!-- Custom Cell: Reporter -->
          <template #cell-reporter="{ row }">
            <span class="text-xs text-gray-600">{{ row.reporter || '—' }}</span>
          </template>

          <!-- Custom Cell: Pending With -->
          <template #cell-pending_with="{ row }">
            <span v-if="row.pending_with" class="px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-xs">
              {{ row.pending_with }}
            </span>
            <span v-else class="text-gray-400">—</span>
          </template>

          <!-- Custom Cell: Due Date -->
          <template #cell-due_date="{ row }">
            <span class="text-xs font-mono text-gray-600">
              {{ row.due_date || '—' }}
            </span>
          </template>

          <!-- Custom Cell: Estimated Hours -->
          <template #cell-estimated_hours="{ row }">
            <span class="text-xs font-mono font-medium text-gray-700">
              {{ row.estimated_hours ? `${row.estimated_hours}h` : '—' }}
            </span>
          </template>

          <!-- Custom Cell: Logged Hours -->
          <template #cell-logged_hours="{ row }">
            <span class="text-xs font-mono font-medium text-gray-700">
              {{ row.logged_hours ? `${row.logged_hours}h` : '—' }}
            </span>
          </template>

          <!-- Custom Cell: Actions -->
          <template #cell-actions="{ row }">
            <div class="inline-flex items-center gap-2" @click.stop>
              <!-- Detail / External link icon -->
              <button
                type="button"
                class="p-1 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded transition"
                title="View Details"
                @click="openDetailModal(row)"
              >
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </button>

              <!-- Star favorite icon -->
              <button
                type="button"
                class="p-1 rounded transition"
                :class="row.starred ? 'text-amber-500' : 'text-gray-300 hover:text-amber-400'"
                title="Favorite"
                @click="toggleStar(row)"
              >
                <svg
                  class="w-3.5 h-3.5"
                  :fill="row.starred ? 'currentColor' : 'none'"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></polygon>
                </svg>
              </button>
            </div>
          </template>
        </CommonListView>
      </div>
    </main>

    <!-- Task Detail Modal (Backdrop Blur Glassmorphism) -->
    <TaskDetailModal
      v-model="detailModalOpen"
      :task="activeTask"
      :projects="projects"
      :people="people"
      :statuses="statuses"
      :priorities="priorities"
      @save="onSaveTask"
      @close="activeTask = null"
    />

    <!-- Task Create Modal (Backdrop Blur Glassmorphism) -->
    <TaskCreateModal
      v-model="createModalOpen"
      :projects="projects"
      :people="people"
      :statuses="statuses"
      :priorities="priorities"
      @create="onCreateTask"
    />
  </div>
</template>

<script>
import CommonListView from '@/components/CommonListView.vue'
import TaskDetailModal from '@/components/TaskDetailModal.vue'
import TaskCreateModal from '@/components/TaskCreateModal.vue'
import { fetchBootstrap, saveTask } from '@/data/api.js'

export default {
  name: 'TasksPage',
  components: {
    CommonListView,
    TaskDetailModal,
    TaskCreateModal,
  },
  data() {
    return {
      loading: false,
      searchQuery: '',
      selectedProject: '',
      selectedStatus: '',
      selectedPriority: '',
      selectedAssignee: '',
      filterDrawerOpen: false,
      showSortMenu: false,
      showColumnsMenu: false,
      sortKey: 'creation',
      sortOrder: 'desc',
      page: 1,
      pageSize: 20,
      selectedRowKeys: [],

      // Modal States
      detailModalOpen: false,
      createModalOpen: false,
      activeTask: null,

      // App Data
      me: null,
      projects: [],
      people: [],
      statuses: ['Open', 'In Progress', 'Review', 'Completed', 'On Hold', 'Cancelled'],
      priorities: ['Critical', 'High', 'Medium', 'Low'],
      tasks: [],

      // Column Definitions
      columns: [
        { key: 'id', label: 'ID', width: '130px', minWidth: '120px', sortable: true, visible: true },
        { key: 'title', label: 'TITLE & KEY TASK', width: '360px', minWidth: '320px', sortable: true, visible: true },
        { key: 'project', label: 'PROJECT', width: '150px', minWidth: '130px', sortable: true, visible: true },
        { key: 'status', label: 'STATUS', width: '130px', minWidth: '120px', sortable: true, visible: true },
        { key: 'priority', label: 'PRIORITY', width: '110px', minWidth: '100px', sortable: true, visible: true },
        { key: 'assigned_to', label: 'ASSIGNED TO', width: '180px', minWidth: '160px', sortable: true, visible: true },
        { key: 'reporter', label: 'REPORTER', width: '150px', minWidth: '130px', sortable: true, visible: true },
        { key: 'pending_with', label: 'PENDING WITH', width: '140px', minWidth: '130px', sortable: false, visible: true },
        { key: 'due_date', label: 'DUE DATE', width: '120px', minWidth: '110px', sortable: true, visible: true },
        { key: 'estimated_hours', label: 'EST. HRS', width: '100px', minWidth: '90px', align: 'right', sortable: true, visible: true },
        { key: 'logged_hours', label: 'LOGGED HRS', width: '100px', minWidth: '90px', align: 'right', sortable: true, visible: true },
        { key: 'actions', label: 'ACTIONS', width: '90px', minWidth: '80px', align: 'center', sortable: false, visible: true },
      ],

      sortOptions: [
        { key: 'creation', label: 'Created On' },
        { key: 'due_date', label: 'Due Date' },
        { key: 'priority', label: 'Priority' },
        { key: 'status', label: 'Status' },
        { key: 'id', label: 'ID' },
      ],
    }
  },
  computed: {
    userInitial() {
      return this.me?.name ? this.me.name.charAt(0).toUpperCase() : 'A'
    },
    hasActiveFilters() {
      return (
        Boolean(this.selectedProject) ||
        Boolean(this.selectedStatus) ||
        Boolean(this.selectedPriority) ||
        Boolean(this.selectedAssignee)
      )
    },
    currentSortLabel() {
      const match = this.sortOptions.find((o) => o.key === this.sortKey)
      return match ? match.label : 'Created On'
    },
    filteredTasks() {
      let list = [...this.tasks]

      // Search filter
      if (this.searchQuery.trim()) {
        const q = this.searchQuery.toLowerCase().trim()
        list = list.filter((t) => {
          return (
            (t.id && t.id.toLowerCase().includes(q)) ||
            (t.title && t.title.toLowerCase().includes(q)) ||
            (t.project && t.project.toLowerCase().includes(q)) ||
            (t.status && t.status.toLowerCase().includes(q)) ||
            (t.assigned_to && t.assigned_to.toLowerCase().includes(q))
          )
        })
      }

      // Project filter
      if (this.selectedProject) {
        list = list.filter((t) => t.project === this.selectedProject)
      }

      // Status filter
      if (this.selectedStatus) {
        list = list.filter((t) => t.status === this.selectedStatus)
      }

      // Priority filter
      if (this.selectedPriority) {
        list = list.filter((t) => t.priority === this.selectedPriority)
      }

      // Assignee filter
      if (this.selectedAssignee) {
        list = list.filter((t) => t.assigned_to === this.selectedAssignee)
      }

      // Sorting
      if (this.sortKey) {
        list.sort((a, b) => {
          let valA = a[this.sortKey] || ''
          let valB = b[this.sortKey] || ''
          if (typeof valA === 'string') valA = valA.toLowerCase()
          if (typeof valB === 'string') valB = valB.toLowerCase()

          if (valA < valB) return this.sortOrder === 'asc' ? -1 : 1
          if (valA > valB) return this.sortOrder === 'asc' ? 1 : -1
          return 0
        })
      }

      return list
    },
    paginatedTasks() {
      const start = (this.page - 1) * this.pageSize
      return this.filteredTasks.slice(start, start + this.pageSize)
    },
    paginationInfo() {
      return {
        page: this.page,
        pageSize: this.pageSize,
        total: this.filteredTasks.length,
      }
    },
  },
  mounted() {
    this.loadData()
  },
  methods: {
    async loadData() {
      this.loading = true
      try {
        const bootstrap = await fetchBootstrap()
        this.me = bootstrap.me
        this.projects = bootstrap.projects || []
        this.people = bootstrap.people || []
        this.statuses = bootstrap.statuses || this.statuses
        this.priorities = bootstrap.priorities || this.priorities
        this.tasks = bootstrap.tasks || []
      } catch (e) {
        console.error('Failed to load tasks', e)
      } finally {
        this.loading = false
      }
    },
    focusSearch() {
      this.$refs.searchInput?.focus()
    },
    toggleFilterDrawer() {
      this.filterDrawerOpen = !this.filterDrawerOpen
    },
    clearFilters() {
      this.selectedProject = ''
      this.selectedStatus = ''
      this.selectedPriority = ''
      this.selectedAssignee = ''
      this.searchQuery = ''
      this.page = 1
    },
    applySort(key) {
      if (this.sortKey === key) {
        this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc'
      } else {
        this.sortKey = key
        this.sortOrder = 'desc'
      }
      this.showSortMenu = false
    },
    handleSortChange({ key, order }) {
      this.sortKey = key
      this.sortOrder = order
    },
    handlePageChange(newPage) {
      this.page = newPage
    },
    handlePageSizeChange(size) {
      this.pageSize = size
      this.page = 1
    },
    openDetailModal(row) {
      this.activeTask = row
      this.detailModalOpen = true
    },
    openCreateModal() {
      this.createModalOpen = true
    },
    toggleStar(row) {
      row.starred = !row.starred
    },
    async onSaveTask(updatedTask) {
      const idx = this.tasks.findIndex((t) => t.id === updatedTask.id)
      if (idx !== -1) {
        this.tasks.splice(idx, 1, updatedTask)
      }
      await saveTask(updatedTask)
    },
    async onCreateTask(newFormData) {
      const newId = `TASK-${Math.floor(100000 + Math.random() * 900000)}`
      const newTask = {
        id: newId,
        title: newFormData.title,
        project: newFormData.project || 'General',
        status: newFormData.status || 'Open',
        priority: newFormData.priority || 'Medium',
        assigned_to: newFormData.assigned_to || '',
        reporter: this.me?.name || 'Administrator',
        due_date: newFormData.due_date || '',
        description: newFormData.description || '',
        estimated_hours: 8,
        logged_hours: 0,
        starred: false,
        comments: [],
      }
      this.tasks.unshift(newTask)
      await saveTask(newTask)
    },
    getInitials(name) {
      if (!name) return '?'
      const parts = name.trim().split(' ')
      if (parts.length >= 2) {
        return (parts[0][0] + parts[1][0]).toUpperCase()
      }
      return name.substring(0, 2).toUpperCase()
    },
    getPersonColor(name) {
      const p = this.people.find((item) => item.name === name)
      return p?.color || 'bg-blue-500'
    },
    getProjectBadgeClass(projectName) {
      const p = this.projects.find((item) => item.name === projectName)
      return p?.color || 'bg-blue-50 text-blue-700 border-blue-200'
    },
    getStatusBadgeClass(status) {
      switch (status) {
        case 'In Progress':
          return 'bg-blue-50 text-blue-700 border-blue-200/70'
        case 'Review':
          return 'bg-purple-50 text-purple-700 border-purple-200/70'
        case 'Completed':
          return 'bg-emerald-50 text-emerald-700 border-emerald-200/70'
        case 'On Hold':
          return 'bg-amber-50 text-amber-700 border-amber-200/70'
        case 'Cancelled':
          return 'bg-rose-50 text-rose-700 border-rose-200/70'
        default:
          return 'bg-gray-100 text-gray-700 border-gray-200'
      }
    },
    getPriorityBadgeClass(priority) {
      switch (priority) {
        case 'Critical':
          return 'bg-rose-50 text-rose-700 font-semibold border-rose-200'
        case 'High':
          return 'bg-orange-50 text-orange-700 font-medium border-orange-200'
        case 'Medium':
          return 'bg-yellow-50 text-yellow-800 border-yellow-200'
        default:
          return 'bg-gray-100 text-gray-600 border-gray-200'
      }
    },
  },
}
</script>
