const userRole = localStorage.getItem("userRole");
if (!userRole) window.location.href = "index.html";

if (userRole === "admin") {
  document.getElementById("logoutBtn").insertAdjacentHTML(
    "beforebegin",
    '<a href="admin.html" class="btn btn-outline-light btn-sm navlink">Admin</a>'
  );
}

let currentUserId = null;

async function loadContacts() {
  const tbody = document.getElementById("contactsTableBody");
  tbody.innerHTML = `<tr><td colspan="5" class="text-muted text-center py-3">Loading contacts...</td></tr>`;

  const { data, error } = await supabaseClient.from("contacts").select("*").eq("is_deleted", false).order("created_at", { ascending: false });
  if (error) { console.log(error); tbody.innerHTML = `<tr><td colspan="5" class="text-muted text-center py-3">Failed to load contacts.</td></tr>`; return; }

  if (data.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" class="text-muted text-center py-3">No contacts yet.</td></tr>`;
    return;
  }

  tbody.innerHTML = "";
  data.forEach(c => {
    const canDelete = userRole === "admin" || userRole === "manager" || c.owner_id === currentUserId;
    tbody.innerHTML += `<tr>
      <td>${c.full_name}</td><td>${c.phone || ""}</td><td>${c.email || ""}</td><td>${c.company || ""}</td>
      <td>${canDelete ? `<button class="btn btn-sm btn-outline-danger delete-contact-btn" data-contact-id="${c.id}">Delete</button>` : ""}</td>
    </tr>`;
  });
}

document.addEventListener("click", async (e) => {
  if (!e.target.classList.contains("delete-contact-btn")) return;
  if (!confirm("Delete this contact?")) return;
  const { data, error } = await supabaseClient
    .from("contacts")
    .update({ is_deleted: true })
    .eq("id", e.target.getAttribute("data-contact-id"))
    .select();
  if (error) { console.log(error); alert("Failed to delete contact."); return; }
  if (!data || data.length === 0) { alert("You don't have permission to delete this contact."); return; }
  loadContacts();
});

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

async function initContactsPage() {
  const { data: { user } } = await supabaseClient.auth.getUser();
  currentUserId = user?.id || null;
  loadContacts();
}

initContactsPage();