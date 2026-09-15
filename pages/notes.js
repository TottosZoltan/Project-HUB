// =========================
// JEGYZETEK MODUL
// =========================


// HTML ELEMEK

const noteTitle = document.getElementById("noteTitle");
const noteText = document.getElementById("noteText");

const saveNoteButton = document.getElementById("saveNote");

const notesList = document.getElementById("notesList");
const emptyNotes = document.getElementById("emptyNotes");
const noteTotal = document.getElementById("noteTotal");


// =========================
// JEGYZETEK BETÖLTÉSE
// =========================

let notes = JSON.parse(
    localStorage.getItem("projectHubNotes")
) || [];


// =========================
// SZERKESZTETT JEGYZET
// =========================

let editingNoteId = null;


// =========================
// JEGYZETEK MEGJELENÍTÉSE
// =========================

function renderNotes() {

    notesList.innerHTML = "";

    noteTotal.textContent = `${notes.length} db`;

    if (notes.length === 0) {

        emptyNotes.style.display = "block";

        return;
    }

    emptyNotes.style.display = "none";


    notes.forEach(function (note) {

        const noteCard = document.createElement("article");

        noteCard.className = "note-card";


        // =========================
        // FEJLÉC
        // =========================

        const noteHeader = document.createElement("div");

        noteHeader.className = "note-card-header";


        const title = document.createElement("h3");

        title.textContent = note.title;


        // GOMBOK

        const buttons = document.createElement("div");

        buttons.className = "note-buttons";


        // SZERKESZTÉS

        const editButton = document.createElement("button");

        editButton.className = "edit-note";

        editButton.textContent = "✏️";

        editButton.type = "button";


        editButton.addEventListener(
            "click",
            function () {

                editNote(note.id);

            }
        );


        // TÖRLÉS

        const deleteButton = document.createElement("button");

        deleteButton.className = "delete-note";

        deleteButton.textContent = "🗑️";

        deleteButton.type = "button";


        deleteButton.addEventListener(
            "click",
            function () {

                deleteNote(note.id);

            }
        );


        buttons.appendChild(editButton);

        buttons.appendChild(deleteButton);


        noteHeader.appendChild(title);

        noteHeader.appendChild(buttons);


        // =========================
        // SZÖVEG
        // =========================

        const text = document.createElement("p");

        text.className = "note-card-text";

        text.textContent = note.text;


        // =========================
        // DÁTUM
        // =========================

        const date = document.createElement("small");

        date.className = "note-date";

        date.textContent = note.date;


        // =========================
        // KÁRTYA
        // =========================

        noteCard.appendChild(noteHeader);

        noteCard.appendChild(text);

        noteCard.appendChild(date);


        notesList.appendChild(noteCard);

    });

}


// =========================
// ÚJ JEGYZET / SZERKESZTÉS MENTÉSE
// =========================

saveNoteButton.addEventListener(
    "click",
    function () {

        const title = noteTitle.value.trim();

        const text = noteText.value.trim();


        if (title === "" || text === "") {

            alert(
                "Kérlek töltsd ki a címet és a jegyzet szövegét!"
            );

            return;
        }


        // =========================
        // SZERKESZTÉS
        // =========================

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


        // =========================
        // ÚJ JEGYZET
        // =========================

        else {

            const newNote = {

                id: Date.now(),

                title: title,

                text: text,

                date: new Date().toLocaleString("hu-HU")

            };


            notes.unshift(newNote);

        }


        // MENTÉS

        localStorage.setItem(
            "projectHubNotes",
            JSON.stringify(notes)
        );


        // MEZŐK ÜRÍTÉSE

        noteTitle.value = "";

        noteText.value = "";


        renderNotes();

    }
);


// =========================
// JEGYZET SZERKESZTÉSE
// =========================

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


    // VISSZAGÖRGETÉS A SZERKESZTŐHÖZ

    window.scrollTo({

        top: 0,

        behavior: "smooth"

    });

}


// =========================
// JEGYZET TÖRLÉSE
// =========================

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


// =========================
// INDULÁSKOR BETÖLTÉS
// =========================

renderNotes();
