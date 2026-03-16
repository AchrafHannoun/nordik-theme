document.addEventListener("DOMContentLoaded", () => {
  const containers = document.querySelectorAll(".ensemble-quiz[data-section-id]");
  containers.forEach((container) => {
    if (container.dataset.initialized === "true") return;
    container.dataset.initialized = "true";
    initializeEnsembleQuiz(container);
  });
});

function initializeEnsembleQuiz(container) {
  const sectionId = container.dataset.sectionId;
  const app = document.getElementById(`ensemble-quiz-app-${sectionId}`);
  const errorBox = document.getElementById(`ensemble-quiz-error-${sectionId}`);
  const skuMapScript = document.getElementById(`ensemble-quiz-sku-variant-map-${sectionId}`);

  if (!app || !errorBox) return;

  const settings = {
    csvUrl: container.dataset.csvUrl || "/Ensemble.csv",
    n8nWebhookUrl: container.dataset.n8nWebhookUrl || "",
    showBuildingQuestionWhenSingleOption:
      String(container.dataset.showBuildingQuestionWhenSingleOption) === "true",

    resultHeading: container.dataset.resultHeading || "Votre ensemble recommande",
    emailFormHeading: container.dataset.emailFormHeading || "Recevez votre PDF",
    emailSuccessMessage: container.dataset.emailSuccessMessage || "Votre PDF a ete envoye.",
    emailErrorMessage:
      container.dataset.emailErrorMessage ||
      "Impossible d'envoyer le formulaire pour le moment.",
    addToCartBtnText: container.dataset.addToCartBtnText || "Ajouter tout au panier",
    sendPdfBtnText: container.dataset.sendPdfBtnText || "Envoyer mon PDF",
    restartBtnText: container.dataset.restartBtnText || "Recommencer",
    backBtnText: container.dataset.backBtnText || "Retour",
    loadingText: container.dataset.loadingText || "Chargement...",
    noMatchText: container.dataset.noMatchText || "Aucun ensemble ne correspond.",
    multipleMatchText:
      container.dataset.multipleMatchText ||
      "Plusieurs ensembles correspondent. Veuillez contacter notre equipe.",
    noProductsText:
      container.dataset.noProductsText ||
      "Aucun produit n'a ete trouve pour cette configuration.",
    unresolvedVariantText:
      container.dataset.unresolvedVariantText ||
      "Certaines references n'ont pas ete associees a un variant Shopify.",
    addToCartErrorText:
      container.dataset.addToCartErrorText || "Impossible d'ajouter les produits au panier.",
    requiredFieldErrorText:
      container.dataset.requiredFieldErrorText || "Veuillez remplir ce champ.",

    labelBuilding: container.dataset.labelBuilding || "Type de batiment",
    labelPipes: container.dataset.labelPipes || "Les tuyaux sont-ils deja installes?",
    labelInsulation: container.dataset.labelInsulation || "Type d'isolation",
    labelDiameter: container.dataset.labelDiameter || "Diametre des tuyaux",
    labelSurface9: container.dataset.labelSurface9 || "Superficie (9 pouces)",
    labelSurface12: container.dataset.labelSurface12 || "Superficie (12 pouces)",
    labelCircuits: container.dataset.labelCircuits || "Nombre de circuits",
    labelEnergy: container.dataset.labelEnergy || "Energie de la chaudiere",
    labelKnowBoiler:
      container.dataset.labelKnowBoiler || "Savez-vous quelle chaudiere vous avez besoin?",
    labelBoilerModel: container.dataset.labelBoilerModel || "Choix du modele",
    labelBtuRange: container.dataset.labelBtuRange || "Choix de la plage BTU",
    labelFitting: container.dataset.labelFitting || "Fitting de cuivre",
    labelFirstName: container.dataset.labelFirstName || "Prenom",
    labelLastName: container.dataset.labelLastName || "Nom",
    labelEmail: container.dataset.labelEmail || "Courriel",
    placeholderFirstName: container.dataset.placeholderFirstName || "Votre prenom",
    placeholderLastName: container.dataset.placeholderLastName || "Votre nom",
    placeholderEmail: container.dataset.placeholderEmail || "votre@courriel.com",

    optionsBuilding: container.dataset.optionsBuilding || "",
    optionsPipes: container.dataset.optionsPipes || "",
    optionsInsulation: container.dataset.optionsInsulation || "",
    optionsDiameter: container.dataset.optionsDiameter || "",
    optionsCircuits: container.dataset.optionsCircuits || "",
    optionsEnergy: container.dataset.optionsEnergy || "",
    optionsKnowBoiler: container.dataset.optionsKnowBoiler || "",
    optionsFitting: container.dataset.optionsFitting || "",
    optionsSurface9: container.dataset.optionsSurface9 || "",
    optionsSurface12: container.dataset.optionsSurface12 || "",
    optionsBoiler240: container.dataset.optionsBoiler240 || "",
    optionsBoiler600: container.dataset.optionsBoiler600 || "",
    optionsBoilerGazStandard: container.dataset.optionsBoilerGazStandard || "",
    optionsBoilerGazCombi: container.dataset.optionsBoilerGazCombi || "",
    optionsBtu240: container.dataset.optionsBtu240 || "",
    optionsBtu600: container.dataset.optionsBtu600 || "",
    optionsBtuGazStandard: container.dataset.optionsBtuGazStandard || "",
    optionsBtuGazCombi: container.dataset.optionsBtuGazCombi || "",
  };

  const state = {
    rows: [],
    skuMap: {},
    answers: {},
    history: [],
    currentStepId: null,
    products: [],
    isEmailSubmitting: false,
    isCartSubmitting: false,
  };

  const ENERGY_KEYS = {
    ELEC_240: "elec_240",
    ELEC_600: "elec_600",
    GAZ_STANDARD: "gaz_standard",
    GAZ_COMBI: "gaz_combi",
  };

  const CSV_COLS = {
    BUILDING: 0,
    PIPES: 1,
    INSULATION: 2,
    DIAMETER: 3,
    SURFACE_9: 4,
    SURFACE_12: 5,
    CIRCUITS: 6,
    ENERGY: 7,
    KNOW_BOILER: 8,
    BOILER_240: 9,
    BOILER_600: 10,
    BOILER_GAZ_STANDARD: 11,
    BOILER_GAZ_COMBI: 12,
    BTU_240: 13,
    BTU_600: 14,
    BTU_GAZ_STANDARD: 15,
    BTU_GAZ_COMBI: 16,
    FITTING: 17,
  };

  const STEP_IDS = {
    BUILDING: "building",
    PIPES: "pipes",
    INSULATION: "insulation",
    DIAMETER: "diameter",
    SURFACE_9: "surface_9",
    SURFACE_12: "surface_12",
    CIRCUITS: "circuits",
    ENERGY: "energy",
    KNOW_BOILER: "know_boiler",
    BOILER_MODEL: "boiler_model",
    BTU_RANGE: "btu_range",
    FITTING: "fitting",
    RESULT: "result",
  };

  const STEP_LABELS = {
    [STEP_IDS.BUILDING]: settings.labelBuilding,
    [STEP_IDS.PIPES]: settings.labelPipes,
    [STEP_IDS.INSULATION]: settings.labelInsulation,
    [STEP_IDS.DIAMETER]: settings.labelDiameter,
    [STEP_IDS.SURFACE_9]: settings.labelSurface9,
    [STEP_IDS.SURFACE_12]: settings.labelSurface12,
    [STEP_IDS.CIRCUITS]: settings.labelCircuits,
    [STEP_IDS.ENERGY]: settings.labelEnergy,
    [STEP_IDS.KNOW_BOILER]: settings.labelKnowBoiler,
    [STEP_IDS.BOILER_MODEL]: settings.labelBoilerModel,
    [STEP_IDS.BTU_RANGE]: settings.labelBtuRange,
    [STEP_IDS.FITTING]: settings.labelFitting,
  };

  function normalize(value) {
    if (value === null || value === undefined) return "";
    return String(value).trim();
  }

  function normalizeForComparison(value) {
    return normalize(value)
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  }

  function showError(message) {
    errorBox.textContent = message;
    errorBox.hidden = false;
  }

  function clearError() {
    errorBox.textContent = "";
    errorBox.hidden = true;
  }

  function parseOptionList(raw) {
    if (!raw) return [];
    return raw
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const segments = line.split("|");
        if (segments.length >= 2) {
          return {
            value: normalize(segments[0]),
            label: normalize(segments.slice(1).join("|")) || normalize(segments[0]),
          };
        }
        return { value: normalize(line), label: normalize(line) };
      });
  }

  function dedupeOptions(options) {
    const seen = new Set();
    const result = [];
    options.forEach((option) => {
      const key = normalize(option.value);
      if (!key || seen.has(key)) return;
      seen.add(key);
      result.push(option);
    });
    return result;
  }

  function csvParseLine(line) {
    const values = [];
    let current = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i += 1) {
      const char = line[i];
      const nextChar = line[i + 1];

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          current += '"';
          i += 1;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === "," && !inQuotes) {
        values.push(current);
        current = "";
      } else {
        current += char;
      }
    }

    values.push(current);
    return values.map((entry) => normalize(entry));
  }

  async function loadCsvData() {
    const candidates = [];
    const primary = normalize(settings.csvUrl);

    if (primary) candidates.push(primary);

    const root =
      window.Shopify && window.Shopify.routes && window.Shopify.routes.root
        ? window.Shopify.routes.root
        : "/";
    candidates.push(`${root}Ensemble.csv`);
    candidates.push("/Ensemble.csv");

    const seen = new Set();
    const uniqueCandidates = candidates.filter((url) => {
      if (!url || seen.has(url)) return false;
      seen.add(url);
      return true;
    });

    let lastError = null;

    for (const url of uniqueCandidates) {
      try {
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`CSV request failed (${response.status})`);
        }

        const text = await response.text();
        const lines = text
          .replace(/^\uFEFF/, "")
          .split(/\r?\n/)
          .filter((line) => line.trim() !== "");

        if (lines.length < 2) {
          throw new Error("CSV is missing data rows");
        }

        const rows = lines.map(csvParseLine);
        state.rows = rows.slice(1);
        return;
      } catch (error) {
        lastError = error;
      }
    }

    throw lastError || new Error("Unable to load CSV file");
  }

  function loadSkuVariantMap() {
    if (!skuMapScript || !skuMapScript.textContent) {
      state.skuMap = {};
      return;
    }

    try {
      state.skuMap = JSON.parse(skuMapScript.textContent);
    } catch (error) {
      console.error("Ensemble quiz: unable to parse SKU map", error);
      state.skuMap = {};
    }
  }

  function getUniqueOptionsFromColumn(columnIndex, includeNa = false) {
    const options = [];
    const seen = new Set();

    state.rows.forEach((row) => {
      const value = normalize(row[columnIndex]);
      if (!value) return;
      if (!includeNa && normalizeForComparison(value) === "n/a") return;
      if (seen.has(value)) return;
      seen.add(value);
      options.push({ value, label: value });
    });

    return options;
  }

  function optionSource(preferredRaw, fallbackColumn, includeNa = false) {
    const explicit = parseOptionList(preferredRaw);
    if (explicit.length) return explicit;
    return getUniqueOptionsFromColumn(fallbackColumn, includeNa);
  }

  function resolveEnergyKey(value) {
    const normalized = normalizeForComparison(value);

    if (normalized.includes("240")) return ENERGY_KEYS.ELEC_240;
    if (normalized.includes("600")) return ENERGY_KEYS.ELEC_600;
    if (normalized.includes("combi")) return ENERGY_KEYS.GAZ_COMBI;
    if (normalized.includes("gaz") || normalized.includes("standard")) return ENERGY_KEYS.GAZ_STANDARD;

    return null;
  }

  function isYes(value) {
    const normalized = normalizeForComparison(value);
    return normalized === "oui" || normalized === "yes";
  }

  function isNo(value) {
    const normalized = normalizeForComparison(value);
    return normalized === "non" || normalized === "no";
  }

  function isNineInch(value) {
    return normalizeForComparison(value).includes("9");
  }

  function determineBoilerColumn() {
    const energyKey = resolveEnergyKey(state.answers.energy);
    if (energyKey === ENERGY_KEYS.ELEC_240) return CSV_COLS.BOILER_240;
    if (energyKey === ENERGY_KEYS.ELEC_600) return CSV_COLS.BOILER_600;
    if (energyKey === ENERGY_KEYS.GAZ_STANDARD) return CSV_COLS.BOILER_GAZ_STANDARD;
    if (energyKey === ENERGY_KEYS.GAZ_COMBI) return CSV_COLS.BOILER_GAZ_COMBI;
    return null;
  }

  function determineBtuColumn() {
    const energyKey = resolveEnergyKey(state.answers.energy);
    if (energyKey === ENERGY_KEYS.ELEC_240) return CSV_COLS.BTU_240;
    if (energyKey === ENERGY_KEYS.ELEC_600) return CSV_COLS.BTU_600;
    if (energyKey === ENERGY_KEYS.GAZ_STANDARD) return CSV_COLS.BTU_GAZ_STANDARD;
    if (energyKey === ENERGY_KEYS.GAZ_COMBI) return CSV_COLS.BTU_GAZ_COMBI;
    return null;
  }

  function getOptionsForStep(stepId) {
    switch (stepId) {
      case STEP_IDS.BUILDING:
        return dedupeOptions(optionSource(settings.optionsBuilding, CSV_COLS.BUILDING));
      case STEP_IDS.PIPES:
        return dedupeOptions(optionSource(settings.optionsPipes, CSV_COLS.PIPES));
      case STEP_IDS.INSULATION:
        return dedupeOptions(optionSource(settings.optionsInsulation, CSV_COLS.INSULATION));
      case STEP_IDS.DIAMETER:
        return dedupeOptions(optionSource(settings.optionsDiameter, CSV_COLS.DIAMETER));
      case STEP_IDS.SURFACE_9:
        return dedupeOptions(optionSource(settings.optionsSurface9, CSV_COLS.SURFACE_9));
      case STEP_IDS.SURFACE_12:
        return dedupeOptions(optionSource(settings.optionsSurface12, CSV_COLS.SURFACE_12));
      case STEP_IDS.CIRCUITS: {
        const options = dedupeOptions(optionSource(settings.optionsCircuits, CSV_COLS.CIRCUITS));
        return options.sort((a, b) => Number(a.value) - Number(b.value));
      }
      case STEP_IDS.ENERGY:
        return dedupeOptions(optionSource(settings.optionsEnergy, CSV_COLS.ENERGY));
      case STEP_IDS.KNOW_BOILER:
        return dedupeOptions(optionSource(settings.optionsKnowBoiler, CSV_COLS.KNOW_BOILER));
      case STEP_IDS.BOILER_MODEL: {
        const energyKey = resolveEnergyKey(state.answers.energy);
        if (energyKey === ENERGY_KEYS.ELEC_240) {
          return dedupeOptions(optionSource(settings.optionsBoiler240, CSV_COLS.BOILER_240));
        }
        if (energyKey === ENERGY_KEYS.ELEC_600) {
          return dedupeOptions(optionSource(settings.optionsBoiler600, CSV_COLS.BOILER_600));
        }
        if (energyKey === ENERGY_KEYS.GAZ_STANDARD) {
          return dedupeOptions(
            optionSource(settings.optionsBoilerGazStandard, CSV_COLS.BOILER_GAZ_STANDARD)
          );
        }
        if (energyKey === ENERGY_KEYS.GAZ_COMBI) {
          return dedupeOptions(optionSource(settings.optionsBoilerGazCombi, CSV_COLS.BOILER_GAZ_COMBI));
        }
        return [];
      }
      case STEP_IDS.BTU_RANGE: {
        const energyKey = resolveEnergyKey(state.answers.energy);
        if (energyKey === ENERGY_KEYS.ELEC_240) {
          return dedupeOptions(optionSource(settings.optionsBtu240, CSV_COLS.BTU_240));
        }
        if (energyKey === ENERGY_KEYS.ELEC_600) {
          return dedupeOptions(optionSource(settings.optionsBtu600, CSV_COLS.BTU_600));
        }
        if (energyKey === ENERGY_KEYS.GAZ_STANDARD) {
          return dedupeOptions(optionSource(settings.optionsBtuGazStandard, CSV_COLS.BTU_GAZ_STANDARD));
        }
        if (energyKey === ENERGY_KEYS.GAZ_COMBI) {
          return dedupeOptions(optionSource(settings.optionsBtuGazCombi, CSV_COLS.BTU_GAZ_COMBI));
        }
        return [];
      }
      case STEP_IDS.FITTING:
        return dedupeOptions(optionSource(settings.optionsFitting, CSV_COLS.FITTING));
      default:
        return [];
    }
  }

  function getFirstStepId() {
    const buildingOptions = getOptionsForStep(STEP_IDS.BUILDING);
    if (
      buildingOptions.length === 1 &&
      !settings.showBuildingQuestionWhenSingleOption
    ) {
      state.answers.building = buildingOptions[0].value;
      return STEP_IDS.PIPES;
    }
    return STEP_IDS.BUILDING;
  }

  function getNextStep(currentStepId) {
    if (currentStepId === STEP_IDS.BUILDING) return STEP_IDS.PIPES;

    if (currentStepId === STEP_IDS.PIPES) {
      return isNo(state.answers.pipes) ? STEP_IDS.INSULATION : STEP_IDS.CIRCUITS;
    }

    if (currentStepId === STEP_IDS.INSULATION) return STEP_IDS.DIAMETER;

    if (currentStepId === STEP_IDS.DIAMETER) {
      return isNineInch(state.answers.diameter) ? STEP_IDS.SURFACE_9 : STEP_IDS.SURFACE_12;
    }

    if (
      currentStepId === STEP_IDS.SURFACE_9 ||
      currentStepId === STEP_IDS.SURFACE_12 ||
      currentStepId === STEP_IDS.CIRCUITS
    ) {
      return STEP_IDS.ENERGY;
    }

    if (currentStepId === STEP_IDS.ENERGY) return STEP_IDS.KNOW_BOILER;

    if (currentStepId === STEP_IDS.KNOW_BOILER) {
      return isYes(state.answers.knowBoiler) ? STEP_IDS.BOILER_MODEL : STEP_IDS.BTU_RANGE;
    }

    if (currentStepId === STEP_IDS.BOILER_MODEL || currentStepId === STEP_IDS.BTU_RANGE) {
      return STEP_IDS.FITTING;
    }

    if (currentStepId === STEP_IDS.FITTING) {
      return STEP_IDS.RESULT;
    }

    return STEP_IDS.RESULT;
  }

  function clearDownstreamAnswers(stepId) {
    if (stepId === STEP_IDS.BUILDING) {
      delete state.answers.pipes;
      delete state.answers.insulation;
      delete state.answers.diameter;
      delete state.answers.surface9;
      delete state.answers.surface12;
      delete state.answers.circuits;
      delete state.answers.energy;
      delete state.answers.knowBoiler;
      delete state.answers.boilerModel;
      delete state.answers.btuRange;
      delete state.answers.fitting;
      return;
    }

    if (stepId === STEP_IDS.PIPES) {
      delete state.answers.insulation;
      delete state.answers.diameter;
      delete state.answers.surface9;
      delete state.answers.surface12;
      delete state.answers.circuits;
    }

    if (stepId === STEP_IDS.DIAMETER) {
      delete state.answers.surface9;
      delete state.answers.surface12;
    }

    if (stepId === STEP_IDS.ENERGY || stepId === STEP_IDS.KNOW_BOILER) {
      delete state.answers.boilerModel;
      delete state.answers.btuRange;
    }

    if (
      stepId === STEP_IDS.INSULATION ||
      stepId === STEP_IDS.SURFACE_9 ||
      stepId === STEP_IDS.SURFACE_12 ||
      stepId === STEP_IDS.CIRCUITS
    ) {
      delete state.answers.energy;
      delete state.answers.knowBoiler;
      delete state.answers.boilerModel;
      delete state.answers.btuRange;
      delete state.answers.fitting;
    }
  }

  function answerKeyForStep(stepId) {
    if (stepId === STEP_IDS.BUILDING) return "building";
    if (stepId === STEP_IDS.PIPES) return "pipes";
    if (stepId === STEP_IDS.INSULATION) return "insulation";
    if (stepId === STEP_IDS.DIAMETER) return "diameter";
    if (stepId === STEP_IDS.SURFACE_9) return "surface9";
    if (stepId === STEP_IDS.SURFACE_12) return "surface12";
    if (stepId === STEP_IDS.CIRCUITS) return "circuits";
    if (stepId === STEP_IDS.ENERGY) return "energy";
    if (stepId === STEP_IDS.KNOW_BOILER) return "knowBoiler";
    if (stepId === STEP_IDS.BOILER_MODEL) return "boilerModel";
    if (stepId === STEP_IDS.BTU_RANGE) return "btuRange";
    if (stepId === STEP_IDS.FITTING) return "fitting";
    return "";
  }

  function calculateTotalVisibleSteps() {
    const includeBuilding =
      settings.showBuildingQuestionWhenSingleOption ||
      getOptionsForStep(STEP_IDS.BUILDING).length > 1;

    let total = includeBuilding ? 1 : 0;
    total += 1; // pipes

    if (!state.answers.pipes || isNo(state.answers.pipes)) {
      total += 3; // insulation + diameter + surface
    } else {
      total += 1; // circuits
    }

    total += 2; // energy + know boiler
    total += 1; // boiler model or btu range
    total += 1; // fitting

    return total;
  }

  function renderStep(stepId) {
    clearError();
    state.currentStepId = stepId;

    const options = getOptionsForStep(stepId);
    if (!options.length) {
      showError(`${settings.noMatchText} (${STEP_LABELS[stepId] || stepId})`);
      return;
    }

    const progressCurrent = state.history.length + 1;
    const progressTotal = calculateTotalVisibleSteps();

    app.innerHTML = `
      <div class="quiz-step" data-step-id="${stepId}">
        <div class="quiz-progress" role="status" aria-live="polite">
          <span class="quiz-progress__text">${progressCurrent} / ${progressTotal}</span>
          <div class="quiz-progress__bar"><span style="width:${Math.min(
            100,
            (progressCurrent / progressTotal) * 100
          )}%"></span></div>
        </div>
        <h3 class="quiz-step__title">${STEP_LABELS[stepId] || ""}</h3>
        <div class="quiz-card-grid"></div>
        <div class="quiz-nav">
          <button type="button" class="quiz-btn quiz-btn--ghost" data-action="back" ${
            state.history.length ? "" : "disabled"
          }>
            ${settings.backBtnText}
          </button>
        </div>
      </div>
    `;

    const grid = app.querySelector(".quiz-card-grid");
    options.forEach((option) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "quiz-card";
      button.dataset.value = option.value;
      button.textContent = option.label;
      button.addEventListener("click", () => {
        const key = answerKeyForStep(stepId);
        if (!key) return;

        clearDownstreamAnswers(stepId);
        state.answers[key] = option.value;

        const nextStep = getNextStep(stepId);
        if (nextStep === STEP_IDS.RESULT) {
          runMatchAndRenderResult();
          return;
        }

        state.history.push(stepId);
        renderStep(nextStep);
      });
      grid.appendChild(button);
    });

    const backButton = app.querySelector('[data-action="back"]');
    if (backButton) {
      backButton.addEventListener("click", () => {
        if (!state.history.length) return;
        const previous = state.history.pop();
        renderStep(previous);
      });
    }

    const firstCard = app.querySelector(".quiz-card");
    if (firstCard) firstCard.focus();
  }

  function buildAnswerVector() {
    const vector = new Array(18).fill("N/A");

    vector[CSV_COLS.BUILDING] = normalize(state.answers.building || "N/A");
    vector[CSV_COLS.PIPES] = normalize(state.answers.pipes || "N/A");

    if (isNo(state.answers.pipes)) {
      vector[CSV_COLS.INSULATION] = normalize(state.answers.insulation || "N/A");
      vector[CSV_COLS.DIAMETER] = normalize(state.answers.diameter || "N/A");

      if (state.answers.surface9) {
        vector[CSV_COLS.SURFACE_9] = normalize(state.answers.surface9);
      }

      if (state.answers.surface12) {
        vector[CSV_COLS.SURFACE_12] = normalize(state.answers.surface12);
      }
    } else {
      vector[CSV_COLS.CIRCUITS] = normalize(state.answers.circuits || "N/A");
    }

    vector[CSV_COLS.ENERGY] = normalize(state.answers.energy || "N/A");
    vector[CSV_COLS.KNOW_BOILER] = normalize(state.answers.knowBoiler || "N/A");

    if (isYes(state.answers.knowBoiler)) {
      const boilerColumn = determineBoilerColumn();
      if (boilerColumn !== null) {
        vector[boilerColumn] = normalize(state.answers.boilerModel || "N/A");
      }
    } else {
      const btuColumn = determineBtuColumn();
      if (btuColumn !== null) {
        vector[btuColumn] = normalize(state.answers.btuRange || "N/A");
      }
    }

    vector[CSV_COLS.FITTING] = normalize(state.answers.fitting || "N/A");

    return vector;
  }

  function rowsEqualWithNa(row, vector) {
    for (let i = 0; i < 18; i += 1) {
      if (normalize(row[i]) !== normalize(vector[i])) {
        return false;
      }
    }
    return true;
  }

  function matchCsvRows() {
    const vector = buildAnswerVector();
    return state.rows.filter((row) => rowsEqualWithNa(row, vector));
  }

  function extractProducts(matchedRow) {
    const products = [];

    for (let i = 18; i < matchedRow.length; i += 2) {
      const sku = normalize(matchedRow[i]);
      const qtyRaw = normalize(matchedRow[i + 1]);
      const qty = parseInt(qtyRaw, 10);

      if (!sku || Number.isNaN(qty) || qty <= 0) continue;

      const mapped = state.skuMap[sku] || {};
      products.push({
        sku,
        qty,
        variantId: mapped.variantId || null,
        title: mapped.title || sku,
        productUrl: mapped.productUrl || "",
        imageUrl: mapped.imageUrl || "",
      });
    }

    return products;
  }

  async function addAllToCart() {
    if (state.isCartSubmitting) return;

    const cartItems = state.products
      .filter((item) => item.variantId)
      .map((item) => ({
        id: item.variantId,
        quantity: item.qty,
      }));

    if (!cartItems.length) {
      showError(settings.unresolvedVariantText);
      return;
    }

    state.isCartSubmitting = true;
    clearError();

    try {
      const response = await fetch("/cart/add.js", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ items: cartItems }),
      });

      if (!response.ok) {
        throw new Error(`Add to cart failed (${response.status})`);
      }

      if (document.querySelector("cart-drawer")) {
        document.dispatchEvent(
          new CustomEvent("dispatch:cart-drawer:refresh", { bubbles: true })
        );
        document.dispatchEvent(
          new CustomEvent("dispatch:cart-drawer:open", { bubbles: true })
        );
      } else {
        window.location.href = "/cart";
      }
    } catch (error) {
      console.error("Ensemble quiz add to cart error", error);
      showError(settings.addToCartErrorText);
    } finally {
      state.isCartSubmitting = false;
    }
  }

  async function handleEmailSubmit(event) {
    event.preventDefault();
    if (state.isEmailSubmitting) return;

    const form = event.currentTarget;
    const firstNameInput = form.querySelector('[name="firstName"]');
    const lastNameInput = form.querySelector('[name="lastName"]');
    const emailInput = form.querySelector('[name="email"]');
    const statusBox = app.querySelector(".quiz-email-status");

    if (!firstNameInput || !lastNameInput || !emailInput || !statusBox) return;

    [firstNameInput, lastNameInput, emailInput].forEach((input) => {
      input.setCustomValidity("");
      if (!normalize(input.value)) {
        input.setCustomValidity(settings.requiredFieldErrorText);
      }
    });

    if (!form.reportValidity()) return;

    if (!settings.n8nWebhookUrl) {
      statusBox.className = "quiz-email-status quiz-email-status--error";
      statusBox.textContent = settings.emailErrorMessage;
      return;
    }

    state.isEmailSubmitting = true;
    statusBox.className = "quiz-email-status";
    statusBox.textContent = settings.loadingText;

    const payload = {
      email: normalize(emailInput.value),
      firstName: normalize(firstNameInput.value),
      lastName: normalize(lastNameInput.value),
      answers: { ...state.answers },
      products: state.products,
      locale: document.documentElement.lang || "",
      shopUrl: window.Shopify && window.Shopify.shop ? window.Shopify.shop : "",
    };

    try {
      const response = await fetch(settings.n8nWebhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Webhook failed (${response.status})`);
      }

      statusBox.className = "quiz-email-status quiz-email-status--success";
      statusBox.textContent = settings.emailSuccessMessage;
      form.querySelectorAll("input,button").forEach((field) => {
        field.disabled = true;
      });
    } catch (error) {
      console.error("Ensemble quiz webhook error", error);
      statusBox.className = "quiz-email-status quiz-email-status--error";
      statusBox.textContent = settings.emailErrorMessage;
    } finally {
      state.isEmailSubmitting = false;
    }
  }

  function renderResult(products) {
    state.currentStepId = STEP_IDS.RESULT;

    const unresolvedCount = products.filter((item) => !item.variantId).length;

    const productsHtml = products.length
      ? products
          .map((product) => {
            const productTitle = product.title || product.sku;
            const unresolvedBadge = product.variantId
              ? ""
              : `<span class="quiz-result-item__badge">${settings.unresolvedVariantText}</span>`;

            return `
              <li class="quiz-result-item">
                <div class="quiz-result-item__main">
                  <p class="quiz-result-item__title">${productTitle}</p>
                  <p class="quiz-result-item__meta">SKU: ${product.sku}</p>
                </div>
                <p class="quiz-result-item__qty">x${product.qty}</p>
                ${unresolvedBadge}
              </li>
            `;
          })
          .join("")
      : `<li class="quiz-result-item quiz-result-item--empty">${settings.noProductsText}</li>`;

    app.innerHTML = `
      <section class="quiz-sandwich-page">
        <h3 class="quiz-result__title">${settings.resultHeading}</h3>
        <ul class="quiz-result-list">${productsHtml}</ul>
        ${
          unresolvedCount
            ? `<p class="quiz-result__hint">${settings.unresolvedVariantText}</p>`
            : ""
        }

        <div class="quiz-result__actions">
          <button type="button" class="quiz-btn" data-action="add-all">
            ${settings.addToCartBtnText}
          </button>
          <button type="button" class="quiz-btn quiz-btn--ghost" data-action="restart">
            ${settings.restartBtnText}
          </button>
        </div>

        <div class="quiz-email-wrap">
          <h4 class="quiz-email-wrap__title">${settings.emailFormHeading}</h4>
          <form class="quiz-email-form" novalidate>
            <label class="quiz-email-form__field">
              <span>${settings.labelFirstName}</span>
              <input type="text" name="firstName" placeholder="${settings.placeholderFirstName}" required>
            </label>
            <label class="quiz-email-form__field">
              <span>${settings.labelLastName}</span>
              <input type="text" name="lastName" placeholder="${settings.placeholderLastName}" required>
            </label>
            <label class="quiz-email-form__field">
              <span>${settings.labelEmail}</span>
              <input type="email" name="email" placeholder="${settings.placeholderEmail}" required>
            </label>
            <button type="submit" class="quiz-btn">${settings.sendPdfBtnText}</button>
          </form>
          <p class="quiz-email-status" aria-live="polite"></p>
        </div>
      </section>
    `;

    const addAllButton = app.querySelector('[data-action="add-all"]');
    if (addAllButton) addAllButton.addEventListener("click", addAllToCart);

    const restartButton = app.querySelector('[data-action="restart"]');
    if (restartButton) {
      restartButton.addEventListener("click", () => {
        state.answers = {};
        state.history = [];
        state.products = [];
        const firstStep = getFirstStepId();
        renderStep(firstStep);
      });
    }

    const emailForm = app.querySelector(".quiz-email-form");
    if (emailForm) emailForm.addEventListener("submit", handleEmailSubmit);
  }

  function runMatchAndRenderResult() {
    clearError();
    const matches = matchCsvRows();

    if (matches.length === 0) {
      showError(settings.noMatchText);
      return;
    }

    if (matches.length > 1) {
      showError(settings.multipleMatchText);
      return;
    }

    const products = extractProducts(matches[0]);
    state.products = products;
    renderResult(products);
  }

  async function init() {
    app.innerHTML = `<p class="quiz-loading">${settings.loadingText}</p>`;

    try {
      await loadCsvData();
      loadSkuVariantMap();

      const firstStep = getFirstStepId();
      state.history = [];
      renderStep(firstStep);
    } catch (error) {
      console.error("Ensemble quiz initialization error", error);
      showError(error.message || settings.noMatchText);
      app.innerHTML = "";
    }
  }

  init();
}
