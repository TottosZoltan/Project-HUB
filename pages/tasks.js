// =========================================
// PROJECT HUB
// FELADATOK MODUL
// =========================================


// =========================================
// HTML ELEMEK
// =========================================

const taskTitle =
    document.getElementById("taskTitle");

const taskDescription =
    document.getElementById("taskDescription");

const taskPriority =
    document.getElementById("taskPriority");

const taskCategory =
    document.getElementById("taskCategory");

const saveTaskButton =
    document.getElementById("saveTask");

const tasksList =
    document.getElementById("tasksList");

const emptyTasks =
    document.getElementById("emptyTasks");

const noTaskResults =
    document.getElementById("noTaskResults");

const taskTotal =
    document.getElementById("taskTotal");

const taskSearch =
    document.getElementById("taskSearch");

const taskStatusFilter =
    document.getElementById("taskStatusFilter");

const taskCategoryFilter =
    document.getElementById("taskCategoryFilter");

const taskSort =
    document.getElementById("taskSort");


// =========================================
// STATISZTIKA
// =========================================

const totalTasks =
    document.getElementById("totalTasks");

const activeTasks =
    document.getElementById("activeTasks");

const completedTasks =
    document.getElementById("completedTasks");

const progressPercent =
    document.getElementById("progressPercent");

const progressText =
    document.getElementById("progressText");

const progressBar =
    document.getElementById("progressBar");


// =========================================
// ADATOK
// =========================================

let tasks = JSON.parse(
    localStorage.getItem("projectHubTasks")
) || [];


// =========================================
// RÉGI ADATOK KOMPATIBILITÁSA
// =========================================

tasks = tasks.map(function (task) {

    return {

        id: task.id || Date.now(),

        title:
            task.title ||
            "Névtelen feladat",

        description:
            task.description || "",

        priority:
            task.priority ||
            "normal",

        category:
            task.category ||
            "Egyéb",

        completed:
            task.completed === true,

        pinned:
            task.pinned === true,

        date:
            task.date || ""

    };

});


// =========================================
// SZERKESZTÉSI ÁLLAPOT
// =========================================

let editingTaskId = null;


// =========================================
// PRIORITÁSOK
// =========================================

const priorityOrder = {

    high: 3,

    normal: 2,

    low: 1

};


// =========================================
// PRIORITÁS NEVE
// =========================================

function getPriorityName(priority) {

    const names = {

        low: "Alacsony",

        normal: "Normál",

        high: "Magas"

    };

    return names[priority] || "Normál";

}


// =========================================
// PRIORITÁS IKON
// =========================================

function getPriorityIcon(priority) {

    const icons = {

        low: "🟢",

        normal: "🟡",

        high: "🔴"

    };

    return icons[priority] || "🟡";

}


// =========================================
// KATEGÓRIA IKON
// =========================================

function getCategoryIcon(category) {

    const icons = {

        "Munka": "💼",

        "Személyes": "👤",

        "Projekt": "🚀",

        "Fontos": "⭐",

        "Egyéb": "📁"

    };

    return icons[category] || "📁";

}


// =========================================
// LOCAL STORAGE MENTÉS
// =========================================

function saveTasksToStorage() {

    localStorage.setItem(
        "projectHubTasks",
        JSON.stringify(tasks)
    );

}


// =========================================
// FELADATOK SZŰRÉSE
// =========================================

function getFilteredTasks() {

    const searchValue =
        taskSearch.value
            .trim()
            .toLowerCase();

    const selectedStatus =
        taskStatusFilter.value;

    const selectedCategory =
        taskCategoryFilter.value;


    let filteredTasks =
        tasks.filter(function (task) {


            // =================================
            // KERESÉS
            // =================================

            const matchesSearch =

                task.title
                    .toLowerCase()
                    .includes(searchValue)

                ||

                task.description
                    .toLowerCase()
                    .includes(searchValue);


            if (!matchesSearch) {

                return false;

            }


            // =================================
            // STÁTUSZ
            // =================================

            if (
                selectedStatus === "active" &&
                task.completed
            ) {

                return false;

            }


            if (
                selectedStatus === "completed" &&
                !task.completed
            ) {

                return false;

            }


            // =================================
            // KATEGÓRIA
            // =================================

            if (
                selectedCategory !== "all" &&
                task.category !== selectedCategory
            ) {

                return false;

            }


            return true;

        });


    // =========================================
    // RENDEZÉS
    // =========================================

    const sortValue =
        taskSort.value;


    if (sortValue === "newest") {

        filteredTasks.sort(
            function (a, b) {

                return Number(b.id) -
                    Number(a.id);

            }
        );

    }


    else if (sortValue === "oldest") {

        filteredTasks.sort(
            function (a, b) {

                return Number(a.id) -
                    Number(b.id);

            }
        );

    }


    else if (sortValue === "priority") {

        filteredTasks.sort(
            function (a, b) {

                return (
                    priorityOrder[b.priority] -
                    priorityOrder[a.priority]
                );

            }
        );

    }


    else if (sortValue === "az") {

        filteredTasks.sort(
            function (a, b) {

                return a.title.localeCompare(
                    b.title,
                    "hu"
                );

            }
        );

    }


    else if (sortValue === "za") {

        filteredTasks.sort(
            function (a, b) {

                return b.title.localeCompare(
                    a.title,
                    "hu"
                );

            }
        );

    }


    else {

        // Alapértelmezett:
        // aktív először,
        // utána prioritás,
        // majd legújabb.

        filteredTasks.sort(
            function (a, b) {


                if (
                    a.completed !==
                    b.completed
                ) {

                    return a.completed
                        ? 1
                        : -1;

                }


                if (
                    a.pinned !==
                    b.pinned
                ) {

                    return a.pinned
                        ? -1
                        : 1;

                }


                const priorityDifference =

                    priorityOrder[b.priority] -
                    priorityOrder[a.priority];


                if (
                    priorityDifference !== 0
                ) {

                    return priorityDifference;

                }


                return Number(b.id) -
                    Number(a.id);

            }
        );

    }


    // =========================================
    // FONTOS / RÖGZÍTETT ELŐRE
    // =========================================

    if (sortValue !== "default") {

        filteredTasks.sort(
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

    }


    return filteredTasks;

}


// =========================================
// STATISZTIKA FRISSÍTÉSE
// =========================================

function updateStats() {

    const total =
        tasks.length;


    const completed =
        tasks.filter(
            function (task) {

                return task.completed;

            }
        ).length;


    const active =
        total - completed;


    let percentage = 0;


    if (total > 0) {

        percentage =
            Math.round(
                (completed / total) * 100
            );

    }


    totalTasks.textContent =
        total;


    activeTasks.textContent =
        active;


    completedTasks.textContent =
        completed;


    progressPercent.textContent =
        `${percentage}%`;


    progressText.textContent =
        `${completed} / ${total}`;


    progressBar.style.width =
        `${percentage}%`;

}


// =========================================
// FELADATOK MEGJELENÍTÉSE
// =========================================

function renderTasks() {

    tasksList.innerHTML = "";


    updateStats();


    const filteredTasks =
        getFilteredTasks();


    // =========================================
    // DARABSZÁM
    // =========================================

    if (
        taskSearch.value.trim() !== "" ||
        taskStatusFilter.value !== "all" ||
        taskCategoryFilter.value !== "all"
    ) {

        taskTotal.textContent =
            `${filteredTasks.length} / ${tasks.length} db`;

    }

    else {

        taskTotal.textContent =
            `${tasks.length} db`;

    }


    // =========================================
    // NINCS FELADAT
    // =========================================

    if (tasks.length === 0) {

        emptyTasks.style.display =
            "block";

        noTaskResults.style.display =
            "none";

        return;

    }


    emptyTasks.style.display =
        "none";


    // =========================================
    // NINCS TALÁLAT
    // =========================================

    if (filteredTasks.length === 0) {

        noTaskResults.style.display =
            "block";

        return;

    }


    noTaskResults.style.display =
        "none";


    // =========================================
    // KÁRTYÁK
    // =========================================

    filteredTasks.forEach(
        function (task) {


            // =================================
            // KÁRTYA
            // =================================

            const taskCard =
                document.createElement("article");

            taskCard.className =
                "task-card";


            if (task.completed) {

                taskCard.classList.add(
                    "task-completed"
                );

            }


            if (task.pinned) {

                taskCard.classList.add(
                    "task-pinned"
                );

            }


            // =================================
            // FEJLÉC
            // =================================

            const taskHeader =
                document.createElement("div");

            taskHeader.className =
                "task-card-header";


            // =================================
            // BAL OLDAL
            // =================================

            const taskMain =
                document.createElement("div");

            taskMain.className =
                "task-main";


            // =================================
            // CHECKBOX
            // =================================

            const checkbox =
                document.createElement("button");

            checkbox.className =
                "task-checkbox";

            checkbox.type =
                "button";

            checkbox.setAttribute(
                "aria-label",
                task.completed
                    ? "Feladat visszaállítása"
                    : "Feladat készre jelölése"
            );


            checkbox.textContent =
                task.completed
                    ? "✓"
                    : "";


            checkbox.addEventListener(
                "click",
                function (event) {

                    event.stopPropagation();

                    toggleTaskComplete(
                        task.id
                    );

                }
            );


            // =================================
            // CÍM
            // =================================

            const title =
                document.createElement("h3");

            title.textContent =
                task.title;


            // =================================
            // CÍM TERÜLET
            // =================================

            const titleWrapper =
                document.createElement("div");

            titleWrapper.className =
                "task-title-wrapper";


            titleWrapper.appendChild(
                title
            );


            if (task.pinned) {

                const pin =
                    document.createElement("span");

                pin.className =
                    "task-pin";

                pin.textContent =
                    "📌";

                pin.title =
                    "Fontos feladat";

                titleWrapper.appendChild(
                    pin
                );

            }


            taskMain.appendChild(
                checkbox
            );

            taskMain.appendChild(
                titleWrapper
            );


            // =================================
            // GOMBOK
            // =================================

            const taskButtons =
                document.createElement("div");

            taskButtons.className =
                "task-buttons";


            // =================================
            // PIN
            // =================================

            const pinButton =
                document.createElement("button");

            pinButton.className =
                "task-pin-button";

            pinButton.type =
                "button";

            pinButton.textContent =
                task.pinned
                    ? "📌"
                    : "📍";

            pinButton.title =
                task.pinned
                    ? "Fontos jelölés levétele"
                    : "Fontos feladat";


            pinButton.addEventListener(
                "click",
                function (event) {

                    event.stopPropagation();

                    toggleTaskPin(
                        task.id
                    );

                }
            );


            // =================================
            // SZERKESZTÉS
            // =================================

            const editButton =
                document.createElement("button");

            editButton.className =
                "edit-task";

            editButton.type =
                "button";

            editButton.textContent =
                "✏️";

            editButton.title =
                "Feladat szerkesztése";


            editButton.addEventListener(
                "click",
                function (event) {

                    event.stopPropagation();

                    editTask(
                        task.id
                    );

                }
            );


            // =================================
            // TÖRLÉS
            // =================================

            const deleteButton =
                document.createElement("button");

            deleteButton.className =
                "delete-task";

            deleteButton.type =
                "button";

            deleteButton.textContent =
                "🗑️";

            deleteButton.title =
                "Feladat törlése";


            deleteButton.addEventListener(
                "click",
                function (event) {

                    event.stopPropagation();

                    deleteTask(
                        task.id
                    );

                }
            );


            taskButtons.appendChild(
                pinButton
            );

            taskButtons.appendChild(
                editButton
            );

            taskButtons.appendChild(
                deleteButton
            );


            // =================================
            // FEJLÉC
            // =================================

            taskHeader.appendChild(
                taskMain
            );

            taskHeader.appendChild(
                taskButtons
            );


            // =================================
            // META
            // =================================

            const taskMeta =
                document.createElement("div");

            taskMeta.className =
                "task-meta";


            // PRIORITÁS

            const priority =
                document.createElement("span");

            priority.className =
                `task-priority priority-${task.priority}`;

            priority.textContent =
                `${getPriorityIcon(task.priority)} ${getPriorityName(task.priority)}`;


            // KATEGÓRIA

            const category =
                document.createElement("span");

            category.className =
                "task-category";

            category.textContent =
                `${getCategoryIcon(task.category)} ${task.category}`;


            taskMeta.appendChild(
                priority
            );

            taskMeta.appendChild(
                category
            );


            // =================================
            // LEÍRÁS
            // =================================

            if (
                task.description.trim() !== ""
            ) {

                const description =
                    document.createElement("p");

                description.className =
                    "task-description";

                description.textContent =
                    task.description;


                taskCard.appendChild(
                    description
                );

            }


            // =================================
            // DÁTUM
            // =================================

            const date =
                document.createElement("small");

            date.className =
                "task-date";

            date.textContent =
                task.date;


            // =================================
            // ÖSSZEÁLLÍTÁS
            // =================================

            taskCard.appendChild(
                taskHeader
            );

            taskCard.appendChild(
                taskMeta
            );


            if (
                task.description.trim() !== ""
            ) {

                // A leírás már hozzá lett adva.

            }


            taskCard.appendChild(
                date
            );


            // =================================
            // KATTINTÁS
            // =================================

            taskCard.addEventListener(
                "click",
                function () {

                    toggleTaskComplete(
                        task.id
                    );

                }
            );


            tasksList.appendChild(
                taskCard
            );

        }
    );

}


// =========================================
// ÚJ FELADAT / SZERKESZTÉS
// =========================================

saveTaskButton.addEventListener(
    "click",
    function () {


        const title =
            taskTitle.value.trim();

        const description =
            taskDescription.value.trim();

        const priority =
            taskPriority.value;

        const category =
            taskCategory.value;


        // =====================================
        // ELLENŐRZÉS
        // =====================================

        if (title === "") {

            alert(
                "Kérlek add meg a feladat nevét!"
            );

            taskTitle.focus();

            return;

        }


        // =====================================
        // SZERKESZTÉS
        // =====================================

        if (
            editingTaskId !== null
        ) {


            tasks =
                tasks.map(
                    function (task) {


                        if (
                            task.id ===
                            editingTaskId
                        ) {

                            return {

                                id: task.id,

                                title: title,

                                description:
                                    description,

                                priority:
                                    priority,

                                category:
                                    category,

                                completed:
                                    task.completed,

                                pinned:
                                    task.pinned,

                                date:
                                    new Date()
                                        .toLocaleString(
                                            "hu-HU"
                                        )

                            };

                        }


                        return task;

                    }
                );


            editingTaskId =
                null;


            saveTaskButton.textContent =
                "➕ Feladat hozzáadása";

        }


        // =====================================
        // ÚJ FELADAT
        // =====================================

        else {


            const newTask = {

                id: Date.now(),

                title: title,

                description:
                    description,

                priority:
                    priority,

                category:
                    category,

                completed:
                    false,

                pinned:
                    false,

                date:
                    new Date()
                        .toLocaleString(
                            "hu-HU"
                        )

            };


            tasks.unshift(
                newTask
            );

        }


        // =====================================
        // MENTÉS
        // =====================================

        saveTasksToStorage();


        // =====================================
        // MEZŐK ÜRÍTÉSE
        // =====================================

        taskTitle.value = "";

        taskDescription.value = "";

        taskPriority.value =
            "normal";

        taskCategory.value =
            "Egyéb";


        // =====================================
        // FRISSÍTÉS
        // =====================================

        renderTasks();

    }
);


// =========================================
// KÉSZ / NEM KÉSZ
// =========================================

function toggleTaskComplete(id) {

    tasks =
        tasks.map(
            function (task) {


                if (
                    task.id === id
                ) {

                    return {

                        ...task,

                        completed:
                            !task.completed

                    };

                }


                return task;

            }
        );


    saveTasksToStorage();

    renderTasks();

}


// =========================================
// FONTOS / PIN
// =========================================

function toggleTaskPin(id) {

    tasks =
        tasks.map(
            function (task) {


                if (
                    task.id === id
                ) {

                    return {

                        ...task,

                        pinned:
                            !task.pinned

                    };

                }


                return task;

            }
        );


    saveTasksToStorage();

    renderTasks();

}


// =========================================
// SZERKESZTÉS
// =========================================

function editTask(id) {


    const task =
        tasks.find(
            function (item) {

                return item.id === id;

            }
        );


    if (!task) {

        return;

    }


    taskTitle.value =
        task.title;

    taskDescription.value =
        task.description;

    taskPriority.value =
        task.priority;

    taskCategory.value =
        task.category;


    editingTaskId =
        id;


    saveTaskButton.textContent =
        "💾 Módosítás mentése";


    window.scrollTo({

        top: 0,

        behavior: "smooth"

    });

}


// =========================================
// TÖRLÉS
// =========================================

function deleteTask(id) {


    const confirmed =
        confirm(
            "Biztosan törölni szeretnéd ezt a feladatot?"
        );


    if (!confirmed) {

        return;

    }


    tasks =
        tasks.filter(
            function (task) {

                return task.id !== id;

            }
        );


    if (
        editingTaskId === id
    ) {

        editingTaskId =
            null;

        saveTaskButton.textContent =
            "➕ Feladat hozzáadása";

    }


    saveTasksToStorage();

    renderTasks();

}


// =========================================
// KERESÉS
// =========================================

taskSearch.addEventListener(
    "input",
    function () {

        renderTasks();

    }
);


// =========================================
// STÁTUSZ SZŰRÉS
// =========================================

taskStatusFilter.addEventListener(
    "change",
    function () {

        renderTasks();

    }
);


// =========================================
// KATEGÓRIA SZŰRÉS
// =========================================

taskCategoryFilter.addEventListener(
    "change",
    function () {

        renderTasks();

    }
);


// =========================================
// RENDEZÉS
// =========================================

taskSort.addEventListener(
    "change",
    function () {

        renderTasks();

    }
);


// =========================================
// ESC A KERESŐBEN
// =========================================

taskSearch.addEventListener(
    "keydown",
    function (event) {

        if (
            event.key === "Escape"
        ) {

            taskSearch.value = "";

            renderTasks();

            taskSearch.blur();

        }

    }
);


// =========================================
// ENTER = FELADAT MENTÉSE
// =========================================

taskTitle.addEventListener(
    "keydown",
    function (event) {

        if (
            event.key === "Enter"
        ) {

            event.preventDefault();

            saveTaskButton.click();

        }

    }
);


// =========================================
// INDULÁS
// =========================================

saveTasksToStorage();

renderTasks();
