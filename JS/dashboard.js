// Step 1: guard this page - if no role saved, kick back to login
const userRole = localStorage.getItem("userRole");
const userName = localStorage.getItem("userName");

if (!userRole) {
  window.location.href = "index.html";
}

// Step 2: show a welcome message
document.getElementById("welcomeMsg").textContent = `${userName} (${userRole})`;

// Step 3: log out
document.getElementById("logoutBtn").addEventListener("click", async () => {
  await supabaseClient.auth.signOut();
  localStorage.removeItem("userRole");
  localStorage.removeItem("userName");
  window.location.href = "index.html";
});