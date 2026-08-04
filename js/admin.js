const userRole = localStorage.getItem("userRole");
if (!userRole) window.location.href = "index.html";
if (userRole !== "admin") {
  alert("Access restricted to administrators.");
  window.location.href = "dashboard.html";
}

async function loadUsers() {
  const { data, error } = await supabaseClient.from("users").select("*").order("full_name");
  if (error) { console.log(error); return; }

  const tbody = document.getElementById("usersTableBody");
  tbody.innerHTML = "";

  data.forEach(u => {
    tbody.innerHTML += `
      <tr>
        <td>${u.full_name}</td>
        <td>
          <select class="form-select form-select-sm role-select" data-user-id="${u.id}" style="width:120px;">
            <option value="agent" ${u.role === "agent" ? "selected" : ""}>Agent</option>
            <option value="manager" ${u.role === "manager" ? "selected" : ""}>Manager</option>
            <option value="admin" ${u.role === "admin" ? "selected" : ""}>Admin</option>
          </select>
        </td>
        <td>${u.is_active ? '<span class="badge bg-success">Active</span>' : '<span class="badge bg-secondary">Inactive</span>'}</td>
        <td>
          <button class="btn btn-sm btn-outline-danger toggle-active-btn" data-user-id="${u.id}" data-current="${u.is_active}">
            ${u.is_active ? "Deactivate" : "Activate"}
          </button>
        </td>
      </tr>
    `;
  });
}

async function loadAuditLog() {
  const { data, error } = await supabaseClient
    .from("audit_logs")
    .select("*, users!audit_logs_actor_id_fkey(full_name)")
    .order("created_at", { ascending: false })
    .limit(15);

  if (error) { console.log(error); return; }

  const list = document.getElementById("auditLogList");
  list.innerHTML = "";
  data.forEach(log => {
    list.innerHTML += `
      <div class="card p-2 small">
        <strong>${log.users?.full_name || "Unknown"}</strong> — ${log.details}
        <div class="text-muted" style="font-size:0.75rem;">${new Date(log.created_at).toLocaleString()}</div>
      </div>
    `;
  });
}

document.addEventListener("change", async (e) => {
  if (e.target.classList.contains("role-select")) {
    const userId = e.target.getAttribute("data-user-id");
    const newRole = e.target.value;

    const { error } = await supabaseClient.from("users").update({ role: newRole }).eq("id", userId);
    if (error) { console.log(error); alert("Failed to update role."); return; }
    loadUsers();
  }
});

document.addEventListener("click", async (e) => {
  if (e.target.classList.contains("toggle-active-btn")) {
    const userId = e.target.getAttribute("data-user-id");
    const current = e.target.getAttribute("data-current") === "true";

    const { error } = await supabaseClient.from("users").update({ is_active: !current }).eq("id", userId);
    if (error) { console.log(error); alert("Failed to update status."); return; }
    loadUsers();
  }
});

document.getElementById("logoutBtn").addEventListener("click", async () => {
  await supabaseClient.auth.signOut();
  localStorage.clear();
  window.location.href = "index.html";
});

loadUsers();
loadAuditLog();