export function stripCommentErrors(rows) {
    const customErrors = [];
    const cleanedRows = rows.map(row => {
        const { commentErrors = [], ...rest } = row;
        if (commentErrors.length > 0) {
            customErrors.push(commentErrors[0]);
        }
        return rest;
    });
    return { cleanedRows, customErrors };
}

export function mergeErrorsByRow(errorsSet1, errorsSet2) {

    if (errorsSet1.length === 0 && errorsSet2.length === 0) {
        return []
    } else if (errorsSet1.length === 0) {
        return errorsSet2
    } else if (errorsSet2.length === 0) {
        return errorsSet1
    }

    const mergedMap = new Map();

    const addErrors = (errorArray) => {
        errorArray.forEach(item => {
            const rowNumber = item.row;
            if (mergedMap.has(rowNumber)) {
                mergedMap.get(rowNumber).errors.push(...item.errors);
            } else {
                mergedMap.set(rowNumber, { row: rowNumber, errors: [...item.errors] });
            }
        });
    };

    addErrors(errorsSet1);
    addErrors(errorsSet2);

    return Array.from(mergedMap.values());
}

export function getManifestIds(manifests) {
    return new Set(
        manifests
            .map(manifest => manifest.manifestId)
            .filter(id => typeof id === 'number')
    );
}

export function computeBatchResult(successCount, failCount) {
    if (failCount > 0 && successCount === 0) return 'allFailed';
    if (failCount > 0 && successCount > 0) return 'someFailed';
    return 'success';
}