// Step 1: guard this page - if no role saved, kick back to login
const userRole = localStorage.getItem("userRole");
const userName = localStorage.getItem("userName");

if (!userRole) {
  window.location.href = "index.html";
}

if (userRole === "admin") {
  document.querySelector("nav .d-flex").insertAdjacentHTML(
    "beforeend",
    '<a href="admin.html" class="navlink">Admin</a>'
  );
}

// Add to dashboard.js, after the admin-nav-check block
async function loadDashboardStats() {
  const { data: { user } } = await supabaseClient.auth.getUser();
  if (!user) return;
  const isManagerOrAdmin = userRole === "manager" || userRole === "admin";

  const { data: leads, error: leadsError } = await supabaseClient.from("leads").select("*");
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

// Step 2: show a welcome message
document.getElementById("welcomeMsg").textContent = `${userName} (${userRole})`;

// Step 3: log out
document.getElementById("logoutBtn").addEventListener("click", async () => {
  await supabaseClient.auth.signOut();
  localStorage.removeItem("userRole");
  localStorage.removeItem("userName");
  window.location.href = "index.html";
});