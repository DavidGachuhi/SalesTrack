const userRole = localStorage.getItem("userRole");
if (!userRole) window.location.href = "index.html";
if (userRole !== "admin") {
  alert("Access restricted to administrators.");
  window.location.href = "dashboard.html";
}

async function loadUsers() {
  const tbody = document.getElementById("usersTableBody");
  tbody.innerHTML = `<tr><td colspan="4" class="text-muted text-center py-3">Loading users...</td></tr>`;

  const { data, error } = await supabaseClient.from("users").select("*").order("full_name");
  if (error) { console.log(error); tbody.innerHTML = `<tr><td colspan="4" class="text-muted text-center py-3">Failed to load users.</td></tr>`; return; }

  if (data.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" class="text-muted text-center py-3">No users yet.</td></tr>`;
    return;
  }

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
  const list = document.getElementById("auditLogList");
  list.innerHTML = `<div class="text-muted small">Loading activity...</div>`;

  const { data, error } = await supabaseClient
    .from("audit_logs")
    .select("*, users!audit_logs_actor_id_fkey(full_name)")
    .order("created_at", { ascending: false })
    .limit(15);

  if (error) { console.log(error); list.innerHTML = `<div class="text-muted small">Failed to load activity.</div>`; return; }

  if (data.length === 0) {
    list.innerHTML = `<div class="text-muted small">No activity yet.</div>`;
    return;
  }

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

    const { data, error } = await supabaseClient.from("users").update({ role: newRole }).eq("id", userId).select();
    if (error) { console.log(error); alert("Failed to update role."); return; }
    if (!data || data.length === 0) { alert("You don't have permission to change this user's role."); loadUsers(); return; }
    loadUsers();
  }
});

document.addEventListener("click", async (e) => {
  if (e.target.classList.contains("toggle-active-btn")) {
    const userId = e.target.getAttribute("data-user-id");
    const current = e.target.getAttribute("data-current") === "true";

    const { data, error } = await supabaseClient.from("users").update({ is_active: !current }).eq("id", userId).select();
    if (error) { console.log(error); alert("Failed to update status."); return; }
    if (!data || data.length === 0) { alert("You don't have permission to change this user's status."); loadUsers(); return; }
    loadUsers();
    return;
  }

  if (e.target.classList.contains("delete-lookup-btn")) {
    if (!confirm("Delete this lookup value?")) return;
    const { error } = await supabaseClient.from("system_lookups").delete().eq("id", e.target.getAttribute("data-lookup-id"));
    if (error) { console.log(error); alert("Failed to delete lookup value."); return; }
    loadLookups();
  }
});

async function loadLookups() {
  const tbody = document.getElementById("lookupsTableBody");
  tbody.innerHTML = `<tr><td colspan="3" class="text-muted text-center py-3">Loading...</td></tr>`;

  const { data, error } = await supabaseClient.from("system_lookups").select("*");
  if (error) { console.log(error); tbody.innerHTML = `<tr><td colspan="3" class="text-muted text-center py-3">Failed to load lookups.</td></tr>`; return; }

  if (data.length === 0) {
    tbody.innerHTML = `<tr><td colspan="3" class="text-muted text-center py-3">No lookup values yet.</td></tr>`;
    return;
  }

  data.sort((a, b) => a.category.localeCompare(b.category) || a.value.localeCompare(b.value));

  tbody.innerHTML = "";
  data.forEach(l => {
    tbody.innerHTML += `<tr><td>${l.category}</td><td>${l.value}</td>
      <td><button class="btn btn-sm btn-outline-danger delete-lookup-btn" data-lookup-id="${l.id}">Delete</button></td></tr>`;
  });
}

document.getElementById("addLookupForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const { error } = await supabaseClient.from("system_lookups").insert({
    category: document.getElementById("lookupCategory").value,
    value: document.getElementById("lookupValue").value
  });
  if (error) { console.log(error); alert("Failed to add lookup value."); return; }
  document.getElementById("addLookupForm").reset();
  loadLookups();
});

document.getElementById("logoutBtn").addEventListener("click", async () => {
  await supabaseClient.auth.signOut();
  localStorage.clear();
  window.location.href = "index.html";
});

document.getElementById("createUserForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const { data, error } = await supabaseClient.functions.invoke("create-user", {
    body: {
      full_name: document.getElementById("newUserName").value,
      email: document.getElementById("newUserEmail").value,
      password: document.getElementById("newUserPassword").value,
      role: document.getElementById("newUserRole").value
    }
  });
  if (error) { console.log(error); alert("Failed to create user."); return; }
  document.getElementById("createUserForm").reset();
  alert("User created.");
  loadUsers();
});

document.getElementById("generateReportBtn").addEventListener("click", async () => {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  const roles = ["admin", "manager", "agent"];
  const userCounts = {};
  for (const r of roles) {
    const { count } = await supabaseClient.from("users").select("*", { count: "exact", head: true }).eq("role", r);
    userCounts[r] = count ?? 0;
  }

  const stages = ["New Lead", "Contacted", "Qualified", "Proposal Sent", "Negotiation", "Closed Won", "Closed Lost"];
  const stageCounts = {};
  for (const s of stages) {
    const { count } = await supabaseClient.from("leads").select("*", { count: "exact", head: true }).eq("is_deleted", false).eq("stage", s);
    stageCounts[s] = count ?? 0;
  }

  const { count: activityCount } = await supabaseClient.from("activities").select("*", { count: "exact", head: true });
  const { count: scorecardCount } = await supabaseClient.from("scorecards").select("*", { count: "exact", head: true });

  let y = 15;
  doc.setFontSize(16); doc.text("SalesTrack — System Report", 14, y); y += 10;
  doc.setFontSize(10); doc.text(`Generated: ${new Date().toLocaleString()}`, 14, y); y += 10;

  doc.setFontSize(12); doc.text("Users by role", 14, y); y += 7;
  doc.setFontSize(10);
  roles.forEach(r => { doc.text(`${r}: ${userCounts[r]}`, 18, y); y += 6; });

  y += 4;
  doc.setFontSize(12); doc.text("Active leads by stage", 14, y); y += 7;
  doc.setFontSize(10);
  stages.forEach(s => { doc.text(`${s}: ${stageCounts[s]}`, 18, y); y += 6; });

  y += 4;
  doc.setFontSize(12); doc.text("Totals", 14, y); y += 7;
  doc.setFontSize(10);
  doc.text(`Activities logged: ${activityCount ?? 0}`, 18, y); y += 6;
  doc.text(`Scorecards submitted: ${scorecardCount ?? 0}`, 18, y);

  doc.save("salestrack-report.pdf");
});

loadUsers();
loadAuditLog();
loadLookups();