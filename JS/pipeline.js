const userRole = localStorage.getItem("userRole");
if (!userRole) window.location.href = "index.html";

const stages = ["New Lead", "Contacted", "Qualified", "Proposal Sent", "Negotiation", "Closed Won", "Closed Lost"];

async function loadPipeline() {
  const { data, error } = await supabaseClient.from("leads").select("*").order("created_at");
  if (error) { console.log(error); return; }

  document.querySelectorAll(".kanban-cards").forEach(col => col.innerHTML = "");

  data.forEach(lead => {
    const column = document.getElementById("col-" + lead.stage);
    if (!column) return;

    column.innerHTML += `
      <div class="lead-card" data-lead-id="${lead.id}">
        <div class="fw-bold">${lead.title}</div>
      </div>
    `;
  });

  enableDragDrop();
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

loadPipeline();