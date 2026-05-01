(function(global) {
    const SUBMISSION_HEADERS = [
        "Reviewer",
        "Group Name",
        "Member Name",
        "Dev Value",
        "Report Value",
        "Dev Comments",
        "Report Comments"
    ];

    function normalizeText(value) {
        return String(value ?? "").trim();
    }

    function parseScore(value) {
        const trimmed = normalizeText(value);
        if (trimmed === "") return null;

        const score = Number(trimmed);
        if (!Number.isFinite(score) || score < 0 || score > 100) return null;
        return score;
    }

    function parseRosterRows(rows) {
        const groupMap = {};

        rows.forEach(row => {
            const values = Array.isArray(row) ? row : Object.values(row ?? {});
            const name = normalizeText(values[0]);
            const group = normalizeText(values[1]);

            if (!name || !group) return;
            if (!groupMap[group]) groupMap[group] = [];
            groupMap[group].push(name);
        });

        return groupMap;
    }

    function validateSubmissionResults(results) {
        const errors = [];
        const rows = [];
        const headers = Array.isArray(results.meta?.fields) ? results.meta.fields : [];
        const missingHeaders = SUBMISSION_HEADERS.filter(header => !headers.includes(header));

        if (results.errors?.length) {
            results.errors.forEach(error => {
                const rowLabel = typeof error.row === "number" ? `row ${error.row + 2}` : "unknown row";
                errors.push(`${rowLabel}: ${error.message}`);
            });
        }

        if (missingHeaders.length) {
            errors.push(`Missing required columns: ${missingHeaders.join(", ")}`);
        }

        if (!Array.isArray(results.data) || results.data.length === 0) {
            errors.push("File contains no data rows.");
        }

        if (errors.length) {
            return { isValid: false, errors, rows: [] };
        }

        results.data.forEach((row, index) => {
            const rowNumber = index + 2;
            const normalizedRow = {
                "Reviewer": normalizeText(row["Reviewer"]),
                "Group Name": normalizeText(row["Group Name"]),
                "Member Name": normalizeText(row["Member Name"]),
                "Dev Value": parseScore(row["Dev Value"]),
                "Report Value": parseScore(row["Report Value"]),
                "Dev Comments": normalizeText(row["Dev Comments"]),
                "Report Comments": normalizeText(row["Report Comments"])
            };

            if (!normalizedRow["Reviewer"]) errors.push(`row ${rowNumber}: Reviewer is required.`);
            if (!normalizedRow["Group Name"]) errors.push(`row ${rowNumber}: Group Name is required.`);
            if (!normalizedRow["Member Name"]) errors.push(`row ${rowNumber}: Member Name is required.`);
            if (normalizedRow["Dev Value"] === null) errors.push(`row ${rowNumber}: Dev Value must be a number from 0 to 100.`);
            if (normalizedRow["Report Value"] === null) errors.push(`row ${rowNumber}: Report Value must be a number from 0 to 100.`);
            if (!normalizedRow["Dev Comments"]) errors.push(`row ${rowNumber}: Dev Comments is required.`);
            if (!normalizedRow["Report Comments"]) errors.push(`row ${rowNumber}: Report Comments is required.`);

            rows.push(normalizedRow);
        });

        if (errors.length) {
            return { isValid: false, errors, rows: [] };
        }

        return { isValid: true, errors: [], rows };
    }

    global.CsvUtils = {
        SUBMISSION_HEADERS,
        normalizeText,
        parseScore,
        parseRosterRows,
        validateSubmissionResults
    };
})(window);
