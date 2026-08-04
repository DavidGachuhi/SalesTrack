const userRole = localStorage.getItem("userRole");
if (!userRole) window.location.href = "index.html";

if (userRole === "admin") {
  document.querySelector("nav .d-flex").insertAdjacentHTML(
    "beforeend",
    '<a href="admin.html" class="navlink">Admin</a>'
  );
}

async function loadContacts() {
  const tbody = document.getElementById("contactsTableBody");
  tbody.innerHTML = `<tr><td colspan="4" class="text-muted text-center py-3">Loading contacts...</td></tr>`;

  const { data, error } = await supabaseClient.from("contacts").select("*").order("created_at", { ascending: false });
  if (error) { console.log(error); tbody.innerHTML = `<tr><td colspan="4" class="text-muted text-center py-3">Failed to load contacts.</td></tr>`; return; }

  if (data.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" class="text-muted text-center py-3">No contacts yet.</td></tr>`;
    return;
  }

  tbody.innerHTML = "";
  data.forEach(c => {
    tbody.innerHTML += `<tr><td>${c.full_name}</td><td>${c.phone || ""}</td><td>${c.email || ""}</td><td>${c.company || ""}</td></tr>`;
  });
}

document.getElementById("addContactForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const { data: { user } } = await supabaseClient.auth.getUser();
  if (!user) { alert("Session expired. Please log in again."); window.location.href = "index.html"; return; }

  const { error } = await supabaseClient.from("contacts").insert({
    full_name: document.getElementById("cName").value,
    phone: document.getElementById("cPhone").value,
    email: document.getElementById("cEmail").value,
    company: document.getElementById("cCompany").value,
    owner_id: user.id
  });

  if (error) { console.log(error); alert("Error saving contact"); return; }

  document.getElementById("addContactForm").reset();
  bootstrap.Modal.getInstance(document.getElementById("addContactModal")).hide();
  loadContacts();
});

document.getElementById("logoutBtn").addEventListener("click", async () => {
  await supabaseClient.auth.signOut();
  localStorage.clear();
  window.location.href = "index.html";
});

loadContacts();