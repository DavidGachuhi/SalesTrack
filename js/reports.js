const userRole = localStorage.getItem("userRole");
if (!userRole) window.location.href = "index.html";

if (userRole === "admin") {
  document.querySelector("nav .d-flex").insertAdjacentHTML(
    "beforeend",
    '<a href="admin.html" class="text-decoration-none" style="color:var(--text)">Admin</a>'
  );
}

Chart.defaults.color = "#9a9a9a";
Chart.defaults.borderColor = "#2e2e2e";

const stages = ["New Lead", "Contacted", "Qualified", "Proposal Sent", "Negotiation", "Closed Won", "Closed Lost"];

async function loadReports() {
  const { data: leads, error: leadsError } = await supabaseClient.from("leads").select("*");
  const { data: activities, error: actError } = await supabaseClient.from("activities").select("*, users!activities_agent_id_fkey(full_name)");
  const { data: scorecards, error: scError } = await supabaseClient.from("scorecards").select("*");

  if (leadsError || actError || scError) {
    console.log(leadsError, actError, scError);
    return;
  }

  // Chart 1: Leads by stage
  const stageCounts = stages.map(stage => leads.filter(l => l.stage === stage).length);
  new Chart(document.getElementById("stageChart"), {
  type: "bar",
  data: {
    labels: stages,
    datasets: [{ label: "Leads", data: stageCounts, backgroundColor: "#22c55e" }]
  },
  options: {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } }
  }
});

  // Chart 2: Won vs Lost
  const won = leads.filter(l => l.stage === "Closed Won").length;
  const lost = leads.filter(l => l.stage === "Closed Lost").length;
  new Chart(document.getElementById("winLossChart"), {
    type: "doughnut",
    data: {
      labels: ["Won", "Lost"],
      datasets: [{ data: [won, lost], backgroundColor: ["#22c55e", "#dc2626"] }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false
    }
  });

  // Chart 3: Activity volume by agent
  const agentCounts = {};
  activities.forEach(a => {
    const name = a.users?.full_name || "Unknown";
    agentCounts[name] = (agentCounts[name] || 0) + 1;
  });
  new Chart(document.getElementById("activityChart"), {
    type: "bar",
    data: {
      labels: Object.keys(agentCounts),
      datasets: [{ label: "Activities logged", data: Object.values(agentCounts), backgroundColor: "#22c55e" }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } }
    }
  });

  // Chart 4: Self vs Manager scores
  const withBothScores = scorecards.filter(sc => sc.agent_score && sc.manager_score);
  new Chart(document.getElementById("scoreChart"), {
    type: "bar",
    data: {
      labels: withBothScores.map(sc => sc.period),
      datasets: [
        { label: "Self score", data: withBothScores.map(sc => sc.agent_score), backgroundColor: "#22c55e" },
        { label: "Manager score", data: withBothScores.map(sc => sc.manager_score), backgroundColor: "#166534" }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false
    }
  });
}

document.getElementById("logoutBtn").addEventListener("click", async () => {
  await supabaseClient.auth.signOut();
  localStorage.clear();
  window.location.href = "index.html";
});

loadReports();