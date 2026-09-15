// =========================================
// PROJECT HUB
// FELADATOK MODUL
// USER-SPECIFIC API VERZIÓ
// =========================================


// =========================================
// BACKEND
// =========================================

const BACKEND_URL =
    "https://project-hub-backend-1.onrender.com";


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
// ÖSSZECSUKHATÓ PANEL ELEMEK
// =========================================

const toggleTaskEditor =
    document.getElementById(
        "toggleTaskEditor"
    );

const toggleTaskFilters =
    document.getElementById(
        "toggleTaskFilters"
    );

const taskEditor =
    document.getElementById(
        "taskEditor"
    );

const taskFilters =
    document.getElementById(
        "taskFilters"
    );


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

let tasks = [];


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
// TOKEN
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

    return {

        "Content-Type":
            "application/json",

        "Authorization":
            "Bearer " + token

    };

}


// =========================================
// PRIORITÁS NEVE
// =========================================

function getPriorityName(priority) {

    const names = {

        low: "Alacsony",

        normal: "Normál",

        high: "Magas"

    };

    return names[priority] ||
        "Normál";

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

    return icons[priority] ||
        "🟡";

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

    return icons[category] ||
        "📁";

}


// =========================================
// FELADAT NORMALIZÁLÁS
// =========================================

function normalizeTask(task) {

    return {

        id:
            task.id,

        title:
            task.title ||
            "Névtelen feladat",

        description:
            task.description ||
            "",

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
            task.date ||
            task.created_at ||
            ""

    };

}


// =========================================
// API HIBA KEZELÉS
// =========================================

async function getApiErrorMessage(response) {

    try {

        const result =
            await response.json();

        return (
            result.message ||
            result.error ||
            "Ismeretlen szerverhiba."
        );

    }

    catch (error) {

        return "Ismeretlen szerverhiba.";

    }

}


// =========================================
// FELADATOK BETÖLTÉSE
// =========================================

async function loadTasks() {

    const token =
        getAuthToken();

    if (!token) {

        return;

    }


    try {

        const response =
            await fetch(
                BACKEND_URL +
                "/api/tasks",
                {

                    method: "GET",

                    headers:
                        getAuthHeaders(),

                    credentials:
                        "include"

                }
            );


        if (
            response.status === 401 ||
            response.status === 403
        ) {

            localStorage.removeItem(
                "projectHubAuthToken"
            );

            window.location.href =
                "../auth/login.html";

            return;

        }


        if (!response.ok) {

            const errorMessage =
                await getApiErrorMessage(
                    response
                );

            throw new Error(
                errorMessage
            );

        }


        const result =
            await response.json();


        if (
            Array.isArray(result.tasks)
        ) {

            tasks =
                result.tasks.map(
                    normalizeTask
                );

        }

        else {

            tasks = [];

        }


        renderTasks();

    }

    catch (error) {

        console.error(
            "FELADATOK BETÖLTÉSI HIBA:",
            error
        );

        tasks = [];

        renderTasks();

        alert(
            "A feladatokat nem sikerült betölteni.\n\n" +
            error.message
        );

    }

}


// =========================================
// FELADAT LÉTREHOZÁSA
// =========================================

async function createTask(
    title,
    description,
    priority,
    category
) {

    const response =
        await fetch(
            BACKEND_URL +
            "/api/tasks",
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

                        description:
                            description,

                        priority:
                            priority,

                        category:
                            category

                    })

            }
        );


    if (
        response.status === 401 ||
        response.status === 403
    ) {

        localStorage.removeItem(
            "projectHubAuthToken"
        );

        window.location.href =
            "../auth/login.html";

        return null;

    }


    if (!response.ok) {

        const errorMessage =
            await getApiErrorMessage(
                response
            );

        throw new Error(
            errorMessage
        );

    }


    const result =
        await response.json();


    return result.task;

}


// =========================================
// FELADAT MÓDOSÍTÁSA
// =========================================
// FONTOS:
// Ez részleges módosítást használ.
// Ezért például:
// { completed: true }
// vagy:
// { pinned: true }
// önmagában is működik.
// =========================================

async function updateTask(
    id,
    data
) {

    const response =
        await fetch(
            BACKEND_URL +
            "/api/tasks/" +
            encodeURIComponent(id),
            {

                method: "PUT",

                headers:
                    getAuthHeaders(),

                credentials:
                    "include",

                body:
                    JSON.stringify(data)

            }
        );


    if (
        response.status === 401 ||
        response.status === 403
    ) {

        localStorage.removeItem(
            "projectHubAuthToken"
        );

        window.location.href =
            "../auth/login.html";

        return null;

    }


    if (!response.ok) {

        const errorMessage =
            await getApiErrorMessage(
                response
            );

        throw new Error(
            errorMessage
        );

    }


    const result =
        await response.json();


    return result.task;

}


// =========================================
// FELADAT TÖRLÉSE
// =========================================

async function removeTask(id) {

    const response =
        await fetch(
            BACKEND_URL +
            "/api/tasks/" +
            encodeURIComponent(id),
            {

                method: "DELETE",

                headers:
                    getAuthHeaders(),

                credentials:
                    "include"

            }
        );


    if (
        response.status === 401 ||
        response.status === 403
    ) {

        localStorage.removeItem(
            "projectHubAuthToken"
        );

        window.location.href =
            "../auth/login.html";

        return false;

    }


    if (!response.ok) {

        const errorMessage =
            await getApiErrorMessage(
                response
            );

        throw new Error(
            errorMessage
        );

    }


    return true;

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
        tasks.filter(
            function (task) {

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


                if (
                    selectedCategory !== "all" &&
                    task.category !== selectedCategory
                ) {

                    return false;

                }


                return true;

            }
        );


    const sortValue =
        taskSort.value;


    if (
        sortValue === "newest"
    ) {

        filteredTasks.sort(
            function (a, b) {

                return Number(b.id) -
                    Number(a.id);

            }
        );

    }


    else if (
        sortValue === "oldest"
    ) {

        filteredTasks.sort(
            function (a, b) {

                return Number(a.id) -
                    Number(b.id);

            }
        );

    }


    else if (
        sortValue === "priority"
    ) {

        filteredTasks.sort(
            function (a, b) {

                return (
                    priorityOrder[b.priority] -
                    priorityOrder[a.priority]
                );

            }
        );

    }


    else if (
        sortValue === "az"
    ) {

        filteredTasks.sort(
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


    if (
        sortValue !== "default"
    ) {

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


    if (
        tasks.length === 0
    ) {

        emptyTasks.style.display =
            "block";

        noTaskResults.style.display =
            "none";

        return;

    }


    emptyTasks.style.display =
        "none";


    if (
        filteredTasks.length === 0
    ) {

        noTaskResults.style.display =
            "block";

        return;

    }


    noTaskResults.style.display =
        "none";


    filteredTasks.forEach(
        function (task) {

            const taskCard =
                document.createElement(
                    "article"
                );

            taskCard.className =
                "task-card";


            if (
                task.completed
            ) {

                taskCard.classList.add(
                    "task-completed"
                );

            }


            if (
                task.pinned
            ) {

                taskCard.classList.add(
                    "task-pinned"
                );

            }


            const taskHeader =
                document.createElement(
                    "div"
                );

            taskHeader.className =
                "task-card-header";


            const taskMain =
                document.createElement(
                    "div"
                );

            taskMain.className =
                "task-main";


            const checkbox =
                document.createElement(
                    "button"
                );

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


            const title =
                document.createElement(
                    "h3"
                );

            title.textContent =
                task.title;


            const titleWrapper =
                document.createElement(
                    "div"
                );

            titleWrapper.className =
                "task-title-wrapper";


            titleWrapper.appendChild(
                title
            );


            if (
                task.pinned
            ) {

                const pin =
                    document.createElement(
                        "span"
                    );

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


            const taskButtons =
                document.createElement(
                    "div"
                );

            taskButtons.className =
                "task-buttons";


            const pinButton =
                document.createElement(
                    "button"
                );

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


            const editButton =
                document.createElement(
                    "button"
                );

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


            const deleteButton =
                document.createElement(
                    "button"
                );

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


            taskHeader.appendChild(
                taskMain
            );

            taskHeader.appendChild(
                taskButtons
            );


            const taskMeta =
                document.createElement(
                    "div"
                );

            taskMeta.className =
                "task-meta";


            const priority =
                document.createElement(
                    "span"
                );

            priority.className =
                `task-priority priority-${task.priority}`;

            priority.textContent =
                `${getPriorityIcon(task.priority)} ${getPriorityName(task.priority)}`;


            const category =
                document.createElement(
                    "span"
                );

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


            let description = null;


            if (
                task.description.trim() !== ""
            ) {

                description =
                    document.createElement(
                        "p"
                    );

                description.className =
                    "task-description";

                description.textContent =
                    task.description;

            }


            const date =
                document.createElement(
                    "small"
                );

            date.className =
                "task-date";

            date.textContent =
                task.date;


            taskCard.appendChild(
                taskHeader
            );

            taskCard.appendChild(
                taskMeta
            );


            if (
                description
            ) {

                taskCard.appendChild(
                    description
                );

            }


            taskCard.appendChild(
                date
            );


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

if (
    saveTaskButton
) {

    saveTaskButton.addEventListener(
        "click",
        async function () {

            const title =
                taskTitle.value.trim();

            const description =
                taskDescription.value.trim();

            const priority =
                taskPriority.value;

            const category =
                taskCategory.value;


            if (
                title === ""
            ) {

                alert(
                    "Kérlek add meg a feladat nevét!"
                );

                taskTitle.focus();

                return;

            }


            saveTaskButton.disabled =
                true;


            try {

                // =================================
                // SZERKESZTÉS
                // =================================

                if (
                    editingTaskId !== null
                ) {

                    const updatedTask =
                        await updateTask(
                            editingTaskId,
                            {

                                title:
                                    title,

                                description:
                                    description,

                                priority:
                                    priority,

                                category:
                                    category

                            }
                        );


                    if (updatedTask) {

                        tasks =
                            tasks.map(
                                function (task) {

                                    if (
                                        Number(task.id) ===
                                        Number(editingTaskId)
                                    ) {

                                        return normalizeTask(
                                            updatedTask
                                        );

                                    }

                                    return task;

                                }
                            );

                    }


                    editingTaskId =
                        null;


                    saveTaskButton.textContent =
                        "➕ Feladat hozzáadása";

                }


                // =================================
                // ÚJ FELADAT
                // =================================

                else {

                    const newTask =
                        await createTask(
                            title,
                            description,
                            priority,
                            category
                        );


                    if (newTask) {

                        tasks.unshift(
                            normalizeTask(
                                newTask
                            )
                        );

                    }

                }


                // =================================
                // MEZŐK ÜRÍTÉSE
                // =================================

                taskTitle.value =
                    "";

                taskDescription.value =
                    "";

                taskPriority.value =
                    "normal";

                taskCategory.value =
                    "Egyéb";


                // =================================
                // PANEL BEZÁRÁSA
                // =================================

                if (
                    taskEditor
                ) {

                    taskEditor.classList.remove(
                        "open"
                    );

                }


                if (
                    toggleTaskEditor
                ) {

                    toggleTaskEditor.textContent =
                        "➕ Új feladat";

                }


                renderTasks();

            }

            catch (error) {

                console.error(
                    "FELADAT MENTÉSI HIBA:",
                    error
                );

                alert(
                    "A feladat mentése nem sikerült.\n\n" +
                    error.message
                );

            }

            finally {

                saveTaskButton.disabled =
                    false;

            }

        }
    );

}


// =========================================
// KÉSZ / NEM KÉSZ
// =========================================

async function toggleTaskComplete(id) {

    const task =
        tasks.find(
            function (item) {

                return Number(item.id) ===
                    Number(id);

            }
        );


    if (!task) {

        return;

    }


    const oldValue =
        task.completed;


    task.completed =
        !task.completed;


    renderTasks();


    try {

        const updatedTask =
            await updateTask(
                id,
                {

                    completed:
                        task.completed

                }
            );


        if (updatedTask) {

            tasks =
                tasks.map(
                    function (item) {

                        if (
                            Number(item.id) ===
                            Number(id)
                        ) {

                            return normalizeTask(
                                updatedTask
                            );

                        }

                        return item;

                    }
                );

        }


        renderTasks();

    }

    catch (error) {

        task.completed =
            oldValue;

        renderTasks();

        console.error(
            "FELADAT ÁLLAPOT MÓDOSÍTÁSI HIBA:",
            error
        );

        alert(
            "A feladat állapotát nem sikerült menteni."
        );

    }

}


// =========================================
// FONTOS / PIN
// =========================================

async function toggleTaskPin(id) {

    const task =
        tasks.find(
            function (item) {

                return Number(item.id) ===
                    Number(id);

            }
        );


    if (!task) {

        return;

    }


    const oldValue =
        task.pinned;


    task.pinned =
        !task.pinned;


    renderTasks();


    try {

        const updatedTask =
            await updateTask(
                id,
                {

                    pinned:
                        task.pinned

                }
            );


        if (updatedTask) {

            tasks =
                tasks.map(
                    function (item) {

                        if (
                            Number(item.id) ===
                            Number(id)
                        ) {

                            return normalizeTask(
                                updatedTask
                            );

                        }

                        return item;

                    }
                );

        }


        renderTasks();

    }

    catch (error) {

        task.pinned =
            oldValue;

        renderTasks();

        console.error(
            "FELADAT PIN MÓDOSÍTÁSI HIBA:",
            error
        );

        alert(
            "A fontos jelölést nem sikerült menteni."
        );

    }

}


// =========================================
// SZERKESZTÉS
// =========================================

function editTask(id) {

    const task =
        tasks.find(
            function (item) {

                return Number(item.id) ===
                    Number(id);

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
        task.id;


    saveTaskButton.textContent =
        "💾 Módosítás mentése";


    if (
        taskEditor
    ) {

        taskEditor.classList.add(
            "open"
        );

    }


    if (
        toggleTaskEditor
    ) {

        toggleTaskEditor.textContent =
            "➖ Új feladat";

    }


    window.scrollTo({

        top: 0,

        behavior: "smooth"

    });


    setTimeout(
        function () {

            taskTitle.focus();

        },
        250
    );

}


// =========================================
// TÖRLÉS
// =========================================

async function deleteTask(id) {

    const confirmed =
        confirm(
            "Biztosan törölni szeretnéd ezt a feladatot?"
        );


    if (!confirmed) {

        return;

    }


    try {

        const success =
            await removeTask(id);


        if (!success) {

            return;

        }


        tasks =
            tasks.filter(
                function (task) {

                    return Number(task.id) !==
                        Number(id);

                }
            );


        if (
            Number(editingTaskId) ===
            Number(id)
        ) {

            editingTaskId =
                null;

            saveTaskButton.textContent =
                "➕ Feladat hozzáadása";

        }


        renderTasks();

    }

    catch (error) {

        console.error(
            "FELADAT TÖRLÉSI HIBA:",
            error
        );

        alert(
            "A feladat törlése nem sikerült.\n\n" +
            error.message
        );

    }

}


// =========================================
// KERESÉS
// =========================================

if (
    taskSearch
) {

    taskSearch.addEventListener(
        "input",
        function () {

            renderTasks();

        }
    );

}


// =========================================
// STÁTUSZ SZŰRÉS
// =========================================

if (
    taskStatusFilter
) {

    taskStatusFilter.addEventListener(
        "change",
        function () {

            renderTasks();

        }
    );

}


// =========================================
// KATEGÓRIA SZŰRÉS
// =========================================

if (
    taskCategoryFilter
) {

    taskCategoryFilter.addEventListener(
        "change",
        function () {

            renderTasks();

        }
    );

}


// =========================================
// RENDEZÉS
// =========================================

if (
    taskSort
) {

    taskSort.addEventListener(
        "change",
        function () {

            renderTasks();

        }
    );

}


// =========================================
// ESC A KERESŐBEN
// =========================================

if (
    taskSearch
) {

    taskSearch.addEventListener(
        "keydown",
        function (event) {

            if (
                event.key === "Escape"
            ) {

                taskSearch.value =
                    "";

                renderTasks();

                taskSearch.blur();

            }

        }
    );

}


// =========================================
// ENTER = FELADAT MENTÉSE
// =========================================

if (
    taskTitle
) {

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

}


// =========================================
// ÚJ FELADAT PANEL
// =========================================

if (
    toggleTaskEditor &&
    taskEditor
) {

    toggleTaskEditor.addEventListener(
        "click",
        function () {

            const isOpen =
                taskEditor.classList.contains(
                    "open"
                );


            taskEditor.classList.toggle(
                "open"
            );


            if (
                isOpen
            ) {

                toggleTaskEditor.textContent =
                    "➕ Új feladat";

            }

            else {

                toggleTaskEditor.textContent =
                    "➖ Új feladat";

                if (taskTitle) {

                    taskTitle.focus();

                }

            }

        }
    );

}


// =========================================
// KERESÉS + SZŰRÉS PANEL
// =========================================

if (
    toggleTaskFilters &&
    taskFilters
) {

    toggleTaskFilters.addEventListener(
        "click",
        function () {

            const isOpen =
                taskFilters.classList.contains(
                    "open"
                );


            taskFilters.classList.toggle(
                "open"
            );


            if (
                isOpen
            ) {

                toggleTaskFilters.textContent =
                    "🔎 Keresés és szűrés";

            }

            else {

                toggleTaskFilters.textContent =
                    "➖ Keresés és szűrés";

                if (taskSearch) {

                    taskSearch.focus();

                }

            }

        }
    );

}


// =========================================
// HAMBURGER MENÜ KOMPATIBILITÁS
// =========================================
// A hamburger menü kezelése normál esetben
// a közös Project Hub script feladata.
//
// Ez a rész NEM írja felül a meglévő
// hamburger működést.
//
// A korábbi rendszerben az állapot:
//     .open
// és NEM:
//     .active
//
// Ha ezen az oldalon nincs hamburger,
// a Tasks modul ettől még működik.
// =========================================

function initializeTasksHamburgerCompatibility() {

    const hamburger =
        document.querySelector(
            ".hamburger, " +
            ".hamburger-button, " +
            ".menu-toggle, " +
            "[data-menu-toggle]"
        );


    const menu =
        document.querySelector(
            ".mobile-menu, " +
            ".hamburger-menu, " +
            ".side-menu, " +
            "[data-mobile-menu]"
        );


    // Ha ezen az oldalon nincs ilyen elem,
    // egyszerűen nem csinálunk semmit.
    //
    // Így a Tasks modul nem dob hibát
    // hiányzó hamburger elem miatt.

    if (
        !hamburger ||
        !menu
    ) {

        return;

    }


    // Ha már van másik hamburger-kezelő,
    // nem kötünk rá még egyet.
    if (
        hamburger.dataset.tasksHamburgerInitialized ===
        "true"
    ) {

        return;

    }


    hamburger.dataset.tasksHamburgerInitialized =
        "true";


    hamburger.addEventListener(
        "click",
        function (event) {

            event.preventDefault();

            event.stopPropagation();

            menu.classList.toggle(
                "open"
            );

        }
    );

}


// =========================================
// INDULÁS
// =========================================

initializeTasksHamburgerCompatibility();

loadTasks();
