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

        const loginForm =
            document.getElementById(
                "loginForm"
            );

        const loginButton =
            document.getElementById(
                "loginButton"
            );

        const loginMessage =
            document.getElementById(
                "loginMessage"
            );

        const loginInput =
            document.getElementById(
                "login"
            );

        const passwordInput =
            document.getElementById(
                "password"
            );


        // =========================================
        // ELLENŐRZÉS
        // =========================================

        if (
            !loginForm ||
            !loginButton ||
            !loginMessage ||
            !loginInput ||
            !passwordInput
        ) {

            console.error(
                "HIBA: A bejelentkezési oldal egyik eleme hiányzik."
            );

            return;
        }


        console.log(
            "PROJECT HUB LOGIN BETÖLTŐDÖTT"
        );


        // =========================================
        // HIBA ÜZENET
        // =========================================

        function showError(message) {

            loginMessage.textContent =
                message;

            loginMessage.className =
                "login-message error";

        }


        // =========================================
        // SIKER ÜZENET
        // =========================================

        function showSuccess(message) {

            loginMessage.textContent =
                message;

            loginMessage.className =
                "login-message success";

        }


        // =========================================
        // ÜZENET TÖRLÉSE
        // =========================================

        function clearMessage() {

            loginMessage.textContent =
                "";

            loginMessage.className =
                "login-message";

        }


        // =========================================
        // LOGIN
        // =========================================

        loginForm.addEventListener(
            "submit",
            async function (event) {

                event.preventDefault();


                // =========================================
                // ADATOK
                // =========================================

                const login =
                    loginInput.value.trim();

                const password =
                    passwordInput.value;


                console.log(
                    "Bejelentkezés indítása..."
                );


                // =========================================
                // ÜRES MEZŐK
                // =========================================

                if (
                    !login ||
                    !password
                ) {

                    showError(
                        "Az e-mail/felhasználónév és a jelszó kötelező."
                    );

                    return;
                }


                clearMessage();


                // =========================================
                // GOMB
                // =========================================

                loginButton.disabled =
                    true;

                loginButton.textContent =
                    "Bejelentkezés...";


                try {

                    // =========================================
                    // LOGIN KÉRÉS
                    // =========================================

                    const response =
                        await fetch(
                            BACKEND_URL +
                            "/api/auth/login",
                            {
                                method:
                                    "POST",

                                headers: {
                                    "Content-Type":
                                        "application/json"
                                },

                                credentials:
                                    "include",

                                body:
                                    JSON.stringify({

                                        login:
                                            login,

                                        password:
                                            password

                                    })

                            }
                        );


                    // =========================================
                    // JSON VÁLASZ
                    // =========================================

                    let result;

                    try {

                        result =
                            await response.json();

                    }
                    catch (jsonError) {

                        console.error(
                            "A backend nem JSON választ küldött:",
                            jsonError
                        );

                        throw new Error(
                            "A szerver nem megfelelő választ küldött."
                        );

                    }


                    console.log(
                        "LOGIN VÁLASZ:",
                        result
                    );


                    // =========================================
                    // LOGIN HIBA
                    // =========================================

                    if (
                        !response.ok
                    ) {

                        throw new Error(
                            result.message ||
                            "A bejelentkezés sikertelen."
                        );

                    }


                    // =========================================
                    // SIKER ELLENŐRZÉS
                    // =========================================

                    if (
                        !result.success
                    ) {

                        throw new Error(
                            result.message ||
                            "A bejelentkezés sikertelen."
                        );

                    }


                    // =========================================
                    // TOKEN ELLENŐRZÉS
                    // =========================================

                    if (
                        !result.token
                    ) {

                        console.error(
                            "A backend nem küldött auth tokent.",
                            result
                        );

                        throw new Error(
                            "A bejelentkezés sikerült, de az auth token hiányzik."
                        );

                    }


                    // =========================================
                    // RÉGI TOKEN TÖRLÉSE
                    // =========================================

                    localStorage.removeItem(
                        "projectHubAuthToken"
                    );


                    // =========================================
                    // ÚJ TOKEN MENTÉSE
                    // =========================================

                    localStorage.setItem(
                        "projectHubAuthToken",
                        result.token
                    );


                    console.log(
                        "Auth token sikeresen elmentve."
                    );


                    // =========================================
                    // FELHASZNÁLÓ
                    // =========================================

                    if (
                        result.user
                    ) {

                        console.log(
                            "Bejelentkezett felhasználó:",
                            result.user
                        );

                    }


                    // =========================================
                    // SIKER
                    // =========================================

                    showSuccess(
                        "✅ Sikeres bejelentkezés!"
                    );


                    // =========================================
                    // FŐOLDAL
                    // =========================================

                    setTimeout(
                        function () {

                            window.location.href =
                                "../../index.html";

                        },
                        700
                    );

                }
                catch (error) {

                    console.error(
                        "Bejelentkezési hiba:",
                        error
                    );


                    showError(
                        error.message ||
                        "Nem sikerült bejelentkezni."
                    );

                }
                finally {

                    loginButton.disabled =
                        false;

                    loginButton.textContent =
                        "Bejelentkezés";

                }

            }
        );

    }
);
