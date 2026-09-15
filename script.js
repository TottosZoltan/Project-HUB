document.addEventListener("DOMContentLoaded", function () {

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


    menuButton.addEventListener(
        "click",
        function () {

            sideMenu.classList.add("open");
            menuOverlay.classList.add("open");

        }
    );


    closeMenu.addEventListener(
        "click",
        function () {

            sideMenu.classList.remove("open");
            menuOverlay.classList.remove("open");

        }
    );


    menuOverlay.addEventListener(
        "click",
        function () {

            sideMenu.classList.remove("open");
            menuOverlay.classList.remove("open");

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
    // SESSION ELLENŐRZÉS
    // =========================================

    async function checkLogin() {

        try {

            const response =
                await fetch(
                    BACKEND_URL +
                    "/api/auth/me",
                    {
                        method: "GET",
                        credentials: "include"
                    }
                );


            const result =
                await response.json();


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
                // KIJELENTKEZVE
                // =========================================

                loginMenuItem.style.display =
                    "flex";

                userMenuItem.style.display =
                    "none";

                logoutButton.style.display =
                    "none";

            }

        }

        catch (error) {

            console.error(
                "Session ellenőrzési hiba:",
                error
            );

            loginMenuItem.style.display =
                "flex";

            userMenuItem.style.display =
                "none";

            logoutButton.style.display =
                "none";

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
                            credentials: "include"
                        }
                    );


                const result =
                    await response.json();


                if (
                    response.ok &&
                    result.success
                ) {

                    window.location.reload();

                }

                else {

                    console.error(
                        "Kijelentkezési hiba:",
                        result
                    );

                }

            }

            catch (error) {

                console.error(
                    "Kijelentkezési hiba:",
                    error
                );

            }

        }
    );


    // =========================================
    // INDÍTÁS
    // =========================================

    checkLogin();

});
