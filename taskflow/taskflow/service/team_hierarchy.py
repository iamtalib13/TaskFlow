from __future__ import annotations

from collections import defaultdict

import frappe


MANAGER_TEAM_ROLES = {"Team Lead", "Project Manager", "Coordinator"}
MANAGER_ACCESS_LEVELS = {"Manage", "Admin"}
MANAGER_SYSTEM_ROLES = {"System Manager", "Taskflow Admin", "Project Manager", "Projects Manager"}
VIEW_ONLY_TEAM_ROLES = {"Viewer", "Auditor"}
OPERATE_ACCESS_LEVELS = {"Operate", "Manage", "Admin"}


def get_user_team_memberships(user: str) -> list[dict]:
	if not user or user == "Guest":
		return []

	return frappe.get_all(
		"Taskflow Team Member",
		filters={"user": user, "is_active": 1},
		fields=["parent as team", "team_role", "access_level"],
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
	memberships = get_user_team_memberships(user)
	direct_teams = {row.team for row in memberships}
	managed_teams = {
		row.team
		for row in memberships
		if row.team_role in MANAGER_TEAM_ROLES or row.access_level in MANAGER_ACCESS_LEVELS
	}

	accessible = set(direct_teams)
	accessible.update(get_descendant_teams(list(managed_teams)))

	global_teams = frappe.get_all(
		"Taskflow Team",
		filters={"visibility_scope": "Global", "is_active": 1},
		pluck="name",
	)
	accessible.update(global_teams)
	return accessible


def get_direct_teams(user: str) -> set[str]:
	return {row.team for row in get_user_team_memberships(user)}


def get_team_membership_map(user: str) -> dict[str, dict]:
	return {row.team: row for row in get_user_team_memberships(user)}


def get_managed_teams(user: str) -> set[str]:
	if not user or user == "Guest":
		return set()

	if MANAGER_SYSTEM_ROLES & set(frappe.get_roles(user)):
		return set(
			frappe.get_all(
				"Taskflow Team",
				filters={"is_active": 1},
				pluck="name",
			)
		)

	return {
		row.team
		for row in get_user_team_memberships(user)
		if row.team_role in MANAGER_TEAM_ROLES or row.access_level in MANAGER_ACCESS_LEVELS
	}


def is_team_member(user: str, team: str | None) -> bool:
	return bool(team and team in get_direct_teams(user))


def can_view_team(user: str, team: str | None) -> bool:
	return bool(team and team in get_accessible_teams(user))


def can_operate_team(user: str, team: str | None) -> bool:
	if not user or user == "Guest" or not team:
		return False

	if can_manage_team(user, team):
		return True

	membership = get_team_membership_map(user).get(team)
	if not membership:
		return False

	if membership.team_role in VIEW_ONLY_TEAM_ROLES:
		return False

	return membership.access_level in OPERATE_ACCESS_LEVELS


def can_manage_team(user: str, team: str | None = None) -> bool:
	if not user or user == "Guest":
		return False

	if MANAGER_SYSTEM_ROLES & set(frappe.get_roles(user)):
		return True

	if not team:
		return bool(get_managed_teams(user))

	return team in get_descendant_teams(list(get_managed_teams(user)))


def build_name_filter_condition(doctype: str, fieldname: str, names: set[str]) -> str:
	if not names:
		return "1=0"

	escaped = ", ".join(frappe.db.escape(name) for name in sorted(names))
	return f"`tab{doctype}`.`{fieldname}` in ({escaped})"
