"""Telegram-style chat on a Taskflow Task, stored as Comment documents.

Each message is a Comment (comment_type "Comment") on the task. Chat extras
live in custom fields on Comment (see patches/custom_fields/add_task_chat_fields):
reply link, edit time and a JSON reactions map. Attachments are private File
documents attached to the message's Comment and are downloaded through
`download_attachment`, which checks access to the task first.
"""

from __future__ import annotations

import html as html_lib
import json

import frappe
from frappe import _
from frappe.utils import get_datetime, now_datetime, strip_html
from frappe.utils.html_utils import sanitize_html

TASK_DOCTYPE = "Taskflow Task"
ALLOWED_REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "🙏", "🔥", "✅", "👎", "🎉"]
MAX_FILE_SIZE = 25 * 1024 * 1024
MAX_FILES_PER_MESSAGE = 10
IMAGE_EXTENSIONS = {"png", "jpg", "jpeg", "gif", "webp", "svg", "bmp"}


def _require_login():
	if frappe.session.user == "Guest":
		frappe.throw(_("Please log in"), frappe.PermissionError)


def _task_doc(task_id: str):
	if not task_id or not frappe.db.exists(TASK_DOCTYPE, task_id):
		frappe.throw(_("Task not found"), frappe.DoesNotExistError)
	doc = frappe.get_doc(TASK_DOCTYPE, task_id)
	doc.check_permission("read")
	return doc


def _message_doc(message_id: str):
	"""Comment behind a chat message, after checking the user can read its task."""
	if not message_id or not frappe.db.exists("Comment", message_id):
		frappe.throw(_("Message not found"), frappe.DoesNotExistError)
	comment = frappe.get_doc("Comment", message_id)
	if comment.reference_doctype != TASK_DOCTYPE or comment.comment_type != "Comment":
		frappe.throw(_("Not a task message"), frappe.PermissionError)
	_task_doc(comment.reference_name)
	return comment


def _is_author(comment) -> bool:
	user = frappe.session.user
	return user == "Administrator" or comment.owner == user or comment.comment_email == user


def _load_reactions(raw) -> dict[str, list[str]]:
	try:
		data = json.loads(raw) if raw else {}
	except (TypeError, ValueError):
		return {}
	return {k: [u for u in v if u] for k, v in data.items() if isinstance(v, list) and v}


def _clean_content(text: str) -> str:
	return sanitize_html((text or "").strip())


def _is_empty_html(html: str) -> bool:
	return not strip_html(html or "").strip() and "<img" not in (html or "")


def _snippet(html: str, length: int = 90) -> str:
	text = " ".join(html_lib.unescape(strip_html(html or "")).split())
	return text if len(text) <= length else text[: length - 1] + "…"


def _size_label(size: int) -> str:
	if size >= 1024 * 1024:
		return f"{round(size / (1024 * 1024), 1)} MB"
	if size >= 1024:
		return f"{round(size / 1024)} KB"
	return f"{size} B" if size else ""


def _serialize_attachment(f) -> dict:
	name = f.get("file_name") or f.get("name")
	ext = name.rsplit(".", 1)[-1].lower() if "." in name else ""
	url = f"/api/method/taskflow.taskflow.api.task_chat.download_attachment?file_id={f['name']}"
	return {
		"id": f["name"],
		"name": name,
		"size": _size_label(f.get("file_size") or 0),
		"ext": ext,
		"is_image": ext in IMAGE_EXTENSIONS,
		"url": url,
	}


def _serialize_messages(comments: list[dict]) -> list[dict]:
	if not comments:
		return []

	user = frappe.session.user
	names = [c["name"] for c in comments]

	files_by_comment: dict[str, list[dict]] = {}
	for f in frappe.get_all(
		"File",
		filters={"attached_to_doctype": "Comment", "attached_to_name": ["in", names]},
		fields=["name", "file_name", "file_size", "attached_to_name"],
		order_by="creation asc",
	):
		files_by_comment.setdefault(f["attached_to_name"], []).append(_serialize_attachment(f))

	# Replies can point at messages outside this page; fetch those parents too.
	by_name = {c["name"]: c for c in comments}
	missing = list({c["taskflow_reply_to"] for c in comments if c.get("taskflow_reply_to")} - set(by_name))
	parents = dict(by_name)
	if missing:
		for p in frappe.get_all(
			"Comment",
			filters={"name": ["in", missing]},
			fields=["name", "comment_email", "owner", "content"],
		):
			parents[p["name"]] = p

	emails = set()
	for c in list(comments) + list(parents.values()):
		emails.add(c.get("comment_email") or c.get("owner"))
	for c in comments:
		for users in _load_reactions(c.get("taskflow_reactions")).values():
			emails.update(users)
	emails.discard(None)
	user_map = {
		u["name"]: u
		for u in frappe.get_all(
			"User",
			filters={"name": ["in", list(emails)]},
			fields=["name", "full_name", "user_image"],
		)
	} if emails else {}

	def display_name(email):
		return (user_map.get(email) or {}).get("full_name") or email

	out = []
	for c in comments:
		author = c.get("comment_email") or c.get("owner")
		reply = None
		if c.get("taskflow_reply_to"):
			parent = parents.get(c["taskflow_reply_to"])
			if parent:
				parent_author = parent.get("comment_email") or parent.get("owner")
				reply = {
					"id": parent["name"],
					"author": display_name(parent_author),
					"snippet": _snippet(parent.get("content")) or _("Attachment"),
					"deleted": False,
				}
			else:
				reply = {"id": c["taskflow_reply_to"], "author": "", "snippet": _("Message deleted"), "deleted": True}

		reactions = [
			{
				"emoji": emoji,
				"count": len(users),
				"mine": user in users,
				"users": [display_name(u) for u in users],
			}
			for emoji, users in _load_reactions(c.get("taskflow_reactions")).items()
		]

		is_mine = author == user or c.get("owner") == user
		out.append({
			"id": c["name"],
			"content": c.get("content") or "",
			"author": display_name(author),
			"author_email": author,
			"author_image": (user_map.get(author) or {}).get("user_image"),
			"creation": str(c["creation"]),
			"edited_at": str(c["taskflow_edited_at"]) if c.get("taskflow_edited_at") else None,
			"reply_to": reply,
			"reactions": reactions,
			"attachments": files_by_comment.get(c["name"], []),
			"is_mine": is_mine,
			"can_edit": is_mine or user == "Administrator",
			"can_delete": is_mine or user == "Administrator",
		})
	return out


def _fetch(filters: dict) -> list[dict]:
	return frappe.get_all(
		"Comment",
		filters=filters,
		fields=[
			"name", "comment_email", "owner", "content", "creation",
			"taskflow_reply_to", "taskflow_edited_at", "taskflow_reactions",
		],
		order_by="creation asc",
		limit_page_length=0,
	)


@frappe.whitelist(methods=["GET", "POST"])
def get_messages(task_id: str) -> list[dict]:
	_require_login()
	_task_doc(task_id)
	return _serialize_messages(_fetch({
		"reference_doctype": TASK_DOCTYPE,
		"reference_name": task_id,
		"comment_type": "Comment",
	}))


@frappe.whitelist(methods=["POST"])
def send_message(task_id: str, content: str = "", reply_to: str = "") -> dict:
	"""Post a message. Files come as multipart fields named `files`."""
	_require_login()
	task = _task_doc(task_id)

	uploads = frappe.request.files.getlist("files") if getattr(frappe, "request", None) and frappe.request.files else []
	if len(uploads) > MAX_FILES_PER_MESSAGE:
		frappe.throw(_("You can attach up to {0} files per message").format(MAX_FILES_PER_MESSAGE))

	files = []
	for up in uploads:
		data = up.stream.read()
		if len(data) > MAX_FILE_SIZE:
			frappe.throw(_("{0} is larger than 25 MB").format(up.filename))
		files.append((up.filename, data))

	html = _clean_content(content)
	if _is_empty_html(html) and not files:
		frappe.throw(_("Message cannot be empty"))

	if reply_to:
		parent = frappe.db.get_value("Comment", reply_to, ["reference_doctype", "reference_name"], as_dict=True)
		if not parent or parent.reference_doctype != TASK_DOCTYPE or parent.reference_name != task.name:
			frappe.throw(_("You can only reply to a message of this task"))

	# add_comment keeps Frappe's own behaviour (mention notifications, _comments cache).
	comment = task.add_comment("Comment", html if not _is_empty_html(html) else "")
	if reply_to:
		comment.db_set("taskflow_reply_to", reply_to, update_modified=False)

	for filename, data in files:
		frappe.get_doc({
			"doctype": "File",
			"file_name": filename,
			"attached_to_doctype": "Comment",
			"attached_to_name": comment.name,
			"is_private": 1,
			"content": data,
		}).save(ignore_permissions=True)

	return _serialize_messages(_fetch({"name": comment.name}))[0]


@frappe.whitelist(methods=["POST"])
def edit_message(message_id: str, content: str) -> dict:
	_require_login()
	comment = _message_doc(message_id)
	if not _is_author(comment):
		frappe.throw(_("You can only edit your own messages"), frappe.PermissionError)

	html = _clean_content(content)
	has_files = frappe.db.exists("File", {"attached_to_doctype": "Comment", "attached_to_name": comment.name})
	if _is_empty_html(html) and not has_files:
		frappe.throw(_("Message cannot be empty"))

	comment.content = html
	comment.taskflow_edited_at = now_datetime()
	comment.save(ignore_permissions=True)
	return _serialize_messages(_fetch({"name": comment.name}))[0]


@frappe.whitelist(methods=["POST"])
def delete_message(message_id: str) -> dict:
	_require_login()
	comment = _message_doc(message_id)
	if not _is_author(comment):
		frappe.throw(_("You can only delete your own messages"), frappe.PermissionError)

	for file_name in frappe.get_all(
		"File",
		filters={"attached_to_doctype": "Comment", "attached_to_name": comment.name},
		pluck="name",
	):
		frappe.delete_doc("File", file_name, ignore_permissions=True)
	frappe.delete_doc("Comment", comment.name, ignore_permissions=True)
	return {"success": True, "id": message_id}


@frappe.whitelist(methods=["POST"])
def toggle_reaction(message_id: str, emoji: str) -> dict:
	"""Add the user's reaction, or remove it if already there. One row lock per toggle."""
	_require_login()
	if emoji not in ALLOWED_REACTIONS:
		frappe.throw(_("Unsupported reaction"))
	comment = _message_doc(message_id)
	user = frappe.session.user

	raw = frappe.db.get_value("Comment", comment.name, "taskflow_reactions", for_update=True)
	reactions = _load_reactions(raw)
	users = reactions.get(emoji, [])
	if user in users:
		users.remove(user)
	else:
		users.append(user)
	if users:
		reactions[emoji] = users
	else:
		reactions.pop(emoji, None)

	frappe.db.set_value(
		"Comment", comment.name, "taskflow_reactions",
		json.dumps(reactions, ensure_ascii=False) if reactions else None,
		update_modified=False,
	)
	return _serialize_messages(_fetch({"name": comment.name}))[0]


@frappe.whitelist(methods=["GET"])
def download_attachment(file_id: str):
	_require_login()
	f = frappe.get_doc("File", file_id)
	if f.attached_to_doctype != "Comment":
		frappe.throw(_("Not a chat attachment"), frappe.PermissionError)
	_message_doc(f.attached_to_name)

	frappe.local.response.filename = f.file_name
	frappe.local.response.filecontent = f.get_content()
	frappe.local.response.type = "download"
