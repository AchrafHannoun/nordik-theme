document.addEventListener("DOMContentLoaded", () => {
    const kitBuilderContainers = document.querySelectorAll(
        '[id^="kit-builder-"]'
    );

    kitBuilderContainers.forEach((container) => {
        if (!container.hasAttribute("data-section-id")) {
            return;
        }
        initializeKitBuilder(container);
    });
});

function initializeKitBuilder(container) {
    const sectionId = container.dataset.sectionId;

    const errorDisplay = document.getElementById(
        `kit-builder-error-${sectionId}`
    );
    const stepUnitType = document.getElementById(
        `kit-builder-step-unit-type-${sectionId}`
    );
    const stepUnitDetails = document.getElementById(
        `kit-builder-step-unit-details-${sectionId}`
    );
    const stepSummary = document.getElementById(
        `kit-builder-step-summary-${sectionId}`
    );
    const stepResults = document.getElementById(
        `kit-builder-step-results-${sectionId}`
    );
    const allSteps = [stepUnitType, stepUnitDetails, stepSummary, stepResults];

    const stepUnitTypeTitle = document.getElementById(
        `kit-builder-step-unit-type-title-${sectionId}`
    );
    const stepUnitDetailsTitle = document.getElementById(
        `kit-builder-step-unit-details-title-${sectionId}`
    );

    const unitTypeSelect = document.getElementById(`unit-type-${sectionId}`);
    const unitDistanceSelect = document.getElementById(
        `unit-distance-${sectionId}`
    );
    const unitRevetementSelect = document.getElementById(
        `unit-revetement-${sectionId}`
    );
    const unitSuperficieSelect = document.getElementById(
        `unit-superficie-${sectionId}`
    );

    const nextToDetailsBtn = document.getElementById(
        `kit-builder-next-to-details-${sectionId}`
    );
    const prevToTypeBtn = document.getElementById(
        `kit-builder-prev-to-type-${sectionId}`
    );
    const saveUnitBtn = document.getElementById(
        `kit-builder-save-unit-${sectionId}`
    );
    const addAnotherYesBtn = document.getElementById(
        `kit-builder-add-another-yes-${sectionId}`
    );
    const addAnotherNoBtn = document.getElementById(
        `kit-builder-add-another-no-${sectionId}`
    );
    const addToCartLink = document.getElementById(
        `kit-builder-add-to-cart-link-${sectionId}`
    );
    const restartBtn = document.getElementById(
        `kit-builder-restart-${sectionId}`
    );

    const unitsSummaryList = document.getElementById(
        `kit-builder-units-summary-list-${sectionId}`
    );
    const resultsContent = document.getElementById(
        `kit-builder-results-content-${sectionId}`
    );
    const skuVariantMapScript = document.getElementById(
        `kit-builder-sku-variant-map-${sectionId}`
    );

    const settings = {
        csvUrl: container.dataset.csvUrl,
        placeholderText: container.dataset.placeholderText,
        singleInstanceSkus: (container.dataset.singleInstanceSkus || "")
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
        labelUnitType: container.dataset.labelUnitType,
        labelDistance: container.dataset.labelDistance,
        labelRevetement: container.dataset.labelRevetement,
        labelSuperficie: container.dataset.labelSuperficie,
        labelAddAnotherUnitQ: container.dataset.labelAddAnotherUnitQ,
        btnYes: container.dataset.btnYes,
        btnNoFinalize: container.dataset.btnNoFinalize,
        btnSaveUnit: container.dataset.btnSaveUnit,
        btnNextStep: container.dataset.btnNextStep,
        btnPrevStep: container.dataset.btnPrevStep,
        btnEditUnit: container.dataset.btnEditUnit,
        btnRemoveUnit: container.dataset.btnRemoveUnit,
        btnAddtoCart: container.dataset.btnAddtoCart,
        btnRestart: container.dataset.btnRestart,
        titleStepUnitConfigTemplate: container.dataset.titleStepUnitConfigTemplate,
        titleStepUnitDetailsTemplate:
            container.dataset.titleStepUnitDetailsTemplate,
        titleStepSummary: container.dataset.titleStepSummary,
        titleStepResults: container.dataset.titleStepResults,
        textProductsForCart: container.dataset.textProductsForCart,
        textRecommendedTools: container.dataset.textRecommendedTools,
        textSingleInstanceItemsTitle: container.dataset.textSingleInstanceItemsTitle || "Common Kit Components",
        textNoProductsConfigured: container.dataset.textNoProductsConfigured,
        textNoToolsRecommended: container.dataset.textNoToolsRecommended,
        textConfirmDeleteUnit: container.dataset.textConfirmDeleteUnit,
        errorCsvLoad: container.dataset.errorCsvLoad,
        errorNoVariantMap: container.dataset.errorNoVariantMap,
        errorValidationPrefix: container.dataset.errorValidationPrefix,
        errorSelectOption: container.dataset.errorSelectOption,
        summaryUnitTemplate: container.dataset.summaryUnitTemplate,
        errorCsvFilenameInvalid: container.dataset.errorCsvFilenameInvalid || "CSV filename is not configured or invalid.",
        errorCsvDataInsufficient: container.dataset.errorCsvDataInsufficient || "CSV data insufficient. Requires at least one header row and one data row.",
        errorMapScriptTagSuffix: container.dataset.errorMapScriptTagSuffix || " (Map script tag not found or empty)",
        errorMapJsonParsingSuffixTemplate: container.dataset.errorMapJsonParsingSuffixTemplate || " (JSON parsing error: {errorMessage})",
        errorCsvMissingColsBatDist: container.dataset.errorCsvMissingColsBatDist || "CSV is missing required columns (batiment, distance).",
        errorCsvMissingColRevetement: container.dataset.errorCsvMissingColRevetement || "CSV is missing required column (revetement).",
        errorCsvMissingColSuperficie: container.dataset.errorCsvMissingColSuperficie || "CSV is missing required column (superficie).",
        errorMinOneUnitForResults: container.dataset.errorMinOneUnitForResults || "Please configure at least one unit before viewing results.",
        textResultsProductsTitleSuffix: container.dataset.textResultsProductsTitleSuffix || "",
        textResultsNoProductsSuffix: container.dataset.textResultsNoProductsSuffix || "",
        textResultsToolsTitleSuffix: container.dataset.textResultsToolsTitleSuffix || "",
        textResultsNoToolsSuffix: container.dataset.textResultsNoToolsSuffix || "",
    };

    let csvData = { headers: [], records: [] };
    let skuToVariantMap = {};
    let configuredUnits = [];
    let currentUnitIndex = -1;
    let nextUnitInternalId = 1;
    let currentVisibleStep = null;

    const CSV_COLS = {
        BATIMENT: "batiment",
        DISTANCE: "distance",
        REVETEMENT: "revetement",
        SUPERFICIE: "superficie",
        SKU_PREFIX: "sku",
        QTY_PREFIX: "qty",
    };

    function showError(message) {
        if (errorDisplay) {
            errorDisplay.textContent = message;
            errorDisplay.style.display = "block";
        }
        console.error(`KitBuilder [${sectionId}]: ${message}`);
    }

    function clearError() {
        if (errorDisplay) {
            errorDisplay.textContent = "";
            errorDisplay.style.display = "none";
        }
    }

    function showCurrentStep(stepElement) {
        clearError();
        allSteps.forEach((s) => { if (s) s.style.display = "none" });
        if (stepElement) {
            stepElement.style.display = "block";
        }
        currentVisibleStep = stepElement;
        if (stepElement === stepSummary) {
        if (container) {
            container.scrollIntoView({
                behavior: 'smooth',
                block: 'start'    
            });
        }
    }
    }

    function populateDropdown(selectElement, options, includePlaceholder = true) {
        if (!selectElement) return;
        const currentValue = selectElement.value;
        selectElement.innerHTML = "";
        if (includePlaceholder) {
            const placeholder = document.createElement("option");
            placeholder.value = "";
            placeholder.textContent = settings.placeholderText;
            selectElement.appendChild(placeholder);
        }
        const uniqueOptions = [...new Set(options)]
            .filter(Boolean)
            .sort((a, b) =>
                String(a).localeCompare(String(b), undefined, { numeric: true })
            );
        uniqueOptions.forEach((optionValue) => {
            const option = document.createElement("option");
            option.value = optionValue;
            option.textContent = optionValue;
            selectElement.appendChild(option);
        });
        if (uniqueOptions.includes(currentValue)) {
            selectElement.value = currentValue;
        } else {
            selectElement.value = "";
        }
    }

    function resetUnitDetailDropdowns() {
        populateDropdown(unitDistanceSelect, []);
        populateDropdown(unitRevetementSelect, []);
        populateDropdown(unitSuperficieSelect, []);
    }

    function validateField(selectElement, fieldNameKey) {
        const fieldName = settings[fieldNameKey] || fieldNameKey;
        if (!selectElement || !selectElement.value) {
            showError(
                settings.errorValidationPrefix +
                settings.errorSelectOption.replace("{fieldName}", fieldName)
            );
            if (selectElement) selectElement.focus();
            return false;
        }
        return true;
    }

    async function loadCsvData() {
        if (
            !settings.csvUrl ||
            settings.csvUrl === '{{ "" | file_url }}' ||
            settings.csvUrl.endsWith("/")
        ) {
            showError(
                settings.errorCsvLoad + settings.errorCsvFilenameInvalid
            );
            return false;
        }
        try {
            const response = await fetch(settings.csvUrl);
            if (!response.ok) {
                throw new Error(`Network response was not ok: ${response.statusText}`);
            }
            const text = await response.text();
            const allRows = text
                .trim()
                .split(/\r?\n/)
                .map((row) => row.split(",").map((cell) => cell.trim()));

            if (allRows.length < 2) {
                throw new Error(settings.errorCsvDataInsufficient);
            }
            csvData.headers = allRows[0].map(h => h.toLowerCase());
            csvData.records = allRows.slice(1);
            return true;
        } catch (error) {
            showError(settings.errorCsvLoad + error.message);
            return false;
        }
    }

    function loadSkuVariantMap() {
        if (!skuVariantMapScript || !skuVariantMapScript.textContent) {
            showError(
                settings.errorNoVariantMap + settings.errorMapScriptTagSuffix
            );
            return false;
        }
        try {
            skuToVariantMap = JSON.parse(skuVariantMapScript.textContent);
            return true;
        } catch (error) {
            showError(
                settings.errorNoVariantMap + settings.errorMapJsonParsingSuffixTemplate.replace("{errorMessage}", error.message)
            );
            return false;
        }
    }

    function startUnitConfiguration(unitToEdit = null) {
        clearError();
        resetUnitDetailDropdowns();

        if (unitToEdit) {
            currentUnitIndex = configuredUnits.findIndex(
                (u) => u.id === unitToEdit.id
            );
            unitTypeSelect.value = unitToEdit.type;
            if (unitToEdit.typeDisplay) {
                const targetText = unitToEdit.typeDisplay.trim();
                for (let i = 0; i < unitTypeSelect.options.length; i++) {
                    if (unitTypeSelect.options[i].text.trim() === targetText && unitTypeSelect.options[i].value === unitToEdit.type) {
                        unitTypeSelect.selectedIndex = i;
                        break;
                    }
                }
            }
        } else {
            currentUnitIndex = -1;
            if (unitTypeSelect) unitTypeSelect.value = "";
        }

        const unitNumber =
            currentUnitIndex !== -1
                ? configuredUnits[currentUnitIndex].displayNumber
                : configuredUnits.length + 1;

        if (stepUnitTypeTitle) {
            stepUnitTypeTitle.textContent =
                settings.titleStepUnitConfigTemplate.replace("{unit_number}", unitNumber);
        }

        showCurrentStep(stepUnitType);

        if (unitToEdit) {
            handleUnitTypeChange(unitToEdit);
        }
    }

    function handleUnitTypeChange(prefillData = null) {
        const selectedType = unitTypeSelect.value;
        resetUnitDetailDropdowns();

        if (!selectedType || csvData.records.length === 0) return;

        const batimentColIndex = csvData.headers.indexOf(CSV_COLS.BATIMENT);
        const distanceColIndex = csvData.headers.indexOf(CSV_COLS.DISTANCE);

        if (batimentColIndex === -1 || distanceColIndex === -1) {
            showError(settings.errorCsvMissingColsBatDist);
            return;
        }

        const relevantRecords = csvData.records.filter(
            (record) => record[batimentColIndex] === selectedType
        );
        const distanceOptions = relevantRecords.map(
            (record) => record[distanceColIndex]
        );
        populateDropdown(unitDistanceSelect, distanceOptions);

        if (prefillData && prefillData.distance) {
            unitDistanceSelect.value = prefillData.distance;
            handleDistanceChange(prefillData);
        }
    }

    function handleDistanceChange(prefillData = null) {
        const selectedType = unitTypeSelect.value;
        const selectedDistance = unitDistanceSelect.value;
        populateDropdown(unitRevetementSelect, []);
        populateDropdown(unitSuperficieSelect, []);

        if (!selectedType || !selectedDistance || csvData.records.length === 0) return;

        const batimentColIndex = csvData.headers.indexOf(CSV_COLS.BATIMENT);
        const distanceColIndex = csvData.headers.indexOf(CSV_COLS.DISTANCE);
        const revetementColIndex = csvData.headers.indexOf(CSV_COLS.REVETEMENT);

        if (revetementColIndex === -1) {
            showError(settings.errorCsvMissingColRevetement);
            return;
        }

        const relevantRecords = csvData.records.filter(
            (record) =>
                record[batimentColIndex] === selectedType &&
                record[distanceColIndex] === selectedDistance
        );
        const revetementOptions = relevantRecords.map(
            (record) => record[revetementColIndex]
        );
        populateDropdown(unitRevetementSelect, revetementOptions);

        if (prefillData && prefillData.revetement) {
            unitRevetementSelect.value = prefillData.revetement;
            handleRevetementChange(prefillData);
        }
    }

    function handleRevetementChange(prefillData = null) {
        const selectedType = unitTypeSelect.value;
        const selectedDistance = unitDistanceSelect.value;
        const selectedRevetement = unitRevetementSelect.value;
        populateDropdown(unitSuperficieSelect, []);

        if (!selectedType || !selectedDistance || !selectedRevetement || csvData.records.length === 0) return;

        const batimentColIndex = csvData.headers.indexOf(CSV_COLS.BATIMENT);
        const distanceColIndex = csvData.headers.indexOf(CSV_COLS.DISTANCE);
        const revetementColIndex = csvData.headers.indexOf(CSV_COLS.REVETEMENT);
        const superficieColIndex = csvData.headers.indexOf(CSV_COLS.SUPERFICIE);

        if (superficieColIndex === -1) {
            showError(settings.errorCsvMissingColSuperficie);
            return;
        }

        const relevantRecords = csvData.records.filter(
            (record) =>
                record[batimentColIndex] === selectedType &&
                record[distanceColIndex] === selectedDistance &&
                record[revetementColIndex] === selectedRevetement
        );
        const superficieOptions = relevantRecords.map(
            (record) => record[superficieColIndex]
        );
        populateDropdown(unitSuperficieSelect, superficieOptions);

        if (prefillData && prefillData.superficie) {
            unitSuperficieSelect.value = prefillData.superficie;
        }
    }

    function proceedToUnitDetails() {
        if (!validateField(unitTypeSelect, "labelUnitType")) return;

        const unitNumber =
            currentUnitIndex !== -1
                ? configuredUnits[currentUnitIndex].displayNumber
                : configuredUnits.length + 1;
        const selectedOptionText =
            unitTypeSelect.options[unitTypeSelect.selectedIndex].text;

        if (stepUnitDetailsTitle) {
            stepUnitDetailsTitle.textContent = settings.titleStepUnitDetailsTemplate
                .replace("{unit_number}", unitNumber)
                .replace("{unit_type}", selectedOptionText);
        }

        if (currentUnitIndex !== -1) {
            const unit = configuredUnits[currentUnitIndex];
            if (unitTypeSelect.value === unit.type) {
                handleUnitTypeChange(unit);
            } else {
                handleUnitTypeChange();
            }
        } else {
            handleUnitTypeChange();
        }
        showCurrentStep(stepUnitDetails);
    }

    function saveCurrentUnit() {
        if (
            !validateField(unitTypeSelect, "labelUnitType") ||
            !validateField(unitDistanceSelect, "labelDistance") ||
            !validateField(unitRevetementSelect, "labelRevetement") ||
            !validateField(unitSuperficieSelect, "labelSuperficie")
        ) {
            return;
        }

        const selectedOptionText =
            unitTypeSelect.options[unitTypeSelect.selectedIndex].text;

        const unitData = {
            type: unitTypeSelect.value,
            typeDisplay: selectedOptionText,
            distance: unitDistanceSelect.value,
            revetement: unitRevetementSelect.value,
            superficie: unitSuperficieSelect.value,
        };

        if (currentUnitIndex !== -1) {
            configuredUnits[currentUnitIndex] = {
                ...configuredUnits[currentUnitIndex],
                ...unitData,
            };
        } else {
            unitData.id = nextUnitInternalId++;
            unitData.displayNumber = configuredUnits.length + 1;
            configuredUnits.push(unitData);
        }
        renderSummaryView();
    }

    function deleteUnit(unitIdToDelete) {
        if (!confirm(settings.textConfirmDeleteUnit)) return;

        configuredUnits = configuredUnits.filter(
            (unit) => unit.id !== unitIdToDelete
        );
        configuredUnits.forEach((unit, index) => {
            unit.displayNumber = index + 1;
        });

        if (configuredUnits.length === 0) {
            startUnitConfiguration();
        } else {
            renderSummaryView();
        }
    }

    function renderSummaryView() {
        if (!unitsSummaryList) return;
        unitsSummaryList.innerHTML = "";

        if (configuredUnits.length === 0) {
            startUnitConfiguration();
            return;
        }

        configuredUnits.forEach((unit) => {
            const summaryItem = document.createElement("div");
            summaryItem.classList.add("kit-builder-summary-item");

            let summaryText = settings.summaryUnitTemplate
                .replace("{unit_number}", unit.displayNumber)
                .replace("{type}", unit.typeDisplay)
                .replace("{distance}", unit.distance)
                .replace("{revetement}", unit.revetement)
                .replace("{superficie}", unit.superficie);

            summaryItem.innerHTML = `
        <p>${summaryText}</p>
       <!--  <div class="kit-builder-summary-item-actions">
          <button type="button" class="kit-builder-button kit-builder-edit-unit-btn" data-unit-id="${unit.id}">${settings.btnEditUnit}</button>
          <button type="button" class="kit-builder-button kit-builder-remove-unit-btn kit-builder-danger-btn" data-unit-id="${unit.id}">${settings.btnRemoveUnit}</button>
        </div> -->
      `;
            unitsSummaryList.appendChild(summaryItem);
        });

        unitsSummaryList
            .querySelectorAll(".kit-builder-edit-unit-btn")
            .forEach((btn) => {
                btn.addEventListener("click", (e) => {
                    const unitId = parseInt(e.target.dataset.unitId);
                    const unitToEdit = configuredUnits.find((u) => u.id === unitId);
                    if (unitToEdit) startUnitConfiguration(unitToEdit);
                });
            });

        unitsSummaryList
            .querySelectorAll(".kit-builder-remove-unit-btn")
            .forEach((btn) => {
                btn.addEventListener("click", (e) => {
                    const unitId = parseInt(e.target.dataset.unitId);
                    deleteUnit(unitId);
                });
            });

        showCurrentStep(stepSummary);
    }

    function renderResultsView() {
        console.error(`KitBuilder [${sectionId}] DEBUG: renderResultsView CALLED. Configured units:`, JSON.stringify(configuredUnits));
        if (configuredUnits.length === 0) {
            showError(settings.errorMinOneUnitForResults);
            startUnitConfiguration();
            return;
        }

        if (!resultsContent || !addToCartLink) {
            console.error(`KitBuilder [${sectionId}] DEBUG: resultsContent or addToCartLink is missing.`);
            return;
        }

        resultsContent.innerHTML = "";
        addToCartLink.style.display = "none";
        addToCartLink.href = "#";

        const allItemsFromAllUnits = [];
        const batimentCol = csvData.headers.indexOf(CSV_COLS.BATIMENT);
        const distanceCol = csvData.headers.indexOf(CSV_COLS.DISTANCE);
        const revetementCol = csvData.headers.indexOf(CSV_COLS.REVETEMENT);
        const superficieCol = csvData.headers.indexOf(CSV_COLS.SUPERFICIE);

        configuredUnits.forEach((unit) => {
            const matchingRow = csvData.records.find(
                (row) =>
                    row[batimentCol] === unit.type &&
                    row[distanceCol] === unit.distance &&
                    row[revetementCol] === unit.revetement &&
                    row[superficieCol] === unit.superficie
            );
            console.error(`KitBuilder [${sectionId}] DEBUG: Unit ${unit.id} Matching Row:`, matchingRow ? JSON.stringify(matchingRow) : 'No Match');

            if (matchingRow) {
                csvData.headers.forEach((header, colIndex) => {
                    const skuValue = String(matchingRow[colIndex] || "").trim();
                    if (!skuValue || skuValue === "0") return;

                    let itemType = null;
                    let itemOrderNum = -1;
                    let qtyPrefix = "";
                    let skuPrefix = "";

                    if (header.startsWith(CSV_COLS.SKU_PREFIX)) {
                        itemType = "product";
                        skuPrefix = CSV_COLS.SKU_PREFIX;
                        qtyPrefix = CSV_COLS.QTY_PREFIX;
                    }

                    if (itemType) {
                        const numStr = header.substring(skuPrefix.length);
                        itemOrderNum = parseInt(numStr, 10);
                        const qtyHeader = qtyPrefix + numStr;
                        const qtyColIndex = csvData.headers.indexOf(qtyHeader);

                        if (qtyColIndex !== -1 && !isNaN(itemOrderNum)) {
                            const qty = parseInt(matchingRow[qtyColIndex], 10);
                            if (qty > 0) {
                                const productDetails = skuToVariantMap[skuValue] || {};
                                allItemsFromAllUnits.push({
                                    sku: skuValue,
                                    quantity: qty,
                                    order: itemOrderNum,
                                    type: itemType,
                                    unitId: unit.id,
                                    variantId: productDetails.variantId || null,
                                    title: productDetails.title || skuValue,
                                    productUrl: productDetails.productUrl || "#",
                                    imageUrl: productDetails.imageUrl || "",
                                });
                            }
                        }
                    }
                });
            }
        });
        console.error(`KitBuilder [${sectionId}] DEBUG: allItemsFromAllUnits POPULATED:`, JSON.stringify(allItemsFromAllUnits));

        // Moved createItemHtml to be accessible by both loops
        const createItemHtml = (item) => {
            let itemHtml = `<li class="kit-builder-result-item">`;
            if (item.imageUrl && typeof item.imageUrl === 'string' && item.imageUrl.trim() !== '' && !item.imageUrl.startsWith('Liquid error')) {
                itemHtml += `<img src="${item.imageUrl.trim()}" alt="${String(item.title || item.sku || '').trim()}" class="kit-builder-item-image">`;
            } else {
                itemHtml += `<div class="kit-builder-item-image-placeholder"></div>`;
            }
            itemHtml += `<div class="kit-builder-item-details">`;
            const displayTitle = String(item.title || item.sku || 'Titre non disponible').trim();
            itemHtml += `  <div class="kit-builder-item-title-wrapper">`;
            itemHtml += `    <a href="${item.productUrl || '#'}" class="kit-builder-item-title" target="_blank">${displayTitle}</a>`;
            itemHtml += `  </div>`;
            itemHtml += `  <div class="kit-builder-item-quantity-wrapper">`;
            itemHtml += `    <span class="kit-builder-item-quantity">Qty: ${item.quantity}</span>`;
            itemHtml += `  </div>`;
            itemHtml += `</div></li>`;
            return itemHtml;
        };

        let resultsHTML = "";
        let anyProductsDisplayedThisSession = false;
        const collectedSingleInstanceItemsMap = new Map();
        const regularItemsByUnitId = new Map();

        allItemsFromAllUnits.forEach(item => {
            if (item.type === 'product') {
                if (settings.singleInstanceSkus.includes(item.sku)) {
                    if (!collectedSingleInstanceItemsMap.has(item.sku)) {
                        collectedSingleInstanceItemsMap.set(item.sku, { ...item });
                    }
                } else {
                    const itemsForCurrentUnit = regularItemsByUnitId.get(item.unitId) || [];
                    itemsForCurrentUnit.push(item);
                    regularItemsByUnitId.set(item.unitId, itemsForCurrentUnit);
                }
            }
        });
        console.error(`KitBuilder [${sectionId}] DEBUG: regularItemsByUnitId POPULATED:`, JSON.stringify(Array.from(regularItemsByUnitId.entries())));
        console.error(`KitBuilder [${sectionId}] DEBUG: collectedSingleInstanceItemsMap POPULATED:`, JSON.stringify(Array.from(collectedSingleInstanceItemsMap.entries())));


        if (configuredUnits.length > 0) {
            configuredUnits.forEach((unit, index) => {
                const unitDescription = settings.summaryUnitTemplate
                    .replace("{unit_number}", unit.displayNumber)
                    .replace("{type}", unit.typeDisplay)
                    .replace("{distance}", unit.distance)
                    .replace("{revetement}", unit.revetement)
                    .replace("{superficie}", unit.superficie);

                resultsHTML += `<div class="kit-builder-results-unit-group">`;
                resultsHTML += `<h4 class="kit-builder-results-unit-title">${unitDescription}</h4>`;

                const regularProductsForThisUnit = (regularItemsByUnitId.get(unit.id) || []).sort((a, b) => a.order - b.order);
                console.error(`KitBuilder [${sectionId}] DEBUG: Processing unit for display: ${unit.id}, Regular Products:`, JSON.stringify(regularProductsForThisUnit));

                if (regularProductsForThisUnit.length > 0) {
                    anyProductsDisplayedThisSession = true;
                    resultsHTML += `<h5 class="kit-builder-results-section-title">${settings.textProductsForCart}${settings.textResultsProductsTitleSuffix}</h5><ul class="kit-builder-result-list">`;
                    regularProductsForThisUnit.forEach((product) => {
                        resultsHTML += createItemHtml(product);
                    });
                    resultsHTML += `</ul>`;
                } else {
                    console.error(`KitBuilder [${sectionId}] DEBUG: No regular products for unit ${unit.id}`);
                    resultsHTML += `<p class="kit-builder-no-results-text">${settings.textNoProductsConfigured}${settings.textResultsNoProductsSuffix}</p>`;
                }
                resultsHTML += `</div>`;
                if (index < configuredUnits.length - 1) {
                    resultsHTML += `<hr class="kit-builder-unit-separator">`;
                }
            });

            if (collectedSingleInstanceItemsMap.size > 0) {
                anyProductsDisplayedThisSession = true;
                resultsHTML += `<div class="kit-builder-results-unit-group kit-builder-single-instance-group">`;
                resultsHTML += `<h5 class="kit-builder-results-section-title">${settings.textSingleInstanceItemsTitle}</h5>`;
                resultsHTML += `<ul class="kit-builder-result-list">`;
                collectedSingleInstanceItemsMap.forEach(item => {
                    resultsHTML += createItemHtml(item);
                });
                resultsHTML += `</ul></div>`;
            }

            if (anyProductsDisplayedThisSession) {
                resultsHTML += `<p class="kit-builder-no-results-text">${settings.textNoToolsRecommended}</p>`;
            }

        } else {
            resultsHTML = `<p class="kit-builder-no-results-text">${settings.textNoProductsConfigured}</p>`;
        }
        console.error(`KitBuilder [${sectionId}] DEBUG: Final resultsHTML:`, resultsHTML);
        resultsContent.innerHTML = resultsHTML;

        const finalCartProductsMap = {};
        const addedSingleInstanceSkus = new Set();

        allItemsFromAllUnits
            .filter((item) => item.type === "product")
            .forEach((item) => {
                if (settings.singleInstanceSkus.includes(item.sku)) {
                    if (!addedSingleInstanceSkus.has(item.sku)) {
                        finalCartProductsMap[item.sku] = {
                            sku: item.sku,
                            quantity: item.quantity,
                            order: item.order,
                            variantId: item.variantId,
                            title: item.title
                        };
                        addedSingleInstanceSkus.add(item.sku);
                    }
                } else {
                    if (!finalCartProductsMap[item.sku]) {
                        finalCartProductsMap[item.sku] = {
                            sku: item.sku,
                            quantity: 0,
                            order: item.order,
                            variantId: item.variantId,
                            title: item.title
                        };
                    }
                    finalCartProductsMap[item.sku].quantity += item.quantity;
                }
            });

        const sortedCartProductsForLink = Object.values(finalCartProductsMap).sort(
            (a, b) => b.order - a.order
        );

        const cartItemsParams = [];
        if (sortedCartProductsForLink.length > 0) {
            sortedCartProductsForLink.forEach((product) => {
                if (product.variantId && product.quantity > 0) {
                    cartItemsParams.push(
                        `items[][id]=${product.variantId}&items[][quantity]=${product.quantity}`
                    );
                }
            });

            if (cartItemsParams.length > 0) {
                const returnTo = encodeURIComponent('/cart?utm_medium=calculator');
                  addToCartLink.href = `/cart/add?${cartItemsParams.join("&")}&return_to=${returnTo}`;
                addToCartLink.style.display = "inline-block";
            }
        }
        showCurrentStep(stepResults);
    }

    function restartConfiguration() {
        configuredUnits = [];
        currentUnitIndex = -1;
        nextUnitInternalId = 1;
        clearError();
        resetUnitDetailDropdowns();
        if (unitTypeSelect) unitTypeSelect.value = "";
        if (resultsContent) resultsContent.innerHTML = "";
        if (addToCartLink) {
            addToCartLink.style.display = "none";
            addToCartLink.href = "#";
        }
        if (unitsSummaryList) unitsSummaryList.innerHTML = "";

        startUnitConfiguration();
    }

    if (unitTypeSelect) unitTypeSelect.addEventListener("change", () => handleUnitTypeChange());
    if (unitDistanceSelect) unitDistanceSelect.addEventListener("change", () => handleDistanceChange());
    if (unitRevetementSelect) unitRevetementSelect.addEventListener("change", () => handleRevetementChange());

    if (nextToDetailsBtn) nextToDetailsBtn.addEventListener("click", proceedToUnitDetails);
    if (prevToTypeBtn) {
        prevToTypeBtn.addEventListener("click", () => {
            const unitNumber =
                currentUnitIndex !== -1
                    ? configuredUnits[currentUnitIndex].displayNumber
                    : configuredUnits.length + 1;
            if (stepUnitTypeTitle) {
                stepUnitTypeTitle.textContent =
                    settings.titleStepUnitConfigTemplate.replace("{unit_number}", unitNumber);
            }
            showCurrentStep(stepUnitType);
        });
    }
    if (saveUnitBtn) saveUnitBtn.addEventListener("click", saveCurrentUnit);

    if (addAnotherYesBtn) {
        addAnotherYesBtn.addEventListener("click", () => {
            startUnitConfiguration();
        });
    }
    if (addAnotherNoBtn) {
        addAnotherNoBtn.addEventListener("click", () => {
            if (configuredUnits.length > 0) {
                renderResultsView();
            } else {
                showError(settings.errorMinOneUnitForResults);
                startUnitConfiguration();
            }
        });
    }
    if (restartBtn) restartBtn.addEventListener("click", restartConfiguration);

    async function init() {
        const csvLoaded = await loadCsvData();
        const mapLoaded = loadSkuVariantMap();

        if (!csvLoaded) {
            const elementsToDisable = [
                unitTypeSelect, unitDistanceSelect, unitRevetementSelect, unitSuperficieSelect,
                nextToDetailsBtn, saveUnitBtn
            ];
            elementsToDisable.forEach(el => { if (el) el.disabled = true; });
            return;
        }
        startUnitConfiguration();
    }

    init()
}