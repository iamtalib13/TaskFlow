from __future__ import annotations

import frappe
from frappe.model.document import Document
from frappe import _

from taskflow.taskflow.service.team_hierarchy import can_manage_team, can_operate_team


class TaskflowTask(Document):
	def validate(self):
		self._sync_project_and_team_context()
		self._sync_assigned_to_user()
		self._validate_dates()
		self._validate_progress_rules()
		self._validate_user_access_rules()

	def before_save(self):
		if not self.start_date:
			self.start_date = frappe.utils.today()
		if not self.due_date:
			self.due_date = frappe.utils.today()

	def _sync_project_and_team_context(self):
		if self.project and not self.team:
			self.team = frappe.db.get_value("Taskflow Project", self.project, "team")

	def _sync_assigned_to_user(self):
		if self.assigned_to:
			self.assigned_to_user = frappe.db.get_value("Employee", self.assigned_to, "user_id")
		else:
			self.assigned_to_user = None

	def _validate_dates(self):
		if self.start_date and self.due_date and self.start_date > self.due_date:
			frappe.throw("Due Date cannot be before Start Date.")

		if self.start_date and self.estimated_completion_date and self.start_date > self.estimated_completion_date:
			frappe.throw("Estimated Completion Date cannot be before Start Date.")

		if self.completed_on and self.start_date and self.completed_on < self.start_date:
			frappe.throw("Completed On cannot be before Start Date.")

	def _validate_progress_rules(self):
		if self.progress_percent is None:
			self.progress_percent = 0

		if self.status == "Completed":
			self.progress_percent = 100
			if not self.completed_on:
				self.completed_on = frappe.utils.now_datetime()
			
			# Checklist validation
			for item in self.checklist:
				if not item.is_completed:
					frappe.throw(_("Cannot complete task while checklist items are pending."))
		elif self.progress_percent == 100 and self.status != "Completed":
			self.status = "Completed"
            # Checklist validation for auto-completion
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
			frappe.throw(_("You can only create or update tasks for teams you belong to."))

		previous_doc = self.get_doc_before_save() if not self.is_new() else None
		assigned_to_changed = self.is_new() or (
			previous_doc and previous_doc.assigned_to != self.assigned_to
		)

		if (
			assigned_to_changed
			and self.assigned_to_user
			and self.assigned_to_user != user
			and not can_manage_team(user, self.team)
		):
			frappe.throw(_("Only a team manager can assign tasks to other users."))
