// =========================================
// PROJECT HUB
// BACKEND
// =========================================


const express = require("express");

const cors = require("cors");

const { Pool } = require("pg");

const bcrypt = require("bcrypt");

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
// POSTGRESQL
// =========================================

const pool =
    new Pool({

        connectionString:
            process.env.DATABASE_URL,

        ssl: {
            rejectUnauthorized: false
        }

    });


// =========================================
// ADATBÁZIS TESZT
// =========================================

async function initializeDatabase() {

    try {

        await pool.query(`
            
            CREATE TABLE IF NOT EXISTS users (

                id SERIAL PRIMARY KEY,

                username VARCHAR(50) NOT NULL UNIQUE,

                email VARCHAR(255) NOT NULL UNIQUE,

                password_hash TEXT NOT NULL,

                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP

            );

        `);


        console.log(
            "PostgreSQL kapcsolat működik."
        );


        console.log(
            "A users tábla készen áll."
        );

    }

    catch (error) {

        console.error(
            "PostgreSQL hiba:",
            error
        );

    }

}


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
// REGISZTRÁCIÓ
// =========================================

app.post(
    "/api/auth/register",
    async function (req, res) {

        try {

            const {
                username,
                email,
                password
            } = req.body;


            // =========================================
            // ELLENŐRZÉS
            // =========================================

            if (
                !username ||
                !email ||
                !password
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Minden mező kitöltése kötelező."

                });

            }


            if (password.length < 8) {

                return res.status(400).json({

                    success: false,

                    message:
                        "A jelszónak legalább 8 karakteresnek kell lennie."

                });

            }


            // =========================================
            // FELHASZNÁLÓNÉV / EMAIL ELLENŐRZÉSE
            // =========================================

            const existingUser =
                await pool.query(

                    `
                    SELECT id
                    FROM users
                    WHERE username = $1
                       OR email = $2
                    LIMIT 1
                    `,

                    [
                        username.trim(),
                        email.trim().toLowerCase()
                    ]

                );


            if (
                existingUser.rows.length > 0
            ) {

                return res.status(409).json({

                    success: false,

                    message:
                        "Ez a felhasználónév vagy e-mail már használatban van."

                });

            }


            // =========================================
            // JELSZÓ HASH
            // =========================================

            const passwordHash =
                await bcrypt.hash(
                    password,
                    12
                );


            // =========================================
            // FELHASZNÁLÓ LÉTREHOZÁSA
            // =========================================

            const result =
                await pool.query(

                    `
                    INSERT INTO users
                    (
                        username,
                        email,
                        password_hash
                    )

                    VALUES
                    (
                        $1,
                        $2,
                        $3
                    )

                    RETURNING
                        id,
                        username,
                        email,
                        created_at
                    `,

                    [
                        username.trim(),
                        email.trim().toLowerCase(),
                        passwordHash
                    ]

                );


            // =========================================
            // SIKERES REGISZTRÁCIÓ
            // =========================================

            res.status(201).json({

                success: true,

                message:
                    "A regisztráció sikeres.",

                user:
                    result.rows[0]

            });

        }

        catch (error) {

            console.error(
                "Regisztrációs hiba:",
                error
            );


            res.status(500).json({

                success: false,

                message:
                    "Nem sikerült létrehozni a felhasználót."

            });

        }

    }
);

// =========================================
// ADATBÁZIS TESZT
// =========================================

app.get(
    "/api/database/test",
    async function (req, res) {

        try {

            const result =
                await pool.query(
                    "SELECT NOW() AS current_time"
                );


            res.json({

                success: true,

                message:
                    "PostgreSQL kapcsolat működik.",

                time:
                    result.rows[0].current_time

            });

        }

        catch (error) {

            console.error(
                "Adatbázis teszt hiba:",
                error
            );


            res.status(500).json({

                success: false,

                message:
                    "Nem sikerült kapcsolódni az adatbázishoz."

            });

        }

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

                data:
                    data.response || {}

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

async function startServer() {

    await initializeDatabase();


    app.listen(
        PORT,
        "0.0.0.0",
        function () {

            console.log(
                `Project Hub backend fut a ${PORT} porton.`
            );

        }
    );

}


startServer();
