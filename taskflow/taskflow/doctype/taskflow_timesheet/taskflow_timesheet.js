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
	},
	"table_pfiw.from_time"(frm, cdt, cdn) {
		calculate_item_hours(frm, cdt, cdn);
	},
	"table_pfiw.to_time"(frm, cdt, cdn) {
		calculate_item_hours(frm, cdt, cdn);
	},
	"table_pfiw.hrs"(frm, cdt, cdn) {
		calculate_total_hours(frm);
	},
	table_pfiw_remove(frm) {
		calculate_total_hours(frm);
	},
});

function calculate_item_hours(frm, cdt, cdn) {
	const row = frappe.get_doc(cdt, cdn);
	if (row.from_time && row.to_time) {
		const diff = frappe.datetime.get_diff(row.to_time, row.from_time);
		const hours = diff / 3600;
		frappe.model.set_value(cdt, cdn, "hrs", hours);
		calculate_total_hours(frm);
	}
}

function calculate_total_hours(frm) {
	let total = 0;
	(frm.doc.table_pfiw || []).forEach(row => {
		total += flt(row.hrs);
	});
	frm.set_value("total_working_hours", total);
}

function flt(val) {
	return parseFloat(val) || 0;
}
