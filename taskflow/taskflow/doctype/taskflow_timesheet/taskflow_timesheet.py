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

	# Format Date as DD/MM/YYYY
	date_str = str(doc.timesheet_date) if doc.timesheet_date else today()
	if "-" in date_str:
		parts = date_str.split("-")
		if len(parts) == 3:
			date_str = f"{parts[2]}/{parts[1]}/{parts[0]}"

	if not subject:
		subject = f"Timesheet Summary - {date_str} - {doc.employee_name or doc.user}"

	# Calculate Activity Breakdown
	breakdown = {"Task": 0.0, "Meeting": 0.0, "Research": 0.0}
	rows_html = ""

	for idx, item in enumerate(doc.get("table_pfiw", []), 1):
		act = item.activity_type or "Task"
		hrs = flt(item.hrs)
		breakdown[act] = breakdown.get(act, 0.0) + hrs

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

		# Activity Badge Colors
		act_bg = "#eff6ff"
		act_color = "#1d4ed8"
		if act == "Meeting":
			act_bg = "#f5f3ff"
			act_color = "#6d28d9"
		elif act == "Research":
			act_bg = "#ecfdf5"
			act_color = "#047857"

		rows_html += f"""
		<tr style="border-bottom: 1px solid #edebe9;">
			<td style="padding: 10px 8px; text-align: center; color: #605e5c; font-size: 12px;">{idx}</td>
			<td style="padding: 10px 8px;">
				<span style="background: {act_bg}; color: {act_color}; font-weight: 700; padding: 3px 8px; border-radius: 4px; font-size: 11px; display: inline-block;">
					{act}
				</span>
			</td>
			<td style="padding: 10px 8px; color: #201f1e; font-weight: 600;">{frappe.utils.escape_html(proj_title or '-')}</td>
			<td style="padding: 10px 8px; color: #323130;">{frappe.utils.escape_html(task_title or '-')}</td>
			<td style="padding: 10px 8px; text-align: center; color: #201f1e; font-family: 'Segoe UI Mono', monospace; font-size: 12px;">{from_str}</td>
			<td style="padding: 10px 8px; text-align: center; color: #201f1e; font-family: 'Segoe UI Mono', monospace; font-size: 12px;">{to_str}</td>
			<td style="padding: 10px 8px; text-align: center; font-weight: 700; color: #0078d4; font-family: 'Segoe UI Mono', monospace; font-size: 13px;">{dur_str}</td>
			<td style="padding: 10px 8px; color: #605e5c; font-size: 12px;">{frappe.utils.escape_html(item.description or '-')}</td>
		</tr>
		"""

	tot_hrs = flt(doc.total_working_hours)
	tot_h = int(tot_hrs)
	tot_m = int(round((tot_hrs - tot_h) * 60))
	tot_str = f"{tot_h:02d}:{tot_m:02d}"

	# Activity Totals
	task_hrs = breakdown.get("Task", 0.0)
	meet_hrs = breakdown.get("Meeting", 0.0)
	res_hrs = breakdown.get("Research", 0.0)

	def format_hrs(h):
		th = int(h)
		tm = int(round((h - th) * 60))
		return f"{th:02d}:{tm:02d}"

	message_html = ""
	if custom_message:
		message_html = f"""
		<div style="background: #f3f2f1; border-left: 4px solid #0078d4; padding: 14px 18px; margin-bottom: 24px; border-radius: 4px; color: #201f1e; font-size: 13.5px; line-height: 1.5;">
			<div style="font-weight: 700; color: #0078d4; margin-bottom: 4px; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Message from Sender:</div>
			{frappe.utils.escape_html(custom_message)}
		</div>
		"""

	status_badge_bg = "#fffbeb" if doc.status == "Draft" else "#ecfdf5"
	status_badge_color = "#b45309" if doc.status == "Draft" else "#047857"

	email_content = f"""
	<div style="font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, Helvetica, Arial, sans-serif; color: #201f1e; max-width: 750px; margin: 0 auto; background: #ffffff; border: 1px solid #e1dfdd; border-radius: 8px; box-shadow: 0 4px 16px rgba(0,0,0,0.06); overflow: hidden;">
		<!-- Outlook Top Header Bar -->
		<div style="background: #0078d4; padding: 18px 24px; display: flex; align-items: center; justify-content: space-between;">
			<div style="display: flex; align-items: center; gap: 10px;">
				<div style="width: 32px; height: 32px; background: rgba(255,255,255,0.2); border-radius: 6px; display: flex; align-items: center; justify-content: center; color: #ffffff; font-weight: 800; font-size: 16px;">
					TF
				</div>
				<div>
					<h2 style="margin: 0; color: #ffffff; font-size: 18px; font-weight: 600; letter-spacing: -0.2px;">TaskFlow Timesheet Summary</h2>
					<span style="color: rgba(255,255,255,0.85); font-size: 12px;">Daily Work & Activity Breakdown Report</span>
				</div>
			</div>
			<div style="text-align: right;">
				<span style="background: {status_badge_bg}; color: {status_badge_color}; font-weight: 700; padding: 4px 12px; border-radius: 12px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; display: inline-block;">
					{doc.status or 'Draft'}
				</span>
			</div>
		</div>

		<div style="padding: 24px;">
			{message_html}

			<!-- Timesheet Metadata Box -->
			<div style="background: #faf9f8; border: 1px solid #f3f2f1; border-radius: 6px; padding: 16px 20px; margin-bottom: 24px;">
				<table style="width: 100%; border-collapse: collapse; font-size: 13px;">
					<tr>
						<td style="padding: 6px 0; color: #605e5c; font-weight: 600; width: 15%;">Employee:</td>
						<td style="padding: 6px 0; color: #201f1e; font-weight: 700; width: 35%;">{frappe.utils.escape_html(doc.employee_name or doc.user)}</td>
						<td style="padding: 6px 0; color: #605e5c; font-weight: 600; width: 15%;">Date:</td>
						<td style="padding: 6px 0; color: #201f1e; font-weight: 700; width: 35%;">{date_str}</td>
					</tr>
					<tr>
						<td style="padding: 6px 0; color: #605e5c; font-weight: 600;">User Account:</td>
						<td style="padding: 6px 0; color: #323130;">{frappe.utils.escape_html(doc.user or '-')}</td>
						<td style="padding: 6px 0; color: #605e5c; font-weight: 600;">Total Hours:</td>
						<td style="padding: 6px 0; color: #0078d4; font-weight: 800; font-size: 17px;">{tot_str} <span style="font-size: 12px; font-weight: 600;">hrs</span></td>
					</tr>
				</table>
			</div>

			<!-- Activity Summary Cards Row -->
			<div style="display: flex; gap: 12px; margin-bottom: 24px;">
				<div style="flex: 1; background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 6px; padding: 12px 14px;">
					<div style="font-size: 11px; font-weight: 700; color: #1d4ed8; text-transform: uppercase; margin-bottom: 4px;">Task</div>
					<div style="font-size: 18px; font-weight: 800; color: #1e293b; font-family: 'Segoe UI Mono', monospace;">{format_hrs(task_hrs)} <span style="font-size: 11px; font-weight: 500; color: #64748b;">hrs</span></div>
				</div>
				<div style="flex: 1; background: #f5f3ff; border: 1px solid #ddd6fe; border-radius: 6px; padding: 12px 14px;">
					<div style="font-size: 11px; font-weight: 700; color: #6d28d9; text-transform: uppercase; margin-bottom: 4px;">Meeting</div>
					<div style="font-size: 18px; font-weight: 800; color: #1e293b; font-family: 'Segoe UI Mono', monospace;">{format_hrs(meet_hrs)} <span style="font-size: 11px; font-weight: 500; color: #64748b;">hrs</span></div>
				</div>
				<div style="flex: 1; background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 6px; padding: 12px 14px;">
					<div style="font-size: 11px; font-weight: 700; color: #047857; text-transform: uppercase; margin-bottom: 4px;">Research</div>
					<div style="font-size: 18px; font-weight: 800; color: #1e293b; font-family: 'Segoe UI Mono', monospace;">{format_hrs(res_hrs)} <span style="font-size: 11px; font-weight: 500; color: #64748b;">hrs</span></div>
				</div>
			</div>

			<!-- Time Entries Table -->
			<h3 style="font-size: 13px; font-weight: 700; color: #605e5c; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 12px;">Recorded Time Entries</h3>
			<div style="border: 1px solid #e1dfdd; border-radius: 6px; overflow: hidden; margin-bottom: 24px;">
				<table style="width: 100%; border-collapse: collapse; font-size: 12.5px; text-align: left;">
					<thead>
						<tr style="background: #f3f2f1; color: #323130; border-bottom: 2px solid #e1dfdd; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px;">
							<th style="padding: 10px 8px; text-align: center; width: 30px;">#</th>
							<th style="padding: 10px 8px; width: 90px;">Activity</th>
							<th style="padding: 10px 8px;">Project</th>
							<th style="padding: 10px 8px;">Task</th>
							<th style="padding: 10px 8px; text-align: center; width: 60px;">From</th>
							<th style="padding: 10px 8px; text-align: center; width: 60px;">To</th>
							<th style="padding: 10px 8px; text-align: center; width: 70px;">Duration</th>
							<th style="padding: 10px 8px;">Notes</th>
						</tr>
					</thead>
					<tbody>
						{rows_html}
					</tbody>
				</table>
			</div>

			<!-- Outlook Email Footer -->
			<div style="border-top: 1px solid #edebe9; padding-top: 16px; display: flex; align-items: center; justify-content: space-between; font-size: 11px; color: #a19f9d;">
				<div>Generated automatically via <strong>TaskFlow</strong> Timesheet Management</div>
				<div>{doc.name}</div>
			</div>
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
