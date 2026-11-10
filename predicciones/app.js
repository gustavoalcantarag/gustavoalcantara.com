const API_BASE = "/api";

const leagueSelect = document.querySelector("#league-select");
const fixtureSelect = document.querySelector("#fixture-select");
const analyzeButton = document.querySelector("#analyze-button");
const feedback = document.querySelector("#feedback");
const predictionPanel = document.querySelector("#prediction-panel");
const predictionMatch = document.querySelector("#prediction-match");
const predictionResults = document.querySelector("#prediction-results");

function setFeedback(message) {
    feedback.textContent = message;
}

async function requestJson(path) {
    const response = await fetch(`${API_BASE}${path}`, {
        headers: { Accept: "application/json" }
    });
    const payload = await response.json();
    if (!response.ok) {
        throw new Error(payload.error || "No se pudo completar la solicitud.");
    }
    return payload;
}

function addOption(select, value, label) {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = label;
    select.append(option);
}

async function loadLeagues() {
    try {
        const { leagues } = await requestJson("/leagues");
        leagueSelect.replaceChildren();
        addOption(leagueSelect, "", "Selecciona una liga");
        leagues.forEach((league) => addOption(leagueSelect, league.id, league.name));
    } catch (error) {
        leagueSelect.replaceChildren();
        addOption(leagueSelect, "", "Ligas no disponibles");
        setFeedback(error.message);
    }
}

async function loadFixtures() {
    const leagueId = leagueSelect.value;
    fixtureSelect.replaceChildren();
    analyzeButton.disabled = true;
    predictionPanel.hidden = true;

    if (!leagueId) {
        fixtureSelect.disabled = true;
        addOption(fixtureSelect, "", "Primero selecciona una liga");
        return;
    }

    fixtureSelect.disabled = true;
    addOption(fixtureSelect, "", "Cargando partidos...");
    setFeedback("");

    try {
        const { fixtures } = await requestJson(`/fixtures?league=${encodeURIComponent(leagueId)}`);
        fixtureSelect.replaceChildren();
        addOption(fixtureSelect, "", fixtures.length ? "Selecciona un partido" : "No hay próximos partidos");
        fixtures.forEach((fixture) => {
            addOption(fixtureSelect, fixture.id, `${fixture.date} · ${fixture.home} vs ${fixture.away}`);
        });
        fixtureSelect.disabled = fixtures.length === 0;
    } catch (error) {
        fixtureSelect.replaceChildren();
        addOption(fixtureSelect, "", "Partidos no disponibles");
        setFeedback(error.message);
    }
}

async function analyzeFixture() {
    const fixtureId = fixtureSelect.value;
    if (!fixtureId) return;

    analyzeButton.disabled = true;
    predictionPanel.hidden = true;
    setFeedback("Consultando datos...");

    try {
        const { prediction } = await requestJson(`/predictions?fixture=${encodeURIComponent(fixtureId)}`);
        predictionMatch.textContent = prediction.match;
        predictionResults.replaceChildren();
        Object.entries(prediction.metrics).forEach(([label, value]) => {
            const result = document.createElement("div");
            result.className = "result";
            result.innerHTML = `<strong>${label}</strong><span>${value}</span>`;
            predictionResults.append(result);
        });
        predictionPanel.hidden = false;
        setFeedback("");
    } catch (error) {
        setFeedback(error.message);
    } finally {
        analyzeButton.disabled = false;
    }
}

leagueSelect.addEventListener("change", loadFixtures);
fixtureSelect.addEventListener("change", () => {
    analyzeButton.disabled = !fixtureSelect.value;
});
analyzeButton.addEventListener("click", analyzeFixture);
loadLeagues();
