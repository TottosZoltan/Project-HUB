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
    // BEJELENTKEZÉS MENÜ
    // =========================================

    const loginMenuItem =
        document.getElementById("loginMenuItem");

    const userMenuItem =
        document.getElementById("userMenuItem");

    const usernameDisplay =
        document.getElementById("usernameDisplay");

    const logoutButton =
        document.getElementById("logoutButton");


    // Ha nincs auth menü, nincs további teendő
    if (
        !loginMenuItem ||
        !userMenuItem ||
        !usernameDisplay ||
        !logoutButton
    ) {

        return;

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
                    "block";

                usernameDisplay.textContent =
                    result.user.username;

            }

            else {

                // =========================================
                // KIJELENTKEZVE
                // =========================================

                loginMenuItem.style.display =
                    "block";

                userMenuItem.style.display =
                    "none";

            }

        }

        catch (error) {

            console.error(
                "Session ellenőrzési hiba:",
                error
            );

            loginMenuItem.style.display =
                "block";

            userMenuItem.style.display =
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


                if (response.ok && result.success) {

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
    // SESSION ELLENŐRZÉS INDÍTÁSA
    // =========================================

    checkLogin();

});
