# Copyright (c) 2026, Talib Sheikh and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document
from frappe.utils import today, getdate, flt


class TaskflowTimesheet(Document):
	def before_insert(self):
		if not self.user:
			self.user = frappe.session.user

	def validate(self):
		self.calculate_total_hours()
		for item in self.get("table_pfiw", []):
			if item.from_time and item.to_time and not item.hrs:
				item.calculate_hours()

	def calculate_total_hours(self):
		total = 0
		for item in self.get("table_pfiw", []):
			total += flt(item.hrs)
		self.total_working_hours = total

	def autoname(self):
		user = frappe.get_cached_value("User", self.user, "full_name") or self.user
		date_str = getdate().strftime("%d-%m-%Y")
		self.name = f"{user}-{date_str}"


@frappe.whitelist()
def send_timesheet_email(timesheet_name, to_emails, cc_emails=None, subject=None, custom_message=None):
	if not frappe.has_permission("Taskflow Timesheet", "read", timesheet_name):
		frappe.throw(frappe._("Not permitted"))

	doc = frappe.get_doc("Taskflow Timesheet", timesheet_name)

	to_list = [e.strip() for e in (to_emails or "").split(",") if e.strip()]
	cc_list = [e.strip() for e in (cc_emails or "").split(",") if e.strip()] if cc_emails else []

	if not to_list:
		frappe.throw(frappe._("Please provide at least one recipient email address in 'To'."))

	if not subject:
		subject = f"Timesheet Summary - {doc.timesheet_date or today()} - {doc.employee_name or doc.user}"

	rows_html = ""
	for idx, item in enumerate(doc.get("table_pfiw", []), 1):
		act = item.activity_type or "Task"
		hrs = flt(item.hrs)

		proj_title = ""
		task_title = ""
		if act == "Task":
			if item.project:
				proj_title = frappe.db.get_value("Taskflow Project", item.project, "project_name") or item.project
			if item.task:
				task_title = frappe.db.get_value("Taskflow Task", item.task, "task_title") or item.task

		from_str = str(item.from_time).split(" ")[-1][:5] if item.from_time else "-"
		to_str = str(item.to_time).split(" ")[-1][:5] if item.to_time else "-"
		dur_h = int(hrs)
		dur_m = int(round((hrs - dur_h) * 60))
		dur_str = f"{dur_h:02d}:{dur_m:02d}"

		rows_html += f"""
		<tr style="border-bottom: 1px solid #e2e8f0;">
			<td style="padding: 8px; text-align: center; color: #64748b;">{idx}</td>
			<td style="padding: 8px; font-weight: 600; color: #1e293b;">{act}</td>
			<td style="padding: 8px; color: #334155;">{frappe.utils.escape_html(proj_title or '-')}</td>
			<td style="padding: 8px; color: #334155;">{frappe.utils.escape_html(task_title or '-')}</td>
			<td style="padding: 8px; text-align: center; color: #1e293b; font-family: monospace;">{from_str}</td>
			<td style="padding: 8px; text-align: center; color: #1e293b; font-family: monospace;">{to_str}</td>
			<td style="padding: 8px; text-align: center; font-weight: 700; color: #1e293b; font-family: monospace;">{dur_str}</td>
			<td style="padding: 8px; color: #475569;">{frappe.utils.escape_html(item.description or '-')}</td>
		</tr>
		"""

	tot_h = int(flt(doc.total_working_hours))
	tot_m = int(round((flt(doc.total_working_hours) - tot_h) * 60))
	tot_str = f"{tot_h:02d}:{tot_m:02d}"

	message_html = ""
	if custom_message:
		message_html = f"""
		<div style="background: #f8fafc; border-left: 4px solid #2563eb; padding: 12px 16px; margin-bottom: 20px; border-radius: 4px; color: #334155; font-size: 14px;">
			{frappe.utils.escape_html(custom_message)}
		</div>
		"""

	email_content = f"""
	<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1e293b; max-width: 700px; margin: 0 auto; padding: 20px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px;">
		<div style="border-bottom: 2px solid #2563eb; padding-bottom: 12px; margin-bottom: 20px;">
			<h2 style="margin: 0; color: #1e293b; font-size: 20px;">Timesheet Summary</h2>
			<span style="background: #eff6ff; color: #2563eb; font-weight: 700; padding: 2px 10px; border-radius: 12px; font-size: 12px; display: inline-block; margin-top: 4px;">{doc.status or 'Draft'}</span>
		</div>

		{message_html}

		<table style="width: 100%; margin-bottom: 20px; border-collapse: collapse; font-size: 13px;">
			<tr>
				<td style="padding: 6px 0; color: #64748b; font-weight: 600;">Employee:</td>
				<td style="padding: 6px 0; color: #1e293b; font-weight: 700;">{frappe.utils.escape_html(doc.employee_name or doc.user)}</td>
				<td style="padding: 6px 0; color: #64748b; font-weight: 600;">Date:</td>
				<td style="padding: 6px 0; color: #1e293b; font-weight: 700;">{doc.timesheet_date or '-'}</td>
			</tr>
			<tr>
				<td style="padding: 6px 0; color: #64748b; font-weight: 600;">Total Working Hours:</td>
				<td style="padding: 6px 0; color: #2563eb; font-weight: 800; font-size: 16px;">{tot_str} hrs</td>
				<td style="padding: 6px 0; color: #64748b; font-weight: 600;">Timesheet ID:</td>
				<td style="padding: 6px 0; color: #475569;">{doc.name}</td>
			</tr>
		</table>

		<h3 style="font-size: 14px; color: #475569; margin-bottom: 10px; text-transform: uppercase; letter-spacing: 0.5px;">Time Entries</h3>
		<table style="width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 24px;">
			<thead>
				<tr style="background: #f8fafc; color: #64748b; border-bottom: 2px solid #cbd5e1; text-align: left;">
					<th style="padding: 8px; text-align: center;">#</th>
					<th style="padding: 8px;">Activity</th>
					<th style="padding: 8px;">Project</th>
					<th style="padding: 8px;">Task</th>
					<th style="padding: 8px; text-align: center;">From</th>
					<th style="padding: 8px; text-align: center;">To</th>
					<th style="padding: 8px; text-align: center;">Duration</th>
					<th style="padding: 8px;">Notes</th>
				</tr>
			</thead>
			<tbody>
				{rows_html}
			</tbody>
		</table>

		<div style="border-top: 1px solid #e2e8f0; padding-top: 12px; font-size: 11px; color: #94a3b8; text-align: center;">
			Sent via TaskFlow Application
		</div>
	</div>
	"""

	frappe.sendmail(
		recipients=to_list,
		cc=cc_list,
		subject=subject,
		message=email_content,
		reference_doctype="Taskflow Timesheet",
		reference_name=doc.name,
		now=True,
	)

	return {"message": "Email sent successfully!"}
