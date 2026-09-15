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
        // BACKEND
        // =========================================

        const BACKEND_URL =
            "https://project-hub-backend-1.onrender.com";


        // =========================================
        // ELEMEK
        // =========================================

        const sideMenu =
            document.getElementById("sideMenu");

        const menuOverlay =
            document.getElementById("menuOverlay");

        const menuButton =
            document.getElementById("menuButton");

        const closeMenu =
            document.getElementById("closeMenu");

        const loginMenuItem =
            document.getElementById("loginMenuItem");

        const userMenuItem =
            document.getElementById("userMenuItem");

        const usernameDisplay =
            document.getElementById("usernameDisplay");

        const logoutButton =
            document.getElementById("logoutButton");


        // =========================================
        // MENÜ MEGNYITÁSA
        // =========================================

        if (menuButton && sideMenu) {

            menuButton.addEventListener(
                "click",
                function () {

                    sideMenu.classList.add(
                        "active"
                    );

                    if (menuOverlay) {

                        menuOverlay.classList.add(
                            "active"
                        );

                    }

                }
            );

        }


        // =========================================
        // MENÜ BEZÁRÁSA
        // =========================================

        function closeSideMenu() {

            if (sideMenu) {

                sideMenu.classList.remove(
                    "active"
                );

            }


            if (menuOverlay) {

                menuOverlay.classList.remove(
                    "active"
                );

            }

        }


        if (closeMenu) {

            closeMenu.addEventListener(
                "click",
                closeSideMenu
            );

        }


        if (menuOverlay) {

            menuOverlay.addEventListener(
                "click",
                closeSideMenu
            );

        }


        // =========================================
        // MENÜ LINK BEZÁRÁSA
        // =========================================

        const menuLinks =
            document.querySelectorAll(
                ".menu-links a"
            );


        menuLinks.forEach(
            function (link) {

                link.addEventListener(
                    "click",
                    function () {

                        if (
                            link.id !==
                            "logoutButton"
                        ) {

                            closeSideMenu();

                        }

                    }
                );

            }
        );


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

        async function checkAuthentication() {

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

                    showLoggedInUser(
                        result.user
                    );

                    return;

                }


                // =========================================
                // ÉRVÉNYTELEN TOKEN TÖRLÉSE
                // =========================================

                if (
                    response.status === 401
                ) {

                    localStorage.removeItem(
                        "projectHubAuthToken"
                    );

                }


                showLoggedOutUser();

            }

            catch (error) {

                console.error(
                    "Bejelentkezés ellenőrzési hiba:",
                    error
                );


                // =========================================
                // HIBA ESETÉN NEM TÖRÖLJÜK
                // A TOKENT AUTOMATIKUSAN
                // =========================================

                showLoggedOutUser();

            }

        }


        // =========================================
        // BEJELENTKEZETT ÁLLAPOT
        // =========================================

        function showLoggedInUser(user) {

            if (loginMenuItem) {

                loginMenuItem.style.display =
                    "none";

            }


            if (userMenuItem) {

                userMenuItem.style.display =
                    "block";

            }


            if (logoutButton) {

                logoutButton.style.display =
                    "block";

            }


            if (usernameDisplay) {

                usernameDisplay.textContent =
                    user.username;

            }

        }


        // =========================================
        // KIJELENTKEZETT ÁLLAPOT
        // =========================================

        function showLoggedOutUser() {

            if (loginMenuItem) {

                loginMenuItem.style.display =
                    "block";

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
        // KIJELENTKEZÉS
        // =========================================

        if (logoutButton) {

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
                    // FELHASZNÁLÓI ÁLLAPOT TÖRLÉSE
                    // =========================================

                    showLoggedOutUser();


                    // =========================================
                    // MENÜ BEZÁRÁSA
                    // =========================================

                    closeSideMenu();

                }
            );

        }


        // =========================================
        // AUTH ELLENŐRZÉS INDÍTÁSA
        // =========================================

        checkAuthentication();

    }
);
