const userRole = localStorage.getItem("userRole");
if (!userRole) window.location.href = "index.html";

async function loadContacts() {
  const { data, error } = await supabaseClient.from("contacts").select("*").order("created_at", { ascending: false });
  if (error) { console.log(error); return; }

  const tbody = document.getElementById("contactsTableBody");
  tbody.innerHTML = "";
  data.forEach(c => {
    tbody.innerHTML += `<tr><td>${c.full_name}</td><td>${c.phone || ""}</td><td>${c.email || ""}</td><td>${c.company || ""}</td></tr>`;
  });
}

document.getElementById("addContactForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const { data: { user } } = await supabaseClient.auth.getUser();

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

loadContacts();s