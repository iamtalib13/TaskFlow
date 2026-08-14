# Copyright (c) 2026, Talib Sheikh and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document
from frappe.utils import today, getdate


class TaskflowTimesheet(Document):
	def before_insert(self):
		if not self.user:
			self.user = frappe.session.user

	def validate(self):
		for item in self.get("table_pfiw", []):
			if item.from_time and item.to_time and not item.hrs:
				item.calculate_hours()

	def autoname(self):
		user = frappe.get_cached_value("User", self.user, "full_name") or self.user
		date_str = getdate().strftime("%d-%m-%Y")
		self.name = f"{user}-{date_str}"
