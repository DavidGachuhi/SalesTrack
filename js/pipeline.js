const userRole = localStorage.getItem("userRole");
if (!userRole) window.location.href = "index.html";

if (userRole === "admin") {
  document.querySelector("nav .d-flex").insertAdjacentHTML(
    "beforeend",
    '<a href="admin.html" class="text-decoration-none" style="color:var(--text)">Admin</a>'
  );
}

const stages = ["New Lead", "Contacted", "Qualified", "Proposal Sent", "Negotiation", "Closed Won", "Closed Lost"];

async function loadPipeline() {
  const { data, error } = await supabaseClient.from("leads").select("*").order("created_at");
  if (error) { console.log(error); return; }

  document.querySelectorAll(".kanban-cards").forEach(col => col.innerHTML = "");

  data.forEach(lead => {
    const column = document.getElementById("col-" + lead.stage);
    if (!column) return;

    const { score, overdue } = calculateLeadMeta(lead);

    column.innerHTML += `
  <div class="lead-card ${overdue ? 'overdue' : ''}" data-lead-id="${lead.id}">
    <div class="fw-bold">${lead.title}</div>
    <div class="d-flex justify-content-between mt-1">
      <span class="badge" style="background-color:var(--accent)">${score} pts</span>
      ${overdue ? '<span class="badge bg-danger">Overdue</span>' : ''}
    </div>
    <button class="btn btn-sm btn-outline-light mt-2 log-activity-btn" data-lead-id="${lead.id}" data-lead-title="${lead.title}">
      Log activity
    </button>
  </div>
`;
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

document.addEventListener("click", (e) => {
  if (e.target.classList.contains("log-activity-btn")) {
    document.getElementById("activityLeadId").value = e.target.getAttribute("data-lead-id");
    document.getElementById("activityModalLeadTitle").textContent = "Log activity - " + e.target.getAttribute("data-lead-title");
    new bootstrap.Modal(document.getElementById("logActivityModal")).show();
  }
});

document.getElementById("logActivityForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const { data: { user } } = await supabaseClient.auth.getUser();

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

async function loadContactsDropdown() {
  const { data, error } = await supabaseClient.from("contacts").select("id, full_name");
  if (error) { console.log(error); return; }

  const select = document.getElementById("leadContact");
  data.forEach(c => {
    select.innerHTML += `<option value="${c.id}">${c.full_name}</option>`;
  });
}

document.getElementById("addLeadForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const { data: { user } } = await supabaseClient.auth.getUser();

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

loadContactsDropdown();

loadPipeline();