const API_BASE = "/api";

const leagueSelect = document.querySelector("#league-select");
const fixtureSelect = document.querySelector("#fixture-select");
const analyzeButton = document.querySelector("#analyze-button");
const feedback = document.querySelector("#feedback");
const predictionPanel = document.querySelector("#prediction-panel");
const predictionMatch = document.querySelector("#prediction-match");
const predictionNote = document.querySelector("#prediction-note");
const predictionSources = document.querySelector("#prediction-sources");
const predictionResults = document.querySelector("#prediction-results");
const recentResults = document.querySelector("#recent-results");
const recentResultsGrid = document.querySelector("#recent-results-grid");
const manualForm = document.querySelector("#manual-form");
const manualLeague = document.querySelector("#manual-league");
const manualAnalyzeButton = document.querySelector("#manual-analyze-button");

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

function formatAverage(value) {
    return typeof value === "number" && Number.isFinite(value)
        ? new Intl.NumberFormat("es-PE", { maximumFractionDigits: 2 }).format(value)
        : "Datos insuficientes";
}

function marketSummary(market, names, line) {
    if (!market?.total) return ["Datos insuficientes"];
    const total = market.total.find((value) => value.line === line);
    const average = market.averages?.total;
    return total
        ? [`Promedio total: ${formatAverage(average)}`, `Más de ${line}: ${total.over}%`, `Menos de ${line}: ${total.under}%`]
        : ["Datos insuficientes"];
}

function addRecentResults(prediction) {
    recentResultsGrid.replaceChildren();
    const groups = [
        [prediction.probabilities?.home?.name || "Local", prediction.recentResults?.home],
        [prediction.probabilities?.away?.name || "Visitante", prediction.recentResults?.away]
    ];
    let hasResults = false;

    groups.forEach(([label, matches]) => {
        if (!Array.isArray(matches) || matches.length === 0) return;
        hasResults = true;
        const group = document.createElement("section");
        group.className = "recent-team";
        const heading = document.createElement("h4");
        heading.textContent = label;
        const list = document.createElement("ul");

        matches.forEach((match) => {
            const item = document.createElement("li");
            const detail = document.createElement("span");
            const opponent = String(match.opponent || "")
                .replace(/\b\w/g, (letter) => letter.toUpperCase());
            const competition = match.competition ? ` · competición ${match.competition}` : "";
            detail.textContent = `${match.date} · vs ${opponent} · ${match.goalsFor}-${match.goalsAgainst}${competition}`;
            item.append(detail);

            if (!match.sourceUrl) {
                list.append(item);
                return;
            }
            try {
                const url = new URL(match.sourceUrl);
                if (!["http:", "https:"].includes(url.protocol)) {
                    list.append(item);
                    return;
                }
                const link = document.createElement("a");
                link.href = url.href;
                link.textContent = "Fuente";
                link.target = "_blank";
                link.rel = "noopener noreferrer";
                item.append(link);
            } catch {
                list.append(item);
                return;
            }
            list.append(item);
        });

        group.append(heading, list);
        recentResultsGrid.append(group);
    });

    recentResults.hidden = !hasResults;
}

async function loadLeagues() {
    try {
        const { leagues } = await requestJson("/leagues");
        leagueSelect.replaceChildren();
        addOption(leagueSelect, "", "Selecciona una liga");
        leagues.forEach((league) => addOption(leagueSelect, league.id, league.name));
        const leagueOptions = document.querySelector("#league-options");
        leagueOptions.replaceChildren();
        leagues.forEach((league) => {
            const option = document.createElement("option");
            option.value = league.name;
            option.dataset.id = league.id;
            leagueOptions.append(option);
        });
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

function showPrediction(prediction) {
    predictionMatch.textContent = prediction.match;
    predictionNote.textContent = prediction.basis === "global_baseline"
        ? `Pronóstico de muy baja confianza y no específico de estos equipos: usa promedios generales de ${prediction.sample?.league || 0} partidos recientes de las ligas guardadas. ${prediction.fallbackNotice || ""}`
        : prediction.basis === "competition_baseline"
        ? `Pronóstico de muy baja confianza: se basa solo en el promedio de goles de ${prediction.sample?.league || 0} partidos recientes de esta competición, no en el rendimiento de estos equipos. ${prediction.fallbackNotice || ""} Solo estima goles y resultado; no hay datos para corners, tarjetas o tiros al arco.`
        : prediction.confidence === "very_low"
            ? `Pronóstico de muy baja confianza: se basa en ${prediction.sample?.home || 0} partidos recientes del local y ${prediction.sample?.away || 0} del visitante. Solo estima goles y resultado; no hay datos suficientes para corners, tarjetas o tiros al arco.`
            : prediction.confidence === "low"
                ? `Pronóstico de baja confianza: usa cinco partidos recientes por equipo de otras competiciones. Solo estima goles y resultado; no hay datos suficientes para corners, tarjetas o tiros al arco.`
                : prediction.recentResults
                    ? `Fuente: ${prediction.source}. Estimación basada en cinco resultados recientes por equipo; revisa las fuentes asociadas. Los datos de búsqueda pueden contener errores.`
                    : prediction.source
                        ? `Fuente: ${prediction.source}. Las líneas Más/Menos son probabilidades del modelo.`
                        : "No hay suficiente histórico verificable para generar este pronóstico.";
    predictionSources.replaceChildren();
    (prediction.sources || []).forEach((source) => {
        try {
            const url = new URL(source);
            if (!["http:", "https:"].includes(url.protocol)) return;
            const item = document.createElement("li");
            const link = document.createElement("a");
            link.href = url.href;
            link.textContent = url.hostname;
            link.target = "_blank";
            link.rel = "noopener noreferrer";
            item.append(link);
            predictionSources.append(item);
        } catch {
            return;
        }
    });
    predictionSources.hidden = predictionSources.childElementCount === 0;
    addRecentResults(prediction);
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
    const goals = prediction.goals;
    addResult("Goles", goals?.markets?.total
        ? [
            `Total: promedio ${formatAverage(goals.total)}`,
            ...goals.markets.total.filter((line) => line.line === 2.5).flatMap((line) => [
                `Más de ${line.line}: ${line.over}%`,
                `Menos de ${line.line}: ${line.under}%`
            ])
        ]
        : ["Datos insuficientes"], "goals-result");
    addResult("Corners", marketSummary(prediction?.corners, names, 9.5), "average-result");
    addResult("Tarjetas", marketSummary(prediction?.cards, names, 4.5), "average-result");
    addResult("Tiros al arco", marketSummary(prediction?.shots, names, 20.5), "average-result");
    predictionPanel.hidden = false;
}

async function analyzeFixture() {
    const fixtureId = fixtureSelect.value;
    if (!fixtureId) return;

    analyzeButton.disabled = true;
    predictionPanel.hidden = true;
    setFeedback("Consultando datos...");

    try {
        const { prediction } = await requestJson(`/predictions?fixture=${encodeURIComponent(fixtureId)}&league=${encodeURIComponent(leagueSelect.value)}&v=11`);
        showPrediction(prediction);
        setFeedback("");
    } catch (error) {
        setFeedback(error.message);
    } finally {
        analyzeButton.disabled = false;
    }
}

async function analyzeManual(event) {
    event.preventDefault();
    const league = manualLeague.value.trim();
    const home = document.querySelector("#manual-home").value.trim();
    const away = document.querySelector("#manual-away").value.trim();
    if (!manualForm.reportValidity()) return;

    const matchingLeague = [...document.querySelector("#league-options").options]
        .find((option) => option.value.toLocaleLowerCase() === league.toLocaleLowerCase());
    const params = new URLSearchParams({ league, home, away });
    if (matchingLeague?.dataset.id) params.set("leagueId", matchingLeague.dataset.id);

    manualAnalyzeButton.disabled = true;
    predictionPanel.hidden = true;
    setFeedback("Buscando datos y calculando el pronóstico...");

    try {
        const { prediction } = await requestJson(`/predictions/manual?${params.toString()}`);
        showPrediction(prediction);
        setFeedback("");
    } catch (error) {
        setFeedback(error.message);
    } finally {
        manualAnalyzeButton.disabled = false;
    }
}

leagueSelect.addEventListener("change", loadFixtures);
fixtureSelect.addEventListener("change", () => {
    analyzeButton.disabled = !fixtureSelect.value;
});
analyzeButton.addEventListener("click", analyzeFixture);
manualForm.addEventListener("submit", analyzeManual);
loadLeagues();
