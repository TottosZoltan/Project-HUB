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
    // LOGIN OLDAL
    // =========================================

    const LOGIN_PAGE =
        "pages/auth/login.html";


    // =========================================
    // APP VÉDELEM
    // =========================================
    //
    // Az index.html alapból rejtve van.
    // Csak sikeres auth ellenőrzés után
    // kapja meg az "authenticated" class-t.
    //

    function unlockApp() {

        document.body.classList.add(
            "authenticated"
        );

    }


    // =========================================
    // LOGINRA IRÁNYÍTÁS
    // =========================================

    function redirectToLogin(message) {

        console.log(
            "Nincs érvényes bejelentkezés."
        );

        // App lezárása
        document.body.classList.remove(
            "authenticated"
        );


        // Ha van üzenet, eltároljuk.
        // A login oldal később ki tudja írni.
        if (message) {

            sessionStorage.setItem(
                "projectHubAuthMessage",
                message
            );

        }


        // Token törlése
        localStorage.removeItem(
            "projectHubAuthToken"
        );


        // Átirányítás
        window.location.href =
            LOGIN_PAGE;

    }


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
    // TOAST ÉRTESÍTÉS
    // =========================================

    function showToast(message) {

        const oldToast =
            document.getElementById(
                "projectHubToast"
            );

        if (oldToast) {

            oldToast.remove();

        }


        const toast =
            document.createElement("div");

        toast.id =
            "projectHubToast";

        toast.textContent =
            message;


        toast.style.position =
            "fixed";

        toast.style.left =
            "50%";

        toast.style.bottom =
            "30px";

        toast.style.transform =
            "translateX(-50%) translateY(20px)";

        toast.style.background =
            "#151820";

        toast.style.color =
            "#ffffff";

        toast.style.border =
            "1px solid #292d38";

        toast.style.borderRadius =
            "12px";

        toast.style.padding =
            "13px 20px";

        toast.style.fontSize =
            "14px";

        toast.style.fontWeight =
            "600";

        toast.style.boxShadow =
            "0 10px 30px rgba(0,0,0,0.35)";

        toast.style.zIndex =
            "99999";

        toast.style.opacity =
            "0";

        toast.style.transition =
            "opacity 0.25s ease, transform 0.25s ease";

        toast.style.textAlign =
            "center";

        toast.style.pointerEvents =
            "none";


        document.body.appendChild(toast);


        requestAnimationFrame(
            function () {

                toast.style.opacity =
                    "1";

                toast.style.transform =
                    "translateX(-50%) translateY(0)";

            }
        );


        setTimeout(
            function () {

                toast.style.opacity =
                    "0";

                toast.style.transform =
                    "translateX(-50%) translateY(20px)";

            },
            750
        );

    }


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

        const token =
            getAuthToken();


        // =========================================
        // NINCS TOKEN
        // =========================================

        if (!token) {

            console.log(
                "Nincs auth token."
            );

            showLoggedOut();

            redirectToLogin(
                "🔐 A Project Hub használatához be kell jelentkezned."
            );

            return;

        }


        // =========================================
        // TOKEN ELLENŐRZÉSE
        // =========================================

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


            let result;

            try {

                result =
                    await response.json();

            } catch (jsonError) {

                console.error(
                    "A backend nem JSON választ küldött:",
                    jsonError
                );

                redirectToLogin(
                    "⚠️ A munkamenetet nem sikerült ellenőrizni. Kérlek jelentkezz be újra."
                );

                return;

            }


            console.log(
                "AUTH ELLENŐRZÉS:",
                result
            );


            // =========================================
            // SIKERES BEJELENTKEZÉS
            // =========================================

            if (
                response.ok &&
                result.success &&
                result.user
            ) {

                console.log(
                    "Bejelentkezett felhasználó:",
                    result.user.username
                );


                showLoggedIn(
                    result.user.username
                );


                // =====================================
                // APP FELoldása
                // =====================================

                unlockApp();


                return;

            }


            // =========================================
            // ÉRVÉNYTELEN TOKEN
            // =========================================

            if (
                response.status === 401
            ) {

                console.log(
                    "Az auth token érvénytelen vagy lejárt."
                );

                redirectToLogin(
                    "🔐 A munkameneted lejárt. Kérlek jelentkezz be újra."
                );

                return;

            }


            // =========================================
            // EGYÉB AUTH HIBA
            // =========================================

            redirectToLogin(
                "🔐 A Project Hub használatához be kell jelentkezned."
            );

        } catch (error) {

            console.error(
                "AUTH ELLENŐRZÉSI HIBA:",
                error
            );


            redirectToLogin(
                "⚠️ A munkamenetet nem sikerült ellenőrizni. Kérlek jelentkezz be újra."
            );

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


                // =====================================
                // TOKEN MENTÉSE A KIJELENTKEZÉS ELŐTT
                // =====================================

                const authHeaders =
                    getAuthHeaders();


                try {

                    const response =
                        await fetch(
                            BACKEND_URL +
                            "/api/auth/logout",
                            {
                                method: "POST",

                                headers:
                                    authHeaders,

                                credentials:
                                    "include"
                            }
                        );


                    let result;

                    try {

                        result =
                            await response.json();

                    } catch (jsonError) {

                        console.error(
                            "Logout válasz feldolgozási hiba:",
                            jsonError
                        );

                    }


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


                // =====================================
                // TOKEN TÖRLÉSE
                // =====================================

                localStorage.removeItem(
                    "projectHubAuthToken"
                );


                // =====================================
                // UI FRISSÍTÉSE
                // =====================================

                showLoggedOut();


                // =====================================
                // APP ZÁROLÁSA
                // =====================================

                document.body.classList.remove(
                    "authenticated"
                );


                // =====================================
                // MENÜ BEZÁRÁSA
                // =====================================

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


                // =====================================
                // KIJELENTKEZÉSI ÜZENET
                // =====================================

                sessionStorage.setItem(
                    "projectHubAuthMessage",
                    "✅ Sikeresen kijelentkeztél!"
                );


                // =====================================
                // LOGIN OLDAL
                // =====================================

                window.location.href =
                    LOGIN_PAGE;

            }
        );

    }


    // =========================================
    // INDÍTÁS
    // =========================================

    checkLogin();

});
