// =========================================
// PROJECT HUB
// FŐ SCRIPT
// =========================================


// =========================================
// DOM BETÖLTÉS
// =========================================

document.addEventListener(
    "DOMContentLoaded",
    function () {

        // =========================================
        // MENÜ
        // =========================================

        const menuButton =
            document.getElementById("menuButton");

        const closeMenu =
            document.getElementById("closeMenu");

        const sideMenu =
            document.getElementById("sideMenu");

        const menuOverlay =
            document.getElementById("menuOverlay");


        if (
            !menuButton ||
            !closeMenu ||
            !sideMenu ||
            !menuOverlay
        ) {

            console.error(
                "A menü egyik eleme hiányzik az index.html-ből."
            );

            return;

        }


        // =========================================
        // MENÜ MEGNYITÁSA
        // =========================================

        menuButton.addEventListener(
            "click",
            function () {

                sideMenu.classList.add(
                    "open"
                );

                menuOverlay.classList.add(
                    "open"
                );

            }
        );


        // =========================================
        // MENÜ BEZÁRÁSA
        // =========================================

        closeMenu.addEventListener(
            "click",
            function () {

                sideMenu.classList.remove(
                    "open"
                );

                menuOverlay.classList.remove(
                    "open"
                );

            }
        );


        menuOverlay.addEventListener(
            "click",
            function () {

                sideMenu.classList.remove(
                    "open"
                );

                menuOverlay.classList.remove(
                    "open"
                );

            }
        );


        // =========================================
        // BACKEND
        // =========================================

        const BACKEND_URL =
            "https://project-hub-backend-1.onrender.com";


        // =========================================
        // AUTH MENÜ ELEMEK
        // =========================================

        const loginMenuItem =
            document.getElementById("loginMenuItem");

        const userMenuItem =
            document.getElementById("userMenuItem");

        const usernameDisplay =
            document.getElementById("usernameDisplay");

        const logoutButton =
            document.getElementById("logoutButton");


        if (
            !loginMenuItem ||
            !userMenuItem ||
            !usernameDisplay ||
            !logoutButton
        ) {

            console.error(
                "Az auth menü egyik eleme hiányzik."
            );

            return;

        }


        // =========================================
        // AUTH TOKEN LEKÉRÉSE
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


            if (!token) {

                return {};

            }


            return {

                Authorization:
                    "Bearer " +
                    token

            };

        }


        // =========================================
        // BEJELENTKEZETT FELHASZNÁLÓ ELLENŐRZÉSE
        // =========================================

        async function checkLogin() {

            try {

                const response =
                    await fetch(
                        BACKEND_URL +
                        "/api/auth/me",
                        {
                            method: "GET",

                            headers:
                                getAuthHeaders(),

                            credentials:
                                "include"
                        }
                    );


                const result =
                    await response.json();


                console.log(
                    "Bejelentkezés ellenőrzése:",
                    result
                );


                if (
                    response.ok &&
                    result.success &&
                    result.user
                ) {

                    // =========================================
                    // BEJELENTKEZVE
                    // =========================================

                    loginMenuItem.style.display =
                        "none";

                    userMenuItem.style.display =
                        "flex";

                    logoutButton.style.display =
                        "flex";

                    usernameDisplay.textContent =
                        result.user.username;


                    console.log(
                        "Bejelentkezett felhasználó:",
                        result.user
                    );

                }

                else {

                    // =========================================
                    // ÉRVÉNYTELEN TOKEN
                    // =========================================

                    if (
                        response.status === 401
                    ) {

                        localStorage.removeItem(
                            "projectHubAuthToken"
                        );

                    }


                    // =========================================
                    // KIJELENTKEZVE
                    // =========================================

                    loginMenuItem.style.display =
                        "flex";

                    userMenuItem.style.display =
                        "none";

                    logoutButton.style.display =
                        "none";

                    usernameDisplay.textContent =
                        "";

                }

            }

            catch (error) {

                console.error(
                    "Session ellenőrzési hiba:",
                    error
                );


                // =========================================
                // HIBA ESETÉN
                // =========================================

                loginMenuItem.style.display =
                    "flex";

                userMenuItem.style.display =
                    "none";

                logoutButton.style.display =
                    "none";

                usernameDisplay.textContent =
                    "";

            }

        }


        // =========================================
        // KIJELENTKEZÉS
        // =========================================

        logoutButton.addEventListener(
            "click",
            async function (event) {

                event.preventDefault();


                try {

                    const response =
                        await fetch(
                            BACKEND_URL +
                            "/api/auth/logout",
                            {
                                method: "POST",

                                headers:
                                    getAuthHeaders(),

                                credentials:
                                    "include"
                            }
                        );


                    const result =
                        await response.json();


                    console.log(
                        "Kijelentkezés:",
                        result
                    );


                }

                catch (error) {

                    console.error(
                        "Kijelentkezési hiba:",
                        error
                    );

                }


                // =========================================
                // TOKEN TÖRLÉSE
                // =========================================

                localStorage.removeItem(
                    "projectHubAuthToken"
                );


                // =========================================
                // OLDAL ÚJRATÖLTÉSE
                // =========================================

                window.location.reload();

            }
        );


        // =========================================
        // INDÍTÁS
        // =========================================

        checkLogin();

    }
);
