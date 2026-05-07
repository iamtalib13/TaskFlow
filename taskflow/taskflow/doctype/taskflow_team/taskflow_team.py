from __future__ import annotations

import frappe
from frappe.model.document import Document

from taskflow.taskflow.service.role_sync import sync_taskflow_roles_for_users


class TaskflowTeam(Document):
	def validate(self):
		self._validate_parent_team()
		self._sync_member_users()
		self._sync_team_lead_membership()

	def on_update(self):
		sync_taskflow_roles_for_users(self._get_impacted_users())

	def _validate_parent_team(self):
		if not self.parent_team:
			return

		if self.parent_team == self.name:
			frappe.throw("Parent Team cannot be the same as the current team.")

		ancestor = self.parent_team
		visited = {self.name}
		while ancestor:
			if ancestor in visited:
				frappe.throw("Parent Team creates a circular hierarchy.")
			visited.add(ancestor)
			ancestor = frappe.db.get_value("Taskflow Team", ancestor, "parent_team")

	def _sync_member_users(self):
		for member in self.team_members or []:
			if member.user or not member.employee:
				continue

			member.user = frappe.db.get_value("Employee", member.employee, "user_id")

	def _sync_team_lead_membership(self):
		if not self.team_lead:
			return

		team_lead_user = frappe.db.get_value("Employee", self.team_lead, "user_id")
		if not team_lead_user:
			return

		for member in self.team_members or []:
			if member.employee == self.team_lead:
				if not member.user:
					member.user = team_lead_user
				if not member.team_role:
					member.team_role = "Team Lead"
				if not member.access_level:
					member.access_level = "Manage"
				member.is_active = 1
				return

		self.append(
			"team_members",
			{
				"employee": self.team_lead,
				"user": team_lead_user,
				"team_role": "Team Lead",
				"access_level": "Manage",
				"is_active": 1,
			},
		)

	def _get_impacted_users(self) -> list[str]:
		users = {member.user for member in self.team_members or [] if member.user}

		previous_doc = self.get_doc_before_save()
		if previous_doc:
			users.update(member.user for member in previous_doc.team_members or [] if member.user)

		if self.team_lead:
			team_lead_user = frappe.db.get_value("Employee", self.team_lead, "user_id")
			if team_lead_user:
				users.add(team_lead_user)

		return sorted(users)
