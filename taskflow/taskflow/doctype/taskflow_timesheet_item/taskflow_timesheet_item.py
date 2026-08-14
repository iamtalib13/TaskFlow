# Copyright (c) 2026, Talib Sheikh and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document
from frappe.utils import time_diff_in_hours


class TaskflowTimesheetItem(Document):
	def validate(self):
		self.calculate_hours()

	def calculate_hours(self):
		if self.from_time and self.to_time:
			self.hrs = time_diff_in_hours(self.to_time, self.from_time)
