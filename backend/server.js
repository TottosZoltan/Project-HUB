<!DOCTYPE html>
<html lang="hu">

<head>

    <meta charset="UTF-8">

    <meta
        name="viewport"
        content="width=device-width, initial-scale=1.0"
    >

    <title>Bejelentkezés - Project Hub</title>

    <link
        rel="stylesheet"
        href="../../style.css"
    >

    <link
        rel="stylesheet"
        href="../pages.css"
    >

    <link
        rel="stylesheet"
        href="login.css"
    >

</head>

<body>

    <header class="header">

        <div>

            <h1>BEJELENTKEZÉS</h1>

            <p>
                Project Hub
            </p>

        </div>

        <a
            href="../../index.html"
            class="back-button"
        >
            <span class="back-arrow"></span>
        </a>

    </header>


    <main class="page-content login-page">

        <section class="page-intro">

            <p class="small-title">
                PROJECT HUB
            </p>

            <h2>
                🔐 Üdv újra!
            </h2>

            <p>
                Jelentkezz be a Project Hub fiókodba.
            </p>

        </section>


        <section class="page-section login-section">

            <form id="loginForm">

                <div class="form-group">

                    <label for="login">
                        E-mail vagy felhasználónév
                    </label>

                    <input
                        type="text"
                        id="login"
                        name="login"
                        placeholder="E-mail vagy felhasználónév"
                        autocomplete="username"
                        required
                    >

                </div>


                <div class="form-group">

                    <label for="password">
                        Jelszó
                    </label>

                    <input
                        type="password"
                        id="password"
                        name="password"
                        placeholder="Jelszó"
                        autocomplete="current-password"
                        required
                    >

                </div>


                <div
                    id="loginMessage"
                    class="login-message"
                ></div>


                <button
                    type="submit"
                    id="loginButton"
                    class="login-button"
                >
                    Bejelentkezés
                </button>

            </form>

        </section>


        <section class="login-register">

            <p>
                Még nincs fiókod?
            </p>

            <a href="register.html">
                Regisztráció
            </a>

        </section>

    </main>


    <script>

        document.addEventListener(
            "DOMContentLoaded",
            function () {

                const BACKEND_URL =
                    "https://project-hub-backend-1.onrender.com";


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


                if (
                    !loginForm ||
                    !loginButton ||
                    !loginMessage ||
                    !loginInput ||
                    !passwordInput
                ) {

                    console.error(
                        "A bejelentkezési oldal egyik eleme hiányzik."
                    );

                    return;
                }


                function showError(message) {

                    loginMessage.textContent =
                        message;

                    loginMessage.className =
                        "login-message error";
                }


                function showSuccess(message) {

                    loginMessage.textContent =
                        message;

                    loginMessage.className =
                        "login-message success";
                }


                function clearMessage() {

                    loginMessage.textContent =
                        "";

                    loginMessage.className =
                        "login-message";
                }


                loginForm.addEventListener(
                    "submit",
                    async function (event) {

                        event.preventDefault();


                        const login =
                            loginInput.value.trim();

                        const password =
                            passwordInput.value;


                        if (!login || !password) {

                            showError(
                                "Az e-mail/felhasználónév és a jelszó kötelező."
                            );

                            return;
                        }


                        clearMessage();


                        loginButton.disabled =
                            true;

                        loginButton.textContent =
                            "Bejelentkezés...";


                        try {

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


                            const result =
                                await response.json();


                            console.log(
                                "LOGIN VÁLASZ:",
                                result
                            );


                            if (!response.ok) {

                                throw new Error(
                                    result.message ||
                                    "A bejelentkezés sikertelen."
                                );
                            }


                            if (!result.token) {

                                throw new Error(
                                    "A bejelentkezés sikerült, de az auth token hiányzik."
                                );
                            }


                            localStorage.setItem(
                                "projectHubAuthToken",
                                result.token
                            );


                            showSuccess(
                                "✅ Sikeres bejelentkezés!"
                            );


                            console.log(
                                "Bejelentkezett felhasználó:",
                                result.user
                            );


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

    </script>

</body>

</html>
