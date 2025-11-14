/******************* UI ELEMENT FUNCTIONS *****************************************/
async function updateEnvironmentElements(env, setEnv = false) {

    const checkmarkIcon = '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-6"> <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /> </svg>'
    const warningIcon = '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-6"> <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" /> </svg>'

    const testingTip = 'This environment is for testing purposes only and cannot be used for submitting real data.'
    const prodTip = 'This is the Production environment to submit real manifest data.'

    let badgeClass
    let fullEnvText
    let toolTipText

    const environmentBadge = document.getElementById('environment')
    const environmentIcon = document.getElementById('envIcon')
    const environmentTooltip = document.getElementById('envTooltip')
    const envModalHeading = document.getElementById('envApi')
    const successModalEnv = document.getElementById('successModalEnv')

    if (setEnv) await window.api.setEnv(env)

    if (env == 'dev') {
        badgeClass = 'badge badge-secondary'
        fullEnvText = 'Development'
        environmentIcon.innerHTML = warningIcon
        toolTipText = testingTip
    } else if (env == 'preprod') {
        badgeClass = 'badge badge-success'
        fullEnvText = 'Pre-Production'
        environmentIcon.innerHTML = warningIcon
        toolTipText = testingTip
    } else if (env == 'prod') {
        badgeClass = 'badge badge-primary'
        fullEnvText = 'Production'
        toolTipText = prodTip
        environmentIcon.innerHTML = checkmarkIcon
    }

    environmentBadge.textContent = fullEnvText
    envModalHeading.textContent = fullEnvText
    successModalEnv.textContent = fullEnvText
    environmentBadge.className = badgeClass
    environmentTooltip.setAttribute('data-tip', toolTipText);

    if (setEnv) showToast(`Environment updated to ${fullEnvText}`)
}

async function updateApiElements(env) {
    const apiCreds = await window.apiCredentials.get(env)
    const envUrl = await window.envUrl.get(env)

    const viewCredsBtn = document.getElementById('viewCredsBtn')
    const apiId = document.getElementById('apiId')
    const apiKey = document.getElementById('apiKey')
    const apiLink = document.getElementById('apiLink')

    apiId.value = apiCreds.apiId
    apiKey.value = apiCreds.apiKey

    apiId.type = 'password'
    apiKey.type = 'password'
    viewCredsBtn.textContent = 'Show Credentials'

    apiLink.innerText = envUrl
    apiLink.onclick = (e) => {
        e.preventDefault()
        window.api.openUrl(envUrl)
    }
}

/**************************FORM SUBMISSION FUNCIONS *******************************************/

async function handleAllSubmit(filePath) {
    if (!filePath) {
        showToast('Please select a XLSX file with data', 'error')
        return
    }
    validateAndSubmit(filePath)
}

async function validateAndSubmit(filePath) {
    const loading = document.getElementById('loading')

    const apiSubmissionResultsModal = document.getElementById('apiSubmissionResultsModal');
    const errorModal = document.getElementById('errorModal');
    const errorModalTitle = document.getElementById('errorModalTitle')
    const errorSection = document.getElementById('errors')
    const reportOutput = document.getElementById('reportOutput')
    reportOutput.innerHTML = ''

    loading.classList.remove('hidden')
    try {
        const submitData = await window.api.submitAllData(filePath)

        if (submitData.result === 'submitted') {
            const successArray = submitData.results.success
            const failArray = submitData.results.fail
            const successLength = successArray.length
            const failLength = failArray.length

            const badgeSave = document.getElementById('badgeSaved')
            const badgeFailed = document.getElementById('badgeFailed')
            const badgeTotal = document.getElementById('badgeTotal')

            badgeSave.textContent = successLength
            badgeFailed.textContent = failLength
            badgeTotal.textContent = successLength + failLength

            const successMtns = successArray.map(item => `${item.mtn} (${item.manifestId})`);
            document.getElementById('mtnsByid').textContent = successMtns.join(', ')
            apiSubmissionResultsModal.show();

            createReport([...failArray, ...successArray])

        } else if (submitData.result === 'validationErrors') {
            errorModalTitle.textContent = 'Excel File Data Validation Errors'
            errorSection.textContent = JSON.stringify(submitData.allErrors, null, 2)
            errorModal.show();
        }
        else if (submitData.result === 'authErrors') {
            errorModalTitle.textContent = 'Authentication Error with e-Manifest'
            errorSection.textContent = JSON.stringify(submitData.error, null, 2)
            errorModal.show();
        }
        else {
            errorModalTitle.textContent = 'Errors with the e-Manifest API'
            errorSection.textContent = JSON.stringify(submitData.error, null, 2)
            errorModal.show();
        }
    } catch (error) {
        errorModalTitle.textContent = 'Unknown Error - Check Logs'
        errorModal.show();
        console.log(error)
    } finally {
        loading.classList.add('hidden')
    }
}

function createReport(items) {
    const reportOutput = document.getElementById('reportOutput')

    items.forEach((item, index) => {
        // Create the main div element with your classes
        const collapseDiv = document.createElement('div');
        collapseDiv.className = "collapse collapse-arrow bg-base-100 border border-base-300";

        // Create the radio input element
        const radioInput = document.createElement('input');
        radioInput.type = "radio";
        radioInput.name = "my-accordion-2";
        // Check the first item by default
        if (index === 0) {
            radioInput.checked = true;
        }

        // Create title div
        const titleDiv = document.createElement('div');
        titleDiv.className = "collapse-title font-semibold";
        titleDiv.textContent = `manifestId: ${item.manifestId}`;

        const statusBadge = document.createElement('span')
        if (!item.mtn) {
            statusBadge.className = 'badge badge-error ml-2'
            statusBadge.textContent = 'Failed'

        } else {
            statusBadge.className = 'badge badge-success ml-2'
            statusBadge.textContent = 'Saved'
        }

        titleDiv.insertAdjacentElement('beforeend', statusBadge)


        // Create content div
        const contentDiv = document.createElement('pre');
        contentDiv.className = "collapse-content text-sm";
        contentDiv.textContent = JSON.stringify(item.response, null, 2);

        // Append children to the main collapse div
        collapseDiv.appendChild(radioInput);
        collapseDiv.appendChild(titleDiv);
        collapseDiv.appendChild(contentDiv);

        // Append the complete collapse div to the container
        reportOutput.appendChild(collapseDiv);
    });
}

/****************************************HELPER FUNCTIONS /*****************************************/
const toastClasses = {
    info: 'alert alert-info',
    error: 'alert alert-error',
    success: 'alert alert-success',
}

function showToast(message, type = 'info', delayTime = 3000) {
    const toastEl = document.getElementById('appToast')
    const toastBody = document.getElementById('appToastBody')

    toastBody.textContent = message
    toastBody.className = toastClasses[type]

    toastEl.classList.remove('hidden'); // Make the toast visible
    setTimeout(() => {
        toastEl.classList.add('hidden'); // Hide the toast after a delay
    }, delayTime);
}

function copyToClipboard(textToCopy) {
    try {
        navigator.clipboard.writeText(textToCopy);
        console.log('Text copied to clipboard:', textToCopy);
    } catch (err) {
        console.error('Failed to copy text:', err);
    }
}

/********************* Initialization/Event Listeners *******************************************/
document.addEventListener('DOMContentLoaded', async () => {
    let currentEnv

    let selectedExcelFilePath

    //handles environment changes - only show dev link if operating in dev mode
    const appEnv = await window.env.get()

    /***************NAV BAR *********************************/

    let changeDevLink = null
    const changePreProdLink = document.getElementById('changePreProd')
    const changeProdLink = document.getElementById('changeProd')

    const devMenuItem = document.getElementById('devMenuItem')

    //if development mode, show the Development option and start app pointing to dev environment
    if (appEnv.dev) {
        devMenuItem.classList.remove('hidden')
        changeDevLink = document.getElementById('changeDev')

        changeDevLink.addEventListener("click", async () => {
            currentEnv = 'dev'
            updateEnvironmentElements(currentEnv, true)
        })

        currentEnv = 'dev'
        await window.api.setEnv(currentEnv)
        updateEnvironmentElements('dev')
    } else {
        //set to the last environment user selected
        currentEnv = await window.api.getEnv()
        updateEnvironmentElements(currentEnv)
    }

    changePreProdLink.addEventListener("click", async () => {
        currentEnv = 'preprod'
        updateEnvironmentElements(currentEnv, true)
    })

    changeProdLink.addEventListener("click", async () => {
        currentEnv = 'prod'
        updateEnvironmentElements(currentEnv, true)
    })

    /************************GitHub Links ***********************************************/

    const ghLinks = document.querySelectorAll('.gh-link')

    ghLinks.forEach(link => {
        link.addEventListener("click", async () => {
            await window.api.openUrl('https://github.com/USEPA/emanifest-data-upload')
        })
    })

    /********************SELECT XLSX SECTION **************************/

    document.getElementById('selectExcelBtn').addEventListener("click", async () => {
        selectedExcelFilePath = await window.api.selectExcelFile()
        document.getElementById('fileNameExcel').textContent = selectedExcelFilePath || 'No file selected'
    })

    /********************SUBMIT DATA BUTTON *************************/
    const submitAllBtn = document.getElementById('submitAllBtn')
    submitAllBtn.addEventListener('click', async () => {
        await handleAllSubmit(selectedExcelFilePath)
    })

    /************************API SETTINGS MODAL ***********************************************/
    const apiSettingsBtn = document.getElementById('apiSettingsBtn')
    const apiModal = document.getElementById('apiModal')
    const saveApiBtn = document.getElementById('saveApiBtn')

    apiSettingsBtn.addEventListener('click', async () => {
        console.log(currentEnv)
        await updateApiElements(currentEnv)
        apiModal.showModal()
    })

    saveApiBtn.addEventListener('click', async () => {
        const apiId = document.getElementById('apiId')
        const apiKey = document.getElementById('apiKey')

        await window.apiCredentials.set(currentEnv, apiId.value, apiKey.value)

        showToast('API credentials saved', 'success', 7000)
    })

    const viewCredsBtn = document.getElementById('viewCredsBtn')
    viewCredsBtn.addEventListener('click', () => {
        if (apiId.type === 'password') {
            apiId.type = 'text'
            apiKey.type = 'text'
            viewCredsBtn.textContent = 'Hide Credentials'
        } else {
            apiId.type = 'password'
            apiKey.type = 'password'
            viewCredsBtn.textContent = 'Show Credentials'
        }
    })

    /************************ERRORS MODAL ***********************************************/
    //copy error in errors modal
    const copyErrorBtn = document.getElementById('btnCopyError')
    copyErrorBtn.addEventListener('click', function () {
        copyToClipboard(document.getElementById('errors').textContent)
    })

    /**OTHER */

    //toggle display of code at bottom of window
    const fullReportBtn = document.getElementById('fullReportBtn')
    fullReportBtn.addEventListener("click", function () {
        const fullReport = document.getElementById('fullReport')
        fullReport.classList.toggle('hidden')
    })
});