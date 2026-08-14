# Copyright (c) 2026, Talib Sheikh and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document


class TaskflowTimesheet(Document):
	def before_insert(self):
		if not self.user:
			self.user = frappe.session.user
