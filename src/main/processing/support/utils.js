export function groupByKey(array, key) {
    return array.reduce((acc, item) => {
        // Use item[key] as the group identifier
        const groupValue = item[key];
        // Initialize the group if it does not exist
        if (!acc[groupValue]) {
            acc[groupValue] = [];
        }
        // Push the current item into its respective group array
        acc[groupValue].push(item);
        return acc;
    }, {});
}

export function mergeErrorsByRow(errorsSet1, errorsSet2) {

    if (errorsSet1.length == 0) {
        return errorsSet2
    } else if (errorsSet2.length == 0) {
        return errorsSet1
    } else if (errorsSet1.length == 0 && errorsSet2.length == 0) {
        return []
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