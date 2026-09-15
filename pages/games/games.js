// =========================================
// PROJECT HUB
// GAMES.JS
// USER-FÜGGŐ STEAM INTEGRÁCIÓ
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

    const steamAccountStatus =
        document.getElementById("steamAccountStatus");

    const steamNotConnected =
        document.getElementById("steamNotConnected");

    const steamConnected =
        document.getElementById("steamConnected");

    const connectSteamButton =
        document.getElementById("connectSteamButton");

    const disconnectSteamButton =
        document.getElementById("disconnectSteamButton");

    const steamAvatar =
        document.getElementById("steamAvatar");

    const steamPersonaName =
        document.getElementById("steamPersonaName");

    const steamId =
        document.getElementById("steamId");


    // =========================================
    // JÁTÉK RÉSZLETEK
    // =========================================

    const gameDetailsModal =
        document.getElementById("gameDetailsModal");

    const gameDetailsOverlay =
        document.querySelector(
            ".game-details-overlay"
        );

    const closeGameDetailsButton =
        document.getElementById(
            "closeGameDetailsButton"
        );

    const gameDetailsImage =
        document.getElementById(
            "gameDetailsImage"
        );

    const gameDetailsTitle =
        document.getElementById(
            "gameDetailsTitle"
        );

    const gameDetailsPlaytime =
        document.getElementById(
            "gameDetailsPlaytime"
        );

    const gameDetailsHours =
        document.getElementById(
            "gameDetailsHours"
        );

    const gameDetailsAchievementCount =
        document.getElementById(
            "gameDetailsAchievementCount"
        );

    const gameAchievements =
        document.getElementById(
            "gameAchievements"
        );


    // =========================================
    // TOKEN
    // =========================================

    function getToken() {

        return localStorage.getItem(
            "projectHubAuthToken"
        );

    }


    // =========================================
    // AUTH HEADER
    // =========================================

    function getAuthHeaders() {

        const token =
            getToken();


        return {

            "Authorization":
                "Bearer " + token,

            "Content-Type":
                "application/json"

        };

    }


    // =========================================
    // HIBA
    // =========================================

    function handleAuthError() {

        localStorage.removeItem(
            "projectHubAuthToken"
        );


        sessionStorage.setItem(
            "projectHubAuthMessage",
            "🔐 A munkameneted lejárt. Kérlek jelentkezz be újra."
        );


        window.location.href =
            "../auth/login.html";

    }


    // =========================================
    // INDÍTÁS
    // =========================================

    initializeSteamPage();


    // =========================================
    // STEAM OLDAL INDÍTÁSA
    // =========================================

    async function initializeSteamPage() {

        await loadSteamAccount();

    }


    // =========================================
    // STEAM FIÓK LEKÉRÉSE
    // =========================================

    async function loadSteamAccount() {

        try {

            const response =
                await fetch(
                    BACKEND_URL +
                    "/api/steam/account",
                    {
                        method: "GET",

                        headers:
                            getAuthHeaders(),

                        credentials:
                            "include"
                    }
                );


            if (
                response.status === 401
            ) {

                handleAuthError();

                return;

            }


            const result =
                await response.json();


            console.log(
                "STEAM FIÓK:",
                result
            );


            if (!response.ok) {

                throw new Error(
                    result.message ||
                    "A Steam-fiók lekérése sikertelen."
                );

            }


            // =================================
            // NINCS ÖSSZEKÖTVE
            // =================================

            if (
                !result.success ||
                !result.connected
            ) {

                showSteamNotConnected();

                return;

            }


            // =================================
            // ÖSSZEKÖTVE
            // =================================

            showSteamConnected(
                result.account
            );


            await loadSteamGames();


        }

        catch (error) {

            console.error(
                "Steam-fiók betöltési hiba:",
                error
            );


            if (steamAccountStatus) {

                steamAccountStatus.textContent =
                    "Nem sikerült ellenőrizni a Steam-fiókot.";

            }

        }

    }


    // =========================================
    // NINCS STEAM ÖSSZEKÖTVE
    // =========================================

    function showSteamNotConnected() {

        if (steamAccountStatus) {

            steamAccountStatus.textContent =
                "A Steam-fiókod nincs összekötve.";

        }


        if (steamNotConnected) {

            steamNotConnected.style.display =
                "flex";

        }


        if (steamConnected) {

            steamConnected.style.display =
                "none";

        }


        gamesList.innerHTML = `

            <div class="games-empty">

                🎮 A játékok megtekintéséhez
                először kösd össze a Steam-fiókodat.

            </div>

        `;

    }


    // =========================================
    // STEAM ÖSSZEKÖTVE
    // =========================================

    function showSteamConnected(account) {

        if (steamAccountStatus) {

            steamAccountStatus.textContent =
                "Steam-fiók sikeresen összekötve.";

        }


        if (steamNotConnected) {

            steamNotConnected.style.display =
                "none";

        }


        if (steamConnected) {

            steamConnected.style.display =
                "flex";

        }


        if (steamPersonaName) {

            steamPersonaName.textContent =
                account.personaName ||
                "Steam felhasználó";

        }


        if (steamId) {

            steamId.textContent =
                "SteamID: " +
                (
                    account.steamId ||
                    "ismeretlen"
                );

        }


        if (
            steamAvatar &&
            account.avatarUrl
        ) {

            steamAvatar.src =
                account.avatarUrl;

            steamAvatar.style.display =
                "block";

        }

    }


    // =========================================
    // STEAM ÖSSZEKÖTÉSE
    // =========================================

    if (connectSteamButton) {

        connectSteamButton.addEventListener(
            "click",
            async function () {

                try {

                    connectSteamButton.disabled =
                        true;


                    connectSteamButton.textContent =
                        "Steam kapcsolat előkészítése...";


                    const response =
                        await fetch(
                            BACKEND_URL +
                            "/api/steam/link",
                            {
                                method: "GET",

                                headers:
                                    getAuthHeaders(),

                                credentials:
                                    "include"
                            }
                        );


                    if (
                        response.status === 401
                    ) {

                        handleAuthError();

                        return;

                    }


                    const result =
                        await response.json();


                    console.log(
                        "STEAM LINK:",
                        result
                    );


                    if (
                        !response.ok ||
                        !result.success ||
                        !result.url
                    ) {

                        throw new Error(
                            result.message ||
                            "Nem sikerült elindítani a Steam összekötést."
                        );

                    }


                    /*
                     * A backend elkészíti a biztonságos
                     * Steam OpenID URL-t.
                     *
                     * Ezután a böngészőt átirányítjuk
                     * a Steam oldalára.
                     */

                    window.location.href =
                        result.url;

                }

                catch (error) {

                    console.error(
                        "Steam összekötési hiba:",
                        error
                    );


                    connectSteamButton.disabled =
                        false;


                    connectSteamButton.textContent =
                        "🎮 Steam összekötése";


                    alert(
                        error.message ||
                        "Nem sikerült összekötni a Steam-fiókot."
                    );

                }

            }
        );

    }


    // =========================================
    // STEAM LEVÁLASZTÁSA
    // =========================================

    if (disconnectSteamButton) {

        disconnectSteamButton.addEventListener(
            "click",
            async function () {

                const confirmed =
                    confirm(
                        "Biztosan leválasztod a Steam-fiókodat a Project Hub-ról?"
                    );


                if (!confirmed) {

                    return;

                }


                try {

                    disconnectSteamButton.disabled =
                        true;


                    disconnectSteamButton.textContent =
                        "Leválasztás...";


                    const response =
                        await fetch(
                            BACKEND_URL +
                            "/api/steam/account",
                            {
                                method: "DELETE",

                                headers:
                                    getAuthHeaders(),

                                credentials:
                                    "include"
                            }
                        );


                    if (
                        response.status === 401
                    ) {

                        handleAuthError();

                        return;

                    }


                    const result =
                        await response.json();


                    if (!response.ok) {

                        throw new Error(
                            result.message ||
                            "Nem sikerült leválasztani a Steam-fiókot."
                        );

                    }


                    showSteamNotConnected();

                }

                catch (error) {

                    console.error(
                        "Steam leválasztási hiba:",
                        error
                    );


                    alert(
                        error.message ||
                        "Nem sikerült leválasztani a Steam-fiókot."
                    );


                    disconnectSteamButton.disabled =
                        false;


                    disconnectSteamButton.textContent =
                        "Steam leválasztása";

                }

            }
        );

    }


    // =========================================
    // STEAM JÁTÉKOK LEKÉRÉSE
    // =========================================

    async function loadSteamGames() {

        gamesList.innerHTML = `

            <div class="games-loading">

                🎮 Steam játékok betöltése...

            </div>

        `;


        try {

            const response =
                await fetch(
                    BACKEND_URL +
                    "/api/steam/games",
                    {
                        method: "GET",

                        headers:
                            getAuthHeaders(),

                        credentials:
                            "include"
                    }
                );


            if (
                response.status === 401
            ) {

                handleAuthError();

                return;

            }


            const result =
                await response.json();


            console.log(
                "STEAM JÁTÉKOK:",
                result
            );


            if (!response.ok) {

                throw new Error(
                    result.message ||
                    "Nem sikerült betölteni a Steam játékokat."
                );

            }


            if (
                !result.success ||
                !Array.isArray(result.games)
            ) {

                throw new Error(
                    "Nem érkezett megfelelő játéklista."
                );

            }


            const games =
                result.games;


            // =================================
            // JÁTÉKOK RENDEZÉSE
            // =================================

            games.sort(
                function (a, b) {

                    return (
                        (b.playtime_forever || 0) -
                        (a.playtime_forever || 0)
                    );

                }
            );


            // =================================
            // KIRAJZOLÁS
            // =================================

            renderGames(games);

        }

        catch (error) {

            console.error(
                "Steam játékok betöltési hiba:",
                error
            );


            gamesList.innerHTML = `

                <div class="games-error">

                    ❌
                    ${escapeHtml(
                        error.message ||
                        "Nem sikerült betölteni a Steam játékokat."
                    )}

                </div>

            `;

        }

    }


    // =========================================
    // JÁTÉKOK KIRAJZOLÁSA
    // =========================================

    function renderGames(games) {

        if (!games.length) {

            gamesList.innerHTML = `

                <div class="games-empty">

                    🎮 Nem található Steam játék.

                </div>

            `;

            return;

        }


        gamesList.innerHTML = "";


        games.forEach(
            function (game) {

                const gameElement =
                    document.createElement("div");


                gameElement.className =
                    "steam-game";


                gameElement.dataset.appid =
                    game.appid;


                gameElement.style.cursor =
                    "pointer";


                const playtime =
                    formatPlaytime(
                        game.playtime_forever || 0
                    );


                const imageUrl =
                    getGameImage(game);


                gameElement.innerHTML = `

                    ${
                        imageUrl
                        ?
                        `
                        <img
                            class="steam-game-image"
                            src="${escapeHtml(imageUrl)}"
                            alt=""
                            loading="lazy"
                        >
                        `
                        :
                        ""
                    }

                    <div class="steam-game-info">

                        <div class="steam-game-name">

                            ${escapeHtml(
                                game.name ||
                                "Ismeretlen játék"
                            )}

                        </div>


                        <div class="steam-game-playtime">

                            ⏱️ ${escapeHtml(playtime)}

                        </div>

                    </div>

                `;


                // =================================
                // KATTINTÁS
                // =================================

                gameElement.addEventListener(
                    "click",
                    function () {

                        openGameDetails(
                            game
                        );

                    }
                );


                gamesList.appendChild(
                    gameElement
                );

            }
        );

    }


    // =========================================
    // JÁTÉK RÉSZLETEK MEGNYITÁSA
    // =========================================

    async function openGameDetails(game) {

        if (!gameDetailsModal) {

            return;

        }


        const appid =
            game.appid;


        if (!appid) {

            return;

        }


        // =================================
        // MODAL ALAPADATOK
        // =================================

        if (gameDetailsTitle) {

            gameDetailsTitle.textContent =
                game.name ||
                "Játék";

        }


        if (gameDetailsImage) {

            const imageUrl =
                getGameImage(game);


            if (imageUrl) {

                gameDetailsImage.src =
                    imageUrl;

                gameDetailsImage.style.display =
                    "block";

            }

            else {

                gameDetailsImage.style.display =
                    "none";

            }

        }


        if (gameDetailsPlaytime) {

            gameDetailsPlaytime.textContent =
                "⏱️ " +
                formatPlaytime(
                    game.playtime_forever || 0
                );

        }


        if (gameDetailsHours) {

            gameDetailsHours.textContent =
                formatHours(
                    game.playtime_forever || 0
                );

        }


        if (gameDetailsAchievementCount) {

            gameDetailsAchievementCount.textContent =
                "Betöltés...";

        }


        if (gameAchievements) {

            gameAchievements.innerHTML = `

                <div class="games-loading">

                    🏆 Achievementek betöltése...

                </div>

            `;

        }


        // =================================
        // MODAL MEGNYITÁSA
        // =================================

        gameDetailsModal.style.display =
            "flex";


        document.body.style.overflow =
            "hidden";


        try {

            const response =
                await fetch(
                    BACKEND_URL +
                    "/api/steam/games/" +
                    encodeURIComponent(appid),
                    {
                        method: "GET",

                        headers:
                            getAuthHeaders(),

                        credentials:
                            "include"
                    }
                );


            if (
                response.status === 401
            ) {

                closeGameDetails();

                handleAuthError();

                return;

            }


            const result =
                await response.json();


            console.log(
                "JÁTÉK RÉSZLETEK:",
                result
            );


            if (!response.ok) {

                throw new Error(
                    result.message ||
                    "Nem sikerült betölteni a játék adatait."
                );

            }


            const details =
                result.game ||
                game;


            // =================================
            // JÁTÉKIDŐ
            // =================================

            if (gameDetailsHours) {

                gameDetailsHours.textContent =
                    formatHours(
                        details.playtime_forever || 0
                    );

            }


            if (gameDetailsPlaytime) {

                gameDetailsPlaytime.textContent =
                    "⏱️ " +
                    formatPlaytime(
                        details.playtime_forever || 0
                    );

            }


            // =================================
            // ACHIEVEMENTEK
            // =================================

            const achievements =
                Array.isArray(
                    result.achievements
                )
                    ?
                    result.achievements
                    :
                    [];


            renderAchievements(
                achievements
            );

        }

        catch (error) {

            console.error(
                "Játék részletek hiba:",
                error
            );


            if (gameAchievements) {

                gameAchievements.innerHTML = `

                    <div class="games-error">

                        ❌
                        ${escapeHtml(
                            error.message ||
                            "Nem sikerült betölteni az achievementeket."
                        )}

                    </div>

                `;

            }


            if (gameDetailsAchievementCount) {

                gameDetailsAchievementCount.textContent =
                    "Nem elérhető";

            }

        }

    }


    // =========================================
    // ACHIEVEMENTEK KIRAJZOLÁSA
    // =========================================

    function renderAchievements(achievements) {

        if (!gameAchievements) {

            return;

        }


        if (!achievements.length) {

            gameAchievements.innerHTML = `

                <div class="games-empty">

                    🏆 Ehhez a játékhoz nem érhető el
                    achievement adat.

                </div>

            `;


            if (gameDetailsAchievementCount) {

                gameDetailsAchievementCount.textContent =
                    "0 / 0";

            }


            return;

        }


        const unlocked =
            achievements.filter(
                function (achievement) {

                    return (
                        achievement.achieved === 1 ||
                        achievement.achieved === true
                    );

                }
            );


        if (gameDetailsAchievementCount) {

            gameDetailsAchievementCount.textContent =
                unlocked.length +
                " / " +
                achievements.length;

        }


        gameAchievements.innerHTML =
            "";


        achievements.forEach(
            function (achievement) {

                const achievementElement =
                    document.createElement("div");


                const isUnlocked =
                    achievement.achieved === 1 ||
                    achievement.achieved === true;


                achievementElement.className =
                    "game-achievement " +
                    (
                        isUnlocked
                        ?
                        "unlocked"
                        :
                        "locked"
                    );


                let icon =
                    achievement.icon ||
                    achievement.icongray ||
                    "";


                achievementElement.innerHTML = `

                    ${
                        icon
                        ?
                        `
                        <img
                            class="achievement-icon"
                            src="${escapeHtml(icon)}"
                            alt=""
                            loading="lazy"
                        >
                        `
                        :
                        `
                        <div class="achievement-icon-placeholder">
                            🏆
                        </div>
                        `
                    }


                    <div class="achievement-info">

                        <div class="achievement-name">

                            ${escapeHtml(
                                achievement.name ||
                                achievement.displayName ||
                                achievement.apiname ||
                                "Achievement"
                            )}

                        </div>


                        ${
                            achievement.description
                            ?
                            `
                            <div class="achievement-description">

                                ${escapeHtml(
                                    achievement.description
                                )}

                            </div>
                            `
                            :
                            ""
                        }


                        <div class="achievement-status">

                            ${
                                isUnlocked
                                ?
                                "🏆 Feloldva"
                                :
                                "🔒 Nincs feloldva"
                            }

                        </div>

                    </div>

                `;


                gameAchievements.appendChild(
                    achievementElement
                );

            }
        );

    }


    // =========================================
    // MODAL BEZÁRÁSA
    // =========================================

    function closeGameDetails() {

        if (!gameDetailsModal) {

            return;

        }


        gameDetailsModal.style.display =
            "none";


        document.body.style.overflow =
            "";

    }


    if (closeGameDetailsButton) {

        closeGameDetailsButton.addEventListener(
            "click",
            closeGameDetails
        );

    }


    if (gameDetailsOverlay) {

        gameDetailsOverlay.addEventListener(
            "click",
            closeGameDetails
        );

    }


    document.addEventListener(
        "keydown",
        function (event) {

            if (
                event.key === "Escape" &&
                gameDetailsModal &&
                gameDetailsModal.style.display !== "none"
            ) {

                closeGameDetails();

            }

        }
    );


    // =========================================
    // JÁTÉKIDŐ FORMÁZÁSA
    // =========================================

    function formatPlaytime(minutes) {

        minutes =
            Number(minutes) || 0;


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
    // ÓRA FORMÁZÁS
    // =========================================

    function formatHours(minutes) {

        minutes =
            Number(minutes) || 0;


        const hours =
            minutes / 60;


        if (hours === 0) {

            return "0 óra";

        }


        if (hours < 1) {

            return (
                Math.round(hours * 60) +
                " perc"
            );

        }


        return (
            hours.toFixed(1) +
            " óra"
        );

    }


    // =========================================
    // STEAM KÉP
    // =========================================

    function getGameImage(game) {

        if (
            game.header_image
        ) {

            return game.header_image;

        }


        if (
            game.img_logo_url
        ) {

            return (
                "https://cdn.cloudflare.steamstatic.com/steam/apps/" +
                game.appid +
                "/" +
                game.img_logo_url
            );

        }


        if (
            game.img_icon_url
        ) {

            return (
                "https://media.steampowered.com/steamcommunity/public/images/apps/" +
                game.appid +
                "/" +
                game.img_icon_url +
                ".jpg"
            );

        }


        if (game.appid) {

            return (
                "https://cdn.cloudflare.steamstatic.com/steam/apps/" +
                game.appid +
                "/header.jpg"
            );

        }


        return "";

    }


    // =========================================
    // BIZTONSÁGOS HTML
    // =========================================

    function escapeHtml(text) {

        const div =
            document.createElement("div");


        div.textContent =
            text == null
                ?
                ""
                :
                String(text);


        return div.innerHTML;

    }

});
