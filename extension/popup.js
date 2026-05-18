const form = document.getElementById("config");
const employeeEmail = document.getElementById("employeeEmail");
const apiBaseUrl = document.getElementById("apiBaseUrl");
const status = document.getElementById("status");

chrome.storage.local.get(["employeeEmail", "apiBaseUrl"]).then((config) => {
  employeeEmail.value = config.employeeEmail || "rahul@company.com";
  apiBaseUrl.value = config.apiBaseUrl || "http://localhost:3000";
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  await chrome.storage.local.set({
    employeeEmail: employeeEmail.value.trim().toLowerCase(),
    apiBaseUrl: apiBaseUrl.value.trim().replace(/\/$/, "")
  });
  status.textContent = "Configuration saved.";
  setTimeout(() => { status.textContent = ""; }, 2200);
});
