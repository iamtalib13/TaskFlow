// Copyright (c) 2026, Talib Sheikh and contributors
// For license information, please see license.txt

/**
 * Taskflow Task Client Script
 * Custom HTML widget (html_pmcr) mirroring the Taskflow Timesheet widget,
 * rendering and editing the main Taskflow Task fields.
 */

frappe.ui.form.on("Taskflow Task", {
	refresh(frm) {
		TaskflowTaskUI.render_widget(frm);
	},
});

/* ==========================================================================
   Link Dropdown Data Service
   ========================================================================== */
const TaskflowTaskDataService = {
	options_cache: {},

	fetch_link_options(doctype, search_txt, search_field, callback) {
		const filters = [];
		if (search_txt && search_txt.trim()) {
			filters.push([search_field, "like", "%" + search_txt.trim() + "%"]);
		}
		frappe.db
			.get_list(doctype, {
				filters: filters,
				fields: ["name", search_field],
				order_by: "modified desc",
				limit: 20,
			})
			.then((rows) => {
				callback(rows || []);
			});
	},
};

/* ==========================================================================
   Taskflow Task Widget UI
   ========================================================================== */
const TaskflowTaskUI = {
	render_widget(frm) {
		const wrapper = $(frm.fields_dict.html_pmcr.wrapper);
		wrapper.empty();

		const html = this.get_template_html(frm);
		wrapper.html(html);

		this.bind_events(frm, wrapper);
	},

	get_template_html(frm) {
		const completed_on_val = frm.doc.completed_on
			? String(frm.doc.completed_on).replace(" ", "T").substring(0, 16)
			: "";
		return `
<style>
  .tft-wrapper {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    background: transparent;
    color: #334155;
    padding: 0;
    margin-bottom: 20px;
    -webkit-font-smoothing: antialiased;
  }

  .tft-top-bar {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 16px;
    margin-bottom: 20px;
  }

  @media (max-width: 900px) {
    .tft-top-bar {
      grid-template-columns: 1fr 1fr;
    }
  }

  .tft-field-group {
    display: flex;
    flex-direction: column;
  }

  .tft-label {
    font-size: 11px;
    font-weight: 600;
    color: #64748b;
    margin-bottom: 5px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .tft-input, .tft-select {
    width: 100%;
    height: 36px;
    padding: 6px 12px;
    border: 1px solid #cbd5e1;
    border-radius: 6px;
    font-size: 13px;
    color: #1e293b;
    background: #ffffff;
    outline: none;
    transition: all 0.15s ease-in-out;
    box-sizing: border-box;
  }

  .tft-input:focus, .tft-select:focus {
    border-color: #2563eb;
    box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
  }

  .tft-section-title {
    font-size: 13px;
    font-weight: 700;
    color: #475569;
    letter-spacing: 0.2px;
    margin-bottom: 8px;
  }

  .tft-card {
    border: 1px solid #cbd5e1;
    border-radius: 10px;
    background: #ffffff;
    padding: 16px;
    margin-bottom: 16px;
    box-shadow: 0 1px 3px rgba(15, 23, 42, 0.04);
  }

  .tft-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 14px;
  }

  .tft-grid-2 {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 14px;
  }

  @media (max-width: 900px) {
    .tft-grid {
      grid-template-columns: 1fr 1fr;
    }
    .tft-grid-2 {
      grid-template-columns: 1fr;
    }
  }

  .tft-status[data-status="Open"] { background-color: #eff6ff !important; color: #1d4ed8 !important; border-color: #bfdbfe !important; font-weight: 700; }
  .tft-status[data-status="In Progress"] { background-color: #fffbeb !important; color: #b45309 !important; border-color: #fde68a !important; font-weight: 700; }
  .tft-status[data-status="Review"] { background-color: #f5f3ff !important; color: #6d28d9 !important; border-color: #ddd6fe !important; font-weight: 700; }
  .tft-status[data-status="On Hold"] { background-color: #f8fafc !important; color: #475569 !important; border-color: #cbd5e1 !important; font-weight: 700; }
  .tft-status[data-status="Completed"] { background-color: #ecfdf5 !important; color: #047857 !important; border-color: #a7f3d0 !important; font-weight: 700; }
  .tft-status[data-status="Cancelled"] { background-color: #fef2f2 !important; color: #b91c1c !important; border-color: #fecaca !important; font-weight: 700; }
  .tft-status[data-status="Overdue"] { background-color: #fef2f2 !important; color: #dc2626 !important; border-color: #fecaca !important; font-weight: 700; }

  .tft-priority[data-priority="Critical"] { background-color: #fef2f2 !important; color: #b91c1c !important; font-weight: 700; }
  .tft-priority[data-priority="High"] { background-color: #fff7ed !important; color: #c2410c !important; font-weight: 700; }
  .tft-priority[data-priority="Medium"] { background-color: #fffbeb !important; color: #b45309 !important; font-weight: 700; }
  .tft-priority[data-priority="Low"] { background-color: #f0fdf4 !important; color: #15803d !important; font-weight: 700; }

  .tft-dropdown-container {
    position: relative;
  }

  .tft-dropdown-menu {
    position: absolute;
    top: calc(100% + 4px);
    left: 0;
    right: 0;
    z-index: 1000;
    background: #ffffff;
    border: 1px solid #cbd5e1;
    border-radius: 8px;
    box-shadow: 0 8px 24px rgba(15, 23, 42, 0.12);
    max-height: 260px;
    overflow-y: auto;
    display: none;
  }

  .tft-dropdown-item {
    padding: 8px 12px;
    font-size: 13px;
    color: #1e293b;
    cursor: pointer;
    border-bottom: 1px solid #f1f5f9;
  }

  .tft-dropdown-item:hover {
    background: #f8fafc;
    color: #2563eb;
  }

  .tft-dropdown-no-res {
    padding: 10px 12px;
    font-size: 12px;
    color: #94a3b8;
  }

  .tft-checkbox-row {
    display: flex;
    align-items: center;
    gap: 8px;
    min-height: 36px;
    font-size: 13px;
    color: #1e293b;
    font-weight: 500;
  }

  .tft-checkbox-row input[type="checkbox"] {
    width: 16px;
    height: 16px;
    accent-color: #2563eb;
    cursor: pointer;
  }

  .tft-textarea {
    width: 100%;
    min-height: 100px;
    padding: 10px 12px;
    border: 1px solid #cbd5e1;
    border-radius: 6px;
    font-size: 13px;
    color: #1e293b;
    background: #ffffff;
    outline: none;
    box-sizing: border-box;
    font-family: inherit;
    resize: vertical;
  }

  .tft-textarea:focus {
    border-color: #2563eb;
    box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
  }
</style>

<div class="tft-wrapper">
  <!-- Top Bar -->
  <div class="tft-top-bar">
    <div class="tft-field-group">
      <label class="tft-label">Task Title *</label>
      <input type="text" class="tft-input" id="tft-input-title" value="${frappe.utils.escape_html(frm.doc.task_title || "")}" placeholder="What needs to be done?" />
    </div>
    <div class="tft-field-group">
      <label class="tft-label">Status</label>
      <select class="tft-select tft-status" id="tft-input-status" data-status="${frm.doc.status || "Open"}">
        <option value="Open" ${frm.doc.status === "Open" ? "selected" : ""}>Open</option>
        <option value="In Progress" ${frm.doc.status === "In Progress" ? "selected" : ""}>In Progress</option>
        <option value="Review" ${frm.doc.status === "Review" ? "selected" : ""}>Review</option>
        <option value="On Hold" ${frm.doc.status === "On Hold" ? "selected" : ""}>On Hold</option>
        <option value="Completed" ${frm.doc.status === "Completed" ? "selected" : ""}>Completed</option>
        <option value="Cancelled" ${frm.doc.status === "Cancelled" ? "selected" : ""}>Cancelled</option>
        <option value="Overdue" ${frm.doc.status === "Overdue" ? "selected" : ""}>Overdue</option>
      </select>
    </div>
    <div class="tft-field-group">
      <label class="tft-label">Priority</label>
      <select class="tft-select tft-priority" id="tft-input-priority" data-priority="${frm.doc.priority || "Medium"}">
        <option value="Low" ${frm.doc.priority === "Low" ? "selected" : ""}>Low</option>
        <option value="Medium" ${frm.doc.priority === "Medium" ? "selected" : ""}>Medium</option>
        <option value="High" ${frm.doc.priority === "High" ? "selected" : ""}>High</option>
        <option value="Critical" ${frm.doc.priority === "Critical" ? "selected" : ""}>Critical</option>
      </select>
    </div>
    <div class="tft-field-group">
      <label class="tft-label">Task Type</label>
      <select class="tft-select" id="tft-input-task-type">
        <option value="" ${!frm.doc.task_type ? "selected" : ""}>Select...</option>
        <option value="Task" ${frm.doc.task_type === "Task" ? "selected" : ""}>Task</option>
        <option value="Bug" ${frm.doc.task_type === "Bug" ? "selected" : ""}>Bug</option>
        <option value="Customization Request" ${frm.doc.task_type === "Customization Request" ? "selected" : ""}>Customization Request</option>
      </select>
    </div>
  </div>

  <!-- Identity -->
  <div class="tft-card">
    <div class="tft-section-title">Identity</div>
    <div class="tft-grid">
      <div class="tft-field-group">
        <label class="tft-label">Project</label>
        <div class="tft-dropdown-container">
          <input type="text" class="tft-input tft-link-input" id="tft-input-project" data-fieldname="project" data-doctype="Taskflow Project" data-search-field="project_name" value="${frappe.utils.escape_html(frm.doc.project || "")}" autocomplete="off" placeholder="Select project..." />
          <div class="tft-dropdown-menu tft-menu-project"></div>
        </div>
      </div>
      <div class="tft-field-group">
        <label class="tft-label">Team</label>
        <div class="tft-dropdown-container">
          <input type="text" class="tft-input tft-link-input" id="tft-input-team" data-fieldname="team" data-doctype="Taskflow Team" data-search-field="team_name" value="${frappe.utils.escape_html(frm.doc.team || "")}" autocomplete="off" placeholder="Select team..." />
          <div class="tft-dropdown-menu tft-menu-team"></div>
        </div>
      </div>
      <div class="tft-field-group">
        <label class="tft-label">Parent Task</label>
        <div class="tft-dropdown-container">
          <input type="text" class="tft-input tft-link-input" id="tft-input-parent-task" data-fieldname="parent_task" data-doctype="Taskflow Task" data-search-field="task_title" value="${frappe.utils.escape_html(frm.doc.parent_task || "")}" autocomplete="off" placeholder="Select parent task..." />
          <div class="tft-dropdown-menu tft-menu-parent-task"></div>
        </div>
      </div>
      <div class="tft-field-group">
        <label class="tft-label">Department</label>
        <div class="tft-dropdown-container">
          <input type="text" class="tft-input tft-link-input" id="tft-input-department" data-fieldname="department" data-doctype="Department" data-search-field="department_name" value="${frappe.utils.escape_html(frm.doc.department || "")}" autocomplete="off" placeholder="Select department..." />
          <div class="tft-dropdown-menu tft-menu-department"></div>
        </div>
      </div>
    </div>
  </div>

  <!-- Assignment -->
  <div class="tft-card">
    <div class="tft-section-title">Assignment</div>
    <div class="tft-grid">
      <div class="tft-field-group">
        <label class="tft-label">Assigned To</label>
        <div class="tft-dropdown-container">
          <input type="text" class="tft-input tft-link-input" id="tft-input-assigned-to" data-fieldname="assigned_to" data-doctype="Employee" data-search-field="employee_name" value="${frappe.utils.escape_html(frm.doc.assigned_to || "")}" autocomplete="off" placeholder="Select employee..." />
          <div class="tft-dropdown-menu tft-menu-assigned-to"></div>
        </div>
      </div>
      <div class="tft-field-group">
        <label class="tft-label">Responsible Person</label>
        <div class="tft-dropdown-container">
          <input type="text" class="tft-input tft-link-input" id="tft-input-responsible-person" data-fieldname="responsible_person" data-doctype="Employee" data-search-field="employee_name" value="${frappe.utils.escape_html(frm.doc.responsible_person || "")}" autocomplete="off" placeholder="Select employee..." />
          <div class="tft-dropdown-menu tft-menu-responsible-person"></div>
        </div>
      </div>
      <div class="tft-field-group">
        <label class="tft-label">Guided By</label>
        <div class="tft-dropdown-container">
          <input type="text" class="tft-input tft-link-input" id="tft-input-guided-by" data-fieldname="guided_by" data-doctype="User" data-search-field="full_name" value="${frappe.utils.escape_html(frm.doc.guided_by || "")}" autocomplete="off" placeholder="Select user..." />
          <div class="tft-dropdown-menu tft-menu-guided-by"></div>
        </div>
      </div>
      <div class="tft-field-group">
        <label class="tft-label">Pending From</label>
        <select class="tft-select" id="tft-input-pending-from">
          <option value="" ${!frm.doc.pending_from ? "selected" : ""}>Pending from...</option>
          <option value="Netwin Vendor" ${frm.doc.pending_from === "Netwin Vendor" ? "selected" : ""}>Netwin Vendor</option>
          <option value="SIL Vendor" ${frm.doc.pending_from === "SIL Vendor" ? "selected" : ""}>SIL Vendor</option>
          <option value="Whitestone Vendor" ${frm.doc.pending_from === "Whitestone Vendor" ? "selected" : ""}>Whitestone Vendor</option>
          <option value="Perfios Vendor" ${frm.doc.pending_from === "Perfios Vendor" ? "selected" : ""}>Perfios Vendor</option>
          <option value="Infosys Vendor" ${frm.doc.pending_from === "Infosys Vendor" ? "selected" : ""}>Infosys Vendor</option>
          <option value="Operation Team" ${frm.doc.pending_from === "Operation Team" ? "selected" : ""}>Operation Team</option>
          <option value="Our Side" ${frm.doc.pending_from === "Our Side" ? "selected" : ""}>Our Side</option>
          <option value="Rhythmflows" ${frm.doc.pending_from === "Rhythmflows" ? "selected" : ""}>Rhythmflows</option>
        </select>
      </div>
      <div class="tft-field-group">
        <label class="tft-label">Toll ID</label>
        <input type="text" class="tft-input" id="tft-input-toll-id" value="${frappe.utils.escape_html(frm.doc.toll_id || "")}" placeholder="Toll ID..." />
      </div>
    </div>
  </div>

  <!-- Schedule -->
  <div class="tft-card">
    <div class="tft-section-title">Schedule</div>
    <div class="tft-grid">
      <div class="tft-field-group">
        <label class="tft-label">Start Date</label>
        <input type="date" class="tft-input" id="tft-input-start-date" value="${frm.doc.start_date || ""}" />
      </div>
      <div class="tft-field-group">
        <label class="tft-label">Due Date</label>
        <input type="date" class="tft-input" id="tft-input-due-date" value="${frm.doc.due_date || ""}" />
      </div>
      <div class="tft-field-group">
        <label class="tft-label">Estimated Completion Date</label>
        <input type="date" class="tft-input" id="tft-input-estimated-completion" value="${frm.doc.estimated_completion_date || ""}" />
      </div>
      <div class="tft-field-group">
        <label class="tft-label">Expected Resolution Date</label>
        <input type="date" class="tft-input" id="tft-input-expected-resolution" value="${frm.doc.expected_resolution_date || ""}" />
      </div>
      <div class="tft-field-group">
        <label class="tft-label">Completed On</label>
        <input type="datetime-local" class="tft-input" id="tft-input-completed-on" value="${completed_on_val}" />
      </div>
      <div class="tft-field-group">
        <label class="tft-label">Sequence</label>
        <input type="number" class="tft-input" id="tft-input-sequence" value="${frm.doc.sequence || ""}" placeholder="0" />
      </div>
    </div>
  </div>

  <!-- Effort -->
  <div class="tft-card">
    <div class="tft-section-title">Effort & Progress</div>
    <div class="tft-grid">
      <div class="tft-field-group">
        <label class="tft-label">Progress %</label>
        <input type="number" class="tft-input" id="tft-input-progress" min="0" max="100" value="${frm.doc.progress_percent || 0}" />
      </div>
      <div class="tft-field-group">
        <label class="tft-label">Estimated Hours</label>
        <input type="number" class="tft-input" id="tft-input-estimated-hours" step="0.5" value="${frm.doc.estimated_hours || ""}" />
      </div>
      <div class="tft-field-group">
        <label class="tft-label">Actual Hours</label>
        <input type="number" class="tft-input" id="tft-input-actual-hours" step="0.5" value="${frm.doc.actual_hours || ""}" />
      </div>
      <div class="tft-checkbox-row">
        <input type="checkbox" id="tft-input-milestone" ${frm.doc.is_milestone ? "checked" : ""} />
        <label for="tft-input-milestone">Is Milestone</label>
      </div>
      <div class="tft-checkbox-row">
        <input type="checkbox" id="tft-input-blocked" ${frm.doc.is_blocked ? "checked" : ""} />
        <label for="tft-input-blocked">Is Blocked</label>
      </div>
    </div>
  </div>

  <!-- Description -->
  <div class="tft-card">
    <div class="tft-section-title">Description</div>
    <textarea class="tft-textarea" id="tft-input-description" placeholder="Describe the task...">${frappe.utils.escape_html((frm.doc.description || "").replace(/<[^>]*>?/gm, ""))}</textarea>
  </div>

  <!-- Ticket Details -->
  <div class="tft-card">
    <div class="tft-section-title">Ticket Details</div>
    <div class="tft-grid">
      <div class="tft-field-group">
        <label class="tft-label">Ticket Date</label>
        <input type="date" class="tft-input" id="tft-input-ticket-date" value="${frm.doc.ticket_date || ""}" />
      </div>
      <div class="tft-field-group">
        <label class="tft-label">Ticket ID</label>
        <input type="text" class="tft-input" id="tft-input-ticket-id" value="${frappe.utils.escape_html(frm.doc.ticket_id || "")}" placeholder="Ticket ID..." />
      </div>
      <div class="tft-field-group">
        <label class="tft-label">Ticket Raised By</label>
        <input type="text" class="tft-input" id="tft-input-ticket-raised-by" value="${frappe.utils.escape_html(frm.doc.ticket_raised_by || "")}" placeholder="Raised by..." />
      </div>
      <div class="tft-field-group">
        <label class="tft-label">Ticket Description</label>
        <input type="text" class="tft-input" id="tft-input-ticket-description" value="${frappe.utils.escape_html(frm.doc.ticket_description || "")}" placeholder="Ticket description..." />
      </div>
    </div>
  </div>
</div>
`;
	},

	bind_events(frm, wrapper) {
		// Simple value binding: input -> frm.set_value
		const bind_simple = (id, fieldname) => {
			const $el = wrapper.find(id);
			if (!$el.length) return;
			$el.off("change.tft input.tft").on("change.tft input.tft", function () {
				const val = $(this).val();
				frappe.model.set_value(frm.doctype, frm.docname, fieldname, val);
			});
		};

		bind_simple("#tft-input-title", "task_title");
		bind_simple("#tft-input-toll-id", "toll_id");
		bind_simple("#tft-input-sequence", "sequence");
		bind_simple("#tft-input-progress", "progress_percent");
		bind_simple("#tft-input-estimated-hours", "estimated_hours");
		bind_simple("#tft-input-actual-hours", "actual_hours");
		bind_simple("#tft-input-ticket-id", "ticket_id");
		bind_simple("#tft-input-ticket-raised-by", "ticket_raised_by");
		bind_simple("#tft-input-ticket-description", "ticket_description");
		bind_simple("#tft-input-description", "description");

		// Date inputs
		const bind_date = (id, fieldname) => {
			const $el = wrapper.find(id);
			if (!$el.length) return;
			$el.off("change.tft").on("change.tft", function () {
				frappe.model.set_value(frm.doctype, frm.docname, fieldname, $(this).val() || null);
			});
		};

		bind_date("#tft-input-start-date", "start_date");
		bind_date("#tft-input-due-date", "due_date");
		bind_date("#tft-input-estimated-completion", "estimated_completion_date");
		bind_date("#tft-input-expected-resolution", "expected_resolution_date");
		bind_date("#tft-input-ticket-date", "ticket_date");

		// Completed On (Datetime)
		wrapper.find("#tft-input-completed-on").off("change.tft").on("change.tft", function () {
			const val = $(this).val();
			if (!val) {
				frappe.model.set_value(frm.doctype, frm.docname, "completed_on", null);
				return;
			}
			frappe.model.set_value(frm.doctype, frm.docname, "completed_on", val.replace("T", " ") + ":00");
		});

		// Selects
		const bind_select = (id, fieldname) => {
			const $el = wrapper.find(id);
			if (!$el.length) return;
			$el.off("change.tft").on("change.tft", function () {
				const val = $(this).val();
				frappe.model.set_value(frm.doctype, frm.docname, fieldname, val || null);
			});
		};

		bind_select("#tft-input-status", "status");
		bind_select("#tft-input-priority", "priority");
		bind_select("#tft-input-task-type", "task_type");
		bind_select("#tft-input-pending-from", "pending_from");

		// Checkboxes
		const bind_checkbox = (id, fieldname) => {
			const $el = wrapper.find(id);
			if (!$el.length) return;
			$el.off("change.tft").on("change.tft", function () {
				frappe.model.set_value(frm.doctype, frm.docname, fieldname, $(this).is(":checked") ? 1 : 0);
			});
		};

		bind_checkbox("#tft-input-milestone", "is_milestone");
		bind_checkbox("#tft-input-blocked", "is_blocked");

		// Link dropdowns
		const link_fields = [
			{ id: "#tft-input-project", menu: ".tft-menu-project", fieldname: "project", doctype: "Taskflow Project", search_field: "project_name" },
			{ id: "#tft-input-team", menu: ".tft-menu-team", fieldname: "team", doctype: "Taskflow Team", search_field: "team_name" },
			{ id: "#tft-input-parent-task", menu: ".tft-menu-parent-task", fieldname: "parent_task", doctype: "Taskflow Task", search_field: "task_title" },
			{ id: "#tft-input-department", menu: ".tft-menu-department", fieldname: "department", doctype: "Department", search_field: "department_name" },
			{ id: "#tft-input-assigned-to", menu: ".tft-menu-assigned-to", fieldname: "assigned_to", doctype: "Employee", search_field: "employee_name" },
			{ id: "#tft-input-responsible-person", menu: ".tft-menu-responsible-person", fieldname: "responsible_person", doctype: "Employee", search_field: "employee_name" },
			{ id: "#tft-input-guided-by", menu: ".tft-menu-guided-by", fieldname: "guided_by", doctype: "User", search_field: "full_name" },
		];

		link_fields.forEach((cfg) => {
			const $input = wrapper.find(cfg.id);
			const $menu = wrapper.find(cfg.menu);
			if (!$input.length) return;

			const fetch_and_render = (search_txt) => {
				TaskflowTaskDataService.fetch_link_options(cfg.doctype, search_txt, cfg.search_field, (rows) => {
					$menu.empty();
					if (!rows || rows.length === 0) {
						$menu.html(`<div class="tft-dropdown-no-res">No ${cfg.doctype} found</div>`).show();
						return;
					}
					rows.forEach((row) => {
						const label = row[cfg.search_field] || row.name;
						$menu.append(`
							<div class="tft-dropdown-item" data-name="${frappe.utils.escape_html(row.name)}">
								${frappe.utils.escape_html(label)}
							</div>
						`);
					});
					$menu.show();
				});
			};

			$input.off("focus.tft click.tft").on("focus.tft click.tft", function (e) {
				e.stopPropagation();
				wrapper.find(".tft-dropdown-menu").hide();
				fetch_and_render($(this).val());
			});

			$input.off("input.tft").on("input.tft", function () {
				fetch_and_render($(this).val());
			});

			$menu.off("click.tft").on("click.tft", ".tft-dropdown-item", function (e) {
				e.stopPropagation();
				const name = $(this).data("name");
				const label = $(this).text().trim();
				$input.val(label);
				$menu.hide();
				frappe.model.set_value(frm.doctype, frm.docname, cfg.fieldname, name);
			});
		});

		// Global click closes dropdown menus
		$(document).off("click.tft_dropdown").on("click.tft_dropdown", () => {
			wrapper.find(".tft-dropdown-menu").hide();
		});
	},
};