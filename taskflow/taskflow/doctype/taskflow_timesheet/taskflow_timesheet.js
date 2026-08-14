// Copyright (c) 2026, Talib Sheikh and contributors
// For license information, please see license.txt

/**
 * Taskflow Timesheet Client Script
 * Modern, hyper-minimal HTML widget for time tracking & analytics.
 */

frappe.ui.form.on("Taskflow Timesheet", {
	setup(frm) {
		frm.set_query("task", "table_pfiw", (doc, cdt, cdn) => {
			const row = frappe.get_doc(cdt, cdn);
			return row.project ? { filters: { project: row.project } } : { filters: {} };
		});
	},

	refresh(frm) {
		TimesheetFormController.init_defaults(frm);
		TimesheetFormController.handle_tab_visibility(frm);
		TimesheetUI.render_widget(frm);
	},

	"table_pfiw.from_time"(frm, cdt, cdn) {
		TimesheetCalculation.calculate_item_hours(frm, cdt, cdn);
	},

	"table_pfiw.to_time"(frm, cdt, cdn) {
		TimesheetCalculation.calculate_item_hours(frm, cdt, cdn);
	},

	"table_pfiw.hrs"(frm) {
		TimesheetCalculation.calculate_total_hours(frm);
		TimesheetUI.update_summary(frm);
	},

	table_pfiw_remove(frm) {
		TimesheetCalculation.calculate_total_hours(frm);
		TimesheetUI.update_summary(frm);
	},

	table_pfiw_add(frm) {
		TimesheetCalculation.calculate_total_hours(frm);
		TimesheetUI.update_summary(frm);
	},
});

/* ==========================================================================
   Form Controller & Permissions Helper
   ========================================================================== */
const TimesheetFormController = {
	init_defaults(frm) {
		if (frm.is_new() && !frm.doc.user) {
			frm.set_value("user", frappe.session.user);
		}
		if (!frm.doc.employee_name) {
			frm.set_value("employee_name", frappe.session.user_fullname || frappe.session.user);
		}
		if (!frm.doc.timesheet_date) {
			frm.set_value("timesheet_date", frappe.datetime.get_today());
		}
		if (!frm.doc.status) {
			frm.set_value("status", "Draft");
		}
	},

	handle_tab_visibility(frm) {
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
				"status",
			],
			is_system_manager
		);
	},
};

/* ==========================================================================
   Time Utilities
   ========================================================================== */
const TimeUtils = {
	hours_to_hhmm(hrs) {
		if (!hrs && hrs !== 0) return "00:00";
		const total_mins = Math.round(parseFloat(hrs) * 60);
		const h = Math.floor(total_mins / 60);
		const m = total_mins % 60;
		return String(h).padStart(2, "0") + ":" + String(m).padStart(2, "0");
	},

	hhmm_to_hours(hhmm) {
		if (!hhmm) return 0;
		const parts = String(hhmm).split(":");
		if (parts.length === 2) {
			const h = parseFloat(parts[0]) || 0;
			const m = parseFloat(parts[1]) || 0;
			return h + m / 60;
		}
		return parseFloat(hhmm) || 0;
	},

	calc_time_diff_hrs(from_str, to_str) {
		if (!from_str || !to_str) return 0;
		const [f_h, f_m] = from_str.split(":").map(Number);
		const [t_h, t_m] = to_str.split(":").map(Number);

		let from_mins = f_h * 60 + (f_m || 0);
		let to_mins = t_h * 60 + (t_m || 0);

		if (to_mins < from_mins) {
			to_mins += 24 * 60;
		}

		return (to_mins - from_mins) / 60;
	},

	extract_time_str(time_val) {
		if (!time_val) return "";
		if (typeof time_val === "string" && time_val.includes(" ")) {
			return time_val.split(" ")[1].substring(0, 5);
		}
		return String(time_val).substring(0, 5);
	},

	format_date_ddmmyyyy(date_str) {
		if (!date_str) return "";
		const parts = date_str.split("-");
		return parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : date_str;
	},

	parse_ddmmyyyy_to_yyyy_mm_dd(user_str) {
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
	},

	get_default_times_for_date(date_str) {
		if (!date_str) return { from: "10:00", to: "18:00" };
		const day = new Date(date_str).getDay();
		return day === 6 ? { from: "10:00", to: "16:00" } : { from: "10:00", to: "18:00" };
	},
};

/* ==========================================================================
   Calculations Helper
   ========================================================================== */
const TimesheetCalculation = {
	calculate_item_hours(frm, cdt, cdn) {
		const row = frappe.get_doc(cdt, cdn);
		if (row.from_time && row.to_time) {
			const diff = frappe.datetime.get_diff(row.to_time, row.from_time);
			const hours = diff / 3600;
			frappe.model.set_value(cdt, cdn, "hrs", hours).then(() => {
				this.calculate_total_hours(frm);
				TimesheetUI.update_summary(frm);
			});
		}
	},

	calculate_total_hours(frm) {
		let total = 0;
		(frm.doc.table_pfiw || []).forEach((row) => {
			total += parseFloat(row.hrs) || 0;
		});
		frm.set_value("total_working_hours", total);
	},
};

/* ==========================================================================
   Data Fetching Service
   ========================================================================== */
const TimesheetDataService = {
	fetch_recent_projects(search_txt, callback) {
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
			.then((projects) => callback(projects || []));
	},

	fetch_recent_tasks(project_name, search_txt, callback) {
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
			.then((tasks) => callback(tasks || []));
	},
};

/* ==========================================================================
   Timesheet UI Rendering & Event Handling
   ========================================================================== */
const TimesheetUI = {
	render_widget(frm) {
		const wrapper = $(frm.fields_dict.timesheet_widget.wrapper);
		wrapper.empty();

		const is_submitted = frm.doc.status === "Submitted";
		const html = this.get_template_html(frm);
		wrapper.html(html);

		this.update_table_rows(frm, wrapper);

		if (is_submitted) {
			wrapper.find("#tf-btn-add-row").hide();
		} else {
			wrapper.find("#tf-btn-add-row").show();
		}

		this.bind_events(frm, wrapper);
		this.update_summary(frm);
	},

	bind_events(frm, wrapper) {
		const is_submitted = () => frm.doc.status === "Submitted";

		// Status dropdown
		wrapper.find("#tf-input-status").off("change.tf").on("change.tf", function () {
			const val = $(this).val();
			$(this).attr("data-status", val);
			frm.set_value("status", val).then(() => {
				frm.save().then(() => TimesheetUI.render_widget(frm));
			});
		});

		// Datepicker
		const $date_input = wrapper.find("#tf-input-date");
		if (!is_submitted() && $date_input.datepicker) {
			$date_input.datepicker({
				language: "en",
				dateFormat: "dd/mm/yyyy",
				autoClose: true,
				onSelect: (formattedDate, date) => {
					if (date) {
						const y = date.getFullYear();
						const m = String(date.getMonth() + 1).padStart(2, "0");
						const d = String(date.getDate()).padStart(2, "0");
						const db_date = `${y}-${m}-${d}`;
						frm.set_value("timesheet_date", db_date).then(() => {
							TimesheetUI.update_table_rows(frm, wrapper);
							TimesheetUI.update_summary(frm);
						});
					}
				},
			});
		}
		$date_input.off("change.tf input.tf").on("change.tf input.tf", function () {
			if (is_submitted()) return;
			const db_date = TimeUtils.parse_ddmmyyyy_to_yyyy_mm_dd($(this).val());
			if (db_date && db_date.length === 10) {
				frm.set_value("timesheet_date", db_date).then(() => {
					TimesheetUI.update_table_rows(frm, wrapper);
					TimesheetUI.update_summary(frm);
				});
			}
		});

		// Employee & User changes
		wrapper.find("#tf-input-employee").off("change.tf").on("change.tf", function () {
			if (!is_submitted()) frm.set_value("employee_name", $(this).val());
		});
		wrapper.find("#tf-input-user").off("change.tf").on("change.tf", function () {
			if (!is_submitted()) frm.set_value("user", $(this).val());
		});

		// Add Row Button
		wrapper.find("#tf-btn-add-row").off("click.tf").on("click.tf", () => {
			if (is_submitted()) return;
			const items = frm.doc.table_pfiw || [];
			const doc_date = frm.doc.timesheet_date || frappe.datetime.get_today();
			const def_times = TimeUtils.get_default_times_for_date(doc_date);

			let default_from = def_times.from;
			let default_to = def_times.to;

			if (items.length > 0) {
				const prev_to = TimeUtils.extract_time_str(items[items.length - 1].to_time);
				if (prev_to) {
					default_from = prev_to;
					const [h, m] = prev_to.split(":").map(Number);
					const max_h = def_times.to.split(":")[0];
					const new_h = Math.min(parseInt(max_h), h + 2);
					default_to = `${String(new_h).padStart(2, "0")}:${String(m || 0).padStart(2, "0")}`;
				}
			}

			const hrs = TimeUtils.calc_time_diff_hrs(default_from, default_to);

			frm.add_child("table_pfiw", {
				activity_type: "Task",
				project: items.length > 0 ? items[items.length - 1].project : "",
				task: "",
				from_time: `${doc_date} ${default_from}:00`,
				to_time: `${doc_date} ${default_to}:00`,
				hrs: hrs,
				description: "",
			});

			TimesheetCalculation.calculate_total_hours(frm);
			TimesheetUI.update_table_rows(frm, wrapper);
			TimesheetUI.update_summary(frm);
		});

		// Delegate Row Level Events
		wrapper.off("click.tf_row_del").on("click.tf_row_del", ".tf-btn-delete-row", function () {
			if (is_submitted()) return;
			const idx = $(this).data("idx");
			frm.doc.table_pfiw.splice(idx, 1);
			frm.doc.table_pfiw.forEach((r, i) => (r.idx = i + 1));
			frm.refresh_field("table_pfiw");
			TimesheetCalculation.calculate_total_hours(frm);
			TimesheetUI.update_table_rows(frm, wrapper);
			TimesheetUI.update_summary(frm);
		});

		wrapper.off("change.tf_row_wt").on("change.tf_row_wt", ".tf-row-work-type", function () {
			if (is_submitted()) return;
			const idx = $(this).data("idx");
			const val = $(this).val();
			$(this).attr("data-type", val);
			const child = frm.doc.table_pfiw && frm.doc.table_pfiw[idx];
			if (child) {
				frappe.model.set_value(child.doctype, child.name, "activity_type", val).then(() => {
					if (val !== "Task") {
						frappe.model.set_value(child.doctype, child.name, "project", "");
						frappe.model.set_value(child.doctype, child.name, "task", "");
					}
					TimesheetUI.update_table_rows(frm, wrapper);
					TimesheetUI.update_summary(frm);
				});
			}
		});

		wrapper.off("change.tf_row_desc input.tf-row_desc").on("change.tf_row_desc input.tf_row_desc", ".tf-row-desc-input", function () {
			if (is_submitted()) return;
			const idx = $(this).data("idx");
			const val = $(this).val();
			const child = frm.doc.table_pfiw && frm.doc.table_pfiw[idx];
			if (child) {
				frappe.model.set_value(child.doctype, child.name, "description", val);
			}
		});

		wrapper.off("click.tf_row_desc_btn").on("click.tf_row_desc_btn", ".tf-row-desc-btn", function (e) {
			e.preventDefault();
			if (is_submitted()) return;
			const idx = $(this).data("idx");
			const child = frm.doc.table_pfiw && frm.doc.table_pfiw[idx];
			const current_desc = child ? child.description || "" : "";

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
					const val = values.description || "";
					d.hide();
					if (child) {
						frappe.model.set_value(child.doctype, child.name, "description", val).then(() => {
							TimesheetUI.update_table_rows(frm, wrapper);
							frm.save();
						});
					}
				},
			});
			d.show();
		});

		// Project search dropdown
		wrapper.off("focus.tf_proj click.tf_proj").on("focus.tf_proj click.tf_proj", ".tf-row-project-input", function (e) {
			if ($(this).is(":disabled") || is_submitted()) return;
			e.stopPropagation();
			wrapper.find(".tf-dropdown-menu").hide();
			const idx = $(this).data("idx");
			const $menu = wrapper.find(`.tf-proj-menu-${idx}`);
			TimesheetDataService.fetch_recent_projects($(this).val(), (projects) => {
				TimesheetUI.render_project_dropdown_items($menu, projects, idx);
				$menu.show();
			});
		});

		wrapper.off("input.tf_proj").on("input.tf_proj", ".tf-row-project-input", function () {
			if ($(this).is(":disabled") || is_submitted()) return;
			const idx = $(this).data("idx");
			const $menu = wrapper.find(`.tf-proj-menu-${idx}`);
			const search_txt = $(this).val();
			const child = frm.doc.table_pfiw && frm.doc.table_pfiw[idx];

			if (child) frappe.model.set_value(child.doctype, child.name, "project", search_txt);
			TimesheetDataService.fetch_recent_projects(search_txt, (projects) => {
				TimesheetUI.render_project_dropdown_items($menu, projects, idx);
				$menu.show();
			});
		});

		wrapper.off("click.tf_proj_item").on("click.tf_proj_item", ".tf-proj-item", function (e) {
			e.stopPropagation();
			if (is_submitted()) return;
			const idx = $(this).data("idx");
			const p_name = $(this).data("name");
			const p_title = $(this).data("title");

			wrapper.find(`.tf-row-project-input[data-idx="${idx}"]`).val(p_title);
			const child = frm.doc.table_pfiw && frm.doc.table_pfiw[idx];
			if (child) {
				frappe.model.set_value(child.doctype, child.name, "project", p_name).then(() => {
					frappe.model.set_value(child.doctype, child.name, "task", "");
					wrapper.find(`.tf-row-task-input[data-idx="${idx}"]`).val("");
				});
			}
			wrapper.find(`.tf-proj-menu-${idx}`).hide();
		});

		// Task search dropdown
		wrapper.off("focus.tf_task click.tf_task").on("focus.tf_task click.tf_task", ".tf-row-task-input", function (e) {
			if ($(this).is(":disabled") || is_submitted()) return;
			e.stopPropagation();
			wrapper.find(".tf-dropdown-menu").hide();
			const idx = $(this).data("idx");
			const $menu = wrapper.find(`.tf-task-menu-${idx}`);
			const project_name = frm.doc.table_pfiw[idx] ? frm.doc.table_pfiw[idx].project : "";

			if (!project_name) {
				$menu.html(`<div class="tf-dropdown-no-res">Select a project first</div>`).show();
				return;
			}

			TimesheetDataService.fetch_recent_tasks(project_name, $(this).val(), (tasks) => {
				TimesheetUI.render_task_dropdown_items($menu, tasks, idx);
				$menu.show();
			});
		});

		wrapper.off("input.tf_task").on("input.tf_task", ".tf-row-task-input", function () {
			if ($(this).is(":disabled") || is_submitted()) return;
			const idx = $(this).data("idx");
			const $menu = wrapper.find(`.tf-task-menu-${idx}`);
			const project_name = frm.doc.table_pfiw[idx] ? frm.doc.table_pfiw[idx].project : "";
			const search_txt = $(this).val();
			const child = frm.doc.table_pfiw && frm.doc.table_pfiw[idx];

			if (child) frappe.model.set_value(child.doctype, child.name, "task", search_txt);
			if (!project_name) {
				$menu.html(`<div class="tf-dropdown-no-res">Select a project first</div>`).show();
				return;
			}

			TimesheetDataService.fetch_recent_tasks(project_name, search_txt, (tasks) => {
				TimesheetUI.render_task_dropdown_items($menu, tasks, idx);
				$menu.show();
			});
		});

		wrapper.off("click.tf_task_item").on("click.tf_task_item", ".tf-task-item", function (e) {
			e.stopPropagation();
			if (is_submitted()) return;
			const idx = $(this).data("idx");
			const t_name = $(this).data("name");
			const t_title = $(this).data("title");

			wrapper.find(`.tf-row-task-input[data-idx="${idx}"]`).val(t_title);
			const child = frm.doc.table_pfiw && frm.doc.table_pfiw[idx];
			if (child) frappe.model.set_value(child.doctype, child.name, "task", t_name);
			wrapper.find(`.tf-task-menu-${idx}`).hide();
		});

		// Global click to close dropdown menus
		$(document).off("click.tf_dropdown").on("click.tf_dropdown", () => {
			wrapper.find(".tf-dropdown-menu").hide();
		});

		// From & To time inputs
		wrapper.off("change.tf_from input.tf_from").on("change.tf_from input.tf_from", ".tf-row-from-time", function () {
			if (is_submitted()) return;
			const idx = $(this).data("idx");
			const from_val = $(this).val();
			const child = frm.doc.table_pfiw && frm.doc.table_pfiw[idx];
			if (child) {
				const doc_date = frm.doc.timesheet_date || frappe.datetime.get_today();
				const from_datetime = `${doc_date} ${from_val}:00`;
				frappe.model.set_value(child.doctype, child.name, "from_time", from_datetime).then(() => {
					const def_times = TimeUtils.get_default_times_for_date(doc_date);
					const to_val = TimeUtils.extract_time_str(child.to_time) || def_times.to;
					const hrs = TimeUtils.calc_time_diff_hrs(from_val, to_val);
					frappe.model.set_value(child.doctype, child.name, "hrs", hrs).then(() => {
						wrapper.find(`.tf-row-duration[data-idx="${idx}"]`).val(TimeUtils.hours_to_hhmm(hrs));
						TimesheetCalculation.calculate_total_hours(frm);
						TimesheetUI.update_summary(frm);
					});
				});
			}
		});

		wrapper.off("change.tf_to input.tf_to").on("change.tf_to input.tf_to", ".tf-row-to-time", function () {
			if (is_submitted()) return;
			const idx = $(this).data("idx");
			const to_val = $(this).val();
			const child = frm.doc.table_pfiw && frm.doc.table_pfiw[idx];
			if (child) {
				const doc_date = frm.doc.timesheet_date || frappe.datetime.get_today();
				const to_datetime = `${doc_date} ${to_val}:00`;
				frappe.model.set_value(child.doctype, child.name, "to_time", to_datetime).then(() => {
					const from_val = TimeUtils.extract_time_str(child.from_time) || "10:00";
					const hrs = TimeUtils.calc_time_diff_hrs(from_val, to_val);
					frappe.model.set_value(child.doctype, child.name, "hrs", hrs).then(() => {
						wrapper.find(`.tf-row-duration[data-idx="${idx}"]`).val(TimeUtils.hours_to_hhmm(hrs));
						TimesheetCalculation.calculate_total_hours(frm);
						TimesheetUI.update_summary(frm);
					});
				});
			}
		});

		// Duration input
		wrapper.off("change.tf_dur input.tf_dur").on("change.tf_dur input.tf_dur", ".tf-row-duration", function () {
			if (is_submitted()) return;
			const idx = $(this).data("idx");
			const hrs = TimeUtils.hhmm_to_hours($(this).val());
			const child = frm.doc.table_pfiw && frm.doc.table_pfiw[idx];
			if (child) {
				frappe.model.set_value(child.doctype, child.name, "hrs", hrs).then(() => {
					TimesheetCalculation.calculate_total_hours(frm);
					TimesheetUI.update_summary(frm);
				});
			}
		});
	},

	update_table_rows(frm, wrapper) {
		const $tbody = wrapper.find("#tf-table-body");
		$tbody.empty();

		const is_submitted = frm.doc.status === "Submitted";
		const items = frm.doc.table_pfiw || [];
		if (items.length === 0) {
			$tbody.append(`
				<tr>
					<td colspan="9" style="text-align: center; color: #94a3b8; padding: 20px; font-size: 13px;">
						${is_submitted ? "No time entries recorded." : 'No time entries. Click <strong style="color: #2563eb; cursor: pointer;" id="tf-link-add">Add Entry</strong> to start.'}
					</td>
				</tr>
			`);
			if (!is_submitted) {
				wrapper.find("#tf-link-add").off("click").on("click", () => {
					wrapper.find("#tf-btn-add-row").trigger("click");
				});
			}
			return;
		}

		const doc_date = frm.doc.timesheet_date || frappe.datetime.get_today();
		const def_times = TimeUtils.get_default_times_for_date(doc_date);

		items.forEach((item, idx) => {
			const work_type = item.activity_type || "Task";
			const is_task = work_type === "Task";
			const desc = item.description ? item.description.replace(/<[^>]*>?/gm, "") : "";
			const duration = TimeUtils.hours_to_hhmm(item.hrs);
			const from_val = TimeUtils.extract_time_str(item.from_time) || (idx === 0 ? def_times.from : "12:30");
			const to_val = TimeUtils.extract_time_str(item.to_time) || def_times.to;

			const wt_task_sel = work_type === "Task" ? "selected" : "";
			const wt_meet_sel = work_type === "Meeting" ? "selected" : "";
			const wt_res_sel = work_type === "Research" ? "selected" : "";

			const proj_val = is_task ? item.project || "" : "";
			const task_val = is_task ? item.task || "" : "";

			const is_dis = is_submitted;
			const proj_attrs = is_task && !is_dis
				? 'placeholder="Select project..."'
				: 'placeholder="—" disabled style="background: #f8fafc; color: #64748b; cursor: not-allowed; border-color: #f1f5f9;"';
			const task_attrs = is_task && !is_dis
				? 'placeholder="Select task..."'
				: 'placeholder="—" disabled style="background: #f8fafc; color: #64748b; cursor: not-allowed; border-color: #f1f5f9;"';

			const input_dis_style = is_dis ? 'disabled style="background: #f8fafc; color: #64748b; cursor: not-allowed;"' : '';

			$tbody.append(`
				<tr>
					<td style="font-weight: 500; color: #94a3b8; font-size: 12px;">${idx + 1}</td>
					<td>
						<select class="tf-table-select tf-row-work-type" data-idx="${idx}" data-type="${work_type}" ${input_dis_style}>
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
						<input type="time" class="tf-table-input tf-row-from-time" data-idx="${idx}" value="${from_val}" ${input_dis_style} />
					</td>
					<td>
						<input type="time" class="tf-table-input tf-row-to-time" data-idx="${idx}" value="${to_val}" ${input_dis_style} />
					</td>
					<td>
						<input type="text" class="tf-table-input tf-row-duration" data-idx="${idx}" value="${duration}" placeholder="02:30" ${input_dis_style} style="font-weight: 600; text-align: center; width: 75px; ${is_dis ? "background: #f8fafc; color: #64748b;" : ""}" />
					</td>
					<td>
						<div style="display: flex; align-items: center; gap: 4px;">
							<input type="text" class="tf-table-input tf-row-desc-input" data-idx="${idx}" value="${frappe.utils.escape_html(desc)}" placeholder="Add note..." ${input_dis_style} />
							${!is_dis ? `
							<button class="tf-btn-icon tf-row-desc-btn" data-idx="${idx}" title="Open Text Editor" type="button">
								<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
							</button>
							` : ""}
						</div>
					</td>
					<td>
						${!is_dis ? `
						<button class="tf-btn-icon tf-btn-delete-row" data-idx="${idx}" title="Delete" type="button">
							<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
						</button>
						` : ""}
					</td>
				</tr>
			`);
		});
	},

	render_project_dropdown_items($menu, projects, idx) {
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
	},

	render_task_dropdown_items($menu, tasks, idx) {
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
	},

	update_summary(frm) {
		const wrapper = $(frm.fields_dict.timesheet_widget.wrapper);
		const items = frm.doc.table_pfiw || [];

		let total_hrs = 0;
		const breakdown = { Task: 0, Meeting: 0, Research: 0 };

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

		wrapper.find("#tf-summary-total-hours").text(TimeUtils.hours_to_hhmm(total_hrs));

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
			const hrs_str = TimeUtils.hours_to_hhmm(breakdown[key]);
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
	},

	get_template_html(frm) {
		const doc_date = frm.doc.timesheet_date || frappe.datetime.get_today();
		const formatted_date_ddmmyyyy = TimeUtils.format_date_ddmmyyyy(doc_date);
		const emp_name = frm.doc.employee_name || frappe.session.user_fullname || "";
		const user_id = frm.doc.user || frappe.session.user || "";
		const status_val = frm.doc.status || "Draft";
		const is_submitted = status_val === "Submitted";

		const emp_dis_style = is_submitted ? 'disabled style="background: #f8fafc; color: #64748b; cursor: not-allowed;"' : '';
		const date_dis_style = is_submitted ? 'disabled style="background: #f8fafc; color: #64748b; cursor: not-allowed;"' : '';

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
    grid-template-columns: repeat(4, 1fr);
    gap: 16px;
    margin-bottom: 20px;
  }

  @media (max-width: 900px) {
    .tf-top-bar {
      grid-template-columns: 1fr 1fr;
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

  .tf-input-status[data-status="Draft"] {
    background-color: #fffbeb !important;
    color: #b45309 !important;
    border-color: #fde68a !important;
    font-weight: 600;
  }

  .tf-input-status[data-status="Submitted"] {
    background-color: #ecfdf5 !important;
    color: #047857 !important;
    border-color: #a7f3d0 !important;
    font-weight: 600;
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

  .tf-table tbody tr {
    transition: background-color 0.15s ease;
  }

  .tf-table tbody tr:hover {
    background-color: #f8fafc;
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

  .tf-bottom-container {
    margin-top: 20px;
    display: flex;
    justify-content: flex-start;
  }

  /* Sleek Modern Analytics Card - Compact Left Aligned */
  .tf-analytics-card {
    width: 340px;
    max-width: 100%;
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
			<input type="text" class="tf-input" id="tf-input-employee" value="${frappe.utils.escape_html(emp_name)}" ${emp_dis_style} />
		</div>
		<div class="tf-field-group">
			<label class="tf-label">User</label>
			<input type="text" class="tf-input" id="tf-input-user" value="${frappe.utils.escape_html(user_id)}" readonly style="background: #f8fafc; color: #64748b; cursor: not-allowed;" />
		</div>
		<div class="tf-field-group">
			<label class="tf-label">Date</label>
			<input type="text" class="tf-input" id="tf-input-date" value="${formatted_date_ddmmyyyy}" placeholder="DD/MM/YYYY" autocomplete="off" ${date_dis_style} />
		</div>
		<div class="tf-field-group">
			<label class="tf-label">Status</label>
			<select class="tf-select tf-input-status" id="tf-input-status" data-status="${status_val}">
				<option value="Draft" ${status_val === "Draft" ? "selected" : ""}>Draft</option>
				<option value="Submitted" ${status_val === "Submitted" ? "selected" : ""}>Submitted</option>
			</select>
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

	<!-- Analytics Summary Card -->
	<div class="tf-bottom-container">
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
	},
};
