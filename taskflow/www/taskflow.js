(function () {
	const METHOD_BASE = "/api/method/taskflow.taskflow.api.portal";
	const STATUS_COLUMNS = ["Open", "In Progress", "Review", "On Hold", "Completed", "Cancelled"];
	const TASK_VIEWS = ["list", "kanban", "dashboard", "timeline", "files", "settings"];
	const NAV_MODES = ["dashboard", "my-tasks", "calendar", "reports", "team", "settings"];
	const NAV_PLACEHOLDER_MODES = ["calendar", "reports", "settings"];

	const state = {
		bootstrap: null,
		selectedProject: null,
		projectWorkspace: null,
		navMode: "dashboard",
		taskView: normalizeTaskView(window.localStorage.getItem("taskflow_task_view")),
		taskQuery: "",
		projectQuery: "",
		selectedTeam: "all",
		projectModalMode: "create",
		taskModalMode: "create",
		projectRequestId: 0,
		draggedTaskName: null,
		suppressTaskClick: false,
		currentChecklist: [],
		autoSaveTimer: null,
	};

	const refs = {};

	document.addEventListener("DOMContentLoaded", init);

	async function init() {
		cacheDom();
		applyInitialUrlState();
		bindEvents();
		await loadBootstrap(state.selectedProject, { updateUrl: false });
		await loadStateFromUrl({ updateUrl: false });
	}

	function applyInitialUrlState() {
		const params = new URLSearchParams(window.location.search);
		const mode = normalizeNavMode(params.get("mode"));
		const project = params.get("project");
		const team = params.get("team");
		const view = params.get("view");

		if (mode) state.navMode = mode;
		if (project) state.selectedProject = project;
		state.selectedTeam = team || "all";
		if (view) state.taskView = normalizeTaskView(view);
		syncTaskTabs();
	}

	function updateUrlState(options = {}) {
		const params = new URLSearchParams();
		params.set("mode", state.navMode);
		if (state.navMode === "dashboard" && state.selectedProject) params.set("project", state.selectedProject);
		if (state.selectedTeam && state.selectedTeam !== "all") params.set("team", state.selectedTeam);
		if (state.taskView) params.set("view", state.taskView);

		const query = params.toString();
		const newUrl = `${window.location.pathname}${query ? `?${query}` : ""}`;
		const historyState = getHistoryState();
		if (`${window.location.pathname}${window.location.search}` === newUrl) {
			window.history.replaceState(historyState, "", newUrl);
			return;
		}
		const method = options.replace ? "replaceState" : "pushState";
		window.history[method](historyState, "", newUrl);
	}

	async function loadStateFromUrl(options = {}) {
		const params = new URLSearchParams(window.location.search);
		const mode = normalizeNavMode(params.get("mode")) || "dashboard";
		const project = params.get("project");
		const team = params.get("team");
		const view = params.get("view");

		if (view) state.taskView = normalizeTaskView(view);
		state.selectedTeam = team || "all";
		if (refs.teamSwitcher) refs.teamSwitcher.value = state.selectedTeam;
		syncTaskTabs();

		if (mode === "dashboard") {
			if (project && project !== state.selectedProject) {
				await selectProject(project, options);
			} else {
				setNavMode("dashboard", options);
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
			refs.viewToggle.querySelectorAll(".taskflow-tab").forEach(tab => {
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
		refs.projectCount = document.querySelector("[data-project-count]");
		refs.userName = document.querySelector("[data-user-name]");
		refs.userImage = document.querySelector("[data-user-image]");
		refs.userAvatarContainer = document.querySelector("[data-user-avatar-container]");
	}

	function bindEvents() {
		refs.newProjectButtons.forEach((button) => {
			button.addEventListener("click", () => openProjectModal());
		});

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
				if (newTaskButton.disabled || newTaskButton.getAttribute("aria-disabled") === "true") return;
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
				removeChecklistItem(removeBtn.dataset.removeChecklistItem);
			}
		});

		document.addEventListener("change", (e) => {
			const toggle = e.target.closest("[data-toggle-checklist-item]");
			if (toggle) {
				toggleChecklistItem(toggle.dataset.toggleChecklistItem, toggle.checked);
			}
		});

		document.addEventListener("input", (e) => {
			const editInput = e.target.closest("[data-edit-checklist-item]");
			if (editInput) {
				updateChecklistItem(editInput.dataset.editChecklistItem, editInput.value);
			}
		});

		// Auto-expand textarea and Enter-to-send
		const commentTextarea = refs.taskForm?.elements.new_comment;
		if (commentTextarea) {
			commentTextarea.addEventListener("input", () => {
				commentTextarea.style.height = "auto";
				commentTextarea.style.height = (commentTextarea.scrollHeight) + "px";
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

		if (refs.teamSwitcher) {
			refs.teamSwitcher.addEventListener("change", async (e) => {
				state.selectedTeam = e.target.value;
				renderProjectList();
				if (state.navMode === "dashboard" && state.selectedProject) {
					const projects = getVisibleProjects({ ignoreQuery: true });
					const selectedProjectVisible = projects.some((project) => project.name === state.selectedProject);
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
						return;
					}
				}
				if (state.navMode === 'team') {
					renderTeamView();
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

		refs.projectForm.addEventListener("submit", submitProjectForm);
		refs.taskForm.addEventListener("submit", submitTaskForm);
		refs.taskFormQuick.addEventListener("submit", submitTaskForm);
		
		// Robust click handler for task save button
		const taskSaveBtn = refs.taskForm.querySelector('button[type="submit"]');
		if (taskSaveBtn) {
			taskSaveBtn.addEventListener("click", (e) => {
				if (refs.taskForm.checkValidity && !refs.taskForm.checkValidity()) {
					// Let the browser show validation errors
					return;
				}
				e.preventDefault();
				submitTaskForm({ 
					preventDefault: () => {}, 
					currentTarget: refs.taskForm 
				});
			});
		}
		
		// Auto-save listeners for task form
		refs.taskForm.querySelectorAll("input, select, textarea").forEach(el => {
			if (el.name === "new_comment") return; // Skip comment input
			
			const eventType = (el.tagName === "INPUT" && (el.type === "text" || el.type === "number")) || el.tagName === "TEXTAREA" 
				? "input" 
				: "change";
				
			el.addEventListener(eventType, () => {
				triggerAutoSave();
			});
		});

		refs.projectForm.elements.team.addEventListener("change", (event) => {
			const projectLead = refs.projectForm.elements.project_lead;
			projectLead.innerHTML = buildMemberOptions(event.target.value, "");
		});
		document.querySelectorAll("[data-close-modal]").forEach((button) => {
			button.addEventListener("click", () => closeModal(button.dataset.closeModal));
		});
		document.querySelectorAll(".taskflow-modal-backdrop").forEach((backdrop) => {
			backdrop.addEventListener("click", (event) => {
				if (event.target === backdrop) closeModal(backdrop.dataset.modalName);
			});
		});
		if (refs.sidebarToggle && refs.container) {
			refs.sidebarToggle.addEventListener("click", toggleSidebars);
		}
		document.addEventListener("keydown", (event) => {
			if (event.key !== "Escape") return;
			closeModal("project");
			closeModal("task");
			closeMemberDetail();
			closeSidebars();
		});
		window.addEventListener("popstate", () => {
			loadStateFromUrl({ updateUrl: false });
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
		const team = state.bootstrap && state.bootstrap.teams.find(t => t.name === state.selectedTeam);
		return team ? team.team_name : "Team";
	}

	function setNavMode(mode, options = {}) {
		mode = normalizeNavMode(mode) || "dashboard";
		state.navMode = mode;

		// 1. Reset all views to hidden
		document.querySelectorAll('.taskflow-view-content').forEach(el => el.classList.add('taskflow-hidden'));
		
		// 2. Hide all team-specific UI components
		const teamElements = [
			document.querySelector("[data-team-view]"),
			document.querySelector("[data-team-switcher]")?.parentElement
		];
		teamElements.forEach(el => el && el.classList.add('taskflow-hidden'));

		// 3. Show/Manage mode-specific UI
		const toolbar = document.querySelector('.taskflow-toolbar');
		const tabs = document.querySelector('.taskflow-tabs');
		const breadcrumb = document.querySelector("[data-project-breadcrumb]");
		const isPlaceholderMode = NAV_PLACEHOLDER_MODES.includes(mode);

		if (mode === "team") {
			// SHOW TEAM UI
			state.selectedProject = null;
			state.projectWorkspace = null;
			toolbar?.classList.add('taskflow-hidden');
			tabs?.classList.add('taskflow-hidden');
			
			state.selectedTeam = state.selectedTeam || "all";
			const teamName = getSelectedTeamName();
			if (refs.projectTitle) refs.projectTitle.textContent = teamName;
			if (breadcrumb) breadcrumb.textContent = `Team / ${teamName}`;
			if (refs.newTaskButton) refs.newTaskButton.disabled = true;
			
			document.querySelector("[data-team-view]")?.classList.remove('taskflow-hidden');
			document.querySelector("[data-team-switcher]")?.parentElement.classList.remove('taskflow-hidden');
			
			updateNavActive();
			renderProjectList();
		} else if (isPlaceholderMode) {
			// SHOW PLACEHOLDER UI
			toolbar?.classList.add('taskflow-hidden');
			tabs?.classList.add('taskflow-hidden');
			const label = getNavModeLabel(mode);
			if (refs.projectTitle) refs.projectTitle.textContent = label;
			if (breadcrumb) breadcrumb.textContent = label;
			if (refs.dashboardView) refs.dashboardView.classList.remove('taskflow-hidden');
			renderNavPlaceholder(mode);
			updateNavActive();
			renderProjectList();
		} else {
			// SHOW PROJECT UI
			toolbar?.classList.remove('taskflow-hidden');
			tabs?.classList.remove('taskflow-hidden');
			if (refs.newTaskButton) refs.newTaskButton.disabled = false;
			updateNavActive();
			renderProjectList();
			renderProjectWorkspace();
		}

		if (options.updateUrl !== false) updateUrlState({ replace: options.replace });
	}
	async function renderTeamView() {
		const teamGrid = document.querySelector('[data-team-grid]');
		const teamTimeline = document.querySelector('[data-team-timeline]');
		const header = document.querySelector('[data-team-view] h2');
		const teamName = getSelectedTeamName();
        const viewToggle = document.querySelector('[data-team-view-toggle]');

		if (!teamGrid || !teamTimeline) return;
        
        viewToggle.querySelectorAll('.taskflow-tab').forEach(t => t.classList.toggle('active', t.dataset.view === state.teamView));
        
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
						.filter(tm => tm.employee === member.employee)
						.map(tm => tm.team);
					return memberTeams.includes(state.selectedTeam);
				});
			}

            if (state.teamView === 'cards') {
                teamGrid.classList.remove('taskflow-hidden');
                teamTimeline.classList.add('taskflow-hidden');
                renderTeamCards(filteredMembers, teamGrid);
            } else {
                teamGrid.classList.add('taskflow-hidden');
                teamTimeline.classList.remove('taskflow-hidden');
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

        teamGrid.innerHTML = filteredMembers.map(m => {
            const totalTasks = (m.pending_tasks || 0) + (m.completed_tasks || 0);
            const progress = totalTasks > 0 ? Math.round((m.completed_tasks / totalTasks) * 100) : 0;
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
        }).join('');

        teamGrid.querySelectorAll('[data-member-id]').forEach(card => {
            card.addEventListener('click', () => {
                const member = filteredMembers.find(m => m.employee === card.dataset.memberId);
                showMemberDetailsPanel(member);
                teamGrid.querySelectorAll('.taskflow-team-card').forEach(c => c.style.borderColor = 'var(--taskflow-border)');
                card.style.borderColor = 'var(--taskflow-primary)';
            });
        });
    }

    function showMemberDetailsPanel(m) {
        const detailPanel = document.querySelector('[data-team-detail]');
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
            ${projectStats.length > 0 ? `
                <table class="taskflow-table" style="width: 100%; border-collapse: collapse; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
                    <thead style="background: #f8fafc;">
                        <tr>
                            <th style="padding: 12px; text-align: left; font-size: 12px; color: #64748b; border-bottom: 1px solid #e2e8f0; width: 50px;">Sr No</th>
                            <th style="padding: 12px; text-align: left; font-size: 12px; color: #64748b; border-bottom: 1px solid #e2e8f0;">Project Name</th>
                            <th style="padding: 12px; text-align: center; font-size: 12px; color: #64748b; border-bottom: 1px solid #e2e8f0;">Assigned</th>
                            <th style="padding: 12px; text-align: center; font-size: 12px; color: #64748b; border-bottom: 1px solid #e2e8f0;">Pending</th>
                            <th style="padding: 12px; text-align: center; font-size: 12px; color: #64748b; border-bottom: 1px solid #e2e8f0;">Overdue</th>
                            <th style="padding: 12px; text-align: center; font-size: 12px; color: #64748b; border-bottom: 1px solid #e2e8f0;">Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${projectStats.map((p, i) => `
                            <tr style="border-bottom: 1px solid #f1f5f9;">
                                <td style="padding: 12px; color: #64748b;">${i + 1}</td>
                                <td style="padding: 12px; font-weight: 500;">${escapeHtml(p.name)}</td>
                                <td style="padding: 12px; text-align: center; font-weight: 600;">${p.assigned}</td>
                                <td style="padding: 12px; text-align: center; font-weight: 600;">${p.pending ?? p.assigned ?? 0}</td>
                                <td style="padding: 12px; text-align: center; font-weight: 600; color: ${p.overdue > 0 ? '#ef4444' : '#64748b'};">${p.overdue}</td>
                                <td style="padding: 12px; text-align: center;">
                                    <span style="background: ${p.status === 'Active' ? '#dcfce7' : '#f1f5f9'}; color: ${p.status === 'Active' ? '#166534' : '#475569'}; padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: 600;">
                                        ${p.status}
                                    </span>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            ` : '<p style="color: var(--taskflow-text-muted); font-size: 14px;">No projects currently assigned.</p>'}
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
                                    ${projects.map(p => `<th style="padding: 12px 16px; text-align: center; min-width: 130px; font-size: 11px; font-weight: 700; color: #6b7280; text-transform: uppercase;">${escapeHtml(p.project_name)}</th>`).join('')}
                                </tr>
                            </thead>
                            <tbody style="font-size: 13px;">
                                ${members.map((m, i) => `
                                    <tr style="border-bottom: 1px solid #f3f4f6;">
                                        <td style="padding: 12px 16px; position: sticky; left: 0; background: white; z-index: 1; color: #374151;">${i + 1}</td>
                                        <td style="padding: 12px 16px; position: sticky; left: 46px; background: white; z-index: 1; border-right: 1px solid #e5e7eb; font-weight: 600; color: #111827;">${escapeHtml(m.full_name)}</td>
                                        <td style="padding: 12px 16px; text-align: center;">
                                            <div style="display: flex; align-items: center; justify-content: center; gap: 10px;">
                                                <div style="width: 60px; height: 6px; background: #e5e7eb; border-radius: 3px;">
                                                    <div style="width: ${m.workload}%; height: 100%; background: ${m.workload > 80 ? '#f43f5e' : '#10b981'}; border-radius: 3px;"></div>
                                                </div>
                                                <span style="font-weight: 600; font-size: 12px; color: #374151;">${m.workload}%</span>
                                            </div>
                                        </td>
                                        ${projects.map(p => `
                                            <td style="padding: 8px 12px; text-align: center;">
                                                <button class="taskflow-btn-ghost" onclick="window.toggleProjectAssignment('${m.employee}', '${p.name}')" 
                                                        style="padding: 4px 12px; border-radius: 12px; border: 1px solid ${m.assignments.includes(p.name) ? '#bbf7d0' : '#e5e7eb'}; background: ${m.assignments.includes(p.name) ? '#f0fdf4' : 'transparent'}; font-size: 11px; font-weight: 600; color: ${m.assignments.includes(p.name) ? '#166534' : '#9ca3af'}; cursor: pointer;">
                                                    ${m.assignments.includes(p.name) ? 'Assigned' : 'Assign'}
                                                </button>
                                            </td>
                                        `).join('')}
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            `;
        } catch (err) {
            console.error(err);
            container.innerHTML = '<div class="taskflow-empty">Error loading workload planner.</div>';
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
		const backdrop = document.createElement('div');
		backdrop.className = 'taskflow-modal-backdrop open';
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
		backdrop.addEventListener('click', (e) => { if(e.target === backdrop) close(); });
	}

	function closeMemberDetail() {
		document.querySelectorAll("[data-member-detail-modal]").forEach((modal) => modal.remove());
	}


	function updateNavActive() {
		refs.navItems.forEach(item => {
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
			const myTasks = (state.bootstrap.tasks || []).filter(t => 
				t.assigned_to_user === state.bootstrap.user.user || 
				t.assigned_to === state.bootstrap.user.full_name
			);
			refs.myTasksCount.textContent = myTasks.length;
		}

		refs.newProjectButtons.forEach((button) => {
			button.disabled = !state.bootstrap.can_create_project;
		});
	}

	function renderTeamSwitcher() {
		if (!refs.teamSwitcher) return;
		const teams = (state.bootstrap && state.bootstrap.teams) || [];
		refs.teamSwitcher.innerHTML = `<option value="all">All Teams</option>` +
			teams.map(t => `<option value="${escapeHtml(t.name)}">${escapeHtml(t.team_name)}</option>`).join("");
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
				const activeClass = (state.navMode === "dashboard" && project.name === state.selectedProject) ? "active" : "";
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

	function renderProjectWorkspace() {
		const breadcrumb = document.querySelector("[data-project-breadcrumb]");
		
		if (state.navMode === "my-tasks") {
			refs.projectTitle.textContent = "My Tasks";
			if (breadcrumb) breadcrumb.textContent = "My Tasks";
			refs.newTaskButton.disabled = true;
			
			const myTasks = (state.bootstrap.tasks || []).filter(t => 
				t.assigned_to_user === state.bootstrap.user.user || 
				t.assigned_to === state.bootstrap.user.full_name
			);
			renderTaskArea(myTasks);
			return;
		}

		const workspace = state.projectWorkspace;
		if (!workspace || !workspace.project) {
			refs.projectTitle.textContent = "Select Project";
			if (breadcrumb) breadcrumb.textContent = "None";
			refs.newTaskButton.disabled = true;
			renderTaskArea([], "Select a project to view tasks.");
			return;
		}

		const project = workspace.project;
		const tasks = workspace.tasks || [];
		refs.projectTitle.textContent = project.project_name;
		if (breadcrumb) breadcrumb.textContent = project.project_name;
		refs.newTaskButton.disabled = !(project.permissions.can_manage_team || project.permissions.can_operate_team);

		renderTaskArea(tasks);
	}

	function renderTimeline(tasks) {
		const grid = document.querySelector('[data-timeline-grid]');
		if (!grid || !tasks.length) {
			if (grid) {
				grid.style.minHeight = "";
				grid.innerHTML = '<div class="taskflow-empty">No tasks with schedule data.</div>';
			}
			return;
		}

		// Filter tasks with dates
		const scheduledTasks = tasks.filter(t => parseDateValue(t.start_date) && parseDateValue(t.due_date));
		if (!scheduledTasks.length) {
			grid.style.minHeight = "";
			grid.innerHTML = '<div class="taskflow-empty">No tasks with schedule data.</div>';
			return;
		}

		const startDates = scheduledTasks.map(t => parseDateValue(t.start_date).getTime());
		const endDates = scheduledTasks.map(t => parseDateValue(t.due_date).getTime());
		const minDate = Math.min(...startDates);
		const maxDate = Math.max(...endDates);
		const duration = maxDate - minDate || 1;
		grid.style.minHeight = `${Math.max(300, 80 + (scheduledTasks.length * 50))}px`;

		grid.innerHTML = `
			<div class="taskflow-timeline-header-row">
				<span>${new Date(minDate).toLocaleDateString()}</span>
				<span>${new Date(maxDate).toLocaleDateString()}</span>
			</div>
			${scheduledTasks.map((t, index) => {
				const start = parseDateValue(t.start_date).getTime();
				const end = parseDateValue(t.due_date).getTime();
				const left = ((start - minDate) / duration) * 100;
				const width = Math.max(((end - start) / duration) * 100, 5);
				return `
					<div class="taskflow-timeline-task" style="left: ${left}%; width: ${width}%; top: ${50 + (index * 50)}px;">
						${escapeHtml(t.task_title)}
					</div>
				`;
			}).join("")}
		`;
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
			{ el: refs.settingsView, key: "settings" }
		];

		views.forEach(v => {
			if (v.el) v.el.classList.toggle("taskflow-hidden", v.key !== state.taskView);
		});

		if (emptyMessage) {
			renderActiveEmptyState(emptyMessage);
		} else if (state.taskView === "list") {
			renderList(visibleTasks);
		} else if (state.taskView === "kanban") {
			renderBoard(visibleTasks);
		} else if (state.taskView === "dashboard") {
			renderDashboard(visibleTasks);
		} else if (state.taskView === "timeline") {
			renderTimeline(visibleTasks);
		} else if (state.taskView === "files") {
			renderStaticTaskView(state.taskView);
		} else if (state.taskView === "settings") {
			renderSettingsView();
		}
	}

	function getFilteredTasks(tasks) {
		let filtered = tasks;
		if (state.selectedTeam && state.selectedTeam !== "all") {
			filtered = filtered.filter(t => t.team === state.selectedTeam);
		}
		if (state.selectedStatuses && state.selectedStatuses.length > 0) {
			filtered = filtered.filter(t => state.selectedStatuses.includes(t.status));
		}
		return filterTasks(filtered);
	}

	function refreshView() {
		if (!state.bootstrap) return;
		if (state.navMode === "team") return;
		if (NAV_PLACEHOLDER_MODES.includes(state.navMode)) {
			renderNavPlaceholder(state.navMode);
			return;
		}

		let tasks = [];
		if (state.navMode === "my-tasks") {
			tasks = (state.bootstrap.tasks || []).filter(t => 
				t.assigned_to_user === state.bootstrap.user.user || 
				t.assigned_to === state.bootstrap.user.full_name
			);
		} else if (state.projectWorkspace) {
			tasks = state.projectWorkspace.tasks || [];
		} else if (state.navMode === "dashboard") {
			// Global dashboard view
			tasks = state.bootstrap.tasks || [];
		}

		renderTaskArea(tasks);
	}

	function renderDashboard(tasks) {
		if (!refs.dashboardView) return;

		const completed = tasks.filter(t => t.status === "Completed").length;
		const inProgress = tasks.filter(t => t.status === "In Progress").length;
		const overdue = tasks.filter(t => {
			const dueDate = parseDateValue(t.due_date);
			return dueDate && dueDate < new Date() && t.status !== "Completed";
		}).length;
		const total = tasks.length;

		const stats = [
			{ label: "Total Tasks", value: total, trend: "Stable", color: "var(--taskflow-primary)" },
			{ label: "Completed", value: completed, trend: "+12%", color: "#10b981" },
			{ label: "In Progress", value: inProgress, trend: "Active", color: "#3b82f6" },
			{ label: "Overdue", value: overdue, trend: "-2", color: "#ef4444" }
		];

		const statusBreakdown = getStatusColumns().map(status => {
			const count = tasks.filter(t => t.status === status).length;
			const percent = total ? Math.round((count / total) * 100) : 0;
			return { status, count, percent };
		});

		// Team Performance Data
		const members = (state.projectWorkspace && state.projectWorkspace.team_members) || [];
		const performanceCardsHtml = members.map(m => {
			const memberTasks = tasks.filter(t => t.assigned_to === m.employee || t.assigned_to_user === m.user);
			const done = memberTasks.filter(t => t.status === "Completed").length;
			const pending = memberTasks.filter(t => !["Completed", "Cancelled"].includes(t.status)).length;
			const totalM = memberTasks.length;
			const rate = totalM ? Math.round((done / totalM) * 100) : 0;
			const highPriority = memberTasks.filter(t => ["High", "Critical"].includes(t.priority)).length;
			
			const loadCount = pending; // Use pending tasks for load calculation
			const loadClass = loadCount > 8 ? 'load-high' : loadCount > 4 ? 'load-medium' : 'load-low';
			const loadLabel = loadCount > 8 ? 'high load' : loadCount > 4 ? 'medium load' : 'low load';
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
...
									<span class="taskflow-perf-name">${escapeHtml(m.label)}</span>
									<span class="taskflow-load-badge ${loadClass}">${loadLabel}</span>
								</div>
								<div class="taskflow-perf-subtext">
									${totalM} tasks assigned • <span style="color: #ef4444; font-weight: 700;">${pending} pending</span> • ${highPriority} high priority
								</div>
							</div>
						</div>
						<div class="taskflow-perf-badge ${rate >= 80 ? 'excellent' : rate >= 50 ? 'good' : 'average'}">
							${rate >= 80 ? 'Excellent' : rate >= 50 ? 'Good' : 'Average'}
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
								${totalM > 0 ? 'Active' : 'Low activity'}
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
		}).join("");

		refs.dashboardView.innerHTML = `
			<div class="taskflow-dashboard-grid">
				${stats.map(s => `
					<div class="taskflow-widget-card">
						<span class="taskflow-widget-label">${s.label}</span>
						<span class="taskflow-widget-value" style="color: ${s.color}">${s.value}</span>
						<div class="taskflow-widget-footer">
							<span class="${getTrendClass(s.trend)}">${s.trend}</span> vs last week
						</div>
					</div>
				`).join("")}
			</div>

			<div class="taskflow-dashboard-charts">
				<div class="taskflow-chart-card">
					<div class="taskflow-chart-header">
						<h3 class="taskflow-chart-title">Status Distribution</h3>
						<button class="taskflow-btn-ghost" type="button" aria-label="More chart actions" disabled>⋯</button>
					</div>
					<div class="taskflow-progress-list">
						${statusBreakdown.map(b => `
							<div class="taskflow-progress-item">
								<div class="taskflow-progress-meta">
									<span>${escapeHtml(b.status)}</span>
									<span>${b.count} tasks (${b.percent}%)</span>
								</div>
								<div class="taskflow-progress-bg">
									<div class="taskflow-progress-fill" style="width: ${b.percent}%; background: ${getStatusColor(b.status)}"></div>
								</div>
							</div>
						`).join("")}
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
			"Open": "#64748b",
			"In Progress": "#3b82f6",
			"Review": "#f59e0b",
			"On Hold": "#ef4444",
			"Completed": "#10b981",
			"Cancelled": "#94a3b8"
		};
		return colors[status] || "#cbd5e1";
	}

	function renderBoard(tasks) {
		if (!refs.board) return;
		const canAddTask = canCreateTask();
		refs.board.innerHTML = getStatusColumns().map((status) => renderColumn(status, tasks.filter((task) => task.status === status), canAddTask)).join("");

		refs.board.querySelectorAll("[data-task-edit]").forEach((button) => {
			button.addEventListener("click", () => {
				if (state.suppressTaskClick) return;
				const task = findTask(button.dataset.taskEdit);
				if (task) openTaskModal(task);
			});
		});

		refs.board.querySelectorAll("[data-add-task-inline]").forEach((button) => {
			button.addEventListener("click", () => {
				openTaskModal();
				const column = button.closest(".taskflow-column");
				const status = column ? column.dataset.status : null;
				if (status) {
					setTimeout(() => {
						refs.taskForm.elements.status.value = status;
					}, 100);
				}
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
				if (!state.draggedTaskName || state.draggedTaskName === card.dataset.taskCard) return;
				event.preventDefault();
				event.stopPropagation();
				card.classList.add("taskflow-card-drop-target");
			});

			card.addEventListener("dragleave", (event) => {
				card.classList.remove("taskflow-card-drop-target");
			});

			card.addEventListener("drop", async (event) => {
				if (!state.draggedTaskName || state.draggedTaskName === card.dataset.taskCard) return;
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
					const taskName = event.dataTransfer.getData("text/plain") || state.draggedTaskName;
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

		// Clean up existing content
		refs.listView.innerHTML = `
			<div id="taskGrid" class="ag-theme-alpine" style="height: 600px; width: 100%; border: none;"></div>
		`;


		const columnDefs = [
			{ headerName: "Sr No.", valueGetter: "node.rowIndex + 1", width: 80, sortable: false, filter: false },
			{ headerName: "Task Name", field: "task_title", sortable: true, filter: true },
			{ headerName: "Assignee", field: "assigned_to", sortable: true, filter: true },
			{ headerName: "Status", field: "status", sortable: true, filter: true },
			{ headerName: "Priority", field: "priority", sortable: true, filter: true },
			{ headerName: "Due Date", field: "due_date", sortable: true, filter: true, valueFormatter: (params) => formatDate(params.value) },
			{ headerName: "Last Modified", field: "modified", sortable: true, filter: true, valueFormatter: (params) => prettyDate(params.value) },
			{ headerName: "Tags", field: "task_type", sortable: true, filter: true }
		];

		const gridOptions = {
			rowData: tasks,
			columnDefs: columnDefs,
			pagination: true,
			onRowClicked: (event) => openTaskModal(event.data)
		};

		const gridDiv = document.querySelector('#taskGrid');
		agGrid.createGrid(gridDiv, gridOptions);
	}

	function renderColumn(status, tasks, canAddTask) {
		const dotColor = getStatusColor(status);
		const sortedTasks = [...tasks].sort((a, b) => (Number(a.sequence || 0) - Number(b.sequence || 0)));
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
		const statusOptions = statuses.map(s => 
			`<option value="${escapeHtml(s)}" ${s === task.status ? 'selected' : ''}>${escapeHtml(s)}</option>`
		).join("");

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
		form.elements.project_code.value = project ? project.project_code : "";
		form.elements.team.innerHTML = buildTeamOptions(project ? project.team : "");
		form.elements.status.value = project ? project.status : "Draft";
		form.elements.priority.value = project ? project.priority : "Medium";
		form.elements.start_date.value = dateInputValue(project ? project.start_date : "");
		form.elements.end_date.value = dateInputValue(project ? project.end_date : "");
		form.elements.expected_hours.value = project ? project.expected_hours || "" : "";
		form.elements.completion_percent.value = project ? project.completion_percent || 0 : 0;
		form.elements.project_lead.innerHTML = buildMemberOptions(project ? project.team : null, project ? project.project_lead : "");
		form.elements.description.value = project ? stripHtml(project.description || "") : "";
		toggleModal(refs.projectModal, true);
	}

	function openTaskModal(task) {
		const currentProject = state.projectWorkspace && state.projectWorkspace.project;
		if (!currentProject && !task) return;

		if (!task) {
			// Quick Create for new tasks
			state.taskModalMode = "create";
			const form = refs.taskFormQuick;
			form.reset();
			form.elements.project.value = currentProject.name;
			form.elements.team.value = currentProject.team;
			form.elements.status.value = "Open";
			form.elements.assigned_to.innerHTML = buildMemberOptions(currentProject.team, "");
			toggleModal(refs.taskModalQuick, true);
		} else {
			// Advanced View for existing tasks
			state.taskModalMode = "edit";
			const form = refs.taskForm;
			form.reset();
			// Populate advanced form fields as before...
			// (Simplified for brevity, this uses your existing openTaskModal logic)
			
			// Re-calling your existing logic here would be redundant, 
			// I'll leave the existing full logic for task-edit.
			_populateAdvancedTaskForm(task, currentProject);
			toggleModal(refs.taskModal, true);
		}
	}

	function _populateAdvancedTaskForm(task, currentProject) {
		const form = refs.taskForm;
		const team = task.team || currentProject.team;
		form.elements.name.value = task.name;
		form.elements.project.value = task.project;
		form.elements.team.value = team;
		form.elements.task_title.value = task.task_title;
		form.elements.status.value = task.status;
		form.elements.priority.value = task.priority;
		form.elements.task_type.value = task.task_type || "Task";
		form.elements.assigned_to.innerHTML = buildMemberOptions(team, task.assigned_to);
		form.elements.start_date.value = datetimeInputValue(task.start_date);
		form.elements.due_date.value = datetimeInputValue(task.due_date);
		form.elements.estimated_hours.value = task.estimated_hours || "";
		form.elements.sequence.value = task.sequence || "";
		form.elements.description.value = stripHtml(task.description || "");
		form.elements.is_milestone.checked = Boolean(task.is_milestone);
		form.elements.is_blocked.checked = Boolean(task.is_blocked);
		
		const idLabel = document.querySelector("[data-task-id-label]");
		if (idLabel) idLabel.textContent = task.name.split("-").pop() || task.name;
		
		const projectBreadcrumb = document.querySelector("[data-task-project-breadcrumb]");
		const typeBreadcrumb = document.querySelector("[data-task-type-breadcrumb]");
		if (projectBreadcrumb) projectBreadcrumb.textContent = task.project_title || task.project;
		if (typeBreadcrumb) typeBreadcrumb.textContent = task.task_type || "Task";

		const avatarLarge = document.querySelector("[data-assigned-avatar-large]");
		if (avatarLarge) avatarLarge.textContent = initials(task.assigned_to || "UA");

		state.currentChecklist = task.checklist || [];
		renderChecklist();
		renderComments([]);
        // Re-fetch details logic should be triggered here if needed
		toggleModal(refs.taskModal, true);
	}

	function renderChecklist() {
		const list = document.querySelector("[data-checklist-list]");
		const countLabel = document.querySelector("[data-checklist-count]");
		if (!list) return;

		const items = state.currentChecklist;
		if (countLabel) countLabel.textContent = `${items.length} items`;

		if (!items.length) {
			list.innerHTML = '<div class="taskflow-muted" style="font-size: 12px; padding: 12px; text-align: center;">No checklist items.</div>';
			return;
		}

		list.innerHTML = items.map((item, index) => `
			<div class="taskflow-checklist-item ${item.is_completed ? 'is-completed' : ''}">
				<label class="taskflow-checkbox-wrapper">
					<input type="checkbox" data-toggle-checklist-item="${index}" ${item.is_completed ? 'checked' : ''}>
					<span class="taskflow-checkbox-custom"></span>
				</label>
				<input type="text" class="taskflow-checklist-input" data-edit-checklist-item="${index}" value="${escapeHtml(item.checklist_item)}" />
				<button class="taskflow-checklist-remove" type="button" data-remove-checklist-item="${index}" title="Remove item">&times;</button>
			</div>
		`).join("");
	}

	function addChecklistItem() {
		const input = document.querySelector("[data-new-checklist-item]");
		const value = input?.value.trim();
		if (!value) return;

		state.currentChecklist.push({
			checklist_item: value,
			is_completed: 0,
			sequence: (state.currentChecklist.length + 1) * 10
		});

		input.value = "";
		renderChecklist();
		triggerAutoSave();
	}

	function removeChecklistItem(index) {
		state.currentChecklist.splice(index, 1);
		renderChecklist();
		triggerAutoSave();
	}

	function toggleChecklistItem(index, checked) {
		const item = state.currentChecklist[index];
		if (item) {
			item.is_completed = checked ? 1 : 0;
			renderChecklist();
			triggerAutoSave();
		}
	}

	function updateChecklistItem(index, value) {
		const item = state.currentChecklist[index];
		if (item) {
			item.checklist_item = value;
			triggerAutoSave();
		}
	}

	function renderComments(comments) {
		const list = document.querySelector("[data-comment-list]");
		if (!list) return;
		
		if (!comments || !comments.length) {
			list.innerHTML = '<div class="taskflow-muted" style="text-align: center; padding: 16px;">No comments yet.</div>';
			return;
		}
		
		const currentUser = state.bootstrap && state.bootstrap.user && state.bootstrap.user.user;
		
		// Sort or reverse comments to ensure newest is at the bottom
		// Assuming the API returns newest first, we reverse it.
		const displayComments = [...comments].reverse();

		list.innerHTML = displayComments.map(c => {
			const isMe = c.owner === currentUser;
			return `
				<div class="taskflow-comment-item ${isMe ? 'is-me' : ''}">
					<div class="taskflow-assignee-avatar" style="width: 28px; height: 28px; font-size: 11px; flex-shrink: 0;">
						${c.author_image ? `<img src="${c.author_image}" alt="" style="width: 100%; height: 100%; object-fit: cover;">` : initials(c.author_name)}
					</div>
					<div class="taskflow-comment-content">
						<div class="taskflow-comment-header">
							<span class="taskflow-comment-author">${escapeHtml(isMe ? 'You' : c.author_name)}</span>
							<span class="taskflow-comment-date">${prettyDate(c.creation)}</span>
						</div>
						<div class="taskflow-comment-text">${escapeHtml(c.content)}</div>
					</div>
				</div>
			`;
		}).join("");

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
			await apiCall("add_task_comment", { task: taskName, content: content }, "POST");
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
		
		const diff = (((new Date()).getTime() - date.getTime()) / 1000);
		const day_diff = Math.floor(diff / 86400);

		if (isNaN(day_diff) || day_diff < 0) return "";

		return day_diff == 0 && (
			diff < 60 && "just now" ||
			diff < 120 && "1 minute ago" ||
			diff < 3600 && Math.floor(diff / 60) + " minutes ago" ||
			diff < 7200 && "1 hour ago" ||
			diff < 86400 && Math.floor(diff / 3600) + " hours ago") ||
			day_diff == 1 && "Yesterday" ||
			day_diff < 7 && day_diff + " days ago" ||
			day_diff < 31 && Math.ceil(day_diff / 7) + " weeks ago" ||
			day_diff < 365 && Math.ceil(day_diff / 30) + " months ago" ||
			Math.ceil(day_diff / 365) + " years ago";
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
				project_code: form.elements.project_code.value,
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
		setFormSaving(form, true);
		try {
			const payload = getTaskFormPayload(form);
			await saveTask(payload);
		} finally {
			setFormSaving(form, false);
		}
	}

	function getTaskFormPayload(form) {
		return {
			name: form.elements.name.value || undefined,
			project: form.elements.project.value,
			team: form.elements.team.value,
			task_title: form.elements.task_title.value,
			status: form.elements.status.value,
			priority: form.elements.priority.value,
			task_type: form.elements.task_type.value,
			assigned_to: form.elements.assigned_to.value || null,
			start_date: form.elements.start_date.value || null,
			due_date: form.elements.due_date.value || null,
			estimated_hours: form.elements.estimated_hours.value || 0,
			sequence: form.elements.sequence.value || null,
			description: form.elements.description.value || "",
			is_milestone: form.elements.is_milestone.checked ? 1 : 0,
			is_blocked: form.elements.is_blocked.checked ? 1 : 0,
			checklist: state.currentChecklist,
		};
	}

	function triggerAutoSave() {
		const form = refs.taskForm;
		// Only auto-save if editing an existing task
		if (!form || !form.elements.name.value) return;

		if (state.autoSaveTimer) clearTimeout(state.autoSaveTimer);
		
		state.autoSaveTimer = setTimeout(async () => {
			const statusEl = document.querySelector("[data-task-save-status]");
			if (statusEl) {
				statusEl.textContent = "Saving...";
				statusEl.style.opacity = "1";
			}

			const payload = getTaskFormPayload(form);
			await saveTask(payload, { isAutoSave: true });

			if (statusEl) {
				statusEl.textContent = "Saved";
				setTimeout(() => {
					statusEl.style.opacity = "0";
				}, 2000);
			}
		}, 1000);
	}

	async function saveProject(payload) {
		try {
			const result = await apiCall("save_project", { payload: JSON.stringify(payload) }, "POST");
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
			
			if (!options.isAutoSave) {
				closeModal("task");
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
				console.error("Auto-save failed:", error);
			}
		}
	}

	function closeModal(name) {
		if (name === "project") toggleModal(refs.projectModal, false);
		if (name === "task") toggleModal(refs.taskModal, false);
	}

	function toggleModal(element, open) {
		if (!element) return;
		if (open) {
			element.classList.add("open");
			element.setAttribute("aria-hidden", "false");
			const focusTarget = element.querySelector("input:not([type='hidden']), select, textarea, button");
			focusTarget?.focus();
		} else {
			element.classList.remove("open");
			element.setAttribute("aria-hidden", "true");
		}
	}

	function buildTeamOptions(selected) {
		return ((state.bootstrap && state.bootstrap.teams) || [])
			.map((team) => `<option value="${escapeHtml(team.name)}" ${team.name === selected ? "selected" : ""}>${escapeHtml(team.team_name)} (${escapeHtml(team.team_code)})</option>`)
			.join("");
	}

	function buildMemberOptions(teamName, selected) {
		const members = ((state.bootstrap && state.bootstrap.team_members) || []).filter((member) => member.team === teamName);
		const options = ['<option value="">Not set</option>'];
		let selectedFound = !selected;
		members.forEach((member) => {
			if (member.employee === selected) selectedFound = true;
			options.push(`<option value="${escapeHtml(member.employee || "")}" ${member.employee === selected ? "selected" : ""}>${escapeHtml(member.label)}</option>`);
		});
		if (!selectedFound) {
			options.push(`<option value="${escapeHtml(selected)}" selected>${escapeHtml(selected)}</option>`);
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

	function getHistoryState() {
		return {
			navMode: state.navMode,
			selectedProject: state.selectedProject,
			selectedTeam: state.selectedTeam,
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
			projects = projects.filter(project => project.team === state.selectedTeam);
		}
		if (!options.ignoreQuery && state.projectQuery) {
			const q = state.projectQuery.toLowerCase();
			projects = projects.filter(project => String(project.project_name || "").toLowerCase().includes(q));
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
		let defaultStatuses = (state.bootstrap && state.bootstrap.status_options && state.bootstrap.status_options.length)
			? state.bootstrap.status_options
			: STATUS_COLUMNS;

		if (storedOrder) {
			try {
				const order = JSON.parse(storedOrder);
				// Filter to ensure we only have valid statuses that still exist
				const filteredOrder = order.filter(s => defaultStatuses.includes(s));
				// Add any new statuses that weren't in the stored order
				const newStatuses = defaultStatuses.filter(s => !order.includes(s));
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
		bootstrapTasks.forEach(t => tasksMap.set(t.name, t));
		workspaceTasks.forEach(t => tasksMap.set(t.name, t));
		let allTasks = Array.from(tasksMap.values());

		// Optimistically update status
		task.status = nextStatus;

		// Get tasks in target column
		let columnTasks = allTasks
			.filter(t => t.status === nextStatus && t.name !== taskName)
			.sort((a, b) => (Number(a.sequence || 0) - Number(b.sequence || 0)));

		// Find insertion index
		let targetIdx = columnTasks.findIndex(t => t.name === targetTaskName);
		if (targetIdx === -1) {
			columnTasks.push(task);
		} else {
			columnTasks.splice(targetIdx, 0, task);
		}

		// Re-calculate sequences
		const newSequences = {};
		columnTasks.forEach((t, idx) => {
			const newSeq = (idx + 1) * 10;
			t.sequence = newSeq;
			newSequences[t.name] = newSeq;
		});

		refreshView();

		try {
			await apiCall("update_task_sequences", { 
				sequences: JSON.stringify(newSequences) 
			}, "POST");
			
			if (previousStatus !== nextStatus) {
				await apiCall("save_task", { 
					payload: JSON.stringify({ 
						name: taskName, 
						status: nextStatus 
					}) 
				}, "POST");
			}
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

	function renderActiveEmptyState(message) {
		const emptyHtml = `<div class="taskflow-empty">${escapeHtml(message)}</div>`;
		if (state.taskView === "kanban" && refs.board) {
			refs.board.innerHTML = emptyHtml;
		} else if (state.taskView === "timeline") {
			const grid = document.querySelector("[data-timeline-grid]");
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
		const roles = ["Team Lead", "Project Manager", "Team Member", "Viewer", "Auditor", "Coordinator"];

		target.innerHTML = `
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
							${members.map((m, idx) => `
								<tr style="border-bottom: 1px solid var(--taskflow-border);">
									<td style="padding: 12px;">${escapeHtml(m.employee_name || m.employee)}</td>
									<td style="padding: 12px;">${escapeHtml(m.team_role)}</td>
									<td style="padding: 12px;">
										<button class="taskflow-button secondary" type="button" data-remove-member="${idx}">Remove</button>
									</td>
								</tr>
							`).join("")}
							<tr style="background: #f1f5f9;">
								<td style="padding: 12px; position: relative;">
									<input type="text" data-emp-search placeholder="Search Employee..." style="padding: 8px; width: 100%; border-radius: 4px; border: 1px solid var(--taskflow-border);">
									<div data-emp-results style="position: absolute; top: 100%; left: 12px; right: 12px; background: white; border: 1px solid var(--taskflow-border); z-index: 10; max-height: 200px; overflow-y: auto;"></div>
								</td>
								<td style="padding: 12px;">
									<select data-new-member-role style="padding: 8px; width: 100%; border-radius: 4px; border: 1px solid var(--taskflow-border);">
										${roles.map(r => `<option value="${escapeHtml(r)}">${escapeHtml(r)}</option>`).join("")}
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

		const searchInput = target.querySelector('[data-emp-search]');
		const resultsDiv = target.querySelector('[data-emp-results]');
		let selectedEmployeeId = null;

		searchInput.addEventListener('input', async (e) => {
			const val = e.target.value;
			if (val.length < 2) { resultsDiv.innerHTML = ''; return; }
			const results = await searchEmployees(val);
			resultsDiv.innerHTML = results.map(r => `<div data-val="${r.value}" style="padding: 8px; cursor: pointer;">${escapeHtml(r.label)}</div>`).join('');
			resultsDiv.querySelectorAll('div').forEach(div => {
				div.onclick = () => {
					searchInput.value = div.textContent;
					selectedEmployeeId = div.dataset.val;
					resultsDiv.innerHTML = '';
				};
			});
		});

		target.querySelectorAll('[data-remove-member]').forEach(btn => {
			btn.addEventListener('click', () => removeMember(btn.dataset.removeMember));
		});

		target.querySelector('[data-save-new-member]').addEventListener('click', () => {
			const team_role = target.querySelector('[data-new-member-role]').value;
			if (selectedEmployeeId && team_role) {
				addMember(selectedEmployeeId, team_role);
			} else {
				showMessage("Please select a valid Employee from the list.");
			}
		});
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
			"my-tasks": "My Tasks",
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
					throw new Error(response.ok ? "Invalid server response." : `Request failed (${response.status}).`);
				}
				if (!response.ok) {
					throw new Error(extractError(payload));
				}
				return payload;
			})
			.then((payload) => {
				if (payload.exc || payload._server_messages) {
					throw new Error(extractError(payload));
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
		return date ? date.toLocaleDateString() : "Not set";
	}

	function dateInputValue(value) {
		if (!value) return "";
		if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(value)) return value.slice(0, 10);
		const date = parseDateValue(value);
		return date ? formatLocalDate(date) : "";
	}

	function datetimeInputValue(value) {
		if (!value) return "";
		if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}/.test(value)) {
			return value.replace(" ", "T").slice(0, 16);
		}
		const date = parseDateValue(value);
		return date ? `${formatLocalDate(date)}T${pad(date.getHours())}:${pad(date.getMinutes())}` : "";
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
		const normalized = String(value).trim().replace(" ", "T");
		const date = new Date(normalized);
		return Number.isNaN(date.getTime()) ? null : date;
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
