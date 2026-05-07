from __future__ import annotations

import frappe
from frappe import _
from frappe.model.document import Document


class TaskflowProject(Document):
	def validate(self):
		self._sync_project_lead_user()
		self._validate_dates()
		self._validate_parent_project()

	def _sync_project_lead_user(self):
		if self.project_lead:
			self.project_lead_user = frappe.db.get_value("Employee", self.project_lead, "user_id")
		else:
			self.project_lead_user = None

	def _validate_dates(self):
		if self.start_date and self.end_date and self.start_date > self.end_date:
			frappe.throw("End Date cannot be before Start Date.")

	def _validate_parent_project(self):
		if not self.parent_project:
			return

		if self.parent_project == self.name:
			frappe.throw("Parent Project cannot be the same as the current project.")


def get_timeline_data(doctype: str, name: str) -> dict[int, int]:
	"""Return project activity heatmap data based on linked task updates."""
	rows = frappe.db.sql(
		"""
		select unix_timestamp(date(modified)) as activity_date, count(*) as activity_count
		from `tabTaskflow Task`
		where project = %s
			and modified >= date_sub(curdate(), interval 1 year)
		group by date(modified)
		order by date(modified)
		""",
		(name,),
		as_dict=True,
	)

	return {row.activity_date: row.activity_count for row in rows if row.activity_date}
