const express = require("express");
const cors = require("cors");
const session = require("express-session");
const PgSession = require("connect-pg-simple")(session);
const { Pool } = require("pg");
const bcrypt = require("bcrypt");
const crypto = require("crypto");

const app = express();

const PORT =
    process.env.PORT || 10000;

const FRONTEND_URL =
    "https://tottoszoltan.github.io";

const STEAM_API_KEY =
    process.env.STEAM_API_KEY;

const STEAM_ID =
    process.env.STEAM_ID ||
    "76561199059474054";


// ======================================================
// DATABASE
// ======================================================

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


    // ==================================================
    // USERS
    // ==================================================

    await pool.query(`
        CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            username VARCHAR(100) UNIQUE NOT NULL,
            email VARCHAR(255),
            password_hash TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    `);


    await pool.query(`
        ALTER TABLE users
        ADD COLUMN IF NOT EXISTS email VARCHAR(255);
    `);


    await pool.query(`
        ALTER TABLE users
        ADD COLUMN IF NOT EXISTS password_hash TEXT;
    `);


    await pool.query(`
        ALTER TABLE users
        ADD COLUMN IF NOT EXISTS created_at
        TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
    `);


    await pool.query(`
        ALTER TABLE users
        ADD COLUMN IF NOT EXISTS updated_at
        TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
    `);


    // ==================================================
    // AUTH TOKENS
    // ==================================================

    await pool.query(`
        CREATE TABLE IF NOT EXISTS auth_tokens (
            id SERIAL PRIMARY KEY,

            user_id INTEGER NOT NULL
                REFERENCES users(id)
                ON DELETE CASCADE,

            token_hash TEXT UNIQUE NOT NULL,

            expires_at TIMESTAMP NOT NULL,

            created_at TIMESTAMP
                DEFAULT CURRENT_TIMESTAMP
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


    // ==================================================
    // NOTES
    // ==================================================
    //
    // FONTOS:
    //
    // A jelenlegi adatbázisban van:
    //
    // text
    //
    // és az új rendszerben:
    //
    // content
    //
    // Ezért mindkettőt megtartjuk.
    //
    // A backend mindig ugyanazt az értéket írja
    // mindkét mezőbe.
    //
    // ==================================================

    await pool.query(`
        CREATE TABLE IF NOT EXISTS notes (
            id SERIAL PRIMARY KEY,

            user_id INTEGER NOT NULL
                REFERENCES users(id)
                ON DELETE CASCADE,

            owner_tag TEXT NOT NULL,

            title TEXT NOT NULL DEFAULT '',

            text TEXT NOT NULL DEFAULT '',

            content TEXT NOT NULL DEFAULT '',

            category VARCHAR(100)
                NOT NULL DEFAULT 'Egyéb',

            pinned BOOLEAN
                NOT NULL DEFAULT FALSE,

            created_at TIMESTAMP
                DEFAULT CURRENT_TIMESTAMP,

            updated_at TIMESTAMP
                DEFAULT CURRENT_TIMESTAMP
        );
    `);


    // ==================================================
    // RÉGI NOTES TÁBLA MIGRÁCIÓ
    // ==================================================

    await pool.query(`
        ALTER TABLE notes
        ADD COLUMN IF NOT EXISTS user_id INTEGER;
    `);


    await pool.query(`
        ALTER TABLE notes
        ADD COLUMN IF NOT EXISTS owner_tag TEXT;
    `);


    await pool.query(`
        ALTER TABLE notes
        ADD COLUMN IF NOT EXISTS title TEXT
        NOT NULL DEFAULT '';
    `);


    // ----------------------------------------------
    // RÉGI TEXT MEZŐ
    // ----------------------------------------------

    await pool.query(`
        ALTER TABLE notes
        ADD COLUMN IF NOT EXISTS text TEXT
        NOT NULL DEFAULT '';
    `);


    // ----------------------------------------------
    // ÚJ CONTENT MEZŐ
    // ----------------------------------------------

    await pool.query(`
        ALTER TABLE notes
        ADD COLUMN IF NOT EXISTS content TEXT
        NOT NULL DEFAULT '';
    `);


    await pool.query(`
        ALTER TABLE notes
        ADD COLUMN IF NOT EXISTS category VARCHAR(100)
        NOT NULL DEFAULT 'Egyéb';
    `);


    await pool.query(`
        ALTER TABLE notes
        ADD COLUMN IF NOT EXISTS pinned BOOLEAN
        NOT NULL DEFAULT FALSE;
    `);


    await pool.query(`
        ALTER TABLE notes
        ADD COLUMN IF NOT EXISTS created_at
        TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
    `);


    await pool.query(`
        ALTER TABLE notes
        ADD COLUMN IF NOT EXISTS updated_at
        TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
    `);


    // ==================================================
    // TEXT <-> CONTENT SZINKRONIZÁLÁS
    // ==================================================

    await pool.query(`
        UPDATE notes
        SET content = text
        WHERE
            text IS NOT NULL
            AND (
                content IS NULL
                OR content = ''
            )
            AND text <> '';
    `);


    // ==================================================
    // CONTENT -> TEXT SZINKRON
    // ==================================================

    await pool.query(`
        UPDATE notes
        SET text = content
        WHERE
            content IS NOT NULL
            AND content <> ''
            AND (
                text IS NULL
                OR text = ''
            );
    `);


    // ==================================================
    // OWNER TAG KITÖLTÉS
    // ==================================================

    await pool.query(`
        UPDATE notes
        SET owner_tag =
            'USER-' || user_id::TEXT
        WHERE
            owner_tag IS NULL
            AND user_id IS NOT NULL;
    `);


    // ==================================================
    // USER ID FOREIGN KEY
    // ==================================================

    await pool.query(`
        DO $$
        BEGIN

            IF NOT EXISTS (
                SELECT 1
                FROM pg_constraint
                WHERE conname =
                    'notes_user_id_fkey'
            )
            THEN

                ALTER TABLE notes
                ADD CONSTRAINT
                    notes_user_id_fkey
                FOREIGN KEY (user_id)
                REFERENCES users(id)
                ON DELETE CASCADE;

            END IF;

        END
        $$;
    `);


    // ==================================================
    // USER ID INDEX
    // ==================================================

    await pool.query(`
        CREATE INDEX IF NOT EXISTS
        notes_user_id_idx
        ON notes(user_id);
    `);


    // ==================================================
    // USER + UPDATED INDEX
    // ==================================================

    await pool.query(`
        CREATE INDEX IF NOT EXISTS
        notes_user_updated_idx
        ON notes(
            user_id,
            updated_at DESC
        );
    `);


    // ==================================================
    // OWNER TAG INDEX
    // ==================================================

    await pool.query(`
        CREATE INDEX IF NOT EXISTS
        notes_owner_tag_idx
        ON notes(owner_tag);
    `);


    // ==================================================
    // EXPIRED TOKENS TÖRLÉSE
    // ==================================================

    await pool.query(`
        DELETE FROM auth_tokens
        WHERE expires_at < CURRENT_TIMESTAMP;
    `);


    console.log(
        "Adatbázis inicializálása kész."
    );
}


// ======================================================
// TASKS DATABASE INITIALIZATION
// ======================================================
//
// A TASKS ugyanazt a tulajdonosi rendszert használja,
// mint a NOTES.
//
// token
//   ↓
// auth_tokens
//   ↓
// user_id
//   ↓
// owner_tag
//   ↓
// tasks
//
// A frontend által küldött user_id / owner_tag
// nem határozza meg a tulajdonost.
//
// ======================================================

async function initializeTasksDatabase() {

    console.log(
        "Tasks adatbázis inicializálása..."
    );


    // ==================================================
    // TASKS TÁBLA
    // ==================================================

    await pool.query(`
        CREATE TABLE IF NOT EXISTS tasks (
            id SERIAL PRIMARY KEY,

            user_id INTEGER,

            owner_tag TEXT,

            title TEXT
                NOT NULL DEFAULT '',

            description TEXT
                NOT NULL DEFAULT '',

            completed BOOLEAN
                NOT NULL DEFAULT FALSE,

            priority VARCHAR(50)
                NOT NULL DEFAULT 'normal',

            category VARCHAR(100)
                NOT NULL DEFAULT 'Egyéb',

            due_date TIMESTAMP,

            pinned BOOLEAN
                NOT NULL DEFAULT FALSE,

            created_at TIMESTAMP
                DEFAULT CURRENT_TIMESTAMP,

            updated_at TIMESTAMP
                DEFAULT CURRENT_TIMESTAMP
        );
    `);


    // ==================================================
    // RÉGI TASKS TÁBLA MIGRÁCIÓ
    // ==================================================

    await pool.query(`
        ALTER TABLE tasks
        ADD COLUMN IF NOT EXISTS user_id INTEGER;
    `);


    await pool.query(`
        ALTER TABLE tasks
        ADD COLUMN IF NOT EXISTS owner_tag TEXT;
    `);


    await pool.query(`
        ALTER TABLE tasks
        ADD COLUMN IF NOT EXISTS title TEXT
        NOT NULL DEFAULT '';
    `);


    await pool.query(`
        ALTER TABLE tasks
        ADD COLUMN IF NOT EXISTS description TEXT
        NOT NULL DEFAULT '';
    `);


    await pool.query(`
        ALTER TABLE tasks
        ADD COLUMN IF NOT EXISTS completed BOOLEAN
        NOT NULL DEFAULT FALSE;
    `);


    await pool.query(`
        ALTER TABLE tasks
        ADD COLUMN IF NOT EXISTS priority VARCHAR(50)
        NOT NULL DEFAULT 'normal';
    `);


    await pool.query(`
        ALTER TABLE tasks
        ADD COLUMN IF NOT EXISTS category VARCHAR(100)
        NOT NULL DEFAULT 'Egyéb';
    `);


    await pool.query(`
        ALTER TABLE tasks
        ADD COLUMN IF NOT EXISTS due_date TIMESTAMP;
    `);


    await pool.query(`
        ALTER TABLE tasks
        ADD COLUMN IF NOT EXISTS pinned BOOLEAN
        NOT NULL DEFAULT FALSE;
    `);


    await pool.query(`
        ALTER TABLE tasks
        ADD COLUMN IF NOT EXISTS created_at
        TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
    `);


    await pool.query(`
        ALTER TABLE tasks
        ADD COLUMN IF NOT EXISTS updated_at
        TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
    `);


    // ==================================================
    // OWNER TAG KITÖLTÉS
    // ==================================================

    await pool.query(`
        UPDATE tasks
        SET owner_tag =
            'USER-' || user_id::TEXT
        WHERE
            owner_tag IS NULL
            AND user_id IS NOT NULL;
    `);


    // ==================================================
    // TASKS USER ID FOREIGN KEY
    // ==================================================

    await pool.query(`
        DO $$
        BEGIN

            IF NOT EXISTS (
                SELECT 1
                FROM pg_constraint
                WHERE conname =
                    'tasks_user_id_fkey'
            )
            THEN

                ALTER TABLE tasks
                ADD CONSTRAINT
                    tasks_user_id_fkey
                FOREIGN KEY (user_id)
                REFERENCES users(id)
                ON DELETE CASCADE;

            END IF;

        END
        $$;
    `);


    // ==================================================
    // TASKS USER ID INDEX
    // ==================================================

    await pool.query(`
        CREATE INDEX IF NOT EXISTS
        tasks_user_id_idx
        ON tasks(user_id);
    `);


    // ==================================================
    // TASKS USER + UPDATED INDEX
    // ==================================================

    await pool.query(`
        CREATE INDEX IF NOT EXISTS
        tasks_user_updated_idx
        ON tasks(
            user_id,
            updated_at DESC
        );
    `);


    // ==================================================
    // TASKS OWNER TAG INDEX
    // ==================================================

    await pool.query(`
        CREATE INDEX IF NOT EXISTS
        tasks_owner_tag_idx
        ON tasks(owner_tag);
    `);


    console.log(
        "Tasks adatbázis inicializálása kész."
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


// ======================================================
// AUTH TOKEN LÉTREHOZÁSA
// ======================================================

async function createAuthToken(userId) {

    const token =
        crypto
            .randomBytes(48)
            .toString("hex");


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


// ======================================================
// BEARER TOKEN KINYERÉSE
// ======================================================

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
            .substring(7)
            .trim();


    if (!token) {

        return null;

    }


    return token;
}


// ======================================================
// USER KERESÉSE TOKEN ALAPJÁN
// ======================================================

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

            INNER JOIN users u
                ON u.id = t.user_id

            WHERE
                t.token_hash = $1

                AND t.expires_at >
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


// ======================================================
// ÁLTALÁNOS AUTH
// ======================================================

async function getAuthenticatedUser(req) {

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


    // Session fallback

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
                    email

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

            return result.rows[0];

        }

    }


    return null;
}


// ======================================================
// JEGYZET AUTH
// ======================================================
//
// A NOTES modulban nincs session fallback.
//
// Kizárólag:
//
// Bearer token
//      ↓
// auth_tokens
//      ↓
// user_id
//      ↓
// users.id
//
// ======================================================

async function getAuthenticatedNotesUser(req) {

    const bearerToken =
        getBearerToken(req);


    if (!bearerToken) {

        return null;

    }


    const user =
        await getUserFromAuthToken(
            bearerToken
        );


    if (!user) {

        return null;

    }


    return user;
}


// ======================================================
// TASK AUTH
// ======================================================
//
// A TASKS modulban sincs session fallback.
//
// Kizárólag:
//
// Bearer token
//      ↓
// auth_tokens
//      ↓
// user_id
//      ↓
// users.id
//
// ======================================================

async function getAuthenticatedTasksUser(req) {

    const bearerToken =
        getBearerToken(req);


    if (!bearerToken) {

        return null;

    }


    const user =
        await getUserFromAuthToken(
            bearerToken
        );


    if (!user) {

        return null;

    }


    return user;
}


// ======================================================
// OWNER TAG
// ======================================================

function createOwnerTag(userId) {

    return (
        "USER-" +
        String(userId)
    );
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
// REGISTER
// ======================================================

app.post(
    "/api/auth/register",
    async function (req, res) {

        try {

            const username =
                typeof req.body.username ===
                "string"
                    ? req.body.username.trim()
                    : "";


            const email =
                typeof req.body.email ===
                "string"
                    ? req.body.email
                        .trim()
                        .toLowerCase()
                    : "";


            const password =
                typeof req.body.password ===
                "string"
                    ? req.body.password
                    : "";


            console.log(
                "Regisztráció:",
                {
                    username,
                    email
                }
            );


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


            const usernameCheck =
                await pool.query(
                    `
                    SELECT id
                    FROM users
                    WHERE LOWER(username) =
                          LOWER($1)
                    LIMIT 1
                    `,
                    [
                        username
                    ]
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


            const emailCheck =
                await pool.query(
                    `
                    SELECT id
                    FROM users
                    WHERE
                        email IS NOT NULL

                        AND LOWER(email) =
                            LOWER($1)

                    LIMIT 1
                    `,
                    [
                        email
                    ]
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


            const passwordHash =
                await bcrypt.hash(
                    password,
                    12
                );


            const result =
                await pool.query(
                    `
                    INSERT INTO users (
                        username,
                        email,
                        password_hash
                    )

                    VALUES (
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
                        username,
                        email,
                        passwordHash
                    ]
                );


            const user =
                result.rows[0];


            req.session.userId =
                user.id;


            req.session.username =
                user.username;


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


            return res.status(201).json({

                success: true,

                message:
                    "Sikeres regisztráció.",

                token: token,

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
// LOGIN
// ======================================================

app.post(
    "/api/auth/login",
    async function (req, res) {

        try {

            const login =
                typeof req.body.login ===
                "string"
                    ? req.body.login.trim()
                    : "";


            const password =
                typeof req.body.password ===
                "string"
                    ? req.body.password
                    : "";


            console.log(
                "Bejelentkezési kísérlet:",
                login
            );


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


            const result =
                await pool.query(
                    `
                    SELECT
                        id,
                        username,
                        email,
                        password_hash

                    FROM users

                    WHERE
                        LOWER(username) =
                        LOWER($1)

                        OR (

                            email IS NOT NULL

                            AND LOWER(email) =
                                LOWER($1)

                        )

                    LIMIT 1
                    `,
                    [
                        login
                    ]
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


            if (
                !user.password_hash
            ) {

                return res.status(401).json({

                    success: false,

                    message:
                        "Ehhez a fiókhoz nincs érvényes jelszó beállítva."

                });

            }


            const passwordValid =
                await bcrypt.compare(
                    password,
                    user.password_hash
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


            req.session.userId =
                user.id;


            req.session.username =
                user.username;


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


            return res.json({

                success: true,

                message:
                    "Sikeres bejelentkezés.",

                token: token,

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
// AUTH ME
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

                    id:
                        user.id,

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
// LOGOUT
// ======================================================

app.post(
    "/api/auth/logout",
    async function (req, res) {

        try {

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
                    [
                        tokenHash
                    ]
                );

            }


            if (req.session) {

                await new Promise(
                    function (
                        resolve,
                        reject
                    ) {

                        req.session.destroy(
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
// NOTES - GET
// ======================================================
//
// A user kizárólag a Bearer tokenből származik.
//
// token
//   ↓
// auth_tokens.user_id
//   ↓
// users.id
//
// A frontend semmilyen user ID-t nem határoz meg.
//
// ======================================================

app.get(
    "/api/notes",
    async function (req, res) {

        try {

            const user =
                await getAuthenticatedNotesUser(
                    req
                );


            if (!user) {

                return res.status(401).json({

                    success: false,

                    message:
                        "Érvényes bejelentkezés szükséges a jegyzetekhez."

                });

            }


            const ownerTag =
                createOwnerTag(
                    user.id
                );


            const result =
                await pool.query(
                    `
                    SELECT
                        id,
                        user_id,
                        owner_tag,
                        title,

                        content,

                        category,
                        pinned,
                        created_at,
                        updated_at

                    FROM notes

                    WHERE
                        user_id = $1

                        AND owner_tag = $2

                    ORDER BY
                        pinned DESC,
                        updated_at DESC
                    `,
                    [
                        user.id,
                        ownerTag
                    ]
                );


            return res.json({

                success: true,

                user: {

                    id:
                        user.id,

                    username:
                        user.username

                },

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
                await getAuthenticatedNotesUser(
                    req
                );


            if (!user) {

                return res.status(401).json({

                    success: false,

                    message:
                        "Érvényes bejelentkezés szükséges a jegyzethez."

                });

            }


            const ownerUserId =
                user.id;


            const ownerTag =
                createOwnerTag(
                    ownerUserId
                );


            const title =
                typeof req.body.title ===
                "string"
                    ? req.body.title.trim()
                    : "";


            const content =
                typeof req.body.content ===
                "string"
                    ? req.body.content
                    : (
                        typeof req.body.text ===
                        "string"
                            ? req.body.text
                            : ""
                    );


            const category =
                typeof req.body.category ===
                "string"
                    ? req.body.category.trim()
                    : "Egyéb";


            const pinned =
                req.body.pinned === true;


            if (
                !title ||
                !content
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "A cím és a jegyzet szövege kötelező."

                });

            }


            const result =
                await pool.query(
                    `
                    INSERT INTO notes (
                        user_id,
                        owner_tag,
                        title,
                        text,
                        content,
                        category,
                        pinned
                    )

                    VALUES (
                        $1,
                        $2,
                        $3,
                        $4,
                        $5,
                        $6,
                        $7
                    )

                    RETURNING
                        id,
                        user_id,
                        owner_tag,
                        title,
                        content,
                        category,
                        pinned,
                        created_at,
                        updated_at
                    `,
                    [
                        ownerUserId,
                        ownerTag,
                        title,
                        content,
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
                await getAuthenticatedNotesUser(
                    req
                );


            if (!user) {

                return res.status(401).json({

                    success: false,

                    message:
                        "Érvényes bejelentkezés szükséges."

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


            const ownerUserId =
                user.id;


            const ownerTag =
                createOwnerTag(
                    ownerUserId
                );


            const title =
                typeof req.body.title ===
                "string"
                    ? req.body.title.trim()
                    : "";


            const content =
                typeof req.body.content ===
                "string"
                    ? req.body.content
                    : (
                        typeof req.body.text ===
                        "string"
                            ? req.body.text
                            : ""
                    );


            const category =
                typeof req.body.category ===
                "string"
                    ? req.body.category.trim()
                    : "Egyéb";


            const pinned =
                req.body.pinned === true;


            if (
                !title ||
                !content
            ) {

                return res.status(400).json({

                    success: false,

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
                        content = $3,
                        category = $4,
                        pinned = $5,
                        updated_at =
                            CURRENT_TIMESTAMP

                    WHERE
                        id = $6
                        AND user_id = $7
                        AND owner_tag = $8

                    RETURNING
                        id,
                        user_id,
                        owner_tag,
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
                        content,
                        category || "Egyéb",
                        pinned,
                        noteId,
                        ownerUserId,
                        ownerTag
                    ]
                );


            if (
                result.rows.length === 0
            ) {

                return res.status(404).json({

                    success: false,

                    message:
                        "A jegyzet nem található, vagy nem a te jegyzeted."

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
                await getAuthenticatedNotesUser(
                    req
                );


            if (!user) {

                return res.status(401).json({

                    success: false,

                    message:
                        "Érvényes bejelentkezés szükséges."

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


            const ownerUserId =
                user.id;


            const ownerTag =
                createOwnerTag(
                    ownerUserId
                );


            const result =
                await pool.query(
                    `
                    DELETE FROM notes

                    WHERE
                        id = $1
                        AND user_id = $2
                        AND owner_tag = $3

                    RETURNING id
                    `,
                    [
                        noteId,
                        ownerUserId,
                        ownerTag
                    ]
                );


            if (
                result.rows.length === 0
            ) {

                return res.status(404).json({

                    success: false,

                    message:
                        "A jegyzet nem található, vagy nem a te jegyzeted."

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
// TASKS - GET
// ======================================================
//
// A user kizárólag a Bearer tokenből származik.
//
// token
//   ↓
// auth_tokens.user_id
//   ↓
// users.id
//   ↓
// tasks.user_id
//
// Másik user feladatai nem kerülnek vissza.
//
// ======================================================

app.get(
    "/api/tasks",
    async function (req, res) {

        try {

            const user =
                await getAuthenticatedTasksUser(
                    req
                );


            if (!user) {

                return res.status(401).json({

                    success: false,

                    message:
                        "Érvényes bejelentkezés szükséges a feladatokhoz."

                });

            }


            const ownerTag =
                createOwnerTag(
                    user.id
                );


            const result =
                await pool.query(
                    `
                    SELECT
                        id,
                        user_id,
                        owner_tag,
                        title,
                        description,
                        completed,
                        priority,
                        category,
                        due_date,
                        pinned,
                        created_at,
                        updated_at

                    FROM tasks

                    WHERE
                        user_id = $1

                        AND owner_tag = $2

                    ORDER BY
                        completed ASC,
                        pinned DESC,
                        updated_at DESC
                    `,
                    [
                        user.id,
                        ownerTag
                    ]
                );


            return res.json({

                success: true,

                user: {

                    id:
                        user.id,

                    username:
                        user.username

                },

                tasks:
                    result.rows

            });

        }
        catch (error) {

            console.error(
                "TASKS GET HIBA:",
                error
            );


            return res.status(500).json({

                success: false,

                message:
                    "Nem sikerült betölteni a feladatokat."

            });

        }

    }
);


// ======================================================
// TASKS - CREATE
// ======================================================
//
// A kliens által küldött:
//
// user_id
// userId
// owner_tag
// ownerTag
//
// NEM számít.
//
// A tulajdonos kizárólag:
//
// token -> users.id
//
// ======================================================

app.post(
    "/api/tasks",
    async function (req, res) {

        try {

            const user =
                await getAuthenticatedTasksUser(
                    req
                );


            if (!user) {

                return res.status(401).json({

                    success: false,

                    message:
                        "Érvényes bejelentkezés szükséges a feladathoz."

                });

            }


            // ==================================================
            // BACKEND ÁLTAL MEGHATÁROZOTT TULAJDONOS
            // ==================================================

            const ownerUserId =
                user.id;


            const ownerTag =
                createOwnerTag(
                    ownerUserId
                );


            // ==================================================
            // USER INPUT
            // ==================================================

            const title =
                typeof req.body.title ===
                "string"
                    ? req.body.title.trim()
                    : "";


            const description =
                typeof req.body.description ===
                "string"
                    ? req.body.description
                    : "";


            const completed =
                req.body.completed === true;


            const priority =
                typeof req.body.priority ===
                "string"
                    ? req.body.priority.trim()
                    : "normal";


            const category =
                typeof req.body.category ===
                "string"
                    ? req.body.category.trim()
                    : "Egyéb";


            const pinned =
                req.body.pinned === true;


            let dueDate = null;


            if (
                req.body.due_date !== null &&
                req.body.due_date !== undefined &&
                req.body.due_date !== ""
            ) {

                const parsedDate =
                    new Date(
                        req.body.due_date
                    );


                if (
                    Number.isNaN(
                        parsedDate.getTime()
                    )
                ) {

                    return res.status(400).json({

                        success: false,

                        message:
                            "Érvénytelen határidő."

                    });

                }


                dueDate =
                    parsedDate;

            }


            // ==================================================
            // VALIDATION
            // ==================================================

            if (!title) {

                return res.status(400).json({

                    success: false,

                    message:
                        "A feladat címe kötelező."

                });

            }


            // ==================================================
            // CREATE
            // ==================================================

            const result =
                await pool.query(
                    `
                    INSERT INTO tasks (
                        user_id,
                        owner_tag,
                        title,
                        description,
                        completed,
                        priority,
                        category,
                        due_date,
                        pinned
                    )

                    VALUES (
                        $1,
                        $2,
                        $3,
                        $4,
                        $5,
                        $6,
                        $7,
                        $8,
                        $9
                    )

                    RETURNING
                        id,
                        user_id,
                        owner_tag,
                        title,
                        description,
                        completed,
                        priority,
                        category,
                        due_date,
                        pinned,
                        created_at,
                        updated_at
                    `,
                    [
                        ownerUserId,
                        ownerTag,
                        title,
                        description,
                        completed,
                        priority || "normal",
                        category || "Egyéb",
                        dueDate,
                        pinned
                    ]
                );


            return res.status(201).json({

                success: true,

                task:
                    result.rows[0]

            });

        }
        catch (error) {

            console.error(
                "TASK CREATE HIBA:",
                error
            );


            return res.status(500).json({

                success: false,

                message:
                    "Nem sikerült létrehozni a feladatot."

            });

        }

    }
);


// ======================================================
// TASKS - UPDATE
// ======================================================
//
// Ellenőrzés:
//
// ID
// +
// user_id
// +
// owner_tag
//
// ======================================================

app.put(
    "/api/tasks/:id",
    async function (req, res) {

        try {

            const user =
                await getAuthenticatedTasksUser(
                    req
                );


            if (!user) {

                return res.status(401).json({

                    success: false,

                    message:
                        "Érvényes bejelentkezés szükséges."

                });

            }


            const taskId =
                Number(
                    req.params.id
                );


            if (
                !Number.isInteger(taskId)
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Érvénytelen feladat azonosító."

                });

            }


            const ownerUserId =
                user.id;


            const ownerTag =
                createOwnerTag(
                    ownerUserId
                );


            // ==================================================
            // USER INPUT
            // ==================================================

            const title =
                typeof req.body.title ===
                "string"
                    ? req.body.title.trim()
                    : "";


            const description =
                typeof req.body.description ===
                "string"
                    ? req.body.description
                    : "";


            const completed =
                req.body.completed === true;


            const priority =
                typeof req.body.priority ===
                "string"
                    ? req.body.priority.trim()
                    : "normal";


            const category =
                typeof req.body.category ===
                "string"
                    ? req.body.category.trim()
                    : "Egyéb";


            const pinned =
                req.body.pinned === true;


            let dueDate = null;


            if (
                req.body.due_date !== null &&
                req.body.due_date !== undefined &&
                req.body.due_date !== ""
            ) {

                const parsedDate =
                    new Date(
                        req.body.due_date
                    );


                if (
                    Number.isNaN(
                        parsedDate.getTime()
                    )
                ) {

                    return res.status(400).json({

                        success: false,

                        message:
                            "Érvénytelen határidő."

                    });

                }


                dueDate =
                    parsedDate;

            }


            // ==================================================
            // VALIDATION
            // ==================================================

            if (!title) {

                return res.status(400).json({

                    success: false,

                    message:
                        "A feladat címe kötelező."

                });

            }


            // ==================================================
            // UPDATE
            // ==================================================

            const result =
                await pool.query(
                    `
                    UPDATE tasks

                    SET
                        title = $1,

                        description = $2,

                        completed = $3,

                        priority = $4,

                        category = $5,

                        due_date = $6,

                        pinned = $7,

                        updated_at =
                            CURRENT_TIMESTAMP

                    WHERE
                        id = $8

                        AND user_id = $9

                        AND owner_tag = $10

                    RETURNING
                        id,
                        user_id,
                        owner_tag,
                        title,
                        description,
                        completed,
                        priority,
                        category,
                        due_date,
                        pinned,
                        created_at,
                        updated_at
                    `,
                    [
                        title,
                        description,
                        completed,
                        priority || "normal",
                        category || "Egyéb",
                        dueDate,
                        pinned,
                        taskId,
                        ownerUserId,
                        ownerTag
                    ]
                );


            if (
                result.rows.length === 0
            ) {

                return res.status(404).json({

                    success: false,

                    message:
                        "A feladat nem található, vagy nem a te feladatod."

                });

            }


            return res.json({

                success: true,

                task:
                    result.rows[0]

            });

        }
        catch (error) {

            console.error(
                "TASK UPDATE HIBA:",
                error
            );


            return res.status(500).json({

                success: false,

                message:
                    "Nem sikerült módosítani a feladatot."

            });

        }

    }
);


// ======================================================
// TASKS - DELETE
// ======================================================

app.delete(
    "/api/tasks/:id",
    async function (req, res) {

        try {

            const user =
                await getAuthenticatedTasksUser(
                    req
                );


            if (!user) {

                return res.status(401).json({

                    success: false,

                    message:
                        "Érvényes bejelentkezés szükséges."

                });

            }


            const taskId =
                Number(
                    req.params.id
                );


            if (
                !Number.isInteger(taskId)
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Érvénytelen feladat azonosító."

                });

            }


            const ownerUserId =
                user.id;


            const ownerTag =
                createOwnerTag(
                    ownerUserId
                );


            const result =
                await pool.query(
                    `
                    DELETE FROM tasks

                    WHERE
                        id = $1

                        AND user_id = $2

                        AND owner_tag = $3

                    RETURNING id
                    `,
                    [
                        taskId,
                        ownerUserId,
                        ownerTag
                    ]
                );


            if (
                result.rows.length === 0
            ) {

                return res.status(404).json({

                    success: false,

                    message:
                        "A feladat nem található, vagy nem a te feladatod."

                });

            }


            return res.json({

                success: true,

                message:
                    "Feladat törölve."

            });

        }
        catch (error) {

            console.error(
                "TASK DELETE HIBA:",
                error
            );


            return res.status(500).json({

                success: false,

                message:
                    "Nem sikerült törölni a feladatot."

            });

        }

    }
);


// ======================================================
// STEAM GAMES
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
// GLOBAL ERROR HANDLER
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

        // ==================================================
        // ALAP ADATBÁZIS
        // ==================================================

        await initializeDatabase();


        // ==================================================
        // TASKS ADATBÁZIS
        // ==================================================

        await initializeTasksDatabase();


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
