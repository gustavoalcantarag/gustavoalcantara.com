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
        cache: "no-store",
        headers: {
            Accept: "application/json",
            "Cache-Control": "no-cache"
        }
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

function addResult(title, lines, className = "") {
    const result = document.createElement("div");
    result.className = `result ${className}`.trim();
    const heading = document.createElement("strong");
    heading.textContent = title;
    result.append(heading);
    lines.forEach((line) => {
        const detail = document.createElement("span");
        detail.textContent = line;
        result.append(detail);
    });
    predictionResults.append(result);
}

function percentage(value) {
    return value === null || value === undefined ? "Datos insuficientes" : `${value}%`;
}

function marketLines(market, names) {
    if (!market || !market.total) return ["Datos insuficientes"];
    const lines = [];
    [
        ["Total", market.total],
        [names.home, market.home],
        [names.away, market.away]
    ].forEach(([name, values]) => {
        if (!values) return;
        const average = market.averages?.[name === "Total" ? "total" : name === names.home ? "home" : "away"];
        lines.push(`${name}: promedio ${average}`);
        values.forEach((value) => {
            lines.push(`Más de ${value.line}: ${value.over}%`);
            lines.push(`Menos de ${value.line}: ${value.under}%`);
        });
    });
    return lines;
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
        const { prediction } = await requestJson(`/predictions?fixture=${encodeURIComponent(fixtureId)}&league=${encodeURIComponent(leagueSelect.value)}&v=11`);
        predictionMatch.textContent = prediction.match;
        predictionResults.replaceChildren();
        const names = {
            home: prediction.probabilities?.home?.name || "Local",
            away: prediction.probabilities?.away?.name || "Visitante"
        };
        addResult("Resultado", prediction.probabilities
            ? [
                `${names.home}: ${percentage(prediction.probabilities.home.value)}`,
                `Empate: ${percentage(prediction.probabilities.draw)}`,
                `${names.away}: ${percentage(prediction.probabilities.away.value)}`
            ]
            : ["Datos insuficientes"], "outcome-result");
        addResult("Marcador exacto", prediction.exactScores?.length
            ? prediction.exactScores.map((score) => `${score.score}: ${score.probability}%`)
            : ["Datos insuficientes"], "score-result");
        const goals = prediction.goals;
        addResult("Goles", goals?.markets?.home && goals?.markets?.away && goals?.markets?.total
            ? [
                `${names.home}: promedio ${goals.home.toFixed(2)}`,
                ...goals.markets.home.flatMap((line) => [
                    `Más de ${line.line}: ${line.over}%`,
                    `Menos de ${line.line}: ${line.under}%`
                ]),
                `${names.away}: promedio ${goals.away.toFixed(2)}`,
                ...goals.markets.away.flatMap((line) => [
                    `Más de ${line.line}: ${line.over}%`,
                    `Menos de ${line.line}: ${line.under}%`
                ]),
                `Total: promedio ${goals.total.toFixed(2)}`,
                ...goals.markets.total.flatMap((line) => [
                    `Más de ${line.line}: ${line.over}%`,
                    `Menos de ${line.line}: ${line.under}%`
                ])
            ]
            : ["Datos insuficientes"], "goals-result");
        addResult("Corners", marketLines(prediction?.corners, names), "average-result");
        addResult("Tarjetas", marketLines(prediction?.cards, names), "average-result");
        addResult("Tiros al arco", marketLines(prediction?.shots, names), "average-result");
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
