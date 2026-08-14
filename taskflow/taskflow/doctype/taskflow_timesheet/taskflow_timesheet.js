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
});
