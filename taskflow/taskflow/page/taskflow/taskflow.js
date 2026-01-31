frappe.pages["taskflow"].on_page_load = function (wrapper) {
	let page = frappe.ui.make_app_page({
		parent: wrapper,
		title: "Task Insights Portal",
		single_column: true,
	});

	frappe.require("/assets/taskflow/js/petite-vue.iife.js", () => {
		page.main.html(`
            <div id="taskflow-app" v-scope @vue:mounted="init()" class="container-fluid py-4" style="background-color: #ffffff; font-family: -apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
                
                <div class="row m-0">
                    <div class="col-md-3 p-0 pr-4">
                        <div class="mb-3">
                            <h6 class="font-weight-bold" style="font-size: 14px; color: #1f2328;">Projects</h6>
                            <input type="text" class="form-control form-control-sm border-secondary-subtle" style="background: #f6f8fa;" placeholder="Filter projects" v-model="searchProject">
                        </div>
                        <div class="list-group">
                            <div v-for="p in filteredProjects" 
                                @click="selectProject(p)"
                                class="py-2 px-1 border-bottom border-transparent"
                                style="cursor: pointer; font-size: 14px;"
                                :style="{color: selectedProject === p.name ? '#1f2328' : '#636c76'}">
                                <span :style="{fontWeight: selectedProject === p.name ? '600' : '400', color: selectedProject === p.name ? '#0969da' : 'inherit'}">
                                    <i class="fa fa-book mr-2" style="color: #636c76;"></i> [[ p.project_name ]]
                                </span>
                            </div>
                        </div>
                    </div>

                    <div class="col-md-9 p-0">
                        
                        <div class="d-flex border-bottom mb-4" style="gap: 25px;">
                            <div @click="activeTab = 'overview'" :style="tabStyle(activeTab === 'overview')">
                                <i class="fa fa-dashboard mr-1"></i> Overview
                            </div>
                            <div @click="activeTab = 'projects'" :style="tabStyle(activeTab === 'projects')">
                                <i class="fa fa-briefcase mr-1"></i> Project View
                            </div>
                        </div>

                        <div class="row mb-4 no-gutters" style="gap: 15px;">
                            <div class="col shadow-none border rounded p-3" v-for="stat in stats" style="border-color: #d0d7de !important;">
                                <div style="font-size: 12px; color: #636c76; margin-bottom: 4px;">[[ stat.label ]]</div>
                                <div style="font-size: 20px; font-weight: 600; color: #1f2328;">[[ stat.value ]]</div>
                            </div>
                        </div>

                        <div v-if="activeTab === 'overview'">
                            <div class="d-flex mb-3 border-bottom pb-2 align-items-center justify-content-between">
                                <div class="btn-group border rounded" style="background: #f6f8fa; padding: 2px;">
                                    <button @click="viewMode = 'member'" class="btn btn-sm shadow-none" :style="switcherStyle(viewMode === 'member')">Team Members</button>
                                    <button @click="viewMode = 'task'" class="btn btn-sm shadow-none" :style="switcherStyle(viewMode === 'task')">Task List</button>
                                </div>
                                <div style="font-size: 12px; color: #636c76;">[[ members.length ]] contributors</div>
                            </div>

                            <div class="row m-0" v-if="viewMode === 'member'">
                                <div v-for="m in members" class="col-md-6 p-1">
                                    <div class="border rounded p-3 mb-2 h-100" style="border-color: #d0d7de !important; background: white;">
                                        <div class="d-flex justify-content-between align-items-start">
                                            <div class="font-weight-bold" style="color: #0969da; font-size: 14px; cursor: pointer;">[[ m.full_name ]]</div>
                                            <span class="badge-pill border px-2 py-0 text-muted" style="font-size: 11px;">[[ m.designation ]]</span>
                                        </div>
                                        <p class="mt-2 text-muted" style="font-size: 12px;">Active in [[ selectedProject || 'Global Projects' ]]</p>
                                        <div class="d-flex mt-3" style="gap: 15px; font-size: 12px; color: #636c76;">
                                            <span><i class="fa fa-circle mr-1 text-primary"></i> Total: [[ m.total_tasks ]]</span>
                                            <span class="text-danger"><i class="fa fa-circle mr-1"></i> Pending: [[ m.pending_tasks ]]</span>
                                            <span class="text-success"><i class="fa fa-check-circle mr-1"></i> Done: [[ m.total_tasks - m.pending_tasks ]]</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div v-if="activeTab === 'projects'">
                            <div class="border rounded" style="border-color: #d0d7de !important;">
                                <div class="p-3 border-bottom bg-light">
                                    <h6 class="m-0 font-weight-bold">[[ selectedProject || 'All Projects' ]] Tally</h6>
                                </div>
                                <table class="table table-hover mb-0" style="font-size: 13px;">
                                    <thead>
                                        <tr class="text-muted">
                                            <th>Member</th>
                                            <th class="text-center">Total</th>
                                            <th class="text-center">Pending</th>
                                            <th class="text-right">Progress</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr v-for="m in members">
                                            <td class="font-weight-bold" style="color: #0969da;">[[ m.full_name ]]</td>
                                            <td class="text-center">[[ m.total_tasks ]]</td>
                                            <td class="text-center text-danger">[[ m.pending_tasks ]]</td>
                                            <td class="text-right">
                                                <div class="progress" style="height: 5px; width: 60px; display: inline-flex;">
                                                    <div class="progress-bar bg-success" :style="{width: (100 - (m.pending_tasks/m.total_tasks*100)) + '%'}"></div>
                                                </div>
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>

                    </div>
                </div>
            </div>
        `);

		PetiteVue.createApp({
			$delimiters: ["[[", "]]"],
			activeTab: "overview",
			viewMode: "member",
			selectedProject: "",
			searchProject: "",
			projects: [],
			members: [],
			stats: [
				{ label: "Total Tasks", value: 18 },
				{ label: "Pending", value: 9 },
				{ label: "Completed", value: 9 },
			],

			tabStyle(isActive) {
				return {
					paddingBottom: "8px",
					fontSize: "14px",
					fontWeight: isActive ? "600" : "400",
					color: isActive ? "#1f2328" : "#636c76",
					borderBottom: isActive ? "2px solid #fd8c73" : "2px solid transparent",
					cursor: "pointer",
				};
			},

			switcherStyle(isActive) {
				return {
					background: isActive ? "#ffffff" : "transparent",
					border: isActive ? "1px solid #d0d7de" : "none",
					fontWeight: isActive ? "600" : "400",
					fontSize: "12px",
					padding: "4px 12px",
				};
			},

			get filteredProjects() {
				return this.projects.filter((p) =>
					p.project_name.toLowerCase().includes(this.searchProject.toLowerCase()),
				);
			},

			async init() {
				await this.fetchData();
			},

			async fetchData() {
				this.projects = [
					{ name: "P01", project_name: "audit_management" },
					{ name: "P02", project_name: "sahayog" },
					{ name: "P03", project_name: "frappe_flutter" },
				];

				this.members = [
					{
						full_name: "John Doe",
						designation: "Developer",
						total_tasks: 10,
						pending_tasks: 3,
					},
					{
						full_name: "Jane Smith",
						designation: "UI/UX",
						total_tasks: 8,
						pending_tasks: 6,
					},
					{
						full_name: "Azam Khan",
						designation: "Developer",
						total_tasks: 15,
						pending_tasks: 2,
					},
				];
			},

			selectProject(project) {
				this.selectedProject = project.project_name;
				frappe.show_alert(`Selected: ${project.project_name}`, 1);
			},
		}).mount("#taskflow-app");
	});
};
