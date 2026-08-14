// Copyright (c) 2026, Talib Sheikh and contributors
// For license information, please see license.txt

frappe.ui.form.on("Taskflow Timesheet Item", {
	from_time(frm, cdt, cdn) {
		calculate_hours(frm, cdt, cdn);
	},
	to_time(frm, cdt, cdn) {
		calculate_hours(frm, cdt, cdn);
	},
});

function calculate_hours(frm, cdt, cdn) {
	const row = frappe.get_doc(cdt, cdn);
	if (row.from_time && row.to_time) {
		const diff = frappe.datetime.get_diff(row.to_time, row.from_time);
		const hours = diff / 3600;
		frappe.model.set_value(cdt, cdn, "hrs", hours);
	}
}
