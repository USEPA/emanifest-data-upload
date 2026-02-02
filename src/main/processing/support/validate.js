import Ajv from 'ajv'
import addFormats from 'ajv-formats';
import ajvErrors from 'ajv-errors';

import { groupByManifestId } from './process.js';

const ajv = new Ajv({ allErrors: true, $data: true })
ajvErrors(ajv);
addFormats(ajv);

import wasteSchema from '../../schemas/waste_schema.json' with { type: 'json' };
import manifestSchema from '../../schemas/manifest_schema.json' with { type: 'json' };
import handlerBasicSchema from '../../schemas/handler_basic_schema.json' with {type: 'json'}
import handlerFullSchema from '../../schemas/handler_full_schema.json' with {type: 'json'}

const maxRows = 50 //const for maximum manifests per batch

//manifest tab validation
export function validateManifestInfo(manifests) {
    const validate = ajv.compile(manifestSchema)
    const results = []

    //get count of distinct manifestId values
    const freqMap = buildManifestIdFrequencyMap(manifests)

    manifests.forEach((row, index) => {
        const errors = []

        //schema validation
        const valid = validate(row)
        if (!valid) {
            const schemaErrors = processSchemaErrors(validate.errors)
            errors.push(...schemaErrors);
        }

        //duplicate manifestId validation
        if (freqMap[row.manifestId] > 1) {
            errors.push({
                field: 'manifestId',
                message: `manifestId ${row.manifestId} is duplicated`
            });
        }

        //validate max number of rows allowed
        if (index > maxRows - 1) {
            errors.push({
                message: `cannot have more than ${maxRows} manifest rows in a file`
            });
        }

        //push all errors for the row
        if (errors.length > 0) {
            results.push({ row: index + 1, errors })
        }

    })
    return results
}

//waste tab validation
function validateWastes(wastes, validManifestIds) {

    const validate = ajv.compile(wasteSchema)
    const results = []

    wastes.forEach((row, index) => {
        const errors = []

        //schema validation
        const valid = validate(row)
        if (!valid) {
            const schemaErrors = processSchemaErrors(validate.errors)
            errors.push(...schemaErrors);
        }

        //manifestId validation
        if (row.manifestId && !validManifestIds.has(row.manifestId)) {
            errors.push({
                field: 'manifestId',
                message: `manifestId ${row.manifestId} is not valid because it does not exist on the manifest tab.`
            })
        }

        if (row.dotHazardous && !Object.hasOwn(row, 'idNumber')) {
            errors.push({
                field: 'idNumber',
                message: `idNumber is required if dotHazardous = true`
            })
        }

        if (errors.length > 0) {
            results.push({ row: index + 1, errors })
        }
    })

    //validate at least one waste row for each manifestId from manifest tab
    const checkMissingIds = validateManifestIds(validManifestIds, wastes)
    if (checkMissingIds.length > 0) {
        checkMissingIds.forEach(id => {
            results.push({ field: 'manifestId', message: `at least one waste row is required for manifestId ${id}` })
        })
    }

    return results
}

//handler tab- basic validation
function validateHandlersBasic(handlers, validManifestIds) {
    const validate = ajv.compile(handlerBasicSchema)
    let results = []

    //individual handler row validation
    handlers.forEach((row, index) => {
        const errors = []

        //schema validation
        const valid = validate(row)
        if (!valid) {
            const schemaErrors = processSchemaErrors(validate.errors)
            errors.push(...schemaErrors);
        }

        //manifestId validation
        if (row.manifestId && !validManifestIds.has(row.manifestId)) {
            errors.push({
                field: 'manifestId',
                message: `manifestId ${row.manifestId} is not valid because it does not exist on the manifest tab.`
            })
        }

        //require order if transporter
        if (row.type === 'Transporter' && !Object.hasOwn(row, 'order')) {
            errors.push({
                field: 'order',
                message: `order is required if type = 'Transporter'`
            })
        }

        if (errors.length > 0) {
            results.push({ row: index + 1, errors })
        }
    })

    //validate at least one handler per manifestId from manifest tab
    const checkMissingIds = validateManifestIds(validManifestIds, handlers)
    if (checkMissingIds.length > 0) {
        checkMissingIds.forEach(id => {
            results.push({ field: 'manifestId', message: `at least one handler row is required for manifestId ${id}` })
        })
    }

    //validate handler types only if other validation rules pass
    if (results.length === 0) {
        const handlerTypeErrors = validateHandlerTypes(handlers)

        if (handlerTypeErrors.length > 0) {
            results = [...handlerTypeErrors]
        }
    }

    return results
}

//handler type validation for the handlers tab for a given manifestId
function validateHandlerTypes(handlers) {

    const manifestHandlersGrouped = groupByManifestId(handlers)
    const results = []

    for (const key in manifestHandlersGrouped) {
        const errors = []
        if (Object.hasOwn(manifestHandlersGrouped, key)) {

            const manifestHandlers = manifestHandlersGrouped[key];

            const types = manifestHandlers.map(h => h.type)
            //check for missing types
            const missing = ['Generator', 'Transporter', 'DesignatedFacility'].filter(t => !types.includes(t))
            if (missing.length > 0) {
                missing.forEach(type => {
                    errors.push({
                        field: 'type',
                        message: `at least one handler row required for manifestId ${key} with type: ${type}`
                    })
                })
            }

            //check for duplicate types
            const genDup = types.filter(t => t === 'Generator')
            const tsdfDup = types.filter(t => t === 'DesignatedFacility')
            const brokerDup = types.filter(t => t === 'Broker')

            if (genDup.length > 1) {
                errors.push({
                    field: 'type',
                    message: `cannot have more than one row for manifestId ${key} with type: Generator`
                })
            }
            if (tsdfDup.length > 1) {
                errors.push({
                    field: 'type',
                    message: `cannot have more than one row for manifestId ${key} with type: DesignatedFacility`
                })
            }
            if (brokerDup.length > 1) {
                errors.push({
                    field: 'type',
                    message: `cannot have more than one row for manifestId ${key} with type: Broker`
                })
            }
            if (errors.length > 0) results.push({ manifestId: key, errors })
        }
    }
    return results
}

//NEW- validate handlers rows for a group of individual manifest handlers
function validateHandlersFull(handlers) {
    try {
        const validate = ajv.compile(handlerFullSchema)
        const results = []

        handlers.forEach((handler) => {
            const valid = validate(handler)
            if (!valid) {
                results.push({
                    row: handler.rowNumber,
                    errors: validate.errors.map(err => ({
                        field: err.instancePath.substring(1) || err.params.missingProperty,
                        message: err.message
                    }))
                })
            }
        })
        return results
    } catch (error) {
        console.error(error)
        return error
    }
}

/**SUPPORT FUNCTIONS */

//returns count per value manifestId (numeric values only)
function buildManifestIdFrequencyMap(manifests) {
    return manifests.reduce((freq, { manifestId }) => {
        if (Number.isInteger(manifestId)) {
            freq[manifestId] = (freq[manifestId] || 0) + 1;
        }
        return freq;
    }, Object.create(null));
}

function validateManifestIds(manifestIds, tabData) {
    const tabManifestIds = new Set(tabData.map(row => row.manifestId))
    const missingIds = [...manifestIds].filter(id => !tabManifestIds.has(id))

    return missingIds
}

//custom formatting schema errors
const wasteCodeProperties = ['federalWasteCodes', 'generatorWasteCodes', 'tsdfWasteCodes', 'txWasteCodes']
function processSchemaErrors(errors) {
    return errors.map(err => {
        const propertyName = err.instancePath.split('/')[1] || '';
        if (err.keyword === 'additionalProperties') {
            return {
                field: err.params.additionalProperty,
                message: `column '${err.params.additionalProperty}' is not allowed`
            }
        } else if ((err.keyword === 'minLength' || err.keyword === 'maxLength') && wasteCodeProperties.includes(propertyName)) {
            return {
                field: propertyName,
                message: `each code ${err.message}. make sure codes are split by '|' character`
            }
        }
        else {
            return {
                field: propertyName || err.params.missingProperty,
                message: err.message
            }
        }
    })
}

export default { validateWastes, validateManifestInfo, validateHandlersBasic, validateHandlersFull, validateHandlerTypes }