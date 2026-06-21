/**
 * Taskflow Standalone Task Form JS (Mockup Integrated CRUD)
 */

(() => {
	const METHOD_BASE = "/api/method/taskflow.taskflow.api.portal";

	const state = {
		bootstrap: null,
		selectedProject: null,
		activeTaskName: null,
		currentChecklist: [],
		returnMode: "dashboard",
		returnView: "list",
		autoSaveTimer: null,
		isPopulating: false,
		activeTask: null,
	};

	const refs = {
		statusSelect: null,
		prioritySelect: null,
		projectSelect: null,
		taskTypeSelect: null,
		assignedToSelect: null,
		pendingWithSelect: null,
		guidedBySelect: null,
		startDateInput: null,
		dueDateInput: null,
		estimatedCompletionDateInput: null,
		estimatedHoursInput: null,
		ticketDateInput: null,
		ticketIdInput: null,
		ticketRaisedByInput: null,
		ticketDescriptionInput: null,
		isMilestoneInput: null,
		isBlockedInput: null,
		taskTitleInput: null,
		descEditor: null,
		saveBtn: null,
		cancelBtn: null,
		saveIndicator: null,
		checklistList: null,
		checklistInput: null,
		checklistProgress: null,
		progressFill: null,
		progressLabel: null,
		checklistCount: null,
		commentList: null,
		commentInput: null,
		commentEmpty: null,
	};

	document.addEventListener("DOMContentLoaded", init);

	async function init() {
		cacheDom();
		initDatepickers();
		initQuill();
		initResizers();
		bindEvents();

		try {
			state.bootstrap = await apiCall("get_portal_bootstrap");
			populateProjectSelect();
			populateAssigneeDropdowns();

			// Parse query params
			const params = new URLSearchParams(window.location.search);
			const taskName = params.get("task");
			const projectName = params.get("project");
			const statusName = params.get("status");
			const retMode = params.get("return_mode");
			const retView = params.get("return_view");

			if (retMode) state.returnMode = retMode;
			if (retView) state.returnView = retView;

			if (taskName) {
				state.activeTaskName = taskName;
				await loadTaskDetails(taskName);
			} else {
				// New Task Mode
				state.selectedProject = projectName || (state.bootstrap.projects[0] && state.bootstrap.projects[0].name) || "";
				if (state.selectedProject) {
					refs.projectSelect.value = state.selectedProject;
					updateAssigneeOptions();
				}
				if (statusName) {
					refs.statusSelect.value = statusName;
					updateStatusChip(refs.statusSelect);
				}
				updateBreadcrumbs();
				renderChecklist();
				renderComments([]);
				renderRecentActivity(null);
			}
		} catch (error) {
			showMessage(error.message || "Failed to initialize task form.");
		}
	}

	function cacheDom() {
		refs.statusSelect = document.getElementById("statusSelect");
		refs.prioritySelect = document.getElementById("prioritySelect");
		refs.projectSelect = document.getElementById("projectCapsule");
		refs.taskTypeSelect = document.getElementById("taskTypeCapsule");
		refs.assignedToSelect = document.getElementById("assignedToSelect");
		refs.pendingWithSelect = document.getElementById("pendingWithSelect");
		refs.guidedBySelect = document.getElementById("guidedBySelect");

		refs.startDateInput = document.getElementById("startDateInput");
		refs.dueDateInput = document.getElementById("dueDateInput");
		refs.estimatedCompletionDateInput = document.getElementById("estimatedCompletionDateInput");
		refs.estimatedHoursInput = document.getElementById("estimatedHoursInput");

		refs.ticketDateInput = document.getElementById("ticketDateInput");
		refs.ticketIdInput = document.getElementById("ticketIdInput");
		refs.ticketRaisedByInput = document.getElementById("ticketRaisedByInput");
		refs.ticketDescriptionInput = document.getElementById("ticketDescriptionInput");

		refs.isMilestoneInput = document.getElementById("isMilestoneInput");
		refs.isBlockedInput = document.getElementById("isBlockedInput");

		refs.taskTitleInput = document.getElementById("taskTitleInput");
		refs.descEditor = document.getElementById("descEditor");

		refs.saveBtn = document.getElementById("saveBtn");
		refs.cancelBtn = document.getElementById("cancelBtn");
		refs.saveIndicator = document.getElementById("saveIndicator");

		refs.checklistList = document.getElementById("checklistItems");
		refs.checklistInput = document.getElementById("checklistInput");
		refs.checklistProgress = document.getElementById("checklistProgress");
		refs.progressFill = document.getElementById("progressFill");
		refs.progressLabel = document.getElementById("progressLabel");
		refs.checklistCount = document.getElementById("checklistCount");

		refs.commentList = document.getElementById("commentList");
		refs.commentInput = document.getElementById("commentInput");
		refs.commentEmpty = document.getElementById("commentEmpty");
		refs.activityList = document.getElementById("activityList");
	}

	function initDatepickers() {
		if (!window.flatpickr) return;

		const inputs = [
			refs.startDateInput,
			refs.dueDateInput,
			refs.estimatedCompletionDateInput,
			refs.ticketDateInput,
		];

		inputs.forEach((input) => {
			if (!input) return;
			window.flatpickr(input, {
				dateFormat: "Y-m-d",
				altInput: true,
				altFormat: "d-m-Y",
				altInputClass: input.className,
				allowInput: false,
				clickOpens: true,
				disableMobile: true,
				onChange: () => {
					input.dispatchEvent(new Event("change", { bubbles: true }));
					triggerAutoSave();
				},
			});
		});
	}

	function initQuill() {
		if (document.getElementById("descEditor") && window.Quill) {
			window._descEditor = new Quill("#descEditor", {
				theme: "snow",
				placeholder: "Add a description...",
				modules: {
					toolbar: [
						[{ header: [1, 2, 3, 4, 5, 6, false] }],
						["bold", "italic", "underline", "strike"],
						[{ color: [] }, { background: [] }],
						["blockquote", "code-block"],
						["link", "image"],
						[{ list: "ordered" }, { list: "bullet" }],
						[{ align: [] }],
						["clean"]
					],
				},
			});

			window._descEditor.on("text-change", () => {
				triggerAutoSave();
			});
		}
	}

	function initResizers() {
		const leftSidebar = document.getElementById("leftSidebar");
		const rightSidebar = document.getElementById("rightSidebar");
		const leftResizer = document.getElementById("leftResizer");
		const rightResizer = document.getElementById("rightResizer");

		if (!leftSidebar || !rightSidebar || !leftResizer || !rightResizer) return;

		// Left Sidebar Resizer
		leftResizer.addEventListener("mousedown", (e) => {
			e.preventDefault();
			leftResizer.classList.add("active");
			document.body.style.cursor = "col-resize";

			const startWidth = leftSidebar.offsetWidth;
			const startX = e.clientX;

			function onMouseMove(moveEvent) {
				const currentWidth = startWidth + (moveEvent.clientX - startX);
				const boundedWidth = Math.max(180, Math.min(500, currentWidth));
				leftSidebar.style.width = `${boundedWidth}px`;
				leftSidebar.style.minWidth = `${boundedWidth}px`;
			}

			function onMouseUp() {
				leftResizer.classList.remove("active");
				document.body.style.cursor = "";
				document.removeEventListener("mousemove", onMouseMove);
				document.removeEventListener("mouseup", onMouseUp);
			}

			document.addEventListener("mousemove", onMouseMove);
			document.addEventListener("mouseup", onMouseUp);
		});

		// Right Sidebar Resizer
		rightResizer.addEventListener("mousedown", (e) => {
			e.preventDefault();
			rightResizer.classList.add("active");
			document.body.style.cursor = "col-resize";

			const startWidth = rightSidebar.offsetWidth;
			const startX = e.clientX;

			function onMouseMove(moveEvent) {
				const currentWidth = startWidth - (moveEvent.clientX - startX);
				const boundedWidth = Math.max(200, Math.min(600, currentWidth));
				rightSidebar.style.width = `${boundedWidth}px`;
				rightSidebar.style.minWidth = `${boundedWidth}px`;
			}

			function onMouseUp() {
				rightResizer.classList.remove("active");
				document.body.style.cursor = "";
				document.removeEventListener("mousemove", onMouseMove);
				document.removeEventListener("mouseup", onMouseUp);
			}

			document.addEventListener("mousemove", onMouseMove);
			document.addEventListener("mouseup", onMouseUp);
		});
	}

	function syncDatepickers() {
		[
			refs.startDateInput,
			refs.dueDateInput,
			refs.estimatedCompletionDateInput,
			refs.ticketDateInput,
		].forEach((input) => {
			if (input && input._flatpickr) {
				if (input.value) {
					input._flatpickr.setDate(input.value, false, "Y-m-d");
				} else {
					input._flatpickr.clear();
				}
			}
		});
	}

	function bindEvents() {
		// Project change -> Update assignees
		refs.projectSelect?.addEventListener("change", (e) => {
			state.selectedProject = e.target.value;
			updateAssigneeOptions();
			updateBreadcrumbs();
			triggerAutoSave();
		});

		// Assignee changes -> Update avatars and trigger save
		refs.assignedToSelect?.addEventListener("change", (e) => {
			updateAvatar(e.target.value, document.querySelector(".assignee-row .avatar"));
			triggerAutoSave();
		});
		refs.pendingWithSelect?.addEventListener("change", () => triggerAutoSave());
		refs.guidedBySelect?.addEventListener("change", () => triggerAutoSave());

		// Basic inputs trigger auto-save
		[
			refs.statusSelect,
			refs.prioritySelect,
			refs.taskTypeSelect,
			refs.estimatedHoursInput,
			refs.ticketIdInput,
			refs.ticketRaisedByInput,
			refs.ticketDescriptionInput,
			refs.isMilestoneInput,
			refs.isBlockedInput,
		].forEach(el => {
			el?.addEventListener("change", () => triggerAutoSave());
		});

		refs.statusSelect?.addEventListener("change", () => {
			updateDueDateStatusBadge();
		});
		refs.dueDateInput?.addEventListener("change", () => {
			updateDueDateStatusBadge();
		});

		[
			refs.taskTitleInput,
			refs.ticketIdInput,
			refs.ticketRaisedByInput,
			refs.ticketDescriptionInput,
		].forEach(el => {
			el?.addEventListener("input", () => triggerAutoSave());
		});

		if (refs.descEditor && !window._descEditor) {
			refs.descEditor.addEventListener("input", () => triggerAutoSave());
		}

		// Save Button
		refs.saveBtn?.addEventListener("click", () => saveTaskManual());

		// Cancel Button
		refs.cancelBtn?.addEventListener("click", handleCancel);

		// Comment Clear (inside Clear button in compose actions)
		const clearCommentBtn = document.querySelector(".comment-compose-actions .btn-ghost");
		clearCommentBtn?.removeAttribute("onclick"); // remove inline
		clearCommentBtn?.addEventListener("click", () => {
			if (refs.commentInput) refs.commentInput.value = "";
		});
	}

	function populateProjectSelect() {
		if (!refs.projectSelect) return;
		const projects = (state.bootstrap && state.bootstrap.projects) || [];
		refs.projectSelect.innerHTML = projects.map(p =>
			`<option value="${escapeHtml(p.name)}">${escapeHtml(p.project_name)}</option>`
		).join("");
	}

	function populateAssigneeDropdowns() {
		updateAssigneeOptions();
	}

	function updateAssigneeOptions() {
		const project = (state.bootstrap && state.bootstrap.projects || []).find(p => p.name === state.selectedProject);
		const teamName = project ? project.team : "";

		const members = (state.bootstrap && state.bootstrap.team_members || []).filter(
			member => member.team === teamName
		);

		const optionsHtml = ['<option value="">Not set</option>'] +
			members.map(member =>
				`<option value="${escapeHtml(member.employee || "")}">${escapeHtml(member.label)}</option>`
			).join("");

		// Set inner options
		if (refs.assignedToSelect) {
			const currentVal = refs.assignedToSelect.value;
			refs.assignedToSelect.innerHTML = optionsHtml;
			refs.assignedToSelect.value = currentVal || "";
			updateAvatar(refs.assignedToSelect.value, document.querySelector(".assignee-row .avatar"));
		}

		if (refs.pendingWithSelect) {
			const currentVal = refs.pendingWithSelect.value;
			refs.pendingWithSelect.innerHTML = optionsHtml;
			refs.pendingWithSelect.value = currentVal || "";
		}

		if (refs.guidedBySelect) {
			const currentVal = refs.guidedBySelect.value;
			refs.guidedBySelect.innerHTML = optionsHtml;
			refs.guidedBySelect.value = currentVal || "";
		}
	}

	function updateAvatar(employeeId, avatarEl) {
		if (!avatarEl) return;
		const member = (state.bootstrap && state.bootstrap.team_members || []).find(m => m.employee === employeeId);

		if (member && member.user_image) {
			avatarEl.innerHTML = `<img src="${member.user_image}" alt="" onerror="this.style.display='none'">`;
		} else {
			const initialsText = member ? initials(member.label) : "UA";
			avatarEl.innerHTML = initialsText;
		}
	}

	function updateBreadcrumbs() {
		const projectCrumb = document.querySelector(".breadcrumbs .crumb:first-child");
		const typeCrumb = document.querySelector(".breadcrumbs .crumb:nth-child(3)");
		const idCrumb = document.querySelector(".breadcrumbs .task-id");

		const project = (state.bootstrap && state.bootstrap.projects || []).find(p => p.name === state.selectedProject);
		const typeVal = refs.taskTypeSelect ? refs.taskTypeSelect.value : "Task";

		if (projectCrumb && project) {
			projectCrumb.textContent = project.project_name;
		}
		if (typeCrumb) {
			typeCrumb.textContent = typeVal;
		}
		if (idCrumb) {
			idCrumb.textContent = state.activeTaskName ? (state.activeTaskName.includes("-") ? state.activeTaskName.split("-").pop() : state.activeTaskName) : "New Task";
		}
	}

	async function loadTaskDetails(taskName) {
		try {
			state.isPopulating = true;
			const details = await apiCall("get_task_details", { task: taskName });
			if (details && details.task) {
				const task = details.task;
				state.activeTask = task;
				const currentProject = (state.bootstrap && state.bootstrap.projects || []).find(p => p.name === task.project);

				state.selectedProject = task.project;
				if (refs.projectSelect) refs.projectSelect.value = task.project;

				// Status & Priority
				if (refs.statusSelect) {
					refs.statusSelect.value = task.status || "Open";
					updateStatusChip(refs.statusSelect);
				}
				if (refs.prioritySelect) {
					refs.prioritySelect.value = task.priority || "Medium";
					updatePriorityChip(refs.prioritySelect);
				}
				if (refs.taskTypeSelect) {
					refs.taskTypeSelect.value = task.task_type || "Task";
					if (typeof updateTypeCapsule === "function") {
						updateTypeCapsule(refs.taskTypeSelect);
					}
				}

				// Text Inputs & Estimates
				if (refs.taskTitleInput) {
					refs.taskTitleInput.value = task.task_title || "";
					autoResize(refs.taskTitleInput);
				}
				if (refs.descEditor) {
					if (window._descEditor) {
						window._descEditor.root.innerHTML = task.description || "";
					} else {
						refs.descEditor.innerHTML = task.description || "";
					}
				}
				if (refs.estimatedHoursInput) {
					refs.estimatedHoursInput.value = task.estimated_hours || "";
				}

				// Assignees
				updateAssigneeOptions();
				if (refs.assignedToSelect) {
					refs.assignedToSelect.value = task.assigned_to || "";
					updateAvatar(task.assigned_to, document.querySelector(".assignee-row .avatar"));
				}
				if (refs.pendingWithSelect) refs.pendingWithSelect.value = task.pending_with || "";
				if (refs.guidedBySelect) refs.guidedBySelect.value = task.guided_by || "";

				// Ticket info
				if (refs.ticketIdInput) refs.ticketIdInput.value = task.ticket_id || "";
				if (refs.ticketRaisedByInput) refs.ticketRaisedByInput.value = task.ticket_raised_by || "";
				if (refs.ticketDescriptionInput) refs.ticketDescriptionInput.value = task.ticket_description || "";

				// Dates
				if (refs.startDateInput) refs.startDateInput.value = dateInputValue(task.start_date);
				if (refs.dueDateInput) refs.dueDateInput.value = dateInputValue(task.due_date);
				if (refs.estimatedCompletionDateInput) refs.estimatedCompletionDateInput.value = dateInputValue(task.estimated_completion_date);
				if (refs.ticketDateInput) refs.ticketDateInput.value = dateInputValue(task.ticket_date);
				syncDatepickers();
				updateDueDateStatusBadge();

				// Flags
				if (refs.isMilestoneInput) refs.isMilestoneInput.checked = Boolean(task.is_milestone);
				if (refs.isBlockedInput) refs.isBlockedInput.checked = Boolean(task.is_blocked);

				// Checklist & Comments
				state.currentChecklist = task.checklist || [];
				renderChecklist();
				renderComments(details.comments || []);
				renderRecentActivity(task);

				updateBreadcrumbs();
			}
		} catch (error) {
			showMessage(error.message || "Failed to load task details.");
		} finally {
			setTimeout(() => { state.isPopulating = false; }, 100);
		}
	}

	window.addChecklistItem = async function() {
		const val = refs.checklistInput?.value.trim();
		if (!val) return;

		const newItem = {
			checklist_item: val,
			is_completed: 0,
			sequence: (state.currentChecklist.length + 1) * 10
		};

		state.currentChecklist.push(newItem);
		refs.checklistInput.value = "";
		renderChecklist();

		if (state.activeTaskName) {
			registerLocalChange();
			await saveChecklistOnServer();
		}
	};

	window.toggleChecklistItem = async function(id) {
		const index = state.currentChecklist.findIndex((item, idx) => (item.id || idx) === id);
		const item = state.currentChecklist[index];
		if (!item) return;

		const prev = item.is_completed;
		item.is_completed = item.is_completed ? 0 : 1;
		renderChecklist();

		if (state.activeTaskName) {
			registerLocalChange();
			try {
				await apiCall("toggle_task_checklist_item", {
					payload: JSON.stringify({
						task: state.activeTaskName,
						index,
						row_name: item.name || null,
						checked: item.is_completed
					})
				}, "POST");
			} catch (error) {
				item.is_completed = prev;
				renderChecklist();
				showMessage(error.message || "Failed to toggle checklist item.");
			}
		}
	};

	window.deleteChecklistItem = async function(id) {
		const index = state.currentChecklist.findIndex((item, idx) => (item.id || idx) === id);
		if (index === -1) return;

		state.currentChecklist.splice(index, 1);
		renderChecklist();

		if (state.activeTaskName) {
			registerLocalChange();
			await saveChecklistOnServer();
		}
	};

	function renderChecklist() {
		if (!refs.checklistList) return;

		const done = state.currentChecklist.filter(i => i.is_completed).length;
		const total = state.currentChecklist.length;

		if (refs.checklistCount) {
			refs.checklistCount.textContent = total + (total === 1 ? " item" : " items");
		}

		if (total > 0) {
			if (refs.checklistProgress) refs.checklistProgress.style.display = "flex";
			const pct = Math.round((done / total) * 100);
			if (refs.progressFill) refs.progressFill.style.width = pct + "%";
			if (refs.progressLabel) refs.progressLabel.textContent = `${done} / ${total}`;
		} else {
			if (refs.checklistProgress) refs.checklistProgress.style.display = "none";
		}

		refs.checklistList.innerHTML = "";
		state.currentChecklist.forEach((item, index) => {
			const itemId = item.id || index;
			const div = document.createElement("div");
			div.className = "checklist-item";
			div.innerHTML = `
				<input type="checkbox" ${item.is_completed ? "checked" : ""} onchange="toggleChecklistItem(${itemId})" />
				<span class="checklist-item-text ${item.is_completed ? "done" : ""}">${escapeHtml(item.checklist_item)}</span>
				<button class="checklist-item-del" onclick="deleteChecklistItem(${itemId})">×</button>
			`;
			refs.checklistList.appendChild(div);
		});
	}

	async function saveChecklistOnServer() {
		try {
			const res = await apiCall("save_task_checklist", {
				payload: JSON.stringify({
					task: state.activeTaskName,
					checklist: state.currentChecklist
				})
			}, "POST");
			if (res && res.task) {
				state.currentChecklist = res.task.checklist || state.currentChecklist;
				renderChecklist();
			}
		} catch (error) {
			showMessage(error.message || "Failed to save checklist.");
		}
	}

	window.postComment = async function() {
		const content = refs.commentInput?.value.trim();
		if (!state.activeTaskName || !content) return;

		const postBtn = document.querySelector(".comment-compose-actions .btn-primary");
		if (postBtn) postBtn.disabled = true;

		try {
			await apiCall("add_task_comment", {
				payload: JSON.stringify({ task: state.activeTaskName, content })
			}, "POST");
			refs.commentInput.value = "";

			const details = await apiCall("get_task_details", { task: state.activeTaskName });
			if (details && details.comments) {
				renderComments(details.comments);
			}
		} catch (error) {
			showMessage(error.message || "Failed to post comment.");
		} finally {
			if (postBtn) postBtn.disabled = false;
		}
	};

	function renderComments(comments) {
		if (!refs.commentList) return;

		// Rebuild
		const existing = refs.commentList.querySelectorAll(".comment-item");
		existing.forEach(el => el.remove());

		if (!comments || comments.length === 0) {
			if (refs.commentEmpty) refs.commentEmpty.style.display = "flex";
			return;
		}
		if (refs.commentEmpty) refs.commentEmpty.style.display = "none";

		const displayComments = [...comments].reverse();
		displayComments.forEach(c => {
			const loggedInUser = state.bootstrap?.user?.user || (window.frappe?.session?.user);
			const isCurrentUser = (c.comment_by || c.owner) === loggedInUser;
			const div = document.createElement("div");
			div.className = "comment-item" + (isCurrentUser ? " current-user" : "");
			div.innerHTML = `
				<div class="avatar" style="width:28px;height:28px;flex-shrink:0;">
					${c.author_image ? `<img src="${c.author_image}" alt="">` : initials(c.author_name)}
				</div>
				<div class="comment-body">
					<div class="comment-header">
						<span class="comment-author">${escapeHtml(c.author_name)}</span>
						<span class="comment-ts">${prettyDate(c.creation)}</span>
					</div>
					<div class="comment-text">${escapeHtml(c.content)}</div>
				</div>
			`;
			refs.commentList.insertBefore(div, refs.commentEmpty);
		});

		refs.commentList.scrollTop = refs.commentList.scrollHeight;
	}

	function renderRecentActivity(task) {
		if (!refs.activityList) return;
		refs.activityList.innerHTML = "";

		if (!task) {
			refs.activityList.innerHTML = `<div class="activity-empty" style="padding: 12px; font-size: 11px; color: var(--text-muted); text-align: center;">No activity logged yet.</div>`;
			return;
		}

		const activities = [];

		if (task.creation) {
			activities.push({
				user_name: task.owner_name || task.owner || "System",
				user_image: task.owner_image,
				text: "created this task",
				time: task.creation,
				color_gradient: "linear-gradient(135deg, #fb923c, #f59e0b)"
			});
		}

		if (task.modified && task.modified !== task.creation) {
			activities.push({
				user_name: task.modified_by_name || task.modified_by || "System",
				user_image: task.modified_by_image,
				text: "last modified this task",
				time: task.modified,
				color_gradient: "linear-gradient(135deg, #4f6ef7, #a78bfa)"
			});
		}

		// Sort by time descending
		activities.sort((a, b) => {
			const dateA = parseDateValue(a.time) || new Date(0);
			const dateB = parseDateValue(b.time) || new Date(0);
			return dateB.getTime() - dateA.getTime();
		});

		activities.forEach(act => {
			const initialsText = initials(act.user_name);
			const avatarHtml = act.user_image 
				? `<img src="${act.user_image}" alt="" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">`
				: initialsText;

			const div = document.createElement("div");
			div.className = "activity-item";
			div.innerHTML = `
				<div
					class="activity-avatar"
					style="
						width: 26px;
						height: 26px;
						border-radius: 50%;
						background: ${act.user_image ? 'transparent' : act.color_gradient};
						display: flex;
						align-items: center;
						justify-content: center;
						font-size: 9px;
						font-weight: 600;
						color: #fff;
						flex-shrink: 0;
						overflow: hidden;
					"
				>
					${avatarHtml}
				</div>
				<div class="activity-body">
					<div class="activity-text">
						<strong>${escapeHtml(act.user_name)}</strong> ${escapeHtml(act.text)}
					</div>
					<div class="activity-time">${prettyDate(act.time)} (${formatExactDateTime(act.time)})</div>
				</div>
			`;
			refs.activityList.appendChild(div);
		});
	}

	function updateDueDateStatusBadge() {
		const badge = document.getElementById("dueDateStatusBadge");
		if (!badge) return;

		const dueDateVal = refs.dueDateInput?.value;
		const status = refs.statusSelect?.value;

		if (!dueDateVal) {
			badge.style.display = "none";
			return;
		}

		const due = parseDateValue(dueDateVal);
		if (!due) {
			badge.style.display = "none";
			return;
		}

		const today = new Date();
		today.setHours(0, 0, 0, 0);
		due.setHours(0, 0, 0, 0);

		const isCompleted = status === "Completed" || status === "Cancelled";
		const isOverdue = due < today && !isCompleted;

		badge.style.display = "inline-block";
		if (isOverdue) {
			badge.textContent = "Overdue";
			badge.style.background = "rgba(239, 68, 68, 0.1)";
			badge.style.color = "var(--red)";
			badge.style.border = "1px solid rgba(239, 68, 68, 0.2)";
		} else {
			badge.textContent = "On Time";
			badge.style.background = "rgba(34, 197, 94, 0.1)";
			badge.style.color = "var(--green)";
			badge.style.border = "1px solid rgba(34, 197, 94, 0.2)";
		}
	}

	function registerLocalChange() {
		if (!state.activeTask) return;

		state.activeTask.modified = new Date();
		state.activeTask.modified_by = state.bootstrap?.user?.user || (window.frappe?.session?.user) || "System";
		state.activeTask.modified_by_name = state.bootstrap?.user?.full_name || "System";
		state.activeTask.modified_by_image = state.bootstrap?.user?.user_image || null;

		renderRecentActivity(state.activeTask);
	}

	function triggerAutoSave() {
		if (state.isPopulating || !state.activeTaskName) return;
		registerLocalChange();
		clearTimeout(state.autoSaveTimer);
		state.autoSaveTimer = setTimeout(saveTaskAutomatic, 1500);
	}

	async function saveTaskAutomatic() {
		if (!validateDates()) return;
		try {
			const payload = getFormPayload();
			await apiCall("save_task", { payload: JSON.stringify(payload) }, "POST");
			showSaveIndicator();
			if (window.frappe && typeof frappe.show_alert === 'function') { frappe.show_alert({ message: __('Task saved'), indicator: 'green' }, 5); }
		} catch (error) {
			console.error("Auto-save failed:", error);
		}
	}

	async function saveTaskManual() {
		if (!validateDates()) return;

		if (refs.saveBtn) refs.saveBtn.disabled = true;
		try {
			const payload = getFormPayload();
			const res = await apiCall("save_task", { payload: JSON.stringify(payload) }, "POST");
			showSaveIndicator();
			if (window.frappe && typeof frappe.show_alert === 'function') { frappe.show_alert({ message: __('Task saved'), indicator: 'green' }, 5); }
			setTimeout(() => {
				const params = new URLSearchParams(window.location.search);
				if (res && res.name) {
					params.set("task", res.name);
				}
				const targetSearch = `?${params.toString()}`;
				if (window.location.search === targetSearch) {
					window.location.reload();
				} else {
					window.location.href = `${window.location.pathname}${targetSearch}`;
				}
			}, 800);
		} catch (error) {
			showMessage(error.message || "Failed to save task.");
			if (refs.saveBtn) refs.saveBtn.disabled = false;
		}
	}

	function getFormPayload() {
		const project = refs.projectSelect?.value || "";
		const projectObj = (state.bootstrap && state.bootstrap.projects || []).find(p => p.name === project);
		const team = projectObj ? projectObj.team : "";

		return {
			name: state.activeTaskName || undefined,
			project: project,
			team: team,
			task_title: refs.taskTitleInput?.value || "",
			status: refs.statusSelect?.value || "Open",
			priority: refs.prioritySelect?.value || "Medium",
			task_type: refs.taskTypeSelect?.value || "Task",
			assigned_to: refs.assignedToSelect?.value || null,
			pending_with: refs.pendingWithSelect?.value || null,
			guided_by: refs.guidedBySelect?.value || null,
			start_date: normalizeDateForPayload(refs.startDateInput?.value),
			due_date: normalizeDateForPayload(refs.dueDateInput?.value),
			estimated_completion_date: normalizeDateForPayload(refs.estimatedCompletionDateInput?.value),
			ticket_date: normalizeDateForPayload(refs.ticketDateInput?.value),
			estimated_hours: parseFloat(refs.estimatedHoursInput?.value) || 0,
			ticket_id: refs.ticketIdInput?.value || "",
			ticket_raised_by: refs.ticketRaisedByInput?.value || "",
			ticket_description: refs.ticketDescriptionInput?.value || "",
			is_milestone: refs.isMilestoneInput?.checked ? 1 : 0,
			is_blocked: refs.isBlockedInput?.checked ? 1 : 0,
			description: window._descEditor ? window._descEditor.root.innerHTML : (refs.descEditor?.innerHTML || ""),
			checklist: state.currentChecklist,
		};
	}

	function validateDates() {
		const startDate = refs.startDateInput?.value;
		const dueDate = refs.dueDateInput?.value;
		const estimatedCompletionDate = refs.estimatedCompletionDateInput?.value;

		if (startDate && dueDate) {
			const start = parseDateValue(startDate);
			const end = parseDateValue(dueDate);
			if (start && end && end < start) {
				showMessage("Due Date cannot be earlier than Start Date.");
				return false;
			}
		}

		if (startDate && estimatedCompletionDate) {
			const start = parseDateValue(startDate);
			const estimated = parseDateValue(estimatedCompletionDate);
			if (start && estimated && estimated < start) {
				showMessage("Estimated Completion Date cannot be earlier than Start Date.");
				return false;
			}
		}

		return true;
	}

	function showSaveIndicator() {
		if (!refs.saveIndicator) return;
		refs.saveIndicator.classList.add("visible");
		setTimeout(() => refs.saveIndicator.classList.remove("visible"), 2000);
	}

	function handleCancel() {
		redirectToDashboard();
	}

	function redirectToDashboard() {
		const project = refs.projectSelect?.value || state.selectedProject || "";
		let url = `/taskflow?mode=${state.returnMode}`;
		if (project) url += `&project=${encodeURIComponent(project)}`;
		if (state.returnView) url += `&view=${encodeURIComponent(state.returnView)}`;
		window.location.href = url;
	}

	/* Helper Utilities */
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
					const requestError = new Error(
						response.ok ? "Invalid server response." : `Request failed (${response.status}).`
					);
					requestError.status = response.status;
					throw requestError;
				}

				if (!response.ok) {
					const requestError = new Error(payload.message || `Request failed (${response.status}).`);
					requestError.status = response.status;
					requestError.responsePayload = payload;
					throw requestError;
				}

				return payload.message ?? payload;
			});
	}

	function parseDateValue(value) {
		if (!value) return null;
		if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;

		const trimmed = String(value).trim();
		const dmyMatch = trimmed.match(/^(\d{2})-(\d{2})-(\d{4})$/);
		if (dmyMatch) {
			const [, day, month, year] = dmyMatch;
			const date = new Date(Number(year), Number(month) - 1, Number(day));
			return Number.isNaN(date.getTime()) ? null : date;
		}

		const normalized = trimmed.replace(" ", "T");
		const date = new Date(normalized);
		return Number.isNaN(date.getTime()) ? null : date;
	}

	function dateInputValue(value) {
		if (!value) return "";
		if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(value))
			return value.slice(0, 10);
		const date = parseDateValue(value);
		return date ? formatLocalDate(date) : "";
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

	function initials(name) {
		return String(name || "")
			.split(" ")
			.map(part => part[0])
			.join("")
			.substring(0, 2)
			.toUpperCase();
	}

	function prettyDate(dateStr) {
		const date = parseDateValue(dateStr);
		if (!date) return "";

		const diff = (new Date().getTime() - date.getTime()) / 1000;
		const day_diff = Math.floor(diff / 86400);

		if (isNaN(day_diff) || day_diff < 0) return "";

		return (
			(day_diff === 0 &&
				((diff < 60 && "just now") ||
					(diff < 120 && "1 minute ago") ||
					(diff < 3600 && `${Math.floor(diff / 60)} minutes ago`) ||
					(diff < 7200 && "1 hour ago") ||
					(diff < 86400 && `${Math.floor(diff / 3600)} hours ago`))) ||
			(day_diff === 1 && "Yesterday") ||
			(day_diff < 7 && `${day_diff} days ago`) ||
			(day_diff < 31 && `${Math.ceil(day_diff / 7)} weeks ago`) ||
			(day_diff < 365 && `${Math.ceil(day_diff / 30)} months ago`) ||
			"over a year ago"
		);
	}

	function formatExactDateTime(dateVal) {
		const date = parseDateValue(dateVal);
		if (!date) return "";

		const day = pad(date.getDate());
		const month = pad(date.getMonth() + 1);
		const year = date.getFullYear();

		let hours = date.getHours();
		const minutes = pad(date.getMinutes());
		const ampm = hours >= 12 ? "PM" : "AM";
		hours = hours % 12;
		hours = hours ? hours : 12; // the hour '0' should be '12'
		const strTime = pad(hours) + ":" + minutes + " " + ampm;

		return `${day}-${month}-${year} ${strTime}`;
	}

	function escapeHtml(value) {
		return String(value ?? "")
			.replace(/&/g, "&amp;")
			.replace(/</g, "&lt;")
			.replace(/>/g, "&gt;")
			.replace(/"/g, "&quot;")
			.replace(/'/g, "&#39;");
	}

	function showMessage(message) {
		window.frappe?.show_alert?.({ message, indicator: "red" }) || window.alert(message);
	}
})();
