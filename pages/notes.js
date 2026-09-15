// =========================================
// JEGYZETEK MODUL
// =========================================


// =========================================
// HTML ELEMEK
// =========================================

const noteTitle = document.getElementById("noteTitle");
const noteText = document.getElementById("noteText");

const saveNoteButton = document.getElementById("saveNote");

const notesList = document.getElementById("notesList");
const emptyNotes = document.getElementById("emptyNotes");
const noteTotal = document.getElementById("noteTotal");


// =========================================
// MODAL ELEMEK
// =========================================

const noteModal = document.getElementById("noteModal");
const noteModalOverlay = document.querySelector(".note-modal-overlay");

const closeNoteModal = document.getElementById("closeNoteModal");

const modalNoteTitle = document.getElementById("modalNoteTitle");
const modalNoteText = document.getElementById("modalNoteText");
const modalNoteDate = document.getElementById("modalNoteDate");


// =========================================
// JEGYZETEK BETÖLTÉSE
// =========================================

let notes = JSON.parse(
    localStorage.getItem("projectHubNotes")
) || [];


// =========================================
// SZERKESZTETT JEGYZET
// =========================================

let editingNoteId = null;


// =========================================
// JEGYZET RÖVIDÍTÉSE
// =========================================

function createPreview(text) {

    const words = text.trim().split(/\s+/);

    const previewWordCount = 10;

    if (words.length <= previewWordCount) {
        return text;
    }

    return words
        .slice(0, previewWordCount)
        .join(" ") + "…";
}


// =========================================
// JEGYZETEK MEGJELENÍTÉSE
// =========================================

function renderNotes() {

    notesList.innerHTML = "";

    noteTotal.textContent = `${notes.length} db`;


    // NINCS JEGYZET

    if (notes.length === 0) {

        emptyNotes.style.display = "block";

        return;
    }


    // VAN JEGYZET

    emptyNotes.style.display = "none";


    notes.forEach(function (note) {

        // =====================================
        // KÁRTYA
        // =====================================

        const noteCard = document.createElement("article");

        noteCard.className = "note-card";


        // =====================================
        // FEJLÉC
        // =====================================

        const noteHeader = document.createElement("div");

        noteHeader.className = "note-card-header";


        // =====================================
        // CÍM
        // =====================================

        const title = document.createElement("h3");

        title.textContent = note.title;


        // =====================================
        // GOMBOK
        // =====================================

        const buttons = document.createElement("div");

        buttons.className = "note-buttons";


        // =====================================
        // SZERKESZTÉS
        // =====================================

        const editButton = document.createElement("button");

        editButton.className = "edit-note";

        editButton.textContent = "✏️";

        editButton.type = "button";

        editButton.title = "Jegyzet szerkesztése";


        editButton.addEventListener("click", function (event) {

            event.stopPropagation();

            editNote(note.id);

        });


        // =====================================
        // TÖRLÉS
        // =====================================

        const deleteButton = document.createElement("button");

        deleteButton.className = "delete-note";

        deleteButton.textContent = "🗑️";

        deleteButton.type = "button";

        deleteButton.title = "Jegyzet törlése";


        deleteButton.addEventListener("click", function (event) {

            event.stopPropagation();

            deleteNote(note.id);

        });


        // =====================================
        // GOMBOK ÖSSZERAKÁSA
        // =====================================

        buttons.appendChild(editButton);

        buttons.appendChild(deleteButton);


        // =====================================
        // FEJLÉC ÖSSZERAKÁSA
        // =====================================

        noteHeader.appendChild(title);

        noteHeader.appendChild(buttons);


        // =====================================
        // RÖVID SZÖVEG
        // =====================================

        const text = document.createElement("p");

        text.className = "note-card-text";

        text.textContent = createPreview(note.text);


        // =====================================
        // DÁTUM
        // =====================================

        const date = document.createElement("small");

        date.className = "note-date";

        date.textContent = note.date;


        // =====================================
        // KÁRTYA ÖSSZERAKÁSA
        // =====================================

        noteCard.appendChild(noteHeader);

        noteCard.appendChild(text);

        noteCard.appendChild(date);


        // =====================================
        // KÁRTYA KATTINTÁS
        // =====================================

        noteCard.addEventListener("click", function () {

            openNoteModal(note.id);

        });


        // =====================================
        // LISTÁHOZ ADÁS
        // =====================================

        notesList.appendChild(noteCard);

    });
}


// =========================================
// ÚJ JEGYZET / SZERKESZTÉS MENTÉSE
// =========================================

saveNoteButton.addEventListener("click", function () {

    const title = noteTitle.value.trim();

    const text = noteText.value.trim();


    // ÜRES MEZŐ ELLENŐRZÉS

    if (title === "" || text === "") {

        alert(
            "Kérlek töltsd ki a címet és a jegyzet szövegét!"
        );

        return;
    }


    // =====================================
    // SZERKESZTÉS
    // =====================================

    if (editingNoteId !== null) {

        notes = notes.map(function (note) {

            if (note.id === editingNoteId) {

                return {

                    id: note.id,

                    title: title,

                    text: text,

                    date: new Date().toLocaleString("hu-HU")

                };

            }

            return note;

        });


        editingNoteId = null;

        saveNoteButton.textContent =
            "💾 Jegyzet mentése";

    }


    // =====================================
    // ÚJ JEGYZET
    // =====================================

    else {

        const newNote = {

            id: Date.now(),

            title: title,

            text: text,

            date: new Date().toLocaleString("hu-HU")

        };


        notes.unshift(newNote);

    }


    // =====================================
    // LOCAL STORAGE
    // =====================================

    localStorage.setItem(
        "projectHubNotes",
        JSON.stringify(notes)
    );


    // =====================================
    // MEZŐK ÜRÍTÉSE
    // =====================================

    noteTitle.value = "";

    noteText.value = "";


    // =====================================
    // MEGJELENÍTÉS FRISSÍTÉSE
    // =====================================

    renderNotes();

});


// =========================================
// JEGYZET SZERKESZTÉSE
// =========================================

function editNote(id) {

    const note = notes.find(function (item) {

        return item.id === id;

    });


    if (!note) {

        return;

    }


    noteTitle.value = note.title;

    noteText.value = note.text;


    editingNoteId = id;


    saveNoteButton.textContent =
        "💾 Módosítás mentése";


    // FELGÖRGETÉS

    window.scrollTo({

        top: 0,

        behavior: "smooth"

    });

}


// =========================================
// JEGYZET TÖRLÉSE
// =========================================

function deleteNote(id) {

    const confirmed = confirm(
        "Biztosan törölni szeretnéd ezt a jegyzetet?"
    );


    if (!confirmed) {

        return;

    }


    notes = notes.filter(function (note) {

        return note.id !== id;

    });


    localStorage.setItem(
        "projectHubNotes",
        JSON.stringify(notes)
    );


    renderNotes();

}


// =========================================
// TELJES JEGYZET MEGNYITÁSA
// =========================================

function openNoteModal(id) {

    const note = notes.find(function (item) {

        return item.id === id;

    });


    if (!note) {

        return;

    }


    // =====================================
    // ADATOK BEÍRÁSA
    // =====================================

    modalNoteTitle.textContent = note.title;

    modalNoteText.textContent = note.text;

    modalNoteDate.textContent = note.date;


    // =====================================
    // MODAL MEGNYITÁSA
    // =====================================

    noteModal.classList.add("open");


    // OLDAL SCROLL LEZÁRÁSA

    document.body.classList.add("note-modal-open");

}


// =========================================
// MODAL BEZÁRÁSA
// =========================================

function closeModal() {

    noteModal.classList.remove("open");

    document.body.classList.remove("note-modal-open");

}


// =========================================
// ✕ GOMB
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
// ESC GOMB
// =========================================

document.addEventListener(
    "keydown",
    function (event) {

        if (
            event.key === "Escape" &&
            noteModal.classList.contains("open")
        ) {

            closeModal();

        }

    }
);


// =========================================
// INDULÁSKOR BETÖLTÉS
// =========================================

renderNotes();
