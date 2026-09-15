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


                const email =
                    document
                        .getElementById("email")
                        .value
                        .trim();


                const password =
                    document
                        .getElementById("password")
                        .value;


                clearMessage();


                loginButton.disabled = true;

                loginButton.textContent =
                    "Bejelentkezés...";


                try {

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

                                credentials: "include",
                                
                                body:
                                    JSON.stringify({

                                        email:
                                            email,

                                        password:
                                            password

                                    })

                            }
                        );


                    const result =
                        await response.json();


                    if (!response.ok) {

                        throw new Error(
                            result.message ||
                            "A bejelentkezés sikertelen."
                        );

                    }


                    // =========================================
                    // SIKER
                    // =========================================

                    showSuccess(
                        "Sikeres bejelentkezés!"
                    );


                    console.log(
                        "Bejelentkezett felhasználó:",
                        result.user
                    );
const meResponse = await fetch(
    BACKEND_URL + "/api/auth/me",
    {
        method: "GET",
        credentials: "include"
    }
);

const meResult = await meResponse.json();

console.log(
    "Session ellenőrzés:",
    meResult
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


    }
);
