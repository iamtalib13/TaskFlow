(function () {
	const METHOD_BASE = "/api/method/taskflow.taskflow.api.portal";
	const STATUS_COLUMNS = [
		"Open",
		"In Progress",
		"Review",
		"On Hold",
		"Completed",
		"Cancelled",
		"Overdue",
	];
	const TASK_VIEWS = ["list", "kanban", "dashboard", "timeline", "files", "settings"];
	const NAV_MODES = ["dashboard", "my-tasks", "calendar", "reports", "team", "settings"];
	const NAV_PLACEHOLDER_MODES = ["reports", "settings"];
	const LIST_ROW_HEIGHT = 48;
	const LIST_BUFFER_ROWS = 8;
	const LIST_COLUMN_COUNT = 12;
	const LIST_COLUMNS = [
		{ key: null, label: "Sr No.", sortable: false },
		{ key: "task_title", label: "Task" },
		{ key: "project_title", label: "Project" },
		{ key: "assigned_to_name", label: "Assignee" },
		{ key: "status", label: "Status" },
		{ key: "start_date", label: "Start Date" },
		{ key: "due_date", label: "Due Date" },
		{ key: "completed_date", label: "Completed On" },
		{ key: "age", label: "Age" },
		{ key: "priority", label: "Priority" },
		{ key: "modified", label: "Last Modified" },
		{ key: "task_type", label: "Type" },
	];

	const state = {
		bootstrap: null,
		selectedProject: null,
		projectWorkspace: null,
		navMode: "dashboard",
		taskView: normalizeTaskView(window.localStorage.getItem("taskflow_task_view")),
		taskQuery: "",
		projectQuery: "",
		myTasksProject: "all",
		myTasksTeam: "all",
		selectedTeam: "all",
		selectedMember: null,
		projectModalMode: "create",
		taskModalMode: "create",
		projectRequestId: 0,
		draggedTaskName: null,
		suppressTaskClick: false,
		currentChecklist: [],
		autoSaveTimer: null,
		listTable: null,
		quickTaskAssignees: [],
		calendarDate: new Date(),
		calendarProject: "",
		calendarMember: "",
	};

	const refs = {};

	document.addEventListener("DOMContentLoaded", init);

	async function init() {
		cacheDom();
		applyInitialUrlState();
		initTaskDatepickers();
		bindEvents();
		await loadBootstrap(state.selectedProject, { updateUrl: false });
		await loadStateFromUrl({ updateUrl: false });
	}

	function applyInitialUrlState() {
		const params = new URLSearchParams(window.location.search);
		const mode = normalizeNavMode(params.get("mode"));
		const project = params.get("project");
		const team = params.get("team");
		const member = params.get("member");
		const calendarProject = params.get("calendar_project");
		const calendarMember = params.get("calendar_member");
		const view = params.get("view");

		if (mode) state.navMode = mode;
		if (project) state.selectedProject = project;
		state.selectedTeam = team || "all";
		state.selectedMember = member || null;
		state.calendarProject = calendarProject || "";
		state.calendarMember = calendarMember || "";
		if (view) state.taskView = normalizeTaskView(view);
		syncTaskTabs();
	}

	function initTaskDatepickers() {
		if (!window.flatpickr) return;

		const selectors = [
			'form[data-task-form-quick] input[name="start_date"]',
			'form[data-task-form-quick] input[name="due_date"]',
			'form[data-task-form] input[name="start_date"]',
			'form[data-task-form] input[name="due_date"]',
			'form[data-task-form] input[name="completed_date"]',
			'form[data-project-form] input[name="start_date"]',
			'form[data-project-form] input[name="end_date"]',
		];

		document.querySelectorAll(selectors.join(",")).forEach((input) => {
			if (input._flatpickr) input._flatpickr.destroy();

			const instance = window.flatpickr(input, {
				dateFormat: "Y-m-d",
				altInput: true,
				altFormat: "d-m-Y",
				altInputClass: input.className,
				allowInput: false,
				clickOpens: true,
				disableMobile: true,
				defaultDate: input.value || null,
				onChange: () => input.dispatchEvent(new Event("change", { bubbles: true })),
			});

			if (instance.altInput) {
				instance.altInput.placeholder = "DD-MM-YYYY";
				instance.altInput.inputMode = "numeric";
			}
		});
	}

	function syncTaskDatepickers(form) {
		if (!form?.elements) return;

		["start_date", "due_date", "completed_date"].forEach((fieldname) => {
			const input = form.elements[fieldname];
			if (!input?._flatpickr) return;

			if (input.value) {
				input._flatpickr.setDate(input.value, false, "Y-m-d");
			} else {
				input._flatpickr.clear();
			}

			if (input._flatpickr.altInput) {
				input._flatpickr.altInput.placeholder = "DD-MM-YYYY";
			}
		});
	}

	function syncProjectDatepickers(form) {
		if (!form?.elements) return;

		["start_date", "end_date"].forEach((fieldname) => {
			const input = form.elements[fieldname];
			if (!input?._flatpickr) return;

			if (input.value) {
				input._flatpickr.setDate(input.value, false, "Y-m-d");
			} else {
				input._flatpickr.clear();
			}

			if (input._flatpickr.altInput) {
				input._flatpickr.altInput.placeholder = "DD-MM-YYYY";
			}
		});
	}

	function updateUrlState(options = {}) {
		const params = new URLSearchParams();
		params.set("mode", state.navMode);
		if (state.navMode === "dashboard" && state.selectedProject)
			params.set("project", state.selectedProject);
		if (state.selectedTeam && state.selectedTeam !== "all")
			params.set("team", state.selectedTeam);
		if (state.navMode === "my-tasks" && state.selectedMember)
			params.set("member", state.selectedMember);
		if (state.navMode === "calendar") {
			if (state.calendarProject) params.set("calendar_project", state.calendarProject);
			if (state.calendarMember) params.set("calendar_member", state.calendarMember);
		}
		if (state.taskView) params.set("view", state.taskView);
		if (state.selectedStatuses && state.selectedStatuses.length)
			params.set("statuses", state.selectedStatuses.join(","));
		if (state.selectedAssignees && state.selectedAssignees.length)
			params.set("assignees", state.selectedAssignees.join(","));
		if (state.activeTaskName) params.set("task", state.activeTaskName);

		const query = params.toString();
		const basePath = window.location.pathname.replace(/^\/+/, "/");
		const newUrl = `${basePath}${query ? `?${query}` : ""}`;
		const currentUrl = `${window.location.pathname}${window.location.search}`;
		const historyState = getHistoryState();
		if (currentUrl === newUrl) {
			window.history.replaceState(historyState, "", newUrl);
			return;
		}
		const method = options.replace ? "replaceState" : "pushState";
		window.history[method](historyState, "", newUrl);
	}

	async function loadStateFromUrl(options = {}) {
		const params = new URLSearchParams(window.location.search);
		const urlMode = normalizeNavMode(params.get("mode"));
		// Default to "my-tasks" when no explicit mode is in the URL
		const mode = urlMode || "my-tasks";
		const project = params.get("project");
		const team = params.get("team");
		const member = params.get("member");
		const calendarProject = params.get("calendar_project");
		const calendarMember = params.get("calendar_member");
		const view = params.get("view");
		const statuses = params.get("statuses");
		const assignees = params.get("assignees");
		const taskId = params.get("task");

		if (view) state.taskView = normalizeTaskView(view);
		state.selectedTeam = team || "all";
		state.selectedMember = member || null;
		state.calendarProject = calendarProject || "";
		state.calendarMember = calendarMember || "";
		state.selectedStatuses = statuses
			? statuses.split(",")
			: JSON.parse(localStorage.getItem("taskflow_filter_statuses") || "[]");
		state.selectedAssignees = assignees
			? assignees.split(",")
			: JSON.parse(localStorage.getItem("taskflow_filter_assignees") || "[]");

		if (refs.teamSwitcher) refs.teamSwitcher.value = state.selectedTeam;
		syncTaskTabs();

		if (mode === "dashboard") {
			if (project && project !== state.selectedProject) {
				await selectProject(project, options);
			} else {
				setNavMode("dashboard", options);
			}

			if (taskId) {
				const task = findTask(taskId);
				if (task) openTaskModal(task);
			}
			return;
		}

		setNavMode(mode, options);
		if (mode === "team") renderTeamView();
	}

	function setTaskView(view, options = {}) {
		state.taskView = normalizeTaskView(view);
		// Force URL update to persist view state
		updateUrlState({ replace: options.replace });
		window.localStorage.setItem("taskflow_task_view", state.taskView);
		syncTaskTabs();
		refreshView();
	}

	function syncTaskTabs() {
		if (refs.viewToggle) {
			refs.viewToggle.querySelectorAll(".taskflow-tab").forEach((tab) => {
				const isActive = tab.dataset.view === state.taskView;
				tab.classList.toggle("active", isActive);
				tab.setAttribute("aria-selected", isActive ? "true" : "false");
			});
		}
	}

	function cacheDom() {
		refs.container = document.querySelector(".taskflow-container");
		refs.root = document.querySelector("[data-taskflow-root]");
		refs.projectList = document.querySelector("[data-project-list]");
		refs.stats = document.querySelector("[data-stats]");
		refs.board = document.querySelector("[data-task-board]");
		refs.dashboardView = document.querySelector("[data-dashboard-view]");
		refs.listView = document.querySelector("[data-list-view]");
		refs.timelineView = document.querySelector("[data-timeline-view]");
		refs.filesView = document.querySelector("[data-files-view]");
		refs.settingsView = document.querySelector("[data-settings-view]");
		refs.projectTitle = document.querySelector("[data-project-title]");
		refs.projectKpis = document.querySelector("[data-project-kpis]");
		refs.viewToggle = document.querySelector("[data-task-view-toggle]");
		refs.taskSearch = document.querySelector(".taskflow-search-bar input");
		refs.newProjectButtons = document.querySelectorAll("[data-new-project]");
		refs.newTaskButton = document.querySelector("[data-new-task]");
		refs.projectModal = document.querySelector("[data-project-modal]");
		refs.taskModal = document.querySelector("[data-task-modal]");
		refs.taskModalQuick = document.querySelector("[data-task-modal-quick]");
		refs.projectForm = document.querySelector("form[data-project-form]");
		refs.taskForm = document.querySelector("form[data-task-form]");
		refs.taskFormQuick = document.querySelector("form[data-task-form-quick]");
		refs.projectFormTitle = document.querySelector("[data-project-form-title]");
		refs.taskFormTitle = document.querySelector("[data-task-form-title]");
		refs.loading = document.querySelector("[data-taskflow-loading]");
		refs.sidebarToggle = document.querySelector(".taskflow-sidebar-toggle");
		refs.sidebarNav = document.querySelector(".taskflow-sidebar-nav");
		refs.sidebarProjects = document.querySelector(".taskflow-sidebar-projects");
		refs.navItems = document.querySelectorAll("[data-nav]");
		refs.teamSwitcher = document.querySelector("[data-team-switcher]");
		refs.projectSearch = document.querySelector("[data-project-search]");
		refs.myTasksCount = document.querySelector("[data-my-tasks-count]");
		refs.myTasksTeamSelector = document.querySelector("[data-my-tasks-team-selector]");
		refs.myTasksProjectSelector = document.querySelector("[data-my-tasks-project-selector]");
		refs.projectCount = document.querySelector("[data-project-count]");
		refs.userName = document.querySelector("[data-user-name]");
		refs.userImage = document.querySelector("[data-user-image]");
		refs.userAvatarContainer = document.querySelector("[data-user-avatar-container]");
		refs.memberSelectorWrapper = document.querySelector("[data-member-selector-wrapper]");
		refs.memberSelector = document.querySelector("[data-member-selector]");
		refs.calendarTitle = document.querySelector("[data-calendar-title]");
		refs.calendarFilters = document.querySelector("[data-calendar-filters]");
		refs.calendarTeamFilter = document.querySelector("[data-calendar-team-filter]");
		refs.calendarProjectFilter = document.querySelector("[data-calendar-project-filter]");
		refs.calendarMemberFilter = document.querySelector("[data-calendar-member-filter]");

		// Initialize Quill for description
		const editorEl =
			document.getElementById("taskflow-desc-editor") ||
			document.getElementById("quick-task-desc-editor");
		if (editorEl && window.Quill) {
			window._taskDescEditor = new Quill(editorEl, {
				theme: "snow",
				placeholder: "Add a more detailed description...",
				modules: {
					toolbar: [
						["bold", "italic", "underline", "strike"],
						[{ list: "ordered" }, { list: "bullet" }],
						[{ header: [1, 2, 3, false] }],
						["clean"],
					],
				},
			});
			// Keep hidden input in sync on every change
			window._taskDescEditor.on("text-change", () => {
				const form = refs.taskForm || refs.taskFormQuick;
				const hiddenDesc = form && form.querySelector('input[name="description"]');
				if (hiddenDesc) hiddenDesc.value = window._taskDescEditor.root.innerHTML;
				if (typeof triggerAutoSave === "function") triggerAutoSave();
			});
		}
	}

	function bindEvents() {
		refs.newProjectButtons.forEach((button) => {
			button.addEventListener("click", () => openProjectModal());
		});

		// ── User Profile Dropdown ──────────────────────────────────────
		const userProfileWrapper = document.getElementById("userProfileDropdownWrapper");
		const userDropdown = document.getElementById("userProfileDropdown");
		const logoutBtn = document.getElementById("userLogoutBtn");

		if (userProfileWrapper && userDropdown) {
			// Toggle dropdown on profile click
			userProfileWrapper.addEventListener("click", (e) => {
				e.stopPropagation();
				const isOpen = userDropdown.classList.contains("open");
				userDropdown.classList.toggle("open", !isOpen);
				userDropdown.setAttribute("aria-hidden", isOpen ? "true" : "false");
			});

			// Close on outside click
			document.addEventListener("click", (e) => {
				if (!userProfileWrapper.contains(e.target)) {
					userDropdown.classList.remove("open");
					userDropdown.setAttribute("aria-hidden", "true");
				}
			});
		}

		if (logoutBtn) {
			logoutBtn.addEventListener("click", async () => {
				try {
					await fetch("/api/method/logout", {
						method: "POST",
						headers: { "X-Frappe-CSRF-Token": frappe?.csrf_token || "" },
					});
				} catch (_) {
					/* ignore */
				}
				window.location.href = "/login";
			});
		}
		// ──────────────────────────────────────────────────────────────

		const clearDraggingMode = () => {
			if (!document.body.classList.contains("taskflow-dragging")) return;
			document.body.classList.remove("taskflow-dragging");
			state.draggedTaskName = null;
			state.draggedStatus = null;
			refs.board?.querySelectorAll(".taskflow-column-drop-target").forEach((column) => {
				column.classList.remove("taskflow-column-drop-target");
				delete column.dataset.dragCounter;
			});
			refs.board?.querySelectorAll(".taskflow-card-drop-target").forEach((card) => {
				card.classList.remove("taskflow-card-drop-target");
			});
		};

		// Project View Tab Navigation (Dedicated handler)
		const tabsContainer = document.querySelector(".taskflow-tabs");
		if (tabsContainer) {
			tabsContainer.addEventListener("click", (e) => {
				const tab = e.target.closest("[data-view]");
				if (tab) {
					console.log("Tab triggered:", tab.dataset.view);
					setTaskView(tab.dataset.view);
				}
			});
		}

		// Keep Sidebar/Nav Item Delegation
		document.addEventListener("click", (e) => {
			const navItem = e.target.closest("[data-nav]");
			if (navItem) {
				const mode = normalizeNavMode(navItem.dataset.nav);
				if (mode) {
					setNavMode(mode);
					if (mode === "team") {
						state.teamView = "cards";
						renderTeamView();
					}
					closeSidebars();
				}
			}

			// Actions
			const newTaskButton = e.target.closest("[data-new-task]");
			if (newTaskButton) {
				if (
					newTaskButton.disabled ||
					newTaskButton.getAttribute("aria-disabled") === "true"
				)
					return;
				openTaskModal();
			}

			const postCommentButton = e.target.closest("[data-post-comment]");
			if (postCommentButton) {
				postComment();
			}

			// Toggle Sections
			const sectionHeader = e.target.closest("[data-toggle-section]");
			if (sectionHeader) {
				const section = sectionHeader.closest(".taskflow-adv-section");
				if (section) section.classList.toggle("collapsed");
			}

			// Checklist Actions
			if (e.target.closest("[data-add-checklist-item]")) {
				addChecklistItem();
			}

			const removeBtn = e.target.closest("[data-remove-checklist-item]");
			if (removeBtn) {
				const index = Number.parseInt(removeBtn.dataset.removeChecklistItem, 10);
				if (!Number.isNaN(index)) {
					removeChecklistItem(index);
				}
			}
		});

		document.addEventListener("change", (e) => {
			const toggle = e.target;
			if (
				toggle instanceof HTMLInputElement &&
				toggle.hasAttribute("data-toggle-checklist-item")
			) {
				const index = Number.parseInt(toggle.dataset.toggleChecklistItem, 10);
				if (!Number.isNaN(index)) {
					toggleChecklistItem(index, toggle.checked);
				}
				return;
			}

			if (
				toggle instanceof HTMLInputElement &&
				toggle.hasAttribute("data-edit-checklist-item")
			) {
				const index = Number.parseInt(toggle.dataset.editChecklistItem, 10);
				if (!Number.isNaN(index)) {
					updateChecklistItem(index, toggle.value, { persist: true });
				}
			}
		});

		document.addEventListener("input", (e) => {
			const editInput = e.target;
			if (
				editInput instanceof HTMLInputElement &&
				editInput.hasAttribute("data-edit-checklist-item")
			) {
				const index = Number.parseInt(editInput.dataset.editChecklistItem, 10);
				if (!Number.isNaN(index)) {
					updateChecklistItem(index, editInput.value);
				}
			}
		});

		// Auto-expand textarea and Enter-to-send
		const commentTextarea = refs.taskForm?.elements.new_comment;
		if (commentTextarea) {
			commentTextarea.addEventListener("input", () => {
				commentTextarea.style.height = "auto";
				commentTextarea.style.height = commentTextarea.scrollHeight + "px";
			});
			commentTextarea.addEventListener("keydown", (e) => {
				if (e.key === "Enter" && !e.shiftKey) {
					e.preventDefault();
					postComment();
				}
			});
		}

		const checklistInput = document.querySelector("[data-new-checklist-item]");
		if (checklistInput) {
			checklistInput.addEventListener("keydown", (e) => {
				if (e.key === "Enter") {
					e.preventDefault();
					addChecklistItem();
				}
			});
		}

		// Safety net: if a drag operation is interrupted (drop outside window, ESC, etc.),
		// ensure we don't leave the UI in a non-clickable state.
		window.addEventListener("drop", clearDraggingMode, true);
		window.addEventListener("dragend", clearDraggingMode, true);
		window.addEventListener("blur", clearDraggingMode, true);
		document.addEventListener("keydown", (event) => {
			if (event.key === "Escape") clearDraggingMode();
		});
		document.addEventListener("visibilitychange", () => {
			if (document.visibilityState === "hidden") clearDraggingMode();
		});

		refs.taskSearch?.addEventListener("input", (event) => {
			state.taskQuery = event.target.value || "";
			refreshView();
		});

		if (refs.memberSelector) {
			refs.memberSelector.addEventListener("change", (e) => {
				state.selectedMember = e.target.value;
				updateUrlState();
				refreshView();
			});
		}

		if (refs.myTasksTeamSelector) {
			refs.myTasksTeamSelector.addEventListener("change", (e) => {
				state.myTasksTeam = e.target.value;
				state.myTasksProject = "all";
				state.selectedMember = null;
				renderProjectWorkspace();
			});
		}

		if (refs.myTasksProjectSelector) {
			refs.myTasksProjectSelector.addEventListener("change", (e) => {
				state.myTasksProject = e.target.value;
				refreshView();
			});
		}

		if (refs.calendarTeamFilter) {
			refs.calendarTeamFilter.addEventListener("change", (e) => {
				state.selectedTeam = e.target.value || "all";
				state.calendarProject = "";
				state.calendarMember = "";
				if (refs.teamSwitcher) refs.teamSwitcher.value = state.selectedTeam;
				renderProjectList();
				updateUrlState();
				refreshView();
			});
		}

		if (refs.calendarProjectFilter) {
			refs.calendarProjectFilter.addEventListener("change", (e) => {
				state.calendarProject = e.target.value || "";
				state.calendarMember = "";
				updateUrlState();
				refreshView();
			});
		}

		if (refs.calendarMemberFilter) {
			refs.calendarMemberFilter.addEventListener("change", (e) => {
				state.calendarMember = e.target.value || "";
				updateUrlState();
				refreshView();
			});
		}

		if (refs.teamSwitcher) {
			refs.teamSwitcher.addEventListener("change", async (e) => {
				state.selectedTeam = e.target.value;
				state.selectedMember = null; // Reset selected member when team changes
				state.calendarProject = "";
				state.calendarMember = "";
				renderProjectList();
				if (state.navMode === "dashboard" && state.selectedProject) {
					const projects = getVisibleProjects({ ignoreQuery: true });
					const selectedProjectVisible = projects.some(
						(project) => project.name === state.selectedProject,
					);
					if (!selectedProjectVisible) {
						const nextProject = projects[0];
						if (nextProject) {
							await selectProject(nextProject.name);
							return;
						}
						state.selectedProject = null;
						state.projectWorkspace = null;
						renderProjectWorkspace();
						updateUrlState();
						refreshView();
						return;
					}
				}

				if (state.navMode === "team") {
					renderTeamView();
				} else if (state.navMode === "my-tasks") {
					renderProjectWorkspace();
				} else {
					refreshView();
				}
				updateUrlState();
			});
		}
		if (refs.projectSearch) {
			refs.projectSearch.addEventListener("input", (e) => {
				state.projectQuery = e.target.value;
				renderProjectList();
			});
		}

		document.querySelector("[data-team-view-toggle]")?.addEventListener("click", (e) => {
			const btn = e.target.closest("[data-view]");
			if (!btn) return;
			state.teamView = btn.dataset.view;
			renderTeamView();
		});

		if (refs.projectForm) {
			refs.projectForm.addEventListener("submit", submitProjectForm);
		}
		if (refs.taskForm) {
			refs.taskForm.addEventListener("submit", submitTaskForm);
		}
		if (refs.taskFormQuick) {
			refs.taskFormQuick.addEventListener("submit", submitTaskForm);

			refs.taskFormQuick.querySelector("[name='status']")?.addEventListener("change", (e) => {
				const label = document.getElementById("quickCompletedDateLabel");
				if (label) label.style.display = e.target.value === "Completed" ? "" : "none";
			});
		}

		document.getElementById("quickTaskAssignedToSelect")?.addEventListener("change", (e) => {
			const email = e.target.value;
			if (email) {
				if (!state.quickTaskAssignees) state.quickTaskAssignees = [];
				if (!state.quickTaskAssignees.includes(email)) {
					state.quickTaskAssignees.push(email);
				}
				renderQuickAssigneeWidget();
			}
		});

		// Robust click handler for task save button
		const taskSaveBtn = refs.taskForm?.querySelector('button[type="submit"]');
		if (taskSaveBtn && refs.taskForm) {
			taskSaveBtn.addEventListener("click", (e) => {
				if (refs.taskForm.checkValidity && !refs.taskForm.checkValidity()) {
					// Let the browser show validation errors
					return;
				}
				e.preventDefault();
				submitTaskForm({
					preventDefault: () => {},
					currentTarget: refs.taskForm,
				});
			});
		}

		// Auto-save listeners for task form
		if (refs.taskForm) {
			refs.taskForm.querySelectorAll("input, select, textarea").forEach((el) => {
				if (el.name === "new_comment") return; // Skip comment input
				if (
					el.hasAttribute("data-new-checklist-item") ||
					el.hasAttribute("data-toggle-checklist-item") ||
					el.hasAttribute("data-edit-checklist-item") ||
					el.closest("[data-checklist-wrapper]")
				)
					return;

				const eventType =
					(el.tagName === "INPUT" && (el.type === "text" || el.type === "number")) ||
					el.tagName === "TEXTAREA"
						? "input"
						: "change";

				el.addEventListener(eventType, () => {
					triggerAutoSave();
				});
			});
		}

		refs.projectForm.elements.team.addEventListener("change", (event) => {
			const projectLead = refs.projectForm.elements.project_lead;
			projectLead.innerHTML = buildMemberOptions(event.target.value, "");
		});
		refs.projectForm.elements.project_name.addEventListener("input", (event) => {
			if (state.projectModalMode === "create") {
				const name = event.target.value;
				const code = name
					.toLowerCase()
					.replace(/[^a-z0-9]+/g, "-")
					.replace(/^-+|-+$/g, "");
				// refs.projectForm.elements.project_code.value = code;
			}
		});
		document.querySelectorAll("[data-close-modal]").forEach((button) => {
			button.addEventListener("click", () => closeModal(button.dataset.closeModal));
		});

		// Filter Button Handler
		// Filter Button Handler
		document.querySelector("[data-filter-button]")?.addEventListener("click", (e) => {
			e.stopPropagation();
			const sidebar = document.querySelector("[data-filter-sidebar]");
			sidebar.classList.toggle("open");

			if (sidebar.classList.contains("open")) {
				const assigneeContainer = document.querySelector("[data-assignee-checkboxes]");
				const assignees = [
					...new Set(state.currentTasks.map((t) => t.assigned_to_name || "Unassigned")),
				];
				const savedAssignees = JSON.parse(
					localStorage.getItem("taskflow_filter_assignees") || "[]",
				);
				const savedStatuses = JSON.parse(
					localStorage.getItem("taskflow_filter_statuses") || "[]",
				);

				assigneeContainer.innerHTML = assignees
					.map(
						(name) =>
							`<label><input type="checkbox" value="${escapeHtml(name)}" ${savedAssignees.includes(name) ? "checked" : ""} /> ${escapeHtml(name)}</label>`,
					)
					.join("");

				document.querySelectorAll("[data-status-checkboxes] input").forEach((input) => {
					input.checked = savedStatuses.includes(input.value);
				});
			}
		});

		// Close filter on outside click
		document.addEventListener("click", (e) => {
			const sidebar = document.querySelector("[data-filter-sidebar]");
			const filterBtn = document.querySelector("[data-filter-button]");
			if (
				sidebar &&
				sidebar.classList.contains("open") &&
				!sidebar.contains(e.target) &&
				e.target !== filterBtn
			) {
				sidebar.classList.remove("open");
			}
		});
		document.querySelector("[data-apply-filter]")?.addEventListener("click", () => {
			const statusInputs = document.querySelectorAll(
				"[data-status-checkboxes] input:checked",
			);
			const assigneeInputs = document.querySelectorAll(
				"[data-assignee-checkboxes] input:checked",
			);

			state.selectedStatuses = Array.from(statusInputs).map((input) => input.value);
			state.selectedAssignees = Array.from(assigneeInputs).map((input) => input.value);

			localStorage.setItem(
				"taskflow_filter_statuses",
				JSON.stringify(state.selectedStatuses),
			);
			localStorage.setItem(
				"taskflow_filter_assignees",
				JSON.stringify(state.selectedAssignees),
			);

			refreshView();
			document.querySelector("[data-filter-sidebar]")?.classList.remove("open");
		});

		document.querySelector("[data-clear-filter]")?.addEventListener("click", () => {
			state.selectedStatuses = [];
			state.selectedAssignees = [];

			localStorage.removeItem("taskflow_filter_statuses");
			localStorage.removeItem("taskflow_filter_assignees");

			updateUrlState();
			refreshView();

			// Close sidebar
			document.querySelector("[data-filter-sidebar]")?.classList.remove("open");
		});

		if (refs.sidebarToggle && refs.container) {
			refs.sidebarToggle.addEventListener("click", toggleSidebars);
		}
		document.addEventListener("keydown", (event) => {
			if (event.ctrlKey && event.key === "s") {
				const taskModal = document.querySelector("[data-task-modal]");
				if (taskModal && taskModal.getAttribute("aria-hidden") !== "true") {
					event.preventDefault();
					refs.taskForm.dispatchEvent(
						new Event("submit", { cancelable: true, bubbles: true }),
					);
					return;
				}
			}
			if (event.key !== "Escape") return;
			closeIframeModal();
			closeModal("project");
			closeModal("task");
			closeModal("task-quick");
			closeMemberDetail();
			closeSidebars();
		});

		const iframeCloseBtn = document.querySelector("[data-close-iframe-modal]");
		if (iframeCloseBtn) {
			iframeCloseBtn.addEventListener("click", () => {
				closeIframeModal();
			});
		}

		const iframeModal = document.querySelector("[data-task-detail-iframe-backdrop]");
		if (iframeModal) {
			iframeModal.addEventListener("click", (e) => {
				if (e.target === iframeModal) {
					closeIframeModal();
				}
			});
		}

		document.addEventListener("click", (e) => {
			if (e.target.matches("[data-calendar-prev]")) {
				state.calendarDate.setMonth(state.calendarDate.getMonth() - 1);
				refreshView();
			} else if (e.target.matches("[data-calendar-next]")) {
				state.calendarDate.setMonth(state.calendarDate.getMonth() + 1);
				refreshView();
			}
		});

		window.addEventListener("popstate", () => {
			loadStateFromUrl({ updateUrl: false });
		});
		window.addEventListener("pageshow", async (event) => {
			const isBackForward =
				event.persisted ||
				(window.performance &&
					window.performance.navigation &&
					window.performance.navigation.type === 2) ||
				(window.performance &&
					window.performance.getEntriesByType &&
					window.performance.getEntriesByType("navigation")[0] &&
					window.performance.getEntriesByType("navigation")[0].type === "back_forward");

			if (isBackForward) {
				await loadBootstrap(state.selectedProject, { updateUrl: false });
				await loadStateFromUrl({ updateUrl: false });
			}
		});
	}

	async function loadBootstrap(preferredProject, options = {}) {
		setLoading(true);
		try {
			const shouldUpdateUrl = options.updateUrl !== false;
			state.bootstrap = await apiCall("get_portal_bootstrap");
			state.selectedTeam = state.selectedTeam || "all";
			normalizeSelectedTeam();
			renderBootstrap();

			if (refs.teamSwitcher) {
				refs.teamSwitcher.value = state.selectedTeam;
			}

			const visibleProjects = getVisibleProjects({ ignoreQuery: true });
			const projectToSelect =
				preferredProject ||
				state.selectedProject ||
				(visibleProjects[0] && visibleProjects[0].name);

			if (projectToSelect && state.navMode === "dashboard") {
				await selectProject(projectToSelect, { updateUrl: shouldUpdateUrl });
			} else if (state.navMode !== "dashboard") {
				setNavMode(state.navMode, { updateUrl: shouldUpdateUrl });
			} else {
				renderProjectWorkspace();
				if (shouldUpdateUrl) updateUrlState();
			}
		} catch (error) {
			showMessage(error.message || "Unable to load Taskflow portal.");
		} finally {
			setLoading(false);
		}
	}

	window.selectProject = selectProject;
	window.setNavMode = setNavMode;
	window.closeSidebars = closeSidebars;

	async function selectProject(projectName, options = {}) {
		const requestId = ++state.projectRequestId;
		state.selectedProject = projectName;
		setNavMode("dashboard", { updateUrl: false, replace: options.replace });
		if (options.updateUrl !== false) updateUrlState();
		try {
			const workspace = await apiCall("get_project_workspace", { project: projectName });
			if (requestId !== state.projectRequestId) return;
			state.projectWorkspace = workspace;
			renderProjectWorkspace();
		} catch (error) {
			if (requestId !== state.projectRequestId) return;
			showMessage(error.message || "Unable to load project workspace.");
		}
	}

	function getSelectedTeamName() {
		if (state.selectedTeam === "all") return "All Teams";
		const team =
			state.bootstrap && state.bootstrap.teams.find((t) => t.name === state.selectedTeam);
		return team ? team.team_name : "Team";
	}

	function setNavMode(mode, options = {}) {
		mode = normalizeNavMode(mode) || "dashboard";
		state.navMode = mode;

		// 1. Reset all views to hidden
		document
			.querySelectorAll(".taskflow-view-content")
			.forEach((el) => el.classList.add("taskflow-hidden"));

		// 2. Hide all team-specific UI components (only when not in dashboard or team mode)
		if (mode !== "dashboard" && mode !== "team") {
			const teamElements = [document.querySelector("[data-team-view]")];
			teamElements.forEach((el) => el && el.classList.add("taskflow-hidden"));
		} else {
			// Ensure team switcher is visible in dashboard and team modes
			const teamSwitcherParent =
				document.querySelector("[data-team-switcher]")?.parentElement;
			if (teamSwitcherParent) teamSwitcherParent.classList.remove("taskflow-hidden");
		}

		// 3. Show/Manage mode-specific UI
		const toolbar = document.querySelector(".taskflow-toolbar");
		const tabs = document.querySelector(".taskflow-tabs");
		const breadcrumb = document.querySelector("[data-project-breadcrumb]");
		const isPlaceholderMode = NAV_PLACEHOLDER_MODES.includes(mode);

		if (mode === "calendar") {
			state.selectedProject = null;
			state.projectWorkspace = null;
			toolbar?.classList.remove("taskflow-hidden");
			tabs?.classList.add("taskflow-hidden");
			if (refs.projectTitle) refs.projectTitle.textContent = "Calendar";
			if (refs.projectKpis) refs.projectKpis.innerHTML = "";
			if (breadcrumb) breadcrumb.textContent = "Calendar";
			if (refs.newTaskButton) refs.newTaskButton.disabled = false;

			updateNavActive();
			renderProjectList();
			renderCalendarWorkspace();
		} else if (mode === "team") {
			// SHOW TEAM UI
			state.selectedProject = null;
			state.projectWorkspace = null;
			toolbar?.classList.add("taskflow-hidden");
			tabs?.classList.add("taskflow-hidden");

			state.selectedTeam = state.selectedTeam || "all";
			const teamName = getSelectedTeamName();
			if (refs.projectTitle) refs.projectTitle.textContent = teamName;
			if (breadcrumb) breadcrumb.textContent = `Team / ${teamName}`;
			if (refs.newTaskButton) refs.newTaskButton.disabled = true;

			document.querySelector("[data-team-view]")?.classList.remove("taskflow-hidden");
			document
				.querySelector("[data-team-switcher]")
				?.parentElement.classList.remove("taskflow-hidden");

			updateNavActive();
			renderProjectList();
		} else if (isPlaceholderMode) {
			// SHOW PLACEHOLDER UI
			toolbar?.classList.add("taskflow-hidden");
			tabs?.classList.add("taskflow-hidden");
			const label = getNavModeLabel(mode);
			if (refs.projectTitle) refs.projectTitle.textContent = label;
			if (breadcrumb) breadcrumb.textContent = label;
			if (refs.dashboardView) refs.dashboardView.classList.remove("taskflow-hidden");
			renderNavPlaceholder(mode);
			updateNavActive();
			renderProjectList();
		} else {
			// SHOW PROJECT UI
			toolbar?.classList.remove("taskflow-hidden");
			tabs?.classList.remove("taskflow-hidden");
			if (refs.newTaskButton) refs.newTaskButton.disabled = false;
			updateNavActive();
			renderProjectList();
			renderProjectWorkspace();
		}

		if (options.updateUrl !== false) updateUrlState({ replace: options.replace });
	}
	async function renderTeamView() {
		const teamGrid = document.querySelector("[data-team-grid]");
		const teamTimeline = document.querySelector("[data-team-timeline]");
		const header = document.querySelector("[data-team-view] h2");
		const teamName = getSelectedTeamName();
		const viewToggle = document.querySelector("[data-team-view-toggle]");

		if (!teamGrid || !teamTimeline) return;

		viewToggle
			.querySelectorAll(".taskflow-tab")
			.forEach((t) => t.classList.toggle("active", t.dataset.view === state.teamView));

		if (header) header.textContent = `${teamName} Team Dashboard`;

		try {
			const data = await apiCall("get_dashboard_data");
			const allGlobalData = data.global_team_data || [];
			let filteredMembers = allGlobalData;
			if (state.selectedTeam && state.selectedTeam !== "all") {
				filteredMembers = allGlobalData.filter((member) => {
					// We need to fetch team memberships, as they are not directly in global_team_data
					// Assuming bootstrap.team_members contains this info
					const memberTeams = ((state.bootstrap && state.bootstrap.team_members) || [])
						.filter((tm) => tm.employee === member.employee)
						.map((tm) => tm.team);
					return memberTeams.includes(state.selectedTeam);
				});
			}

			if (state.teamView === "cards") {
				teamGrid.classList.remove("taskflow-hidden");
				teamTimeline.classList.add("taskflow-hidden");
				renderTeamCards(filteredMembers, teamGrid);
			} else {
				teamGrid.classList.add("taskflow-hidden");
				teamTimeline.classList.remove("taskflow-hidden");
				renderTeamTimeline(filteredMembers, teamTimeline);
			}
		} catch (err) {
			console.error(err);
			teamGrid.innerHTML = '<div class="taskflow-empty">Error loading team data.</div>';
		}
	}

	function renderTeamCards(filteredMembers, teamGrid) {
		if (filteredMembers.length === 0) {
			teamGrid.innerHTML = '<div class="taskflow-empty">No team members found.</div>';
			return;
		}

		teamGrid.innerHTML = filteredMembers
			.map((m) => {
				const totalTasks = (m.pending_tasks || 0) + (m.completed_tasks || 0);
				const progress =
					totalTasks > 0 ? Math.round((m.completed_tasks / totalTasks) * 100) : 0;
				const projectCount = (m.projects || []).length;

				return `
            <div class="taskflow-team-card" data-member-id='${escapeHtml(m.employee)}' style="margin-bottom: 12px; cursor: pointer; padding: 16px; border: 1px solid var(--taskflow-border); border-radius: 8px;">
                <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
                    <div class="taskflow-avatar" style="width: 40px; height: 40px; background: #3b82f6; color: white;">
                        ${m.user_image ? `<img src="${m.user_image}" alt="" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">` : initials(m.full_name)}
                    </div>
                    <div>
                        <div class="taskflow-team-member-name" style="font-weight: 600;">${escapeHtml(m.full_name)}</div>
                        <div style="font-size: 11px; color: var(--taskflow-text-muted);">Projects: ${projectCount} | Tasks: ${totalTasks}</div>
                    </div>
                </div>
                <div style="font-size: 11px; font-weight: 600; color: #475569; margin-bottom: 4px; display: flex; justify-content: space-between;">
                    <span>Task Completion</span>
                    <span>${progress}%</span>
                </div>
                <div style="width: 100%; height: 6px; background: #e2e8f0; border-radius: 3px; overflow: hidden;">
                    <div style="width: ${progress}%; height: 100%; background: #10b981; border-radius: 3px;"></div>
                </div>
            </div>`;
			})
			.join("");

		teamGrid.querySelectorAll("[data-member-id]").forEach((card) => {
			card.addEventListener("click", () => {
				const member = filteredMembers.find((m) => m.employee === card.dataset.memberId);
				showMemberDetailsPanel(member);
				teamGrid
					.querySelectorAll(".taskflow-team-card")
					.forEach((c) => (c.style.borderColor = "var(--taskflow-border)"));
				card.style.borderColor = "var(--taskflow-primary)";
			});
		});
	}

	function showMemberDetailsPanel(m) {
		const detailPanel = document.querySelector("[data-team-detail]");
		const projectStats = m.project_stats || [];

		detailPanel.innerHTML = `
            <div style="display: flex; align-items: flex-start; gap: 24px; margin-bottom: 24px;">
                <div class="taskflow-avatar" style="width: 80px; height: 80px; font-size: 24px;">
                    ${m.user_image ? `<img src="${m.user_image}" alt="" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">` : initials(m.full_name)}
                </div>
                <div>
                    <h2 style="margin: 0; font-size: 20px;">${escapeHtml(m.full_name)}</h2>
                    <p style="color: var(--taskflow-text-muted); margin-top: 4px;">Team Member | Active</p>
                </div>
            </div>

            <h3 style="font-size: 16px; margin-bottom: 16px;">Currently Assigned Projects</h3>
            ${
				projectStats.length > 0
					? `
                <table class="taskflow-table" style="width: 100%; border-collapse: collapse; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
                    <thead style="background: #f8fafc;">
                        <tr>
                            <th style="padding: 12px; text-align: left; font-size: 12px; color: #64748b; border-bottom: 1px solid #e2e8f0; width: 50px;">Sr No</th>
                            <th style="padding: 12px; text-align: left; font-size: 12px; color: #64748b; border-bottom: 1px solid #e2e8f0;">Project Name</th>
                            <th style="padding: 12px; text-align: center; font-size: 12px; color: #64748b; border-bottom: 1px solid #e2e8f0;">Start Date</th>
                            <th style="padding: 12px; text-align: center; font-size: 12px; color: #64748b; border-bottom: 1px solid #e2e8f0;">End Date</th>
                            <th style="padding: 12px; text-align: center; font-size: 12px; color: #64748b; border-bottom: 1px solid #e2e8f0;">Assigned</th>
                            <th style="padding: 12px; text-align: center; font-size: 12px; color: #64748b; border-bottom: 1px solid #e2e8f0;">Pending</th>
                            <th style="padding: 12px; text-align: center; font-size: 12px; color: #64748b; border-bottom: 1px solid #e2e8f0;">Overdue</th>
                            <th style="padding: 12px; text-align: center; font-size: 12px; color: #64748b; border-bottom: 1px solid #e2e8f0;">Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${projectStats
							.map(
								(p, i) => `
                            <tr style="border-bottom: 1px solid #f1f5f9;">
                                <td style="padding: 12px; color: #64748b;">${i + 1}</td>
                                <td style="padding: 12px; font-weight: 500;">${escapeHtml(p.name)}</td>
                                <td style="padding: 12px; text-align: center; font-size: 12px;">${formatDate(p.start_date)}</td>
                                <td style="padding: 12px; text-align: center; font-size: 12px;">${formatDate(p.end_date)}</td>
                                <td style="padding: 12px; text-align: center; font-weight: 600;">${p.assigned}</td>
                                <td style="padding: 12px; text-align: center; font-weight: 600;">${p.pending ?? p.assigned ?? 0}</td>
                                <td style="padding: 12px; text-align: center; font-weight: 600; color: ${p.overdue > 0 ? "#ef4444" : "#64748b"};">${p.overdue}</td>
                                <td style="padding: 12px; text-align: center;">
                                    ${getStatusBadge(p.status)}
                                </td>
                            </tr>
                        `,
							)
							.join("")}
                    </tbody>
                </table>
            `
					: '<p style="color: var(--taskflow-text-muted); font-size: 14px;">No projects currently assigned.</p>'
			}
        `;
	}

	async function renderTeamTimeline(allMembers, container) {
		try {
			const data = await apiCall("get_team_workload_planner", { team: state.selectedTeam });
			const { members, projects } = data;

			container.innerHTML = `
                <div style="background: white; border-radius: 8px; border: 1px solid #d1d5db; overflow: hidden; box-shadow: 0 1px 2px rgba(0,0,0,0.05);">
                    <div style="overflow-x: auto;">
                        <table class="taskflow-table" style="width: 100%; border-collapse: collapse; font-family: 'Inter', system-ui, sans-serif;">
                            <thead>
                                <tr style="background: #f9fafb; border-bottom: 1px solid #d1d5db;">
                                    <th style="padding: 12px 16px; text-align: left; position: sticky; left: 0; background: #f9fafb; z-index: 2; font-size: 11px; font-weight: 700; color: #6b7280; text-transform: uppercase;">Sr No</th>
                                    <th style="padding: 12px 16px; text-align: left; position: sticky; left: 46px; background: #f9fafb; z-index: 2; border-right: 1px solid #d1d5db; font-size: 11px; font-weight: 700; color: #6b7280; text-transform: uppercase;">Team Member</th>
                                    <th style="padding: 12px 16px; text-align: center; font-size: 11px; font-weight: 700; color: #6b7280; text-transform: uppercase;">Workload %</th>
                                    ${projects.map((p) => `<th style="padding: 12px 16px; text-align: center; min-width: 130px; font-size: 11px; font-weight: 700; color: #6b7280; text-transform: uppercase;">${escapeHtml(p.project_name)}</th>`).join("")}
                                </tr>
                            </thead>
                            <tbody style="font-size: 13px;">
                                ${members
									.map(
										(m, i) => `
                                    <tr style="border-bottom: 1px solid #f3f4f6;">
                                        <td style="padding: 12px 16px; position: sticky; left: 0; background: white; z-index: 1; color: #374151;">${i + 1}</td>
                                        <td style="padding: 12px 16px; position: sticky; left: 46px; background: white; z-index: 1; border-right: 1px solid #e5e7eb; font-weight: 600; color: #111827;">${escapeHtml(m.full_name)}</td>
                                        <td style="padding: 12px 16px; text-align: center;">
                                            <div style="display: flex; align-items: center; justify-content: center; gap: 10px;">
                                                <div style="width: 60px; height: 6px; background: #e5e7eb; border-radius: 3px;">
                                                    <div style="width: ${m.workload}%; height: 100%; background: ${m.workload > 80 ? "#f43f5e" : "#10b981"}; border-radius: 3px;"></div>
                                                </div>
                                                <span style="font-weight: 600; font-size: 12px; color: #374151;">${m.workload}%</span>
                                            </div>
                                        </td>
                                        ${projects
											.map(
												(p) => `
                                            <td style="padding: 8px 12px; text-align: center;">
                                                <button class="taskflow-btn-ghost" onclick="window.toggleProjectAssignment('${m.employee}', '${p.name}')" 
                                                        style="padding: 4px 12px; border-radius: 12px; border: 1px solid ${m.assignments.includes(p.name) ? "#bbf7d0" : "#e5e7eb"}; background: ${m.assignments.includes(p.name) ? "#f0fdf4" : "transparent"}; font-size: 11px; font-weight: 600; color: ${m.assignments.includes(p.name) ? "#166534" : "#9ca3af"}; cursor: pointer;">
                                                    ${m.assignments.includes(p.name) ? "Assigned" : "Assign"}
                                                </button>
                                            </td>
                                        `,
											)
											.join("")}
                                    </tr>
                                `,
									)
									.join("")}
                            </tbody>
                        </table>
                    </div>
                </div>
            `;
		} catch (err) {
			console.error(err);
			container.innerHTML =
				'<div class="taskflow-empty">Error loading workload planner.</div>';
		}
	}

	window.toggleProjectAssignment = async (employee, project) => {
		try {
			await apiCall("toggle_team_member_assignment", { employee, project }, "POST");
			renderTeamView();
		} catch (e) {
			showMessage("Failed to update assignment.");
		}
	};
	function showMemberDetail(member) {
		const backdrop = document.createElement("div");
		backdrop.className = "taskflow-modal-backdrop open";
		backdrop.dataset.memberDetailModal = "1";
		backdrop.innerHTML = `
			<div class="taskflow-modal">
				<div class="taskflow-modal-main-content">
					<div style="margin-bottom: 20px;">
						<h2>${escapeHtml(member.full_name)}</h2>
						<p>Team member performance overview.</p>
					</div>
					<div style="display: grid; gap: 10px;">
						<div class="taskflow-stat-box">
							<span class="taskflow-stat-value">${member.total_tasks}</span>
							<span class="taskflow-stat-label">Total Tasks Assigned</span>
						</div>
						<div class="taskflow-stat-box">
							<span class="taskflow-stat-value">${member.pending_tasks}</span>
							<span class="taskflow-stat-label">Pending</span>
						</div>
					</div>
					<button class="taskflow-button secondary" type="button" style="margin-top: 20px;" data-close-member-detail>Close</button>
				</div>
			</div>
		`;
		document.body.appendChild(backdrop);
		const close = () => backdrop.remove();
		backdrop.querySelector("[data-close-member-detail]")?.addEventListener("click", close);
		backdrop.addEventListener("click", (e) => {
			if (e.target === backdrop) close();
		});
	}

	function closeMemberDetail() {
		document.querySelectorAll("[data-member-detail-modal]").forEach((modal) => modal.remove());
	}

	function updateNavActive() {
		refs.navItems.forEach((item) => {
			const isActive = item.dataset.nav === state.navMode;
			item.classList.toggle("active", isActive);
			item.setAttribute("aria-current", isActive ? "page" : "false");
		});
	}

	function renderBootstrap() {
		renderTeamSwitcher();
		renderProjectList();

		if (state.bootstrap && state.bootstrap.user) {
			const u = state.bootstrap.user;
			if (refs.userName) refs.userName.textContent = u.full_name;
			if (refs.userImage) {
				if (u.user_image) {
					refs.userImage.src = u.user_image;
					refs.userImage.classList.remove("taskflow-hidden");
				} else {
					// Fallback to initials if no image
					refs.userAvatarContainer.innerHTML = `<div class="taskflow-assignee-avatar" style="width: 36px; height: 36px; font-size: 14px;">${initials(u.full_name)}</div>`;
				}
			}
		}

		if (refs.myTasksCount && state.bootstrap) {
			const myTasks = (state.bootstrap.tasks || []).filter((t) => {
				let assignees = [];
				if (t._assign) {
					try {
						assignees =
							typeof t._assign === "string" ? JSON.parse(t._assign) : t._assign;
					} catch (e) {
						assignees = [];
					}
				}
				if (!Array.isArray(assignees)) assignees = [];
				return (
					assignees.includes(state.bootstrap.user.user) ||
					t.assigned_to_user === state.bootstrap.user.user ||
					t.assigned_to === state.bootstrap.user.full_name
				);
			});
			refs.myTasksCount.textContent = myTasks.length;
		}

		refs.newProjectButtons.forEach((button) => {
			button.disabled = !state.bootstrap.can_create_project;
		});
	}

	function renderTeamSwitcher() {
		if (!refs.teamSwitcher) return;
		const teams = (state.bootstrap && state.bootstrap.teams) || [];
		refs.teamSwitcher.innerHTML =
			`<option value="all">All Teams</option>` +
			teams
				.map(
					(t) =>
						`<option value="${escapeHtml(t.name)}">${escapeHtml(t.team_name)}</option>`,
				)
				.join("");

		if (state.selectedTeam) {
			refs.teamSwitcher.value = state.selectedTeam;
		}
	}

	function renderProjectList() {
		const projects = getVisibleProjects();

		if (refs.projectCount) {
			refs.projectCount.textContent = projects.length;
		}

		if (!projects.length) {
			refs.projectList.innerHTML = '<div class="taskflow-nav-item">No projects found</div>';
			return;
		}

		const colors = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];

		refs.projectList.innerHTML = projects
			.map((project, idx) => {
				const activeClass =
					state.navMode === "dashboard" && project.name === state.selectedProject
						? "active"
						: "";
				const color = colors[idx % colors.length];
				const initialsStr = initials(project.project_name);
				const pendingCount = project.open_tasks || 0;
				return `
					<div class="taskflow-project-item ${activeClass}" data-project-select="${escapeHtml(project.name)}" role="button" tabindex="0">
						<div class="taskflow-project-icon" style="background: ${color}">${initialsStr}</div>
						<span class="taskflow-project-name">${escapeHtml(project.project_name || project.name)}</span>
						${pendingCount > 0 ? `<span class="taskflow-badge">${pendingCount}</span>` : ""}
					</div>
				`;
			})
			.join("");

		refs.projectList.querySelectorAll("[data-project-select]").forEach((button) => {
			button.addEventListener("click", () => selectProject(button.dataset.projectSelect));
			button.addEventListener("keydown", (event) => {
				if (event.key !== "Enter" && event.key !== " ") return;
				event.preventDefault();
				button.click();
			});
		});
	}

	function renderKpiCards(tasks) {
		if (refs.projectKpis) {
			const statusList = [
				"Open",
				"In Progress",
				"Review",
				"On Hold",
				"Completed",
				"Cancelled",
				"Overdue",
			];
			const counts = {};
			statusList.forEach((s) => (counts[s] = 0));
			(tasks || []).forEach((t) => {
				const status = t.status || "Open";
				counts[status] = (counts[status] || 0) + 1;
			});
			const statusColors = {
				Completed: "#10b981",
				"In Progress": "#3b82f6",
				Review: "#8b5cf6",
				"On Hold": "#f59e0b",
				Open: "#ef4444",
				Cancelled: "#6b7280",
				Overdue: "#b91c1c",
			};
			refs.projectKpis.innerHTML = statusList
				.map((status) => {
					const color = statusColors[status] || "#6b7280";
					const count = counts[status] || 0;
					return `
					<div class="taskflow-kpi-card" data-kpi-status="${escapeHtml(status)}" style="
						display: inline-flex;
						align-items: center;
						gap: 6px;
						padding: 4px 10px;
						border-radius: 8px;
						font-size: 12px;
						color: #334155;
						font-weight: 500;
						transition: all 0.2s ease;
						cursor: pointer;
						user-select: none;
					">
						<span style="width: 6px; height: 6px; border-radius: 50%; background-color: ${color}; display: inline-block;"></span>
						<span style="color: #64748b;">${escapeHtml(status)}</span>
						<strong style="color: #0f172a; font-weight: 700; margin-left: 2px;">${count}</strong>
					</div>
				`;
				})
				.join("");

			// Add click event listeners to KPI cards
			refs.projectKpis.querySelectorAll("[data-kpi-status]").forEach((card) => {
				card.addEventListener("click", () => {
					const status = card.dataset.kpiStatus;
					if (!state.selectedStatuses) state.selectedStatuses = [];
					if (state.selectedStatuses.includes(status)) {
						state.selectedStatuses = state.selectedStatuses.filter(
							(s) => s !== status,
						);
					} else {
						state.selectedStatuses.push(status);
					}
					localStorage.setItem(
						"taskflow_filter_statuses",
						JSON.stringify(state.selectedStatuses),
					);
					updateUrlState();
					updateKpiHighlights();
					refreshView();
				});
			});

			updateKpiHighlights();
		}
	}

	function renderProjectWorkspace() {
		const breadcrumb = document.querySelector("[data-project-breadcrumb]");

		if (state.navMode === "my-tasks") {
			refs.projectTitle.textContent = "Tasks";
			if (breadcrumb) breadcrumb.textContent = "Tasks";
			refs.newTaskButton.disabled = false;

			// Handle Member Selector for My Tasks
			if (refs.memberSelectorWrapper && refs.memberSelector) {
				refs.memberSelectorWrapper.classList.remove("taskflow-hidden");

				if (refs.myTasksTeamSelector && state.bootstrap) {
					const teams = state.bootstrap.teams || [];
					const teamOptions =
						`<option value="all">All Teams</option>` +
						teams
							.map(
								(t) =>
									`<option value="${escapeHtml(t.name)}" ${t.name === state.myTasksTeam ? "selected" : ""}>${escapeHtml(t.team_name || t.name)}</option>`,
							)
							.join("");
					refs.myTasksTeamSelector.innerHTML = teamOptions;
				}

				if (refs.myTasksProjectSelector && state.bootstrap) {
					const projects = state.bootstrap.projects || [];
					const filteredProjects =
						state.myTasksTeam === "all"
							? projects
							: projects.filter((p) => p.team === state.myTasksTeam);
					const projOptions =
						`<option value="all">All Projects</option>` +
						filteredProjects
							.map(
								(p) =>
									`<option value="${escapeHtml(p.name)}" ${p.name === state.myTasksProject ? "selected" : ""}>${escapeHtml(p.project_name)}</option>`,
							)
							.join("");
					refs.myTasksProjectSelector.innerHTML = projOptions;
				}

				const currentTeam = state.myTasksTeam;
				const members = ((state.bootstrap && state.bootstrap.team_members) || []).filter(
					(m) => currentTeam === "all" || m.team === currentTeam,
				);

				const defaultEmployee = getCurrentUserEmployeeId();
				if (state.selectedMember !== "all") {
					const memberExists = members.some(
						(m) => String(m.employee) === String(state.selectedMember),
					);
					if (!memberExists) {
						const defaultMember = members.find(
							(m) => String(m.employee) === String(defaultEmployee),
						);
						state.selectedMember =
							defaultMember?.employee || members[0]?.employee || "all";
					}
				}

				const activeMem =
					state.selectedMember !== null ? state.selectedMember : defaultEmployee;
				const options =
					`<option value="all" ${activeMem === "all" ? "selected" : ""}>All Members</option>` +
					members
						.map(
							(m) =>
								`<option value="${escapeHtml(m.employee)}" ${String(m.employee) === String(activeMem) ? "selected" : ""}>${escapeHtml(m.label)}</option>`,
						)
						.join("");

				refs.memberSelector.innerHTML = options;
			}

			refreshView();
			return;
		}

		if (refs.memberSelectorWrapper) {
			refs.memberSelectorWrapper.classList.add("taskflow-hidden");
		}

		const workspace = state.projectWorkspace;
		if (!workspace || !workspace.project) {
			refs.projectTitle.textContent = "Select Project";
			if (refs.projectKpis) refs.projectKpis.innerHTML = "";
			if (breadcrumb) breadcrumb.textContent = "None";
			refs.newTaskButton.disabled = true;

			const alertContainer = document.querySelector("[data-oldest-task-alert]");
			if (alertContainer) alertContainer.innerHTML = "";

			renderTaskArea([], "Select a project to view tasks.");
			return;
		}

		const project = workspace.project;
		const tasks = workspace.tasks || [];

		// Calculate oldest pending task — filtered by selected member if one is active
		const alertEmployee = state.selectedMember || null;
		renderOldestTaskAlert(tasks, alertEmployee);

		const totalTasks = tasks.length;
		const completedTasks = tasks.filter((t) => t.status === "Completed").length;
		const pendingCount = totalTasks - completedTasks;

		refs.projectTitle.innerHTML = `
			${escapeHtml(project.project_name)}
			<span style="font-size: 20px; font-weight: 800; margin-left: 12px;">
				<span style="color: #ef4444;">${pendingCount}</span> / ${totalTasks}
			</span>
		`;

		renderKpiCards(tasks);
		if (breadcrumb) breadcrumb.textContent = project.project_name;
		refs.newTaskButton.disabled = !(
			project.permissions.can_manage_team || project.permissions.can_operate_team
		);
		renderTaskArea(tasks);
	}

	function renderCalendarWorkspace() {
		if (!state.bootstrap) return;

		if (refs.root) refs.root.classList.remove("is-kanban");

		[
			refs.listView,
			document.querySelector(".taskflow-board-wrapper"),
			refs.dashboardView,
			refs.filesView,
			refs.settingsView,
		].forEach((el) => el && el.classList.add("taskflow-hidden"));

		if (refs.timelineView) refs.timelineView.classList.remove("taskflow-hidden");
		const contentArea = document.querySelector(".taskflow-content");
		if (contentArea) contentArea.classList.remove("full-width");

		if (refs.calendarFilters) refs.calendarFilters.style.display = "flex";
		renderCalendarFilters();
		renderTimeline(getCalendarTasks());
	}

	function renderCalendarFilters() {
		const teams = (state.bootstrap && state.bootstrap.teams) || [];
		const projects = getCalendarProjects();
		const members = getCalendarMembers();

		if (refs.calendarTeamFilter) {
			refs.calendarTeamFilter.innerHTML = [
				`<option value="all">All Teams</option>`,
				...teams.map(
					(team) =>
						`<option value="${escapeHtml(team.name)}">${escapeHtml(team.team_name || team.name)}</option>`,
				),
			].join("");
			refs.calendarTeamFilter.value = state.selectedTeam || "all";
		}

		if (!projects.some((project) => project.name === state.calendarProject)) {
			state.calendarProject = "";
		}
		if (!members.some((member) => String(member.employee) === String(state.calendarMember))) {
			state.calendarMember = "";
		}

		if (refs.calendarProjectFilter) {
			refs.calendarProjectFilter.innerHTML = [
				`<option value="">All Projects</option>`,
				...projects.map(
					(project) =>
						`<option value="${escapeHtml(project.name)}">${escapeHtml(project.project_name || project.name)}</option>`,
				),
			].join("");
			refs.calendarProjectFilter.value = state.calendarProject || "";
		}

		if (refs.calendarMemberFilter) {
			refs.calendarMemberFilter.innerHTML = [
				`<option value="">All Team Members</option>`,
				...members.map(
					(member) =>
						`<option value="${escapeHtml(member.employee)}">${escapeHtml(member.label || member.employee)}</option>`,
				),
			].join("");
			refs.calendarMemberFilter.value = state.calendarMember || "";
		}

		if (refs.calendarTitle) {
			const titleParts = ["Calendar"];
			if (state.selectedTeam && state.selectedTeam !== "all")
				titleParts.push(getSelectedTeamName());
			if (state.calendarProject) {
				const project = projects.find((item) => item.name === state.calendarProject);
				if (project) titleParts.push(project.project_name || project.name);
			}
			if (state.calendarMember) {
				const member = members.find(
					(item) => String(item.employee) === String(state.calendarMember),
				);
				if (member) titleParts.push(member.label || member.employee);
			}
			refs.calendarTitle.textContent = titleParts.join(" / ");
		}
	}

	function getCalendarProjects() {
		let projects = (state.bootstrap && state.bootstrap.projects) || [];
		if (state.selectedTeam && state.selectedTeam !== "all") {
			projects = projects.filter((project) => project.team === state.selectedTeam);
		}
		return projects;
	}

	function getCalendarMembers() {
		let members = (state.bootstrap && state.bootstrap.team_members) || [];
		if (state.selectedTeam && state.selectedTeam !== "all") {
			members = members.filter((member) => member.team === state.selectedTeam);
		}

		if (state.calendarProject) {
			const project = ((state.bootstrap && state.bootstrap.projects) || []).find(
				(item) => item.name === state.calendarProject,
			);
			const projectMemberIds = new Set(
				((project && project.project_team_members) || [])
					.map((member) => member.employee)
					.filter(Boolean),
			);
			((state.bootstrap && state.bootstrap.tasks) || [])
				.filter((task) => task.project === state.calendarProject && task.assigned_to)
				.forEach((task) => projectMemberIds.add(task.assigned_to));

			if (projectMemberIds.size) {
				members = members.filter((member) => projectMemberIds.has(member.employee));
			}
		}

		return members;
	}

	function getCalendarTasks() {
		let tasks = (state.bootstrap && state.bootstrap.tasks) || [];
		if (state.selectedTeam && state.selectedTeam !== "all") {
			tasks = tasks.filter((task) => task.team === state.selectedTeam);
		}
		if (state.calendarProject) {
			tasks = tasks.filter((task) => task.project === state.calendarProject);
		}
		if (state.calendarMember) {
			tasks = tasks.filter(
				(task) => String(task.assigned_to) === String(state.calendarMember),
			);
		}
		return filterTasks(tasks);
	}

	function renderTimeline(tasks) {
		const grid = document.querySelector("[data-calendar-grid]");
		const monthTitle = document.querySelector("[data-calendar-month]");
		if (!grid) return;

		if (!state.calendarDate) {
			state.calendarDate = new Date();
		}

		const year = state.calendarDate.getFullYear();
		const month = state.calendarDate.getMonth();

		// Update month/year title
		if (monthTitle) {
			const monthNames = [
				"January",
				"February",
				"March",
				"April",
				"May",
				"June",
				"July",
				"August",
				"September",
				"October",
				"November",
				"December",
			];
			monthTitle.textContent = `${monthNames[month]} ${year}`;
		}
		// Compute Calendar KPIs
		let totalStarted = 0;
		let totalDue = 0;
		const monthlyTasksByName = new Map();
		(tasks || []).forEach((t) => {
			let counted = false;
			if (t.start_date) {
				const start = new Date(t.start_date);
				if (start.getFullYear() === year && start.getMonth() === month) {
					totalStarted++;
					counted = true;
				}
			}
			if (t.due_date) {
				const due = new Date(t.due_date);
				if (due.getFullYear() === year && due.getMonth() === month) {
					totalDue++;
					counted = true;
				}
			}
			if (counted) monthlyTasksByName.set(t.name, t);
		});
		const monthlyTasks = Array.from(monthlyTasksByName.values());
		const totalPending = monthlyTasks.filter(
			(t) => !["Completed", "Cancelled"].includes(t.status),
		).length;
		const totalCompleted = monthlyTasks.filter((t) => t.status === "Completed").length;
		const totalBoth = monthlyTasks.length;

		const kpisContainer = document.querySelector("[data-calendar-kpis]");
		if (kpisContainer) {
			kpisContainer.innerHTML = `
				<div style="display: flex; gap: 16px; align-items: center; flex-wrap: wrap;">
					<span style="color: #64748b; font-weight: 500; display: inline-flex; align-items: center; gap: 6px;">
						<span style="width: 8px; height: 8px; border-radius: 50%; background-color: #3b82f6; display: inline-block;"></span>
						Total Started: <strong style="color: #1e40af; font-weight: 700;">${totalStarted}</strong>
					</span>
					<span style="color: #64748b; font-weight: 500; display: inline-flex; align-items: center; gap: 6px;">
						<span style="width: 8px; height: 8px; border-radius: 50%; background-color: #ef4444; display: inline-block;"></span>
						Total Due: <strong style="color: #991b1b; font-weight: 700;">${totalDue}</strong>
					</span>
					<span style="color: #64748b; font-weight: 500; display: inline-flex; align-items: center; gap: 6px;">
						<span style="width: 8px; height: 8px; border-radius: 50%; background-color: #f97316; display: inline-block;"></span>
						Total Pending: <strong style="color: #9a3412; font-weight: 700;">${totalPending}</strong>
					</span>
					<span style="color: #64748b; font-weight: 500; display: inline-flex; align-items: center; gap: 6px;">
						<span style="width: 8px; height: 8px; border-radius: 50%; background-color: #10b981; display: inline-block;"></span>
						Total Completed: <strong style="color: #047857; font-weight: 700;">${totalCompleted}</strong>
					</span>
					<span style="color: #64748b; font-weight: 500; display: inline-flex; align-items: center; gap: 6px; margin-left: 4px; padding-left: 12px; border-left: 1px solid var(--taskflow-border);">
						Total: <strong style="color: #0f172a; font-weight: 700;">${totalBoth}</strong>
					</span>
				</div>
			`;
		}
		// Get first day of month (0 = Sunday, ..., 6 = Saturday)
		const firstDayIndexRaw = new Date(year, month, 1).getDay();
		// Shift so 0 = Monday, ..., 6 = Sunday
		const firstDayIndex = firstDayIndexRaw === 0 ? 6 : firstDayIndexRaw - 1;
		// Get total days in month
		const totalDays = new Date(year, month + 1, 0).getDate();
		// Get total days in previous month
		const prevTotalDays = new Date(year, month, 0).getDate();

		let html = `<div class="taskflow-calendar-grid-container">`;
		const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

		// Render day headers
		for (let i = 0; i < 7; i++) {
			html += `<div class="taskflow-calendar-day-header">${dayNames[i]}</div>`;
		}

		const today = new Date();

		// Prepare all 42 calendar cells
		let cells = [];

		// Previous month days
		for (let i = firstDayIndex - 1; i >= 0; i--) {
			cells.push({
				day: prevTotalDays - i,
				month: month === 0 ? 11 : month - 1,
				year: month === 0 ? year - 1 : year,
				isOtherMonth: true,
			});
		}

		// Current month days
		for (let i = 1; i <= totalDays; i++) {
			cells.push({
				day: i,
				month: month,
				year: year,
				isOtherMonth: false,
			});
		}

		// Next month days
		const remaining = 42 - cells.length;
		for (let i = 1; i <= remaining; i++) {
			cells.push({
				day: i,
				month: month === 11 ? 0 : month + 1,
				year: month === 11 ? year + 1 : year,
				isOtherMonth: true,
			});
		}

		// Render day cells
		cells.forEach((cell) => {
			const cellDate = new Date(cell.year, cell.month, cell.day);
			// Format date as local date string in YYYY-MM-DD
			const cellYear = cellDate.getFullYear();
			const cellMonth = String(cellDate.getMonth() + 1).padStart(2, "0");
			const cellDay = String(cellDate.getDate()).padStart(2, "0");
			const cellDateString = `${cellYear}-${cellMonth}-${cellDay}`;

			const isToday =
				cell.day === today.getDate() &&
				cell.month === today.getMonth() &&
				cell.year === today.getFullYear();

			// Filter tasks for this day: show on start_date and/or due_date, but not in between
			const dayTasks = tasks.filter((t) => {
				return t.start_date === cellDateString || t.due_date === cellDateString;
			});

			const cellClass = `taskflow-calendar-day-cell ${cell.isOtherMonth ? "other-month" : ""} ${isToday ? "today" : ""}`;

			html += `<div class="${cellClass}">
				<div class="taskflow-calendar-day-number">${cell.day}</div>`;

			dayTasks.slice(0, 4).forEach((t) => {
				const statusLower = (t.status || "Open").toLowerCase().replace(/\s+/g, "-");
				const statusClass = `status-${statusLower}`;

				let tagText = "";
				if (t.start_date === cellDateString && t.due_date === cellDateString) {
					tagText =
						'<span style="font-size: 8px; font-weight: 800; text-transform: uppercase; background: #e2e8f0; padding: 1px 3px; border-radius: 3px; margin-right: 4px;">Start/Due</span>';
				} else if (t.start_date === cellDateString) {
					tagText =
						'<span style="font-size: 8px; font-weight: 800; text-transform: uppercase; background: #dbeafe; color: #1e40af; padding: 1px 3px; border-radius: 3px; margin-right: 4px;">Start</span>';
				} else if (t.due_date === cellDateString) {
					tagText =
						'<span style="font-size: 8px; font-weight: 800; text-transform: uppercase; background: #fef2f2; color: #991b1b; padding: 1px 3px; border-radius: 3px; margin-right: 4px;">Due</span>';
				}

				html += `
					<div class="taskflow-calendar-task-badge ${statusClass}" 
						data-task-name="${escapeHtml(t.name)}" 
						title="${escapeHtml(t.task_title)}">
						${tagText}${escapeHtml(t.task_title)}
					</div>`;
			});

			if (dayTasks.length > 4) {
				const moreTaskNames = dayTasks.map((t) => t.name).join(",");
				html += `<button 
					class="taskflow-calendar-more-btn" 
					data-calendar-more 
					data-date="${cellDateString}"
					data-tasks="${escapeHtml(moreTaskNames)}"
				>+${dayTasks.length - 4} more</button>`;
			}

			html += `</div>`;
		});

		html += `</div>`;
		grid.innerHTML = html;

		// Attach click listeners to task badges
		grid.querySelectorAll(".taskflow-calendar-task-badge").forEach((badge) => {
			badge.addEventListener("click", (e) => {
				e.stopPropagation();
				const taskName = badge.dataset.taskName;
				const task = tasks.find((t) => t.name === taskName);
				if (task) openTaskModal(task);
			});
		});

		// Attach click listeners to "+N more" buttons
		grid.querySelectorAll("[data-calendar-more]").forEach((btn) => {
			btn.addEventListener("click", (e) => {
				e.stopPropagation();
				const dateStr = btn.dataset.date;
				const dayTasks = tasks.filter(
					(t) => t.start_date === dateStr || t.due_date === dateStr,
				);
				openCalendarDayPopup(dateStr, dayTasks);
			});
		});
	}

	function openCalendarDayPopup(dateStr, dayTasks) {
		const existing = document.getElementById("calendarDayPopup");
		if (existing) existing.remove();

		// Format date nicely
		const dateObj = parseDateValue(dateStr);
		const displayDate = dateObj
			? dateObj.toLocaleDateString("en-IN", {
					weekday: "long",
					day: "numeric",
					month: "long",
					year: "numeric",
				})
			: dateStr;

		const taskRows = dayTasks
			.map((t) => {
				const isStart = t.start_date === dateStr;
				const isDue = t.due_date === dateStr;
				let badge = "";
				if (isStart && isDue)
					badge = `<span style="font-size:10px;font-weight:700;background:#e2e8f0;padding:2px 6px;border-radius:4px;">Start/Due</span>`;
				else if (isStart)
					badge = `<span style="font-size:10px;font-weight:700;background:#dbeafe;color:#1e40af;padding:2px 6px;border-radius:4px;">Start</span>`;
				else if (isDue)
					badge = `<span style="font-size:10px;font-weight:700;background:#fef2f2;color:#991b1b;padding:2px 6px;border-radius:4px;">Due</span>`;

				const statusColors = {
					Open: "#f97316",
					"In Progress": "#3b82f6",
					Review: "#8b5cf6",
					"On Hold": "#f59e0b",
					Completed: "#10b981",
					Overdue: "#ef4444",
				};
				const statusColor = statusColors[t.status] || "#64748b";

				return `
				<div class="cal-day-popup-task" data-popup-task="${escapeHtml(t.name)}">
					<div style="display:flex;align-items:center;gap:8px;flex:1;min-width:0;">
						<span style="width:8px;height:8px;border-radius:50%;background:${statusColor};flex-shrink:0;"></span>
						<span style="font-size:13px;font-weight:500;color:#0f172a;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(t.task_title || "")}</span>
					</div>
					<div style="display:flex;align-items:center;gap:6px;flex-shrink:0;">
						${badge}
						<span style="font-size:11px;color:${statusColor};font-weight:600;">${escapeHtml(t.status || "")}</span>
					</div>
				</div>`;
			})
			.join("");

		const popup = document.createElement("div");
		popup.id = "calendarDayPopup";
		popup.innerHTML = `
			<div id="calendarDayPopupBackdrop" style="position:fixed;inset:0;z-index:10000;display:flex;align-items:center;justify-content:center;background:rgba(15,23,42,0.4);backdrop-filter:blur(4px);">
				<div style="background:#fff;border-radius:14px;box-shadow:0 20px 60px rgba(0,0,0,0.2);width:90vw;max-width:480px;max-height:80vh;display:flex;flex-direction:column;overflow:hidden;">
					<!-- Header -->
					<div style="padding:18px 20px 14px;border-bottom:1px solid #e2e8f0;display:flex;align-items:center;justify-content:space-between;">
						<div>
							<div style="font-size:16px;font-weight:700;color:#0f172a;">${escapeHtml(displayDate)}</div>
							<div style="font-size:12px;color:#64748b;margin-top:2px;">${dayTasks.length} task${dayTasks.length !== 1 ? "s" : ""}</div>
						</div>
						<button id="calendarDayPopupClose" style="background:none;border:none;font-size:20px;cursor:pointer;color:#94a3b8;line-height:1;padding:4px;">✕</button>
					</div>
					<!-- Task List -->
					<div style="overflow-y:auto;padding:8px 12px;display:flex;flex-direction:column;gap:4px;">
						${taskRows}
					</div>
				</div>
			</div>`;

		document.body.appendChild(popup);

		// Close on backdrop or X button
		const backdrop = popup.querySelector("#calendarDayPopupBackdrop");
		const closeBtn = popup.querySelector("#calendarDayPopupClose");
		const closePopup = () => popup.remove();
		closeBtn.addEventListener("click", closePopup);
		backdrop.addEventListener("click", (e) => {
			if (e.target === backdrop) closePopup();
		});

		// Click task row → open task modal
		popup.querySelectorAll("[data-popup-task]").forEach((row) => {
			row.addEventListener("click", () => {
				const task = dayTasks.find((t) => t.name === row.dataset.popupTask);
				if (task) {
					closePopup();
					openTaskModal(task);
				}
			});
		});
	}

	function renderTaskArea(tasks, emptyMessage) {
		const visibleTasks = getFilteredTasks(tasks);

		if (refs.root) {
			refs.root.classList.toggle("is-kanban", state.taskView === "kanban");
		}

		const views = [
			{ el: refs.listView, key: "list" },
			{ el: document.querySelector(".taskflow-board-wrapper"), key: "kanban" },
			{ el: refs.dashboardView, key: "dashboard" },
			{ el: refs.timelineView, key: "timeline" },
			{ el: refs.filesView, key: "files" },
			{ el: refs.settingsView, key: "settings" },
		];

		views.forEach((v) => {
			if (v.el) v.el.classList.toggle("taskflow-hidden", v.key !== state.taskView);
		});

		const contentArea = document.querySelector(".taskflow-content");
		if (contentArea) {
			contentArea.classList.toggle("full-width", state.taskView === "list");
		}

		if (emptyMessage) {
			renderActiveEmptyState(emptyMessage);
		} else if (state.taskView === "list") {
			renderList(visibleTasks);
		} else if (state.taskView === "kanban") {
			renderBoard(visibleTasks);
		} else if (state.taskView === "dashboard") {
			renderDashboard(visibleTasks);
		} else if (state.taskView === "timeline") {
			if (refs.calendarFilters) refs.calendarFilters.style.display = "none";
			if (refs.calendarTitle) refs.calendarTitle.textContent = "Project Calendar";
			renderTimeline(visibleTasks);
		} else if (state.taskView === "files") {
			renderProjectCommentsView();
		} else if (state.taskView === "settings") {
			renderSettingsView();
		}
	}

	function getFilteredTasks(tasks) {
		let filtered = tasks;
		if (state.selectedTeam && state.selectedTeam !== "all") {
			filtered = filtered.filter((t) => t.team === state.selectedTeam);
		}
		if (state.selectedStatuses && state.selectedStatuses.length > 0) {
			filtered = filtered.filter((t) => state.selectedStatuses.includes(t.status));
		}
		if (state.selectedAssignees && state.selectedAssignees.length > 0) {
			filtered = filtered.filter((t) =>
				state.selectedAssignees.includes(t.assigned_to_name || "Unassigned"),
			);
		}
		return filterTasks(filtered);
	}

	async function refreshView() {
		if (!state.bootstrap) return;
		if (state.navMode === "team") return;
		if (NAV_PLACEHOLDER_MODES.includes(state.navMode)) {
			renderNavPlaceholder(state.navMode);
			return;
		}
		if (state.navMode === "calendar") {
			renderCalendarWorkspace();
			return;
		}

		let tasks = [];
		if (state.navMode === "my-tasks") {
			const activeEmployee = state.selectedMember || getCurrentUserEmployeeId();
			const memberObj = ((state.bootstrap && state.bootstrap.team_members) || []).find(
				(m) => String(m.employee) === String(activeEmployee),
			);
			const activeUser = memberObj
				? memberObj.user
				: activeEmployee === "all"
					? "all"
					: null;

			if (activeUser) {
				setLoading(true);
				try {
					tasks = await apiCall("get_assigned_tasks", {
						user_id: activeUser,
						project: state.myTasksProject,
						team: state.myTasksTeam,
					});
				} catch (e) {
					console.error("Failed to load assigned tasks:", e);
					tasks = [];
				} finally {
					setLoading(false);
				}

				if (state.myTasksProject !== "all") {
					tasks = tasks.filter((t) => t.project === state.myTasksProject);
				}
				if (state.myTasksTeam !== "all") {
					tasks = tasks.filter((t) => t.team === state.myTasksTeam);
				}
			} else {
				tasks = [];
			}

			// Update title: "My Tasks  X / Y"
			if (refs.projectTitle) {
				const total = tasks.length;
				const pending = tasks.filter(
					(t) => !["Completed", "Cancelled"].includes(t.status),
				).length;
				refs.projectTitle.innerHTML = `
					Tasks
					<span style="font-size:18px; font-weight:800; margin-left:12px;">
						<span style="color:#ef4444;">${pending}</span> / ${total}
					</span>
				`;
			}
		} else if (state.projectWorkspace) {
			tasks = state.projectWorkspace.tasks || [];
		} else if (state.navMode === "dashboard") {
			// Global dashboard view
			tasks = state.bootstrap.tasks || [];
		}

		// Show oldest task alert for My Tasks
		// Tasks from get_assigned_tasks are already the selected member's —
		// no need to re-filter by assigned_to; pass member name directly.
		if (state.navMode === "my-tasks") {
			const activeEmployee = state.selectedMember || getCurrentUserEmployeeId();
			const memberObj = ((state.bootstrap && state.bootstrap.team_members) || []).find(
				(m) => String(m.employee) === String(activeEmployee),
			);
			const memberLabel = memberObj ? memberObj.label : null;
			renderOldestTaskAlert(tasks, null, memberLabel);
		}

		renderTaskArea(tasks);
		renderKpiCards(tasks);
		updateKpiHighlights();
	}

	// Renders the ⚠️ oldest pending task alert.
	// filterEmployee: employee ID to filter tasks by (for project view).
	// forceMemberName: if provided, skip assigned_to lookup and use this name directly (for My Tasks).
	function renderOldestTaskAlert(tasks, filterEmployee = null, forceMemberName = null) {
		const alertContainer = document.querySelector("[data-oldest-task-alert]");
		if (!alertContainer) return;

		let pendingTasks = (tasks || []).filter(
			(t) => !["Completed", "Cancelled"].includes(t.status) && t.start_date,
		);

		// Filter by employee only in project view (not My Tasks — tasks are pre-filtered)
		if (filterEmployee) {
			pendingTasks = pendingTasks.filter(
				(t) => String(t.assigned_to) === String(filterEmployee),
			);
		}

		if (pendingTasks.length > 0) {
			pendingTasks.sort((a, b) => new Date(a.start_date) - new Date(b.start_date));
			const oldest = pendingTasks[0];
			const today = new Date();
			const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
			const startDate = parseDateValue(oldest.start_date);
			const days = startDate
				? Math.max(0, Math.floor((todayMidnight - startDate) / (1000 * 60 * 60 * 24)))
				: 0;

			// Use forced name (My Tasks) or look up from team_members (Project view)
			let assigneeName = forceMemberName;
			if (!assigneeName) {
				const member = (state.bootstrap.team_members || []).find(
					(m) => m.employee === oldest.assigned_to,
				);
				assigneeName = member ? member.label : oldest.assigned_to || "Unassigned";
			}

			if (days === 0) {
				alertContainer.innerHTML = `<span style="display:inline-flex; align-items:center; gap:6px; padding:4px 10px; background:#dcfce7; color:#16a34a; border-radius:20px; font-size:13px; font-weight:600;">✅ On Time</span>`;
			} else {
				alertContainer.innerHTML = `<span class="taskflow-oldest-task-alert" style="cursor: pointer;" data-oldest-task-id="${escapeHtml(oldest.name)}">⚠️ ${escapeHtml(assigneeName)} (${days} days pending)</span>`;
				alertContainer
					.querySelector(".taskflow-oldest-task-alert")
					.addEventListener("click", () => openTaskModal(oldest));
			}
		} else {
			alertContainer.innerHTML = "";
		}
	}

	function renderDashboard(tasks) {
		if (!refs.dashboardView) return;

		const completed = tasks.filter((t) => t.status === "Completed").length;
		const inProgress = tasks.filter((t) => t.status === "In Progress").length;
		const overdue = tasks.filter((t) => {
			const dueDate = parseDateValue(t.due_date);
			return dueDate && dueDate < new Date() && t.status !== "Completed";
		}).length;
		const total = tasks.length;

		const stats = [
			{
				label: "Total Tasks",
				value: total,
				trend: "Stable",
				color: "var(--taskflow-primary)",
			},
			{ label: "Completed", value: completed, trend: "+12%", color: "#10b981" },
			{ label: "In Progress", value: inProgress, trend: "Active", color: "#3b82f6" },
			{ label: "Overdue", value: overdue, trend: "-2", color: "#ef4444" },
		];

		const statusBreakdown = getStatusColumns().map((status) => {
			const count = tasks.filter((t) => t.status === status).length;
			const percent = total ? Math.round((count / total) * 100) : 0;
			return { status, count, percent };
		});

		// Team Performance Data
		const members = (state.projectWorkspace && state.projectWorkspace.team_members) || [];
		const performanceCardsHtml = members
			.map((m) => {
				const memberTasks = tasks.filter((t) => {
					let assignees = [];
					if (t._assign) {
						try {
							assignees =
								typeof t._assign === "string" ? JSON.parse(t._assign) : t._assign;
						} catch (e) {
							assignees = [];
						}
					}
					if (!Array.isArray(assignees)) assignees = [];
					return (
						t.assigned_to === m.employee ||
						t.assigned_to_user === m.user ||
						assignees.includes(m.user)
					);
				});
				const done = memberTasks.filter((t) => t.status === "Completed").length;
				const pending = memberTasks.filter(
					(t) => !["Completed", "Cancelled"].includes(t.status),
				).length;
				const totalM = memberTasks.length;
				const rate = totalM ? Math.round((done / totalM) * 100) : 0;
				const highPriority = memberTasks.filter((t) =>
					["High", "Critical"].includes(t.priority),
				).length;

				const loadCount = pending; // Use pending tasks for load calculation
				const loadClass =
					loadCount > 8 ? "load-high" : loadCount > 4 ? "load-medium" : "load-low";
				const loadLabel =
					loadCount > 8 ? "high load" : loadCount > 4 ? "medium load" : "low load";
				const score = rate; // Placeholder for performance score
				return `
	<div class="taskflow-perf-card">
		<div class="taskflow-perf-header">
			<div class="taskflow-perf-user">
				<div class="taskflow-assignee-avatar" style="width: 48px; height: 48px; font-size: 16px; border: 2px solid var(--taskflow-border);">
					${m.user_image ? `<img src="${m.user_image}" alt="" style="width: 100%; height: 100%; object-fit: cover;">` : initials(m.label)}
				</div>
				<div class="taskflow-perf-user-info">
					<div class="taskflow-perf-name-row">
									<span class="taskflow-perf-name">${escapeHtml(m.label)}</span>
									<span class="taskflow-load-badge ${loadClass}">${loadLabel}</span>
								</div>
								<div class="taskflow-perf-subtext">
									${totalM} tasks assigned • <span style="color: #ef4444; font-weight: 700;">${pending} pending</span> • ${highPriority} high priority
								</div>
							</div>
						</div>
						<div class="taskflow-perf-badge ${rate >= 80 ? "excellent" : rate >= 50 ? "good" : "average"}">
							${rate >= 80 ? "Excellent" : rate >= 50 ? "Good" : "Average"}
						</div>
					</div>
					
					<div class="taskflow-perf-stats-grid">
						<div class="taskflow-perf-stat-box">
							<div class="taskflow-perf-stat-label">Performance Score</div>
							<div class="taskflow-perf-stat-value">${score}%</div>
						</div>
						<div class="taskflow-perf-stat-box">
							<div class="taskflow-perf-stat-label">Completion Rate</div>
							<div class="taskflow-perf-stat-value">${rate}%</div>
							<div class="taskflow-perf-stat-subvalue">${done}/${totalM} done</div>
						</div>
						<div class="taskflow-perf-stat-box">
							<div class="taskflow-perf-stat-label">Avg Task Age</div>
							<div class="taskflow-perf-stat-value">0 <span style="font-size: 14px; font-weight: 500;">days</span></div>
						</div>
						<div class="taskflow-perf-stat-box">
							<div class="taskflow-perf-stat-label">Status</div>
							<div class="taskflow-perf-stat-value" style="font-size: 16px; display: flex; align-items: center; gap: 6px;">
								<span style="width: 8px; height: 8px; border-radius: 50%; background: #f59e0b;"></span>
								${totalM > 0 ? "Active" : "Low activity"}
							</div>
						</div>
					</div>

					<div class="taskflow-perf-progress-section">
						<div class="taskflow-perf-progress-header">
							<span>Task Completion Progress</span>
							<span>${done}/${totalM}</span>
						</div>
						<div class="taskflow-progress-bg perf-bg" style="height: 10px;">
							<div class="taskflow-progress-fill perf-fill" style="width: ${rate}%;"></div>
						</div>
					</div>
				</div>
			`;
			})
			.join("");

		refs.dashboardView.innerHTML = `
			<div class="taskflow-dashboard-grid">
				${stats
					.map(
						(s) => `
					<div class="taskflow-widget-card">
						<span class="taskflow-widget-label">${s.label}</span>
						<span class="taskflow-widget-value" style="color: ${s.color}">${s.value}</span>
						<div class="taskflow-widget-footer">
							<span class="${getTrendClass(s.trend)}">${s.trend}</span> vs last week
						</div>
					</div>
				`,
					)
					.join("")}
			</div>

			<div class="taskflow-dashboard-charts">
				<div class="taskflow-chart-card">
					<div class="taskflow-chart-header">
						<h3 class="taskflow-chart-title">Status Distribution</h3>
						<button class="taskflow-btn-ghost" type="button" aria-label="More chart actions" disabled>⋯</button>
					</div>
					<div class="taskflow-progress-list">
						${statusBreakdown
							.map(
								(b) => `
							<div class="taskflow-progress-item">
								<div class="taskflow-progress-meta">
									<span>${escapeHtml(b.status)}</span>
									<span>${b.count} tasks (${b.percent}%)</span>
								</div>
								<div class="taskflow-progress-bg">
									<div class="taskflow-progress-fill" style="width: ${b.percent}%; background: ${getStatusColor(b.status)}"></div>
								</div>
							</div>
						`,
							)
							.join("")}
					</div>
				</div>

				<div class="taskflow-chart-card">
					<div class="taskflow-chart-header">
						<h3 class="taskflow-chart-title">Project Health</h3>
					</div>
					<div style="font-size: 13px; color: var(--taskflow-text-muted); margin-bottom: 24px;">Resource allocation and efficiency overview.</div>
					<div class="taskflow-progress-list">
						<div class="taskflow-progress-item">
							<div class="taskflow-progress-meta"><span>Resource Load</span><span>Optimal</span></div>
							<div class="taskflow-progress-bg"><div class="taskflow-progress-fill" style="width: 65%; background: #3b82f6"></div></div>
						</div>
						<div class="taskflow-progress-item">
							<div class="taskflow-progress-meta"><span>Timeline Adherence</span><span>92%</span></div>
							<div class="taskflow-progress-bg"><div class="taskflow-progress-fill" style="width: 92%; background: #10b981"></div></div>
						</div>
					</div>
				</div>
			</div>

			<div style="display: flex; align-items: center; gap: 8px; margin: 32px 0 16px;">
				<h3 style="margin: 0; font-size: 18px; font-weight: 700;">Assignee Performance</h3>
				<span style="color: var(--taskflow-text-muted); font-size: 14px; cursor: help;">ⓘ</span>
			</div>
			<div class="taskflow-perf-list">
				${performanceCardsHtml || '<div class="taskflow-empty">No team members assigned to this project.</div>'}
			</div>
		`;
	}

	function getStatusColor(status) {
		const colors = {
			Open: "#64748b",
			"In Progress": "#3b82f6",
			Review: "#f59e0b",
			"On Hold": "#ef4444",
			Completed: "#10b981",
			Cancelled: "#94a3b8",
			Overdue: "#dc2626",
		};
		return colors[status] || "#cbd5e1";
	}

	function getStatusClass(status) {
		if (!status) return "";
		return "status-" + status.toLowerCase().replace(/\s+/g, "-");
	}

	function getStatusBadge(status) {
		const statusClass = getStatusClass(status);
		return `<span class="taskflow-status-capsule ${statusClass}">${escapeHtml(status || "")}</span>`;
	}

	function renderBoard(tasks) {
		if (!refs.board) return;
		const canAddTask = canCreateTask();
		refs.board.innerHTML = getStatusColumns()
			.map((status) =>
				renderColumn(
					status,
					tasks.filter((task) => task.status === status),
					canAddTask,
				),
			)
			.join("");

		refs.board.querySelectorAll("[data-task-edit]").forEach((button) => {
			button.addEventListener("click", () => {
				if (state.suppressTaskClick) return;
				const task = findTask(button.dataset.taskEdit);
				if (task) openTaskModal(task);
			});
		});

		refs.board.querySelectorAll("[data-add-task-inline]").forEach((button) => {
			button.addEventListener("click", () => {
				const column = button.closest(".taskflow-column");
				const status = column ? column.dataset.status : null;
				openTaskModal(null, status);
			});
		});

		refs.board.querySelectorAll("[data-task-status-change]").forEach((select) => {
			select.addEventListener("change", async (e) => {
				const taskName = select.dataset.taskStatusChange;
				const nextStatus = e.target.value;
				if (taskName && nextStatus) {
					await moveTaskToPosition(taskName, nextStatus, null);
				}
			});
			select.addEventListener("click", (e) => e.stopPropagation());
			select.addEventListener("mousedown", (e) => e.stopPropagation());
		});

		bindBoardDragAndDrop();
	}

	function bindBoardDragAndDrop() {
		if (!refs.board) return;

		refs.board.querySelectorAll("[data-task-card]").forEach((card) => {
			if (card.draggable !== true) return;

			card.addEventListener("dragstart", (event) => {
				event.stopPropagation(); // Prevent column dragging
				state.draggedTaskName = card.dataset.taskCard;
				card.classList.add("taskflow-card-dragging");
				card.setAttribute("aria-grabbed", "true");
				event.dataTransfer.effectAllowed = "move";
				event.dataTransfer.setData("text/plain", state.draggedTaskName);

				document.body.classList.add("taskflow-dragging");
			});

			card.addEventListener("dragend", () => {
				card.classList.remove("taskflow-card-dragging");
				card.setAttribute("aria-grabbed", "false");
				document.body.classList.remove("taskflow-dragging");

				refs.board.querySelectorAll(".taskflow-column-drop-target").forEach((column) => {
					column.classList.remove("taskflow-column-drop-target");
					delete column.dataset.dragCounter;
				});
				refs.board.querySelectorAll(".taskflow-card-drop-target").forEach((c) => {
					c.classList.remove("taskflow-card-drop-target");
				});

				state.draggedTaskName = null;
				state.suppressTaskClick = true;
				window.setTimeout(() => {
					state.suppressTaskClick = false;
				}, 100);
			});

			card.addEventListener("dragover", (event) => {
				if (!state.draggedTaskName || state.draggedTaskName === card.dataset.taskCard)
					return;
				event.preventDefault();
				event.stopPropagation();
				card.classList.add("taskflow-card-drop-target");
			});

			card.addEventListener("dragleave", (event) => {
				card.classList.remove("taskflow-card-drop-target");
			});

			card.addEventListener("drop", async (event) => {
				if (!state.draggedTaskName || state.draggedTaskName === card.dataset.taskCard)
					return;
				event.preventDefault();
				event.stopPropagation();
				card.classList.remove("taskflow-card-drop-target");

				const draggedTaskName = state.draggedTaskName;
				const targetTaskName = card.dataset.taskCard;
				const column = card.closest("[data-status]");
				const nextStatus = column ? column.dataset.status : null;

				if (draggedTaskName && nextStatus) {
					await moveTaskToPosition(draggedTaskName, nextStatus, targetTaskName);
				}
			});
		});

		refs.board.querySelectorAll("[data-status]").forEach((column) => {
			column.addEventListener("dragstart", (event) => {
				if (state.draggedTaskName) return; // Already dragging a task

				state.draggedStatus = column.dataset.status;
				column.classList.add("taskflow-column-dragging");
				event.dataTransfer.effectAllowed = "move";
				event.dataTransfer.setData("text/kanban-status", state.draggedStatus);

				document.body.classList.add("taskflow-dragging");
			});

			column.addEventListener("dragend", () => {
				column.classList.remove("taskflow-column-dragging");
				document.body.classList.remove("taskflow-dragging");

				refs.board.querySelectorAll(".taskflow-column-drop-target").forEach((col) => {
					col.classList.remove("taskflow-column-drop-target");
					delete col.dataset.dragCounter;
				});

				state.draggedStatus = null;
			});

			column.addEventListener("dragover", (event) => {
				if (state.draggedTaskName) {
					const task = findTask(state.draggedTaskName);
					if (!task || !canUpdateTaskStatus(task)) return;
					event.preventDefault();
					event.dataTransfer.dropEffect = "move";
				} else if (state.draggedStatus) {
					event.preventDefault();
					event.dataTransfer.dropEffect = "move";
				}
			});

			column.addEventListener("dragenter", (event) => {
				if (state.draggedTaskName) {
					const task = findTask(state.draggedTaskName);
					if (!task || !canUpdateTaskStatus(task)) return;

					event.preventDefault();
					let counter = parseInt(column.dataset.dragCounter || "0", 10);
					counter++;
					column.dataset.dragCounter = counter;

					if (counter === 1) {
						column.classList.add("taskflow-column-drop-target");
					}
				} else if (state.draggedStatus && state.draggedStatus !== column.dataset.status) {
					event.preventDefault();
					column.classList.add("taskflow-column-drop-target");
				}
			});

			column.addEventListener("dragleave", (event) => {
				if (state.draggedTaskName) {
					let counter = parseInt(column.dataset.dragCounter || "0", 10);
					counter--;
					column.dataset.dragCounter = counter;

					if (counter <= 0) {
						column.classList.remove("taskflow-column-drop-target");
						delete column.dataset.dragCounter;
					}
				} else if (state.draggedStatus) {
					column.classList.remove("taskflow-column-drop-target");
				}
			});

			column.addEventListener("drop", async (event) => {
				event.preventDefault();
				column.classList.remove("taskflow-column-drop-target");
				delete column.dataset.dragCounter;

				if (state.draggedTaskName) {
					const taskName =
						event.dataTransfer.getData("text/plain") || state.draggedTaskName;
					const nextStatus = column.dataset.status;
					if (taskName && nextStatus) {
						await moveTaskToPosition(taskName, nextStatus, null);
					}
				} else if (state.draggedStatus) {
					const targetStatus = column.dataset.status;
					if (state.draggedStatus !== targetStatus) {
						reorderStatuses(state.draggedStatus, targetStatus);
					}
				}
			});
		});
	}

	function renderList(tasks) {
		if (!refs.listView) return;

		state.currentTasks = tasks;
		state.listTable = state.listTable || {
			sortKey: "modified",
			sortDirection: "desc",
			rowHeight: LIST_ROW_HEIGHT,
			bufferRows: LIST_BUFFER_ROWS,
			rafId: 0,
			resizeBound: false,
		};

		state.listTable.tasks = sortTasksForList(tasks);

		refs.listView.innerHTML = `
			<div class="taskflow-super-table-shell">
				<div class="taskflow-super-table-bar">
					<div class="taskflow-super-table-summary">
						<strong data-task-table-count>${state.listTable.tasks.length}</strong>
						<span>tasks</span>
					</div>
					<div class="taskflow-super-table-status" data-task-table-range></div>
				</div>
				<div class="taskflow-super-table-scroll" data-task-table-scroll>
					<table class="taskflow-super-table">
						<thead>
							<tr>
								${LIST_COLUMNS.map(
									(column) => `
									<th>
										<button type="button" class="taskflow-super-sort" data-sort-key="${column.key}" aria-sort="none">
											<span>${escapeHtml(column.label)}</span>
											<span class="taskflow-super-sort-icon">${getSortIndicator(column.key)}</span>
										</button>
									</th>
								`,
								).join("")}
							</tr>
						</thead>
						<tbody data-task-table-body></tbody>
					</table>
				</div>
			</div>
		`;

		refs.listScroll = refs.listView.querySelector("[data-task-table-scroll]");
		refs.listBody = refs.listView.querySelector("[data-task-table-body]");
		refs.listRange = refs.listView.querySelector("[data-task-table-range]");
		refs.listSortButtons = refs.listView.querySelectorAll("[data-sort-key]");

		if (refs.listScroll) {
			refs.listScroll.addEventListener("scroll", scheduleListRender, { passive: true });
		}

		refs.listSortButtons.forEach((button) => {
			button.addEventListener("click", () => setListSort(button.dataset.sortKey));
		});

		refs.listBody?.addEventListener("click", handleListRowActivation);
		refs.listBody?.addEventListener("keydown", handleListRowKeydown);

		if (!state.listTable.resizeBound) {
			window.addEventListener("resize", scheduleListRender);
			state.listTable.resizeBound = true;
		}

		scheduleListRender();
	}

	function setListSort(sortKey) {
		if (!state.listTable || !sortKey) return;

		if (state.listTable.sortKey === sortKey) {
			state.listTable.sortDirection =
				state.listTable.sortDirection === "asc" ? "desc" : "asc";
		} else {
			state.listTable.sortKey = sortKey;
			state.listTable.sortDirection = getDefaultListSortDirection(sortKey);
		}

		renderList(state.currentTasks || []);
	}

	function isDateSort(key) {
		return ["modified", "start_date", "due_date", "completed_date", "age"].includes(key);
	}

	function getDefaultListSortDirection(sortKey) {
		return ["modified", "start_date", "due_date", "completed_date", "age"].includes(sortKey)
			? "desc"
			: "asc";
	}

	function getSortIndicator(sortKey) {
		if (!state.listTable || state.listTable.sortKey !== sortKey) return "↕";
		return state.listTable.sortDirection === "asc" ? "↑" : "↓";
	}

	function scheduleListRender() {
		if (!state.listTable) return;
		if (state.listTable.rafId) return;

		state.listTable.rafId = window.requestAnimationFrame(() => {
			state.listTable.rafId = 0;
			renderListViewport();
		});
	}

	function renderListViewport() {
		if (!refs.listScroll || !refs.listBody || !state.listTable) return;

		const tasks = state.listTable.tasks || [];
		const total = tasks.length;

		if (!total) {
			refs.listBody.innerHTML = `
				<tr class="taskflow-super-empty-row">
					<td colspan="${LIST_COLUMN_COUNT}">
						<div class="taskflow-empty" style="margin: 24px 0;">No tasks found.</div>
					</td>
				</tr>
			`;
			if (refs.listRange) refs.listRange.textContent = "0 tasks";
			syncListSortState();
			return;
		}

		const rowHeight = state.listTable.rowHeight || LIST_ROW_HEIGHT;
		const bufferRows = state.listTable.bufferRows || LIST_BUFFER_ROWS;
		const viewportHeight = Math.max(refs.listScroll.clientHeight || 0, rowHeight * 8);
		const visibleCount = Math.ceil(viewportHeight / rowHeight) + bufferRows * 2;
		const scrollTop = refs.listScroll.scrollTop || 0;
		const start = Math.max(0, Math.floor(scrollTop / rowHeight) - bufferRows);
		const end = Math.min(total, start + visibleCount);
		const topSpacer = start * rowHeight;
		const bottomSpacer = Math.max(0, (total - end) * rowHeight);

		refs.listBody.innerHTML = `
			${topSpacer > 0 ? renderListSpacerRow(topSpacer) : ""}
			${tasks
				.slice(start, end)
				.map((task, index) => renderListRow(task, start + index))
				.join("")}
			${bottomSpacer > 0 ? renderListSpacerRow(bottomSpacer) : ""}
		`;

		if (refs.listRange) {
			refs.listRange.textContent = `${start + 1}-${end} of ${total}`;
		}

		syncListSortState();
	}

	function syncListSortState() {
		if (!refs.listSortButtons || !state.listTable) return;
		refs.listSortButtons.forEach((button) => {
			const active = button.dataset.sortKey === state.listTable.sortKey;
			button.setAttribute(
				"aria-sort",
				active
					? state.listTable.sortDirection === "asc"
						? "ascending"
						: "descending"
					: "none",
			);
			button.classList.toggle("is-active", active);
		});
	}

	function updateKpiHighlights() {
		if (!refs.projectKpis) return;
		const hasActiveFilter = state.selectedStatuses && state.selectedStatuses.length > 0;

		// Remove existing clear button if any
		const existingClear = refs.projectKpis.querySelector(".taskflow-kpi-clear");
		if (existingClear) existingClear.remove();

		const statusColors = {
			Completed: "#10b981",
			"In Progress": "#3b82f6",
			Review: "#8b5cf6",
			"On Hold": "#f59e0b",
			Open: "#ef4444",
			Cancelled: "#6b7280",
			Overdue: "#b91c1c",
		};

		refs.projectKpis.querySelectorAll("[data-kpi-status]").forEach((card) => {
			const status = card.dataset.kpiStatus;
			const isActive = state.selectedStatuses && state.selectedStatuses.includes(status);
			const color = statusColors[status] || "#6b7280";

			card.style.opacity = hasActiveFilter ? (isActive ? "1" : "0.5") : "1";
			card.style.border = isActive
				? `2px solid ${color}`
				: "1px solid var(--taskflow-border, #e2e8f0)";
			card.style.background = isActive ? "#ffffff" : "#f8fafc";
			card.style.boxShadow = isActive
				? "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)"
				: "none";
		});

		// Add clear button if needed
		if (hasActiveFilter) {
			const clearBtn = document.createElement("button");
			clearBtn.className = "taskflow-kpi-clear";
			clearBtn.type = "button";
			clearBtn.style.cssText = `
				display: inline-flex;
				align-items: center;
				padding: 4px 10px;
				border-radius: 8px;
				border: 1px dashed #ef4444;
				background: #fef2f2;
				color: #ef4444;
				font-size: 12px;
				font-weight: 600;
				cursor: pointer;
				transition: all 0.2s ease;
				margin-left: auto;
			`;
			clearBtn.innerHTML = "Clear filter ✕";
			clearBtn.addEventListener("click", () => {
				state.selectedStatuses = [];
				localStorage.removeItem("taskflow_filter_statuses");
				updateKpiHighlights();
				refreshView();
			});
			refs.projectKpis.appendChild(clearBtn);
		}
	}

	function renderListSpacerRow(height) {
		return `<tr class="taskflow-super-spacer" aria-hidden="true"><td colspan="${LIST_COLUMN_COUNT}" style="height:${height}px; padding:0; border:none;"></td></tr>`;
	}

	function renderListRow(task, index) {
		const taskName = task.task_title || "";
		const projectTitle = task.project_title || task.project || "No Project";
		const age = getTaskAgeDays(task);
		const priority = task.priority || "Medium";
		const modified = prettyDate(task.modified) || "Just now";
		const rowLabel = `${taskName || "Task"}${projectTitle ? `, ${projectTitle}` : ""}`;

		const assignees = task._assign || [];
		let assigneeHtml = "";
		if (assignees.length > 0) {
			assigneeHtml = `
				<div class="taskflow-super-avatars-group" style="display: flex; align-items: center;">
					${assignees
						.map((email, idx) => {
							const member = (state.bootstrap?.team_members || []).find(
								(m) => m.user === email,
							);
							const name = member ? member.label : email;
							const img = member ? member.user_image : null;
							const initialsText = initials(name);
							const offset = idx > 0 ? "margin-left: -8px;" : "";
							return `
							<span class="taskflow-super-avatar" title="${escapeHtml(name)}" style="${offset} width: 24px; height: 24px; font-size: 8px; border: 1.5px solid #fff; box-shadow: 0 1px 3px rgba(0,0,0,0.1); border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; background: linear-gradient(135deg, #4f6ef7, #a78bfa); color: #fff; overflow: hidden; flex-shrink: 0;">
								${img ? `<img src="${escapeHtml(img)}" alt="" style="width: 100%; height: 100%; object-fit: cover;" />` : escapeHtml(initialsText)}
							</span>
						`;
						})
						.join("")}
				</div>
			`;
		} else {
			const name = capitalizeName(task.assigned_to_name || "Unassigned");
			const img = task.assigned_to_image;
			const initialsText = initials(name);
			assigneeHtml = `
				<div class="taskflow-super-assignee">
					<span class="taskflow-super-avatar" title="${escapeHtml(name)}" style="width: 24px; height: 24px; font-size: 8px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; background: linear-gradient(135deg, #4f6ef7, #a78bfa); color: #fff; overflow: hidden; flex-shrink: 0;">
						${img ? `<img src="${escapeHtml(img)}" alt="" style="width: 100%; height: 100%; object-fit: cover;" />` : escapeHtml(initialsText)}
					</span>
				</div>
			`;
		}

		return `
			<tr class="taskflow-super-row" data-task-row="${escapeHtml(task.name)}" tabindex="0" role="button" aria-label="${escapeHtml(`Open ${rowLabel}`)}">
				<td class="taskflow-super-cell taskflow-super-cell--center taskflow-super-cell--index">${escapeHtml(String(index + 1))}</td>
				<td class="taskflow-super-cell taskflow-super-cell--task">
					<div class="taskflow-super-task">
						<div class="taskflow-super-task-title">${escapeHtml(taskName)}</div>
						<div class="taskflow-super-task-meta">${escapeHtml(task.task_type || "Task")}</div>
					</div>
				</td>
				<td class="taskflow-super-cell">${escapeHtml(projectTitle)}</td>
				<td class="taskflow-super-cell">
					${assigneeHtml}
				</td>
				<td class="taskflow-super-cell taskflow-super-cell--center">${getStatusBadge(task.status)}</td>
				<td class="taskflow-super-cell taskflow-super-cell--center">${escapeHtml(formatDate(task.start_date))}</td>
				<td class="taskflow-super-cell taskflow-super-cell--center">${escapeHtml(formatDate(task.due_date))}</td>
				<td class="taskflow-super-cell taskflow-super-cell--center">${escapeHtml(formatDate(task.completed_date))}</td>
				<td class="taskflow-super-cell taskflow-super-cell--center">${escapeHtml(String(age))}</td>
				<td class="taskflow-super-cell taskflow-super-cell--center"><span class="taskflow-super-pill priority-${slugify(priority)}">${escapeHtml(priority)}</span></td>
				<td class="taskflow-super-cell taskflow-super-cell--muted">${escapeHtml(modified)}</td>
				<td class="taskflow-super-cell taskflow-super-cell--center">${escapeHtml(task.task_type || "Task")}</td>
			</tr>
		`;
	}

	function handleListRowActivation(event) {
		const row = event.target.closest("[data-task-row]");
		if (!row) return;
		if (event.target.closest("button, a, input, select, textarea")) return;
		const task = findTask(row.dataset.taskRow);
		if (task) openTaskModal(task);
	}

	function handleListRowKeydown(event) {
		if (event.key !== "Enter" && event.key !== " ") return;
		const row = event.target.closest("[data-task-row]");
		if (!row) return;
		event.preventDefault();
		const task = findTask(row.dataset.taskRow);
		if (task) openTaskModal(task);
	}

	function getTaskAgeDays(task) {
		if (!task || !task.start_date) return 0;
		const startDate = parseDateValue(task.start_date);
		if (!startDate) return 0;
		// Use local midnight for today so we compare at the same boundary
		const today = new Date();
		const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
		const diff = todayMidnight - startDate;
		return diff < 0 ? 0 : Math.floor(diff / (1000 * 60 * 60 * 24));
	}

	function getListSortValue(task, sortKey) {
		switch (sortKey) {
			case "task_title":
				return String(task.task_title || "").toLowerCase();
			case "project_title":
				return String(task.project_title || task.project || "").toLowerCase();
			case "assigned_to_name":
				return String(task.assigned_to_name || "Unassigned").toLowerCase();
			case "status": {
				const index = STATUS_COLUMNS.indexOf(task.status);
				return index === -1 ? 999 : index;
			}
			case "start_date":
				return parseDateValue(task.start_date)?.getTime() || 0;
			case "due_date":
				return parseDateValue(task.due_date)?.getTime() || 0;
			case "completed_date":
				return parseDateValue(task.completed_date)?.getTime() || 0;
			case "age":
				return getTaskAgeDays(task);
			case "priority": {
				const priorities = { low: 1, medium: 2, high: 3, critical: 4 };
				return priorities[String(task.priority || "").toLowerCase()] || 999;
			}
			case "modified":
				return parseDateValue(task.modified)?.getTime() || 0;
			case "task_type":
				return String(task.task_type || "Task").toLowerCase();
			default:
				return String(task[sortKey] || "").toLowerCase();
		}
	}

	function compareListTasks(a, b, sortKey, direction) {
		const left = getListSortValue(a, sortKey);
		const right = getListSortValue(b, sortKey);
		if (left === right) return 0;
		const isAscending = direction === "asc";
		if (typeof left === "string" || typeof right === "string") {
			return left.toString().localeCompare(right.toString()) * (isAscending ? 1 : -1);
		}
		return (left > right ? 1 : -1) * (isAscending ? 1 : -1);
	}

	function sortTasksForList(tasks) {
		const list = [...(tasks || [])];
		const sortKey = state.listTable ? state.listTable.sortKey : "modified";
		const direction = state.listTable ? state.listTable.sortDirection : "desc";
		list.sort((a, b) => compareListTasks(a, b, sortKey, direction));
		return list;
	}

	function renderColumn(status, tasks, canAddTask) {
		const dotColor = getStatusColor(status);
		const sortedTasks = [...tasks].sort(
			(a, b) => Number(a.sequence || 0) - Number(b.sequence || 0),
		);
		return `
			<section class="taskflow-column" data-status="${escapeHtml(status)}" draggable="true">
				<div class="taskflow-column-header">
					<div class="taskflow-column-title-box">
						<span class="taskflow-status-dot" style="background: ${dotColor}"></span>
						<span class="taskflow-column-name">${escapeHtml(status)}</span>
						<span class="taskflow-task-count">${tasks.length}</span>
					</div>
					<button class="taskflow-btn-ghost" type="button" aria-label="More column actions" disabled>⋯</button>
				</div>
				${canAddTask ? '<button class="taskflow-add-task-inline" type="button" data-add-task-inline>+ Add Task</button>' : ""}
				<div class="taskflow-task-list">
					${sortedTasks.length ? sortedTasks.map(renderTaskCard).join("") : ""}
				</div>
			</section>
		`;
	}

	function renderTaskCard(task) {
		const draggable = canUpdateTaskStatus(task);
		const projectTitle = task.project_title || task.project || "No Project";
		const statuses = getStatusColumns();
		const statusOptions = statuses
			.map(
				(s) =>
					`<option value="${escapeHtml(s)}" ${s === task.status ? "selected" : ""}>${escapeHtml(s)}</option>`,
			)
			.join("");

		return `
			<article class="taskflow-card ${draggable ? "taskflow-card-draggable" : ""}" data-task-card="${escapeHtml(task.name)}" data-task-edit="${escapeHtml(task.name)}" draggable="${draggable ? "true" : "false"}" aria-grabbed="false">
				<div class="taskflow-card-header">
					<div class="taskflow-card-project">${escapeHtml(projectTitle)}</div>
					<select class="taskflow-card-status-select" data-task-status-change="${escapeHtml(task.name)}">
						${statusOptions}
					</select>
				</div>
				<div class="taskflow-card-title">${escapeHtml(task.task_title)}</div>
				<div class="taskflow-card-footer">
					<div class="taskflow-card-meta">
						<div class="taskflow-assignee-avatar" title="${escapeHtml(task.assigned_to || "Unassigned")}">
							${task.assigned_to_image ? `<img src="${task.assigned_to_image}" alt="" style="width: 100%; height: 100%; object-fit: cover;">` : initials(task.assigned_to || "UA")}
						</div>
						<div class="taskflow-date-pill">
							<span>📅</span> ${formatDate(task.due_date)}
						</div>
					</div>
					<div class="taskflow-priority-pill priority-${slugify(task.priority)}">
						${escapeHtml(task.priority)}
					</div>
				</div>
			</article>
		`;
	}

	function openProjectModal(project) {
		state.projectModalMode = project ? "edit" : "create";
		refs.projectFormTitle.textContent = project ? "Edit Project" : "Create Project";

		const submitBtn = refs.projectForm.querySelector('button[type="submit"]');
		if (submitBtn) submitBtn.textContent = project ? "Save Changes" : "Create Project";

		refs.projectForm.reset();
		const form = refs.projectForm;
		form.elements.name.value = project ? project.name : "";
		form.elements.project_name.value = project ? project.project_name : "";
		// form.elements.project_code.value = project ? project.project_code : "";
		form.elements.team.innerHTML = buildTeamOptions(project ? project.team : "");
		form.elements.status.value = project ? project.status : "Draft";
		form.elements.priority.value = project ? project.priority : "Medium";
		form.elements.start_date.value = dateInputValue(project ? project.start_date : "");
		form.elements.end_date.value = dateInputValue(project ? project.end_date : "");
		form.elements.expected_hours.value = project ? project.expected_hours || "" : "";
		form.elements.completion_percent.value = project ? project.completion_percent || 0 : 0;
		form.elements.project_lead.innerHTML = buildMemberOptions(
			project ? project.team : null,
			project ? project.project_lead : "",
		);
		form.elements.description.value = project ? stripHtml(project.description || "") : "";
		syncProjectDatepickers(form);
		toggleModal(refs.projectModal, true);
	}

	async function openTaskModal(task, status = "") {
		if (!task) {
			const projSelect = document.getElementById("quickTaskProjectSelect");
			if (projSelect && state.bootstrap && state.bootstrap.projects) {
				const currentProjName =
					state.projectWorkspace && state.projectWorkspace.project
						? state.projectWorkspace.project.name
						: "";
				projSelect.innerHTML = state.bootstrap.projects
					.map(
						(p) =>
							`<option value="${p.name}" ${p.name === currentProjName ? "selected" : ""}>${p.project_name}</option>`,
					)
					.join("");

				populateQuickTaskAssignees();

				if (!projSelect.dataset.listenerBound) {
					projSelect.addEventListener("change", populateQuickTaskAssignees);
					projSelect.dataset.listenerBound = "1";
				}
			}

			const form = refs.taskFormQuick;
			if (form) {
				form.reset();
				if (form.elements.name) form.elements.name.value = "";
				if (form.elements.status) form.elements.status.value = status || "Open";
				if (form.elements.start_date) {
					const today = new Date();
					const yyyy = today.getFullYear();
					const mm = String(today.getMonth() + 1).padStart(2, "0");
					const dd = String(today.getDate()).padStart(2, "0");
					form.elements.start_date.value = `${yyyy}-${mm}-${dd}`;
				}
			}

			toggleModal(refs.taskModalQuick, true);

			// Pre-assign selected member when in My Tasks mode
			if (state.navMode === "my-tasks") {
				const activeEmployee = state.selectedMember || getCurrentUserEmployeeId();
				const memberObj = ((state.bootstrap && state.bootstrap.team_members) || []).find(
					(m) => String(m.employee) === String(activeEmployee),
				);
				if (memberObj && memberObj.user) {
					state.quickTaskAssignees = [memberObj.user];
				} else {
					state.quickTaskAssignees = [];
				}
			} else {
				state.quickTaskAssignees = [];
			}

			renderQuickAssigneeWidget();
			return;
		}

		const currentProject = state.projectWorkspace && state.projectWorkspace.project;

		let url = "/taskform";
		const params = new URLSearchParams();

		if (task) {
			params.set("task", task.name);
		}
		if (currentProject) {
			params.set("project", currentProject.name);
		}
		if (status) {
			params.set("status", status);
		}
		if (state.navMode) {
			params.set("return_mode", state.navMode);
		}
		if (state.taskView) {
			params.set("return_view", state.taskView);
		}

		url += "?" + params.toString();
		const iframeModal = document.querySelector("[data-task-detail-iframe-backdrop]");
		const iframe = document.getElementById("taskDetailIframe");
		if (iframeModal && iframe) {
			iframe.src = url;
			toggleModal(iframeModal, true);
		} else {
			window.location.href = url;
		}
	}

	function populateQuickTaskAssignees() {
		state.quickTaskAssignees = [];
		renderQuickAssigneeWidget();
	}

	function renderQuickAssigneeWidget() {
		const badgesContainer = document.getElementById("quickAssigneeBadges");
		const selectEl = document.getElementById("quickTaskAssignedToSelect");
		if (!badgesContainer || !selectEl || !state.bootstrap) return;

		const projSelect = document.getElementById("quickTaskProjectSelect");
		const selectedProjName = projSelect ? projSelect.value : "";
		const projectObj = (state.bootstrap.projects || []).find(
			(p) => p.name === selectedProjName,
		);
		const teamName = projectObj ? projectObj.team : "";

		const members = (state.bootstrap.team_members || []).filter((m) => m.team === teamName);

		// 1. Render currently selected assignees as badges
		badgesContainer.innerHTML = "";
		if (!state.quickTaskAssignees) state.quickTaskAssignees = [];
		state.quickTaskAssignees.forEach((email) => {
			const member = members.find((m) => m.user === email);
			const label = member ? member.label : email;
			const userImage = member ? member.user_image : null;
			const initialsText = initials(label);

			const badge = document.createElement("div");
			badge.className = "assignee-badge-item";
			badge.style.cssText =
				"display: flex; align-items: center; gap: 8px; padding: 6px 10px; border-radius: 8px; background: #f1f5f9; border: 1px solid #e2e8f0; margin-bottom: 4px;";
			badge.innerHTML = `
				<div class="avatar" style="width: 22px; height: 22px; font-size: 8px; border-radius: 50%; background: linear-gradient(135deg, #4f6ef7, #a78bfa); display: flex; align-items: center; justify-content: center; color: #fff; overflow: hidden; flex-shrink: 0;">
					${userImage ? `<img src="${userImage}" alt="" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.style.display='none'">` : initialsText}
				</div>
				<span class="assignee-badge-name" style="font-size: 12px; font-weight: 500; color: #334155; flex: 1;">${escapeHtml(label)}</span>
				<button class="assignee-badge-remove" type="button" data-email="${escapeHtml(email)}" style="background: none; border: none; color: #94a3b8; font-size: 14px; cursor: pointer; padding: 0 4px; line-height: 1;">✕</button>
			`;
			badgesContainer.appendChild(badge);
		});

		// Add event listeners to remove buttons
		badgesContainer.querySelectorAll(".assignee-badge-remove").forEach((btn) => {
			btn.addEventListener("click", () => {
				const email = btn.dataset.email;
				state.quickTaskAssignees = state.quickTaskAssignees.filter((e) => e !== email);
				renderQuickAssigneeWidget();
			});
		});

		// 2. Populate dropdown with team members NOT already selected
		const unselectedMembers = members.filter(
			(m) => !state.quickTaskAssignees.includes(m.user),
		);
		selectEl.innerHTML =
			'<option value="">Add Assignee...</option>' +
			unselectedMembers
				.map(
					(m) =>
						`<option value="${escapeHtml(m.user || "")}">${escapeHtml(m.label)}</option>`,
				)
				.join("");
		selectEl.value = "";
	}
	function updateAvatar(employeeId) {
		const avatarContainer = document.querySelector("[data-assigned-avatar-large]");
		const member = (state.bootstrap.team_members || []).find((m) => m.employee === employeeId);

		if (member && member.user_image) {
			avatarContainer.innerHTML = `<img src="${member.user_image}" alt="" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">`;
		} else {
			avatarContainer.innerHTML = initials(member ? member.label : "UA");
		}
	}

	function _populateAdvancedTaskForm(task, currentProject) {
		state.isPopulatingTaskForm = true;
		const form = refs.taskForm;
		const team = task.team || (currentProject ? currentProject.team : "");

		const setVal = (name, val) => {
			if (form.elements[name]) form.elements[name].value = val || "";
		};

		setVal("name", task.name);
		setVal("project", task.project);
		setVal("team", team);
		setVal("task_title", task.task_title);
		setVal("status", task.status);
		setVal("priority", task.priority);
		setVal("task_type", task.task_type || "Task");

		if (form.elements.assigned_to) {
			form.elements.assigned_to.innerHTML = buildMemberOptions(team, task.assigned_to);
		}

		setVal("start_date", dateInputValue(task.start_date));
		setVal("due_date", dateInputValue(task.due_date));
		setVal("completed_date", dateInputValue(task.completed_date));
		setVal("estimated_hours", task.estimated_hours || "");
		syncTaskDatepickers(form);
		setVal("description", stripHtml(task.description || ""));
		// load into Quill
		if (window._taskDescEditor) {
			const raw = task.description || "";
			window._taskDescEditor.root.innerHTML = raw;
		}

		if (form.elements.is_milestone)
			form.elements.is_milestone.checked = Boolean(task.is_milestone);
		if (form.elements.is_blocked) form.elements.is_blocked.checked = Boolean(task.is_blocked);

		updateAvatar(task.assigned_to);
		if (form.elements.assigned_to) {
			form.elements.assigned_to.addEventListener("change", (e) => {
				updateAvatar(e.target.value);
				triggerAutoSave({ immediate: true });
			});
		}
		if (form.elements.task_type) {
			form.elements.task_type.addEventListener("change", (e) => {
				const typeBreadcrumb = document.querySelector("[data-task-type-breadcrumb]");
				if (typeBreadcrumb) {
					const val = e.target.value || "Task";
					typeBreadcrumb.textContent = val;
					typeBreadcrumb.style.display = val ? "inline-flex" : "none";
				}
			});
		}

		const idLabel = document.querySelector("[data-task-id-label]");
		if (idLabel)
			idLabel.textContent =
				task.name && task.name.includes("-")
					? task.name.split("-").pop()
					: task.name || "";

		const projectBreadcrumb = document.querySelector("[data-task-project-breadcrumb]");
		const typeBreadcrumb = document.querySelector("[data-task-type-breadcrumb]");
		if (projectBreadcrumb) {
			const projectText = task.project_title || task.project || "";
			projectBreadcrumb.textContent = projectText;
			projectBreadcrumb.style.display = projectText ? "inline-flex" : "none";
		}
		if (typeBreadcrumb) {
			const typeText = task.task_type || "Task";
			typeBreadcrumb.textContent = typeText;
			typeBreadcrumb.style.display = typeText ? "inline-flex" : "none";
		}

		state.currentChecklist = task.checklist || [];
		renderChecklist();
		renderComments(Array.isArray(task.comments) ? task.comments : []);
		// Re-fetch details logic should be triggered here if needed
		toggleModal(refs.taskModal, true);

		setTimeout(() => {
			state.isPopulatingTaskForm = false;
		}, 100);
	}

	function renderChecklist() {
		const list = document.querySelector("[data-checklist-list]");
		const countLabel = document.querySelector("[data-checklist-count]");
		const pendingContainer = document.querySelector("[data-pending-checklist-indicator]");
		if (!list) return;

		const items = state.currentChecklist;
		const pendingItems = items.filter((i) => !i.is_completed);

		if (countLabel) countLabel.textContent = `${items.length} items`;
		if (pendingContainer) {
			if (pendingItems.length > 0) {
				pendingContainer.innerHTML = `<span style="color: #ef4444; font-weight: 700; font-size: 12px; margin-left: 8px;">(${pendingItems.length} pending checklist items)</span>`;
			} else {
				pendingContainer.innerHTML = "";
			}
		}

		if (!items.length) {
			list.innerHTML =
				'<div class="taskflow-muted" style="font-size: 12px; padding: 12px; text-align: center;">No checklist items.</div>';
			return;
		}

		list.innerHTML = items
			.map(
				(item, index) => `
			<div class="taskflow-checklist-item ${item.is_completed ? "is-completed" : ""}">
				<label class="taskflow-checkbox-wrapper">
					<input type="checkbox" data-toggle-checklist-item="${index}" data-checklist-row-name="${escapeHtml(item.name || "")}" ${item.is_completed ? "checked" : ""}>
					<span class="taskflow-checkbox-custom"></span>
				</label>
				<input type="text" class="taskflow-checklist-input" data-edit-checklist-item="${index}" value="${escapeHtml(item.checklist_item)}" />
				<button class="taskflow-checklist-remove" type="button" data-remove-checklist-item="${index}" title="Remove item">&times;</button>
			</div>
		`,
			)
			.join("");
	}

	function addChecklistItem() {
		const input = document.querySelector("[data-new-checklist-item]");
		const value = input?.value.trim();
		if (!value) return;

		state.currentChecklist.push({
			checklist_item: value,
			is_completed: 0,
			sequence: (state.currentChecklist.length + 1) * 10,
		});

		input.value = "";
		renderChecklist();
		persistChecklistChanges({ immediate: true });
	}

	function removeChecklistItem(index) {
		state.currentChecklist.splice(index, 1);
		renderChecklist();
		persistChecklistChanges({ immediate: true });
	}

	async function toggleChecklistItem(index, checked) {
		const item = state.currentChecklist[index];
		console.log("[Taskflow Checklist] Toggle requested", {
			index,
			checked,
			itemFound: Boolean(item),
			item: item
				? { checklist_item: item.checklist_item, is_completed: item.is_completed }
				: null,
		});
		if (!item) return;

		const previousValue = item.is_completed;
		item.is_completed = checked ? 1 : 0;
		renderChecklist();

		try {
			await saveTaskChecklistToggle({
				task: refs.taskForm?.elements?.name?.value || null,
				index,
				row_name: item.name || null,
				checked: item.is_completed,
			});
		} catch (error) {
			item.is_completed = previousValue;
			renderChecklist();
		}
	}

	function updateChecklistItem(index, value, options = {}) {
		const item = state.currentChecklist[index];
		if (item) {
			item.checklist_item = value;
			if (options.persist) {
				persistChecklistChanges({ immediate: true });
			}
		}
	}

	function persistChecklistChanges(options = {}) {
		console.log("[Taskflow Checklist] Persist requested", {
			immediate: Boolean(options.immediate),
			task: refs.taskForm?.elements?.name?.value || null,
			status: refs.taskForm?.elements?.status?.value || null,
			checklist: state.currentChecklist.map((item, index) => ({
				index,
				checklist_item: item.checklist_item,
				is_completed: item.is_completed,
				sequence: item.sequence,
			})),
		});
		triggerChecklistAutoSave({ immediate: options.immediate });
	}

	function renderComments(comments) {
		const list = document.querySelector("[data-comment-list]");
		if (!list) return;

		if (!comments || !comments.length) {
			list.innerHTML =
				'<div class="taskflow-muted" style="text-align: center; padding: 16px;">No comments yet.</div>';
			return;
		}

		const currentUser = state.bootstrap && state.bootstrap.user && state.bootstrap.user.user;

		// Sort or reverse comments to ensure newest is at the bottom
		// Assuming the API returns newest first, we reverse it.
		const displayComments = [...comments].reverse();

		list.innerHTML = displayComments
			.map((c) => {
				const isMe = c.owner === currentUser;
				return `
				<div class="taskflow-comment-item ${isMe ? "is-me" : ""}">
					<div class="taskflow-assignee-avatar" style="width: 28px; height: 28px; font-size: 11px; flex-shrink: 0;">
						${c.author_image ? `<img src="${c.author_image}" alt="" style="width: 100%; height: 100%; object-fit: cover;">` : initials(c.author_name)}
					</div>
					<div class="taskflow-comment-content">
						<div class="taskflow-comment-header">
							<span class="taskflow-comment-author">${escapeHtml(isMe ? "You" : c.author_name)}</span>
							<span class="taskflow-comment-date">${prettyDate(c.creation)}</span>
						</div>
						<div class="taskflow-comment-text">${escapeHtml(c.content)}</div>
					</div>
				</div>
			`;
			})
			.join("");

		// Scroll to bottom immediately and after a short delay to ensure rendering is complete
		list.scrollTop = list.scrollHeight;
		setTimeout(() => {
			list.scrollTop = list.scrollHeight;
		}, 100);
	}

	async function postComment() {
		const form = refs.taskForm;
		const taskName = form.elements.name.value;
		const content = form.elements.new_comment.value.trim();

		if (!taskName || !content) return;

		const postButton = document.querySelector("[data-post-comment]");
		if (postButton) postButton.disabled = true;

		try {
			await apiCall(
				"add_task_comment",
				{ payload: JSON.stringify({ task: taskName, content: content }) },
				"POST",
			);
			form.elements.new_comment.value = "";

			// Refresh comments
			const details = await apiCall("get_task_details", { task: taskName });
			if (details && details.comments) {
				renderComments(details.comments);
			}
		} catch (error) {
			showMessage(error.message || "Unable to post comment.");
		} finally {
			if (postButton) postButton.disabled = false;
		}
	}

	function prettyDate(dateStr) {
		const date = parseDateValue(dateStr);
		if (!date) return "";

		const diff = (new Date().getTime() - date.getTime()) / 1000;
		const day_diff = Math.floor(diff / 86400);

		if (isNaN(day_diff) || day_diff < 0) return "";

		return (
			(day_diff == 0 &&
				((diff < 60 && "just now") ||
					(diff < 120 && "1 minute ago") ||
					(diff < 3600 && Math.floor(diff / 60) + " minutes ago") ||
					(diff < 7200 && "1 hour ago") ||
					(diff < 86400 && Math.floor(diff / 3600) + " hours ago"))) ||
			(day_diff == 1 && "Yesterday") ||
			(day_diff < 7 && day_diff + " days ago") ||
			(day_diff < 31 && Math.ceil(day_diff / 7) + " weeks ago") ||
			(day_diff < 365 && Math.ceil(day_diff / 30) + " months ago") ||
			Math.ceil(day_diff / 365) + " years ago"
		);
	}

	async function submitProjectForm(event) {
		event.preventDefault();
		const form = event.currentTarget;
		if (form.dataset.saving === "1") return;
		setFormSaving(form, true);
		try {
			await saveProject({
				name: form.elements.name.value || undefined,
				project_name: form.elements.project_name.value,
				// project_code: form.elements.project_code.value,
				team: form.elements.team.value,
				status: form.elements.status.value,
				priority: form.elements.priority.value,
				start_date: form.elements.start_date.value || null,
				end_date: form.elements.end_date.value || null,
				expected_hours: form.elements.expected_hours.value || 0,
				completion_percent: form.elements.completion_percent.value || 0,
				project_lead: form.elements.project_lead.value || null,
				description: form.elements.description.value || "",
			});
		} finally {
			setFormSaving(form, false);
		}
	}

	async function submitTaskForm(event) {
		event.preventDefault();
		const form = event.currentTarget;
		if (form.dataset.saving === "1") return;
		if (!validateTaskDates(form)) return;

		const submitBtn = form.querySelector('button[type="submit"]');
		const originalText = submitBtn.textContent;
		submitBtn.textContent = "Creating...";
		submitBtn.disabled = true;

		setFormSaving(form, true);
		try {
			// sync Quill content to hidden input
			if (
				window._taskDescEditor &&
				(form === refs.taskForm || form === refs.taskFormQuick)
			) {
				const hiddenDesc = form.querySelector('input[name="description"]');
				if (hiddenDesc) hiddenDesc.value = window._taskDescEditor.root.innerHTML;
			}
			const payload = getTaskFormPayload(form);
			// saveTask handles: closing modal, loadBootstrap, and setNavMode(returnMode)
			// so My Tasks view is automatically re-rendered after save
			await saveTask(payload);
		} finally {
			submitBtn.textContent = originalText;
			submitBtn.disabled = false;
			setFormSaving(form, false);
		}
	}

	function validateTaskDates(form) {
		const startDate = getFormValue(form, "start_date");
		const dueDate = getFormValue(form, "due_date");
		const completedDate = getFormValue(form, "completed_date");
		const status = getFormValue(form, "status");

		if (status === "Completed" && !completedDate) {
			showMessage("Completed Date is mandatory when marking a task as Completed.");
			return false;
		}

		if (startDate && dueDate) {
			const start = parseDateValue(startDate);
			const end = parseDateValue(dueDate);
			if (start && end && end < start) {
				showMessage("End Date cannot be earlier than Start Date.");
				return false;
			}
		}

		if (startDate && completedDate) {
			const start = parseDateValue(startDate);
			const completed = parseDateValue(completedDate);
			if (start && completed && completed < start) {
				showMessage("Completed Date cannot be earlier than Start Date.");
				return false;
			}
		}

		return true;
	}
	function getTaskFormPayload(form) {
		const assignSelect = form.querySelector("#quickTaskAssignedToSelect");
		let assignList = [];
		let primaryEmployee = null;
		if (assignSelect) {
			assignList = Array.from(assignSelect.selectedOptions)
				.map((opt) => opt.value)
				.filter(Boolean);
			if (assignList.length > 0) {
				const firstMember = (state.bootstrap.team_members || []).find(
					(m) => m.user === assignList[0],
				);
				if (firstMember) {
					primaryEmployee = firstMember.employee;
				}
			}
		}

		return {
			name: getFormValue(form, "name") || undefined,
			project:
				getFormValue(form, "project") ||
				(state.projectWorkspace && state.projectWorkspace.project
					? state.projectWorkspace.project.name
					: ""),
			team:
				getFormValue(form, "team") ||
				(state.projectWorkspace && state.projectWorkspace.project
					? state.projectWorkspace.project.team
					: ""),
			task_title: getFormValue(form, "task_title"),
			status: getFormValue(form, "status", "Open"),
			priority: getFormValue(form, "priority", "Medium"),
			task_type: getFormValue(form, "task_type", "Task"),
			assigned_to: (() => {
				if (state.quickTaskAssignees && state.quickTaskAssignees.length > 0) {
					const firstMember = (state.bootstrap?.team_members || []).find(
						(m) => m.user === state.quickTaskAssignees[0],
					);
					return firstMember ? firstMember.employee : null;
				}
				return null;
			})(),
			_assign: state.quickTaskAssignees || [],
			start_date: normalizeDateForPayload(getFormValue(form, "start_date")),
			due_date: normalizeDateForPayload(getFormValue(form, "due_date")),
			completed_date: normalizeDateForPayload(getFormValue(form, "completed_date")),
			estimated_hours: getFormValue(form, "estimated_hours", 0) || 0,
			sequence: getFormValue(form, "sequence") || null,
			description: getFormValue(form, "description", ""),
			is_milestone: getFormChecked(form, "is_milestone") ? 1 : 0,
			is_blocked: getFormChecked(form, "is_blocked") ? 1 : 0,
			checklist: state.currentChecklist,
		};
	}

	function triggerChecklistAutoSave(options = {}) {
		if (state.isPopulatingTaskForm) return;
		const form = refs.taskForm;
		if (!form || !form.elements.name.value) return;

		if (state.autoSaveTimer) clearTimeout(state.autoSaveTimer);

		const delay = options.immediate ? 0 : 1000;

		state.autoSaveTimer = setTimeout(async () => {
			const statusEl = document.querySelector("[data-task-save-status]");
			const textEl = document.querySelector("[data-task-save-text]");
			const iconEl = document.querySelector("[data-task-save-icon]");

			if (statusEl) {
				textEl.textContent = "Saving...";
				iconEl.classList.add("taskflow-hidden");
				iconEl.classList.remove("taskflow-save-icon-green");
				statusEl.style.opacity = "1";
			}

			const payload = {
				task: form.elements.name.value,
				status: getFormValue(form, "status", "Open"),
				checklist: state.currentChecklist,
			};
			console.log("[Taskflow Checklist] Auto-save payload", {
				task: payload.task || null,
				status: payload.status,
				checklist: payload.checklist,
			});
			await saveTaskChecklist(payload);

			if (statusEl) {
				textEl.textContent = "Saved";
				iconEl.textContent = "✓";
				iconEl.classList.add("taskflow-save-icon-green");
				iconEl.classList.remove("taskflow-hidden");

				setTimeout(() => {
					statusEl.style.opacity = "0";
				}, 2000);
			}
		}, delay);
	}

	function triggerAutoSave(options = {}) {
		if (state.isPopulatingTaskForm) return;
		const form = refs.taskForm;
		if (!form || !form.elements.name.value) return;

		if (state.autoSaveTimer) clearTimeout(state.autoSaveTimer);

		const delay = options.immediate ? 0 : 1000;

		state.autoSaveTimer = setTimeout(async () => {
			const statusEl = document.querySelector("[data-task-save-status]");
			const textEl = document.querySelector("[data-task-save-text]");
			const iconEl = document.querySelector("[data-task-save-icon]");

			if (statusEl) {
				textEl.textContent = "Saving...";
				iconEl.classList.add("taskflow-hidden");
				iconEl.classList.remove("taskflow-save-icon-green");
				statusEl.style.opacity = "1";
			}

			// sync Quill to hidden input
			if (window._taskDescEditor && form === refs.taskForm) {
				const hiddenDesc = refs.taskForm.querySelector('input[name="description"]');
				if (hiddenDesc) hiddenDesc.value = window._taskDescEditor.root.innerHTML;
			}

			const payload = getTaskFormPayload(form);
			await saveTask(payload, { isAutoSave: true });

			if (statusEl) {
				textEl.textContent = "Saved";
				iconEl.textContent = "✓";
				iconEl.classList.add("taskflow-save-icon-green");
				iconEl.classList.remove("taskflow-hidden");

				setTimeout(() => {
					statusEl.style.opacity = "0";
				}, 2000);
			}
		}, delay);
	}

	async function saveProject(payload) {
		try {
			const result = await apiCall(
				"save_project",
				{ payload: JSON.stringify(payload) },
				"POST",
			);
			closeModal("project");
			await loadBootstrap((result && result.name) || payload.name || state.selectedProject);
		} catch (error) {
			showMessage(error.message || "Unable to save project.");
		}
	}

	async function saveTask(payload, options = {}) {
		try {
			const returnMode = state.navMode;
			await apiCall("save_task", { payload: JSON.stringify(payload) }, "POST");
			if (options.isAutoSave) {
				console.log("[Taskflow Checklist] Auto-save success", {
					task: payload.name || null,
					checklistCount: Array.isArray(payload.checklist)
						? payload.checklist.length
						: 0,
				});
			}

			if (!options.isAutoSave) {
				closeModal("task");
				closeModal("task-quick");
			}

			await loadBootstrap(payload.project || state.selectedProject, { updateUrl: false });
			if (returnMode !== "dashboard") {
				setNavMode(returnMode);
				if (returnMode === "team") renderTeamView();
			} else {
				updateUrlState();
			}
		} catch (error) {
			if (!options.isAutoSave) {
				showMessage(error.message || "Unable to save task.");
			} else {
				console.error("[Taskflow Checklist] Auto-save failed", {
					task: payload.name || null,
					error: error?.message || error,
					status: error?.status || null,
					responsePayload: error?.responsePayload || null,
					checklist: payload.checklist,
				});
			}
		}
	}

	async function saveTaskChecklist(payload) {
		try {
			const result = await apiCall(
				"save_task_checklist",
				{ payload: JSON.stringify(payload) },
				"POST",
			);
			if (result && result.task) {
				replaceTaskInState(result.task);
				state.currentChecklist = Array.isArray(result.task.checklist)
					? result.task.checklist
					: state.currentChecklist;
				renderChecklist();
				refreshView();
			}
			console.log("[Taskflow Checklist] Auto-save success", {
				task: payload.task || null,
				checklistCount: Array.isArray(payload.checklist) ? payload.checklist.length : 0,
			});
		} catch (error) {
			console.error("[Taskflow Checklist] Auto-save failed", {
				task: payload.task || null,
				error: error?.message || error,
				status: error?.status || null,
				responsePayload: error?.responsePayload || null,
				checklist: payload.checklist,
			});
			throw error;
		}
	}

	async function saveTaskChecklistToggle(payload) {
		try {
			const result = await apiCall(
				"toggle_task_checklist_item",
				{ payload: JSON.stringify(payload) },
				"POST",
			);
			if (result && result.task) {
				replaceTaskInState(result.task);
				state.currentChecklist = Array.isArray(result.task.checklist)
					? result.task.checklist
					: state.currentChecklist;
				renderChecklist();
				refreshView();
			}
			console.log("[Taskflow Checklist] Toggle save success", {
				task: payload.task || null,
				row_name: payload.row_name || null,
				index: payload.index,
				checked: payload.checked,
			});
		} catch (error) {
			console.error("[Taskflow Checklist] Toggle save failed", {
				task: payload.task || null,
				row_name: payload.row_name || null,
				index: payload.index,
				checked: payload.checked,
				error: error?.message || error,
				status: error?.status || null,
				responsePayload: error?.responsePayload || null,
			});
			throw error;
		}
	}

	function closeModal(name) {
		if (name === "project") toggleModal(refs.projectModal, false);
		if (name === "task") closeTaskModal();
		if (name === "task-quick") toggleModal(refs.taskModalQuick, false);
	}

	async function closeIframeModal() {
		const iframeModal = document.querySelector("[data-task-detail-iframe-backdrop]");
		if (iframeModal && iframeModal.classList.contains("open")) {
			toggleModal(iframeModal, false);
			const iframe = document.getElementById("taskDetailIframe");
			if (iframe) iframe.src = "about:blank";
			await loadBootstrap(state.selectedProject, { updateUrl: false });
			await loadStateFromUrl({ updateUrl: false });
		}
	}
	window.closeIframeModal = closeIframeModal;

	function toggleModal(element, open) {
		if (!element) return;
		if (open) {
			element.classList.add("open");
			element.setAttribute("aria-hidden", "false");
			let focusTarget;
			if (element === refs.taskModal) {
				focusTarget = element.querySelector(".taskflow-modal");
			} else {
				focusTarget = element.querySelector(
					"input:not([type='hidden']), select, textarea, button",
				);
			}
			focusTarget?.focus();
		} else {
			element.classList.remove("open");
			element.setAttribute("aria-hidden", "true");
		}
	}

	function buildTeamOptions(selected) {
		return ((state.bootstrap && state.bootstrap.teams) || [])
			.map(
				(team) =>
					`<option value="${escapeHtml(team.name)}" ${team.name === selected ? "selected" : ""}>${escapeHtml(team.team_name)} (${escapeHtml(team.team_code)})</option>`,
			)
			.join("");
	}

	function buildMemberOptions(teamName, selected) {
		const members = ((state.bootstrap && state.bootstrap.team_members) || []).filter(
			(member) => member.team === teamName,
		);
		const options = ['<option value="">Not set</option>'];
		let selectedFound = !selected;
		members.forEach((member) => {
			if (member.employee === selected) selectedFound = true;
			options.push(
				`<option value="${escapeHtml(member.employee || "")}" ${member.employee === selected ? "selected" : ""}>${escapeHtml(member.label)}</option>`,
			);
		});
		if (!selectedFound) {
			options.push(
				`<option value="${escapeHtml(selected)}" selected>${escapeHtml(selected)}</option>`,
			);
		}
		return options.join("");
	}

	function findTask(name) {
		const workspaceTasks = (state.projectWorkspace && state.projectWorkspace.tasks) || [];
		const bootstrapTasks = (state.bootstrap && state.bootstrap.tasks) || [];
		const tasks = workspaceTasks.concat(bootstrapTasks);
		return tasks.find((task) => task.name === name);
	}

	function filterTasks(tasks) {
		const query = (state.taskQuery || "").trim().toLowerCase();
		if (!query) return tasks;
		return tasks.filter((task) => {
			const haystack = [
				task.task_title,
				task.project,
				task.assigned_to,
				task.status,
				task.priority,
				task.task_type,
				task.team,
			]
				.filter(Boolean)
				.join(" ")
				.toLowerCase();
			return haystack.includes(query);
		});
	}

	function normalizeTaskView(view) {
		return TASK_VIEWS.includes(view) ? view : "list";
	}

	function normalizeNavMode(mode) {
		return NAV_MODES.includes(mode) ? mode : null;
	}

	function getCurrentUserEmployeeId() {
		if (!state.bootstrap || !state.bootstrap.user) return null;
		const currentUserEmail = state.bootstrap.user.user;
		const member = ((state.bootstrap && state.bootstrap.team_members) || []).find(
			(m) => m.user === currentUserEmail,
		);
		return member ? member.employee : null;
	}

	function getHistoryState() {
		return {
			navMode: state.navMode,
			selectedProject: state.selectedProject,
			selectedTeam: state.selectedTeam,
			selectedMember: state.selectedMember,
			calendarProject: state.calendarProject,
			calendarMember: state.calendarMember,
			taskView: state.taskView,
		};
	}

	function normalizeSelectedTeam() {
		if (!state.bootstrap || state.selectedTeam === "all") return;
		const teamExists = state.bootstrap.teams.some((team) => team.name === state.selectedTeam);
		if (!teamExists) state.selectedTeam = "all";
	}

	function getVisibleProjects(options = {}) {
		let projects = (state.bootstrap && state.bootstrap.projects) || [];
		if (state.selectedTeam && state.selectedTeam !== "all") {
			projects = projects.filter((project) => project.team === state.selectedTeam);
		}
		if (!options.ignoreQuery && state.projectQuery) {
			const q = state.projectQuery.toLowerCase();
			projects = projects.filter((project) =>
				String(project.project_name || "")
					.toLowerCase()
					.includes(q),
			);
		}

		// Sort by pending count (descending), then alphabetically (ascending)
		projects.sort((a, b) => {
			const pendingA = a.open_tasks || 0;
			const pendingB = b.open_tasks || 0;
			if (pendingB !== pendingA) {
				return pendingB - pendingA;
			}
			return (a.project_name || "").localeCompare(b.project_name || "");
		});

		return projects;
	}

	function getStatusColumns() {
		const storedOrder = window.localStorage.getItem("taskflow_kanban_status_order");
		let defaultStatuses =
			state.bootstrap &&
			state.bootstrap.status_options &&
			state.bootstrap.status_options.length
				? state.bootstrap.status_options
				: STATUS_COLUMNS;

		if (storedOrder) {
			try {
				const order = JSON.parse(storedOrder);
				// Filter to ensure we only have valid statuses that still exist
				const filteredOrder = order.filter((s) => defaultStatuses.includes(s));
				// Add any new statuses that weren't in the stored order
				const newStatuses = defaultStatuses.filter((s) => !order.includes(s));
				return filteredOrder.concat(newStatuses);
			} catch (e) {
				console.error("Error parsing stored kanban order", e);
			}
		}
		return defaultStatuses;
	}

	function reorderStatuses(draggedStatus, targetStatus) {
		const statuses = getStatusColumns();
		const draggedIdx = statuses.indexOf(draggedStatus);
		const targetIdx = statuses.indexOf(targetStatus);

		if (draggedIdx === -1 || targetIdx === -1 || draggedIdx === targetIdx) return;

		statuses.splice(draggedIdx, 1);
		statuses.splice(targetIdx, 0, draggedStatus);

		window.localStorage.setItem("taskflow_kanban_status_order", JSON.stringify(statuses));
		refreshView();
	}

	function canCreateTask() {
		const project = state.projectWorkspace && state.projectWorkspace.project;
		if (!project) return false;
		// Allow any project member to create tasks
		return true;
	}

	function canUpdateTaskStatus(task) {
		return Boolean(task && task.permissions && task.permissions.can_write);
	}

	async function moveTaskToPosition(taskName, nextStatus, targetTaskName) {
		const task = findTask(taskName);
		if (!task || !nextStatus || !canUpdateTaskStatus(task)) return;

		const previousStatus = task.status;
		const previousSequence = task.sequence;

		// Deduplicate tasks from both sources
		const workspaceTasks = (state.projectWorkspace && state.projectWorkspace.tasks) || [];
		const bootstrapTasks = (state.bootstrap && state.bootstrap.tasks) || [];
		const tasksMap = new Map();
		bootstrapTasks.forEach((t) => tasksMap.set(t.name, t));
		workspaceTasks.forEach((t) => tasksMap.set(t.name, t));
		const allTasks = Array.from(tasksMap.values());
		const previousColumnTasks = allTasks
			.filter((t) => t.status === previousStatus && t.name !== taskName)
			.sort((a, b) => Number(a.sequence || 0) - Number(b.sequence || 0));

		// Optimistically update status
		task.status = nextStatus;

		// Get tasks in target column
		let columnTasks = allTasks
			.filter((t) => t.status === nextStatus && t.name !== taskName)
			.sort((a, b) => Number(a.sequence || 0) - Number(b.sequence || 0));

		// Find insertion index
		let targetIdx = columnTasks.findIndex((t) => t.name === targetTaskName);
		if (targetIdx === -1) {
			columnTasks.push(task);
		} else {
			columnTasks.splice(targetIdx, 0, task);
		}

		// Re-calculate sequences
		const newSequences = {};
		previousColumnTasks.forEach((t, idx) => {
			const newSeq = (idx + 1) * 10;
			t.sequence = newSeq;
			newSequences[t.name] = newSeq;
		});
		columnTasks.forEach((t, idx) => {
			const newSeq = (idx + 1) * 10;
			t.sequence = newSeq;
			newSequences[t.name] = newSeq;
		});

		refreshView();

		try {
			if (previousStatus !== nextStatus) {
				await apiCall(
					"save_task",
					{
						payload: JSON.stringify({
							name: taskName,
							status: nextStatus,
							sequence: newSequences[taskName] || task.sequence,
						}),
					},
					"POST",
				);
			}

			await apiCall(
				"update_task_sequences",
				{
					sequences: JSON.stringify(newSequences),
				},
				"POST",
			);

			updateTaskStatusInState(taskName, nextStatus);
			await loadBootstrap(state.selectedProject, { updateUrl: false });
			refreshView();
		} catch (error) {
			// Basic rollback (not perfect for bulk but better than nothing)
			task.status = previousStatus;
			task.sequence = previousSequence;
			refreshView();
			showMessage(error.message || "Unable to reorder tasks.");
		}
	}

	function updateTaskStatusInState(taskName, status) {
		const taskLists = [
			state.projectWorkspace && state.projectWorkspace.tasks,
			state.bootstrap && state.bootstrap.tasks,
		];

		taskLists.forEach((tasks) => {
			if (!Array.isArray(tasks)) return;
			tasks.forEach((task) => {
				if (task.name === taskName) task.status = status;
			});
		});
	}

	function replaceTaskInState(updatedTask) {
		const taskLists = [
			state.projectWorkspace && state.projectWorkspace.tasks,
			state.bootstrap && state.bootstrap.tasks,
		];

		taskLists.forEach((tasks) => {
			if (!Array.isArray(tasks)) return;
			const index = tasks.findIndex((task) => task.name === updatedTask.name);
			if (index !== -1) {
				tasks[index] = { ...tasks[index], ...updatedTask };
			}
		});
	}

	function renderActiveEmptyState(message) {
		const emptyHtml = `<div class="taskflow-empty">${escapeHtml(message)}</div>`;
		if (state.taskView === "kanban" && refs.board) {
			refs.board.innerHTML = emptyHtml;
		} else if (state.taskView === "timeline") {
			const grid = document.querySelector("[data-calendar-grid]");
			if (grid) grid.innerHTML = emptyHtml;
		} else if (state.taskView === "list" && refs.listView) {
			refs.listView.innerHTML = emptyHtml;
		} else if (state.taskView === "files" && refs.filesView) {
			refs.filesView.innerHTML = emptyHtml;
		} else if (state.taskView === "settings" && refs.settingsView) {
			refs.settingsView.innerHTML = emptyHtml;
		} else if (refs.dashboardView) {
			refs.dashboardView.innerHTML = emptyHtml;
		}
	}

	function renderSettingsView() {
		const target = refs.settingsView;
		if (!target) return;
		const project = state.projectWorkspace && state.projectWorkspace.project;
		if (!project) {
			target.innerHTML = `<div class="taskflow-empty">Select a project to manage settings.</div>`;
			return;
		}

		const members = project.project_team_members || [];
		const roles = [
			"Team Lead",
			"Project Manager",
			"Team Member",
			"Viewer",
			"Auditor",
			"Coordinator",
		];

		const description = project.description || "";
		const projectName = project.name || "";

		target.innerHTML = `
			<div class="taskflow-settings-section" data-attachment-section>
				<div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
					<h3 style="margin: 0;">Attachment</h3>
					<button class="taskflow-button secondary" type="button" data-edit-attachment>Edit</button>
				</div>
				<div data-attachment-display style="background: #f8fafc; border: 1px solid var(--taskflow-border); border-radius: 8px; padding: 16px;">
					<p style="margin: 0; color: #94a3b8; font-size: 13px;">Loading...</p>
				</div>
				<div data-attachment-edit style="display: none;">
					<div id="projectAttachmentDropzone" style="border: 2px dashed var(--taskflow-border); border-radius: 8px; padding: 24px; text-align: center; cursor: pointer; margin-bottom: 12px;">
						<p style="margin: 0; color: #64748b; font-size: 13px;">Drop files here or <span style="color: var(--taskflow-primary);">browse</span></p>
						<p style="margin: 4px 0 0; color: #94a3b8; font-size: 11px;">Any file type up to 25 MB</p>
					</div>
					<input type="file" id="projectFileInput" style="display: none;" multiple />
					<div id="projectAttachmentsList" style="display: flex; flex-direction: column; gap: 6px; margin-bottom: 12px;"></div>
					<div style="display: flex; gap: 8px; justify-content: flex-end;">
						<button class="taskflow-button secondary" type="button" data-cancel-attachment>Cancel</button>
						<button class="taskflow-button primary" type="button" data-save-attachment>Save</button>
					</div>
				</div>
			</div>

			<div class="taskflow-settings-section" data-description-section>
				<div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
					<h3 style="margin: 0;">Description</h3>
					<button class="taskflow-button secondary" type="button" data-edit-description>Edit</button>
				</div>
				<div data-description-display style="background: #f8fafc; border: 1px solid var(--taskflow-border); border-radius: 8px; padding: 16px;">
					<div style="color: #334155; font-size: 13px; line-height: 1.6;">${description || '<span style="color: #94a3b8;">No description yet.</span>'}</div>
				</div>
				<div data-description-edit style="display: none;">
					<div id="projectDescriptionEditor" style="background: white; border: 1px solid var(--taskflow-border); border-radius: 8px; min-height: 150px; margin-bottom: 12px;"></div>
					<div style="display: flex; gap: 8px; justify-content: flex-end;">
						<button class="taskflow-button secondary" type="button" data-cancel-description>Cancel</button>
						<button class="taskflow-button primary" type="button" data-save-description>Save</button>
					</div>
				</div>
			</div>

			<div class="taskflow-settings-section">
				<h3>Team Members</h3>
				<div class="taskflow-list-view">
					<table class="taskflow-table" style="width: 100%; border-collapse: collapse; background: white; border-radius: 12px; border: 1px solid var(--taskflow-border);">
						<thead style="background: #f8fafc;">
							<tr>
								<th style="padding: 12px; text-align: left;">Employee</th>
								<th style="padding: 12px; text-align: left;">Role</th>
								<th style="padding: 12px; text-align: left;">Actions</th>
							</tr>
						</thead>
						<tbody data-member-table-body>
							${members
								.map(
									(m, idx) => `
								<tr style="border-bottom: 1px solid var(--taskflow-border);">
									<td style="padding: 12px;">${escapeHtml(m.employee_name || m.employee)}</td>
									<td style="padding: 12px;">${escapeHtml(m.team_role)}</td>
									<td style="padding: 12px;">
										<button class="taskflow-button secondary" type="button" data-remove-member="${idx}">Remove</button>
									</td>
								</tr>
							`,
								)
								.join("")}
							<tr style="background: #f1f5f9;">
								<td style="padding: 12px; position: relative;">
									<input type="text" data-emp-search placeholder="Search Employee..." style="padding: 8px; width: 100%; border-radius: 4px; border: 1px solid var(--taskflow-border);">
									<div data-emp-results style="position: absolute; top: 100%; left: 12px; right: 12px; background: white; border: 1px solid var(--taskflow-border); z-index: 10; max-height: 200px; overflow-y: auto;"></div>
								</td>
								<td style="padding: 12px;">
									<select data-new-member-role style="padding: 8px; width: 100%; border-radius: 4px; border: 1px solid var(--taskflow-border);">
										${roles.map((r) => `<option value="${escapeHtml(r)}">${escapeHtml(r)}</option>`).join("")}
									</select>
								</td>
								<td style="padding: 12px;">
									<button class="taskflow-button primary" type="button" data-save-new-member>Add</button>
								</td>
							</tr>
						</tbody>
					</table>
				</div>
			</div>
		`;

		// Attachment Edit Toggle
		const attachmentDisplay = target.querySelector("[data-attachment-display]");
		const attachmentEdit = target.querySelector("[data-attachment-edit]");
		const editAttachmentBtn = target.querySelector("[data-edit-attachment]");
		const cancelAttachmentBtn = target.querySelector("[data-cancel-attachment]");
		const saveAttachmentBtn = target.querySelector("[data-save-attachment]");

		loadProjectAttachments(projectName, attachmentDisplay);

		editAttachmentBtn.addEventListener("click", async () => {
			attachmentDisplay.style.display = "none";
			attachmentEdit.style.display = "block";
			await loadProjectAttachmentsList(projectName);
		});

		cancelAttachmentBtn.addEventListener("click", () => {
			attachmentDisplay.style.display = "block";
			attachmentEdit.style.display = "none";
		});

		saveAttachmentBtn.addEventListener("click", async () => {
			const fileInput = target.querySelector("#projectFileInput");
			const files = fileInput?.files;
			if (files && files.length) {
				for (const file of files) {
					const formData = new FormData();
					formData.append("file", file);
					formData.append("doctype", "Taskflow Project");
					formData.append("docname", projectName);
					formData.append("is_private", 0);
					formData.append("folder", "Home");
					try {
						await fetch("/api/method/upload_file", {
							method: "POST",
							headers: { "X-Frappe-CSRF-Token": window.csrf_token || "" },
							body: formData,
						});
					} catch (err) {
						showMessage(`Failed to upload ${file.name}`);
					}
				}
			}
			attachmentDisplay.style.display = "block";
			attachmentEdit.style.display = "none";
			await loadProjectAttachments(projectName, attachmentDisplay);
		});

		const dropzone = target.querySelector("#projectAttachmentDropzone");
		const fileInput = target.querySelector("#projectFileInput");
		if (dropzone && fileInput) {
			dropzone.addEventListener("click", () => fileInput.click());
			dropzone.addEventListener("dragover", (e) => {
				e.preventDefault();
				dropzone.style.borderColor = "var(--taskflow-primary)";
			});
			dropzone.addEventListener("dragleave", () => {
				dropzone.style.borderColor = "var(--taskflow-border)";
			});
			dropzone.addEventListener("drop", (e) => {
				e.preventDefault();
				dropzone.style.borderColor = "var(--taskflow-border)";
				fileInput.files = e.dataTransfer.files;
			});
		}

		// Description Edit Toggle
		const descriptionDisplay = target.querySelector("[data-description-display]");
		const descriptionEdit = target.querySelector("[data-description-edit]");
		const editDescriptionBtn = target.querySelector("[data-edit-description]");
		const cancelDescriptionBtn = target.querySelector("[data-cancel-description]");
		const saveDescriptionBtn = target.querySelector("[data-save-description]");

		let quillEditor = null;

		editDescriptionBtn.addEventListener("click", () => {
			descriptionDisplay.style.display = "none";
			descriptionEdit.style.display = "block";

			if (!quillEditor && window.Quill) {
				quillEditor = new Quill("#projectDescriptionEditor", {
					theme: "snow",
					placeholder: "Enter project description...",
					modules: {
						toolbar: [
							[{ header: [1, 2, 3, false] }],
							["bold", "italic", "underline"],
							["link"],
							[{ list: "ordered" }, { list: "bullet" }],
							["clean"]
						],
					},
				});
				if (description) {
					quillEditor.root.innerHTML = description;
				}
			}
		});

		cancelDescriptionBtn.addEventListener("click", () => {
			descriptionDisplay.style.display = "block";
			descriptionEdit.style.display = "none";
		});

		saveDescriptionBtn.addEventListener("click", async () => {
			if (quillEditor) {
				project.description = quillEditor.root.innerHTML;
				await saveProject(project);
				descriptionDisplay.innerHTML = `<div style="color: #334155; font-size: 13px; line-height: 1.6;">${project.description || '<span style="color: #94a3b8;">No description yet.</span>'}</div>`;
			}
			descriptionDisplay.style.display = "block";
			descriptionEdit.style.display = "none";
			showMessage("Description saved successfully.");
		});

		// Employee search
		const searchInput = target.querySelector("[data-emp-search]");
		const resultsDiv = target.querySelector("[data-emp-results]");
		let selectedEmployeeId = null;

		searchInput.addEventListener("input", async (e) => {
			const val = e.target.value;
			if (val.length < 2) {
				resultsDiv.innerHTML = "";
				return;
			}
			const results = await searchEmployees(val);
			resultsDiv.innerHTML = results
				.map(
					(r) =>
						`<div data-val="${r.value}" style="padding: 8px; cursor: pointer;">${escapeHtml(r.label)}</div>`,
				)
				.join("");
			resultsDiv.querySelectorAll("div").forEach((div) => {
				div.onclick = () => {
					searchInput.value = div.textContent;
					selectedEmployeeId = div.dataset.val;
					resultsDiv.innerHTML = "";
				};
			});
		});

		// Remove member buttons
		target.querySelectorAll("[data-remove-member]").forEach((btn) => {
			btn.addEventListener("click", () => removeMember(btn.dataset.removeMember));
		});

		// Add new member
		target.querySelector("[data-save-new-member]").addEventListener("click", () => {
			const team_role = target.querySelector("[data-new-member-role]").value;
			if (selectedEmployeeId && team_role) {
				addMember(selectedEmployeeId, team_role);
			} else {
				showMessage("Please select a valid Employee from the list.");
			}
		});
	}

	async function loadProjectAttachments(projectName, displayEl) {
		try {
			const url = new URL("/api/method/frappe.client.get_list", window.location.origin);
			url.searchParams.set("doctype", "File");
			url.searchParams.set("filters", JSON.stringify({ attached_to_name: projectName }));
			url.searchParams.set("fields", JSON.stringify(["name", "file_name", "file_url"]));
			url.searchParams.set("limit_page_length", "50");

			const response = await fetch(url.toString(), {
				method: "GET",
				headers: { "X-Frappe-CSRF-Token": window.csrf_token || "" },
				credentials: "same-origin",
			});
			const payload = await response.json();
			const result = payload.message || payload;

			if (!displayEl) return;
			if (!result || result.length === 0) {
				displayEl.innerHTML = '<p style="margin: 0; color: #94a3b8; font-size: 13px;">No attachment yet.</p>';
				return;
			}

			displayEl.innerHTML = result.map(file =>
				`<a href="${escapeHtml(file.file_url)}" target="_blank" style="display: block; padding: 6px 0; color: var(--taskflow-primary); font-size: 13px; text-decoration: none;">${escapeHtml(file.file_name)}</a>`
			).join("");
		} catch (err) {
			if (displayEl) displayEl.innerHTML = '<p style="margin: 0; color: #94a3b8; font-size: 13px;">No attachment yet.</p>';
		}
	}

	async function loadProjectAttachmentsList(projectName) {
		const listEl = document.getElementById("projectAttachmentsList");
		if (!listEl) return;
		try {
			const url = new URL("/api/method/frappe.client.get_list", window.location.origin);
			url.searchParams.set("doctype", "File");
			url.searchParams.set("filters", JSON.stringify({ attached_to_name: projectName }));
			url.searchParams.set("fields", JSON.stringify(["name", "file_name", "file_url"]));
			url.searchParams.set("limit_page_length", "50");

			const response = await fetch(url.toString(), {
				method: "GET",
				headers: { "X-Frappe-CSRF-Token": window.csrf_token || "" },
				credentials: "same-origin",
			});
			const payload = await response.json();
			const result = payload.message || payload;

			listEl.innerHTML = "";
			if (!result || result.length === 0) {
				listEl.innerHTML = '<p style="color: #94a3b8; font-size: 12px;">No files uploaded yet.</p>';
				return;
			}

			result.forEach(file => {
				const div = document.createElement("div");
				div.style.cssText = "display: flex; align-items: center; gap: 8px; padding: 8px 12px; background: white; border: 1px solid var(--taskflow-border); border-radius: 6px;";
				div.innerHTML = `
					<span style="flex: 1; font-size: 12px; color: #334155; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${escapeHtml(file.file_name)}</span>
					<button class="taskflow-button secondary" type="button" data-delete-file="${file.name}" style="padding: 2px 8px; font-size: 11px;">×</button>
				`;
				listEl.appendChild(div);
			});

			listEl.querySelectorAll("[data-delete-file]").forEach(btn => {
				btn.addEventListener("click", async () => {
					try {
						const deleteUrl = new URL("/api/method/frappe.client.delete", window.location.origin);
						await fetch(deleteUrl.toString(), {
							method: "POST",
							headers: {
								"X-Frappe-CSRF-Token": window.csrf_token || "",
								"Content-Type": "application/x-www-form-urlencoded",
							},
							credentials: "same-origin",
							body: new URLSearchParams({ doctype: "File", name: btn.dataset.deleteFile }),
						});
						await loadProjectAttachmentsList(projectName);
					} catch (err) {
						showMessage("Failed to delete file.");
					}
				});
			});
		} catch (err) {
			listEl.innerHTML = '<p style="color: #94a3b8; font-size: 12px;">No files uploaded yet.</p>';
		}
	}

	async function renderProjectCommentsView() {
		const target = refs.filesView;
		if (!target) return;
		const project = state.projectWorkspace && state.projectWorkspace.project;
		if (!project) {
			target.innerHTML = `<div class="taskflow-empty">Select a project to view comments.</div>`;
			return;
		}

		const projectName = project.name;
		const members = (state.projectWorkspace && state.projectWorkspace.team_members) || [];

		target.innerHTML = `
			<div style="max-width: 700px; margin: 0 auto; padding: 24px;">
				<h3 style="margin: 0 0 16px 0; font-size: 16px; font-weight: 600;">Comments</h3>
				<div id="projectCommentsList" style="display: flex; flex-direction: column; gap: 12px; margin-bottom: 20px;">
					<div style="text-align: center; padding: 20px; color: #94a3b8; font-size: 13px;">Loading comments...</div>
				</div>
				<div style="background: white; border: 1px solid var(--taskflow-border); border-radius: 8px; padding: 12px; position: relative;">
					<textarea id="projectCommentInput" placeholder="Add a comment... Type @ to mention" style="width: 100%; min-height: 80px; padding: 10px; border: 1px solid var(--taskflow-border); border-radius: 6px; font-size: 13px; font-family: inherit; resize: vertical;"></textarea>
					<div id="mentionDropdown" style="display: none; position: absolute; left: 12px; bottom: 60px; background: white; border: 1px solid var(--taskflow-border); border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); max-height: 180px; overflow-y: auto; z-index: 100; min-width: 200px;"></div>
					<div style="display: flex; justify-content: flex-end; margin-top: 8px;">
						<button class="taskflow-button primary" type="button" data-post-project-comment>Submit</button>
					</div>
				</div>
			</div>
		`;

		await loadProjectComments(projectName);

		const commentInput = target.querySelector("#projectCommentInput");
		const mentionDropdown = target.querySelector("#mentionDropdown");
		let mentionActive = false;
		let mentionQuery = "";
		let mentionStartPos = 0;

		function showMentionList(query) {
			const filtered = members.filter(m => {
				const label = (m.label || "").toLowerCase();
				const user = (m.user || "").toLowerCase();
				const q = query.toLowerCase();
				return label.includes(q) || user.includes(q);
			});

			if (filtered.length === 0) {
				mentionDropdown.style.display = "none";
				mentionActive = false;
				return;
			}

			mentionDropdown.innerHTML = filtered.map(m => {
				const avatarContent = m.user_image
					? `<img src="${m.user_image}" alt="" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">`
					: initials(m.label);
				return `
					<div class="mention-item" data-user="${escapeHtml(m.user)}" data-label="${escapeHtml(m.label)}" style="display: flex; align-items: center; gap: 8px; padding: 8px 12px; cursor: pointer; transition: background 0.15s;">
						<div style="width: 26px; height: 26px; border-radius: 50%; background: linear-gradient(135deg, #3b82f6, #8b5cf6); display: flex; align-items: center; justify-content: center; color: white; font-size: 9px; font-weight: 600; flex-shrink: 0; overflow: hidden;">
							${avatarContent}
						</div>
						<div>
							<div style="font-size: 12px; font-weight: 500; color: #1e293b;">${escapeHtml(m.label)}</div>
							<div style="font-size: 10px; color: #94a3b8;">${escapeHtml(m.user)}</div>
						</div>
					</div>
				`;
			}).join("");

			mentionDropdown.querySelectorAll(".mention-item").forEach(item => {
				item.addEventListener("mouseenter", () => {
					item.style.background = "#f1f5f9";
				});
				item.addEventListener("mouseleave", () => {
					item.style.background = "transparent";
				});
				item.addEventListener("click", () => {
					const label = item.dataset.label;
					const before = commentInput.value.substring(0, mentionStartPos);
					const after = commentInput.value.substring(commentInput.selectionStart);
					commentInput.value = before + "@" + label + " " + after;
					commentInput.focus();
					mentionDropdown.style.display = "none";
					mentionActive = false;
				});
			});

			mentionDropdown.style.display = "block";
		}

		commentInput.addEventListener("input", () => {
			const val = commentInput.value;
			const cursorPos = commentInput.selectionStart;
			const textBefore = val.substring(0, cursorPos);
			const atIndex = textBefore.lastIndexOf("@");

			if (atIndex >= 0 && (atIndex === 0 || textBefore[atIndex - 1] === " " || textBefore[atIndex - 1] === "\n")) {
				mentionQuery = textBefore.substring(atIndex + 1);
				if (!mentionQuery.includes(" ")) {
					mentionActive = true;
					mentionStartPos = atIndex;
					showMentionList(mentionQuery);
					return;
				}
			}
			mentionDropdown.style.display = "none";
			mentionActive = false;
		});

		commentInput.addEventListener("keydown", (e) => {
			if (mentionActive && mentionDropdown.style.display === "block") {
				const items = mentionDropdown.querySelectorAll(".mention-item");
				const highlighted = mentionDropdown.querySelector(".mention-item[style*='background: #f1f5f9']");
				let idx = Array.from(items).indexOf(highlighted);

				if (e.key === "ArrowDown") {
					e.preventDefault();
					if (idx < items.length - 1) idx++;
					items.forEach((item, i) => item.style.background = i === idx ? "#f1f5f9" : "transparent");
				} else if (e.key === "ArrowUp") {
					e.preventDefault();
					if (idx > 0) idx--;
					items.forEach((item, i) => item.style.background = i === idx ? "#f1f5f9" : "transparent");
				} else if (e.key === "Enter" && idx >= 0) {
					e.preventDefault();
					items[idx].click();
				} else if (e.key === "Escape") {
					mentionDropdown.style.display = "none";
					mentionActive = false;
				}
			}
		});

		document.addEventListener("click", (e) => {
			if (!mentionDropdown.contains(e.target) && e.target !== commentInput) {
				mentionDropdown.style.display = "none";
				mentionActive = false;
			}
		});

		target.querySelector("[data-post-project-comment]").addEventListener("click", async () => {
			const content = commentInput.value.trim();
			if (!content) {
				showMessage("Please enter a comment.");
				return;
			}

			try {
				await apiCall("add_project_comment", {
					payload: JSON.stringify({ project: projectName, content })
				}, "POST");
				commentInput.value = "";
				await loadProjectComments(projectName);
				showMessage("Comment added successfully.");
			} catch (err) {
				showMessage(err.message || "Failed to add comment.");
			}
		});
	}

	async function loadProjectComments(projectName) {
		const listEl = document.getElementById("projectCommentsList");
		if (!listEl) return;

		try {
			const result = await apiCall("get_project_comments", { project: projectName });
			const comments = result.comments || [];

			if (comments.length === 0) {
				listEl.innerHTML = `<div style="text-align: center; padding: 20px; color: #94a3b8; font-size: 13px;">No comments yet. Start the conversation.</div>`;
				return;
			}

			listEl.innerHTML = "";
			comments.forEach(c => {
				const div = document.createElement("div");
				div.style.cssText = "display: flex; gap: 10px; padding: 12px; background: white; border: 1px solid var(--taskflow-border); border-radius: 8px;";
				const avatarContent = c.author_image
					? `<img src="${c.author_image}" alt="" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">`
					: initials(c.author_name);
				div.innerHTML = `
					<div style="width: 32px; height: 32px; border-radius: 50%; background: linear-gradient(135deg, #3b82f6, #8b5cf6); display: flex; align-items: center; justify-content: center; color: white; font-size: 11px; font-weight: 600; flex-shrink: 0; overflow: hidden;">
						${avatarContent}
					</div>
					<div style="flex: 1;">
						<div style="display: flex; align-items: baseline; gap: 8px; margin-bottom: 4px;">
							<span style="font-size: 13px; font-weight: 500; color: #1e293b;">${escapeHtml(c.author_name)}</span>
							<span style="font-size: 11px; color: #94a3b8;">${prettyDate(c.creation)}</span>
						</div>
						<div style="font-size: 13px; color: #475569; line-height: 1.5; background: #f8fafc; padding: 10px 12px; border-radius: 0 8px 8px 8px; border: 1px solid #e2e8f0;">${c.content}</div>
					</div>
				`;
				listEl.appendChild(div);
			});
		} catch (err) {
			listEl.innerHTML = `<div style="text-align: center; padding: 20px; color: #ef4444; font-size: 13px;">Failed to load comments.</div>`;
		}
	}

	async function removeMember(index) {
		const project = state.projectWorkspace.project;
		project.project_team_members.splice(index, 1);
		await saveProject(project);
	}

	async function addMember(employee, team_role) {
		const project = state.projectWorkspace.project;
		project.project_team_members.push({ employee, team_role });
		await saveProject(project);
	}

	function renderNavPlaceholder(mode) {
		if (!refs.dashboardView) return;
		const label = getNavModeLabel(mode);
		refs.dashboardView.innerHTML = `<div class="taskflow-empty">${escapeHtml(label)} is not available in this portal yet.</div>`;
	}

	function getNavModeLabel(mode) {
		const labels = {
			calendar: "Calendar",
			reports: "Reports",
			settings: "Settings",
			team: "Team",
			"my-tasks": "Tasks",
			dashboard: "Dashboard",
		};
		return labels[mode] || "Taskflow";
	}

	function getTrendClass(trend) {
		if (String(trend).startsWith("+")) return "taskflow-trend-up";
		if (String(trend).startsWith("-")) return "taskflow-trend-down";
		return "taskflow-trend-neutral";
	}

	function setFormSaving(form, saving) {
		form.dataset.saving = saving ? "1" : "0";
		const submitButton = form.querySelector('button[type="submit"]');
		if (submitButton) submitButton.disabled = saving;
	}

	function toggleSidebars() {
		if (!refs.container) return;
		if (isMobileSidebar()) {
			const open = !refs.container.classList.contains("taskflow-sidebars-open");
			refs.container.classList.toggle("taskflow-sidebars-open", open);
			refs.sidebarToggle?.setAttribute("aria-expanded", open ? "true" : "false");
			return;
		}
		const collapsed = !refs.container.classList.contains("taskflow-sidebars-collapsed");
		refs.container.classList.toggle("taskflow-sidebars-collapsed", collapsed);
		refs.sidebarToggle?.setAttribute("aria-expanded", collapsed ? "false" : "true");
	}

	function closeSidebars() {
		if (!refs.container) return;
		refs.container.classList.remove("taskflow-sidebars-open");
		if (isMobileSidebar()) {
			refs.sidebarToggle?.setAttribute("aria-expanded", "false");
		} else {
			const collapsed = refs.container.classList.contains("taskflow-sidebars-collapsed");
			refs.sidebarToggle?.setAttribute("aria-expanded", collapsed ? "false" : "true");
		}
	}

	function closeTaskModal() {
		state.activeTaskName = null;
		updateUrlState();
		toggleModal(refs.taskModal, false);
	}

	function isMobileSidebar() {
		return window.matchMedia("(max-width: 900px)").matches;
	}

	function apiCall(method, args = {}, requestMethod = "GET") {
		const url = new URL(`${METHOD_BASE}.${method}`, window.location.origin);
		const options = {
			method: requestMethod,
			headers: {
				"X-Frappe-CSRF-Token": window.csrf_token || "",
			},
			credentials: "same-origin",
			cache: "no-store",
		};

		if (requestMethod === "GET") {
			Object.entries(args).forEach(([key, value]) => url.searchParams.set(key, value));
		} else {
			const formData = new URLSearchParams();
			Object.entries(args).forEach(([key, value]) => formData.append(key, value));
			options.body = formData;
		}

		return fetch(url.toString(), options)
			.then(async (response) => {
				let payload;
				try {
					payload = await response.json();
				} catch (error) {
					const requestError = new Error(
						response.ok
							? "Invalid server response."
							: `Request failed (${response.status}).`,
					);
					requestError.status = response.status;
					requestError.responsePayload = null;
					throw requestError;
				}
				if (!response.ok) {
					const requestError = new Error(extractError(payload));
					requestError.status = response.status;
					requestError.responsePayload = payload;
					throw requestError;
				}
				return payload;
			})
			.then((payload) => {
				if (payload.exc || payload._server_messages) {
					const requestError = new Error(extractError(payload));
					requestError.status = 200;
					requestError.responsePayload = payload;
					throw requestError;
				}
				return payload.message;
			});
	}

	function extractError(payload) {
		if (payload._server_messages) {
			try {
				const messages = JSON.parse(payload._server_messages);
				const parsed = messages.map((item) => JSON.parse(item).message).filter(Boolean);
				if (parsed.length) return parsed.join("\n");
			} catch (error) {
				return "Server error";
			}
		}
		return payload.message || "Server error";
	}

	function setLoading(loading) {
		if (refs.loading) refs.loading.classList.toggle("taskflow-hidden", !loading);
	}

	function showMessage(message) {
		window.frappe?.show_alert?.({ message, indicator: "red" }) || window.alert(message);
	}

	function formatDate(value) {
		if (!value) return "Not set";
		const date = parseDateValue(value);
		if (!date) return "Not set";
		return formatDisplayDate(date);
	}

	function formatDisplayDate(date) {
		const d = String(date.getDate()).padStart(2, "0");
		const m = String(date.getMonth() + 1).padStart(2, "0");
		const y = date.getFullYear();
		return `${d}-${m}-${y}`;
	}

	function dateInputValue(value) {
		if (!value) return "";
		if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(value))
			return value.slice(0, 10);
		const date = parseDateValue(value);
		return date ? formatLocalDate(date) : "";
	}

	function datetimeInputValue(value) {
		if (!value) return "";
		if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}/.test(value)) {
			return value.replace(" ", "T").slice(0, 16);
		}
		const date = parseDateValue(value);
		return date
			? `${formatLocalDate(date)}T${pad(date.getHours())}:${pad(date.getMinutes())}`
			: "";
	}

	function capitalizeName(name) {
		return name
			.toLowerCase()
			.split(" ")
			.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
			.join(" ");
	}

	function initials(value) {
		return String(value || "?")
			.split(" ")
			.filter(Boolean)
			.slice(0, 2)
			.map((part) => part[0].toUpperCase())
			.join("");
	}

	function stripHtml(value) {
		const div = document.createElement("div");
		div.innerHTML = value;
		return div.textContent || div.innerText || "";
	}

	function slugify(value) {
		return String(value || "")
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, "-")
			.replace(/^-|-$/g, "");
	}

	function parseDateValue(value) {
		if (!value) return null;
		if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;

		const trimmed = String(value).trim();

		// DD-MM-YYYY format
		const dmyMatch = trimmed.match(/^(\d{2})-(\d{2})-(\d{4})$/);
		if (dmyMatch) {
			const [, day, month, year] = dmyMatch;
			const date = new Date(Number(year), Number(month) - 1, Number(day));
			return Number.isNaN(date.getTime()) ? null : date;
		}

		// YYYY-MM-DD (date only) — parse as LOCAL midnight to avoid UTC timezone shift
		const ymdMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
		if (ymdMatch) {
			const [, year, month, day] = ymdMatch;
			const date = new Date(Number(year), Number(month) - 1, Number(day));
			return Number.isNaN(date.getTime()) ? null : date;
		}

		// Datetime string — normalize space to T
		const normalized = trimmed.replace(" ", "T");
		const date = new Date(normalized);
		return Number.isNaN(date.getTime()) ? null : date;
	}

	function displayDateInputValue(value) {
		if (!value) return "";
		const date = parseDateValue(value);
		return date ? formatDisplayDate(date) : "";
	}

	function normalizeDateForPayload(value) {
		if (!value) return null;
		const date = parseDateValue(value);
		return date ? formatLocalDate(date) : null;
	}

	function formatLocalDate(date) {
		return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
	}

	function pad(value) {
		return String(value).padStart(2, "0");
	}

	function escapeHtml(value) {
		return String(value ?? "")
			.replace(/&/g, "&amp;")
			.replace(/</g, "&lt;")
			.replace(/>/g, "&gt;")
			.replace(/"/g, "&quot;")
			.replace(/'/g, "&#39;");
	}

	function getFormElement(form, name) {
		return form && form.elements ? form.elements[name] : null;
	}

	function getFormValue(form, name, fallback = "") {
		const field = getFormElement(form, name);
		return field ? field.value : fallback;
	}

	function getFormChecked(form, name) {
		const field = getFormElement(form, name);
		return Boolean(field && field.checked);
	}

	async function searchEmployees(query) {
		try {
			const results = await apiCall("search_employees", { q: query });
			return results;
		} catch (e) {
			console.error(e);
			return [];
		}
	}
})();
