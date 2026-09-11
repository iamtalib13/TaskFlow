from __future__ import annotations

from collections import defaultdict
import frappe

MANAGER_TEAM_ROLES = {"Team Lead", "Project Manager", "Coordinator"}
MANAGER_ACCESS_LEVELS = {"Manage", "Admin"}
GLOBAL_ACCESS_ROLES = {"System Manager", "Taskflow Admin"}
MANAGER_SYSTEM_ROLES = {"Projects Manager"}
VIEW_ONLY_TEAM_ROLES = {"Viewer", "Auditor"}
OPERATE_ACCESS_LEVELS = {"Operate", "Manage", "Admin"}


def _has_global_access(user: str) -> bool:
	if not user or user == "Guest":
		return False
	return bool({"System Manager", "Taskflow Admin"} & set(frappe.get_roles(user)))


def get_user_team_memberships(user: str) -> list[dict]:
	if not user or user == "Guest":
		return []

	user_emp = frappe.db.get_value("Employee", {"user_id": user}, "name")
	filters = {"parenttype": "Taskflow Team", "is_active": 1}
	if user_emp:
		filters["$or"] = [{"user": user}, {"employee": user_emp}]
	else:
		filters["user"] = user

	return frappe.get_all(
		"Taskflow Team Member",
		filters=filters,
		fields=["parent as team", "user", "employee", "read", "write", "team_role", "access_level"],
	)


def get_descendant_teams(team_names: list[str]) -> set[str]:
	if not team_names:
		return set()

	rows = frappe.get_all(
		"Taskflow Team",
		filters={"is_active": 1},
		fields=["name", "parent_team"],
		limit_page_length=0,
	)
	children_by_parent = defaultdict(list)
	for row in rows:
		if row.parent_team:
			children_by_parent[row.parent_team].append(row.name)

	visible = set(team_names)
	queue = list(team_names)
	while queue:
		current = queue.pop(0)
		for child in children_by_parent.get(current, []):
			if child not in visible:
				visible.add(child)
				queue.append(child)

	return visible


def get_accessible_teams(user: str) -> set[str]:
	if _has_global_access(user):
		return set(
			frappe.get_all(
				"Taskflow Team",
				filters={"is_active": 1},
				pluck="name",
			)
		)

	memberships = get_user_team_memberships(user)
	direct_teams = {
		row.team
		for row in memberships
		if getattr(row, "read", 1) in (1, True, "1", None) or getattr(row, "write", 1) in (1, True, "1", None)
	}

	user_emp = frappe.db.get_value("Employee", {"user_id": user}, "name")
	if user_emp:
		lead_teams = frappe.get_all(
			"Taskflow Team",
			filters={"team_lead": user_emp, "is_active": 1},
			pluck="name",
		)
		direct_teams.update(lead_teams)

	return direct_teams


def get_direct_teams(user: str) -> set[str]:
	return {row.team for row in get_user_team_memberships(user)}


def get_team_membership_map(user: str) -> dict[str, dict]:
	return {row.team: row for row in get_user_team_memberships(user)}


def can_write_team(user: str, team: str | None) -> bool:
	if not user or user == "Guest" or not team:
		return False

	if _has_global_access(user):
		return True

	user_emp = frappe.db.get_value("Employee", {"user_id": user}, "name")
	if user_emp and frappe.db.get_value("Taskflow Team", team, "team_lead") == user_emp:
		return True

	memberships = get_user_team_memberships(user)
	for m in memberships:
		if m.team == team:
			if getattr(m, "write", 1) in (1, True, "1"):
				return True

	return False


def is_team_member(user: str, team: str | None) -> bool:
	return bool(team and team in get_accessible_teams(user))


def can_view_team(user: str, team: str | None) -> bool:
	if _has_global_access(user):
		return bool(team)

	return bool(team and team in get_accessible_teams(user))


def can_operate_team(user: str, team: str | None) -> bool:
	return can_write_team(user, team)


def can_manage_team(user: str, team: str | None = None) -> bool:
	return can_write_team(user, team)


def build_name_filter_condition(doctype: str, fieldname: str, names: set[str]) -> str:
	if not names:
		return "1=0"

	escaped = ", ".join(frappe.db.escape(name) for name in sorted(names))
	return f"`tab{doctype}`.`{fieldname}` in ({escaped})"
