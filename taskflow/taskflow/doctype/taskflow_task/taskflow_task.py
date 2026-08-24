from __future__ import annotations

import json

import frappe
from frappe.model.document import Document
from frappe import _

from taskflow.taskflow.service.team_hierarchy import can_manage_team, can_operate_team


class TaskflowTask(Document):
	def validate(self):
		self._sync_project_and_team_context()
		self._validate_dates()
		self._validate_progress_rules()
		self._validate_user_access_rules()

	def before_save(self):
		self._sync_temp_emp_assignments()
		if not self.start_date:
			self.start_date = frappe.utils.today()
		if not self.due_date:
			self.due_date = frappe.utils.today()

	def _sync_project_and_team_context(self):
		if self.project and not self.team:
			self.team = frappe.db.get_value("Taskflow Project", self.project, "team")

	def _sync_temp_emp_assignments(self):
		if not self.temp_emp:
			return

		employee_ids = self._parse_employee_ids(self.temp_emp)
		if not employee_ids:
			return

		user_ids = []
		for employee_id in employee_ids:
			user_id = frappe.db.get_value("Employee", employee_id, "user_id")
			if user_id and user_id not in user_ids:
				user_ids.append(user_id)

		self._assign = json.dumps(user_ids)

	def _parse_employee_ids(self, value):
		if not value:
			return []

		if isinstance(value, (list, tuple)):
			raw_values = value
		else:
			try:
				parsed_value = frappe.parse_json(value)
				if isinstance(parsed_value, (list, tuple)):
					raw_values = parsed_value
				else:
					raw_values = [parsed_value]
			except Exception:
				raw_values = [
					part.strip()
					for part in str(value).replace("\n", ",").replace(";", ",").split(",")
				]

		employee_ids = []
		for employee_id in raw_values:
			employee_id = str(employee_id).strip()
			if employee_id and employee_id not in employee_ids:
				employee_ids.append(employee_id)
		return employee_ids

	def _validate_dates(self):
		pass
		# if self.start_date and self.due_date and self.start_date > self.due_date:
		# 	frappe.throw("Due Date cannot be before Start Date.")

		# if self.start_date and self.estimated_completion_date and self.start_date > self.estimated_completion_date:
		# 	frappe.throw("Estimated Completion Date cannot be before Start Date.")

		# if self.completed_on and self.start_date and self.completed_on < self.start_date:
		# 	frappe.throw("Completed On cannot be before Start Date.")

	def _validate_progress_rules(self):
		if self.progress_percent is None:
			self.progress_percent = 0

		# Reset progress when status moves away from Completed
		if self.status not in ("Completed", "Cancelled") and self.progress_percent == 100:
			self.progress_percent = 0

		# A set completion date implies the task is completed.
		if self.completed_on and self.status not in ("Completed", "Cancelled"):
			self.status = "Completed"

		if self.status == "Completed":
			self.progress_percent = 100
			if not self.completed_on:
				self.completed_on = frappe.utils.now_datetime()

			# Checklist validation
			for item in self.checklist:
				if not item.is_completed:
					frappe.throw(_("Cannot complete task while checklist items are pending."))

	def _validate_user_access_rules(self):
		if frappe.flags.in_install or frappe.flags.in_migrate:
			return

		user = frappe.session.user
		if user == "Administrator":
			return

		if not self.team:
			frappe.throw(_("Team is required to create or update a task."))

		if not (can_manage_team(user, self.team) or can_operate_team(user, self.team)):
			from taskflow.permissions import is_project_member

			if not is_project_member(user, self.project):
				frappe.throw(_("You can only create or update tasks for teams you belong to."))


