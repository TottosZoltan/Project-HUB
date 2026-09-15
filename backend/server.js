// =========================================
// PROJECT HUB
// BACKEND
// =========================================


const express = require("express");

const cors = require("cors");


// =========================================
// EXPRESS
// =========================================

const app =
    express();


// =========================================
// MIDDLEWARE
// =========================================

app.use(
    cors()
);

app.use(
    express.json()
);


// =========================================
// PORT
// =========================================

const PORT =
    process.env.PORT || 3000;


// =========================================
// STEAM ADATOK
// =========================================

const STEAM_API_KEY =
    process.env.STEAM_API_KEY;

const STEAM_ID =
    process.env.STEAM_ID;


// =========================================
// ALAP TESZT
// =========================================

app.get(
    "/",
    function (req, res) {

        res.json({

            success: true,

            message:
                "Project Hub backend működik!"

        });

    }
);


// =========================================
// STEAM JÁTÉKOK
// =========================================

app.get(
    "/api/steam/games",
    async function (req, res) {

        try {

            if (
                !STEAM_API_KEY ||
                !STEAM_ID
            ) {

                return res.status(500).json({

                    success: false,

                    message:
                        "A Steam API beállítások hiányoznak."

                });

            }


            const url =
                "https://api.steampowered.com/" +
                "IPlayerService/GetOwnedGames/v0001/" +
                "?key=" +
                encodeURIComponent(
                    STEAM_API_KEY
                ) +
                "&steamid=" +
                encodeURIComponent(
                    STEAM_ID
                ) +
                "&include_appinfo=1" +
                "&include_played_free_games=1" +
                "&format=json";


            const response =
                await fetch(url);


            if (
                !response.ok
            ) {

                throw new Error(
                    "Steam API hiba: " +
                    response.status
                );

            }


            const data =
                await response.json();


            res.json({

                success: true,

                data: data.response || {}

            });

        }

        catch (error) {

            console.error(
                "Steam API hiba:",
                error
            );


            res.status(500).json({

                success: false,

                message:
                    "Nem sikerült lekérni a Steam adatokat."

            });

        }

    }
);


// =========================================
// SZERVER INDÍTÁSA
// =========================================

app.listen(
    PORT,
    "0.0.0.0",
    function () {

        console.log(
            `Project Hub backend fut a ${PORT} porton.`
        );

    }
);
