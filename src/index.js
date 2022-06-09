//BOOTSTRAP TOEVOEGEN
import * as bootstrap from 'bootstrap';
import './scss/app.scss';


// Import from "@inrupt/solid-client-authn-browser"
import {
    login,
    handleIncomingRedirect,
    getDefaultSession,
    fetch,
    logout
} from "@inrupt/solid-client-authn-browser";

// Import from "@inrupt/solid-client"
import {
    addUrl,
    addStringNoLocale,
    createSolidDataset,
    createThing,
    getPodUrlAll,
    getSolidDataset,
    getThing,
    getThingAll,
    getStringNoLocale,
    removeThing,
    saveSolidDatasetAt,
    setThing
} from "@inrupt/solid-client";

import { VCARD, RDF, AS, SCHEMA_INRUPT } from "@inrupt/vocab-common-rdf";

// Meeste DOM elementen die we gaan gebruiken.
const main = document.querySelector("main");
const welkom = document.querySelector("#welkom");
const error = document.querySelector("#error");
const errorMessage = document.querySelector("#errorMessage");
const selectPod = document.querySelector("#select-pod");
const todoList = document.querySelector("#todo");
const buttonLogin = document.querySelector("#btnLogin");
const buttonLogout = document.querySelector("#btnLogout");
const buttonUpdate = document.querySelector("#btnUpdate");
const status = document.querySelector("#status");
let myReadingList;


main.classList.add("d-none");
welkom.classList.add("d-none");
buttonUpdate.setAttribute("disabled", "disabled");

// 1a. Start Login Process. Call login() function.
function loginToSelectedIdP() {

    return login({
        oidcIssuer: "https://solidcommunity.net",
        redirectUrl: window.location.href,
        clientName: "Workshop Solid"
    });
}

// 1b. Login Redirect. Call handleIncomingRedirect() function.
// When redirected after login, finish the process by retrieving session information.
async function handleRedirectAfterLogin() {
    const session = getDefaultSession();
    await handleIncomingRedirect();

    if (session.info.isLoggedIn) {
        await readProfile();
        await getMyPods();
        main.classList.remove("d-none");
        buttonLogin.classList.add("d-none");
        buttonLogout.classList.remove("d-none");
    }
}

// The example has the login redirect back to the index.html.
// This calls the function to process login information.
// If the function is called when not part of the login redirect, the function is a no-op.
handleRedirectAfterLogin();

// 2. Get Pod(s) associated with the WebID
async function getMyPods() {
    const session = getDefaultSession();
    const webID = session.info.webId;

    const mypods = await getPodUrlAll(webID, { fetch: fetch });

    // Update the page with the retrieved values.

    mypods.forEach((mypod) => {
        let podOption = document.createElement("option");
        podOption.textContent = mypod;
        podOption.value = mypod;
        selectPod.appendChild(podOption);
    });
}

async function readProfile() {
    const session = getDefaultSession();
    const webID = session.info.webId;
    try {
        new URL(webID);
    } catch (_) {
        setError(`[${webID}] is geen geldige URL.`);
        return false;
    }

    const profileDocumentUrl = new URL(webID);
    profileDocumentUrl.hash = "";

    // Profile is public data; i.e., you do not need to be logged in to read the data.
    // For illustrative purposes, shows both an authenticated and non-authenticated reads.

    let myDataset;
    try {
        if (session.info.isLoggedIn) {
            myDataset = await getSolidDataset(profileDocumentUrl.href, { fetch: session.fetch });
        } else {
            myDataset = await getSolidDataset(profileDocumentUrl.href);
        }
    } catch (error) {
        setError(error);
        return false;
    }

    const profile = getThing(myDataset, webID);

    const formattedName = getStringNoLocale(profile, VCARD.fn);

    // Update the page with the retrieved values.
    welkom.classList.remove("d-none");
    welkom.innerHTML += ` <a href="${webID}" target="_blank">${formattedName}</a>`;
}

// 3. Create the Reading List
async function createList() {
    status.textContent = "";
    const SELECTED_POD = document.getElementById("select-pod").value;

    // For simplicity and brevity, this tutorial hardcodes the  SolidDataset URL.
    // In practice, you should add in your profile a link to this resource
    // such that applications can follow to find your list.
    const readingListUrl = `${SELECTED_POD}workshop/ToDo/studyList`;

    let todoItem = todoList.value.split("\n");

    // Fetch or create a new reading list.

    try {
        // Attempt to retrieve the reading list in case it already exists.
        //myReadingList = await getSolidDataset(readingListUrl, { fetch: fetch });
        // Clear the list to override the whole list
        let items = getThingAll(myReadingList);
        items.forEach((item) => {
            console.log(item)
            myReadingList = removeThing(myReadingList, item);
        });
    } catch (error) {
        if (typeof error.statusCode === "number" && error.statusCode === 404) {
            // if not found, create a new SolidDataset (i.e., the reading list)
            myReadingList = createSolidDataset();
        } else {
            setError(error.message);
            console.error(error.message);
        }
    }

    // Add todoItem to the Dataset
    let i = 0;
    todoItem.forEach((title) => {
        if (title.trim() !== "") {
            let item = createThing({ name: "title" + i });
            item = addUrl(item, RDF.type, AS.Article);
            item = addStringNoLocale(item, SCHEMA_INRUPT.name, title);
            myReadingList = setThing(myReadingList, item);
            console.log(myReadingList);
            i++;
        }
    });
    try {
        // Save the SolidDataset
        let savedReadingList = await saveSolidDatasetAt(
          readingListUrl,
          myReadingList,
          { fetch: fetch }
        );
        status.textContent = "Lijst bijgewerkt";
    } catch (error) {
        setError(error);
    }
    
}

async function getTodoList() {
    const SELECTED_POD = document.getElementById("select-pod").value;

    if (SELECTED_POD !== "") {
        const readingListUrl = `${SELECTED_POD}workshop/ToDo/studyList`;
        myReadingList = await getSolidDataset(readingListUrl, { fetch: fetch });

        let savedReadingList = await saveSolidDatasetAt(
            readingListUrl,
            myReadingList,
            { fetch: fetch }
        );

        savedReadingList = await getSolidDataset(readingListUrl, { fetch: fetch });

        let items = getThingAll(savedReadingList);

        let listcontent = "";
        for (let i = 0; i < items.length; i++) {
            let item = getStringNoLocale(items[i], SCHEMA_INRUPT.name);
            if (item !== null) {
                listcontent += item + "\n";
            }
        }
        todoList.textContent = listcontent;
    }
}
function setError(message) {
    error.classList.remove("d-none");
    errorMessage.textContent = message;
}

buttonLogin.onclick = function () {
    loginToSelectedIdP();
};
buttonLogout.onclick = function () {
    console.log("logged out...");
    logout();
    window.location.reload();
};

buttonUpdate.onclick = function () {
    createList();
    console.log("Button clicked");
};

selectPod.addEventListener("change", podSelectionHandler);
function podSelectionHandler() {
    if (selectPod.value === "") {
        buttonUpdate.setAttribute("disabled", "disabled");
        todoList.textContent = "";
    } else {
        buttonUpdate.removeAttribute("disabled");
        getTodoList();
    }
}