// =========================================
// PROJECT HUB
// GAMES.JS
// STEAM JÁTÉKOK
// =========================================


document.addEventListener("DOMContentLoaded", function () {

    // =========================================
    // BEÁLLÍTÁSOK
    // =========================================

    const BACKEND_URL =
        "https://project-hub-backend-1.onrender.com";


    // =========================================
    // HTML ELEMEK
    // =========================================

    const gamesList =
        document.getElementById("gamesList");


    // =========================================
    // HA NINCS JÁTÉKLISTA
    // =========================================

    if (!gamesList) {

        console.error(
            "A gamesList elem nem található a games.html-ben."
        );

        return;

    }


    // =========================================
    // BETÖLTÉS
    // =========================================

    loadSteamGames();


    // =========================================
    // STEAM JÁTÉKOK LEKÉRÉSE
    // =========================================

    async function loadSteamGames() {

        gamesList.innerHTML = `
            <div class="games-loading">
                Steam játékok betöltése...
            </div>
        `;


        try {

            const response =
                await fetch(
                    BACKEND_URL +
                    "/api/steam/games"
                );


            if (!response.ok) {

                throw new Error(
                    "Backend hiba: " +
                    response.status
                );

            }


            const result =
                await response.json();


            if (
                !result.success ||
                !result.data ||
                !result.data.games
            ) {

                throw new Error(
                    "Nem érkeztek játékadatok."
                );

            }


            const games =
                result.data.games;


            // =========================================
            // JÁTÉKOK RENDEZÉSE JÁTÉKIDŐ SZERINT
            // =========================================

            games.sort(function (a, b) {

                return (
                    (b.playtime_forever || 0) -
                    (a.playtime_forever || 0)
                );

            });


            // =========================================
            // JÁTÉKOK MEGJELENÍTÉSE
            // =========================================

            renderGames(games);


        }

        catch (error) {

            console.error(
                "Steam betöltési hiba:",
                error
            );


            gamesList.innerHTML = `
                <div class="games-error">
                    Nem sikerült betölteni a Steam játékokat.
                </div>
            `;

        }

    }


    // =========================================
    // JÁTÉKOK KIRAJZOLÁSA
    // =========================================

    function renderGames(games) {

        if (games.length === 0) {

            gamesList.innerHTML = `
                <div class="games-empty">
                    Nem található Steam játék.
                </div>
            `;

            return;

        }


        gamesList.innerHTML = "";


        games.forEach(function (game) {

            const gameElement =
                document.createElement("div");


            gameElement.className =
                "steam-game";


            const playtime =
                formatPlaytime(
                    game.playtime_forever || 0
                );


            gameElement.innerHTML = `

                <div class="steam-game-info">

                    <div class="steam-game-name">
                        ${escapeHtml(game.name)}
                    </div>

                    <div class="steam-game-playtime">
                        ⏱️ ${playtime}
                    </div>

                </div>

            `;


            gamesList.appendChild(
                gameElement
            );

        });

    }


    // =========================================
    // JÁTÉKIDŐ FORMÁZÁSA
    // =========================================

    function formatPlaytime(minutes) {

        const hours =
            Math.floor(minutes / 60);


        const remainingMinutes =
            minutes % 60;


        if (hours === 0) {

            return (
                remainingMinutes +
                " perc"
            );

        }


        if (remainingMinutes === 0) {

            return (
                hours +
                " óra"
            );

        }


        return (
            hours +
            " óra " +
            remainingMinutes +
            " perc"
        );

    }


    // =========================================
    // BIZTONSÁGOS HTML
    // =========================================

    function escapeHtml(text) {

        const div =
            document.createElement("div");


        div.textContent =
            text;


        return div.innerHTML;

    }

});
