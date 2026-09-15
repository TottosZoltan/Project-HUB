document.addEventListener("DOMContentLoaded", function () {

    const BACKEND_URL =
        "https://project-hub-backend-1.onrender.com";


    const registerForm =
        document.getElementById("registerForm");

    const registerButton =
        document.getElementById("registerButton");

    const registerMessage =
        document.getElementById("registerMessage");


    if (
        !registerForm ||
        !registerButton ||
        !registerMessage
    ) {
        console.error(
            "A regisztrációs oldal egyik eleme hiányzik."
        );

        return;
    }


    registerForm.addEventListener(
        "submit",
        async function (event) {

            event.preventDefault();


            const username =
                document.getElementById(
                    "username"
                ).value.trim();


            const email =
                document.getElementById(
                    "email"
                ).value.trim();


            const password =
                document.getElementById(
                    "password"
                ).value;


            const passwordConfirm =
                document.getElementById(
                    "passwordConfirm"
                ).value;


            clearMessage();


            if (password !== passwordConfirm) {

                showError(
                    "A két jelszó nem egyezik."
                );

                return;
            }


            if (password.length < 8) {

                showError(
                    "A jelszónak legalább 8 karakteresnek kell lennie."
                );

                return;
            }


            registerButton.disabled = true;

            registerButton.textContent =
                "Regisztráció...";


            try {

                const response =
                    await fetch(
                        BACKEND_URL +
                        "/api/auth/register",
                        {
                            method: "POST",

                            headers: {
                                "Content-Type":
                                    "application/json"
                            },

                            body: JSON.stringify({
                                username:
                                    username,

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
                        "A regisztráció sikertelen."
                    );
                }


                showSuccess(
                    "Sikeres regisztráció! A fiókod létrejött."
                );


                registerForm.reset();


            } catch (error) {

                console.error(
                    "Regisztrációs hiba:",
                    error
                );


                showError(
                    error.message ||
                    "Nem sikerült regisztrálni."
                );


            } finally {

                registerButton.disabled = false;

                registerButton.textContent =
                    "Regisztráció";

            }

        }
    );


    function showError(message) {

        registerMessage.textContent =
            message;

        registerMessage.className =
            "register-message error";
    }


    function showSuccess(message) {

        registerMessage.textContent =
            message;

        registerMessage.className =
            "register-message success";
    }


    function clearMessage() {

        registerMessage.textContent =
            "";

        registerMessage.className =
            "register-message";
    }

});
