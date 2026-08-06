// Step 1: guard this page - if no role saved, kick back to login
const userRole = localStorage.getItem("userRole");
const userName = localStorage.getItem("userName");

if (!userRole) {
  window.location.href = "index.html";
}

if (userRole === "admin") {
  document.getElementById("logoutBtn").insertAdjacentHTML(
    "beforebegin",
    '<a href="admin.html" class="btn btn-outline-light btn-sm navlink">Admin</a>'
  );
}

// Add to dashboard.js, after the admin-nav-check block
async function loadDashboardStats() {
  const { data: { user } } = await supabaseClient.auth.getUser();
  if (!user) return;
  const isManagerOrAdmin = userRole === "manager" || userRole === "admin";

  const { data: leads, error: leadsError } = await supabaseClient.from("leads").select("*").eq("is_deleted", false);
  if (leadsError) { console.log(leadsError); return; }

  const { data: activities, error: activitiesError } = await supabaseClient.from("activities").select("*");
  if (activitiesError) { console.log(activitiesError); return; }

  const myLeads = isManagerOrAdmin ? leads : leads.filter(l => l.owner_id === user.id);
  const overdueLeads = myLeads.filter(l => {
    if (!l.last_contacted_at) return l.stage !== "New Lead" && l.stage !== "Closed Won" && l.stage !== "Closed Lost";
    const days = (Date.now() - new Date(l.last_contacted_at)) / (1000 * 60 * 60 * 24);
    return days > 3 && l.stage !== "Closed Won" && l.stage !== "Closed Lost";
  });
  const won = myLeads.filter(l => l.stage === "Closed Won").length;

  const cards = [
    { label: isManagerOrAdmin ? "Total leads (team)" : "My leads", value: myLeads.length },
    { label: "Overdue leads", value: overdueLeads.length },
    { label: "Closed won", value: won },
    { label: "Activities logged", value: activities.length }
  ];

  document.getElementById("statCards").innerHTML = cards.map(c => `
    <div class="col-md-3">
      <div class="card p-3 text-center">
        <div class="h2 fw-bold text-accent">${c.value}</div>
        <div class="text-muted small">${c.label}</div>
      </div>
    </div>
  `).join("");
}

loadDashboardStats();

const linkCardsByRole = {
  agent: [
    { label: "View my pipeline", href: "pipeline.html" },
    { label: "View my scorecard", href: "scorecards.html" }
  ],
  manager: [
    { label: "Team pipeline", href: "pipeline.html" },
    { label: "Scorecards to review", href: "scorecards.html" },
    { label: "Reports", href: "reports.html" }
  ],
  admin: [
    { label: "User management", href: "admin.html" },
    { label: "Audit log", href: "admin.html" },
    { label: "Generate report", href: "admin.html" }
  ]
};

async function loadRoleCards() {
  const container = document.getElementById("roleCards");
  let statCards = [];

  if (userRole === "admin") {
    const { count: userCount } = await supabaseClient.from("users").select("*", { count: "exact", head: true });
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { count: recentAuditCount } = await supabaseClient
      .from("audit_logs").select("*", { count: "exact", head: true }).gte("created_at", weekAgo);
    statCards = [
      { label: "Total users", value: userCount ?? 0 },
      { label: "Recent audit events (7d)", value: recentAuditCount ?? 0 }
    ];
  }

  const statHtml = statCards.map(c => `
    <div class="col-md-3">
      <div class="card p-3 text-center">
        <div class="h2 fw-bold text-accent">${c.value}</div>
        <div class="text-muted small">${c.label}</div>
      </div>
    </div>
  `).join("");

  const linkHtml = (linkCardsByRole[userRole] || []).map(c => `
    <div class="col-md-3">
      <a href="${c.href}" class="card p-3 text-center text-decoration-none">
        <div class="fw-bold text-accent">${c.label}</div>
      </a>
    </div>
  `).join("");

  container.innerHTML = statHtml + linkHtml;
}

loadRoleCards();

// Step 2: show a welcome message
document.getElementById("welcomeMsg").textContent = `${userName} (${userRole})`;

// Step 3: log out
document.getElementById("logoutBtn").addEventListener("click", async () => {
  await supabaseClient.auth.signOut();
  localStorage.removeItem("userRole");
  localStorage.removeItem("userName");
  window.location.href = "index.html";
});