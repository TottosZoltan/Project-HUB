const express = require("express");
const cors = require("cors");
const session = require("express-session");
const PgSession = require("connect-pg-simple")(session);
const { Pool } = require("pg");
const bcrypt = require("bcrypt");
const crypto = require("crypto");

const app = express();

const PORT = process.env.PORT || 10000;

const FRONTEND_URL =
    "https://tottoszoltan.github.io";

const STEAM_API_KEY =
    process.env.STEAM_API_KEY;

const STEAM_ID =
    process.env.STEAM_ID ||
    "76561199059474054";

const pool = new Pool({
    connectionString:
        process.env.DATABASE_URL,

    ssl: {
        rejectUnauthorized: false
    }
});


// ======================================================
// MIDDLEWARE
// ======================================================

app.use(
    cors({
        origin: FRONTEND_URL,
        credentials: true
    })
);

app.use(
    express.json({
        limit: "2mb"
    })
);

app.set(
    "trust proxy",
    1
);


// ======================================================
// SESSION
// ======================================================

app.use(
    session({
        store: new PgSession({
            pool: pool,
            tableName: "sessions",
            createTableIfMissing: true
        }),

        secret:
            process.env.SESSION_SECRET ||
            "project-hub-development-secret",

        resave: false,

        saveUninitialized: false,

        cookie: {
            httpOnly: true,
            secure: true,
            sameSite: "none",
            path: "/",
            maxAge:
                1000 *
                60 *
                60 *
                24 *
                30
        }
    })
);


// ======================================================
// DATABASE INITIALIZATION
// ======================================================

async function initializeDatabase() {

    console.log(
        "Adatbázis inicializálása..."
    );

    // --------------------------------------------------
    // USERS
    // --------------------------------------------------

    await pool.query(`
        CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            username VARCHAR(100) UNIQUE NOT NULL,
            password TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    `);

    // Régi adatbázisokhoz szükséges migration
    await pool.query(`
        ALTER TABLE users
        ADD COLUMN IF NOT EXISTS password TEXT;
    `);

    await pool.query(`
        ALTER TABLE users
        ADD COLUMN IF NOT EXISTS email VARCHAR(255);
    `);


    // --------------------------------------------------
    // AUTH TOKENS
    // --------------------------------------------------

    await pool.query(`
        CREATE TABLE IF NOT EXISTS auth_tokens (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL
                REFERENCES users(id)
                ON DELETE CASCADE,
            token_hash TEXT UNIQUE NOT NULL,
            expires_at TIMESTAMP NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    `);

    await pool.query(`
        CREATE INDEX IF NOT EXISTS
        auth_tokens_user_id_idx
        ON auth_tokens(user_id);
    `);

    await pool.query(`
        CREATE INDEX IF NOT EXISTS
        auth_tokens_expires_at_idx
        ON auth_tokens(expires_at);
    `);


    // --------------------------------------------------
    // NOTES
    // --------------------------------------------------

    await pool.query(`
        CREATE TABLE IF NOT EXISTS notes (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL
                REFERENCES users(id)
                ON DELETE CASCADE,
            title TEXT NOT NULL DEFAULT '',
            content TEXT NOT NULL DEFAULT '',
            category VARCHAR(100) NOT NULL DEFAULT 'Egyéb',
            pinned BOOLEAN NOT NULL DEFAULT FALSE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    `);

    await pool.query(`
        CREATE INDEX IF NOT EXISTS
        notes_user_id_idx
        ON notes(user_id);
    `);

    await pool.query(`
        CREATE INDEX IF NOT EXISTS
        notes_user_updated_idx
        ON notes(user_id, updated_at DESC);
    `);


    // --------------------------------------------------
    // EXPIRED TOKENS
    // --------------------------------------------------

    await pool.query(`
        DELETE FROM auth_tokens
        WHERE expires_at < CURRENT_TIMESTAMP;
    `);

    console.log(
        "Adatbázis inicializálása kész."
    );
}


// ======================================================
// AUTH TOKEN HELPERS
// ======================================================

function hashAuthToken(token) {

    return crypto
        .createHash("sha256")
        .update(token)
        .digest("hex");
}


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
        INSERT INTO auth_tokens (
            user_id,
            token_hash,
            expires_at
        )
        VALUES ($1, $2, $3)
        `,
        [
            userId,
            tokenHash,
            expiresAt
        ]
    );

    return token;
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

    return authorization
        .substring(7)
        .trim();
}


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
                u.email
            FROM auth_tokens t
            JOIN users u
                ON u.id = t.user_id
            WHERE t.token_hash = $1
              AND t.expires_at > CURRENT_TIMESTAMP
            LIMIT 1
            `,
            [tokenHash]
        );

    if (
        result.rows.length === 0
    ) {
        return null;
    }

    return result.rows[0];
}


async function getAuthenticatedUser(req) {

    // --------------------------------------------------
    // FIRST: BEARER TOKEN
    // --------------------------------------------------

    const bearerToken =
        getBearerToken(req);

    if (bearerToken) {

        const tokenUser =
            await getUserFromAuthToken(
                bearerToken
            );

        if (tokenUser) {
            return tokenUser;
        }
    }


    // --------------------------------------------------
    // SECOND: SESSION
    // --------------------------------------------------

    if (req.session?.userId) {

        const result =
            await pool.query(
                `
                SELECT
                    id,
                    username,
                    email
                FROM users
                WHERE id = $1
                LIMIT 1
                `,
                [req.session.userId]
            );

        if (
            result.rows.length > 0
        ) {
            return result.rows[0];
        }
    }

    return null;
}


// ======================================================
// BASIC ROUTE
// ======================================================

app.get(
    "/",
    function (req, res) {

        res.json({
            success: true,
            message:
                "Project Hub backend működik."
        });

    }
);


// ======================================================
// AUTH - REGISTER
// ======================================================

app.post(
    "/api/auth/register",
    async function (req, res) {

        try {

            const username =
                typeof req.body.username === "string"
                    ? req.body.username.trim()
                    : "";

            const email =
                typeof req.body.email === "string"
                    ? req.body.email.trim().toLowerCase()
                    : "";

            const password =
                typeof req.body.password === "string"
                    ? req.body.password
                    : "";


            // --------------------------------------------------
            // VALIDATION
            // --------------------------------------------------

            if (
                !username ||
                !email ||
                !password
            ) {

                return res.status(400).json({
                    success: false,
                    message:
                        "A felhasználónév, e-mail és jelszó kötelező."
                });

            }


            if (
                username.length < 3
            ) {

                return res.status(400).json({
                    success: false,
                    message:
                        "A felhasználónév legalább 3 karakter legyen."
                });

            }


            if (
                password.length < 6
            ) {

                return res.status(400).json({
                    success: false,
                    message:
                        "A jelszó legalább 6 karakter legyen."
                });

            }


            // Egyszerű e-mail ellenőrzés

            const emailRegex =
                /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

            if (
                !emailRegex.test(email)
            ) {

                return res.status(400).json({
                    success: false,
                    message:
                        "Érvénytelen e-mail cím."
                });

            }


            // --------------------------------------------------
            // USERNAME CHECK
            // --------------------------------------------------

            const usernameCheck =
                await pool.query(
                    `
                    SELECT id
                    FROM users
                    WHERE LOWER(username) = LOWER($1)
                    LIMIT 1
                    `,
                    [username]
                );


            if (
                usernameCheck.rows.length > 0
            ) {

                return res.status(409).json({
                    success: false,
                    message:
                        "Ez a felhasználónév már foglalt."
                });

            }


            // --------------------------------------------------
            // EMAIL CHECK
            // --------------------------------------------------

            const emailCheck =
                await pool.query(
                    `
                    SELECT id
                    FROM users
                    WHERE email IS NOT NULL
                      AND LOWER(email) = LOWER($1)
                    LIMIT 1
                    `,
                    [email]
                );


            if (
                emailCheck.rows.length > 0
            ) {

                return res.status(409).json({
                    success: false,
                    message:
                        "Ez az e-mail cím már használatban van."
                });

            }


            // --------------------------------------------------
            // PASSWORD HASH
            // --------------------------------------------------

            const passwordHash =
                await bcrypt.hash(
                    password,
                    12
                );


            // --------------------------------------------------
            // CREATE USER
            // --------------------------------------------------

            const result =
                await pool.query(
                    `
                    INSERT INTO users (
                        username,
                        email,
                        password
                    )
                    VALUES ($1, $2, $3)
                    RETURNING
                        id,
                        username,
                        email,
                        created_at
                    `,
                    [
                        username,
                        email,
                        passwordHash
                    ]
                );


            const user =
                result.rows[0];


            // --------------------------------------------------
            // SESSION
            // --------------------------------------------------

            req.session.userId =
                user.id;

            req.session.username =
                user.username;


            // --------------------------------------------------
            // TOKEN
            // --------------------------------------------------

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
                                reject(error);
                            }
                            else {
                                resolve();
                            }

                        }
                    );

                }
            );


            // --------------------------------------------------
            // RESPONSE
            // --------------------------------------------------

            return res.status(201).json({
                success: true,

                message:
                    "Sikeres regisztráció.",

                token: token,

                user: {
                    id: user.id,
                    username:
                        user.username,
                    email:
                        user.email
                }
            });

        }
        catch (error) {

            console.error(
                "REGISZTRÁCIÓS HIBA:",
                error
            );

            return res.status(500).json({
                success: false,
                message:
                    "Szerverhiba a regisztráció során."
            });

        }

    }
);


// ======================================================
// AUTH - LOGIN
// ======================================================

app.post(
    "/api/auth/login",
    async function (req, res) {

        try {

            const login =
                typeof req.body.login === "string"
                    ? req.body.login.trim()
                    : "";

            const password =
                typeof req.body.password === "string"
                    ? req.body.password
                    : "";


            // --------------------------------------------------
            // VALIDATION
            // --------------------------------------------------

            if (
                !login ||
                !password
            ) {

                return res.status(400).json({
                    success: false,
                    message:
                        "Az e-mail/felhasználónév és a jelszó kötelező."
                });

            }


            // --------------------------------------------------
            // FIND USER
            // EMAIL OR USERNAME
            // --------------------------------------------------

            const result =
                await pool.query(
                    `
                    SELECT
                        id,
                        username,
                        email,
                        password
                    FROM users
                    WHERE LOWER(username) = LOWER($1)
                       OR (
                            email IS NOT NULL
                            AND LOWER(email) = LOWER($1)
                       )
                    LIMIT 1
                    `,
                    [login]
                );


            if (
                result.rows.length === 0
            ) {

                return res.status(401).json({
                    success: false,
                    message:
                        "Hibás e-mail/felhasználónév vagy jelszó."
                });

            }


            const user =
                result.rows[0];


            // --------------------------------------------------
            // PASSWORD CHECK
            // --------------------------------------------------

            if (
                !user.password
            ) {

                return res.status(401).json({
                    success: false,
                    message:
                        "Ehhez a fiókhoz még nincs érvényes jelszó beállítva."
                });

            }


            const passwordValid =
                await bcrypt.compare(
                    password,
                    user.password
                );


            if (
                !passwordValid
            ) {

                return res.status(401).json({
                    success: false,
                    message:
                        "Hibás e-mail/felhasználónév vagy jelszó."
                });

            }


            // --------------------------------------------------
            // SESSION
            // --------------------------------------------------

            req.session.userId =
                user.id;

            req.session.username =
                user.username;


            // --------------------------------------------------
            // TOKEN
            // --------------------------------------------------

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
                                reject(error);
                            }
                            else {
                                resolve();
                            }

                        }
                    );

                }
            );


            // --------------------------------------------------
            // RESPONSE
            // --------------------------------------------------

            return res.json({
                success: true,

                message:
                    "Sikeres bejelentkezés.",

                token: token,

                user: {
                    id: user.id,
                    username:
                        user.username,
                    email:
                        user.email
                }
            });

        }
        catch (error) {

            console.error(
                "BEJELENTKEZÉSI HIBA:",
                error
            );

            return res.status(500).json({
                success: false,
                message:
                    "Szerverhiba a bejelentkezés során."
            });

        }

    }
);


// ======================================================
// AUTH - ME
// ======================================================

app.get(
    "/api/auth/me",
    async function (req, res) {

        try {

            const user =
                await getAuthenticatedUser(
                    req
                );


            if (!user) {

                return res.status(401).json({
                    success: false,
                    message:
                        "Nincs bejelentkezett felhasználó."
                });

            }


            return res.json({
                success: true,

                user: {
                    id: user.id,
                    username:
                        user.username,
                    email:
                        user.email
                }
            });

        }
        catch (error) {

            console.error(
                "AUTH ME HIBA:",
                error
            );

            return res.status(500).json({
                success: false,
                message:
                    "Szerverhiba."
            });

        }

    }
);


// ======================================================
// AUTH - LOGOUT
// ======================================================

app.post(
    "/api/auth/logout",
    async function (req, res) {

        try {

            // --------------------------------------------------
            // DELETE BEARER TOKEN
            // --------------------------------------------------

            const bearerToken =
                getBearerToken(req);


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
                    [tokenHash]
                );

            }


            // --------------------------------------------------
            // DESTROY SESSION
            // --------------------------------------------------

            if (req.session) {

                await new Promise(
                    function (
                        resolve,
                        reject
                    ) {

                        req.session.destroy(
                            function (error) {

                                if (error) {
                                    reject(error);
                                }
                                else {
                                    resolve();
                                }

                            }
                        );

                    }
                );

            }


            res.clearCookie(
                "connect.sid",
                {
                    path: "/"
                }
            );


            return res.json({
                success: true,
                message:
                    "Sikeres kijelentkezés."
            });

        }
        catch (error) {

            console.error(
                "KIJELENTKEZÉSI HIBA:",
                error
            );

            return res.status(500).json({
                success: false,
                message:
                    "Szerverhiba a kijelentkezés során."
            });

        }

    }
);


// ======================================================
// DATABASE TEST
// ======================================================

app.get(
    "/api/database/test",
    async function (req, res) {

        try {

            const result =
                await pool.query(
                    "SELECT NOW() AS now"
                );

            return res.json({
                success: true,
                database: true,
                time:
                    result.rows[0].now
            });

        }
        catch (error) {

            console.error(
                "DATABASE TEST HIBA:",
                error
            );

            return res.status(500).json({
                success: false,
                database: false,
                message:
                    "Adatbázis hiba."
            });

        }

    }
);


// ======================================================
// NOTES - GET ALL
// ======================================================

app.get(
    "/api/notes",
    async function (req, res) {

        try {

            const user =
                await getAuthenticatedUser(
                    req
                );


            if (!user) {

                return res.status(401).json({
                    success: false,
                    message:
                        "Bejelentkezés szükséges."
                });

            }


            const result =
                await pool.query(
                    `
                    SELECT
                        id,
                        title,
                        content,
                        category,
                        pinned,
                        created_at,
                        updated_at
                    FROM notes
                    WHERE user_id = $1
                    ORDER BY
                        pinned DESC,
                        updated_at DESC
                    `,
                    [user.id]
                );


            return res.json({
                success: true,
                notes:
                    result.rows
            });

        }
        catch (error) {

            console.error(
                "NOTES GET HIBA:",
                error
            );

            return res.status(500).json({
                success: false,
                message:
                    "Nem sikerült betölteni a jegyzeteket."
            });

        }

    }
);


// ======================================================
// NOTES - CREATE
// ======================================================

app.post(
    "/api/notes",
    async function (req, res) {

        try {

            const user =
                await getAuthenticatedUser(
                    req
                );


            if (!user) {

                return res.status(401).json({
                    success: false,
                    message:
                        "Bejelentkezés szükséges."
                });

            }


            const title =
                typeof req.body.title === "string"
                    ? req.body.title.trim()
                    : "";

            const content =
                typeof req.body.content === "string"
                    ? req.body.content
                    : "";

            const category =
                typeof req.body.category === "string"
                    ? req.body.category.trim()
                    : "Egyéb";

            const pinned =
                Boolean(
                    req.body.pinned
                );


            const result =
                await pool.query(
                    `
                    INSERT INTO notes (
                        user_id,
                        title,
                        content,
                        category,
                        pinned
                    )
                    VALUES ($1, $2, $3, $4, $5)
                    RETURNING
                        id,
                        title,
                        content,
                        category,
                        pinned,
                        created_at,
                        updated_at
                    `,
                    [
                        user.id,
                        title,
                        content,
                        category || "Egyéb",
                        pinned
                    ]
                );


            return res.status(201).json({
                success: true,
                note:
                    result.rows[0]
            });

        }
        catch (error) {

            console.error(
                "NOTE CREATE HIBA:",
                error
            );

            return res.status(500).json({
                success: false,
                message:
                    "Nem sikerült létrehozni a jegyzetet."
            });

        }

    }
);


// ======================================================
// NOTES - UPDATE
// ======================================================

app.put(
    "/api/notes/:id",
    async function (req, res) {

        try {

            const user =
                await getAuthenticatedUser(
                    req
                );


            if (!user) {

                return res.status(401).json({
                    success: false,
                    message:
                        "Bejelentkezés szükséges."
                });

            }


            const noteId =
                Number(
                    req.params.id
                );


            if (
                !Number.isInteger(noteId)
            ) {

                return res.status(400).json({
                    success: false,
                    message:
                        "Érvénytelen jegyzet azonosító."
                });

            }


            const title =
                typeof req.body.title === "string"
                    ? req.body.title.trim()
                    : "";

            const content =
                typeof req.body.content === "string"
                    ? req.body.content
                    : "";

            const category =
                typeof req.body.category === "string"
                    ? req.body.category.trim()
                    : "Egyéb";

            const pinned =
                Boolean(
                    req.body.pinned
                );


            const result =
                await pool.query(
                    `
                    UPDATE notes
                    SET
                        title = $1,
                        content = $2,
                        category = $3,
                        pinned = $4,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE id = $5
                      AND user_id = $6
                    RETURNING
                        id,
                        title,
                        content,
                        category,
                        pinned,
                        created_at,
                        updated_at
                    `,
                    [
                        title,
                        content,
                        category || "Egyéb",
                        pinned,
                        noteId,
                        user.id
                    ]
                );


            if (
                result.rows.length === 0
            ) {

                return res.status(404).json({
                    success: false,
                    message:
                        "A jegyzet nem található."
                });

            }


            return res.json({
                success: true,
                note:
                    result.rows[0]
            });

        }
        catch (error) {

            console.error(
                "NOTE UPDATE HIBA:",
                error
            );

            return res.status(500).json({
                success: false,
                message:
                    "Nem sikerült módosítani a jegyzetet."
            });

        }

    }
);


// ======================================================
// NOTES - DELETE
// ======================================================

app.delete(
    "/api/notes/:id",
    async function (req, res) {

        try {

            const user =
                await getAuthenticatedUser(
                    req
                );


            if (!user) {

                return res.status(401).json({
                    success: false,
                    message:
                        "Bejelentkezés szükséges."
                });

            }


            const noteId =
                Number(
                    req.params.id
                );


            if (
                !Number.isInteger(noteId)
            ) {

                return res.status(400).json({
                    success: false,
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
                        user.id
                    ]
                );


            if (
                result.rows.length === 0
            ) {

                return res.status(404).json({
                    success: false,
                    message:
                        "A jegyzet nem található."
                });

            }


            return res.json({
                success: true,
                message:
                    "Jegyzet törölve."
            });

        }
        catch (error) {

            console.error(
                "NOTE DELETE HIBA:",
                error
            );

            return res.status(500).json({
                success: false,
                message:
                    "Nem sikerült törölni a jegyzetet."
            });

        }

    }
);


// ======================================================
// STEAM - GAMES
// ======================================================

app.get(
    "/api/steam/games",
    async function (req, res) {

        try {

            if (!STEAM_API_KEY) {

                return res.status(500).json({
                    success: false,
                    message:
                        "A STEAM_API_KEY nincs beállítva."
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
                "&format=json" +
                "&include_appinfo=1" +
                "&include_played_free_games=1";


            const response =
                await fetch(url);


            if (!response.ok) {

                return res.status(502).json({
                    success: false,
                    message:
                        "A Steam API nem elérhető."
                });

            }


            const data =
                await response.json();


            const games =
                data?.response?.games ||
                [];


            games.sort(
                function (a, b) {

                    return (
                        (b.playtime_forever || 0) -
                        (a.playtime_forever || 0)
                    );

                }
            );


            return res.json({
                success: true,
                steamId:
                    STEAM_ID,
                gameCount:
                    games.length,
                games:
                    games
            });

        }
        catch (error) {

            console.error(
                "STEAM API HIBA:",
                error
            );

            return res.status(500).json({
                success: false,
                message:
                    "Nem sikerült lekérni a Steam játékokat."
            });

        }

    }
);


// ======================================================
// ERROR HANDLER
// ======================================================

app.use(
    function (
        error,
        req,
        res,
        next
    ) {

        console.error(
            "GLOBAL ERROR:",
            error
        );

        if (
            res.headersSent
        ) {
            return next(error);
        }

        return res.status(500).json({
            success: false,
            message:
                "Belső szerverhiba."
        });

    }
);


// ======================================================
// START SERVER
// ======================================================

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
                    "PROJECT HUB BACKEND ELINDULT"
                );

                console.log(
                    "Port:",
                    PORT
                );

                console.log(
                    "Frontend:",
                    FRONTEND_URL
                );

                console.log(
                    "================================="
                );

            }
        );

    }
    catch (error) {

        console.error(
            "A szerver indítása sikertelen:",
            error
        );

        process.exit(1);

    }

}


startServer();
