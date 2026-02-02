import { readWorkbook, getSheetData } from "./support/readSheets.js"
import { processManifestInfo, processWasteInfo, processHandlers, transformHandlers, groupMapHandlers, groupByManifestId } from "./support/process.js"
import { buildManifests } from "./support/buildManifest.js"
import validation from './support/validate.js'
import { submitRequestsToApi } from "../api/submitManifest.js"
import { stripCommentErrors, mergeErrorsByRow, getManifestIds, computeBatchResult } from './support/utils.js'
import { AUTH_ERROR_MESSAGES } from "../api/apiConstants.js"

import log from 'electron-log/main.js';

export async function processSubmitBulkData(filePath) {
    try {

        const allErrors = []
        let groupWastes
        let transformedHandlers
        let handlersProcessed = {}

        //1. read each sheet and get raw data
        const workbook = readWorkbook(filePath)
        const manifestRaw = getSheetData(workbook, 'manifest')
        const handlersRaw = getSheetData(workbook, 'handlers')
        const wastesRaw = getSheetData(workbook, 'wastes')

        //2a. process data from each tab
        const manifestProcessedRaw = processManifestInfo(manifestRaw)
        const wastesProcessedRaw = processWasteInfo(wastesRaw)
        const handlersInitialProcessing = processHandlers(handlersRaw)

        //2b. Collect and strip row-level comment errors
        const { cleanedRows: manifestProcessed, customErrors: manifestCustomErrors } = stripCommentErrors(manifestProcessedRaw);

        const { cleanedRows: wastesProcessed, customErrors: wasteCustomErrors } = stripCommentErrors(wastesProcessedRaw);

        //3a. validate manifest tab
        const manifestSchemaErrors = validation.validateManifestInfo(manifestProcessed)
        //merge manifest schema and custom errors
        const manifestErrors = mergeErrorsByRow(manifestSchemaErrors, manifestCustomErrors)

        if (manifestErrors.length > 0) {
            allErrors.push({ manifestErrors })
        }

        const validManifestIds = getManifestIds(manifestProcessed)
        //3b. validate wastes tab - if validation passes, group wastes by manifestId
        const wasteSchemaErrors = validation.validateWastes(wastesProcessed, validManifestIds)
        //merge waste schema and custom errors
        const wasteErrors = mergeErrorsByRow(wasteSchemaErrors, wasteCustomErrors)

        if (wasteErrors.length > 0) {
            allErrors.push({ wasteErrors })
        }

        //3c.i. - basic handler validation - must pass before doing additional validation and processing
        const handlerBasicErrors = validation.validateHandlersBasic(handlersInitialProcessing, validManifestIds)
        if (handlerBasicErrors.length > 0) {
            allErrors.push({ handlerBasicErrors })
        }

        // 3c.ii - if basic handler validation passes, transform structure, then do advanced validation
        if (handlerBasicErrors.length === 0) {
            transformedHandlers = transformHandlers(handlersInitialProcessing)

            const handlerFullErrors = validation.validateHandlersFull(transformedHandlers)

            if (handlerFullErrors.length > 0) {
                allErrors.push({ handlerFullErrors })
            }
        }

        /**
         * 3d. if errors - stop processing and return validation errors to the renderer
         *     if validation passes - process waste and handler data to be used for building payloads
         * */
        if (allErrors.length > 0) {
            return { result: 'validationErrors', allErrors }
        } else {
            groupWastes = groupByManifestId(wastesProcessed)
            handlersProcessed = groupMapHandlers(transformedHandlers)
        }

        //4. build manifest payloads
        const manifestPayloads = buildManifests(manifestProcessed, handlersProcessed, groupWastes)

        //5. submit to API
        const apiSubmitResponse = await submitRequestsToApi(manifestPayloads)

        //6. handle API results
        const { success, fail } = apiSubmitResponse.reduce((acc, item) => {
            if (item.result === 'Saved') {
                acc.success.push({
                    manifestId: item.manifestId,
                    mtn: item.response.manifestTrackingNumber,
                    response: item.response
                });
            } else {
                acc.fail.push({
                    manifestId: item.manifestId,
                    result: item.result,
                    response: item.response
                });
            }
            return acc;
        }, { success: [], fail: [] });

        const batchResult = computeBatchResult(success.length, fail.length);

        return { result: 'submitted', batchResult, results: { success, fail } };

    } catch (error) {
        log.error('processing error', { code: error.code, message: error.message })
        
        //excel workbook errors
        if (error.code === 'E_MissingSheet' || error.code === 'E_EmptySheet') {
            log.warn(`Input error: ${error.message}`);
            return { result: 'inputErrors', error: error.message, sheetName: error.sheetName };
        }
        //authentication errors
        if (Object.hasOwn(AUTH_ERROR_MESSAGES, error.code)) {
            log.error(`authentication error: ${error.message}`);
            return { result: 'authErrors', error: AUTH_ERROR_MESSAGES[error.code] };
        }

        if (error.code === 'ERR_NETWORK' || error.code === 'ECONNABORTED' || error.code === 'apiNetworkError') {
            return { result: 'systemError', error: error.message };
        }
        //fallback
        return { result: 'systemError', error: error.message };
    }
}