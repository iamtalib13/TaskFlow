# Copyright (c) 2026, Talib Sheikh and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document
from frappe.utils import get_datetime, time_diff_in_seconds


class TaskflowTimesheetItem(Document):
	def validate(self):
		frappe.logger().debug(f"TaskflowTimesheetItem validate: from_time={self.from_time}, to_time={self.to_time}")
		self.calculate_hours()
		frappe.logger().debug(f"TaskflowTimesheetItem calculated hrs={self.hrs}")

	def calculate_hours(self):
		if self.from_time and self.to_time:
			from_dt = get_datetime(self.from_time)
			to_dt = get_datetime(self.to_time)
			self.hrs = time_diff_in_seconds(to_dt, from_dt) / 3600
			frappe.logger().debug(f"Calculated hours: {self.hrs}")
