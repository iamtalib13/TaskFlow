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

	status_badge_bg = "#fffbeb" if doc.status == "Draft" else "#ecfdf5"
	status_badge_color = "#b45309" if doc.status == "Draft" else "#047857"

	# Use pre-populated or user-edited HTML content
	body_html = custom_message if custom_message else ""

	email_content = f"""
	<div style="font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, Helvetica, Arial, sans-serif; color: #201f1e; max-width: 750px; margin: 0 auto; background: #ffffff; border: 1px solid #e1dfdd; border-radius: 8px; box-shadow: 0 4px 16px rgba(0,0,0,0.06); overflow: hidden;">
		<!-- Outlook Top Header Bar -->
		<div style="background: #0078d4; padding: 18px 24px; display: flex; align-items: center; justify-content: space-between;">
			<div style="display: flex; align-items: center; gap: 10px;">
				<div style="width: 32px; height: 32px; background: rgba(255,255,255,0.2); border-radius: 6px; display: flex; align-items: center; justify-content: center; color: #ffffff; font-weight: 800; font-size: 16px;">
					TF
				</div>
				<div>
					<h2 style="margin: 0; color: #ffffff; font-size: 18px; font-weight: 600; letter-spacing: -0.2px;">TaskFlow Timesheet Report</h2>
					<span style="color: rgba(255,255,255,0.85); font-size: 12px;">Employee Work Log & Activity Breakout</span>
				</div>
			</div>
			<div style="text-align: right;">
				<span style="background: {status_badge_bg}; color: {status_badge_color}; font-weight: 700; padding: 4px 12px; border-radius: 12px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; display: inline-block;">
					{doc.status or 'Draft'}
				</span>
			</div>
		</div>

		<div style="padding: 24px;">
			{body_html}

			<!-- Outlook Email Footer -->
			<div style="border-top: 1px solid #edebe9; margin-top: 24px; padding-top: 16px; display: flex; align-items: center; justify-content: space-between; font-size: 11px; color: #a19f9d;">
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
