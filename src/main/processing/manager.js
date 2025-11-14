import { readWorkbook, getSheetData } from "./support/readSheets.js"
import { processBulkManifestInfo, processBulkWasteInfo, processBulkHandlers, mapHandlers, groupWasteHandlers } from "./support/processBulk.js"
import { buildBulkManifests } from "./support/buildManifest.js"
import validation from './support/validate.js'
import { submitRequestsToApi } from "../api/submitManifest.js"
import { mergeErrorsByRow } from "./support/utils.js"

import log from 'electron-log/main.js';

export async function processSubmitBulkData(filePath) {
    try {

        const allErrors = []
        let groupWastes
        let manifestHandlersGrouped = []
        let handlerTypeErrors = []
        let handlersProcessed = {}

        //1. read each sheet and get raw data
        const workbook = await readWorkbook(filePath)
        const manifestRaw = await getSheetData(workbook, 'manifest')
        const handlersRaw = await getSheetData(workbook, 'handlers')
        const wastesRaw = await getSheetData(workbook, 'wastes')

        //2a. process data from each tab
        const manifestProcessed = await processBulkManifestInfo(manifestRaw)
        const wastesProcessed = await processBulkWasteInfo(wastesRaw)
        const handlersInitialProcessing = await processBulkHandlers(handlersRaw)

        // 2b. check if any errors detected during processing
        const manifestCustomErrors = []
        manifestProcessed.forEach(row => {
            if (row.commentErrors.length > 0) {
                manifestCustomErrors.push(row.commentErrors[0])
            }
            delete row.commentErrors
        })

        const wasteCustomErrors = []
        wastesProcessed.forEach(row => {
            if (row.commentErrors.length > 0) {
                wasteCustomErrors.push(row.commentErrors[0])
            }
            delete row.commentErrors
        })

        //3a. validate manifest tab
        const manifestSchemaErrors = await validation.validateManifestInfo(manifestProcessed)

        const manifestErrors = mergeErrorsByRow(manifestSchemaErrors, manifestCustomErrors)

        if (manifestErrors.length > 0) {
            allErrors.push({ manifestErrors })
        }

        const validManifestIds = validation.getManifestIds(manifestProcessed)

        //3b. validate wastes tab - if validation passes, group wastes by manifestId
        const wasteSchemaErrors = await validation.validateWastes(wastesProcessed, validManifestIds)
        const wasteErrors = mergeErrorsByRow(wasteSchemaErrors, wasteCustomErrors)

        if (wasteErrors.length > 0) {
            allErrors.push({ wasteErrors })
        } else {
            groupWastes = await groupWasteHandlers(wastesProcessed)
        }

        //3c.i. - basic handler validation - must pass before doing additional validation and processing
        const handlerBasicErrors = await validation.validateHandlersBasic(handlersInitialProcessing, validManifestIds)
        if (handlerBasicErrors.length > 0) {
            allErrors.push({ handlerBasicErrors })
        } else {
            //group the handlers and run type validation rules
            manifestHandlersGrouped = await groupWasteHandlers(handlersInitialProcessing)
            handlerTypeErrors = await validation.validateHandlerTypes(manifestHandlersGrouped)
            if (handlerTypeErrors.length > 0) {
                allErrors.push({ handlerTypeErrors })
            }
        }

        // 3c.ii - if basic validation passes, do further processsing and advanced validation
        if (handlerBasicErrors.length === 0 && handlerTypeErrors.length === 0) {
            handlersProcessed = await mapHandlers(manifestHandlersGrouped)

            const handlerFullErrors = await validation.validateAllHandlers(handlersProcessed)
            if (handlerFullErrors.length > 0) {
                allErrors.push({ handlerFullErrors })
            }
        }

        //3d. stop and return validation errors
        if (allErrors.length > 0) {
            return { result: 'validationErrors', allErrors }
        }

        //4. build manifest payload
        const manifestPayloads = await buildBulkManifests(manifestProcessed, handlersProcessed, groupWastes)

        //5. submit to API
        const apiSubmitResponse = await submitRequestsToApi(manifestPayloads)

        let results = {
            success: [],
            fail: []
        }

        apiSubmitResponse.forEach(item => {
            if (item.result == 'Saved') {
                results.success.push({
                    manifestId: item.manifestId,
                    mtn: item.response.manifestTrackingNumber,
                    response: item.response
                })
            } else {
                results.fail.push({
                    manifestId: item.manifestId,
                    result: item.result,
                    response: item.result == 'apiValidationError' ? item.response : item.error
                })
            }
        })

        let batchResult = 'success'
        if (results.fail.length > 0 && results.success.length === 0) {
            batchResult = 'allFailed'
        } else if (results.fail.length > 0 && results.success.length > 0) {
            batchResult = 'someFailed'
        }

        return { result: 'submitted', batchResult, results }

    } catch (error) {
        //this handles all of the possible auth errors - the processing will stop if there is an auth failure and return to the renderer
        log.error(error)
        if (error.hasOwnProperty('cause')) {
            if (error.cause.code === 'E_MissingApiCredentials') {
                return {
                    result: 'authErrors',
                    error: 'API ID or Key are not set for the environment. Please add under API Settings.'
                }
            }
            else if (error.cause.code === 'E_SecurityApiIdLocked') {
                return {
                    result: 'authErrors',
                    error: 'API ID is locked. You need to reset it in RCRAInfo by generating a new key.'
                }
            }
            else if (error.cause.code === 'E_SecurityApiInvalidCredentials' || 'E_SecurityApiInvalidStatus') {
                return {
                    result: 'authErrors',
                    error: 'Invalid API credentials. Confirm and set API ID and Key for the environment. Otherwise generate a new key in RCRAInfo.'
                }
            }
        }
        else {
            return { result: 'systemError', error: error.message }
        }
    }
}