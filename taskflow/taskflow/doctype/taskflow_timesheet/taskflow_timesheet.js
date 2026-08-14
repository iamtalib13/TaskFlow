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

		if (!frm.is_new()) {
			frm.add_custom_button(__("Send Email"), () => {
				TimesheetUI.show_send_email_dialog(frm);
			}, __("Actions"));
		}
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
		if (parts.length >= 2) {
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

		let from_mins = (f_h || 0) * 60 + (f_m || 0);
		let to_mins = (t_h || 0) * 60 + (t_m || 0);

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

	format_time_hhmmss(time_val) {
		if (!time_val) return "00:00:00";
		let str = String(time_val).trim();
		if (str.includes(" ")) {
			str = str.split(" ")[1];
		}
		const parts = str.split(":");
		if (parts.length === 2) {
			return `${parts[0].padStart(2, "0")}:${parts[1].padStart(2, "0")}:00`;
		} else if (parts.length >= 3) {
			return `${parts[0].padStart(2, "0")}:${parts[1].padStart(2, "0")}:${parts[2].padStart(2, "0")}`;
		}
		return "00:00:00";
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
   Data Fetching Service & Title Resolver Cache
   ========================================================================== */
const TimesheetDataService = {
	titles_cache: {
		projects: {},
		tasks: {},
	},

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
			.then((projects) => {
				(projects || []).forEach((p) => {
					this.titles_cache.projects[p.name] = p.project_name || p.name;
				});
				callback(projects || []);
			});
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
			.then((tasks) => {
				(tasks || []).forEach((t) => {
					this.titles_cache.tasks[t.name] = t.task_title || t.name;
				});
				callback(tasks || []);
			});
	},

	ensure_titles_loaded(items, callback) {
		const missing_projects = [];
		const missing_tasks = [];

		(items || []).forEach((item) => {
			if (item.project && !this.titles_cache.projects[item.project]) {
				missing_projects.push(item.project);
			}
			if (item.task && !this.titles_cache.tasks[item.task]) {
				missing_tasks.push(item.task);
			}
		});

		const promises = [];

		if (missing_projects.length > 0) {
			promises.push(
				frappe.db
					.get_list("Taskflow Project", {
						filters: [["name", "in", missing_projects]],
						fields: ["name", "project_name"],
						limit: missing_projects.length,
					})
					.then((projects) => {
						(projects || []).forEach((p) => {
							this.titles_cache.projects[p.name] = p.project_name || p.name;
						});
					})
			);
		}

		if (missing_tasks.length > 0) {
			promises.push(
				frappe.db
					.get_list("Taskflow Task", {
						filters: [["name", "in", missing_tasks]],
						fields: ["name", "task_title"],
						limit: missing_tasks.length,
					})
					.then((tasks) => {
						(tasks || []).forEach((t) => {
							this.titles_cache.tasks[t.name] = t.task_title || t.name;
						});
					})
			);
		}

		if (promises.length > 0) {
			Promise.all(promises).then(() => callback());
		} else {
			callback();
		}
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
			wrapper.find("#tf-btn-delete-bulk").hide();
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

		// Widget Send Email Button Click
		wrapper.find("#tf-btn-send-email-widget").off("click.tf_email").on("click.tf_email", () => {
			if (frm.is_new()) {
				frappe.msgprint(__("Please save the timesheet before sending email."));
				return;
			}
			TimesheetUI.show_send_email_dialog(frm);
		});

		// Check all checkbox
		wrapper.off("change.tf_check_all").on("change.tf_check_all", "#tf-check-all", function () {
			const checked = $(this).is(":checked");
			wrapper.find(".tf-row-checkbox").prop("checked", checked);
			TimesheetUI.update_bulk_delete_button(wrapper);
		});

		// Row checkbox change
		wrapper.off("change.tf_row_check").on("change.tf_row_check", ".tf-row-checkbox", function () {
			TimesheetUI.update_bulk_delete_button(wrapper);
		});

		// Bulk delete button click (Only way to delete rows)
		wrapper.off("click.tf_bulk_del").on("click.tf_bulk_del", "#tf-btn-delete-bulk", function () {
			if (is_submitted()) return;
			const selected_indices = [];
			wrapper.find(".tf-row-checkbox:checked").each(function () {
				selected_indices.push($(this).data("idx"));
			});

			if (selected_indices.length === 0) return;

			frappe.confirm(`Are you sure you want to delete ${selected_indices.length} selected row(s)?`, () => {
				selected_indices.sort((a, b) => b - a).forEach((idx) => {
					frm.doc.table_pfiw.splice(idx, 1);
				});
				frm.doc.table_pfiw.forEach((r, i) => (r.idx = i + 1));
				frm.refresh_field("table_pfiw");

				TimesheetCalculation.calculate_total_hours(frm);
				TimesheetUI.update_table_rows(frm, wrapper);
				TimesheetUI.update_summary(frm);
				frm.save();
			});
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

		// Open Row Detail Edit Modal on row click / info button click using frappe.ui.Dialog (size: extra-large)
		wrapper.off("click.tf_row_detail").on("click.tf_row_detail", ".tf-row-view-btn, .tf-row-badge-idx", function (e) {
			e.stopPropagation();
			const idx = $(this).data("idx");
			TimesheetUI.show_row_detail_modal(frm, idx);
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
			TimesheetUI.show_row_detail_modal(frm, idx);
		});

		// Project search dropdown
		wrapper.off("focus.tf_proj click.tf_proj").on("focus.tf_proj click.tf_proj", ".tf-row-project-input", function (e) {
			if ($(this).is(":disabled") || is_submitted()) return;
			e.stopPropagation();
			wrapper.find(".tf-dropdown-menu").hide();
			wrapper.find(".tf-dropdown-container").css("z-index", "");
			wrapper.find("tr, td").css("z-index", "");

			const idx = $(this).data("idx");
			const $container = $(this).closest(".tf-dropdown-container");
			const $tr = $(this).closest("tr");
			const $td = $(this).closest("td");

			$tr.css({ "position": "relative", "z-index": "1000" });
			$td.css({ "position": "relative", "z-index": "1000" });
			$container.css({ "position": "relative", "z-index": "1000" });

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

			TimesheetDataService.titles_cache.projects[p_name] = p_title;
			wrapper.find(`.tf-row-project-input[data-idx="${idx}"]`).val(p_title);
			const child = frm.doc.table_pfiw && frm.doc.table_pfiw[idx];
			if (child) {
				frappe.model.set_value(child.doctype, child.name, "project", p_name).then(() => {
					frappe.model.set_value(child.doctype, child.name, "task", "");
					wrapper.find(`.tf-row-task-input[data-idx="${idx}"]`).val("");
				});
			}
			wrapper.find(`.tf-proj-menu-${idx}`).hide();
			wrapper.find(".tf-dropdown-container").css("z-index", "");
			wrapper.find("tr, td").css("z-index", "");
		});

		// Task search dropdown
		wrapper.off("focus.tf_task click.tf_task").on("focus.tf_task click.tf_task", ".tf-row-task-input", function (e) {
			if ($(this).is(":disabled") || is_submitted()) return;
			e.stopPropagation();
			wrapper.find(".tf-dropdown-menu").hide();
			wrapper.find(".tf-dropdown-container").css("z-index", "");
			wrapper.find("tr, td").css("z-index", "");

			const idx = $(this).data("idx");
			const $container = $(this).closest(".tf-dropdown-container");
			const $tr = $(this).closest("tr");
			const $td = $(this).closest("td");

			$tr.css({ "position": "relative", "z-index": "1000" });
			$td.css({ "position": "relative", "z-index": "1000" });
			$container.css({ "position": "relative", "z-index": "1000" });

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

			TimesheetDataService.titles_cache.tasks[t_name] = t_title;
			wrapper.find(`.tf-row-task-input[data-idx="${idx}"]`).val(t_title);
			const child = frm.doc.table_pfiw && frm.doc.table_pfiw[idx];
			if (child) frappe.model.set_value(child.doctype, child.name, "task", t_name);
			wrapper.find(`.tf-task-menu-${idx}`).hide();
			wrapper.find(".tf-dropdown-container").css("z-index", "");
			wrapper.find("tr, td").css("z-index", "");
		});

		// Global click to close dropdown menus
		$(document).off("click.tf_dropdown").on("click.tf_dropdown", () => {
			wrapper.find(".tf-dropdown-menu").hide();
			wrapper.find(".tf-dropdown-container").css("z-index", "");
			wrapper.find("tr, td").css("z-index", "");
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

	update_bulk_delete_button(wrapper) {
		const checked_count = wrapper.find(".tf-row-checkbox:checked").length;
		const total_count = wrapper.find(".tf-row-checkbox").length;

		if (total_count > 0 && checked_count === total_count) {
			wrapper.find("#tf-check-all").prop("checked", true);
		} else {
			wrapper.find("#tf-check-all").prop("checked", false);
		}

		if (checked_count > 0) {
			wrapper.find("#tf-selected-count").text(checked_count);
			wrapper.find("#tf-btn-delete-bulk").css("display", "inline-flex");
		} else {
			wrapper.find("#tf-btn-delete-bulk").hide();
		}
	},

	show_send_email_dialog(frm) {
		const items = frm.doc.table_pfiw || [];
		TimesheetDataService.ensure_titles_loaded(items, () => {
			TimesheetUI._show_send_email_dialog_internal(frm);
		});
	},

	_show_send_email_dialog_internal(frm) {
		const doc_date = TimeUtils.format_date_ddmmyyyy(frm.doc.timesheet_date || frappe.datetime.get_today());
		const emp_name = frm.doc.employee_name || frappe.session.user_fullname || "";
		const user_id = frm.doc.user || frappe.session.user || "";
		const status_val = frm.doc.status || "Draft";
		const default_subject = `Timesheet Summary - ${doc_date} - ${emp_name}`;

		// Pre-populate Hyper-Structured HTML Email Body
		const items = frm.doc.table_pfiw || [];
		let total_hrs = 0;
		const breakdown = { Task: 0, Meeting: 0, Research: 0 };

		let table_rows = "";
		items.forEach((item, idx) => {
			const act = item.activity_type || "Task";
			const hrs = parseFloat(item.hrs) || 0;
			total_hrs += hrs;
			breakdown[act] = (breakdown[act] || 0) + hrs;

			const is_task = act === "Task";
			const proj_display = is_task ? (TimesheetDataService.titles_cache.projects[item.project] || item.project || "—") : "—";
			const task_display = is_task ? (TimesheetDataService.titles_cache.tasks[item.task] || item.task || "—") : "—";
			const from_val = TimeUtils.extract_time_str(item.from_time) || "—";
			const to_val = TimeUtils.extract_time_str(item.to_time) || "—";
			const dur_val = TimeUtils.hours_to_hhmm(hrs);
			const desc_val = item.description ? item.description.replace(/<[^>]*>?/gm, "") : "—";

			let badge_style = 'background: #eff6ff; color: #1d4ed8;';
			if (act === 'Meeting') badge_style = 'background: #f5f3ff; color: #6d28d9;';
			if (act === 'Research') badge_style = 'background: #ecfdf5; color: #047857;';

			const bg_style = idx % 2 === 1 ? 'background: #fafafa;' : 'background: #ffffff;';

			table_rows += `
				<tr style="${bg_style} border-bottom: 1px solid #e2e8f0;">
					<td style="padding: 9px 6px; text-align: center; font-weight: 700; color: #64748b; border-right: 1px solid #e2e8f0;">${idx + 1}</td>
					<td style="padding: 9px 8px; border-right: 1px solid #e2e8f0;">
						<span style="font-size: 11px; font-weight: 700; padding: 2px 7px; border-radius: 4px; ${badge_style}">${act}</span>
					</td>
					<td style="padding: 9px 8px; color: #1e293b; font-weight: 600; border-right: 1px solid #e2e8f0;">${frappe.utils.escape_html(proj_display)}</td>
					<td style="padding: 9px 8px; color: #334155; border-right: 1px solid #e2e8f0;">${frappe.utils.escape_html(task_display)}</td>
					<td style="padding: 9px 6px; text-align: center; font-family: monospace; color: #1e293b; border-right: 1px solid #e2e8f0;">${from_val}</td>
					<td style="padding: 9px 6px; text-align: center; font-family: monospace; color: #1e293b; border-right: 1px solid #e2e8f0;">${to_val}</td>
					<td style="padding: 9px 6px; text-align: center; font-family: monospace; font-weight: 700; color: #0078d4; border-right: 1px solid #e2e8f0;">${dur_val}</td>
					<td style="padding: 9px 8px; color: #475569;">${frappe.utils.escape_html(desc_val)}</td>
				</tr>
			`;
		});

		const formatted_total_str = TimeUtils.hours_to_hhmm(total_hrs);
		const task_str = TimeUtils.hours_to_hhmm(breakdown.Task || 0);
		const meet_str = TimeUtils.hours_to_hhmm(breakdown.Meeting || 0);
		const res_str = TimeUtils.hours_to_hhmm(breakdown.Research || 0);

		const default_message_body = `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b; max-width: 680px; margin: 0 auto; background: #ffffff; padding: 4px;">
	
	<!-- Greeting & Intro -->
	<p style="font-size: 14px; color: #334155; margin-bottom: 16px; line-height: 1.5;">
		Dear Team,<br>Please review the daily timesheet summary and activity breakout details recorded for <strong>${doc_date}</strong>:
	</p>

	<!-- Employee Metadata & Hero Total Card -->
	<table style="width: 100%; border-collapse: collapse; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; margin-bottom: 20px; font-size: 13px;">
		<tr>
			<td style="padding: 16px 20px; vertical-align: top; width: 60%;">
				<table style="width: 100%; border-collapse: collapse;">
					<tr>
						<td style="padding: 3px 0; color: #64748b; font-weight: 600; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; width: 120px;">Employee Name:</td>
						<td style="padding: 3px 0; color: #0f172a; font-weight: 700; font-size: 13px;">${frappe.utils.escape_html(emp_name)}</td>
					</tr>
					<tr>
						<td style="padding: 3px 0; color: #64748b; font-weight: 600; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px;">Employee Code:</td>
						<td style="padding: 3px 0; color: #334155; font-weight: 600; font-size: 13px; font-family: monospace;">${frappe.utils.escape_html(user_id)}</td>
					</tr>
					<tr>
						<td style="padding: 3px 0; color: #64748b; font-weight: 600; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px;">Timesheet Date:</td>
						<td style="padding: 3px 0; color: #334155; font-weight: 600; font-size: 13px;">${doc_date}</td>
					</tr>
				</table>
			</td>
			<td style="padding: 16px 20px; vertical-align: middle; text-align: right; border-left: 1px dashed #cbd5e1; background: #ffffff; border-radius: 0 8px 8px 0;">
				<div style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 2px;">Total Work Hours</div>
				<div style="font-size: 28px; font-weight: 800; color: #0078d4; font-family: monospace; letter-spacing: -0.5px;">${formatted_total_str}</div>
				<div style="font-size: 11px; color: #047857; font-weight: 700; background: #ecfdf5; padding: 2px 8px; border-radius: 10px; display: inline-block; margin-top: 4px;">${status_val}</div>
			</td>
		</tr>
	</table>

	<!-- Activity Breakout Cards -->
	<div style="margin-bottom: 20px;">
		<div style="font-size: 11px; font-weight: 700; color: #475569; text-transform: uppercase; letter-spacing: 0.6px; margin-bottom: 8px;">Activity Hours Breakdown</div>
		<table style="width: 100%; border-collapse: separate; border-spacing: 8px 0;">
			<tr>
				<td style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 6px; padding: 10px 12px; width: 33.33%;">
					<div style="font-size: 11px; font-weight: 700; color: #1d4ed8; text-transform: uppercase;">Task</div>
					<div style="font-size: 18px; font-weight: 800; color: #1e293b; font-family: monospace; margin-top: 2px;">${task_str} <span style="font-size: 11px; font-weight: 500; color: #64748b;">hrs</span></div>
				</td>
				<td style="background: #f5f3ff; border: 1px solid #ddd6fe; border-radius: 6px; padding: 10px 12px; width: 33.33%;">
					<div style="font-size: 11px; font-weight: 700; color: #6d28d9; text-transform: uppercase;">Meeting</div>
					<div style="font-size: 18px; font-weight: 800; color: #1e293b; font-family: monospace; margin-top: 2px;">${meet_str} <span style="font-size: 11px; font-weight: 500; color: #64748b;">hrs</span></div>
				</td>
				<td style="background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 6px; padding: 10px 12px; width: 33.33%;">
					<div style="font-size: 11px; font-weight: 700; color: #047857; text-transform: uppercase;">Research</div>
					<div style="font-size: 18px; font-weight: 800; color: #1e293b; font-family: monospace; margin-top: 2px;">${res_str} <span style="font-size: 11px; font-weight: 500; color: #64748b;">hrs</span></div>
				</td>
			</tr>
		</table>
	</div>

	<!-- Time Entries Detailed Breakout Table -->
	<div style="margin-bottom: 24px;">
		<div style="font-size: 11px; font-weight: 700; color: #475569; text-transform: uppercase; letter-spacing: 0.6px; margin-bottom: 8px;">Detailed Time Log Entries</div>
		<table style="width: 100%; border-collapse: collapse; font-size: 12px; border: 1px solid #cbd5e1; border-radius: 6px; overflow: hidden;">
			<thead>
				<tr style="background: #f1f5f9; color: #334155; border-bottom: 2px solid #cbd5e1; text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px;">
					<th style="padding: 10px 8px; text-align: center; width: 28px; border-right: 1px solid #cbd5e1;">#</th>
					<th style="padding: 10px 8px; width: 85px; border-right: 1px solid #cbd5e1;">Activity</th>
					<th style="padding: 10px 8px; border-right: 1px solid #cbd5e1;">Project Name</th>
					<th style="padding: 10px 8px; border-right: 1px solid #cbd5e1;">Task Title</th>
					<th style="padding: 10px 8px; text-align: center; width: 55px; border-right: 1px solid #cbd5e1;">From</th>
					<th style="padding: 10px 8px; text-align: center; width: 55px; border-right: 1px solid #cbd5e1;">To</th>
					<th style="padding: 10px 8px; text-align: center; width: 65px; border-right: 1px solid #cbd5e1;">Hours</th>
					<th style="padding: 10px 8px;">Work Notes</th>
				</tr>
			</thead>
			<tbody>
				${table_rows}
			</tbody>
		</table>
	</div>

	<!-- Signature -->
	<div style="border-top: 1px solid #e2e8f0; padding-top: 14px; font-size: 12.5px; color: #475569;">
		Best regards,<br>
		<strong style="color: #0f172a; font-size: 13.5px;">${frappe.utils.escape_html(emp_name)}</strong><br>
		<span style="font-size: 11px; color: #64748b;">Submitted via TaskFlow Application</span>
	</div>
</div>
		`;

		const d = new frappe.ui.Dialog({
			title: __("New Message — TaskFlow Email Compose"),
			size: "extra-large",
			fields: [
				{
					fieldname: "outlook_header_html",
					fieldtype: "HTML",
					options: `
						<div style="background: #0078d4; color: #ffffff; padding: 12px 18px; border-radius: 8px 8px 0 0; margin: -15px -15px 15px -15px; display: flex; align-items: center; justify-content: space-between; font-family: 'Segoe UI', sans-serif;">
							<div style="display: flex; align-items: center; gap: 10px;">
								<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
								<span style="font-weight: 700; font-size: 14px; letter-spacing: 0.2px;">Microsoft Outlook Style Compose</span>
							</div>
							<span style="font-size: 11px; background: rgba(255,255,255,0.2); padding: 3px 10px; border-radius: 12px; font-weight: 600;">Timesheet Report</span>
						</div>
					`
				},
				{
					label: __("Subject"),
					fieldname: "subject",
					fieldtype: "Data",
					default: default_subject,
					reqd: 1,
					placeholder: "Add a subject...",
				},
				{
					fieldtype: "Section Break",
				},
				{
					label: __("To (Recipients)"),
					fieldname: "to_emails",
					fieldtype: "Data",
					reqd: 1,
					placeholder: "recipient1@example.com, recipient2@example.com",
					description: "Enter primary recipient email addresses separated by commas",
				},
				{
					label: __("Cc (Carbon Copy)"),
					fieldname: "cc_emails",
					fieldtype: "Data",
					placeholder: "manager@example.com",
					description: "Enter CC email addresses separated by commas (optional)",
				},
				{
					fieldtype: "Section Break",
					label: __("Email Body & Timesheet Breakout"),
				},
				{
					label: __("Message / Note to Recipients"),
					fieldname: "custom_message",
					fieldtype: "Text Editor",
					default: default_message_body,
				},
			],
			primary_action_label: __("Send Email"),
			primary_action(values) {
				frappe.call({
					method: "taskflow.taskflow.doctype.taskflow_timesheet.taskflow_timesheet.send_timesheet_email",
					args: {
						timesheet_name: frm.doc.name,
						to_emails: values.to_emails,
						cc_emails: values.cc_emails,
						subject: values.subject,
						custom_message: values.custom_message,
					},
					freeze: true,
					freeze_message: __("Sending Email via Outlook Service..."),
					callback(r) {
						d.hide();
						if (!r.exc) {
							frappe.msgprint({
								title: __("Email Sent"),
								indicator: "green",
								message: __("Timesheet summary email sent successfully!"),
							});
						}
					},
				});
			},
		});

		d.$wrapper.find(".btn-primary").css({
			"background-color": "#0078d4",
			"border-color": "#0078d4",
			"font-weight": "600",
			"padding": "6px 20px"
		});

		d.show();
	},

	show_row_detail_modal(frm, idx) {
		const child = frm.doc.table_pfiw && frm.doc.table_pfiw[idx];
		if (!child) return;

		const is_submitted = frm.doc.status === "Submitted";
		const doc_date = frm.doc.timesheet_date || frappe.datetime.get_today();
		const from_val = TimeUtils.format_time_hhmmss(child.from_time) || "10:00:00";
		const to_val = TimeUtils.format_time_hhmmss(child.to_time) || "18:00:00";
		const duration_str = TimeUtils.hours_to_hhmm(child.hrs);

		const d = new frappe.ui.Dialog({
			title: `Edit Entry #${idx + 1}`,
			size: "extra-large",
			fields: [
				{
					label: "Activity Type",
					fieldname: "activity_type",
					fieldtype: "Select",
					options: ["Task", "Meeting", "Research"],
					default: child.activity_type || "Task",
					read_only: is_submitted,
					onchange() {
						const val = d.get_value("activity_type");
						const is_task = val === "Task";
						d.set_df_property("project", "read_only", !is_task || is_submitted);
						d.set_df_property("task", "read_only", !is_task || is_submitted);
						if (!is_task) {
							d.set_value("project", "");
							d.set_value("task", "");
						}
					},
				},
				{
					fieldtype: "Column Break",
				},
				{
					label: "Project",
					fieldname: "project",
					fieldtype: "Link",
					options: "Taskflow Project",
					default: child.project || "",
					read_only: (child.activity_type || "Task") !== "Task" || is_submitted,
					onchange() {
						const proj = d.get_value("project");
						d.set_query("task", () => {
							return proj ? { filters: { project: proj } } : { filters: {} };
						});
					},
				},
				{
					fieldtype: "Section Break",
				},
				{
					label: "Task",
					fieldname: "task",
					fieldtype: "Link",
					options: "Taskflow Task",
					default: child.task || "",
					read_only: (child.activity_type || "Task") !== "Task" || is_submitted,
					get_query() {
						const proj = d.get_value("project");
						return proj ? { filters: { project: proj } } : { filters: {} };
					},
				},
				{
					fieldtype: "Column Break",
				},
				{
					label: "From Time",
					fieldname: "from_time",
					fieldtype: "Time",
					default: from_val,
					read_only: is_submitted,
					onchange() {
						const f = d.get_value("from_time");
						const t = d.get_value("to_time");
						if (f && t) {
							const hrs = TimeUtils.calc_time_diff_hrs(f, t);
							d.set_value("hrs_str", TimeUtils.hours_to_hhmm(hrs));
						}
					},
				},
				{
					label: "To Time",
					fieldname: "to_time",
					fieldtype: "Time",
					default: to_val,
					read_only: is_submitted,
					onchange() {
						const f = d.get_value("from_time");
						const t = d.get_value("to_time");
						if (f && t) {
							const hrs = TimeUtils.calc_time_diff_hrs(f, t);
							d.set_value("hrs_str", TimeUtils.hours_to_hhmm(hrs));
						}
					},
				},
				{
					label: "Duration (HH:MM)",
					fieldname: "hrs_str",
					fieldtype: "Data",
					default: duration_str,
					read_only: is_submitted,
				},
				{
					fieldtype: "Section Break",
				},
				{
					label: "Description / Notes",
					fieldname: "description",
					fieldtype: "Text Editor",
					default: child.description || "",
					read_only: is_submitted,
				},
			],
			primary_action_label: is_submitted ? "Close" : "Save Entry",
			primary_action(values) {
				d.hide();
				if (is_submitted) return;

				const act = values.activity_type || "Task";
				const proj = act === "Task" ? values.project || "" : "";
				const task = act === "Task" ? values.task || "" : "";
				let f_time = values.from_time || "10:00:00";
				let t_time = values.to_time || "18:00:00";

				if (f_time.length === 5) f_time += ":00";
				if (t_time.length === 5) t_time += ":00";

				const hrs = TimeUtils.hhmm_to_hours(values.hrs_str || "00:00");
				const desc = values.description || "";

				const from_datetime = `${doc_date} ${f_time}`;
				const to_datetime = `${doc_date} ${t_time}`;

				const promises = [
					frappe.model.set_value(child.doctype, child.name, "activity_type", act),
					frappe.model.set_value(child.doctype, child.name, "project", proj),
					frappe.model.set_value(child.doctype, child.name, "task", task),
					frappe.model.set_value(child.doctype, child.name, "from_time", from_datetime),
					frappe.model.set_value(child.doctype, child.name, "to_time", to_datetime),
					frappe.model.set_value(child.doctype, child.name, "hrs", hrs),
					frappe.model.set_value(child.doctype, child.name, "description", desc),
				];

				Promise.all(promises).then(() => {
					const wrapper = $(frm.fields_dict.timesheet_widget.wrapper);
					TimesheetCalculation.calculate_total_hours(frm);
					TimesheetUI.update_table_rows(frm, wrapper);
					TimesheetUI.update_summary(frm);
					frm.save();
				});
			},
		});

		d.show();
	},

	update_table_rows(frm, wrapper) {
		const items = frm.doc.table_pfiw || [];
		TimesheetDataService.ensure_titles_loaded(items, () => {
			this._render_table_rows_internal(frm, wrapper);
		});
	},

	_render_table_rows_internal(frm, wrapper) {
		const $tbody = wrapper.find("#tf-table-body");
		$tbody.empty();

		const is_submitted = frm.doc.status === "Submitted";
		const items = frm.doc.table_pfiw || [];

		if (items.length === 0) {
			$tbody.append(`
				<tr id="tf-empty-row">
					<td colspan="10" style="text-align: center; padding: 36px 20px; background: #ffffff;">
						<div style="display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px;">
							<div style="width: 44px; height: 44px; border-radius: 50%; background: #eff6ff; display: flex; align-items: center; justify-content: center; color: #2563eb; margin-bottom: 4px;">
								<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
							</div>
							<span style="font-size: 14px; font-weight: 600; color: #334155;">No time entries recorded for this date</span>
							<span style="font-size: 12px; color: #64748b; margin-bottom: 8px;">Start tracking your work hours by adding a new entry row</span>
							${!is_submitted ? `
							<button class="tf-btn-add" id="tf-link-add" type="button" style="padding: 8px 16px; font-size: 13px;">
								<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
								Add Your First Entry
							</button>
							` : ''}
						</div>
					</td>
				</tr>
			`);
			if (!is_submitted) {
				wrapper.find("#tf-link-add").off("click").on("click", () => {
					wrapper.find("#tf-btn-add-row").trigger("click");
				});
			}
			this.update_bulk_delete_button(wrapper);
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

			// Resolve Title from Cache
			const proj_display = is_task ? (TimesheetDataService.titles_cache.projects[item.project] || item.project || "") : "";
			const task_display = is_task ? (TimesheetDataService.titles_cache.tasks[item.task] || item.task || "") : "";

			const is_dis = is_submitted;
			const proj_attrs = is_task
				? (is_dis ? 'disabled style="background: transparent; color: #1e293b; cursor: default;"' : 'placeholder="Select project..."')
				: 'placeholder="—" disabled style="background: transparent; color: #94a3b8; cursor: default;"';

			const task_attrs = is_task
				? (is_dis ? 'disabled style="background: transparent; color: #1e293b; cursor: default;"' : 'placeholder="Select task..."')
				: 'placeholder="—" disabled style="background: transparent; color: #94a3b8; cursor: default;"';

			const input_dis_style = is_dis ? 'disabled style="background: transparent; color: #1e293b; opacity: 1; cursor: default;"' : '';

			$tbody.append(`
				<tr>
					<td style="width: 25px; text-align: center;">
						${!is_dis ? `<input type="checkbox" class="tf-row-checkbox" data-idx="${idx}" />` : ''}
					</td>
					<td style="text-align: center;">
						<span class="tf-row-badge-idx" data-idx="${idx}" title="Click to view row in dialog">
							${idx + 1}
						</span>
					</td>
					<td>
						<select class="tf-table-select tf-row-work-type" data-idx="${idx}" data-type="${work_type}" ${input_dis_style}>
							<option value="Task" ${wt_task_sel} style="background:#ffffff; color:#1d4ed8; font-weight:600;">Task</option>
							<option value="Meeting" ${wt_meet_sel} style="background:#ffffff; color:#6d28d9; font-weight:600;">Meeting</option>
							<option value="Research" ${wt_res_sel} style="background:#ffffff; color:#047857; font-weight:600;">Research</option>
						</select>
					</td>
					<td>
						<div class="tf-dropdown-container">
							<input type="text" class="tf-dropdown-input tf-row-project-input" data-idx="${idx}" value="${frappe.utils.escape_html(proj_display)}" ${proj_attrs} autocomplete="off" />
							<svg class="tf-dropdown-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
							<div class="tf-dropdown-menu tf-proj-menu-${idx}"></div>
						</div>
					</td>
					<td>
						<div class="tf-dropdown-container">
							<input type="text" class="tf-dropdown-input tf-row-task-input" data-idx="${idx}" value="${frappe.utils.escape_html(task_display)}" ${task_attrs} autocomplete="off" />
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
						<input type="text" class="tf-table-input tf-row-duration" data-idx="${idx}" value="${duration}" placeholder="02:30" ${input_dis_style} />
					</td>
					<td>
						<div style="display: flex; align-items: center; gap: 4px;">
							<input type="text" class="tf-table-input tf-row-desc-input" data-idx="${idx}" value="${frappe.utils.escape_html(desc)}" placeholder="Add note..." ${input_dis_style} />
							${!is_dis ? `
							<button class="tf-btn-icon tf-row-desc-btn" data-idx="${idx}" title="Open Dialog Editor" type="button">
								<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
							</button>
							` : ""}
						</div>
					</td>
					<td>
						<div style="display: flex; align-items: center; justify-content: center;">
							<button class="tf-btn-icon-view tf-row-view-btn" data-idx="${idx}" title="${is_dis ? "View Entry Detail" : "Edit in Dialog"}" type="button">
								<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
							</button>
						</div>
					</td>
				</tr>
			`);
		});

		this.update_bulk_delete_button(wrapper);
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

		const formatted_total = TimeUtils.hours_to_hhmm(total_hrs);
		wrapper.find("#tf-summary-total-hours").text(formatted_total);

		const task_hrs = breakdown.Task || 0;
		const meet_hrs = breakdown.Meeting || 0;
		const res_hrs = breakdown.Research || 0;

		const task_pct = total_hrs > 0 ? (task_hrs / total_hrs) * 100 : 0;
		const meet_pct = total_hrs > 0 ? (meet_hrs / total_hrs) * 100 : 0;
		const res_pct = total_hrs > 0 ? (res_hrs / total_hrs) * 100 : 0;

		// Update 3 Left Stat Cards
		wrapper.find("#tf-stat-task-val").text(TimeUtils.hours_to_hhmm(task_hrs));
		wrapper.find("#tf-stat-task-pct").text(`${Math.round(task_pct)}% of total`);

		wrapper.find("#tf-stat-meet-val").text(TimeUtils.hours_to_hhmm(meet_hrs));
		wrapper.find("#tf-stat-meet-pct").text(`${Math.round(meet_pct)}% of total`);

		wrapper.find("#tf-stat-res-val").text(TimeUtils.hours_to_hhmm(res_hrs));
		wrapper.find("#tf-stat-res-pct").text(`${Math.round(res_pct)}% of total`);

		// Update Right Progress Track
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
						<span style="font-size: 11px; color: #64748b; font-weight: 500;">${pct}%</span>
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

		const emp_dis_style = is_submitted ? 'disabled style="background: #ffffff; color: #1e293b; opacity: 1; cursor: default;"' : '';
		const date_dis_style = is_submitted ? 'disabled style="background: #ffffff; color: #1e293b; opacity: 1; cursor: default;"' : '';

		return `
<style>
  .tf-timesheet-wrapper {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    background: transparent;
    color: #334155;
    padding: 0;
    margin-bottom: 20px;
    -webkit-font-smoothing: antialiased;
  }

  /* Prevent browser-default gray text override on disabled fields */
  .tf-input:disabled, .tf-select:disabled, .tf-table-input:disabled, .tf-table-select:disabled, .tf-dropdown-input:disabled {
    opacity: 1 !important;
    color: #1e293b !important;
    -webkit-text-fill-color: #1e293b !important;
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
    margin-bottom: 5px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .tf-input, .tf-select {
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

  .tf-input:focus, .tf-select:focus {
    border-color: #2563eb;
    box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
  }

  .tf-input-status[data-status="Draft"] {
    background-color: #fffbeb !important;
    color: #b45309 !important;
    border-color: #fde68a !important;
    font-weight: 700;
    -webkit-text-fill-color: #b45309 !important;
  }

  .tf-input-status[data-status="Submitted"] {
    background-color: #ecfdf5 !important;
    color: #047857 !important;
    border-color: #a7f3d0 !important;
    font-weight: 700;
    -webkit-text-fill-color: #047857 !important;
  }

  .tf-section-title {
    font-size: 13px;
    font-weight: 700;
    color: #475569;
    letter-spacing: 0.2px;
  }

  .tf-table-container {
    border: 1px solid #cbd5e1;
    border-radius: 10px;
    background: #ffffff;
    overflow: visible !important;
    position: relative;
    box-shadow: 0 1px 3px rgba(15, 23, 42, 0.04);
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
    font-weight: 700;
    color: #475569;
    border-bottom: 1.5px solid #cbd5e1;
    border-right: 1px solid #e2e8f0;
    text-transform: uppercase;
    letter-spacing: 0.6px;
  }

  .tf-table th:last-child {
    border-right: none;
  }

  .tf-table td {
    padding: 6px 8px;
    font-size: 13px;
    color: #334155;
    border-bottom: 1px solid #e2e8f0;
    border-right: 1px solid #f1f5f9;
    vertical-align: middle;
  }

  .tf-table td:last-child {
    border-right: none;
  }

  .tf-table tbody tr {
    transition: all 0.15s ease-in-out;
    border-left: 3px solid transparent;
  }

  .tf-table tbody tr:nth-child(even) {
    background-color: #fafafa;
  }

  .tf-table tbody tr:hover {
    background-color: #f1f5f9;
    border-left-color: #2563eb;
  }

  .tf-table tr:last-child td {
    border-bottom: none;
  }

  .tf-row-checkbox, #tf-check-all {
    accent-color: #2563eb;
    width: 15px;
    height: 15px;
    cursor: pointer;
    vertical-align: middle;
  }

  .tf-row-badge-idx {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 22px;
    height: 22px;
    border-radius: 50%;
    background: #eff6ff;
    color: #2563eb;
    font-weight: 700;
    font-size: 11px;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .tf-row-badge-idx:hover {
    background: #2563eb;
    color: #ffffff;
  }

  .tf-table-select {
    width: 100%;
    height: 32px;
    padding: 3px 8px;
    border: 1px solid transparent !important;
    border-radius: 6px;
    font-size: 12px;
    font-weight: 600;
    outline: none;
    cursor: pointer;
    box-sizing: border-box;
    transition: all 0.15s ease;
  }

  .tf-table-select:focus {
    border-color: #2563eb !important;
    background: #ffffff !important;
  }

  .tf-row-work-type[data-type="Task"] {
    background-color: #eff6ff !important;
    color: #1d4ed8 !important;
    -webkit-text-fill-color: #1d4ed8 !important;
  }

  .tf-row-work-type[data-type="Meeting"] {
    background-color: #f5f3ff !important;
    color: #6d28d9 !important;
    -webkit-text-fill-color: #6d28d9 !important;
  }

  .tf-row-work-type[data-type="Research"] {
    background-color: #ecfdf5 !important;
    color: #047857 !important;
    -webkit-text-fill-color: #047857 !important;
  }

  .tf-dropdown-container {
    position: relative;
    width: 100%;
  }

  .tf-dropdown-input {
    width: 100%;
    height: 32px;
    padding: 4px 22px 4px 8px;
    border: 1px solid transparent;
    border-radius: 6px;
    font-size: 12.5px;
    color: #1e293b;
    background: transparent;
    outline: none;
    box-sizing: border-box;
    transition: all 0.15s ease;
    text-overflow: ellipsis;
    white-space: nowrap;
    overflow: hidden;
  }

  .tf-dropdown-input:focus {
    border-color: #cbd5e1;
    background: #ffffff;
  }

  .tf-dropdown-icon {
    position: absolute;
    right: 6px;
    top: 50%;
    transform: translateY(-50%);
    pointer-events: none;
    color: #94a3b8;
  }

  .tf-dropdown-menu {
    position: absolute;
    top: calc(100% + 4px);
    left: 0;
    min-width: 220px;
    width: max-content;
    max-width: 320px;
    background: #ffffff;
    border: 1px solid #cbd5e1;
    border-radius: 8px;
    box-shadow: 0 12px 28px rgba(15, 23, 42, 0.15);
    max-height: 200px;
    overflow-y: auto;
    z-index: 999999 !important;
    display: none;
    padding: 4px 0;
  }

  .tf-dropdown-item {
    padding: 8px 12px;
    font-size: 12.5px;
    color: #1e293b;
    cursor: pointer;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    transition: all 0.1s ease;
  }

  .tf-dropdown-item:hover {
    background: #eff6ff;
    color: #2563eb;
    font-weight: 600;
  }

  .tf-dropdown-no-res {
    padding: 10px 12px;
    font-size: 12px;
    color: #94a3b8;
    text-align: center;
  }

  .tf-table-input {
    width: 100%;
    height: 32px;
    padding: 4px 6px;
    border: 1px solid transparent;
    border-radius: 6px;
    font-size: 12.5px;
    color: #1e293b;
    background: transparent;
    outline: none;
    box-sizing: border-box;
    transition: all 0.15s ease;
  }

  .tf-table-input:focus {
    border-color: #cbd5e1;
    background: #ffffff;
  }

  .tf-dropdown-input::placeholder, .tf-table-input::placeholder {
    color: #94a3b8;
  }

  .tf-row-from-time, .tf-row-to-time {
    padding: 2px 4px !important;
    font-size: 12px !important;
    font-weight: 600 !important;
    text-align: center !important;
    color: #1e293b !important;
    font-family: monospace;
    letter-spacing: -0.3px;
  }

  .tf-row-duration {
    font-family: monospace;
    font-size: 12px !important;
    font-weight: 700 !important;
    text-align: center !important;
    color: #1e293b !important;
    background: #f8fafc !important;
    border-radius: 4px !important;
  }

  .tf-btn-icon {
    background: transparent;
    border: none;
    color: #94a3b8;
    cursor: pointer;
    padding: 4px;
    border-radius: 4px;
    transition: color 0.15s ease;
  }
  .tf-btn-icon:hover {
    color: #2563eb;
  }

  .tf-btn-icon-view {
    background: #eff6ff;
    border: 1px solid #dbeafe;
    color: #2563eb;
    cursor: pointer;
    width: 28px;
    height: 28px;
    border-radius: 6px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    transition: all 0.15s ease;
  }

  .tf-btn-icon-view:hover {
    background: #2563eb;
    color: #ffffff;
    border-color: #2563eb;
  }

  .tf-btn-add {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 7px 14px;
    border: 1px solid #cbd5e1;
    border-radius: 6px;
    background: #ffffff;
    color: #2563eb;
    font-weight: 600;
    font-size: 12px;
    cursor: pointer;
    transition: all 0.15s ease;
  }
  .tf-btn-add:hover {
    background: #eff6ff;
    border-color: #bfdbfe;
  }

  .tf-btn-send-email {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 6px 14px;
    border: 1px solid #0078d4;
    border-radius: 6px;
    background: #0078d4;
    color: #ffffff;
    font-weight: 600;
    font-size: 12px;
    cursor: pointer;
    transition: all 0.15s ease;
  }
  .tf-btn-send-email:hover {
    background: #106ebe;
    border-color: #106ebe;
  }

  .tf-btn-delete-bulk {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 7px 14px;
    border: 1px solid #fca5a5;
    border-radius: 6px;
    background: #ef4444;
    color: #ffffff;
    font-weight: 600;
    font-size: 12px;
    cursor: pointer;
    transition: background 0.15s ease;
  }
  .tf-btn-delete-bulk:hover {
    background: #dc2626;
  }

  .tf-bottom-container {
    margin-top: 20px;
    display: grid;
    grid-template-columns: 1fr 320px;
    gap: 16px;
    align-items: stretch;
  }

  @media (max-width: 900px) {
    .tf-bottom-container {
      grid-template-columns: 1fr;
    }
  }

  .tf-activity-cards-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 14px;
  }

  @media (max-width: 600px) {
    .tf-activity-cards-grid {
      grid-template-columns: 1fr;
    }
  }

  .tf-activity-stat-card {
    background: #ffffff;
    border-radius: 12px;
    padding: 16px 18px;
    border: 1px solid #e2e8f0;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    box-shadow: 0 1px 3px rgba(15, 23, 42, 0.03);
    transition: transform 0.15s ease, box-shadow 0.15s ease;
  }

  .tf-activity-stat-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 16px rgba(15, 23, 42, 0.06);
  }

  .tf-stat-task {
    background: linear-gradient(135deg, #ffffff 0%, #f0f9ff 100%);
    border-color: #bae6fd;
  }
  .tf-stat-meet {
    background: linear-gradient(135deg, #ffffff 0%, #faf5ff 100%);
    border-color: #e9d5ff;
  }
  .tf-stat-res {
    background: linear-gradient(135deg, #ffffff 0%, #ecfdf5 100%);
    border-color: #a7f3d0;
  }

  .tf-stat-card-header {
    display: flex;
    align-items: center;
    margin-bottom: 10px;
  }

  .tf-stat-card-title {
    font-size: 12px;
    font-weight: 700;
    color: #475569;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .tf-stat-card-val-group {
    display: flex;
    align-items: baseline;
    gap: 4px;
    margin-bottom: 4px;
  }

  .tf-stat-card-val {
    font-size: 24px;
    font-weight: 800;
    color: #1e293b;
    letter-spacing: -0.5px;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, monospace;
  }

  .tf-stat-card-unit {
    font-size: 11px;
    font-weight: 600;
    color: #64748b;
  }

  .tf-stat-card-pct {
    font-size: 11px;
    font-weight: 600;
    color: #64748b;
  }

  /* Right Analytics Card */
  .tf-analytics-card {
    width: 100%;
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    padding: 16px 18px;
    box-shadow: 0 1px 3px rgba(15, 23, 42, 0.03);
    box-sizing: border-box;
  }

  .tf-analytics-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 10px;
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
    padding-bottom: 8px;
    border-bottom: 1px solid #f1f5f9;
    margin-bottom: 10px;
  }

  .tf-total-number {
    font-size: 24px;
    font-weight: 800;
    color: #1e293b;
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
    margin-bottom: 12px;
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
    padding: 5px 10px;
    border-radius: 6px;
    background: #f8fafc;
  }

  .tf-dot {
    width: 8px;
    height: 8px;
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
			<input type="text" class="tf-input" id="tf-input-user" value="${frappe.utils.escape_html(user_id)}" readonly style="background: #ffffff; color: #1e293b; opacity: 1; cursor: default;" />
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

	<!-- Time Entries Section Header -->
	<div style="margin-bottom: 20px;">
		<div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
			<div class="tf-section-title">Time Entries</div>
			${!frm.is_new() ? `
			<button class="tf-btn-send-email" id="tf-btn-send-email-widget" type="button">
				<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
				Send Email Summary
			</button>
			` : ''}
		</div>
		<div class="tf-table-container">
			<table class="tf-table">
				<thead>
					<tr>
						<th style="width: 25px; text-align: center;">
							${!is_submitted ? '<input type="checkbox" id="tf-check-all" />' : ''}
						</th>
						<th style="width: 32px; text-align: center;">#</th>
						<th style="width: 95px;">Activity</th>
						<th style="width: 140px;">Project</th>
						<th style="width: 260px;">Task</th>
						<th style="width: 68px; text-align: center;">From</th>
						<th style="width: 68px; text-align: center;">To</th>
						<th style="width: 68px; text-align: center;">Duration</th>
						<th style="width: 130px;">Description</th>
						<th style="width: 40px; text-align: center;">View</th>
					</tr>
				</thead>
				<tbody id="tf-table-body">
				</tbody>
			</table>
		</div>

		<div style="display: flex; align-items: center; gap: 10px; margin-top: 10px;">
			<button class="tf-btn-add" id="tf-btn-add-row" type="button">
				<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
				Add Row
			</button>
			<button class="tf-btn-delete-bulk" id="tf-btn-delete-bulk" type="button" style="display: none;">
				<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
				Delete Selected (<span id="tf-selected-count">0</span>)
			</button>
		</div>
	</div>

	<!-- Bottom Section: 3 Left Activity Cards + Right Analytics Card -->
	<div class="tf-bottom-container">
		<!-- Left Side: 3 Activity Stat Cards -->
		<div class="tf-activity-cards-grid">
			<!-- Task Stat Card -->
			<div class="tf-activity-stat-card tf-stat-task">
				<div class="tf-stat-card-header">
					<span class="tf-dot tf-dot-task"></span>
					<span class="tf-stat-card-title">Task</span>
				</div>
				<div class="tf-stat-card-val-group">
					<span class="tf-stat-card-val" id="tf-stat-task-val">00:00</span>
					<span class="tf-stat-card-unit">hrs</span>
				</div>
				<div class="tf-stat-card-pct" id="tf-stat-task-pct">0% of total</div>
			</div>

			<!-- Meeting Stat Card -->
			<div class="tf-activity-stat-card tf-stat-meet">
				<div class="tf-stat-card-header">
					<span class="tf-dot tf-dot-meeting"></span>
					<span class="tf-stat-card-title">Meeting</span>
				</div>
				<div class="tf-stat-card-val-group">
					<span class="tf-stat-card-val" id="tf-stat-meet-val">00:00</span>
					<span class="tf-stat-card-unit">hrs</span>
				</div>
				<div class="tf-stat-card-pct" id="tf-stat-meet-pct">0% of total</div>
			</div>

			<!-- Research Stat Card -->
			<div class="tf-activity-stat-card tf-stat-res">
				<div class="tf-stat-card-header">
					<span class="tf-dot tf-dot-research"></span>
					<span class="tf-stat-card-title">Research</span>
				</div>
				<div class="tf-stat-card-val-group">
					<span class="tf-stat-card-val" id="tf-stat-res-val">00:00</span>
					<span class="tf-stat-card-unit">hrs</span>
				</div>
				<div class="tf-stat-card-pct" id="tf-stat-res-pct">0% of total</div>
			</div>
		</div>

		<!-- Right Side: Analytics Card -->
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
