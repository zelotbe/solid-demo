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

import { VCARD, RDF, AS, SCHEMA_INRUPT, FOAF } from "@inrupt/vocab-common-rdf";

// DOM elements that we are gonna use
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
let list;

//HIDING VARIOUS ELEMENTS
main.classList.add("d-none");
welkom.classList.add("d-none");
buttonUpdate.setAttribute("disabled", "disabled");

// LOGIN
function loginToSelectedIdP() {
    return login({
        oidcIssuer: "https://solidcommunity.net",
        redirectUrl: window.location.href,
        clientName: "Workshop Solid"
    });
}

//AFTER LOGIN -> READ DATA
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

handleRedirectAfterLogin();

// RETRIEVE POD(S) FROM THE USER
async function getMyPods() {
    const session = getDefaultSession();
    const webID = session.info.webId;

    const mypods = await getPodUrlAll(webID, { fetch: fetch });

    mypods.forEach((mypod) => {
        let podOption = document.createElement("option");
        podOption.textContent = mypod;
        podOption.value = mypod;
        selectPod.appendChild(podOption);
    });
}

//READ PROFILE FOR NAME
async function readProfile() {
    const session = getDefaultSession();
    const webID = session.info.webId;

    //CHECK IF THE WEBID IS VALID
    try {
        new URL(webID);
    } catch (_) {
        setError(`[${webID}] is geen geldige URL.`);
        return false;
    }

    //URL CLEANUP (REMOVE THINGS AFTER URL)
    const profileDocumentUrl = new URL(webID);
    profileDocumentUrl.hash = "";

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

    const formattedName = getStringNoLocale(profile, FOAF.name);

    // UPDATE HTML FOR NAME
    welkom.classList.remove("d-none");
    welkom.innerHTML += ` <a href="${webID}" target="_blank">${formattedName}</a>`;
}

// CREATE TODO LIST
async function createList() {
    status.textContent = "";
    const SELECTED_POD = document.getElementById("select-pod").value;

    const readingListUrl = `${SELECTED_POD}workshop/ToDo/studyList`;

    let todoItem = todoList.value.split("\n");

    //TRY TO GET THE LIST FROM THE POD
    try {
        list = await getSolidDataset(readingListUrl, { fetch: fetch });

        // CLEARING THE LIST TO OVERRIDE
        let items = getThingAll(list);
        items.forEach((item) => {
            console.log(item)
            list = removeThing(list, item);
        });
    } catch (error) {
        if (typeof error.statusCode === "number" && error.statusCode === 404) {
            // IF THE LIST DOES NOT EXIST THEN CREATE A NEW ONE
            list = createSolidDataset();
        } else {
            setError(error.message);
            console.error(error.message);
        }
    }

    // ADD ITEMS TO THE LIST
    let i = 0;
    todoItem.forEach((title) => {
        if (title.trim() !== "") {
            let item = createThing({ name: "title" + i });
            item = addUrl(item, RDF.type, AS.Article);
            item = addStringNoLocale(item, SCHEMA_INRUPT.name, title);
            list = setThing(list, item);
            console.log(list);
            i++;
        }
    });

    //TRY TO SAVE THE LIST
    try {
        let savedReadingList = await saveSolidDatasetAt(
            readingListUrl,
            list,
            { fetch: fetch }
        );
        status.textContent = "Lijst bijgewerkt";
    } catch (error) {
        setError(error);
    }
}
// GET THE TODO LIST
async function getTodoList() {
    const SELECTED_POD = document.getElementById("select-pod").value;

    //SELECT VALUE CHECK
    if (SELECTED_POD !== "") {
        const readingListUrl = `${SELECTED_POD}workshop/ToDo/studyList`;
        list = await getSolidDataset(readingListUrl, { fetch: fetch });

        let savedReadingList = await saveSolidDatasetAt(
            readingListUrl,
            list,
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