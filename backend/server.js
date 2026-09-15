// =========================================
// PROJECT HUB
// BACKEND
// =========================================

const express = require("express");
const cors = require("cors");
const session = require("express-session");
const connectPgSimple = require("connect-pg-simple");
const { Pool } = require("pg");
const bcrypt = require("bcrypt");
const crypto = require("crypto");


// =========================================
// EXPRESS
// =========================================

const app = express();


// =========================================
// PORT
// =========================================

const PORT =
    process.env.PORT || 3000;


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
// PROXY
// =========================================

app.set(
    "trust proxy",
    1
);


// =========================================
// MIDDLEWARE
// =========================================

app.use(
    cors({

        origin:
            "https://tottoszoltan.github.io",

        credentials:
            true

    })
);


app.use(
    express.json()
);


// =========================================
// SESSION
// =========================================

const PgSession =
    connectPgSimple(
        session
    );


app.use(
    session({

        store:
            new PgSession({

                pool:
                    pool,

                tableName:
                    "sessions",

                createTableIfMissing:
                    true

            }),

        secret:
            process.env.SESSION_SECRET,

        resave:
            false,

        saveUninitialized:
            false,

        cookie: {

            httpOnly:
                true,

            secure:
                true,

            sameSite:
                "none",

            path:
                "/",

            maxAge:
                1000 *
                60 *
                60 *
                24 *
                30

        }

    })
);


// =========================================
// STEAM ADATOK
// =========================================

const STEAM_API_KEY =
    process.env.STEAM_API_KEY;

const STEAM_ID =
    process.env.STEAM_ID;


// =========================================
// AUTH TOKEN BEÁLLÍTÁSOK
// =========================================

const AUTH_TOKEN_LIFETIME_MS =
    1000 *
    60 *
    60 *
    24 *
    30;


// =========================================
// AUTH TOKEN SEGÉDFÜGGVÉNYEK
// =========================================

function generateAuthToken() {

    return crypto.randomBytes(32).toString("hex");

}


function hashAuthToken(token) {

    return crypto
        .createHash("sha256")
        .update(token)
        .digest("hex");

}


function getBearerToken(req) {

    const authorization =
        req.headers.authorization;


    if (
        !authorization ||
        typeof authorization !== "string"
    ) {

        return null;

    }


    if (
        !authorization.startsWith(
            "Bearer "
        )
    ) {

        return null;

    }


    const token =
        authorization
            .slice(7)
            .trim();


    if (!token) {

        return null;

    }


    return token;

}


// =========================================
// AUTH TOKEN LÉTREHOZÁSA
// =========================================

async function createAuthToken(userId) {

    const token =
        generateAuthToken();


    const tokenHash =
        hashAuthToken(token);


    const expiresAt =
        new Date(
            Date.now() +
            AUTH_TOKEN_LIFETIME_MS
        );


    await pool.query(

        `
        INSERT INTO auth_tokens
        (
            user_id,
            token_hash,
            expires_at
        )

        VALUES
        (
            $1,
            $2,
            $3
        )
        `,

        [
            userId,
            tokenHash,
            expiresAt
        ]

    );


    return token;

}


// =========================================
// AUTH TOKEN ELLENŐRZÉSE
// =========================================

async function getUserFromAuthToken(token) {

    if (!token) {

        return null;

    }


    const tokenHash =
        hashAuthToken(token);


    const result =
        await pool.query(

            `
            SELECT
                u.id,
                u.username,
                u.email,
                u.created_at,
                a.id AS auth_token_id

            FROM auth_tokens a

            INNER JOIN users u
                ON u.id = a.user_id

            WHERE a.token_hash = $1

              AND a.expires_at > CURRENT_TIMESTAMP

            LIMIT 1
            `,

            [
                tokenHash
            ]

        );


    if (
        result.rows.length === 0
    ) {

        return null;

    }


    return result.rows[0];

}


// =========================================
// BEJELENTKEZETT FELHASZNÁLÓ LEKÉRÉSE
// =========================================

async function getAuthenticatedUser(req) {

    // =========================================
    // TOKEN ALAPÚ BEJELENTKEZÉS
    // =========================================

    const bearerToken =
        getBearerToken(req);


    if (bearerToken) {

        const tokenUser =
            await getUserFromAuthToken(
                bearerToken
            );


        if (tokenUser) {

            return {

                user:
                    tokenUser,

                authTokenId:
                    tokenUser.auth_token_id,

                method:
                    "token"

            };

        }


        return null;

    }


    // =========================================
    // SESSION ALAPÚ BEJELENTKEZÉS
    // =========================================

    if (
        req.session &&
        req.session.userId
    ) {

        const result =
            await pool.query(

                `
                SELECT
                    id,
                    username,
                    email,
                    created_at
                FROM users
                WHERE id = $1
                LIMIT 1
                `,

                [
                    req.session.userId
                ]

            );


        if (
            result.rows.length === 0
        ) {

            return null;

        }


        return {

            user:
                result.rows[0],

            authTokenId:
                null,

            method:
                "session"

        };

    }


    return null;

}


// =========================================
// ADATBÁZIS
// =========================================

async function initializeDatabase() {

    try {

        await pool.query(`

            CREATE TABLE IF NOT EXISTS users (

                id SERIAL PRIMARY KEY,

                username VARCHAR(50)
                    NOT NULL UNIQUE,

                email VARCHAR(255)
                    NOT NULL UNIQUE,

                password_hash TEXT
                    NOT NULL,

                created_at TIMESTAMP
                    DEFAULT CURRENT_TIMESTAMP,

                updated_at TIMESTAMP
                    DEFAULT CURRENT_TIMESTAMP

            );

        `);


        // =========================================
        // AUTH TOKEN TÁBLA
        // =========================================

        await pool.query(`

            CREATE TABLE IF NOT EXISTS auth_tokens (

                id SERIAL PRIMARY KEY,

                user_id INTEGER
                    NOT NULL
                    REFERENCES users(id)
                    ON DELETE CASCADE,

                token_hash TEXT
                    NOT NULL UNIQUE,

                expires_at TIMESTAMP
                    NOT NULL,

                created_at TIMESTAMP
                    DEFAULT CURRENT_TIMESTAMP

            );

        `);


        // =========================================
        // LEJÁRT TOKENEK TÖRLÉSE
        // =========================================

        await pool.query(`

            DELETE FROM auth_tokens
            WHERE expires_at <= CURRENT_TIMESTAMP;

        `);


        console.log(
            "PostgreSQL kapcsolat működik."
        );


        console.log(
            "A users tábla készen áll."
        );


        console.log(
            "Az auth_tokens tábla készen áll."
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

            success:
                true,

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


            if (
                !username ||
                !email ||
                !password
            ) {

                return res.status(400).json({

                    success:
                        false,

                    message:
                        "Minden mező kitöltése kötelező."

                });

            }


            if (
                password.length < 8
            ) {

                return res.status(400).json({

                    success:
                        false,

                    message:
                        "A jelszónak legalább 8 karakteresnek kell lennie."

                });

            }


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

                        email
                            .trim()
                            .toLowerCase()

                    ]

                );


            if (
                existingUser.rows.length > 0
            ) {

                return res.status(409).json({

                    success:
                        false,

                    message:
                        "Ez a felhasználónév vagy e-mail már használatban van."

                });

            }


            const passwordHash =
                await bcrypt.hash(
                    password,
                    12
                );


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

                        email
                            .trim()
                            .toLowerCase(),

                        passwordHash

                    ]

                );


            res.status(201).json({

                success:
                    true,

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

                success:
                    false,

                message:
                    "Nem sikerült létrehozni a felhasználót."

            });

        }

    }
);


// =========================================
// BEJELENTKEZÉS
// =========================================

app.post(
    "/api/auth/login",
    async function (req, res) {

        try {

            const {
                email,
                password
            } = req.body;


            if (
                !email ||
                !password
            ) {

                return res.status(400).json({

                    success:
                        false,

                    message:
                        "Az e-mail és a jelszó megadása kötelező."

                });

            }


            const result =
                await pool.query(

                    `
                    SELECT
                        id,
                        username,
                        email,
                        password_hash
                    FROM users
                    WHERE email = $1
                    LIMIT 1
                    `,

                    [

                        email
                            .trim()
                            .toLowerCase()

                    ]

                );


            if (
                result.rows.length === 0
            ) {

                return res.status(401).json({

                    success:
                        false,

                    message:
                        "Hibás e-mail vagy jelszó."

                });

            }


            const user =
                result.rows[0];


            const passwordMatches =
                await bcrypt.compare(

                    password,

                    user.password_hash

                );


            if (!passwordMatches) {

                return res.status(401).json({

                    success:
                        false,

                    message:
                        "Hibás e-mail vagy jelszó."

                });

            }


            // =========================================
            // SESSION LÉTREHOZÁSA
            // =========================================

            req.session.userId =
                user.id;

            req.session.username =
                user.username;


            // =========================================
            // MOBIL AUTH TOKEN
            // =========================================

            const authToken =
                await createAuthToken(
                    user.id
                );


            req.session.save(
                function (sessionError) {

                    if (sessionError) {

                        console.error(
                            "Session mentési hiba:",
                            sessionError
                        );

                        return res.status(500).json({

                            success:
                                false,

                            message:
                                "A bejelentkezési munkamenetet nem sikerült elmenteni."

                        });

                    }


                    res.json({

                        success:
                            true,

                        message:
                            "Sikeres bejelentkezés.",

                        token:
                            authToken,

                        user: {

                            id:
                                user.id,

                            username:
                                user.username,

                            email:
                                user.email

                        }

                    });

                }
            );

        }

        catch (error) {

            console.error(
                "Bejelentkezési hiba:",
                error
            );


            res.status(500).json({

                success:
                    false,

                message:
                    "Nem sikerült bejelentkezni."

            });

        }

    }
);


// =========================================
// BEJELENTKEZETT FELHASZNÁLÓ
// =========================================

app.get(
    "/api/auth/me",
    async function (req, res) {

        try {

            console.log(
                "Session ellenőrzés:",
                req.session
            );


            const authenticatedUser =
                await getAuthenticatedUser(
                    req
                );


            if (!authenticatedUser) {

                return res.status(401).json({

                    success:
                        false,

                    message:
                        "Nincs bejelentkezett felhasználó."

                });

            }


            res.json({

                success:
                    true,

                user: {

                    id:
                        authenticatedUser.user.id,

                    username:
                        authenticatedUser.user.username,

                    email:
                        authenticatedUser.user.email,

                    created_at:
                        authenticatedUser.user.created_at

                }

            });

        }

        catch (error) {

            console.error(
                "Felhasználó lekérdezési hiba:",
                error
            );


            res.status(500).json({

                success:
                    false,

                message:
                    "Nem sikerült lekérni a felhasználói adatokat."

            });

        }

    }
);


// =========================================
// KIJELENTKEZÉS
// =========================================

app.post(
    "/api/auth/logout",
    async function (req, res) {

        try {

            const bearerToken =
                getBearerToken(req);


            // =========================================
            // TOKEN TÖRLÉSE
            // =========================================

            if (bearerToken) {

                const tokenHash =
                    hashAuthToken(
                        bearerToken
                    );


                await pool.query(

                    `
                    DELETE FROM auth_tokens
                    WHERE token_hash = $1
                    `,

                    [
                        tokenHash
                    ]

                );

            }


            // =========================================
            // SESSION TÖRLÉSE
            // =========================================

            if (
                req.session
            ) {

                req.session.destroy(
                    function (error) {

                        if (error) {

                            console.error(
                                "Kijelentkezési session hiba:",
                                error
                            );

                        }


                        res.clearCookie(
                            "connect.sid",
                            {
                                path:
                                    "/"
                            }
                        );


                        res.json({

                            success:
                                true,

                            message:
                                "Sikeres kijelentkezés."

                        });

                    }
                );

                return;

            }


            res.json({

                success:
                    true,

                message:
                    "Sikeres kijelentkezés."

            });

        }

        catch (error) {

            console.error(
                "Kijelentkezési hiba:",
                error
            );


            res.status(500).json({

                success:
                    false,

                message:
                    "Nem sikerült kijelentkezni."

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

                success:
                    true,

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

                success:
                    false,

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

                    success:
                        false,

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

                success:
                    true,

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

                success:
                    false,

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
