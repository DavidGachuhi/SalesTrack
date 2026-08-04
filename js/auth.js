document.getElementById("loginForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  const errorMsg = document.getElementById("errorMsg");

  // Step 1: attempt sign in
  const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });

  if (error) {
    errorMsg.textContent = "Invalid email or password.";
    return;
  }

  // Step 2: fetch this user's role from our users table
  const userId = data.user.id;
  const { data: profile, error: profileError } = await supabaseClient
    .from("users")
    .select("role, full_name")
    .eq("id", userId)
    .single();

  if (profileError || !profile) {
    errorMsg.textContent = "Could not load user profile.";
    return;
  }

  // Step 3: save role locally so other pages can check it
  localStorage.setItem("userRole", profile.role);
  localStorage.setItem("userName", profile.full_name);

  // Step 4: redirect to dashboard
  window.location.href = "dashboard.html";
});