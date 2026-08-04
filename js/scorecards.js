const userRole = localStorage.getItem("userRole");
if (!userRole) window.location.href = "index.html";

if (userRole === "admin") {
  document.querySelector("nav .d-flex").insertAdjacentHTML(
    "beforeend",
    '<a href="admin.html" class="navlink">Admin</a>'
  );
}

// Agents get a self-assessment form; managers/admins don't submit self-scores
if (userRole === "agent") {
  document.getElementById("agentSection").classList.remove("d-none");
}

async function loadScorecards() {
  const { data: { user } } = await supabaseClient.auth.getUser();
  if (!user) { window.location.href = "index.html"; return; }

  let query = supabaseClient
    .from("scorecards")
    .select("*, users!scorecards_agent_id_fkey(full_name)")
    .order("created_at", { ascending: false });

  if (userRole === "agent") {
    query = query.eq("agent_id", user.id);
  }

  const tbody = document.getElementById("scorecardsTableBody");
  tbody.innerHTML = `<tr><td colspan="6" class="text-muted text-center py-3">Loading scorecards...</td></tr>`;

  const { data, error } = await query;
  if (error) { console.log(error); tbody.innerHTML = `<tr><td colspan="6" class="text-muted text-center py-3">Failed to load scorecards.</td></tr>`; return; }

  if (data.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="text-muted text-center py-3">No scorecards yet.</td></tr>`;
    return;
  }

  tbody.innerHTML = "";

  data.forEach(sc => {
    const canScore = (userRole === "manager" ) && !sc.manager_score;
    tbody.innerHTML += `
      <tr>
        <td>${sc.period}</td>
        <td>${sc.users?.full_name || "Unknown"}</td>
        <td>${sc.agent_score ?? "-"}</td>
        <td>${sc.manager_score ?? "-"}</td>
        <td>${sc.manager_comments || "-"}</td>
        <td>${canScore ? `<button class="btn btn-sm btn-outline-light score-btn" data-id="${sc.id}">Score</button>` : ""}</td>
      </tr>
    `;
  });
}

// Agent submits self-assessment
const selfForm = document.getElementById("selfAssessForm");
if (selfForm) {
  selfForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) { alert("Session expired. Please log in again."); window.location.href = "index.html"; return; }

    const { error } = await supabaseClient.from("scorecards").insert({
      agent_id: user.id,
      period: document.getElementById("period").value,
      agent_score: document.getElementById("agentScore").value,
      agent_comments: document.getElementById("agentComments").value
    });

    if (error) { console.log(error); alert("Failed to submit scorecard."); return; }

    selfForm.reset();
    loadScorecards();
  });
}

// Manager opens scoring modal
document.addEventListener("click", (e) => {
  if (e.target.classList.contains("score-btn")) {
    document.getElementById("scorecardId").value = e.target.getAttribute("data-id");
    new bootstrap.Modal(document.getElementById("managerScoreModal")).show();
  }
});

document.getElementById("managerScoreForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const { data: { user } } = await supabaseClient.auth.getUser();
  if (!user) { alert("Session expired. Please log in again."); window.location.href = "index.html"; return; }

  const { error } = await supabaseClient
    .from("scorecards")
    .update({
      manager_id: user.id,
      manager_score: document.getElementById("managerScore").value,
      manager_comments: document.getElementById("managerComments").value
    })
    .eq("id", document.getElementById("scorecardId").value);

  if (error) { console.log(error); alert("Failed to save manager score."); return; }

  bootstrap.Modal.getInstance(document.getElementById("managerScoreModal")).hide();
  loadScorecards();
});

document.getElementById("logoutBtn").addEventListener("click", async () => {
  await supabaseClient.auth.signOut();
  localStorage.clear();
  window.location.href = "index.html";
});

loadScorecards();