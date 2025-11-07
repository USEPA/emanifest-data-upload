//build for all
export async function buildBulkManifests(info, handlers, wastes) {

    console.log('made it to build manifests')

    let manifests = []

    console.log({ info, handlers, wastes })

    for (const item of info) {
        const manifestId = item.manifestId

        const manifestHandlers = handlers.find(h => h.manifestId == manifestId)
        const manifestWastes = wastes[manifestId]

        const payload = await buildManifestAll(item, manifestHandlers, manifestWastes)
        manifests.push(payload)
    }
    return manifests
}

export async function buildManifestAll(info, manifestHandlers, wastes) {
    console.log({ info, manifestHandlers, wastes })
    const payload = {
        submissionType: info.submissionType,
        status: info.status,
        ...manifestHandlers,
        wastes: [],
        additionalInfo: {},
        import: false,
        containsPreviousRejectOrResidue: false,
    }

    let manifestId
    if (payload.hasOwnProperty('manifestId')) {
        manifestId = info.manifestId
        delete payload.manifestId
    }

    delete payload.generator.rowNumber
    delete payload.designatedFacility.rowNumber
    payload.transporters.forEach(t => delete t.rowNumber)
    if (payload.broker) delete payload.broker.rowNumber

    //set potential ship date
    if (info.potentialShipDate !== undefined) {
        let formattedDate = new Date(info.potentialShipDate)
        formattedDate.setUTCHours(12, 0, 0, 0);
        payload.potentialShipDate = formattedDate.toISOString()
    }

    const emergencyPhone = { number: info.emergencyResponsePhone }
    payload.generator.emergencyPhone = emergencyPhone

    //waste lines
    for (const item of wastes) {
        let wasteLine = await setWasteLine(item);
        payload.wastes.push(wasteLine)
    }

    //additionalInfo
    if (info.comments.length > 0) {
        payload.additionalInfo.comments = info.comments
    }
    if (info.handlingInstructions !== undefined) {
        payload.additionalInfo.handlingInstructions = info.handlingInstructions
    }
    return { manifestId, payload }
}

//build for waste only
export async function buildWasteManifest(data, wastes) {
    let manifestWasteLines = []
    for (const item of wastes) {
        let wasteLine = await setWasteLine(item);
        manifestWasteLines.push(wasteLine)
    }

    const manifest = {
        submissionType: data.submissionType,
        status: data.status,
        originType: 'Service',
        generator: {
            epaSiteId: data.generatorId,
            contact: {
                phone: {
                    number: '555-555-5555'
                }
            },
            emergencyPhone: {
                number: data.emergencyPhone
            }
        },
        transporters: [
            {
                epaSiteId: data.transporter1Id,
                order: 1
            }
        ],
        designatedFacility: {
            epaSiteId: data.tsdfId,
            contact: {
                phone: {
                    number: '555-555-5555'
                }
            }
        },
        wastes: manifestWasteLines,
        import: false
    }

    if (data.potentialShipDate !== '') {
        let formattedDate = new Date(data.potentialShipDate)
        formattedDate.setUTCHours(12, 0, 0, 0);
        manifest.potentialShipDate = formattedDate.toISOString()
    }
    return manifest
}

const baseWasteLine = {
    dotHazardous: true,
    epaWaste: true,
    dotInformation: {
        printedDotInformation: '',
        idNumber: { code: '' }
    },
    wasteDescription: '',
    quantity: {
        containerNumber: 0,
        containerType: {
            code: ''
        },
        quantity: 0,
        unitOfMeasurement: {
            code: ''
        }
    },
    br: false,
    hazardousWaste: {
        federalWasteCodes: [],
        generatorStateWasteCodes: [],
        tsdfStateWasteCodes: [],
        txWasteCodes: []
    },
    pcb: false,
    lineNumber: 0,
    managementMethod: {
        code: ''
    },
    additionalInfo: {},
    brInfo: {
        density: 0,
        densityUnitOfMeasurement: { code: '' }
    }
}

async function setWasteLine(line) {
    let newLine = JSON.parse(JSON.stringify(baseWasteLine));
    console.log(line)

    newLine.lineNumber = line.lineNumber
    newLine.dotHazardous = line.dotHazardous
    newLine.epaWaste = line.epaWaste

    //containers/quantity
    newLine.quantity.containerNumber = parseInt(line.containerNumber)
    newLine.quantity.containerType.code = line.containerType
    newLine.quantity.quantity = parseInt(line.quantity)
    newLine.quantity.unitOfMeasurement.code = line.unitOfMeasurement

    //set fields accordingly based on dotHazardous
    if (line.dotHazardous === true) {
        newLine.dotInformation.printedDotInformation = line.description
        newLine.dotInformation.idNumber.code = line.idNumber
        delete newLine.wasteDescription
        if (line.federalWasteCodes) {
            newLine.hazardousWaste.federalWasteCodes = await processWasteCodes(line.federalWasteCodes)
        }
    } else {
        newLine.wasteDescription = line.description
        delete newLine.dotInformation
    }

    if (line.generatorWasteCodes) {
        newLine.hazardousWaste.generatorStateWasteCodes = await processWasteCodes(line.generatorWasteCodes)
    } else {
        delete newLine.hazardousWaste.generatorStateWasteCodes
    }
    if (line.tsdfWasteCodes) {
        newLine.hazardousWaste.tsdfStateWasteCodes = await processWasteCodes(line.tsdfWasteCodes)
    } else {
        delete newLine.hazardousWaste.tsdfStateWasteCodes
    }

    if (line.txWasteCodes) {
        newLine.hazardousWaste.txWasteCodes = line.txWasteCodes
    } else {
        delete newLine.hazardousWaste.txWasteCodes
    }

    //management method code
    if (line.managementMethodCode !== undefined) {
        newLine.managementMethod.code = line.managementMethodCode
    } else {
        delete newLine.managementMethod
    }

    //comments
    if (line.comments.length > 0) {
        newLine.additionalInfo.comments = line.comments
    }
    if (line.handlingInstructions !== undefined) {
        newLine.additionalInfo.handlingInstructions = line.handlingInstructions
    }

    //density 
    if (line.density !== undefined && line.densityUnitOfMeasurement !== undefined) {
        newLine.brInfo.density = line.density
        newLine.brInfo.densityUnitOfMeasurement.code = line.densityUnitOfMeasurement
        newLine.br = true
    } else {
        delete newLine.brInfo
    }

    return newLine
}

const processWasteCodes = async (codes) => {
    let wasteCodes = []
    codes.forEach(code => {
        wasteCodes.push({ code: code })
    })
    return wasteCodes
}