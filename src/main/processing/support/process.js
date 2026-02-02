export function processManifestInfo(data) {
    return data.map(row => {
        const { errors, results } = parseComments(row.comments);
        return {
            ...row,
            comments: results,
            commentErrors: errors.length > 0 ? [{ row: row.__rowNum__, errors }] : [],
            potentialShipDate: handleDate(row.potentialShipDate),
            emergencyResponsePhone: convertToString(row.emergencyResponsePhone)
        }
    })
}

export function processWasteInfo(data) {
    return data.map(row => {
        const { errors, results } = parseComments(row.comments)
        return {
            ...row,
            federalWasteCodes: parseCodes(row.federalWasteCodes),
            generatorWasteCodes: parseCodes(row.generatorWasteCodes),
            tsdfWasteCodes: parseCodes(row.tsdfWasteCodes),
            txWasteCodes: parseCodes(row.txWasteCodes),
            comments: results,
            commentErrors: errors.length > 0 ? [{ row: row.__rowNum__, errors }] : [],
            densityUnitOfMeasurement: convertToString(row.densityUnitOfMeasurement)
        }
    })
}

export function processHandlers(data) {
    return data.map((row) => {
        return {
            rowNumber: row.__rowNum__,
            ...row
        }
    })
}

//generic handler mapping spreadsheet columns (right) to JSON structure (left)
const handlerMapping = {
    rowNumber: 'rowNumber',
    manifestId: 'manifestId',
    type:'type',
    epaSiteId: 'epaSiteId',
    order: 'order',
    name: 'name',
    'siteAddress.streetNumber': 'siteAddressStreetNumber',
    'siteAddress.address1': 'siteAddress1',
    'siteAddress.address2': 'siteAddress2',
    'siteAddress.city': 'siteAddressCity',
    'siteAddress.state.code': 'siteAddressState',
    'siteAddress.zip': 'siteAddressZip',
    'siteAddress.country.code': 'siteAddressCountry',
    'mailingAddress.streetNumber': 'mailAddressStreetNumber',
    'mailingAddress.address1': 'mailAddress1',
    'mailingAddress.address2': 'mailAddress2',
    'mailingAddress.city': 'mailAddressCity',
    'mailingAddress.state.code': 'mailAddressState',
    'mailingAddress.zip': 'mailAddressZip',
    'mailingAddress.country.code': 'mailAddressCountry',
    'contact.phone.number': 'contactPhone',
    'contact.email': 'contactEmail'
}
//transform the handler tab spreadsheet structure closer to expected manifest JSON structure
export function transformHandlers(handlers) {
    return handlers.map(row => mapRow(row, handlerMapping))
}

//
export function groupMapHandlers(handlers) {

    const grouped = groupByManifestId(handlers);
    const manifests = [];

    for (const [key, items] of Object.entries(grouped)) {
        const manifestId = key
        const result = {
            manifestId,
            generator: {},
            transporters: [],
            designatedFacility: {},
            broker: {}
        };
        
        for (const item of items) {
            const itemType = item.type
            delete(item.manifestId)
            delete(item.type)
            delete(item.rowNumber)
            switch (itemType) {
                case 'Generator':
                    result.generator = { ...item };
                    break;
                case 'Transporter':
                    result.transporters.push({ ...item });
                    break;
                case 'DesignatedFacility':
                    result.designatedFacility = { ...item };
                    break;
                case 'Broker':
                    result.broker = { ...item };
                    break;
                default:
                    // ignore or handle other types here if needed
                    break;
            }
        }
        if (Object.keys(result.broker).length === 0) delete result.broker
        manifests.push(result);
    }

    return manifests;
}

export function groupByManifestId(rows) {
    return rows.reduce((acc, row) => {
        const id = row.manifestId;
        if (!acc[id]) acc[id] = [];
        acc[id].push(row);
        return acc;
    }, {});
}


//contains column names that should be numeric
const numericColumns = new Set(['rowNumber', 'manifestId', 'streetNumber', 'order'])

//maps the excel column data to manifest JSON structure based on handlerMapping object
function mapRow(row, mapping) {
    const result = {}
    for (const key in mapping) {
        const column = mapping[key]
        let value = row[column]

        if (value == undefined || value == null || value == '') continue

        if (numericColumns.has(column)) {
            value = Number(value)
        } else {
            value = String(value)
        }
        setDeep(result, key, value)
    }
    return result
}

//function for setting deep nested values
function setDeep(obj, path, value) {
    const keys = path.split('.')
    let current = obj
    while (keys.length > 1) {
        const key = keys.shift()
        if (!current[key]) current[key] = {}
        current = current[key]
    }
    current[keys[0]] = value
}

//delimieter characters used for multi-value and array type columns
const multiValueDelimiter = '|'
const commentDelimiter = ':'

function parseCodes(codes) {
    if (!codes) return []
    return codes.toString().split(multiValueDelimiter).map(code => code.trim())
}

//parses the comments and does some light formatting validation - returns both 
function parseComments(providedComments) {
    // If no comments provided, return empty results
    if (!providedComments) return { errors: [], results: [] };

    // Split the string of comments by the multi-value delimiter
    const commentsArray = providedComments.toString().split(multiValueDelimiter);
    const errors = [];
    const results = [];

    // Process each comment string into an object
    commentsArray.forEach((commentStr, index) => {
        // Skip if the comment is empty
        if (!commentStr.trim()) {
            errors.push({
                field: 'comment',
                message: `Comment ${index + 1} is empty.`
            });
            return;
        }

        // Split the comment string by the comment delimiter
        const parts = commentStr.split(commentDelimiter).map(c => c.trim());

        // Check if there are exactly three parts
        if (parts.length < 3) {
            errors.push({
                field: 'comment',
                message: `Comment ${index + 1} is invalid. Expected format 'handlerId${commentDelimiter}label${commentDelimiter}description'; received: '${commentStr}'`
            });
            return;
        }

        const [handlerId, label, description] = parts;

        // Validate non-empty values for each required part
        if (!handlerId || !label || !description) {
            errors.push(
                {
                    field: 'comment',
                    message: `Comment ${index + 1} is missing one or more values; received handlerId: '${handlerId}', label: '${label}', description: '${description}'.`
                }
            );
            return;
        }

        results.push({ handlerId, label, description });
    });

    return { errors, results };
};

//helper functions
function convertToString(value) {
    return (value !== undefined) ? String(value) : null
}

function handleDate(value) {
    if (value instanceof Date) {
        return value.toISOString().split('T')[0]
    }
    return ''
}