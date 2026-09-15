// =========================================
// PROJECT HUB
// BACKEND SERVER
// =========================================

const express = require("express");
const cors = require("cors");
const session = require("express-session");
const PgSession = require("connect-pg-simple")(session);
const { Pool } = require("pg");
const bcrypt = require("bcrypt");
const crypto = require("crypto");


// =========================================
// APP
// =========================================

const app = express();


// =========================================
// PORT
// =========================================

const PORT =
    process.env.PORT || 3000;


// =========================================
// DATABASE
// =========================================

const pool = new Pool({

    connectionString:
        process.env.DATABASE_URL,

    ssl: {
        rejectUnauthorized: false
    }

});


// =========================================
// MIDDLEWARE
// =========================================

app.set(
    "trust proxy",
    1
);


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
// DATABASE INITIALIZÁLÁS
// =========================================

async function initializeDatabase() {

    try {

        // =====================================
        // USERS
        // =====================================

        await pool.query(`

            CREATE TABLE IF NOT EXISTS users (

                id SERIAL PRIMARY KEY,

                username VARCHAR(100)
                    UNIQUE
                    NOT NULL,

                password TEXT
                    NOT NULL,

                created_at TIMESTAMP
                    DEFAULT CURRENT_TIMESTAMP

            );

        `);


        // =====================================
        // AUTH TOKENS
        // =====================================

        await pool.query(`

            CREATE TABLE IF NOT EXISTS auth_tokens (

                id SERIAL PRIMARY KEY,

                user_id INTEGER
                    NOT NULL
                    REFERENCES users(id)
                    ON DELETE CASCADE,

                token_hash TEXT
                    UNIQUE
                    NOT NULL,

                expires_at TIMESTAMP
                    NOT NULL,

                created_at TIMESTAMP
                    DEFAULT CURRENT_TIMESTAMP

            );

        `);


        // =====================================
        // NOTES
        // =====================================

        await pool.query(`

            CREATE TABLE IF NOT EXISTS notes (

                id SERIAL PRIMARY KEY,

                user_id INTEGER
                    NOT NULL
                    REFERENCES users(id)
                    ON DELETE CASCADE,

                title VARCHAR(255)
                    NOT NULL,

                text TEXT
                    NOT NULL,

                category VARCHAR(100)
                    NOT NULL
                    DEFAULT 'Egyéb',

                pinned BOOLEAN
                    NOT NULL
                    DEFAULT FALSE,

                created_at TIMESTAMP
                    DEFAULT CURRENT_TIMESTAMP,

                updated_at TIMESTAMP
                    DEFAULT CURRENT_TIMESTAMP

            );

        `);


        // =====================================
        // NOTES INDEX
        // =====================================

        await pool.query(`

            CREATE INDEX IF NOT EXISTS
            notes_user_id_idx

            ON notes(user_id);

        `);


        // =====================================
        // RÉGI / LEJÁRT TOKENEK TÖRLÉSE
        // =====================================

        await pool.query(`

            DELETE FROM auth_tokens

            WHERE expires_at < CURRENT_TIMESTAMP;

        `);


        console.log(
            "Adatbázis inicializálása sikeres."
        );

    }

    catch (error) {

        console.error(
            "Adatbázis inicializálási hiba:",
            error
        );

        throw error;

    }

}


// =========================================
// AUTH TOKEN SEGÉDFÜGGVÉNYEK
// =========================================


// =========================================
// TOKEN HASH
// =========================================

function hashAuthToken(token) {

    return crypto
        .createHash("sha256")
        .update(token)
        .digest("hex");

}


// =========================================
// TOKEN LÉTREHOZÁSA
// =========================================

async function createAuthToken(userId) {

    const token =
        crypto.randomBytes(48).toString("hex");


    const tokenHash =
        hashAuthToken(token);


    const expiresAt =
        new Date(
            Date.now() +
            1000 *
            60 *
            60 *
            24 *
            30
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
// BEARER TOKEN LEKÉRÉSE
// =========================================

function getBearerToken(req) {

    const authorization =
        req.headers.authorization;


    if (
        !authorization
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


    return authorization
        .substring(7)
        .trim();

}


// =========================================
// FELHASZNÁLÓ LEKÉRÉSE TOKENBŐL
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
                u.username

            FROM auth_tokens at

            INNER JOIN users u
                ON u.id = at.user_id

            WHERE at.token_hash = $1

              AND at.expires_at >
                  CURRENT_TIMESTAMP

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
// AKTUÁLIS FELHASZNÁLÓ
// TOKEN + SESSION
// =========================================

async function getAuthenticatedUser(req) {

    // =====================================
    // TOKEN
    // =====================================

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

                authType:
                    "token"

            };

        }

    }


    // =====================================
    // SESSION
    // =====================================

    if (
        req.session &&
        req.session.userId
    ) {

        const result =
            await pool.query(

                `
                SELECT
                    id,
                    username

                FROM users

                WHERE id = $1

                LIMIT 1
                `,

                [
                    req.session.userId
                ]

            );


        if (
            result.rows.length > 0
        ) {

            return {

                user:
                    result.rows[0],

                authType:
                    "session"

            };

        }

    }


    return null;

}


// =========================================
// ALAP TESZT ROUTE
// =========================================

app.get(
    "/",
    function (req, res) {

        res.json({

            success:
                true,

            message:
                "Project Hub backend működik."

        });

    }
);


// =========================================
// REGISTER
// =========================================

app.post(
    "/api/auth/register",
    async function (req, res) {

        try {

            const {
                username,
                password
            } = req.body;


            // =================================
            // ELLENŐRZÉS
            // =================================

            if (
                !username ||
                !password
            ) {

                return res.status(400).json({

                    success:
                        false,

                    message:
                        "A felhasználónév és a jelszó kötelező."

                });

            }


            const cleanUsername =
                username.trim();


            if (
                cleanUsername.length < 3
            ) {

                return res.status(400).json({

                    success:
                        false,

                    message:
                        "A felhasználónév legalább 3 karakter legyen."

                });

            }


            if (
                password.length < 6
            ) {

                return res.status(400).json({

                    success:
                        false,

                    message:
                        "A jelszó legalább 6 karakter legyen."

                });

            }


            // =================================
            // LÉTEZIK-E?
            // =================================

            const existingUser =
                await pool.query(

                    `
                    SELECT id

                    FROM users

                    WHERE LOWER(username) =
                          LOWER($1)

                    LIMIT 1
                    `,

                    [
                        cleanUsername
                    ]

                );


            if (
                existingUser.rows.length > 0
            ) {

                return res.status(409).json({

                    success:
                        false,

                    message:
                        "Ez a felhasználónév már foglalt."

                });

            }


            // =================================
            // JELSZÓ HASH
            // =================================

            const passwordHash =
                await bcrypt.hash(
                    password,
                    10
                );


            // =================================
            // USER LÉTREHOZÁSA
            // =================================

            const result =
                await pool.query(

                    `
                    INSERT INTO users
                    (
                        username,
                        password
                    )

                    VALUES
                    (
                        $1,
                        $2
                    )

                    RETURNING
                        id,
                        username
                    `,

                    [

                        cleanUsername,

                        passwordHash

                    ]

                );


            const user =
                result.rows[0];


            // =================================
            // SESSION
            // =================================

            req.session.userId =
                user.id;

            req.session.username =
                user.username;


            // =================================
            // TOKEN
            // =================================

            const token =
                await createAuthToken(
                    user.id
                );


            await new Promise(
                function (
                    resolve,
                    reject
                ) {

                    req.session.save(
                        function (error) {

                            if (error) {

                                reject(
                                    error
                                );

                            }

                            else {

                                resolve();

                            }

                        }
                    );

                }
            );


            res.status(201).json({

                success:
                    true,

                message:
                    "Sikeres regisztráció.",

                token:
                    token,

                user: {

                    id:
                        user.id,

                    username:
                        user.username

                }

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
                    "Nem sikerült a regisztráció."

            });

        }

    }
);


// =========================================
// LOGIN
// =========================================

app.post(
    "/api/auth/login",
    async function (req, res) {

        try {

            const {
                username,
                password
            } = req.body;


            if (
                !username ||
                !password
            ) {

                return res.status(400).json({

                    success:
                        false,

                    message:
                        "A felhasználónév és a jelszó kötelező."

                });

            }


            const result =
                await pool.query(

                    `
                    SELECT
                        id,
                        username,
                        password

                    FROM users

                    WHERE LOWER(username) =
                          LOWER($1)

                    LIMIT 1
                    `,

                    [
                        username.trim()
                    ]

                );


            if (
                result.rows.length === 0
            ) {

                return res.status(401).json({

                    success:
                        false,

                    message:
                        "Hibás felhasználónév vagy jelszó."

                });

            }


            const user =
                result.rows[0];


            const passwordMatch =
                await bcrypt.compare(
                    password,
                    user.password
                );


            if (
                !passwordMatch
            ) {

                return res.status(401).json({

                    success:
                        false,

                    message:
                        "Hibás felhasználónév vagy jelszó."

                });

            }


            // =================================
            // SESSION
            // =================================

            req.session.userId =
                user.id;

            req.session.username =
                user.username;


            // =================================
            // TOKEN
            // =================================

            const token =
                await createAuthToken(
                    user.id
                );


            await new Promise(
                function (
                    resolve,
                    reject
                ) {

                    req.session.save(
                        function (error) {

                            if (error) {

                                reject(
                                    error
                                );

                            }

                            else {

                                resolve();

                            }

                        }
                    );

                }
            );


            res.json({

                success:
                    true,

                message:
                    "Sikeres bejelentkezés.",

                token:
                    token,

                user: {

                    id:
                        user.id,

                    username:
                        user.username

                }

            });

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
// AKTUÁLIS FELHASZNÁLÓ
// =========================================

app.get(
    "/api/auth/me",
    async function (req, res) {

        try {

            const authenticatedUser =
                await getAuthenticatedUser(
                    req
                );


            if (
                !authenticatedUser
            ) {

                return res.status(401).json({

                    success:
                        false,

                    loggedIn:
                        false

                });

            }


            res.json({

                success:
                    true,

                loggedIn:
                    true,

                user: {

                    id:
                        authenticatedUser.user.id,

                    username:
                        authenticatedUser.user.username

                }

            });

        }

        catch (error) {

            console.error(
                "Auth ellenőrzési hiba:",
                error
            );


            res.status(500).json({

                success:
                    false,

                loggedIn:
                    false,

                message:
                    "Nem sikerült ellenőrizni a munkamenetet."

            });

        }

    }
);


// =========================================
// LOGOUT
// =========================================

app.post(
    "/api/auth/logout",
    async function (req, res) {

        try {

            const bearerToken =
                getBearerToken(req);


            // =================================
            // TOKEN TÖRLÉSE
            // =================================

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


            // =================================
            // SESSION TÖRLÉSE
            // =================================

            if (
                req.session
            ) {

                await new Promise(
                    function (
                        resolve
                    ) {

                        req.session.destroy(
                            function () {

                                resolve();

                            }
                        );

                    }
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
// DATABASE TESZT
// =========================================

app.get(
    "/api/database/test",
    async function (req, res) {

        try {

            const result =
                await pool.query(
                    "SELECT NOW() AS now"
                );


            res.json({

                success:
                    true,

                database:
                    "connected",

                time:
                    result.rows[0].now

            });

        }

        catch (error) {

            console.error(
                "Database teszt hiba:",
                error
            );


            res.status(500).json({

                success:
                    false,

                database:
                    "error",

                message:
                    error.message

            });

        }

    }
);


// =========================================
// JEGYZETEK API
// =========================================


// =========================================
// ÖSSZES JEGYZET
// =========================================

app.get(
    "/api/notes",
    async function (req, res) {

        try {

            const authenticatedUser =
                await getAuthenticatedUser(
                    req
                );


            if (
                !authenticatedUser
            ) {

                return res.status(401).json({

                    success:
                        false,

                    message:
                        "A jegyzetek megtekintéséhez be kell jelentkezni."

                });

            }


            const result =
                await pool.query(

                    `
                    SELECT
                        id,
                        title,
                        text,
                        category,
                        pinned,
                        created_at,
                        updated_at

                    FROM notes

                    WHERE user_id = $1

                    ORDER BY
                        pinned DESC,
                        created_at DESC
                    `,

                    [
                        authenticatedUser.user.id
                    ]

                );


            res.json({

                success:
                    true,

                notes:
                    result.rows

            });

        }

        catch (error) {

            console.error(
                "Jegyzetek lekérési hiba:",
                error
            );


            res.status(500).json({

                success:
                    false,

                message:
                    "Nem sikerült lekérni a jegyzeteket."

            });

        }

    }
);


// =========================================
// ÚJ JEGYZET
// =========================================

app.post(
    "/api/notes",
    async function (req, res) {

        try {

            const authenticatedUser =
                await getAuthenticatedUser(
                    req
                );


            if (
                !authenticatedUser
            ) {

                return res.status(401).json({

                    success:
                        false,

                    message:
                        "Jegyzet létrehozásához be kell jelentkezni."

                });

            }


            const {
                title,
                text,
                category,
                pinned
            } = req.body;


            if (
                !title ||
                !text
            ) {

                return res.status(400).json({

                    success:
                        false,

                    message:
                        "A cím és a jegyzet szövege kötelező."

                });

            }


            const result =
                await pool.query(

                    `
                    INSERT INTO notes
                    (
                        user_id,
                        title,
                        text,
                        category,
                        pinned
                    )

                    VALUES
                    (
                        $1,
                        $2,
                        $3,
                        $4,
                        $5
                    )

                    RETURNING
                        id,
                        title,
                        text,
                        category,
                        pinned,
                        created_at,
                        updated_at
                    `,

                    [

                        authenticatedUser.user.id,

                        title.trim(),

                        text.trim(),

                        category ||
                            "Egyéb",

                        pinned === true

                    ]

                );


            res.status(201).json({

                success:
                    true,

                note:
                    result.rows[0]

            });

        }

        catch (error) {

            console.error(
                "Jegyzet létrehozási hiba:",
                error
            );


            res.status(500).json({

                success:
                    false,

                message:
                    "Nem sikerült létrehozni a jegyzetet."

            });

        }

    }
);


// =========================================
// JEGYZET SZERKESZTÉSE
// =========================================

app.put(
    "/api/notes/:id",
    async function (req, res) {

        try {

            const authenticatedUser =
                await getAuthenticatedUser(
                    req
                );


            if (
                !authenticatedUser
            ) {

                return res.status(401).json({

                    success:
                        false,

                    message:
                        "A jegyzet szerkesztéséhez be kell jelentkezni."

                });

            }


            const noteId =
                Number(req.params.id);


            if (
                !Number.isInteger(noteId)
            ) {

                return res.status(400).json({

                    success:
                        false,

                    message:
                        "Érvénytelen jegyzet azonosító."

                });

            }


            const {
                title,
                text,
                category,
                pinned
            } = req.body;


            if (
                !title ||
                !text
            ) {

                return res.status(400).json({

                    success:
                        false,

                    message:
                        "A cím és a jegyzet szövege kötelező."

                });

            }


            const result =
                await pool.query(

                    `
                    UPDATE notes

                    SET
                        title = $1,
                        text = $2,
                        category = $3,
                        pinned = $4,
                        updated_at = CURRENT_TIMESTAMP

                    WHERE id = $5

                      AND user_id = $6

                    RETURNING
                        id,
                        title,
                        text,
                        category,
                        pinned,
                        created_at,
                        updated_at
                    `,

                    [

                        title.trim(),

                        text.trim(),

                        category ||
                            "Egyéb",

                        pinned === true,

                        noteId,

                        authenticatedUser.user.id

                    ]

                );


            if (
                result.rows.length === 0
            ) {

                return res.status(404).json({

                    success:
                        false,

                    message:
                        "A jegyzet nem található."

                });

            }


            res.json({

                success:
                    true,

                note:
                    result.rows[0]

            });

        }

        catch (error) {

            console.error(
                "Jegyzet szerkesztési hiba:",
                error
            );


            res.status(500).json({

                success:
                    false,

                message:
                    "Nem sikerült módosítani a jegyzetet."

            });

        }

    }
);


// =========================================
// JEGYZET TÖRLÉSE
// =========================================

app.delete(
    "/api/notes/:id",
    async function (req, res) {

        try {

            const authenticatedUser =
                await getAuthenticatedUser(
                    req
                );


            if (
                !authenticatedUser
            ) {

                return res.status(401).json({

                    success:
                        false,

                    message:
                        "A jegyzet törléséhez be kell jelentkezni."

                });

            }


            const noteId =
                Number(req.params.id);


            if (
                !Number.isInteger(noteId)
            ) {

                return res.status(400).json({

                    success:
                        false,

                    message:
                        "Érvénytelen jegyzet azonosító."

                });

            }


            const result =
                await pool.query(

                    `
                    DELETE FROM notes

                    WHERE id = $1

                      AND user_id = $2

                    RETURNING id
                    `,

                    [

                        noteId,

                        authenticatedUser.user.id

                    ]

                );


            if (
                result.rows.length === 0
            ) {

                return res.status(404).json({

                    success:
                        false,

                    message:
                        "A jegyzet nem található."

                });

            }


            res.json({

                success:
                    true,

                message:
                    "A jegyzet törölve."

            });

        }

        catch (error) {

            console.error(
                "Jegyzet törlési hiba:",
                error
            );


            res.status(500).json({

                success:
                    false,

                message:
                    "Nem sikerült törölni a jegyzetet."

            });

        }

    }
);


// =========================================
// STEAM API
// =========================================

app.get(
    "/api/steam/games",
    async function (req, res) {

        try {

            const steamApiKey =
                process.env.STEAM_API_KEY;

            const steamId =
                process.env.STEAM_ID;


            if (
                !steamApiKey ||
                !steamId
            ) {

                return res.status(500).json({

                    success:
                        false,

                    message:
                        "A Steam API nincs megfelelően beállítva."

                });

            }


            const steamUrl =
                "https://api.steampowered.com/" +
                "IPlayerService/GetOwnedGames/v0001/" +
                "?key=" +
                encodeURIComponent(
                    steamApiKey
                ) +
                "&steamid=" +
                encodeURIComponent(
                    steamId
                ) +
                "&format=json" +
                "&include_appinfo=1" +
                "&include_played_free_games=1";


            const response =
                await fetch(
                    steamUrl
                );


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

                games:
                    data.response &&
                    data.response.games
                        ? data.response.games
                        : []

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
                    "Nem sikerült lekérni a Steam játékokat."

            });

        }

    }
);


// =========================================
// HIBAKEZELÉS
// =========================================

app.use(
    function (
        error,
        req,
        res,
        next
    ) {

        console.error(
            "Szerverhiba:",
            error
        );


        res.status(500).json({

            success:
                false,

            message:
                "Belső szerverhiba."

        });

    }
);


// =========================================
// SZERVER INDÍTÁSA
// =========================================

async function startServer() {

    try {

        await initializeDatabase();


        app.listen(
            PORT,
            function () {

                console.log(
                    "================================="
                );

                console.log(
                    "PROJECT HUB BACKEND"
                );

                console.log(
                    "Szerver fut a porton:",
                    PORT
                );

                console.log(
                    "================================="
                );

            }
        );

    }

    catch (error) {

        console.error(
            "A szerver nem tudott elindulni:",
            error
        );


        process.exit(1);

    }

}


startServer();
