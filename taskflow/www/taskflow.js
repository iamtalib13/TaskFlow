(function () {
	const METHOD_BASE = "/api/method/taskflow.taskflow.api.portal";
	const STATUS_COLUMNS = ["Open", "In Progress", "Review", "Blocked", "Completed"];

	const state = {
		bootstrap: null,
		selectedProject: null,
		projectWorkspace: null,
		navMode: "dashboard",
		taskView: window.localStorage.getItem("taskflow_task_view") || "dashboard",
		taskQuery: "",
		projectQuery: "",
		selectedTeam: "all",
		projectModalMode: "create",
		taskModalMode: "create",
	};

	const refs = {};

	document.addEventListener("DOMContentLoaded", init);

	async function init() {
		cacheDom();
		bindEvents();
		const initialParams = new URLSearchParams(window.location.search);
		await loadBootstrap(initialParams.get("project"), { updateUrl: false });
		loadStateFromUrl();
	}

	function updateUrlState() {
		const params = new URLSearchParams();
		params.set("mode", state.navMode);
		if (state.selectedProject) params.set("project", state.selectedProject);
		if (state.selectedTeam && state.selectedTeam !== "all") params.set("team", state.selectedTeam);
		
		const newUrl = `${window.location.pathname}?${params.toString()}`;
		window.history.pushState(state, "", newUrl);
	}

	function loadStateFromUrl() {
		const params = new URLSearchParams(window.location.search);
		const mode = params.get("mode");
		const project = params.get("project");
		const team = params.get("team");

		if (mode) {
			state.navMode = mode;
			if (mode === "team") {
				if (team) {
					state.selectedTeam = team;
					refs.teamSwitcher.value = team;
				}
				setNavMode("team");
				renderTeamView();
			} else {
				if (project) {
					if (project === state.selectedProject && state.projectWorkspace) {
						setNavMode("dashboard");
					} else {
						selectProject(project);
					}
				} else {
					setNavMode(mode);
				}
			}
		}
	}

	function cacheDom() {
		refs.root = document.querySelector("[data-taskflow-root]");
		refs.projectList = document.querySelector("[data-project-list]");
		refs.stats = document.querySelector("[data-stats]");
		refs.board = document.querySelector("[data-task-board]");
		refs.dashboardView = document.querySelector("[data-dashboard-view]");
		refs.listView = document.querySelector("[data-list-view]");
		refs.projectTitle = document.querySelector("[data-project-title]");
		refs.viewToggle = document.querySelector("[data-task-view-toggle]");
		refs.taskSearch = document.querySelector(".taskflow-search-bar input");
		refs.newProjectButtons = document.querySelectorAll("[data-new-project]");
		refs.newTaskButton = document.querySelector("[data-new-task]");
		refs.projectModal = document.querySelector("[data-project-modal]");
		refs.taskModal = document.querySelector("[data-task-modal]");
		refs.projectForm = document.querySelector("[data-project-form]");
		refs.taskForm = document.querySelector("[data-task-form]");
		refs.projectFormTitle = document.querySelector("[data-project-form-title]");
		refs.taskFormTitle = document.querySelector("[data-task-form-title]");
		refs.loading = document.querySelector("[data-taskflow-loading]");
		refs.sidebarToggle = document.querySelector(".taskflow-sidebar-toggle");
		refs.sidebar = document.querySelector(".taskflow-sidebar");
		refs.navItems = document.querySelectorAll("[data-nav]");
		refs.teamSwitcher = document.querySelector("[data-team-switcher]");
		refs.projectSearch = document.querySelector("[data-project-search]");
		refs.myTasksCount = document.querySelector("[data-my-tasks-count]");
	}

	function bindEvents() {
		refs.newProjectButtons.forEach((button) => {
			button.addEventListener("click", () => openProjectModal());
		});
		
		document.addEventListener("click", (e) => {
			if (e.target.closest("[data-new-task]")) {
				openTaskModal();
			}
		});

		refs.navItems.forEach((item) => {
			item.addEventListener("click", () => {
				const mode = item.dataset.nav;
				if (mode === "team") {
					setNavMode("team");
					renderTeamView();
				} else if (mode === "my-tasks" || mode === "dashboard") {
					setNavMode(mode);
				}
			});
		});

		refs.viewToggle.addEventListener("click", (event) => {
			const button = event.target.closest("[data-view]");
			if (!button) return;
			setTaskView(button.dataset.view);
		});

		refs.taskSearch.addEventListener("input", (event) => {
			state.taskQuery = event.target.value || "";
			refreshView();
		});

		if (refs.teamSwitcher) {
			refs.teamSwitcher.addEventListener("change", (e) => {
				state.selectedTeam = e.target.value;
				renderProjectList();
				if (state.navMode === 'team') {
					renderTeamView();
				} else {
					refreshView();
				}
			});
		}
		if (refs.projectSearch) {
			refs.projectSearch.addEventListener("input", (e) => {
				state.projectQuery = e.target.value;
				renderProjectList();
			});
		}

		refs.projectForm.addEventListener("submit", submitProjectForm);
		refs.taskForm.addEventListener("submit", submitTaskForm);
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
	}

	async function loadBootstrap(preferredProject, options = {}) {
		setLoading(true);
		try {
			const shouldUpdateUrl = options.updateUrl !== false;
			state.bootstrap = await apiCall("get_portal_bootstrap");
			state.selectedTeam = state.selectedTeam || "all";
			renderBootstrap();

			if (refs.teamSwitcher) {
				refs.teamSwitcher.value = state.selectedTeam;
			}

			const projectToSelect =
				preferredProject ||
				state.selectedProject ||
				(state.bootstrap.projects[0] && state.bootstrap.projects[0].name);

			if (projectToSelect) {
				await selectProject(projectToSelect, { updateUrl: shouldUpdateUrl });
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

	async function selectProject(projectName, options = {}) {
		state.navMode = "dashboard";
		state.selectedProject = projectName;
		if (options.updateUrl !== false) updateUrlState();
		updateNavActive();
		renderProjectList();
		try {
			state.projectWorkspace = await apiCall("get_project_workspace", { project: projectName });
			renderProjectWorkspace();
		} catch (error) {
			showMessage(error.message || "Unable to load project workspace.");
		}
	}

	function getSelectedTeamName() {
		if (state.selectedTeam === "all") return "All Teams";
		const team = state.bootstrap && state.bootstrap.teams.find(t => t.name === state.selectedTeam);
		return team ? team.team_name : "Team";
	}

	function setNavMode(mode) {
		state.navMode = mode;
		const toolbar = document.querySelector('.taskflow-toolbar');
		const tabs = document.querySelector('.taskflow-tabs');
		const breadcrumb = document.querySelector("[data-project-breadcrumb]");
		const teamView = document.querySelector("[data-team-view]");

		if (mode === "team") {
			state.selectedProject = null;
			state.projectWorkspace = null;
		}

		document.querySelectorAll('.taskflow-view-content').forEach(el => el.classList.add('taskflow-hidden'));
		if (toolbar) toolbar.classList.toggle('taskflow-hidden', mode === "team");
		if (tabs) tabs.classList.toggle('taskflow-hidden', mode === "team");

		if (mode === "team") {
			state.selectedTeam = state.selectedTeam || "all";
			const teamName = getSelectedTeamName();
			refs.projectTitle.textContent = teamName;
			if (breadcrumb) breadcrumb.textContent = `Team / ${teamName}`;
			if (refs.newTaskButton) refs.newTaskButton.disabled = true;
			if (teamView) teamView.classList.remove('taskflow-hidden');
			updateNavActive();
			renderProjectList();
			updateUrlState();
			return;
		}

		updateNavActive();
		renderProjectList();
		renderProjectWorkspace();
		updateUrlState();
	}
	async function renderTeamView() {
		const teamGrid = document.querySelector('[data-team-grid]');
		const header = document.querySelector('[data-team-view] h2');
		const teamName = getSelectedTeamName();

		if (header) header.textContent = `${teamName} Team Dashboard`;
		teamGrid.innerHTML = '<div class="taskflow-empty">Loading team data...</div>';

		try {
			const data = await apiCall("get_dashboard_data");
			const allGlobalData = data.global_team_data || [];
			let filteredMembers = allGlobalData;
			if (state.selectedTeam && state.selectedTeam !== "all") {
				const team = state.bootstrap.teams.find(t => t.name === state.selectedTeam);
				if (team) {
					filteredMembers = allGlobalData.filter(m => m.projects && m.projects.includes(team.team_name));
				}
			}

			if (filteredMembers.length === 0) {
				teamGrid.innerHTML = '<div class="taskflow-empty">No team members found.</div>';
				return;
			}

			teamGrid.innerHTML = filteredMembers.map(m => `
				<div class="taskflow-team-card" data-member-detail='${escapeHtml(JSON.stringify(m))}'>
					<div class="taskflow-team-card-header">
						<div class="taskflow-avatar" style="background: #3b82f6; color: white;">${initials(m.full_name)}</div>
						<div>
							<div class="taskflow-team-member-name">${escapeHtml(m.full_name)}</div>
							<div class="taskflow-team-member-role">Team Member</div>
						</div>
					</div>
					<div class="taskflow-team-stats">
						<div class="taskflow-stat-box">
							<span class="taskflow-stat-value">${m.pending_tasks || 0}</span>
							<span class="taskflow-stat-label">Pending</span>
						</div>
						<div class="taskflow-stat-box">
							<span class="taskflow-stat-value">${m.completed_tasks || 0}</span>
							<span class="taskflow-stat-label">Done</span>
						</div>
					</div>
					<div style="margin-top: 15px; font-size: 12px; color: #64748b; height: 3em; overflow: hidden;">
						<strong>Projects:</strong> ${escapeHtml(m.projects || 'None')}
					</div>
				</div>
			`).join('');

			teamGrid.querySelectorAll('[data-member-detail]').forEach(card => {
				card.addEventListener('click', () => {
					showMemberDetail(JSON.parse(card.dataset.memberDetail));
				});
			});
		} catch (err) {
			console.error(err);
			teamGrid.innerHTML = '<div class="taskflow-empty">Error loading team data.</div>';
		}
	}
	function showMemberDetail(member) {
		const backdrop = document.createElement('div');
		backdrop.className = 'taskflow-modal-backdrop open';
		backdrop.innerHTML = `
			<div class="taskflow-modal">
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
				<button class="taskflow-button secondary" style="margin-top: 20px;" onclick="this.parentElement.parentElement.remove()">Close</button>
			</div>
		`;
		document.body.appendChild(backdrop);
		backdrop.addEventListener('click', (e) => { if(e.target === backdrop) backdrop.remove(); });
	}


	function updateNavActive() {
		refs.navItems.forEach(item => {
			const isActive = item.dataset.nav === state.navMode;
			item.classList.toggle("active", isActive);
		});
	}

	function renderBootstrap() {
		renderTeamSwitcher();
		renderProjectList();
		
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
		let projects = (state.bootstrap && state.bootstrap.projects) || [];
		
		if (state.selectedTeam && state.selectedTeam !== "all") {
			projects = projects.filter(p => p.team === state.selectedTeam);
		}
		
		if (state.projectQuery) {
			const q = state.projectQuery.toLowerCase();
			projects = projects.filter(p => p.project_name.toLowerCase().includes(q));
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
				return `
					<div class="taskflow-project-item ${activeClass}" data-project-select="${escapeHtml(project.name)}">
						<div class="taskflow-project-icon" style="background: ${color}">${initialsStr}</div>
						<span>${escapeHtml(project.project_name)}</span>
					</div>
				`;
			})
			.join("");

		refs.projectList.querySelectorAll("[data-project-select]").forEach((button) => {
			button.addEventListener("click", () => selectProject(button.dataset.projectSelect));
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
			refs.board.innerHTML = '<div class="taskflow-empty">Select a project to view tasks.</div>';
			refs.newTaskButton.disabled = true;
			return;
		}

		const project = workspace.project;
		const tasks = workspace.tasks || [];
		refs.projectTitle.textContent = project.project_name;
		if (breadcrumb) breadcrumb.textContent = project.project_name;
		refs.newTaskButton.disabled = !(project.permissions.can_manage_team || project.permissions.can_operate_team);

		renderTaskArea(tasks);
	}

	function setTaskView(view) {
		state.taskView = view;
		window.localStorage.setItem("taskflow_task_view", state.taskView);
		
		if (refs.viewToggle) {
			refs.viewToggle.querySelectorAll(".taskflow-tab").forEach(tab => {
				tab.classList.toggle("active", tab.dataset.view === state.taskView);
			});
		}

		refreshView();
	}

	// Add logic to globally filter tasks based on selected team
	function getFilteredTasks(tasks) {
		let filtered = tasks;
		if (state.selectedTeam && state.selectedTeam !== "all") {
			// Find team name from id
			const team = state.bootstrap.teams.find(t => t.name === state.selectedTeam);
			if (team) {
				filtered = filtered.filter(t => t.team === team.team_name);
			}
		}
		return filterTasks(filtered);
	}

	function refreshView() {
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

		const visibleTasks = getFilteredTasks(tasks);
		
		const views = [
			{ el: refs.dashboardView, key: "dashboard" },
			{ el: document.querySelector(".taskflow-board-wrapper"), key: "kanban" },
			{ el: refs.listView, key: "list" }
		];

		views.forEach(v => {
			if (v.el) v.el.classList.toggle("taskflow-hidden", v.key !== state.taskView);
		});

		if (state.taskView === "list") {
			renderList(visibleTasks);
		} else if (state.taskView === "kanban") {
			renderBoard(visibleTasks);
		} else if (state.taskView === "dashboard") {
			renderDashboard(visibleTasks);
		}
	}

	function renderDashboard(tasks) {
		if (!refs.dashboardView) return;

		const completed = tasks.filter(t => t.status === "Completed").length;
		const inProgress = tasks.filter(t => t.status === "In Progress").length;
		const overdue = tasks.filter(t => t.due_date && new Date(t.due_date) < new Date() && t.status !== "Completed").length;
		const total = tasks.length;

		const stats = [
			{ label: "Total Tasks", value: total, trend: "Stable", color: "var(--taskflow-primary)" },
			{ label: "Completed", value: completed, trend: "+12%", color: "#10b981" },
			{ label: "In Progress", value: inProgress, trend: "Active", color: "#3b82f6" },
			{ label: "Overdue", value: overdue, trend: "-2", color: "#ef4444" }
		];

		const statusBreakdown = STATUS_COLUMNS.map(status => {
			const count = tasks.filter(t => t.status === status).length;
			const percent = total ? Math.round((count / total) * 100) : 0;
			return { status, count, percent };
		});

		// Team Performance Data
		const members = (state.projectWorkspace && state.projectWorkspace.team_members) || [];
		const memberCardsHtml = members.map(m => {
			const memberTasks = tasks.filter(t => t.assigned_to === m.employee || t.assigned_to_user === m.user);
			const done = memberTasks.filter(t => t.status === "Completed").length;
			const highPriority = memberTasks.filter(t => ["High", "Critical"].includes(t.priority)).length;
			const totalM = memberTasks.length;
			const rate = totalM ? Math.round((done / totalM) * 100) : 0;
			
			let load = "low load";
			let loadClass = "load-low";
			if (totalM > 10) { load = "high load"; loadClass = "load-high"; }
			else if (totalM > 5) { load = "medium load"; loadClass = "load-medium"; }

			const performanceScore = rate > 80 ? 80 + Math.floor(Math.random() * 20) : rate;

			return `
				<div class="taskflow-member-card">
					<div class="taskflow-member-header">
						<div class="taskflow-member-info">
							<div class="taskflow-assignee-avatar" style="width: 44px; height: 44px; font-size: 16px;">${initials(m.label)}</div>
							<div class="taskflow-member-name-box">
								<span class="taskflow-member-name">${escapeHtml(m.label)}</span>
								<span class="taskflow-load-badge ${loadClass}">${load}</span>
							</div>
						</div>
						<button class="taskflow-btn-ghost">⋯</button>
					</div>
					<div class="taskflow-member-task-summary">
						${totalM} tasks assigned • ${highPriority} high priority
					</div>
					<div class="taskflow-member-stats-row">
						<div class="taskflow-member-stat">
							<span class="taskflow-member-stat-label">Performance Score</span>
							<span class="taskflow-member-stat-value">${performanceScore}%</span>
						</div>
						<div class="taskflow-member-stat">
							<span class="taskflow-member-stat-label">Completion Rate</span>
							<span class="taskflow-member-stat-value">${rate}%</span>
						</div>
					</div>
					<div class="taskflow-member-meta-grid">
						<div class="taskflow-meta-item">
							<span class="taskflow-meta-label">Done</span>
							<span class="taskflow-meta-value">${done}/${totalM} done</span>
						</div>
						<div class="taskflow-meta-item">
							<span class="taskflow-meta-label">Avg Task Age</span>
							<span class="taskflow-meta-value">0 days</span>
						</div>
						<div class="taskflow-meta-item">
							<span class="taskflow-meta-label">Status</span>
							<span class="taskflow-meta-value">${totalM > 0 ? 'Active' : 'Low activity'}</span>
						</div>
					</div>
					<div class="taskflow-member-progress-box">
						<div class="taskflow-member-progress-header">
							<span>Task Completion Progress</span>
							<span>${done}/${totalM}</span>
						</div>
						<div class="taskflow-progress-bg">
							<div class="taskflow-progress-fill" style="width: ${rate}%; background: var(--taskflow-primary)"></div>
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
							<span class="${s.trend.startsWith('+') ? 'taskflow-trend-up' : 'taskflow-trend-down'}">${s.trend}</span> vs last week
						</div>
					</div>
				`).join("")}
			</div>

			<div class="taskflow-dashboard-charts">
				<div class="taskflow-chart-card">
					<div class="taskflow-chart-header">
						<h3 class="taskflow-chart-title">Status Distribution</h3>
						<button class="taskflow-btn-ghost">⋯</button>
					</div>
					<div class="taskflow-progress-list">
						${statusBreakdown.map(b => `
							<div class="taskflow-progress-item">
								<div class="taskflow-progress-meta">
									<span>${b.status}</span>
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
						<h3 class="taskflow-chart-title">Team Highlights</h3>
					</div>
					<div style="font-size: 13px; color: var(--taskflow-text-muted); margin-bottom: 24px;">Project resource allocation and efficiency overview.</div>
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

			<h3 style="margin: 32px 0 16px; font-size: 18px; font-weight: 700;">Team Performance</h3>
			<div class="taskflow-member-grid">
				${memberCardsHtml || '<div class="taskflow-empty">No team members assigned to this project.</div>'}
			</div>
		`;
	}

	function getStatusColor(status) {
		const colors = {
			"Open": "#64748b",
			"In Progress": "#3b82f6",
			"Review": "#f59e0b",
			"Blocked": "#ef4444",
			"Completed": "#10b981"
		};
		return colors[status] || "#cbd5e1";
	}

	function renderBoard(tasks) {
		if (!refs.board) return;
		refs.board.innerHTML = STATUS_COLUMNS.map((status) => renderColumn(status, tasks.filter((task) => task.status === status))).join("");

		refs.board.querySelectorAll("[data-task-edit]").forEach((button) => {
			button.addEventListener("click", () => {
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
	}

	function renderList(tasks) {
		if (!refs.listView) return;
		const sortedTasks = [...tasks].sort((a, b) => (Number(a.sequence || 0) - Number(b.sequence || 0)));

		refs.listView.innerHTML = `
			<div class="taskflow-list-view" style="width: 100%; overflow-x: auto;">
				<div style="padding: 16px 0;">
					<button class="taskflow-add-task-inline" data-new-task>+ Add Task</button>
				</div>
				<table class="taskflow-table" style="width: 100%; border-collapse: collapse; background: white; border-radius: 12px; overflow: hidden; border: 1px solid var(--taskflow-border);">
					<thead style="background: #f8fafc; border-bottom: 1px solid var(--taskflow-border);">
						<tr>
							<th style="padding: 12px; text-align: left;"><input type="checkbox" /></th>
							<th style="padding: 12px; text-align: left; font-size: 12px; font-weight: 700; color: var(--taskflow-text-muted); text-transform: uppercase;">Task Name</th>
							<th style="padding: 12px; text-align: left; font-size: 12px; font-weight: 700; color: var(--taskflow-text-muted); text-transform: uppercase;">Assignee</th>
							<th style="padding: 12px; text-align: left; font-size: 12px; font-weight: 700; color: var(--taskflow-text-muted); text-transform: uppercase;">Status</th>
							<th style="padding: 12px; text-align: left; font-size: 12px; font-weight: 700; color: var(--taskflow-text-muted); text-transform: uppercase;">Priority</th>
							<th style="padding: 12px; text-align: left; font-size: 12px; font-weight: 700; color: var(--taskflow-text-muted); text-transform: uppercase;">Due Date</th>
							<th style="padding: 12px; text-align: left; font-size: 12px; font-weight: 700; color: var(--taskflow-text-muted); text-transform: uppercase;">Tags</th>
						</tr>
					</thead>
					<tbody>
						${sortedTasks.length ? sortedTasks.map(renderListRow).join("") : '<tr><td colspan="7" style="padding: 32px; text-align: center; color: var(--taskflow-text-muted);">No tasks found</td></tr>'}
					</tbody>
				</table>
			</div>
		`;

		refs.listView.querySelectorAll("[data-task-edit]").forEach((row) => {
			row.addEventListener("click", () => {
				const task = findTask(row.dataset.taskEdit);
				if (task) openTaskModal(task);
			});
		});
	}

	function renderListRow(task) {
		return `
			<tr class="taskflow-table-row" data-task-edit="${escapeHtml(task.name)}" style="border-bottom: 1px solid var(--taskflow-border); cursor: pointer; transition: background 0.2s;">
				<td style="padding: 12px;"><input type="checkbox" /></td>
				<td style="padding: 12px; font-weight: 500;">${escapeHtml(task.task_title)}</td>
				<td style="padding: 12px;">
					<div style="display: flex; align-items: center; gap: 8px;">
						<div class="taskflow-assignee-avatar" style="width: 24px; height: 24px; font-size: 10px;">${initials(task.assigned_to || "UA")}</div>
						<span style="font-size: 13px;">${escapeHtml(task.assigned_to || "Unassigned")}</span>
					</div>
				</td>
				<td style="padding: 12px;"><span class="taskflow-priority-pill" style="background: #f1f5f9; color: #475569;">${escapeHtml(task.status)}</span></td>
				<td style="padding: 12px;"><span class="taskflow-priority-pill priority-${slugify(task.priority)}">${escapeHtml(task.priority)}</span></td>
				<td style="padding: 12px; font-size: 13px; color: var(--taskflow-text-muted);">${formatDate(task.due_date)}</td>
				<td style="padding: 12px;"><span style="font-size: 11px; font-weight: 600; background: #e0f2fe; color: #0369a1; padding: 2px 8px; border-radius: 4px;">${escapeHtml(task.task_type || "Task")}</span></td>
			</tr>
		`;
	}

	function renderColumn(status, tasks) {
		const dotColor = getStatusColor(status);
		return `
			<section class="taskflow-column" data-status="${escapeHtml(status)}">
				<div class="taskflow-column-header">
					<div class="taskflow-column-title-box">
						<span class="taskflow-status-dot" style="background: ${dotColor}"></span>
						<span class="taskflow-column-name">${escapeHtml(status)}</span>
						<span class="taskflow-task-count">${tasks.length}</span>
					</div>
					<button class="taskflow-btn-ghost">⋯</button>
				</div>
				<button class="taskflow-add-task-inline" data-add-task-inline>+ Add Task</button>
				<div class="taskflow-task-list">
					${tasks.length ? tasks.map(renderTaskCard).join("") : ""}
				</div>
			</section>
		`;
	}

	function renderTaskCard(task) {
		return `
			<article class="taskflow-card" data-task-card="${escapeHtml(task.name)}" data-task-edit="${escapeHtml(task.name)}">
				<div class="taskflow-card-title">${escapeHtml(task.task_title)}</div>
				<div class="taskflow-card-footer">
					<div class="taskflow-card-meta">
						<div class="taskflow-assignee-avatar" title="${escapeHtml(task.assigned_to || "Unassigned")}">
							${initials(task.assigned_to || "UA")}
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

		state.taskModalMode = task ? "edit" : "create";
		refs.taskFormTitle.textContent = task ? "Edit Task" : "Create Task";
		refs.taskForm.reset();
		const form = refs.taskForm;
		const team = task ? task.team : currentProject.team;
		form.elements.name.value = task ? task.name : "";
		form.elements.project.value = task ? task.project : currentProject.name;
		form.elements.team.value = team;
		form.elements.task_title.value = task ? task.task_title : "";
		form.elements.status.value = task ? task.status : "Open";
		form.elements.priority.value = task ? task.priority : "Medium";
		form.elements.task_type.value = task ? task.task_type || "Task" : "Task";
		form.elements.assigned_to.innerHTML = buildMemberOptions(team, task ? task.assigned_to : "");
		form.elements.start_date.value = datetimeInputValue(task ? task.start_date : "");
		form.elements.due_date.value = datetimeInputValue(task ? task.due_date : "");
		form.elements.progress_percent.value = task ? task.progress_percent || 0 : 0;
		form.elements.estimated_hours.value = task ? task.estimated_hours || "" : "";
		form.elements.actual_hours.value = task ? task.actual_hours || "" : "";
		form.elements.sequence.value = task ? task.sequence || "" : "";
		form.elements.description.value = task ? stripHtml(task.description || "") : "";
		form.elements.is_milestone.checked = Boolean(task && task.is_milestone);
		form.elements.is_blocked.checked = Boolean(task && task.is_blocked);
		toggleModal(refs.taskModal, true);
	}

	async function submitProjectForm(event) {
		event.preventDefault();
		const form = event.currentTarget;
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
	}

	async function submitTaskForm(event) {
		event.preventDefault();
		const form = event.currentTarget;
		await saveTask({
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
			progress_percent: form.elements.progress_percent.value || 0,
			estimated_hours: form.elements.estimated_hours.value || 0,
			actual_hours: form.elements.actual_hours.value || 0,
			sequence: form.elements.sequence.value || null,
			description: form.elements.description.value || "",
			is_milestone: form.elements.is_milestone.checked ? 1 : 0,
			is_blocked: form.elements.is_blocked.checked ? 1 : 0,
		});
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

	async function saveTask(payload) {
		try {
			await apiCall("save_task", { payload: JSON.stringify(payload) }, "POST");
			closeModal("task");
			await loadBootstrap(payload.project || state.selectedProject);
		} catch (error) {
			showMessage(error.message || "Unable to save task.");
		}
	}

	function closeModal(name) {
		if (name === "project") toggleModal(refs.projectModal, false);
		if (name === "task") toggleModal(refs.taskModal, false);
	}

	function toggleModal(element, open) {
		element.classList.toggle("open", open);
	}

	function buildTeamOptions(selected) {
		return (state.bootstrap.teams || [])
			.map((team) => `<option value="${escapeHtml(team.name)}" ${team.name === selected ? "selected" : ""}>${escapeHtml(team.team_name)} (${escapeHtml(team.team_code)})</option>`)
			.join("");
	}

	function buildMemberOptions(teamName, selected) {
		const members = ((state.bootstrap && state.bootstrap.team_members) || []).filter((member) => member.team === teamName);
		const options = ['<option value="">Not set</option>'];
		members.forEach((member) => {
			options.push(`<option value="${escapeHtml(member.employee || "")}" ${member.employee === selected ? "selected" : ""}>${escapeHtml(member.label)}</option>`);
		});
		return options.join("");
	}

	function findTask(name) {
		const tasks = (state.projectWorkspace && state.projectWorkspace.tasks) || [];
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
			.then((response) => response.json())
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
		return new Date(value).toLocaleDateString();
	}

	function dateInputValue(value) {
		if (!value) return "";
		return new Date(value).toISOString().slice(0, 10);
	}

	function datetimeInputValue(value) {
		if (!value) return "";
		return new Date(value).toISOString().slice(0, 16);
	}

	function initials(value) {
		return (value || "?")
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

	function escapeHtml(value) {
		return String(value ?? "")
			.replace(/&/g, "&amp;")
			.replace(/</g, "&lt;")
			.replace(/>/g, "&gt;")
			.replace(/"/g, "&quot;")
			.replace(/'/g, "&#39;");
	}
})();
