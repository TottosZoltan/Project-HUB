// =========================================
// PROJECT HUB
// JEGYZETEK MODUL
// USERHEZ KÖTÖTT - POSTGRESQL
// =========================================


// =========================================
// BACKEND
// =========================================

const BACKEND_URL =
    "https://project-hub-backend-1.onrender.com";


// =========================================
// HTML ELEMEK
// =========================================

const noteTitle =
    document.getElementById("noteTitle");

const noteText =
    document.getElementById("noteText");

const noteCategory =
    document.getElementById("noteCategory");

const saveNoteButton =
    document.getElementById("saveNote");

const notesList =
    document.getElementById("notesList");

const emptyNotes =
    document.getElementById("emptyNotes");

const noSearchResults =
    document.getElementById("noSearchResults");

const noteTotal =
    document.getElementById("noteTotal");

const noteSearch =
    document.getElementById("noteSearch");

const categoryFilter =
    document.getElementById("categoryFilter");

const sortNotes =
    document.getElementById("sortNotes");


// =========================================
// MODAL ELEMEK
// =========================================

const noteModal =
    document.getElementById("noteModal");

const noteModalOverlay =
    document.querySelector(
        ".note-modal-overlay"
    );

const closeNoteModal =
    document.getElementById(
        "closeNoteModal"
    );

const modalNoteTitle =
    document.getElementById(
        "modalNoteTitle"
    );

const modalNoteText =
    document.getElementById(
        "modalNoteText"
    );

const modalNoteDate =
    document.getElementById(
        "modalNoteDate"
    );

const modalNoteCategory =
    document.getElementById(
        "modalNoteCategory"
    );


// =========================================
// ÖSSZECSUKHATÓ PANELS
// =========================================

const toggleNoteEditor =
    document.getElementById(
        "toggleNoteEditor"
    );

const toggleNoteFilters =
    document.getElementById(
        "toggleNoteFilters"
    );

const noteEditor =
    document.getElementById(
        "noteEditor"
    );

const noteFilters =
    document.getElementById(
        "noteFilters"
    );


// =========================================
// JEGYZETEK
// =========================================

let notes = [];


// =========================================
// VÁLTOZÓK
// =========================================

let editingNoteId = null;

let loadingNotes = false;

let savingNote = false;


// =========================================
// AUTH TOKEN
// =========================================

function getAuthToken() {

    return localStorage.getItem(
        "projectHubAuthToken"
    );

}


// =========================================
// AUTH HEADERS
// =========================================

function getAuthHeaders() {

    const token =
        getAuthToken();


    const headers = {
        "Content-Type": "application/json"
    };


    if (token) {

        headers.Authorization =
            "Bearer " + token;

    }


    return headers;

}


// =========================================
// LOGIN OLDAL
// =========================================

function redirectToLogin(message) {

    localStorage.removeItem(
        "projectHubAuthToken"
    );


    if (message) {

        sessionStorage.setItem(
            "projectHubAuthMessage",
            message
        );

    }


    window.location.href =
        "../auth/login.html";

}


// =========================================
// API HIBA KEZELÉS
// =========================================

async function getApiErrorMessage(
    response
) {

    try {

        const result =
            await response.json();


        if (
            result &&
            result.message
        ) {

            return result.message;

        }

    }
    catch (error) {

        console.error(
            "API hiba válasz feldolgozási hiba:",
            error
        );

    }


    return "Ismeretlen szerverhiba történt.";

}


// =========================================
// JEGYZETEK BETÖLTÉSE
// =========================================

async function loadNotes() {

    if (loadingNotes) {

        return;

    }


    loadingNotes = true;


    try {

        const token =
            getAuthToken();


        if (!token) {

            redirectToLogin(
                "🔐 A Jegyzetek használatához be kell jelentkezned."
            );

            return;

        }


        const response =
            await fetch(
                BACKEND_URL +
                "/api/notes",
                {
                    method: "GET",

                    headers:
                        getAuthHeaders(),

                    credentials:
                        "include"
                }
            );


        if (
            response.status === 401
        ) {

            redirectToLogin(
                "🔐 A munkameneted lejárt. Kérlek jelentkezz be újra."
            );

            return;

        }


        if (!response.ok) {

            const message =
                await getApiErrorMessage(
                    response
                );

            throw new Error(
                message
            );

        }


        const result =
            await response.json();


        if (
            !result.success
        ) {

            throw new Error(
                result.message ||
                "Nem sikerült betölteni a jegyzeteket."
            );

        }


        // =====================================
        // BACKEND FORMÁTUM -> FRONTEND FORMÁTUM
        // =====================================

        notes =
            Array.isArray(result.notes)
                ? result.notes.map(
                    normalizeNote
                )
                : [];


        renderNotes();

    }
    catch (error) {

        console.error(
            "JEGYZETEK BETÖLTÉSI HIBA:",
            error
        );


        notesList.innerHTML = "";


        emptyNotes.style.display =
            "none";


        noSearchResults.style.display =
            "block";


        noSearchResults.innerHTML = `
            <div class="empty-icon">
                ⚠️
            </div>

            <h3>
                Nem sikerült betölteni a jegyzeteket
            </h3>

            <p>
                ${escapeHtml(
                    error.message ||
                    "Szerverhiba történt."
                )}
            </p>
        `;

    }
    finally {

        loadingNotes = false;

    }

}


// =========================================
// JEGYZET NORMALIZÁLÁSA
// =========================================

function normalizeNote(note) {

    const id =
        Number(note.id);


    return {

        id:
            Number.isFinite(id)
                ? id
                : note.id,

        title:
            typeof note.title === "string"
                ? note.title
                : "Névtelen jegyzet",

        text:
            typeof note.content === "string"
                ? note.content
                : "",

        category:
            typeof note.category === "string" &&
            note.category.trim() !== ""
                ? note.category
                : "Egyéb",

        pinned:
            note.pinned === true,

        date:
            formatNoteDate(
                note.updated_at ||
                note.created_at
            )

    };

}


// =========================================
// DÁTUM FORMÁZÁSA
// =========================================

function formatNoteDate(dateValue) {

    if (!dateValue) {

        return "";

    }


    const date =
        new Date(dateValue);


    if (
        Number.isNaN(
            date.getTime()
        )
    ) {

        return "";

    }


    return date.toLocaleString(
        "hu-HU"
    );

}


// =========================================
// HTML ESCAPE
// =========================================

function escapeHtml(value) {

    return String(value)
        .replace(
            /&/g,
            "&amp;"
        )
        .replace(
            /</g,
            "&lt;"
        )
        .replace(
            />/g,
            "&gt;"
        )
        .replace(
            /"/g,
            "&quot;"
        )
        .replace(
            /'/g,
            "&#039;"
        );

}


// =========================================
// KATEGÓRIA IKON
// =========================================

function getCategoryIcon(category) {

    const icons = {

        "Ötlet": "💡",

        "Munka": "💼",

        "Személyes": "👤",

        "Fontos": "⭐",

        "Projekt": "🚀",

        "Egyéb": "📁"

    };


    return (
        icons[category] ||
        "📁"
    );

}


// =========================================
// JEGYZET RÖVIDÍTÉSE
// =========================================

function createPreview(text) {

    const cleanText =
        String(text || "").trim();


    if (!cleanText) {

        return "";

    }


    const words =
        cleanText.split(/\s+/);


    const previewWordCount =
        10;


    if (
        words.length <=
        previewWordCount
    ) {

        return cleanText;

    }


    return words
        .slice(
            0,
            previewWordCount
        )
        .join(" ") +
        "…";

}


// =========================================
// JEGYZETEK SZŰRÉSE
// =========================================

function getFilteredNotes() {

    const searchValue =
        noteSearch.value
            .trim()
            .toLowerCase();


    const selectedCategory =
        categoryFilter.value;


    let filteredNotes =
        notes.filter(
            function (note) {

                const title =
                    String(
                        note.title || ""
                    ).toLowerCase();


                const text =
                    String(
                        note.text || ""
                    ).toLowerCase();


                const matchesSearch =

                    title.includes(
                        searchValue
                    )

                    ||

                    text.includes(
                        searchValue
                    );


                if (!matchesSearch) {

                    return false;

                }


                if (
                    selectedCategory !==
                        "all" &&

                    note.category !==
                        selectedCategory
                ) {

                    return false;

                }


                return true;

            }
        );


    // =====================================
    // RENDEZÉS
    // =====================================

    const sortValue =
        sortNotes.value;


    if (
        sortValue === "az"
    ) {

        filteredNotes.sort(
            function (a, b) {

                return a.title.localeCompare(
                    b.title,
                    "hu"
                );

            }
        );

    }


    else if (
        sortValue === "za"
    ) {

        filteredNotes.sort(
            function (a, b) {

                return b.title.localeCompare(
                    a.title,
                    "hu"
                );

            }
        );

    }


    else if (
        sortValue === "oldest"
    ) {

        filteredNotes.sort(
            function (a, b) {

                return (
                    Number(a.id) -
                    Number(b.id)
                );

            }
        );

    }


    else {

        filteredNotes.sort(
            function (a, b) {

                return (
                    Number(b.id) -
                    Number(a.id)
                );

            }
        );

    }


    // =====================================
    // RÖGZÍTETT JEGYZETEK ELŐRE
    // =====================================

    filteredNotes.sort(
        function (a, b) {

            if (
                a.pinned &&
                !b.pinned
            ) {

                return -1;

            }


            if (
                !a.pinned &&
                b.pinned
            ) {

                return 1;

            }


            return 0;

        }
    );


    return filteredNotes;

}


// =========================================
// JEGYZETEK MEGJELENÍTÉSE
// =========================================

function renderNotes() {

    notesList.innerHTML = "";


    const filteredNotes =
        getFilteredNotes();


    // =====================================
    // DARABSZÁM
    // =====================================

    if (
        noteSearch.value.trim() !== "" ||
        categoryFilter.value !== "all"
    ) {

        noteTotal.textContent =
            `${filteredNotes.length} / ${notes.length} db`;

    }

    else {

        noteTotal.textContent =
            `${notes.length} db`;

    }


    // =====================================
    // TELJESEN ÜRES
    // =====================================

    if (
        notes.length === 0
    ) {

        emptyNotes.style.display =
            "block";

        noSearchResults.style.display =
            "none";

        return;

    }


    emptyNotes.style.display =
        "none";


    // =====================================
    // NINCS TALÁLAT
    // =====================================

    if (
        filteredNotes.length === 0
    ) {

        noSearchResults.style.display =
            "block";

        return;

    }


    noSearchResults.style.display =
        "none";


    // =====================================
    // KÁRTYÁK
    // =====================================

    filteredNotes.forEach(
        function (note) {


            // =================================
            // KÁRTYA
            // =================================

            const noteCard =
                document.createElement(
                    "article"
                );


            noteCard.className =
                "note-card";


            if (note.pinned) {

                noteCard.classList.add(
                    "pinned-note"
                );

            }


            // =================================
            // FEJLÉC
            // =================================

            const noteHeader =
                document.createElement(
                    "div"
                );


            noteHeader.className =
                "note-card-header";


            // =================================
            // CÍM RÉSZ
            // =================================

            const titleArea =
                document.createElement(
                    "div"
                );


            titleArea.className =
                "note-title-area";


            // =================================
            // RÖGZÍTÉS IKON
            // =================================

            if (note.pinned) {

                const pinIcon =
                    document.createElement(
                        "span"
                    );


                pinIcon.className =
                    "pin-indicator";


                pinIcon.textContent =
                    "📌";


                pinIcon.title =
                    "Rögzített jegyzet";


                titleArea.appendChild(
                    pinIcon
                );

            }


            // =================================
            // CÍM
            // =================================

            const title =
                document.createElement(
                    "h3"
                );


            title.textContent =
                note.title;


            titleArea.appendChild(
                title
            );


            // =================================
            // GOMBOK
            // =================================

            const buttons =
                document.createElement(
                    "div"
                );


            buttons.className =
                "note-buttons";


            // =================================
            // RÖGZÍTÉS
            // =================================

            const pinButton =
                document.createElement(
                    "button"
                );


            pinButton.className =
                "pin-note";


            pinButton.type =
                "button";


            pinButton.textContent =
                note.pinned
                    ? "📌"
                    : "📍";


            pinButton.title =
                note.pinned
                    ? "Levétel a rögzítésből"
                    : "Jegyzet rögzítése";


            pinButton.addEventListener(
                "click",
                function (event) {

                    event.stopPropagation();

                    togglePinNote(
                        note.id
                    );

                }
            );


            // =================================
            // SZERKESZTÉS
            // =================================

            const editButton =
                document.createElement(
                    "button"
                );


            editButton.className =
                "edit-note";


            editButton.textContent =
                "✏️";


            editButton.type =
                "button";


            editButton.title =
                "Jegyzet szerkesztése";


            editButton.addEventListener(
                "click",
                function (event) {

                    event.stopPropagation();

                    editNote(
                        note.id
                    );

                }
            );


            // =================================
            // TÖRLÉS
            // =================================

            const deleteButton =
                document.createElement(
                    "button"
                );


            deleteButton.className =
                "delete-note";


            deleteButton.textContent =
                "🗑️";


            deleteButton.type =
                "button";


            deleteButton.title =
                "Jegyzet törlése";


            deleteButton.addEventListener(
                "click",
                function (event) {

                    event.stopPropagation();

                    deleteNote(
                        note.id
                    );

                }
            );


            // =================================
            // GOMBOK
            // =================================

            buttons.appendChild(
                pinButton
            );

            buttons.appendChild(
                editButton
            );

            buttons.appendChild(
                deleteButton
            );


            // =================================
            // FEJLÉC
            // =================================

            noteHeader.appendChild(
                titleArea
            );

            noteHeader.appendChild(
                buttons
            );


            // =================================
            // KATEGÓRIA
            // =================================

            const category =
                document.createElement(
                    "span"
                );


            category.className =
                "note-category";


            category.textContent =
                `${getCategoryIcon(
                    note.category
                )} ${note.category}`;


            // =================================
            // SZÖVEG
            // =================================

            const text =
                document.createElement(
                    "p"
                );


            text.className =
                "note-card-text";


            text.textContent =
                createPreview(
                    note.text
                );


            // =================================
            // DÁTUM
            // =================================

            const date =
                document.createElement(
                    "small"
                );


            date.className =
                "note-date";


            date.textContent =
                note.date;


            // =================================
            // KÁRTYA ÖSSZEÁLLÍTÁSA
            // =================================

            noteCard.appendChild(
                noteHeader
            );

            noteCard.appendChild(
                category
            );

            noteCard.appendChild(
                text
            );

            noteCard.appendChild(
                date
            );


            // =================================
            // KATTINTÁS
            // =================================

            noteCard.addEventListener(
                "click",
                function () {

                    openNoteModal(
                        note.id
                    );

                }
            );


            notesList.appendChild(
                noteCard
            );

        }
    );

}


// =========================================
// ÚJ JEGYZET LÉTREHOZÁSA
// =========================================

async function createNote() {

    const title =
        noteTitle.value.trim();

    const text =
        noteText.value.trim();

    const category =
        noteCategory.value;


    // =====================================
    // ELLENŐRZÉS
    // =====================================

    if (
        title === "" ||
        text === ""
    ) {

        alert(
            "Kérlek töltsd ki a címet és a jegyzet szövegét!"
        );

        return;

    }


    try {

        const response =
            await fetch(
                BACKEND_URL +
                "/api/notes",
                {
                    method: "POST",

                    headers:
                        getAuthHeaders(),

                    credentials:
                        "include",

                    body:
                        JSON.stringify({

                            title:
                                title,

                            content:
                                text,

                            category:
                                category,

                            pinned:
                                false

                        })

                }
            );


        if (
            response.status === 401
        ) {

            redirectToLogin(
                "🔐 A munkameneted lejárt. Kérlek jelentkezz be újra."
            );

            return;

        }


        if (!response.ok) {

            const message =
                await getApiErrorMessage(
                    response
                );

            throw new Error(
                message
            );

        }


        const result =
            await response.json();


        if (
            !result.success ||
            !result.note
        ) {

            throw new Error(
                result.message ||
                "Nem sikerült létrehozni a jegyzetet."
            );

        }


        notes.unshift(
            normalizeNote(
                result.note
            )
        );


        // =====================================
        // MEZŐK ÜRÍTÉSE
        // =====================================

        noteTitle.value =
            "";

        noteText.value =
            "";

        noteCategory.value =
            "Egyéb";


        // =====================================
        // PANEL BEZÁRÁSA
        // =====================================

        noteEditor.classList.remove(
            "open"
        );


        toggleNoteEditor.textContent =
            "➕ Új jegyzet";


        renderNotes();

    }
    catch (error) {

        console.error(
            "NOTE CREATE HIBA:",
            error
        );


        alert(
            error.message ||
            "Nem sikerült létrehozni a jegyzetet."
        );

    }

}


// =========================================
// JEGYZET SZERKESZTÉSE
// =========================================

async function updateNote(
    noteId
) {

    const title =
        noteTitle.value.trim();

    const text =
        noteText.value.trim();

    const category =
        noteCategory.value;


    // =====================================
    // ELLENŐRZÉS
    // =====================================

    if (
        title === "" ||
        text === ""
    ) {

        alert(
            "Kérlek töltsd ki a címet és a jegyzet szövegét!"
        );

        return;

    }


    const currentNote =
        notes.find(
            function (note) {

                return (
                    note.id === noteId
                );

            }
        );


    if (!currentNote) {

        alert(
            "A jegyzet nem található."
        );

        return;

    }


    try {

        const response =
            await fetch(
                BACKEND_URL +
                "/api/notes/" +
                encodeURIComponent(
                    noteId
                ),
                {
                    method: "PUT",

                    headers:
                        getAuthHeaders(),

                    credentials:
                        "include",

                    body:
                        JSON.stringify({

                            title:
                                title,

                            content:
                                text,

                            category:
                                category,

                            pinned:
                                currentNote.pinned === true

                        })

                }
            );


        if (
            response.status === 401
        ) {

            redirectToLogin(
                "🔐 A munkameneted lejárt. Kérlek jelentkezz be újra."
            );

            return;

        }


        if (!response.ok) {

            const message =
                await getApiErrorMessage(
                    response
                );

            throw new Error(
                message
            );

        }


        const result =
            await response.json();


        if (
            !result.success ||
            !result.note
        ) {

            throw new Error(
                result.message ||
                "Nem sikerült módosítani a jegyzetet."
            );

        }


        notes =
            notes.map(
                function (note) {

                    if (
                        note.id === noteId
                    ) {

                        return normalizeNote(
                            result.note
                        );

                    }


                    return note;

                }
            );


        editingNoteId =
            null;


        saveNoteButton.textContent =
            "💾 Jegyzet mentése";


        noteTitle.value =
            "";

        noteText.value =
            "";

        noteCategory.value =
            "Egyéb";


        noteEditor.classList.remove(
            "open"
        );


        toggleNoteEditor.textContent =
            "➕ Új jegyzet";


        renderNotes();

    }
    catch (error) {

        console.error(
            "NOTE UPDATE HIBA:",
            error
        );


        alert(
            error.message ||
            "Nem sikerült módosítani a jegyzetet."
        );

    }

}


// =========================================
// MENTÉS GOMB
// =========================================

saveNoteButton.addEventListener(
    "click",
    async function () {

        if (savingNote) {

            return;

        }


        savingNote = true;


        try {

            if (
                editingNoteId !== null
            ) {

                await updateNote(
                    editingNoteId
                );

            }

            else {

                await createNote();

            }

        }
        finally {

            savingNote = false;

        }

    }
);


// =========================================
// JEGYZET SZERKESZTÉSE
// =========================================

function editNote(id) {

    const note =
        notes.find(
            function (item) {

                return (
                    item.id === id
                );

            }
        );


    if (!note) {

        return;

    }


    noteTitle.value =
        note.title;


    noteText.value =
        note.text;


    noteCategory.value =
        note.category;


    editingNoteId =
        id;


    saveNoteButton.textContent =
        "💾 Módosítás mentése";


    if (noteEditor) {

        noteEditor.classList.add(
            "open"
        );

    }


    if (toggleNoteEditor) {

        toggleNoteEditor.textContent =
            "➖ Új jegyzet";

    }


    window.scrollTo({

        top: 0,

        behavior: "smooth"

    });

}


// =========================================
// JEGYZET RÖGZÍTÉSE
// =========================================

async function togglePinNote(id) {

    const note =
        notes.find(
            function (item) {

                return (
                    item.id === id
                );

            }
        );


    if (!note) {

        return;

    }


    try {

        const response =
            await fetch(
                BACKEND_URL +
                "/api/notes/" +
                encodeURIComponent(
                    id
                ),
                {
                    method: "PUT",

                    headers:
                        getAuthHeaders(),

                    credentials:
                        "include",

                    body:
                        JSON.stringify({

                            title:
                                note.title,

                            content:
                                note.text,

                            category:
                                note.category,

                            pinned:
                                !note.pinned

                        })

                }
            );


        if (
            response.status === 401
        ) {

            redirectToLogin(
                "🔐 A munkameneted lejárt. Kérlek jelentkezz be újra."
            );

            return;

        }


        if (!response.ok) {

            const message =
                await getApiErrorMessage(
                    response
                );

            throw new Error(
                message
            );

        }


        const result =
            await response.json();


        if (
            !result.success ||
            !result.note
        ) {

            throw new Error(
                result.message ||
                "Nem sikerült módosítani a jegyzetet."
            );

        }


        notes =
            notes.map(
                function (item) {

                    if (
                        item.id === id
                    ) {

                        return normalizeNote(
                            result.note
                        );

                    }


                    return item;

                }
            );


        renderNotes();

    }
    catch (error) {

        console.error(
            "NOTE PIN HIBA:",
            error
        );


        alert(
            error.message ||
            "Nem sikerült módosítani a jegyzetet."
        );

    }

}


// =========================================
// JEGYZET TÖRLÉSE
// =========================================

async function deleteNote(id) {

    const confirmed =
        confirm(
            "Biztosan törölni szeretnéd ezt a jegyzetet?"
        );


    if (!confirmed) {

        return;

    }


    try {

        const response =
            await fetch(
                BACKEND_URL +
                "/api/notes/" +
                encodeURIComponent(
                    id
                ),
                {
                    method: "DELETE",

                    headers:
                        getAuthHeaders(),

                    credentials:
                        "include"
                }
            );


        if (
            response.status === 401
        ) {

            redirectToLogin(
                "🔐 A munkameneted lejárt. Kérlek jelentkezz be újra."
            );

            return;

        }


        if (!response.ok) {

            const message =
                await getApiErrorMessage(
                    response
                );

            throw new Error(
                message
            );

        }


        const result =
            await response.json();


        if (
            !result.success
        ) {

            throw new Error(
                result.message ||
                "Nem sikerült törölni a jegyzetet."
            );

        }


        notes =
            notes.filter(
                function (note) {

                    return (
                        note.id !== id
                    );

                }
            );


        if (
            editingNoteId === id
        ) {

            editingNoteId =
                null;

            noteTitle.value =
                "";

            noteText.value =
                "";

            noteCategory.value =
                "Egyéb";

            saveNoteButton.textContent =
                "💾 Jegyzet mentése";

        }


        renderNotes();

    }
    catch (error) {

        console.error(
            "NOTE DELETE HIBA:",
            error
        );


        alert(
            error.message ||
            "Nem sikerült törölni a jegyzetet."
        );

    }

}


// =========================================
// TELJES JEGYZET MEGNYITÁSA
// =========================================

function openNoteModal(id) {

    const note =
        notes.find(
            function (item) {

                return (
                    item.id === id
                );

            }
        );


    if (!note) {

        return;

    }


    modalNoteTitle.textContent =
        note.title;


    modalNoteText.textContent =
        note.text;


    modalNoteDate.textContent =
        note.date;


    modalNoteCategory.textContent =
        `${getCategoryIcon(
            note.category
        )} ${note.category}`;


    noteModal.classList.add(
        "open"
    );


    document.body.classList.add(
        "note-modal-open"
    );

}


// =========================================
// MODAL BEZÁRÁSA
// =========================================

function closeModal() {

    noteModal.classList.remove(
        "open"
    );


    document.body.classList.remove(
        "note-modal-open"
    );

}


// =========================================
// BEZÁRÁS GOMB
// =========================================

closeNoteModal.addEventListener(
    "click",
    closeModal
);


// =========================================
// HÁTTÉRRE KATTINTÁS
// =========================================

noteModalOverlay.addEventListener(
    "click",
    closeModal
);


// =========================================
// ESC
// =========================================

document.addEventListener(
    "keydown",
    function (event) {

        if (
            event.key === "Escape" &&
            noteModal.classList.contains(
                "open"
            )
        ) {

            closeModal();

        }

    }
);


// =========================================
// KERESÉS
// =========================================

noteSearch.addEventListener(
    "input",
    function () {

        renderNotes();

    }
);


// =========================================
// KATEGÓRIA SZŰRÉS
// =========================================

categoryFilter.addEventListener(
    "change",
    function () {

        renderNotes();

    }
);


// =========================================
// RENDEZÉS
// =========================================

sortNotes.addEventListener(
    "change",
    function () {

        renderNotes();

    }
);


// =========================================
// ESC A KERESŐBEN
// =========================================

noteSearch.addEventListener(
    "keydown",
    function (event) {

        if (
            event.key === "Escape"
        ) {

            noteSearch.value =
                "";

            renderNotes();

            noteSearch.blur();

        }

    }
);


// =========================================
// ÚJ JEGYZET PANEL
// =========================================

toggleNoteEditor.addEventListener(
    "click",
    function () {

        const isOpen =
            noteEditor.classList.contains(
                "open"
            );


        noteEditor.classList.toggle(
            "open"
        );


        if (isOpen) {

            toggleNoteEditor.textContent =
                "➕ Új jegyzet";

        }

        else {

            toggleNoteEditor.textContent =
                "➖ Új jegyzet";

            noteTitle.focus();

        }

    }
);


// =========================================
// KERESÉS + SZŰRÉS PANEL
// =========================================

toggleNoteFilters.addEventListener(
    "click",
    function () {

        const isOpen =
            noteFilters.classList.contains(
                "open"
            );


        noteFilters.classList.toggle(
            "open"
        );


        if (isOpen) {

            toggleNoteFilters.textContent =
                "🔎 Keresés és szűrés";

        }

        else {

            toggleNoteFilters.textContent =
                "➖ Keresés és szűrés";

            noteSearch.focus();

        }

    }
);


// =========================================
// INDULÁS
// =========================================
//
// FONTOS:
// NINCS localStorage JEGYZETTÁROLÁS.
// A jegyzeteket mindig a backend,
// az aktuálisan bejelentkezett user
// alapján tölti be.
// =========================================

loadNotes();
