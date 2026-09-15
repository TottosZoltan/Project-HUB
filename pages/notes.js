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


// JEGYZETEK BETÖLTÉSE

let notes = JSON.parse(
    localStorage.getItem("projectHubNotes")
) || [];


// =========================
// JEGYZETEK MEGJELENÍTÉSE
// =========================

function renderNotes() {

    notesList.innerHTML = "";


    // DARABSZÁM

    noteTotal.textContent = `${notes.length} db`;


    // HA NINCS JEGYZET

    if (notes.length === 0) {

        emptyNotes.style.display = "block";

        return;

    }


    // VAN JEGYZET

    emptyNotes.style.display = "none";


    notes.forEach(function (note) {


        const noteCard = document.createElement("article");

        noteCard.className = "note-card";


        // JEGYZET FEJLÉC

        const noteHeader = document.createElement("div");

        noteHeader.className = "note-card-header";


        // CÍM

        const title = document.createElement("h3");

        title.textContent = note.title;


        // TÖRLÉS GOMB

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


        noteHeader.appendChild(title);

        noteHeader.appendChild(deleteButton);


        // SZÖVEG

        const text = document.createElement("p");

        text.className = "note-card-text";

        text.textContent = note.text;


        // DÁTUM

        const date = document.createElement("small");

        date.className = "note-date";

        date.textContent = note.date;


        // ÖSSZEÁLLÍTÁS

        noteCard.appendChild(noteHeader);

        noteCard.appendChild(text);

        noteCard.appendChild(date);


        notesList.appendChild(noteCard);

    });

}


// =========================
// JEGYZET MENTÉSE
// =========================

saveNoteButton.addEventListener(
    "click",
    function () {


        const title = noteTitle.value.trim();

        const text = noteText.value.trim();


        // ÜRES ELLENŐRZÉS

        if (title === "" || text === "") {

            alert("Kérlek töltsd ki a címet és a jegyzet szövegét!");

            return;

        }


        // ÚJ JEGYZET

        const newNote = {

            id: Date.now(),

            title: title,

            text: text,

            date: new Date().toLocaleString("hu-HU")

        };


        // LISTÁHOZ ADÁS

        notes.unshift(newNote);


        // MENTÉS

        localStorage.setItem(
            "projectHubNotes",
            JSON.stringify(notes)
        );


        // MEZŐK KIÜRÍTÉSE

        noteTitle.value = "";

        noteText.value = "";


        // LISTA FRISSÍTÉSE

        renderNotes();

    }
);


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
