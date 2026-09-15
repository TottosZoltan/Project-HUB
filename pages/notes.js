// =========================================
// PROJECT HUB
// JEGYZETEK MODUL
// =========================================


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
    document.querySelector(".note-modal-overlay");

const closeNoteModal =
    document.getElementById("closeNoteModal");

const modalNoteTitle =
    document.getElementById("modalNoteTitle");

const modalNoteText =
    document.getElementById("modalNoteText");

const modalNoteDate =
    document.getElementById("modalNoteDate");

const modalNoteCategory =
    document.getElementById("modalNoteCategory");


// =========================================
// JEGYZETEK BETÖLTÉSE
// =========================================

let notes = JSON.parse(
    localStorage.getItem("projectHubNotes")
) || [];


// =========================================
// RÉGI JEGYZETEK FRISSÍTÉSE
// =========================================

notes = notes.map(function (note) {

    return {

        id: note.id || Date.now(),

        title: note.title || "Névtelen jegyzet",

        text: note.text || "",

        date: note.date || "",

        category: note.category || "Egyéb",

        pinned: note.pinned === true

    };

});


// =========================================
// VÁLTOZÓK
// =========================================

let editingNoteId = null;


// =========================================
// JEGYZETEK MENTÉSE LOCAL STORAGE-BA
// =========================================

function saveNotesToStorage() {

    localStorage.setItem(
        "projectHubNotes",
        JSON.stringify(notes)
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

    return icons[category] || "📁";

}


// =========================================
// JEGYZET RÖVIDÍTÉSE
// =========================================

function createPreview(text) {

    const words =
        text.trim().split(/\s+/);

    const previewWordCount = 10;


    if (words.length <= previewWordCount) {

        return text;

    }


    return words
        .slice(0, previewWordCount)
        .join(" ") + "…";

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
        notes.filter(function (note) {


            // ==============================
            // KERESÉS
            // ==============================

            const matchesSearch =

                note.title
                    .toLowerCase()
                    .includes(searchValue)

                ||

                note.text
                    .toLowerCase()
                    .includes(searchValue);


            if (!matchesSearch) {

                return false;

            }


            // ==============================
            // KATEGÓRIA
            // ==============================

            if (
                selectedCategory !== "all" &&
                note.category !== selectedCategory
            ) {

                return false;

            }


            return true;

        });


    // =====================================
    // RENDEZÉS
    // =====================================

    const sortValue =
        sortNotes.value;


    if (sortValue === "az") {

        filteredNotes.sort(function (a, b) {

            return a.title.localeCompare(
                b.title,
                "hu"
            );

        });

    }


    else if (sortValue === "za") {

        filteredNotes.sort(function (a, b) {

            return b.title.localeCompare(
                a.title,
                "hu"
            );

        });

    }


    else if (sortValue === "oldest") {

        filteredNotes.sort(function (a, b) {

            return Number(a.id) - Number(b.id);

        });

    }


    else {

        filteredNotes.sort(function (a, b) {

            return Number(b.id) - Number(a.id);

        });

    }


    // =====================================
    // RÖGZÍTETT JEGYZETEK ELŐRE
    // =====================================

    filteredNotes.sort(function (a, b) {

        if (a.pinned && !b.pinned) {

            return -1;

        }

        if (!a.pinned && b.pinned) {

            return 1;

        }

        return 0;

    });


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

    if (notes.length === 0) {

        emptyNotes.style.display = "block";

        noSearchResults.style.display = "none";

        return;

    }


    emptyNotes.style.display = "none";


    // =====================================
    // NINCS TALÁLAT
    // =====================================

    if (filteredNotes.length === 0) {

        noSearchResults.style.display = "block";

        return;

    }


    noSearchResults.style.display = "none";


    // =====================================
    // KÁRTYÁK
    // =====================================

    filteredNotes.forEach(function (note) {


        // =================================
        // KÁRTYA
        // =================================

        const noteCard =
            document.createElement("article");

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
            document.createElement("div");

        noteHeader.className =
            "note-card-header";


        // =================================
        // CÍM RÉSZ
        // =================================

        const titleArea =
            document.createElement("div");

        titleArea.className =
            "note-title-area";


        // =================================
        // RÖGZÍTÉS IKON
        // =================================

        if (note.pinned) {

            const pinIcon =
                document.createElement("span");

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
            document.createElement("h3");

        title.textContent =
            note.title;


        titleArea.appendChild(title);


        // =================================
        // GOMBOK
        // =================================

        const buttons =
            document.createElement("div");

        buttons.className =
            "note-buttons";


        // =================================
        // RÖGZÍTÉS
        // =================================

        const pinButton =
            document.createElement("button");

        pinButton.className =
            "pin-note";

        pinButton.type =
            "button";

        pinButton.textContent =
            note.pinned ? "📌" : "📍";

        pinButton.title =
            note.pinned
                ? "Levétel a rögzítésből"
                : "Jegyzet rögzítése";


        pinButton.addEventListener(
            "click",
            function (event) {

                event.stopPropagation();

                togglePinNote(note.id);

            }
        );


        // =================================
        // SZERKESZTÉS
        // =================================

        const editButton =
            document.createElement("button");

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

                editNote(note.id);

            }
        );


        // =================================
        // TÖRLÉS
        // =================================

        const deleteButton =
            document.createElement("button");

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

                deleteNote(note.id);

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
            document.createElement("span");

        category.className =
            "note-category";

        category.textContent =
            `${getCategoryIcon(note.category)} ${note.category}`;


        // =================================
        // SZÖVEG
        // =================================

        const text =
            document.createElement("p");

        text.className =
            "note-card-text";

        text.textContent =
            createPreview(note.text);


        // =================================
        // DÁTUM
        // =================================

        const date =
            document.createElement("small");

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

                openNoteModal(note.id);

            }
        );


        notesList.appendChild(
            noteCard
        );

    });

}


// =========================================
// ÚJ JEGYZET / SZERKESZTÉS MENTÉSE
// =========================================

saveNoteButton.addEventListener(
    "click",
    function () {


        const title =
            noteTitle.value.trim();

        const text =
            noteText.value.trim();

        const category =
            noteCategory.value;


        // ==============================
        // ELLENŐRZÉS
        // ==============================

        if (
            title === "" ||
            text === ""
        ) {

            alert(
                "Kérlek töltsd ki a címet és a jegyzet szövegét!"
            );

            return;

        }


        // ==============================
        // SZERKESZTÉS
        // ==============================

        if (
            editingNoteId !== null
        ) {


            notes = notes.map(
                function (note) {


                    if (
                        note.id ===
                        editingNoteId
                    ) {

                        return {

                            id: note.id,

                            title: title,

                            text: text,

                            category: category,

                            pinned:
                                note.pinned === true,

                            date:
                                new Date()
                                    .toLocaleString(
                                        "hu-HU"
                                    )

                        };

                    }


                    return note;

                }
            );


            editingNoteId = null;


            saveNoteButton.textContent =
                "💾 Jegyzet mentése";

        }


        // ==============================
        // ÚJ JEGYZET
        // ==============================

        else {


            const newNote = {

                id: Date.now(),

                title: title,

                text: text,

                category: category,

                pinned: false,

                date:
                    new Date()
                        .toLocaleString(
                            "hu-HU"
                        )

            };


            notes.unshift(
                newNote
            );

        }


        // ==============================
        // MENTÉS
        // ==============================

        saveNotesToStorage();


        // ==============================
        // MEZŐK ÜRÍTÉSE
        // ==============================

        noteTitle.value = "";

        noteText.value = "";

        noteCategory.value =
            "Egyéb";


        // ==============================
        // LISTA FRISSÍTÉSE
        // ==============================

        renderNotes();

    }
);


// =========================================
// JEGYZET SZERKESZTÉSE
// =========================================

function editNote(id) {


    const note =
        notes.find(
            function (item) {

                return item.id === id;

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


    window.scrollTo({

        top: 0,

        behavior: "smooth"

    });

}


// =========================================
// JEGYZET RÖGZÍTÉSE
// =========================================

function togglePinNote(id) {


    notes = notes.map(
        function (note) {


            if (note.id === id) {

                return {

                    ...note,

                    pinned:
                        !note.pinned

                };

            }


            return note;

        }
    );


    saveNotesToStorage();

    renderNotes();

}


// =========================================
// JEGYZET TÖRLÉSE
// =========================================

function deleteNote(id) {


    const confirmed =
        confirm(
            "Biztosan törölni szeretnéd ezt a jegyzetet?"
        );


    if (!confirmed) {

        return;

    }


    notes = notes.filter(
        function (note) {

            return note.id !== id;

        }
    );


    saveNotesToStorage();

    renderNotes();

}


// =========================================
// TELJES JEGYZET MEGNYITÁSA
// =========================================

function openNoteModal(id) {


    const note =
        notes.find(
            function (item) {

                return item.id === id;

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
        `${getCategoryIcon(note.category)} ${note.category}`;


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
// ENTER A KERESŐBEN
// =========================================

noteSearch.addEventListener(
    "keydown",
    function (event) {

        if (event.key === "Escape") {

            noteSearch.value = "";

            renderNotes();

            noteSearch.blur();

        }

    }
);


// =========================================
// INDULÁS
// =========================================

saveNotesToStorage();

renderNotes();
