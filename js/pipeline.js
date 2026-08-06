const userRole = localStorage.getItem("userRole");
if (!userRole) window.location.href = "index.html";

if (userRole === "admin") {
  document.getElementById("logoutBtn").insertAdjacentHTML(
    "beforebegin",
    '<a href="admin.html" class="btn btn-outline-light btn-sm navlink">Admin</a>'
  );
}

const stages = ["New Lead", "Contacted", "Qualified", "Proposal Sent", "Negotiation", "Closed Won", "Closed Lost"];

let currentUserId = null;

async function loadPipeline() {
  document.querySelectorAll(".kanban-cards").forEach(col => {
    col.innerHTML = `<div class="text-muted small">Loading...</div>`;
  });

  const { data, error } = await supabaseClient.from("leads").select("*").eq("is_deleted", false).order("created_at");
  if (error) { console.log(error); return; }

  document.querySelectorAll(".kanban-cards").forEach(col => col.innerHTML = "");

  data.forEach(lead => {
    const column = document.getElementById("col-" + lead.stage);
    if (!column) return;

    const { score, overdue } = calculateLeadMeta(lead);
    const isClosed = lead.stage === "Closed Won" || lead.stage === "Closed Lost";
    const reasonPreview = isClosed && lead.closed_reason
      ? `<div class="text-muted small mt-1">${lead.closed_reason.length > 60 ? lead.closed_reason.slice(0, 60) + "..." : lead.closed_reason}</div>`
      : "";

    column.innerHTML += `
  <div class="lead-card ${overdue ? 'overdue' : ''}" data-lead-id="${lead.id}">
    <div class="fw-bold">${lead.title}</div>
    <div class="d-flex justify-content-between mt-1">
      <span class="badge badge-accent">${score} pts</span>
      ${overdue ? '<span class="badge bg-danger">Overdue</span>' : ''}
    </div>
    ${reasonPreview}
    <button class="btn btn-sm btn-outline-light mt-2 log-activity-btn" data-lead-id="${lead.id}" data-lead-title="${lead.title}">
      Log activity
    </button>
  </div>
`;
  });

  stages.forEach(stage => {
    const column = document.getElementById("col-" + stage);
    if (column.innerHTML.trim() === "") {
      column.innerHTML = `<div class="text-muted small">No leads in this stage.</div>`;
    }
  });

  enableDragDrop();
}
const stageScores = {
  "New Lead": 0,
  "Contacted": 10,
  "Qualified": 20,
  "Proposal Sent": 30,
  "Negotiation": 40,
  "Closed Won": 50,
  "Closed Lost": 0
};

function calculateLeadMeta(lead) {
  let score = stageScores[lead.stage] ?? 0;
  let overdue = false;

  if (lead.last_contacted_at) {
    const daysSince = (Date.now() - new Date(lead.last_contacted_at)) / (1000 * 60 * 60 * 24);
    if (daysSince > 3 && lead.stage !== "Closed Won" && lead.stage !== "Closed Lost") {
      overdue = true;
      score -= 5;
    }
  } else if (lead.stage !== "New Lead" && lead.stage !== "Closed Won" && lead.stage !== "Closed Lost") {
    overdue = true;
  }

  return { score, overdue };
}

async function loadAgentsForReassign() {
  const { data, error } = await supabaseClient.from("users").select("id, full_name").eq("role", "agent").order("full_name");
  if (error) { console.log(error); return []; }
  return data;
}

async function openLeadDetail(leadId) {
  const { data: lead, error } = await supabaseClient
    .from("leads")
    .select("*, contacts(full_name, phone, email, company, is_deleted)")
    .eq("is_deleted", false)
    .eq("id", leadId)
    .single();

  if (error) { console.log(error); alert("Failed to load lead."); return; }

  const { score, overdue } = calculateLeadMeta(lead);
  const isManagerOrAdmin = userRole === "manager" || userRole === "admin";

  document.getElementById("leadDetailTitle").textContent = lead.title;
  document.getElementById("leadDetailStageBadge").textContent = lead.stage;
  document.getElementById("leadDetailOverdueBadge").classList.toggle("d-none", !overdue);
  document.getElementById("leadDetailScore").textContent = score + " pts";

  const contactEl = document.getElementById("leadDetailContact");
  if (lead.contacts && !lead.contacts.is_deleted) {
    contactEl.innerHTML = `${lead.contacts.full_name}<br><span class="text-muted small">${lead.contacts.phone || ""} ${lead.contacts.email || ""}</span>`;
  } else {
    contactEl.textContent = "No contact linked";
  }

  const reasonWrap = document.getElementById("leadDetailReasonWrap");
  const isClosed = lead.stage === "Closed Won" || lead.stage === "Closed Lost";
  if (isClosed && lead.closed_reason) {
    reasonWrap.classList.remove("d-none");
    document.getElementById("leadDetailReason").textContent = lead.closed_reason;
  } else {
    reasonWrap.classList.add("d-none");
  }

  const reassignWrap = document.getElementById("leadDetailReassignWrap");
  reassignWrap.classList.toggle("d-none", !isManagerOrAdmin);
  if (isManagerOrAdmin) {
    const agents = await loadAgentsForReassign();
    const ownerSelect = document.getElementById("leadDetailOwnerSelect");
    ownerSelect.innerHTML = agents.map(a => `<option value="${a.id}">${a.full_name}</option>`).join("");
    if (!agents.some(a => a.id === lead.owner_id)) {
      ownerSelect.innerHTML = `<option value="${lead.owner_id}">Current owner (not an agent)</option>` + ownerSelect.innerHTML;
    }
    ownerSelect.value = lead.owner_id;
    document.getElementById("leadDetailReassignBtn").setAttribute("data-lead-id", lead.id);
  }

  const deleteBtn = document.getElementById("leadDetailDeleteBtn");
  const canDelete = isManagerOrAdmin || lead.owner_id === currentUserId;
  deleteBtn.classList.toggle("d-none", !canDelete);
  deleteBtn.setAttribute("data-lead-id", lead.id);

  const logBtn = document.getElementById("leadDetailLogActivityBtn");
  logBtn.setAttribute("data-lead-id", lead.id);
  logBtn.setAttribute("data-lead-title", lead.title);

  await loadLeadActivities(leadId);

  const modalEl = document.getElementById("leadDetailModal");
  (bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl)).show();
}

async function loadLeadActivities(leadId) {
  const container = document.getElementById("leadDetailActivities");
  container.innerHTML = `<div class="text-muted small">Loading...</div>`;

  const { data, error } = await supabaseClient
    .from("activities")
    .select("*, users!activities_agent_id_fkey(full_name)")
    .eq("lead_id", leadId)
    .order("created_at", { ascending: false });

  if (error) { console.log(error); container.innerHTML = `<div class="text-muted small">Failed to load activity history.</div>`; return; }

  if (data.length === 0) {
    container.innerHTML = `<div class="text-muted small">No activity logged yet.</div>`;
    return;
  }

  container.innerHTML = data.map(a => `
    <div class="border-bottom pb-2">
      <div class="d-flex justify-content-between">
        <span class="fw-bold">${a.activity_type}</span>
        <span class="text-muted small">${new Date(a.created_at).toLocaleString()}</span>
      </div>
      ${a.notes ? `<div class="small">${a.notes}</div>` : ""}
      <div class="text-muted" style="font-size:0.75rem;">Logged by ${a.users?.full_name || "Unknown"}</div>
    </div>
  `).join("");
}

function enableDragDrop() {
  stages.forEach(stage => {
    const column = document.getElementById("col-" + stage);
    new Sortable(column, {
      group: "pipeline",
      animation: 150,
      onEnd: async (evt) => {
        const leadId = evt.item.getAttribute("data-lead-id");
        const newStage = evt.to.closest(".kanban-column").getAttribute("data-stage");

        // If dropped into Closed Won or Closed Lost, ask for a reason
        let closedReason = null;
        if (newStage === "Closed Won" || newStage === "Closed Lost") {
          closedReason = prompt(`Reason for ${newStage}:`);
        }

        const { error } = await supabaseClient
          .from("leads")
          .update({ stage: newStage, closed_reason: closedReason })
          .eq("id", leadId);

        if (error) {
          console.log(error);
          alert("Failed to update lead stage.");
          loadPipeline(); // reload to reset visual state on failure
        }
      }
    });
  });
}

document.getElementById("logoutBtn").addEventListener("click", async () => {
  await supabaseClient.auth.signOut();
  localStorage.clear();
  window.location.href = "index.html";
});

document.addEventListener("click", async (e) => {
  const logBtn = e.target.closest(".log-activity-btn");
  if (logBtn) {
    document.getElementById("activityLeadId").value = logBtn.getAttribute("data-lead-id");
    document.getElementById("activityModalLeadTitle").textContent = "Log activity - " + logBtn.getAttribute("data-lead-title");
    new bootstrap.Modal(document.getElementById("logActivityModal")).show();
    return;
  }

  if (e.target.id === "leadDetailReassignBtn") {
    const leadId = e.target.getAttribute("data-lead-id");
    const newOwnerId = document.getElementById("leadDetailOwnerSelect").value;
    const { data, error } = await supabaseClient.from("leads").update({ owner_id: newOwnerId }).eq("id", leadId).select();
    if (error) { console.log(error); alert("Failed to reassign lead."); return; }
    if (!data || data.length === 0) { alert("You don't have permission to reassign this lead."); return; }
    await loadPipeline();
    openLeadDetail(leadId);
    return;
  }

  if (e.target.id === "leadDetailDeleteBtn") {
    const leadId = e.target.getAttribute("data-lead-id");
    if (!confirm("Delete this lead?")) return;
    const { data, error } = await supabaseClient.from("leads").update({ is_deleted: true }).eq("id", leadId).select();
    if (error) { console.log(error); alert("Failed to delete lead."); return; }
    if (!data || data.length === 0) { alert("You don't have permission to delete this lead."); return; }
    bootstrap.Modal.getInstance(document.getElementById("leadDetailModal")).hide();
    loadPipeline();
    return;
  }

  const card = e.target.closest(".lead-card");
  if (card) {
    openLeadDetail(card.getAttribute("data-lead-id"));
  }
});

document.getElementById("logActivityForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const { data: { user } } = await supabaseClient.auth.getUser();
  if (!user) { alert("Session expired. Please log in again."); window.location.href = "index.html"; return; }

  const { error } = await supabaseClient.from("activities").insert({
    lead_id: document.getElementById("activityLeadId").value,
    agent_id: user.id,
    activity_type: document.getElementById("activityType").value,
    notes: document.getElementById("activityNotes").value
  });

  if (error) { console.log(error); alert("Failed to log activity."); return; }

  document.getElementById("logActivityForm").reset();
  bootstrap.Modal.getInstance(document.getElementById("logActivityModal")).hide();
  alert("Activity logged.");
});

async function loadActivityTypeOptions() {
  const { data, error } = await supabaseClient
    .from("system_lookups")
    .select("value")
    .eq("category", "activity_type")
    .order("value");

  const select = document.getElementById("activityType");
  if (error || !data || data.length === 0) {
    ["Call", "Email", "Meeting", "Note"].forEach(v => select.innerHTML += `<option value="${v}">${v}</option>`);
    return;
  }
  data.forEach(l => select.innerHTML += `<option value="${l.value}">${l.value}</option>`);
}

async function loadContactsDropdown() {
  const { data, error } = await supabaseClient.from("contacts").select("id, full_name").eq("is_deleted", false);
  if (error) { console.log(error); return; }

  const select = document.getElementById("leadContact");
  data.forEach(c => {
    select.innerHTML += `<option value="${c.id}">${c.full_name}</option>`;
  });
}

document.getElementById("addLeadForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const { data: { user } } = await supabaseClient.auth.getUser();
  if (!user) { alert("Session expired. Please log in again."); window.location.href = "index.html"; return; }

  const { error } = await supabaseClient.from("leads").insert({
    title: document.getElementById("leadTitle").value,
    contact_id: document.getElementById("leadContact").value || null,
    owner_id: user.id,
    stage: "New Lead"
  });

  if (error) { console.log(error); alert("Failed to create lead."); return; }

  document.getElementById("addLeadForm").reset();
  bootstrap.Modal.getInstance(document.getElementById("addLeadModal")).hide();
  loadPipeline();
});

async function initPipelinePage() {
  const { data: { user } } = await supabaseClient.auth.getUser();
  currentUserId = user?.id || null;
  loadContactsDropdown();
  loadActivityTypeOptions();
  loadPipeline();
}

initPipelinePage();