// =========================================
// PROJECT HUB
// FŐ SCRIPT
// =========================================

document.addEventListener("DOMContentLoaded", function () {

    console.log("PROJECT HUB SCRIPT BETÖLTŐDÖTT");


    // =========================================
    // BACKEND
    // =========================================

    const BACKEND_URL =
        "https://project-hub-backend-1.onrender.com";


    // =========================================
    // MENÜ ELEMEK
    // =========================================

    const menuButton =
        document.getElementById("menuButton");

    const closeMenu =
        document.getElementById("closeMenu");

    const sideMenu =
        document.getElementById("sideMenu");

    const menuOverlay =
        document.getElementById("menuOverlay");


    // =========================================
    // MENÜ ELLENŐRZÉS
    // =========================================

    if (
        !menuButton ||
        !closeMenu ||
        !sideMenu ||
        !menuOverlay
    ) {

        console.error(
            "HIBA: A hamburger menü egyik eleme hiányzik!"
        );

    } else {

        console.log(
            "Hamburger menü elemei rendben."
        );


        // =========================================
        // MENÜ MEGNYITÁSA
        // =========================================

        menuButton.addEventListener(
            "click",
            function () {

                console.log(
                    "Hamburger menü megnyitása"
                );

                sideMenu.classList.add("open");

                menuOverlay.classList.add("open");

            }
        );


        // =========================================
        // MENÜ BEZÁRÁSA
        // =========================================

        function closeSideMenu() {

            sideMenu.classList.remove("open");

            menuOverlay.classList.remove("open");

        }


        // X gomb

        closeMenu.addEventListener(
            "click",
            closeSideMenu
        );


        // Háttér

        menuOverlay.addEventListener(
            "click",
            closeSideMenu
        );


        // ESC billentyű

        document.addEventListener(
            "keydown",
            function (event) {

                if (event.key === "Escape") {

                    closeSideMenu();

                }

            }
        );


        // =========================================
        // MENÜ LINK KATTINTÁS
        // =========================================

        const menuLinks =
            sideMenu.querySelectorAll("a");

        menuLinks.forEach(
            function (link) {

                link.addEventListener(
                    "click",
                    function () {

                        if (
                            link.id !== "logoutButton"
                        ) {

                            closeSideMenu();

                        }

                    }
                );

            }
        );

    }


    // =========================================
    // AUTH ELEMEK
    // =========================================

    const loginMenuItem =
        document.getElementById("loginMenuItem");

    const userMenuItem =
        document.getElementById("userMenuItem");

    const usernameDisplay =
        document.getElementById("usernameDisplay");

    const logoutButton =
        document.getElementById("logoutButton");


    // =========================================
    // TOKEN LEKÉRÉSE
    // =========================================

    function getAuthToken() {

        return localStorage.getItem(
            "projectHubAuthToken"
        );

    }


    // =========================================
    // AUTH HEADER
    // =========================================

    function getAuthHeaders() {

        const token =
            getAuthToken();

        if (!token) {

            return {};

        }

        return {

            "Authorization":
                "Bearer " + token

        };

    }


    // =========================================
    // KIJELENTKEZETT ÁLLAPOT
    // =========================================

    function showLoggedOut() {

        if (loginMenuItem) {

            loginMenuItem.style.display =
                "flex";

        }

        if (userMenuItem) {

            userMenuItem.style.display =
                "none";

        }

        if (logoutButton) {

            logoutButton.style.display =
                "none";

        }

        if (usernameDisplay) {

            usernameDisplay.textContent =
                "";

        }

    }


    // =========================================
    // BEJELENTKEZETT ÁLLAPOT
    // =========================================

    function showLoggedIn(username) {

        if (loginMenuItem) {

            loginMenuItem.style.display =
                "none";

        }

        if (userMenuItem) {

            userMenuItem.style.display =
                "flex";

        }

        if (logoutButton) {

            logoutButton.style.display =
                "flex";

        }

        if (usernameDisplay) {

            usernameDisplay.textContent =
                username;

        }

    }


    // =========================================
    // BEJELENTKEZÉS ELLENŐRZÉSE
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
                "AUTH ELLENŐRZÉS:",
                result
            );


            // =====================================
            // SIKERES BEJELENTKEZÉS
            // =====================================

            if (
                response.ok &&
                result.success &&
                result.user
            ) {

                showLoggedIn(
                    result.user.username
                );

                console.log(
                    "Bejelentkezett felhasználó:",
                    result.user.username
                );

                return;

            }


            // =====================================
            // ÉRVÉNYTELEN TOKEN
            // =====================================

            if (
                response.status === 401
            ) {

                localStorage.removeItem(
                    "projectHubAuthToken"
                );

            }


            showLoggedOut();


        } catch (error) {

            console.error(
                "AUTH ELLENŐRZÉSI HIBA:",
                error
            );

            showLoggedOut();

        }

    }


    // =========================================
    // KIJELENTKEZÉS
    // =========================================

    if (logoutButton) {

        logoutButton.addEventListener(
            "click",
            async function (event) {

                event.preventDefault();


                console.log(
                    "Kijelentkezés..."
                );


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
                        "Kijelentkezés válasz:",
                        result
                    );


                } catch (error) {

                    console.error(
                        "Kijelentkezési hiba:",
                        error
                    );

                }


                // =================================
                // TOKEN TÖRLÉSE
                // =================================

                localStorage.removeItem(
                    "projectHubAuthToken"
                );


                // =================================
                // UI FRISSÍTÉSE
                // =================================

                showLoggedOut();


                // =================================
                // MENÜ BEZÁRÁSA
                // =================================

                if (
                    sideMenu &&
                    menuOverlay
                ) {

                    sideMenu.classList.remove(
                        "open"
                    );

                    menuOverlay.classList.remove(
                        "open"
                    );

                }


                // =================================
                // OLDAL FRISSÍTÉSE
                // =================================

                window.location.reload();

            }
        );

    }


    // =========================================
    // INDÍTÁS
    // =========================================

    checkLogin();

});
