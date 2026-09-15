document.addEventListener("DOMContentLoaded", function () {

    // =========================================
    // BACKEND
    // =========================================

    const BACKEND_URL =
        "https://project-hub-backend-1.onrender.com";


    // =========================================
    // ELEMEK
    // =========================================

    const loginForm =
        document.getElementById("loginForm");

    const loginButton =
        document.getElementById("loginButton");

    const loginMessage =
        document.getElementById("loginMessage");


    if (
        !loginForm ||
        !loginButton ||
        !loginMessage
    ) {

        console.error(
            "A bejelentkezési oldal egyik eleme hiányzik."
        );

        return;
    }


    // =========================================
    // BEJELENTKEZÉS
    // =========================================

    loginForm.addEventListener(
        "submit",
        async function (event) {

            event.preventDefault();


            // =========================================
            // ADATOK
            // =========================================

            const usernameInput =
                document.getElementById("email");

            const passwordInput =
                document.getElementById("password");


            if (
                !usernameInput ||
                !passwordInput
            ) {

                showError(
                    "A bejelentkezési mezők nem találhatók."
                );

                return;
            }


            const username =
                usernameInput.value.trim();

            const password =
                passwordInput.value;


            // =========================================
            // ÜRES MEZŐ ELLENŐRZÉS
            // =========================================

            if (!username || !password) {

                showError(
                    "A felhasználónév és a jelszó kötelező."
                );

                return;
            }


            clearMessage();


            loginButton.disabled = true;

            loginButton.textContent =
                "Bejelentkezés...";


            try {

                // =========================================
                // LOGIN
                // =========================================

                const response =
                    await fetch(
                        BACKEND_URL +
                        "/api/auth/login",
                        {
                            method: "POST",

                            headers: {
                                "Content-Type":
                                    "application/json"
                            },

                            credentials:
                                "include",

                            body:
                                JSON.stringify({
                                    username: username,
                                    password: password
                                })
                        }
                    );


                const result =
                    await response.json();


                console.log(
                    "LOGIN VÁLASZ:",
                    result
                );


                // =========================================
                // HIBA
                // =========================================

                if (!response.ok) {

                    throw new Error(
                        result.message ||
                        "A bejelentkezés sikertelen."
                    );

                }


                // =========================================
                // AUTH TOKEN MENTÉSE
                // =========================================

                if (
                    result.token
                ) {

                    localStorage.setItem(
                        "projectHubAuthToken",
                        result.token
                    );

                    console.log(
                        "Auth token sikeresen elmentve."
                    );

                }


                // =========================================
                // SIKERES LOGIN
                // =========================================

                showSuccess(
                    "✅ Sikeres bejelentkezés!"
                );


                console.log(
                    "Bejelentkezett felhasználó:",
                    result.user
                );


                // =========================================
                // TOKEN LEKÉRÉSE
                // =========================================

                const authToken =
                    localStorage.getItem(
                        "projectHubAuthToken"
                    );


                const requestHeaders = {};


                if (
                    authToken
                ) {

                    requestHeaders.Authorization =
                        "Bearer " +
                        authToken;

                }


                // =========================================
                // MUNKAMENET ELLENŐRZÉSE
                // =========================================

                const meResponse =
                    await fetch(
                        BACKEND_URL +
                        "/api/auth/me",
                        {
                            method: "GET",

                            headers:
                                requestHeaders,

                            credentials:
                                "include"
                        }
                    );


                const meResult =
                    await meResponse.json();


                console.log(
                    "Session ellenőrzés:",
                    meResult
                );


                // =========================================
                // MUNKAMENET RENDBEN
                // =========================================

                if (
                    meResponse.ok &&
                    meResult.success &&
                    meResult.user
                ) {

                    showSuccess(
                        "✅ Sikeres bejelentkezés!"
                    );


                    setTimeout(
                        function () {

                            window.location.href =
                                "../../index.html";

                        },
                        800
                    );

                }

                else {

                    showError(
                        "A bejelentkezés sikerült, de a munkamenetet nem sikerült ellenőrizni."
                    );

                }

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


    // =========================================
    // HIBA
    // =========================================

    function showError(message) {

        loginMessage.textContent =
            message;

        loginMessage.className =
            "login-message error";

    }


    // =========================================
    // SIKER
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

});
