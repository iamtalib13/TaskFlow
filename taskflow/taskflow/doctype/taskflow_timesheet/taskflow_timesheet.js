// Copyright (c) 2026, Talib Sheikh and contributors
// For license information, please see license.txt

frappe.ui.form.on("Taskflow Timesheet", {
	setup(frm) {
		frm.set_query("task", "table_pfiw", (doc, cdt, cdn) => {
			const row = frappe.get_doc(cdt, cdn);
			if (row.project) {
				return {
					filters: {
						project: row.project,
					},
				};
			}
			return { filters: {} };
		});
	},
	refresh(frm) {
		if (frm.is_new() && !frm.doc.user) {
			frm.set_value("user", frappe.session.user);
		}
		if (!frm.doc.employee_name) {
			frm.set_value("employee_name", frappe.session.user_fullname || frappe.session.user);
		}
		if (!frm.doc.timesheet_date) {
			frm.set_value("timesheet_date", frappe.datetime.get_today());
		}

		// Details tab is only visible to System Manager role
		const is_system_manager = frappe.user.has_role("System Manager");
		frm.toggle_display("details_tab", is_system_manager);
		frm.toggle_display(
			[
				"user",
				"employee_name",
				"section_break_esdi",
				"table_pfiw",
				"section_break_wwsx",
				"total_working_hours",
			],
			is_system_manager
		);
		frm.toggle_display("description", true);

		render_timesheet_widget(frm);
	},
	description(frm) {
		if (frm.is_dirty()) {
			frm.save();
		}
	},
	"table_pfiw.from_time"(frm, cdt, cdn) {
		calculate_item_hours(frm, cdt, cdn);
	},
	"table_pfiw.to_time"(frm, cdt, cdn) {
		calculate_item_hours(frm, cdt, cdn);
	},
	"table_pfiw.hrs"(frm) {
		calculate_total_hours(frm);
		update_widget_summary(frm);
	},
	table_pfiw_remove(frm) {
		calculate_total_hours(frm);
		update_widget_summary(frm);
	},
	table_pfiw_add(frm) {
		calculate_total_hours(frm);
		update_widget_summary(frm);
	},
});

function calculate_item_hours(frm, cdt, cdn) {
	const row = frappe.get_doc(cdt, cdn);
	if (row.from_time && row.to_time) {
		const diff = frappe.datetime.get_diff(row.to_time, row.from_time);
		const hours = diff / 3600;
		frappe.model.set_value(cdt, cdn, "hrs", hours).then(() => {
			calculate_total_hours(frm);
			update_widget_summary(frm);
		});
	}
}

function calculate_total_hours(frm) {
	let total = 0;
	(frm.doc.table_pfiw || []).forEach((row) => {
		total += parseFloat(row.hrs) || 0;
	});
	frm.set_value("total_working_hours", total);
}

function hours_to_hhmm(hrs) {
	if (!hrs && hrs !== 0) return "00:00";
	const total_mins = Math.round(parseFloat(hrs) * 60);
	const h = Math.floor(total_mins / 60);
	const m = total_mins % 60;
	return String(h).padStart(2, "0") + ":" + String(m).padStart(2, "0");
}

function hhmm_to_hours(hhmm) {
	if (!hhmm) return 0;
	const parts = String(hhmm).split(":");
	if (parts.length === 2) {
		const h = parseFloat(parts[0]) || 0;
		const m = parseFloat(parts[1]) || 0;
		return h + m / 60;
	}
	return parseFloat(hhmm) || 0;
}

function calc_time_diff_hrs(from_str, to_str) {
	if (!from_str || !to_str) return 0;
	const [f_h, f_m] = from_str.split(":").map(Number);
	const [t_h, t_m] = to_str.split(":").map(Number);

	let from_mins = f_h * 60 + (f_m || 0);
	let to_mins = t_h * 60 + (t_m || 0);

	if (to_mins < from_mins) {
		to_mins += 24 * 60;
	}

	const diff_mins = to_mins - from_mins;
	return diff_mins / 60;
}

function extract_time_str(time_val) {
	if (!time_val) return "";
	if (typeof time_val === "string" && time_val.includes(" ")) {
		return time_val.split(" ")[1].substring(0, 5);
	}
	return String(time_val).substring(0, 5);
}

function format_date_ddmmyyyy(date_str) {
	if (!date_str) return "";
	const parts = date_str.split("-");
	if (parts.length === 3) {
		return `${parts[2]}/${parts[1]}/${parts[0]}`;
	}
	return date_str;
}

function parse_ddmmyyyy_to_yyyy_mm_dd(user_str) {
	if (!user_str) return "";
	if (user_str.includes("/")) {
		const parts = user_str.split("/");
		if (parts.length === 3) {
			const d = parts[0].padStart(2, "0");
			const m = parts[1].padStart(2, "0");
			const y = parts[2];
			return `${y}-${m}-${d}`;
		}
	}
	return user_str;
}

// Saturday: 10:00 to 16:00 (4 PM) | Mon-Fri: 10:00 to 18:00 (6 PM)
function get_default_times_for_date(date_str) {
	if (!date_str) return { from: "10:00", to: "18:00" };
	const d = new Date(date_str);
	const day = d.getDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat
	if (day === 6) {
		return { from: "10:00", to: "16:00" };
	}
	return { from: "10:00", to: "18:00" };
}

// Fetch top 20 recent projects
function fetch_recent_projects(search_txt, callback) {
	const filters = [];
	if (search_txt && search_txt.trim()) {
		filters.push(["project_name", "like", "%" + search_txt.trim() + "%"]);
	}
	frappe.db
		.get_list("Taskflow Project", {
			filters: filters,
			fields: ["name", "project_name"],
			order_by: "modified desc",
			limit: 20,
		})
		.then((projects) => {
			callback(projects || []);
		});
}

// Fetch top 20 recent tasks for project
function fetch_recent_tasks(project_name, search_txt, callback) {
	if (!project_name) {
		callback([]);
		return;
	}
	const filters = [["project", "=", project_name]];
	if (search_txt && search_txt.trim()) {
		filters.push(["task_title", "like", "%" + search_txt.trim() + "%"]);
	}
	frappe.db
		.get_list("Taskflow Task", {
			filters: filters,
			fields: ["name", "task_title"],
			order_by: "modified desc",
			limit: 20,
		})
		.then((tasks) => {
			callback(tasks || []);
		});
}

function render_timesheet_widget(frm) {
	const wrapper = $(frm.fields_dict.timesheet_widget.wrapper);
	wrapper.empty();

	const html = get_widget_html(frm);
	wrapper.html(html);

	// Embed Frappe's native Text Editor field for Detailed Description / Notes
	if (frm.fields_dict.description && frm.fields_dict.description.wrapper) {
		const $desc_field = $(frm.fields_dict.description.wrapper);
		wrapper.find("#tf-native-description-container").empty().append($desc_field);

		// Auto save form on Text Editor blur
		$desc_field.off("blur.tf_save").on("blur.tf_save", ".ql-editor", function () {
			if (frm.is_dirty()) {
				frm.save();
			}
		});
	}

	update_table_rows(frm, wrapper);

	// Bind Datepicker in DD/MM/YYYY format
	const $date_input = wrapper.find("#tf-input-date");
	if ($date_input.datepicker) {
		$date_input.datepicker({
			language: "en",
			dateFormat: "dd/mm/yyyy",
			autoClose: true,
			onSelect: function (formattedDate, date) {
				if (date) {
					const y = date.getFullYear();
					const m = String(date.getMonth() + 1).padStart(2, "0");
					const d = String(date.getDate()).padStart(2, "0");
					const db_date = `${y}-${m}-${d}`;
					frm.set_value("timesheet_date", db_date).then(() => {
						update_table_rows(frm, wrapper);
						update_widget_summary(frm);
					});
				}
			},
		});
	}
	$date_input.on("change input", function () {
		const val = $(this).val();
		const db_date = parse_ddmmyyyy_to_yyyy_mm_dd(val);
		if (db_date && db_date.length === 10) {
			frm.set_value("timesheet_date", db_date).then(() => {
				update_table_rows(frm, wrapper);
				update_widget_summary(frm);
			});
		}
	});

	// Bind Employee changes
	wrapper.find("#tf-input-employee").on("change", function () {
		frm.set_value("employee_name", $(this).val());
	});

	// Bind User changes
	wrapper.find("#tf-input-user").on("change", function () {
		frm.set_value("user", $(this).val());
	});

	// Add Row Button
	wrapper.find("#tf-btn-add-row").on("click", function () {
		const items = frm.doc.table_pfiw || [];
		const doc_date = frm.doc.timesheet_date || frappe.datetime.get_today();
		const def_times = get_default_times_for_date(doc_date);

		let default_from = def_times.from;
		let default_to = def_times.to;

		if (items.length > 0) {
			const prev_to = extract_time_str(items[items.length - 1].to_time);
			if (prev_to) {
				default_from = prev_to;
				const [h, m] = prev_to.split(":").map(Number);
				const max_h = def_times.to.split(":")[0];
				const new_h = Math.min(parseInt(max_h), h + 2);
				default_to = `${String(new_h).padStart(2, "0")}:${String(m || 0).padStart(2, "0")}`;
			}
		}

		const hrs = calc_time_diff_hrs(default_from, default_to);

		frm.add_child("table_pfiw", {
			activity_type: "Task",
			project: items.length > 0 ? items[items.length - 1].project : "",
			task: "",
			from_time: `${doc_date} ${default_from}:00`,
			to_time: `${doc_date} ${default_to}:00`,
			hrs: hrs,
			description: "",
		});

		calculate_total_hours(frm);
		update_table_rows(frm, wrapper);
		update_widget_summary(frm);
	});

	// Delete row handler
	wrapper.on("click", ".tf-btn-delete-row", function () {
		const idx = $(this).data("idx");
		frm.doc.table_pfiw.splice(idx, 1);
		frm.doc.table_pfiw.forEach((r, i) => (r.idx = i + 1));
		frm.refresh_field("table_pfiw");
		calculate_total_hours(frm);
		update_table_rows(frm, wrapper);
		update_widget_summary(frm);
	});

	// Row level Activity change
	wrapper.on("change", ".tf-row-work-type", function () {
		const idx = $(this).data("idx");
		const val = $(this).val();
		$(this).attr("data-type", val);
		if (frm.doc.table_pfiw && frm.doc.table_pfiw[idx]) {
			frm.doc.table_pfiw[idx].activity_type = val;
			if (val !== "Task") {
				frm.doc.table_pfiw[idx].project = "";
				frm.doc.table_pfiw[idx].task = "";
			}
			update_table_rows(frm, wrapper);
			update_widget_summary(frm);
		}
	});

	// Open Frappe Text Editor Dialog for row description editing
	wrapper.on("click", ".tf-row-desc-btn, .tf-row-desc-input", function (e) {
		e.preventDefault();
		const idx = $(this).data("idx");
		const current_desc =
			frm.doc.table_pfiw && frm.doc.table_pfiw[idx]
				? frm.doc.table_pfiw[idx].description || ""
				: "";

		const d = new frappe.ui.Dialog({
			title: `Edit Description (Row #${idx + 1})`,
			fields: [
				{
					label: "Description",
					fieldname: "description",
					fieldtype: "Text Editor",
					default: current_desc,
				},
			],
			primary_action_label: "Save",
			primary_action(values) {
				if (frm.doc.table_pfiw && frm.doc.table_pfiw[idx]) {
					frm.doc.table_pfiw[idx].description = values.description || "";
					update_table_rows(frm, wrapper);
				}
				d.hide();
				// Auto-save form as soon as row description is added
				frm.save();
			},
		});
		d.show();
	});

	// Project Dropdown Focus / Click
	wrapper.on("focus click", ".tf-row-project-input", function (e) {
		if ($(this).is(":disabled")) return;
		e.stopPropagation();
		wrapper.find(".tf-dropdown-menu").hide();
		const idx = $(this).data("idx");
		const $menu = wrapper.find(`.tf-proj-menu-${idx}`);
		const search_txt = $(this).val();

		fetch_recent_projects(search_txt, (projects) => {
			render_project_dropdown_items($menu, projects, idx);
			$menu.show();
		});
	});

	// Project Dropdown Typing / Search
	wrapper.on("input", ".tf-row-project-input", function () {
		if ($(this).is(":disabled")) return;
		const idx = $(this).data("idx");
		const $menu = wrapper.find(`.tf-proj-menu-${idx}`);
		const search_txt = $(this).val();

		if (frm.doc.table_pfiw && frm.doc.table_pfiw[idx]) {
			frm.doc.table_pfiw[idx].project = search_txt;
		}

		fetch_recent_projects(search_txt, (projects) => {
			render_project_dropdown_items($menu, projects, idx);
			$menu.show();
		});
	});

	// Project Item Selection
	wrapper.on("click", ".tf-proj-item", function (e) {
		e.stopPropagation();
		const idx = $(this).data("idx");
		const p_name = $(this).data("name");
		const p_title = $(this).data("title");

		const $input = wrapper.find(`.tf-row-project-input[data-idx="${idx}"]`);
		$input.val(p_title);

		if (frm.doc.table_pfiw && frm.doc.table_pfiw[idx]) {
			frm.doc.table_pfiw[idx].project = p_name;
			frm.doc.table_pfiw[idx].task = "";
			const $task_input = wrapper.find(`.tf-row-task-input[data-idx="${idx}"]`);
			$task_input.val("");
		}

		wrapper.find(`.tf-proj-menu-${idx}`).hide();
	});

	// Task Dropdown Focus / Click
	wrapper.on("focus click", ".tf-row-task-input", function (e) {
		if ($(this).is(":disabled")) return;
		e.stopPropagation();
		wrapper.find(".tf-dropdown-menu").hide();
		const idx = $(this).data("idx");
		const $menu = wrapper.find(`.tf-task-menu-${idx}`);
		const project_name = frm.doc.table_pfiw[idx] ? frm.doc.table_pfiw[idx].project : "";
		const search_txt = $(this).val();

		if (!project_name) {
			$menu.html(`<div class="tf-dropdown-no-res">Select a project first</div>`).show();
			return;
		}

		fetch_recent_tasks(project_name, search_txt, (tasks) => {
			render_task_dropdown_items($menu, tasks, idx);
			$menu.show();
		});
	});

	// Task Dropdown Typing / Search
	wrapper.on("input", ".tf-row-task-input", function () {
		if ($(this).is(":disabled")) return;
		const idx = $(this).data("idx");
		const $menu = wrapper.find(`.tf-task-menu-${idx}`);
		const project_name = frm.doc.table_pfiw[idx] ? frm.doc.table_pfiw[idx].project : "";
		const search_txt = $(this).val();

		if (frm.doc.table_pfiw && frm.doc.table_pfiw[idx]) {
			frm.doc.table_pfiw[idx].task = search_txt;
		}

		if (!project_name) {
			$menu.html(`<div class="tf-dropdown-no-res">Select a project first</div>`).show();
			return;
		}

		fetch_recent_tasks(project_name, search_txt, (tasks) => {
			render_task_dropdown_items($menu, tasks, idx);
			$menu.show();
		});
	});

	// Task Item Selection
	wrapper.on("click", ".tf-task-item", function (e) {
		e.stopPropagation();
		const idx = $(this).data("idx");
		const t_name = $(this).data("name");
		const t_title = $(this).data("title");

		const $input = wrapper.find(`.tf-row-task-input[data-idx="${idx}"]`);
		$input.val(t_title);

		if (frm.doc.table_pfiw && frm.doc.table_pfiw[idx]) {
			frm.doc.table_pfiw[idx].task = t_name;
		}

		wrapper.find(`.tf-task-menu-${idx}`).hide();
	});

	// Global click to close dropdown menus
	$(document).off("click.tf_dropdown").on("click.tf_dropdown", function () {
		wrapper.find(".tf-dropdown-menu").hide();
	});

	// Row level From Time change
	wrapper.on("change input", ".tf-row-from-time", function () {
		const idx = $(this).data("idx");
		const from_val = $(this).val();
		if (frm.doc.table_pfiw && frm.doc.table_pfiw[idx]) {
			const doc_date = frm.doc.timesheet_date || frappe.datetime.get_today();
			frm.doc.table_pfiw[idx].from_time = `${doc_date} ${from_val}:00`;

			const def_times = get_default_times_for_date(doc_date);
			const to_val = extract_time_str(frm.doc.table_pfiw[idx].to_time) || def_times.to;
			const hrs = calc_time_diff_hrs(from_val, to_val);
			frm.doc.table_pfiw[idx].hrs = hrs;

			wrapper.find(`.tf-row-duration[data-idx="${idx}"]`).val(hours_to_hhmm(hrs));
			calculate_total_hours(frm);
			update_widget_summary(frm);
		}
	});

	// Row level To Time change
	wrapper.on("change input", ".tf-row-to-time", function () {
		const idx = $(this).data("idx");
		const to_val = $(this).val();
		if (frm.doc.table_pfiw && frm.doc.table_pfiw[idx]) {
			const doc_date = frm.doc.timesheet_date || frappe.datetime.get_today();
			frm.doc.table_pfiw[idx].to_time = `${doc_date} ${to_val}:00`;

			const from_val = extract_time_str(frm.doc.table_pfiw[idx].from_time) || "10:00";
			const hrs = calc_time_diff_hrs(from_val, to_val);
			frm.doc.table_pfiw[idx].hrs = hrs;

			wrapper.find(`.tf-row-duration[data-idx="${idx}"]`).val(hours_to_hhmm(hrs));
			calculate_total_hours(frm);
			update_widget_summary(frm);
		}
	});

	// Row level Duration change
	wrapper.on("change input", ".tf-row-duration", function () {
		const idx = $(this).data("idx");
		const val = $(this).val();
		const hrs = hhmm_to_hours(val);
		if (frm.doc.table_pfiw && frm.doc.table_pfiw[idx]) {
			frm.doc.table_pfiw[idx].hrs = hrs;
			calculate_total_hours(frm);
			update_widget_summary(frm);
		}
	});

	// Initial populate
	update_widget_summary(frm);
}

function render_project_dropdown_items($menu, projects, idx) {
	$menu.empty();
	if (!projects || projects.length === 0) {
		$menu.html(`<div class="tf-dropdown-no-res">No projects found</div>`);
		return;
	}
	projects.forEach((p) => {
		const display_name = p.project_name || p.name;
		$menu.append(`
			<div class="tf-dropdown-item tf-proj-item" data-idx="${idx}" data-name="${frappe.utils.escape_html(p.name)}" data-title="${frappe.utils.escape_html(display_name)}">
				${frappe.utils.escape_html(display_name)}
			</div>
		`);
	});
}

function render_task_dropdown_items($menu, tasks, idx) {
	$menu.empty();
	if (!tasks || tasks.length === 0) {
		$menu.html(`<div class="tf-dropdown-no-res">No tasks found for this project</div>`);
		return;
	}
	tasks.forEach((t) => {
		const display_name = t.task_title || t.name;
		$menu.append(`
			<div class="tf-dropdown-item tf-task-item" data-idx="${idx}" data-name="${frappe.utils.escape_html(t.name)}" data-title="${frappe.utils.escape_html(display_name)}">
				${frappe.utils.escape_html(display_name)}
			</div>
		`);
	});
}

function update_table_rows(frm, wrapper) {
	const $tbody = wrapper.find("#tf-table-body");
	$tbody.empty();

	const items = frm.doc.table_pfiw || [];
	if (items.length === 0) {
		$tbody.append(`
			<tr>
				<td colspan="9" style="text-align: center; color: #94a3b8; padding: 20px; font-size: 13px;">
					No time entries. Click <strong style="color: #2563eb; cursor: pointer;" id="tf-link-add">Add Entry</strong> to start.
				</td>
			</tr>
		`);
		wrapper.find("#tf-link-add").on("click", function () {
			wrapper.find("#tf-btn-add-row").trigger("click");
		});
		return;
	}

	const doc_date = frm.doc.timesheet_date || frappe.datetime.get_today();
	const def_times = get_default_times_for_date(doc_date);

	items.forEach((item, idx) => {
		const work_type = item.activity_type || "Task";
		const is_task = work_type === "Task";
		const desc = item.description ? item.description.replace(/<[^>]*>?/gm, "") : "";
		const duration = hours_to_hhmm(item.hrs);
		const from_val = extract_time_str(item.from_time) || (idx === 0 ? def_times.from : "12:30");
		const to_val = extract_time_str(item.to_time) || def_times.to;

		// Build Work Type options
		const wt_task_sel = work_type === "Task" ? "selected" : "";
		const wt_meet_sel = work_type === "Meeting" ? "selected" : "";
		const wt_res_sel = work_type === "Research" ? "selected" : "";

		const proj_val = is_task ? (item.project || "") : "";
		const task_val = is_task ? (item.task || "") : "";

		const proj_attrs = is_task
			? 'placeholder="Select project..."'
			: 'placeholder="—" disabled style="background: #f8fafc; color: #94a3b8; cursor: not-allowed; border-color: #f1f5f9;"';
		const task_attrs = is_task
			? 'placeholder="Select task..."'
			: 'placeholder="—" disabled style="background: #f8fafc; color: #94a3b8; cursor: not-allowed; border-color: #f1f5f9;"';

		$tbody.append(`
			<tr>
				<td style="font-weight: 500; color: #94a3b8; font-size: 12px;">${idx + 1}</td>
				<td>
					<select class="tf-table-select tf-row-work-type" data-idx="${idx}" data-type="${work_type}">
						<option value="Task" ${wt_task_sel} style="background:#ffffff; color:#1d4ed8; font-weight:600;">Task</option>
						<option value="Meeting" ${wt_meet_sel} style="background:#ffffff; color:#6d28d9; font-weight:600;">Meeting</option>
						<option value="Research" ${wt_res_sel} style="background:#ffffff; color:#047857; font-weight:600;">Research</option>
					</select>
				</td>
				<td>
					<div class="tf-dropdown-container">
						<input type="text" class="tf-dropdown-input tf-row-project-input" data-idx="${idx}" value="${frappe.utils.escape_html(proj_val)}" ${proj_attrs} autocomplete="off" />
						<svg class="tf-dropdown-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
						<div class="tf-dropdown-menu tf-proj-menu-${idx}"></div>
					</div>
				</td>
				<td>
					<div class="tf-dropdown-container">
						<input type="text" class="tf-dropdown-input tf-row-task-input" data-idx="${idx}" value="${frappe.utils.escape_html(task_val)}" ${task_attrs} autocomplete="off" />
						<svg class="tf-dropdown-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
						<div class="tf-dropdown-menu tf-task-menu-${idx}"></div>
					</div>
				</td>
				<td>
					<input type="time" class="tf-table-input tf-row-from-time" data-idx="${idx}" value="${from_val}" />
				</td>
				<td>
					<input type="time" class="tf-table-input tf-row-to-time" data-idx="${idx}" value="${to_val}" />
				</td>
				<td>
					<input type="text" class="tf-table-input tf-row-duration" data-idx="${idx}" value="${duration}" placeholder="02:30" style="font-weight: 600; text-align: center; width: 75px;" />
				</td>
				<td>
					<div style="display: flex; align-items: center; gap: 4px;">
						<input type="text" class="tf-table-input tf-row-desc-input" data-idx="${idx}" value="${frappe.utils.escape_html(desc)}" placeholder="Add note..." readonly style="cursor: pointer;" />
						<button class="tf-btn-icon tf-row-desc-btn" data-idx="${idx}" title="Open Text Editor" type="button">
							<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
						</button>
					</div>
				</td>
				<td>
					<button class="tf-btn-icon tf-btn-delete-row" data-idx="${idx}" title="Delete" type="button">
						<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
					</button>
				</td>
			</tr>
		`);
	});
}

function update_widget_summary(frm) {
	const wrapper = $(frm.fields_dict.timesheet_widget.wrapper);
	const items = frm.doc.table_pfiw || [];

	let total_hrs = 0;

	const breakdown = {
		Task: 0,
		Meeting: 0,
		Research: 0,
	};

	items.forEach((item) => {
		const h = parseFloat(item.hrs) || 0;
		total_hrs += h;
		const type = item.activity_type || "Task";
		if (breakdown[type] !== undefined) {
			breakdown[type] += h;
		} else {
			breakdown[type] = h;
		}
	});

	wrapper.find("#tf-summary-total-hours").text(hours_to_hhmm(total_hrs));

	// Calculate percentages for segment bar
	const task_pct = total_hrs > 0 ? (breakdown.Task / total_hrs) * 100 : 0;
	const meet_pct = total_hrs > 0 ? (breakdown.Meeting / total_hrs) * 100 : 0;
	const res_pct = total_hrs > 0 ? (breakdown.Research / total_hrs) * 100 : 0;

	wrapper.find("#tf-seg-task").css("width", `${task_pct}%`);
	wrapper.find("#tf-seg-meeting").css("width", `${meet_pct}%`);
	wrapper.find("#tf-seg-research").css("width", `${res_pct}%`);

	const $bd = wrapper.find("#tf-summary-breakdown");
	$bd.empty();

	const color_map = {
		Task: { dot: "tf-dot-task", bg: "#eff6ff", text: "#1d4ed8" },
		Meeting: { dot: "tf-dot-meeting", bg: "#f5f3ff", text: "#6d28d9" },
		Research: { dot: "tf-dot-research", bg: "#ecfdf5", text: "#047857" },
	};

	Object.keys(breakdown).forEach((key) => {
		const info = color_map[key] || { dot: "tf-dot-task", bg: "#f8fafc", text: "#334155" };
		const hrs_str = hours_to_hhmm(breakdown[key]);
		const pct = total_hrs > 0 ? Math.round((breakdown[key] / total_hrs) * 100) : 0;

		$bd.append(`
			<div class="tf-breakdown-row">
				<div style="display: flex; align-items: center;">
					<span class="tf-dot ${info.dot}"></span>
					<span style="font-weight: 500; color: #334155;">${frappe.utils.escape_html(key)}</span>
				</div>
				<div style="display: flex; align-items: center; gap: 8px;">
					<span style="font-size: 11px; color: #94a3b8; font-weight: 500;">${pct}%</span>
					<span style="font-weight: 700; font-family: monospace; color: ${info.text}; background: ${info.bg}; padding: 2px 8px; border-radius: 4px;">
						${hrs_str}
					</span>
				</div>
			</div>
		`);
	});
}

function get_widget_html(frm) {
	const doc_date = frm.doc.timesheet_date || frappe.datetime.get_today();
	const formatted_date_ddmmyyyy = format_date_ddmmyyyy(doc_date);
	const emp_name = frm.doc.employee_name || frappe.session.user_fullname || "Talib Sheikh";
	const user_id = frm.doc.user || frappe.session.user || "";

	return `
<style>
  .tf-timesheet-wrapper {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    background: transparent;
    color: #1e293b;
    padding: 0;
    margin-bottom: 20px;
  }

  .tf-top-bar {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 16px;
    margin-bottom: 20px;
  }

  @media (max-width: 800px) {
    .tf-top-bar {
      grid-template-columns: 1fr;
    }
  }

  .tf-field-group {
    display: flex;
    flex-direction: column;
  }

  .tf-label {
    font-size: 11px;
    font-weight: 600;
    color: #64748b;
    margin-bottom: 4px;
    text-transform: uppercase;
    letter-spacing: 0.3px;
  }

  .tf-input, .tf-select {
    width: 100%;
    height: 36px;
    padding: 6px 10px;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    font-size: 13px;
    color: #0f172a;
    background: #ffffff;
    outline: none;
    transition: border-color 0.15s ease;
    box-sizing: border-box;
  }

  .tf-input:focus, .tf-select:focus {
    border-color: #2563eb;
  }

  .tf-section-title {
    font-size: 13px;
    font-weight: 600;
    color: #475569;
    margin-bottom: 8px;
  }

  .tf-table-container {
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    background: #ffffff;
    overflow: visible;
  }

  .tf-table {
    width: 100%;
    border-collapse: collapse;
    text-align: left;
  }

  .tf-table th {
    background: #f8fafc;
    padding: 10px 10px;
    font-size: 11px;
    font-weight: 600;
    color: #64748b;
    border-bottom: 1px solid #e2e8f0;
    text-transform: uppercase;
    letter-spacing: 0.3px;
  }

  .tf-table td {
    padding: 8px 10px;
    font-size: 13px;
    color: #334155;
    border-bottom: 1px solid #f1f5f9;
    vertical-align: middle;
  }

  .tf-table tr:last-child td {
    border-bottom: none;
  }

  .tf-table-select, .tf-table-input {
    width: 100%;
    height: 34px;
    padding: 4px 8px;
    border: 1px solid #e2e8f0;
    border-radius: 5px;
    font-size: 13px;
    color: #0f172a;
    background: #ffffff;
    outline: none;
    box-sizing: border-box;
    transition: all 0.15s;
  }

  .tf-row-work-type[data-type="Task"] {
    background-color: #eff6ff !important;
    color: #1d4ed8 !important;
    border-color: #bfdbfe !important;
    font-weight: 600;
  }

  .tf-row-work-type[data-type="Meeting"] {
    background-color: #f5f3ff !important;
    color: #6d28d9 !important;
    border-color: #ddd6fe !important;
    font-weight: 600;
  }

  .tf-row-work-type[data-type="Research"] {
    background-color: #ecfdf5 !important;
    color: #047857 !important;
    border-color: #a7f3d0 !important;
    font-weight: 600;
  }

  .tf-table-select:focus, .tf-table-input:focus {
    border-color: #2563eb;
  }

  .tf-dropdown-container {
    position: relative;
    width: 100%;
  }

  .tf-dropdown-input {
    width: 100%;
    height: 34px;
    padding: 4px 24px 4px 8px;
    border: 1px solid #e2e8f0;
    border-radius: 5px;
    font-size: 13px;
    color: #0f172a;
    background: #ffffff;
    outline: none;
    box-sizing: border-box;
    transition: border-color 0.15s;
    text-overflow: ellipsis;
    white-space: nowrap;
    overflow: hidden;
  }

  .tf-dropdown-input:focus {
    border-color: #2563eb;
  }

  .tf-dropdown-icon {
    position: absolute;
    right: 8px;
    top: 50%;
    transform: translateY(-50%);
    pointer-events: none;
    color: #94a3b8;
  }

  .tf-dropdown-menu {
    position: absolute;
    top: calc(100% + 2px);
    left: 0;
    right: 0;
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    box-shadow: 0 8px 20px rgba(0, 0, 0, 0.08);
    max-height: 180px;
    overflow-y: auto;
    z-index: 9999;
    display: none;
    padding: 2px 0;
  }

  .tf-dropdown-item {
    padding: 6px 10px;
    font-size: 12px;
    color: #334155;
    cursor: pointer;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .tf-dropdown-item:hover {
    background: #f1f5f9;
    color: #2563eb;
  }

  .tf-dropdown-no-res {
    padding: 8px 10px;
    font-size: 12px;
    color: #94a3b8;
    text-align: center;
  }

  .tf-btn-icon {
    background: transparent;
    border: none;
    color: #94a3b8;
    cursor: pointer;
    padding: 4px;
    border-radius: 4px;
    transition: color 0.15s;
  }
  .tf-btn-icon:hover {
    color: #ef4444;
  }

  .tf-btn-add {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    margin-top: 10px;
    padding: 6px 12px;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    background: #ffffff;
    color: #2563eb;
    font-weight: 500;
    font-size: 12px;
    cursor: pointer;
    transition: background 0.15s;
  }
  .tf-btn-add:hover {
    background: #f8fafc;
  }

  .tf-bottom-grid {
    display: grid;
    grid-template-columns: 1fr 310px;
    gap: 16px;
    margin-top: 20px;
  }
  @media (max-width: 800px) {
    .tf-bottom-grid {
      grid-template-columns: 1fr;
    }
  }

  /* Sleek Modern Analytics Card */
  .tf-analytics-card {
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    padding: 18px 20px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02);
  }

  .tf-analytics-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 12px;
  }

  .tf-analytics-title {
    font-size: 11px;
    font-weight: 700;
    color: #64748b;
    text-transform: uppercase;
    letter-spacing: 0.6px;
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .tf-total-hero {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    padding-bottom: 10px;
    border-bottom: 1px solid #f1f5f9;
    margin-bottom: 12px;
  }

  .tf-total-number {
    font-size: 28px;
    font-weight: 800;
    color: #0f172a;
    letter-spacing: -0.6px;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, monospace;
  }

  /* Multi-segmented Progress Bar */
  .tf-progress-track {
    height: 7px;
    width: 100%;
    background: #f1f5f9;
    border-radius: 99px;
    overflow: hidden;
    display: flex;
    margin-bottom: 14px;
  }

  .tf-progress-seg {
    height: 100%;
    transition: width 0.3s ease;
  }
  .tf-seg-task { background: #2563eb; }
  .tf-seg-meeting { background: #8b5cf6; }
  .tf-seg-research { background: #10b981; }

  /* Breakdown List */
  .tf-breakdown-list {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .tf-breakdown-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: 12px;
    padding: 4px 8px;
    border-radius: 6px;
    background: #f8fafc;
  }

  .tf-dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    display: inline-block;
    margin-right: 8px;
  }
  .tf-dot-task { background: #2563eb; }
  .tf-dot-meeting { background: #8b5cf6; }
  .tf-dot-research { background: #10b981; }
</style>

<div class="tf-timesheet-wrapper">
	<!-- Top Bar -->
	<div class="tf-top-bar">
		<div class="tf-field-group">
			<label class="tf-label">Employee</label>
			<input type="text" class="tf-input" id="tf-input-employee" value="${frappe.utils.escape_html(emp_name)}" />
		</div>
		<div class="tf-field-group">
			<label class="tf-label">User</label>
			<input type="text" class="tf-input" id="tf-input-user" value="${frappe.utils.escape_html(user_id)}" readonly style="background: #f8fafc; color: #64748b; cursor: not-allowed;" />
		</div>
		<div class="tf-field-group">
			<label class="tf-label">Date</label>
			<input type="text" class="tf-input" id="tf-input-date" value="${formatted_date_ddmmyyyy}" placeholder="DD/MM/YYYY" autocomplete="off" />
		</div>
	</div>

	<!-- Time Entries Section -->
	<div style="margin-bottom: 20px;">
		<div class="tf-section-title">Time Entries</div>
		<div class="tf-table-container">
			<table class="tf-table">
				<thead>
					<tr>
						<th style="width: 30px;">#</th>
						<th style="width: 105px;">Activity</th>
						<th style="width: 165px;">Project</th>
						<th style="width: 165px;">Task</th>
						<th style="width: 95px;">From</th>
						<th style="width: 95px;">To</th>
						<th style="width: 80px;">Duration</th>
						<th>Description</th>
						<th style="width: 35px;"></th>
					</tr>
				</thead>
				<tbody id="tf-table-body">
				</tbody>
			</table>
		</div>
		<button class="tf-btn-add" id="tf-btn-add-row" type="button">
			<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
			Add Row
		</button>
	</div>

	<!-- Detailed Description & Analytics Summary -->
	<div class="tf-bottom-grid">
		<div>
			<div id="tf-native-description-container"></div>
		</div>

		<!-- Sleek Analytics Summary Card -->
		<div class="tf-analytics-card">
			<div class="tf-analytics-header">
				<div class="tf-analytics-title">
					<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
					Analytics & Breakdown
				</div>
			</div>

			<div class="tf-total-hero">
				<span style="font-size: 12px; font-weight: 600; color: #64748b;">Total Hours</span>
				<div>
					<span class="tf-total-number" id="tf-summary-total-hours">00:00</span>
					<span style="font-size: 11px; font-weight: 600; color: #94a3b8;">hrs</span>
				</div>
			</div>

			<!-- Segmented Distribution Bar -->
			<div class="tf-progress-track">
				<div class="tf-progress-seg tf-seg-task" id="tf-seg-task" style="width: 0%;"></div>
				<div class="tf-progress-seg tf-seg-meeting" id="tf-seg-meeting" style="width: 0%;"></div>
				<div class="tf-progress-seg tf-seg-research" id="tf-seg-research" style="width: 0%;"></div>
			</div>

			<div class="tf-breakdown-list" id="tf-summary-breakdown">
			</div>
		</div>
	</div>
</div>
`;
}
