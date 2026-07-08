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
		activeTaskAssignees: [],
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
		completedOnInput: null,
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
		if (window.parent && window.parent !== window && window.parent.closeIframeModal) {
			document.body.classList.add("iframe-mode");
			const backBtn = document.querySelector(".header-back");
			if (backBtn) {
				backBtn.removeAttribute("onclick");
				backBtn.addEventListener("click", (e) => {
					e.preventDefault();
					window.parent.closeIframeModal();
				});
			}
			document.addEventListener("keydown", (event) => {
				if (event.key === "Escape") {
					window.parent.closeIframeModal();
				}
			});
		}
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
		refs.pendingWithSelect = document.getElementById("pendingWithInput");
		refs.guidedBySelect = document.getElementById("guidedByInput");
		refs.responsiblePersonSelect = document.getElementById("responsiblePersonSelect");

		refs.startDateInput = document.getElementById("startDateInput");
		refs.dueDateInput = document.getElementById("dueDateInput");
		refs.completedOnInput = document.getElementById("completedOnInput");
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
			refs.completedOnInput,
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
			refs.completedOnInput,
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
			const userId = e.target.value;
			if (userId) {
				if (!state.activeTaskAssignees) state.activeTaskAssignees = [];
				if (!state.activeTaskAssignees.includes(userId)) {
					state.activeTaskAssignees.push(userId);
					const selectedOption = e.target.options[e.target.selectedIndex];
					if (!state.assigneeLabels) state.assigneeLabels = {};
					state.assigneeLabels[userId] = selectedOption.text;
				}
				renderAssigneeWidget();
				triggerAutoSave();
			}
		});
		refs.pendingWithSelect?.addEventListener("input", () => triggerAutoSave());
		refs.guidedBySelect?.addEventListener("input", () => triggerAutoSave());
		refs.completedOnInput?.addEventListener("change", () => triggerAutoSave());

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

		// @mention in comment
		const mentionDropdown = document.getElementById("taskMentionDropdown");
		if (refs.commentInput && mentionDropdown) {
			let mentionActive = false;
			let mentionQuery = "";
			let mentionStartPos = 0;

			function showTaskMentionList(query) {
				const members = (state.taskDetails && state.taskDetails.members) || [];
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
						: (m.label || m.user || "?").substring(0, 1).toUpperCase();
					return `
						<div class="taskform-mention-item" data-mention-label="${escapeHtml(m.label || m.user)}" style="display: flex; align-items: center; gap: 8px; padding: 8px 12px; cursor: pointer; font-size: 13px; color: #334155;">
							<div style="width: 26px; height: 26px; border-radius: 50%; background: #e2e8f0; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 600; color: #475569; flex-shrink: 0; overflow: hidden;">
								${avatarContent}
							</div>
							<span>${escapeHtml(m.label || m.user)}</span>
						</div>
					`;
				}).join("");
				mentionDropdown.style.display = "block";
				mentionActive = true;
			}

			refs.commentInput.addEventListener("input", () => {
				const val = refs.commentInput.value;
				const cursor = refs.commentInput.selectionStart;
				const textBefore = val.substring(0, cursor);
				const atMatch = textBefore.match(/@(\w*)$/);
				if (atMatch) {
					mentionStartPos = cursor - atMatch[1].length - 1;
					mentionQuery = atMatch[1];
					showTaskMentionList(mentionQuery);
				} else {
					mentionDropdown.style.display = "none";
					mentionActive = false;
				}
			});

			refs.commentInput.addEventListener("keydown", (e) => {
				if (!mentionActive) return;
				const items = mentionDropdown.querySelectorAll(".taskform-mention-item");
				let idx = -1;
				items.forEach((item, i) => { if (item.style.background === "rgb(241, 245, 249)") idx = i; });
				if (e.key === "ArrowDown") {
					e.preventDefault();
					idx = idx < items.length - 1 ? idx + 1 : 0;
					items.forEach((item, i) => item.style.background = i === idx ? "#f1f5f9" : "transparent");
				} else if (e.key === "ArrowUp") {
					e.preventDefault();
					idx = idx > 0 ? idx - 1 : items.length - 1;
					items.forEach((item, i) => item.style.background = i === idx ? "#f1f5f9" : "transparent");
				} else if (e.key === "Enter" && idx >= 0) {
					e.preventDefault();
					items[idx].click();
				} else if (e.key === "Escape") {
					mentionDropdown.style.display = "none";
					mentionActive = false;
				}
			});

			mentionDropdown.addEventListener("click", (e) => {
				const item = e.target.closest(".taskform-mention-item");
				if (!item) return;
				const label = item.dataset.mentionLabel;
				const val = refs.commentInput.value;
				const before = val.substring(0, mentionStartPos);
				const after = val.substring(refs.commentInput.selectionStart);
				refs.commentInput.value = before + "@" + label + " " + after;
				mentionDropdown.style.display = "none";
				mentionActive = false;
				refs.commentInput.focus();
			});

			document.addEventListener("click", (e) => {
				if (!mentionDropdown.contains(e.target) && e.target !== refs.commentInput) {
					mentionDropdown.style.display = "none";
					mentionActive = false;
				}
			});
		}

		// File upload input change
		const fileInput = document.getElementById("fileInput");
		fileInput?.addEventListener("change", handleFileSelect);

		// Drag & Drop events
		const dropzone = document.getElementById("attachmentsDropzone");
		if (dropzone) {
			dropzone.addEventListener("dragover", (e) => {
				e.preventDefault();
				dropzone.classList.add("dragover");
			});
			dropzone.addEventListener("dragleave", () => {
				dropzone.classList.remove("dragover");
			});
			dropzone.addEventListener("drop", (e) => {
				e.preventDefault();
				dropzone.classList.remove("dragover");
				if (e.dataTransfer.files.length) {
					handleFiles(e.dataTransfer.files);
				}
			});
		}
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
		updateGuidedByOptions();
		updateResponsiblePersonOptions();
	}
	
	function updateGuidedByOptions() {
		if (!refs.guidedBySelect || !state.bootstrap) return;
		const members = state.bootstrap.team_members || [];
		const currentVal = state.activeTask ? state.activeTask.guided_by : "";
		const currentName = state.activeTask ? state.activeTask.guided_by_name : "";

		const uniqueMembersMap = {};
		members.forEach(m => {
			if (m.user && !uniqueMembersMap[m.user]) {
				uniqueMembersMap[m.user] = m.label || m.user;
			}
		});

		if (currentVal && !uniqueMembersMap[currentVal]) {
			uniqueMembersMap[currentVal] = currentName || currentVal;
		}

		let html = '<option value="">Guided by...</option>';
		for (const [user, label] of Object.entries(uniqueMembersMap)) {
			html += `<option value="${escapeHtml(user)}">${escapeHtml(label)}</option>`;
		}

		refs.guidedBySelect.innerHTML = html;
		if (currentVal) {
			refs.guidedBySelect.value = currentVal;
		}
	}

	function updateResponsiblePersonOptions() {
		if (!refs.responsiblePersonSelect || !state.bootstrap) return;
		const members = state.bootstrap.team_members || [];
		const currentVal = state.activeTask ? state.activeTask.responsible_person : "";

		let html = '<option value="">Select...</option>';
		members.forEach(m => {
			if (m.employee) {
				const label = m.label || m.employee;
				html += `<option value="${escapeHtml(m.employee)}">${escapeHtml(label)}</option>`;
			}
		});

		refs.responsiblePersonSelect.innerHTML = html;
		if (currentVal) {
			refs.responsiblePersonSelect.value = currentVal;
		}
	}

	function updateAssigneeOptions() {
		const project = (state.bootstrap && state.bootstrap.projects || []).find(p => p.name === state.selectedProject);
		const teamName = project ? project.team : "";

		const members = (state.bootstrap && state.bootstrap.team_members || []).filter(
			member => member.team === teamName
		);

		renderAssigneeWidget();
	}

	function renderAssigneeWidget() {
		const badgesContainer = document.getElementById("assigneeBadges");
		const selectEl = document.getElementById("assignedToSelect");
		if (!badgesContainer || !selectEl || !state.bootstrap) return;

		const project = (state.bootstrap.projects || []).find(p => p.name === state.selectedProject);
		const teamName = project ? project.team : "";
		const members = (state.bootstrap.team_members || []).filter(
			member => member.team === teamName
		);

		// 1. Render currently selected assignees as badges
		badgesContainer.innerHTML = "";
		if (!state.activeTaskAssignees) state.activeTaskAssignees = [];
		state.activeTaskAssignees.forEach(userId => {
			const member = members.find(m => m.user === userId);
			const label = (state.assigneeLabels && state.assigneeLabels[userId]) || (member ? member.label : userId);
			const userImage = member ? member.user_image : null;
			const initialsText = initials(label);
			
			const badge = document.createElement("div");
			badge.className = "assignee-badge-item";
			badge.innerHTML = `
				<div class="avatar" style="width: 22px; height: 22px; font-size: 8px; border-radius: 50%; background: linear-gradient(135deg, #4f6ef7, #a78bfa); display: flex; align-items: center; justify-content: center; color: #fff; overflow: hidden; flex-shrink: 0;">
					${userImage ? `<img src="${userImage}" alt="" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.style.display='none'">` : initialsText}
				</div>
				<span class="assignee-badge-name" style="font-size: 12px; font-weight: 500; color: #334155; flex: 1;">${escapeHtml(label)}</span>
				<button class="assignee-badge-remove" type="button" data-email="${escapeHtml(userId)}" style="background: none; border: none; color: #94a3b8; font-size: 14px; cursor: pointer; padding: 0 4px; line-height: 1;">✕</button>
			`;
			badgesContainer.appendChild(badge);
		});

		// Add event listeners to remove buttons
		badgesContainer.querySelectorAll(".assignee-badge-remove").forEach(btn => {
			btn.addEventListener("click", async () => {
				const userId = btn.dataset.email;
				state.activeTaskAssignees = state.activeTaskAssignees.filter(e => e !== userId);
				if (state.assigneeLabels) delete state.assigneeLabels[userId];
				renderAssigneeWidget();
				if (state.activeTaskName) {
					try {
						await apiCall("remove_task_assignee", {
							payload: JSON.stringify({ task: state.activeTaskName, user_id: userId })
						}, "POST");
					} catch (err) {
						showMessage(err.message || "Failed to remove assignee.");
					}
				}
			});
		});

		// 2. Populate dropdown with team members NOT already selected
		const unselectedMembers = members.filter(m => !state.activeTaskAssignees.includes(m.user));
		selectEl.innerHTML = '<option value="">Add Assignee...</option>' + unselectedMembers.map(m =>
			`<option value="${escapeHtml(m.user || "")}">${escapeHtml(m.label)}</option>`
		).join("");
		selectEl.value = "";
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
				state.taskDetails = details;

				const currentProject = (state.bootstrap && state.bootstrap.projects || []).find(p => p.name === task.project);
				if (currentProject) {
					const teamMembers = (state.bootstrap && state.bootstrap.team_members || []).filter(
						(m) => m.team === currentProject.team
					);
					state.taskDetails.members = teamMembers;
				} else {
					state.taskDetails.members = (state.bootstrap && state.bootstrap.team_members) || [];
				}

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
				state.activeTaskAssignees = task._assign || [];
				state.assigneeLabels = {};
				(task.assignees || []).forEach(a => { state.assigneeLabels[a.user] = a.label; });
				updateAssigneeOptions();
				updateGuidedByOptions();
				if (refs.pendingWithSelect) refs.pendingWithSelect.value = task.pending_with || "";
				if (refs.guidedBySelect) refs.guidedBySelect.value = task.guided_by || "";
				if (refs.responsiblePersonSelect) refs.responsiblePersonSelect.value = task.responsible_person || "";

				// Ticket info
				if (refs.ticketIdInput) refs.ticketIdInput.value = task.ticket_id || "";
				if (refs.ticketRaisedByInput) refs.ticketRaisedByInput.value = task.ticket_raised_by || "";
				if (refs.ticketDescriptionInput) refs.ticketDescriptionInput.value = task.ticket_description || "";

				// Dates
				if (refs.startDateInput) refs.startDateInput.value = dateInputValue(task.start_date);
				if (refs.dueDateInput) refs.dueDateInput.value = dateInputValue(task.due_date);
				if (refs.completedOnInput) refs.completedOnInput.value = dateInputValue(task.completed_date);
				if (refs.ticketDateInput) refs.ticketDateInput.value = dateInputValue(task.ticket_date);
				syncDatepickers();
				updateDueDateStatusBadge();

				// Flags
				if (refs.isMilestoneInput) refs.isMilestoneInput.checked = Boolean(task.is_milestone);
				if (refs.isBlockedInput) refs.isBlockedInput.checked = Boolean(task.is_blocked);

				// Checklist & Comments
				state.currentChecklist = task.checklist || [];
				state.activeTaskAttachments = details.attachments || [];
				renderChecklist();
				renderAttachments();
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
			
			const taskName = res && res.name;
			if (taskName && state.pendingFiles && state.pendingFiles.length) {
				if (window.frappe && typeof frappe.show_alert === 'function') {
					frappe.show_alert({ message: 'Uploading attachments...', indicator: 'blue' }, 5);
				}
				for (const file of state.pendingFiles) {
					try {
						await uploadFile(file, taskName);
					} catch (uploadErr) {
						console.error("Failed to upload pending file", file.name, uploadErr);
					}
				}
				state.pendingFiles = [];
			}

			showSaveIndicator();
			if (window.frappe && typeof frappe.show_alert === 'function') { frappe.show_alert({ message: 'Task saved', indicator: 'green' }, 5); }
			setTimeout(() => {
				const params = new URLSearchParams(window.location.search);
				if (taskName) {
					params.set("task", taskName);
				}
				const targetSearch = `?${params.toString()}`;
				if (window.location.search === targetSearch) {
					window.location.reload();
				} else {
					window.location.href = `${window.location.pathname.replace(/^\/+/, "/")}${targetSearch}`;
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
			assigned_to: (() => {
				if (state.activeTaskAssignees && state.activeTaskAssignees.length > 0) {
					const firstMember = (state.bootstrap?.team_members || []).find(m => m.user === state.activeTaskAssignees[0]);
					return firstMember ? firstMember.employee : null;
				}
				return null;
			})(),
			_assign: state.activeTaskAssignees || [],
			pending_with: refs.pendingWithSelect?.value || null,
			guided_by: refs.guidedBySelect?.value || null,
			responsible_person: refs.responsiblePersonSelect?.value || null,
			start_date: normalizeDateForPayload(refs.startDateInput?.value),
			due_date: normalizeDateForPayload(refs.dueDateInput?.value),
			completed_date: normalizeDateForPayload(refs.completedOnInput?.value),
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
		const completedOnDate = refs.completedOnInput?.value;
		const status = refs.statusSelect?.value;

		if (status === "Completed" && !completedOnDate) {
			showMessage("Completed Date is mandatory when marking a task as Completed.");
			return false;
		}

		if (startDate && dueDate) {
			const start = parseDateValue(startDate);
			const end = parseDateValue(dueDate);
			if (start && end && end < start) {
				showMessage("Due Date cannot be earlier than Start Date.");
				return false;
			}
		}

		if (startDate && completedOnDate) {
			const start = parseDateValue(startDate);
			const completed = parseDateValue(completedOnDate);
			if (start && completed && completed < start) {
				showMessage("Completed On Date cannot be earlier than Start Date.");
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
		if (window.parent && window.parent !== window && window.parent.closeIframeModal) {
			window.parent.closeIframeModal();
			return;
		}
		const project = refs.projectSelect?.value || state.selectedProject || "";
		let url = `/taskflow?mode=${state.returnMode}`;
		if (project) url += `&project=${encodeURIComponent(project)}`;
		if (state.returnView) url += `&view=${encodeURIComponent(state.returnView)}`;
		window.location.href = url;
	}

	/* Helper Utilities */
	function apiCall(method, args = {}, requestMethod = "GET") {
		const path = method.startsWith("frappe.") ? `/api/method/${method}` : `${METHOD_BASE}.${method}`;
		const url = new URL(path, window.location.origin);
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

	function handleFileSelect(e) {
		if (e.target.files && e.target.files.length) {
			handleFiles(e.target.files);
		}
	}

	async function handleFiles(files) {
		if (state.activeTaskName) {
			for (const file of files) {
				try {
					await uploadFile(file, state.activeTaskName);
				} catch (error) {
					showMessage(`Failed to upload ${file.name}: ${error.message}`);
				}
			}
			await loadTaskDetails(state.activeTaskName);
		} else {
			if (!state.pendingFiles) state.pendingFiles = [];
			for (const file of files) {
				state.pendingFiles.push(file);
			}
			renderAttachments();
		}
	}

	async function uploadFile(file, docname) {
		const formData = new FormData();
		formData.append("file", file);
		formData.append("doctype", "Taskflow Task");
		formData.append("docname", docname);
		formData.append("is_private", 0);
		formData.append("folder", "Home");

		const response = await fetch("/api/method/upload_file", {
			method: "POST",
			headers: {
				"X-Frappe-CSRF-Token": window.csrf_token || "",
			},
			body: formData,
		});
		if (!response.ok) {
			const errData = await response.json().catch(() => ({}));
			throw new Error(errData.message || "Upload failed");
		}
		return await response.json();
	}

	function renderAttachments() {
		const listEl = document.getElementById("attachmentsList");
		const countEl = document.getElementById("attachmentsCount");
		if (!listEl) return;

		listEl.innerHTML = "";
		const attachments = state.activeTaskAttachments || [];
		const pending = state.pendingFiles || [];
		const total = attachments.length + pending.length;

		if (countEl) {
			countEl.textContent = total === 0 ? "No files" : `${total} file${total === 1 ? "" : "s"}`;
		}

		attachments.forEach((file) => {
			const div = document.createElement("div");
			div.className = "attachment-card";
			
			const ext = file.file_name.split('.').pop().toLowerCase();
			let thumbContent = "";
			const isImage = ["jpg", "jpeg", "png", "gif", "svg", "webp"].includes(ext);
			if (isImage) {
				thumbContent = `<img src="${file.file_url}" alt="" />`;
			} else {
				let icon = "📄";
				if (["pdf"].includes(ext)) icon = "📕";
				else if (["zip", "rar", "tar", "gz"].includes(ext)) icon = "📦";
				thumbContent = `<span style="font-size: 24px;">${icon}</span>`;
			}

			div.innerHTML = `
				<button type="button" class="attachment-delete" onclick="deleteAttachment('${file.name}'); event.stopPropagation();">×</button>
				<div class="attachment-thumb" onclick="window.open('${file.file_url}', '_blank')">
					${thumbContent}
				</div>
				<a href="${file.file_url}" target="_blank" class="attachment-name" title="${escapeHtml(file.file_name)}">${escapeHtml(file.file_name)}</a>
			`;
			listEl.appendChild(div);
		});

		pending.forEach((file, idx) => {
			const div = document.createElement("div");
			div.className = "attachment-card pending";
			div.style.opacity = "0.8";
			
			const ext = file.name.split('.').pop().toLowerCase();
			let thumbContent = "";
			const isImage = ["jpg", "jpeg", "png", "gif", "svg", "webp"].includes(ext);
			if (isImage) {
				try {
					const objectUrl = URL.createObjectURL(file);
					thumbContent = `<img src="${objectUrl}" alt="" />`;
				} catch (e) {
					thumbContent = `<span style="font-size: 24px;">🖼️</span>`;
				}
			} else {
				let icon = "📄";
				if (["pdf"].includes(ext)) icon = "📕";
				else if (["zip", "rar", "tar", "gz"].includes(ext)) icon = "📦";
				thumbContent = `<span style="font-size: 24px;">${icon}</span>`;
			}

			div.innerHTML = `
				<button type="button" class="attachment-delete" onclick="removePendingFile(${idx}); event.stopPropagation();">×</button>
				<div class="attachment-thumb">
					${thumbContent}
				</div>
				<span class="attachment-name" title="${escapeHtml(file.name)} (Pending)" style="color: var(--text-secondary); font-style: italic;">${escapeHtml(file.name)}</span>
			`;
			listEl.appendChild(div);
		});
	}

	window.removePendingFile = function(idx) {
		if (state.pendingFiles && state.pendingFiles[idx]) {
			state.pendingFiles.splice(idx, 1);
			renderAttachments();
		}
	};

	window.deleteAttachment = async function(fileName) {
		if (!confirm("Are you sure you want to delete this attachment?")) return;
		try {
			await apiCall("frappe.client.delete", { doctype: "File", name: fileName }, "POST");
			if (state.activeTaskName) {
				await loadTaskDetails(state.activeTaskName);
			}
		} catch (error) {
			showMessage(error.message || "Failed to delete attachment.");
		}
	};

	function showMessage(message) {
		window.frappe?.show_alert?.({ message, indicator: "red" }) || window.alert(message);
	}
})();
