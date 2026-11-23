const pages = [...document.querySelectorAll(".page")];
const navs = [...document.querySelectorAll(".nav")];
function showPage(name) {
  pages.forEach(p => p.classList.toggle("active-page", p.id === name));
  navs.forEach(n => n.classList.toggle("active", n.dataset.page === name));
  const titles = {home:"Your game. Your universe.",accounts:"Manage your accounts.",versions:"Choose your game setup.",friends:"Your community."};
  document.getElementById("page-title").textContent = titles[name] || "AETHER";
}
navs.forEach(n => n.addEventListener("click", () => showPage(n.dataset.page)));
document.querySelectorAll("[data-goto]").forEach(b => b.addEventListener("click", () => showPage(b.dataset.goto)));
document.getElementById("play-button").addEventListener("click", () => {
  document.getElementById("play-status").textContent = "The desktop shell is ready. Minecraft installation, Microsoft authentication, and the game launch engine still need to be implemented before Play can start a game.";
});
document.getElementById("version-info").addEventListener("click", () => {
  document.getElementById("play-status").textContent = "Target: Minecraft Java 1.21.11 with Fabric. Installer and runtime integration are not included in this foundation build.";
  showPage("home");
});
(async () => {
  if (window.aether?.version) {
    const v = await window.aether.version();
    document.getElementById("app-version").textContent = "v" + v;
    document.getElementById("footer-version").textContent = v;
  }
})();
