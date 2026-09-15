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

const BACKEND_URL =
    "https://project-hub-backend-1.onrender.com";

const STEAM_API_KEY =
    process.env.STEAM_API_KEY;


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

            username VARCHAR(100)
                UNIQUE NOT NULL,

            email VARCHAR(255),

            password_hash TEXT NOT NULL,

            created_at
                TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

            updated_at
                TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    `);


    await pool.query(`
        ALTER TABLE users
        ADD COLUMN IF NOT EXISTS
        email VARCHAR(255);
    `);


    await pool.query(`
        ALTER TABLE users
        ADD COLUMN IF NOT EXISTS
        password_hash TEXT;
    `);


    await pool.query(`
        ALTER TABLE users
        ADD COLUMN IF NOT EXISTS
        created_at
        TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
    `);


    await pool.query(`
        ALTER TABLE users
        ADD COLUMN IF NOT EXISTS
        updated_at
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


    await pool.query(`
        DELETE FROM auth_tokens
        WHERE expires_at < CURRENT_TIMESTAMP;
    `);


    // ==================================================
    // NOTES
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
        ADD COLUMN IF NOT EXISTS
        user_id INTEGER;
    `);


    await pool.query(`
        ALTER TABLE notes
        ADD COLUMN IF NOT EXISTS
        owner_tag TEXT;
    `);


    await pool.query(`
        ALTER TABLE notes
        ADD COLUMN IF NOT EXISTS
        title TEXT
        NOT NULL DEFAULT '';
    `);


    await pool.query(`
        ALTER TABLE notes
        ADD COLUMN IF NOT EXISTS
        text TEXT
        NOT NULL DEFAULT '';
    `);


    await pool.query(`
        ALTER TABLE notes
        ADD COLUMN IF NOT EXISTS
        content TEXT
        NOT NULL DEFAULT '';
    `);


    await pool.query(`
        ALTER TABLE notes
        ADD COLUMN IF NOT EXISTS
        category VARCHAR(100)
        NOT NULL DEFAULT 'Egyéb';
    `);


    await pool.query(`
        ALTER TABLE notes
        ADD COLUMN IF NOT EXISTS
        pinned BOOLEAN
        NOT NULL DEFAULT FALSE;
    `);


    await pool.query(`
        ALTER TABLE notes
        ADD COLUMN IF NOT EXISTS
        created_at
        TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
    `);


    await pool.query(`
        ALTER TABLE notes
        ADD COLUMN IF NOT EXISTS
        updated_at
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
    // NOTES INDEXEK
    // ==================================================

    await pool.query(`
        CREATE INDEX IF NOT EXISTS
        notes_user_id_idx
        ON notes(user_id);
    `);


    await pool.query(`
        CREATE INDEX IF NOT EXISTS
        notes_user_updated_idx
        ON notes(
            user_id,
            updated_at DESC
        );
    `);


    await pool.query(`
        CREATE INDEX IF NOT EXISTS
        notes_owner_tag_idx
        ON notes(owner_tag);
    `);


    // ==================================================
    // STEAM ACCOUNTS
    // ==================================================

    await pool.query(`
        CREATE TABLE IF NOT EXISTS steam_accounts (
            id SERIAL PRIMARY KEY,

            user_id INTEGER NOT NULL UNIQUE
                REFERENCES users(id)
                ON DELETE CASCADE,

            steam_id VARCHAR(32) NOT NULL UNIQUE,

            steam_name TEXT,

            avatar TEXT,

            profile_url TEXT,

            created_at TIMESTAMP
                DEFAULT CURRENT_TIMESTAMP,

            updated_at TIMESTAMP
                DEFAULT CURRENT_TIMESTAMP
        );
    `);


    await pool.query(`
        CREATE INDEX IF NOT EXISTS
        steam_accounts_user_id_idx
        ON steam_accounts(user_id);
    `);


    await pool.query(`
        CREATE INDEX IF NOT EXISTS
        steam_accounts_steam_id_idx
        ON steam_accounts(steam_id);
    `);


    // ==================================================
    // STEAM LINK STATES
    // ==================================================

    await pool.query(`
        CREATE TABLE IF NOT EXISTS steam_link_states (
            id SERIAL PRIMARY KEY,

            user_id INTEGER NOT NULL
                REFERENCES users(id)
                ON DELETE CASCADE,

            state_hash TEXT UNIQUE NOT NULL,

            expires_at TIMESTAMP NOT NULL,

            created_at TIMESTAMP
                DEFAULT CURRENT_TIMESTAMP
        );
    `);


    await pool.query(`
        CREATE INDEX IF NOT EXISTS
        steam_link_states_user_id_idx
        ON steam_link_states(user_id);
    `);


    await pool.query(`
        CREATE INDEX IF NOT EXISTS
        steam_link_states_expires_at_idx
        ON steam_link_states(expires_at);
    `);


    await pool.query(`
        DELETE FROM steam_link_states
        WHERE expires_at < CURRENT_TIMESTAMP;
    `);


    console.log(
        "Adatbázis inicializálása kész."
    );
}


// ======================================================
// TASKS DATABASE INITIALIZATION
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
        ADD COLUMN IF NOT EXISTS
        user_id INTEGER;
    `);


    await pool.query(`
        ALTER TABLE tasks
        ADD COLUMN IF NOT EXISTS
        owner_tag TEXT;
    `);


    await pool.query(`
        ALTER TABLE tasks
        ADD COLUMN IF NOT EXISTS
        title TEXT
        NOT NULL DEFAULT '';
    `);


    await pool.query(`
        ALTER TABLE tasks
        ADD COLUMN IF NOT EXISTS
        description TEXT
        NOT NULL DEFAULT '';
    `);


    await pool.query(`
        ALTER TABLE tasks
        ADD COLUMN IF NOT EXISTS
        completed BOOLEAN
        NOT NULL DEFAULT FALSE;
    `);


    await pool.query(`
        ALTER TABLE tasks
        ADD COLUMN IF NOT EXISTS
        priority VARCHAR(50)
        NOT NULL DEFAULT 'normal';
    `);


    await pool.query(`
        ALTER TABLE tasks
        ADD COLUMN IF NOT EXISTS
        category VARCHAR(100)
        NOT NULL DEFAULT 'Egyéb';
    `);


    await pool.query(`
        ALTER TABLE tasks
        ADD COLUMN IF NOT EXISTS
        due_date TIMESTAMP;
    `);


    await pool.query(`
        ALTER TABLE tasks
        ADD COLUMN IF NOT EXISTS
        pinned BOOLEAN
        NOT NULL DEFAULT FALSE;
    `);


    await pool.query(`
        ALTER TABLE tasks
        ADD COLUMN IF NOT EXISTS
        created_at
        TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
    `);


    await pool.query(`
        ALTER TABLE tasks
        ADD COLUMN IF NOT EXISTS
        updated_at
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
    // TASKS INDEXEK
    // ==================================================

    await pool.query(`
        CREATE INDEX IF NOT EXISTS
        tasks_user_id_idx
        ON tasks(user_id);
    `);


    await pool.query(`
        CREATE INDEX IF NOT EXISTS
        tasks_user_updated_idx
        ON tasks(
            user_id,
            updated_at DESC
        );
    `);


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
// STEAM AUTH
// ======================================================

async function getAuthenticatedSteamUser(req) {

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
// STEAM ACCOUNT
// ======================================================

async function getLinkedSteamAccount(userId) {

    const result =
        await pool.query(
            `
            SELECT
                id,
                user_id,
                steam_id,
                steam_name,
                avatar,
                profile_url,
                created_at,
                updated_at

            FROM steam_accounts

            WHERE user_id = $1

            LIMIT 1
            `,
            [
                userId
            ]
        );


    return result.rows[0] || null;
}


// ======================================================
// STEAM LINK STATE
// ======================================================

function createSteamLinkState() {

    return crypto
        .randomBytes(32)
        .toString("hex");
}


function hashSteamLinkState(state) {

    return crypto
        .createHash("sha256")
        .update(state)
        .digest("hex");
}


// ======================================================
// STEAM PLAYER SUMMARY
// ======================================================

async function getSteamPlayerSummary(steamId) {

    if (!STEAM_API_KEY) {

        return null;

    }


    const url =
        "https://api.steampowered.com/" +
        "ISteamUser/GetPlayerSummaries/v0002/" +
        "?key=" +
        encodeURIComponent(
            STEAM_API_KEY
        ) +
        "&steamids=" +
        encodeURIComponent(
            steamId
        ) +
        "&format=json";


    const response =
        await fetch(url);


    if (!response.ok) {

        return null;

    }


    const data =
        await response.json();


    return (
        data?.response?.players?.[0] ||
        null
    );
}


// ======================================================
// STEAM API GET
// ======================================================

async function steamApiGet(
    interfaceName,
    methodName,
    version,
    params
) {

    if (!STEAM_API_KEY) {

        throw new Error(
            "A STEAM_API_KEY nincs beállítva."
        );

    }


    const query =
        new URLSearchParams();


    query.set(
        "key",
        STEAM_API_KEY
    );


    for (
        const [key, value]
        of Object.entries(
            params || {}
        )
    ) {

        if (
            value !== undefined &&
            value !== null
        ) {

            query.set(
                key,
                String(value)
            );

        }

    }


    query.set(
        "format",
        "json"
    );


    const url =
        "https://api.steampowered.com/" +
        encodeURIComponent(
            interfaceName
        ) +
        "/" +
        encodeURIComponent(
            methodName
        ) +
        "/" +
        encodeURIComponent(
            version
        ) +
        "/?" +
        query.toString();


    const response =
        await fetch(url);


    if (!response.ok) {

        throw new Error(
            "Steam API HTTP hiba: " +
            response.status
        );

    }


    return await response.json();
}


// ======================================================
// STEAM KÉPEK
// ======================================================

function getSteamImageUrls(appId) {

    const id =
        String(appId);


    return {

        icon:
            "https://media.steampowered.com/steamcommunity/public/images/apps/" +
            id +
            "/icon.jpg",

        logo:
            "https://media.steampowered.com/steamcommunity/public/images/apps/" +
            id +
            "/logo.jpg",

        capsule:
            "https://cdn.cloudflare.steamstatic.com/steam/apps/" +
            id +
            "/header.jpg",

        background:
            "https://cdn.cloudflare.steamstatic.com/steam/apps/" +
            id +
            "/page_bg_generated_v6b.jpg"

    };
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


            if (!title) {

                return res.status(400).json({

                    success: false,

                    message:
                        "A feladat címe kötelező."

                });

            }


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


            const existingResult =
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
                        id = $1
                        AND user_id = $2
                        AND owner_tag = $3

                    LIMIT 1
                    `,
                    [
                        taskId,
                        ownerUserId,
                        ownerTag
                    ]
                );


            if (
                existingResult.rows.length === 0
            ) {

                return res.status(404).json({

                    success: false,

                    message:
                        "A feladat nem található, vagy nem a te feladatod."

                });

            }


            // EZ VOLT A HIBÁS RÉSZ
            const existingTask =
                existingResult.rows[0];


            const title =
                req.body.title !== undefined
                    ? (
                        typeof req.body.title ===
                        "string"
                            ? req.body.title.trim()
                            : existingTask.title
                    )
                    : existingTask.title;


            const description =
                req.body.description !== undefined
                    ? (
                        typeof req.body.description ===
                        "string"
                            ? req.body.description
                            : existingTask.description
                    )
                    : existingTask.description;


            const completed =
                req.body.completed !== undefined
                    ? req.body.completed === true
                    : existingTask.completed;


            const priority =
                req.body.priority !== undefined
                    ? (
                        typeof req.body.priority ===
                        "string"
                            ? req.body.priority.trim()
                            : existingTask.priority
                    )
                    : existingTask.priority;


            const category =
                req.body.category !== undefined
                    ? (
                        typeof req.body.category ===
                        "string"
                            ? req.body.category.trim()
                            : existingTask.category
                    )
                    : existingTask.category;


            const pinned =
                req.body.pinned !== undefined
                    ? req.body.pinned === true
                    : existingTask.pinned;


            let dueDate =
                existingTask.due_date;


            if (
                req.body.due_date !== undefined
            ) {

                if (
                    req.body.due_date === null ||
                    req.body.due_date === ""
                ) {

                    dueDate = null;

                }
                else {

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

            }


            if (!title) {

                return res.status(400).json({

                    success: false,

                    message:
                        "A feladat címe kötelező."

                });

            }


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
// STEAM SEGÉDFÜGGVÉNYEK
// ======================================================


// ------------------------------------------------------
// Steam account lekérése az aktuális Project Hub userhez
// ------------------------------------------------------

async function getSteamAccountForUser(userId) {

    const result =
        await pool.query(
            `
            SELECT
                id,
                user_id,
                steam_id,
                steam_name,
                avatar,
                profile_url,
                created_at,
                updated_at

            FROM steam_accounts

            WHERE user_id = $1

            LIMIT 1
            `,
            [
                userId
            ]
        );


    if (
        result.rows.length === 0
    ) {

        return null;

    }


    return result.rows[0];
}


// ------------------------------------------------------
// Steam API GET
// ------------------------------------------------------

async function steamApiGet(
    interfaceName,
    methodName,
    version,
    params
) {

    if (!STEAM_API_KEY) {

        throw new Error(
            "A STEAM_API_KEY nincs beállítva."
        );

    }


    const query =
        new URLSearchParams();


    query.set(
        "key",
        STEAM_API_KEY
    );


    for (
        const [key, value]
        of Object.entries(
            params || {}
        )
    ) {

        if (
            value !== undefined &&
            value !== null
        ) {

            query.set(
                key,
                String(value)
            );

        }

    }


    query.set(
        "format",
        "json"
    );


    const url =
        "https://api.steampowered.com/" +
        encodeURIComponent(interfaceName) +
        "/" +
        encodeURIComponent(methodName) +
        "/" +
        encodeURIComponent(version) +
        "/?" +
        query.toString();


    const response =
        await fetch(url);


    if (!response.ok) {

        throw new Error(
            "Steam API HTTP hiba: " +
            response.status
        );

    }


    return await response.json();
}


// ------------------------------------------------------
// Steam játék kép URL-ek
// ------------------------------------------------------

function getSteamImageUrls(appId) {

    const id =
        String(appId);


    return {

        icon:
            "https://media.steampowered.com/steamcommunity/public/images/apps/" +
            id +
            "/" +
            "icon.jpg",

        logo:
            "https://media.steampowered.com/steamcommunity/public/images/apps/" +
            id +
            "/" +
            "logo.jpg",

        capsule:
            "https://cdn.cloudflare.steamstatic.com/steam/apps/" +
            id +
            "/header.jpg",

        background:
            "https://cdn.cloudflare.steamstatic.com/steam/apps/" +
            id +
            "/page_bg_generated_v6b.jpg"

    };

}

// ======================================================
// STEAM LINK - INDÍTÁS
// ======================================================

app.get(
    "/api/steam/link",
    async function (req, res) {

        try {

            const user =
                await getAuthenticatedSteamUser(
                    req
                );


            if (!user) {

                return res.status(401).json({

                    success: false,

                    message:
                        "Érvényes bejelentkezés szükséges."

                });

            }


            if (!STEAM_API_KEY) {

                return res.status(500).json({

                    success: false,

                    message:
                        "A STEAM_API_KEY nincs beállítva."

                });

            }


            // --------------------------------------------------
            // Biztonsági state létrehozása
            // --------------------------------------------------

            const state =
                createSteamLinkState();


            const stateHash =
                hashSteamLinkState(
                    state
                );


            const expiresAt =
                new Date(
                    Date.now() +
                    1000 *
                    60 *
                    10
                );


            // --------------------------------------------------
            // Korábbi state törlése
            // --------------------------------------------------

            await pool.query(
                `
                DELETE FROM steam_link_states

                WHERE user_id = $1
                `,
                [
                    user.id
                ]
            );


            // --------------------------------------------------
            // Új state mentése
            // --------------------------------------------------

            await pool.query(
                `
                INSERT INTO steam_link_states (
                    user_id,
                    state_hash,
                    expires_at
                )

                VALUES (
                    $1,
                    $2,
                    $3
                )
                `,
                [
                    user.id,
                    stateHash,
                    expiresAt
                ]
            );


            // --------------------------------------------------
            // Steam OpenID callback URL
            // --------------------------------------------------

            const returnTo =
                BACKEND_URL +
                "/api/steam/callback";


            // --------------------------------------------------
            // Steam OpenID URL
            // --------------------------------------------------

            const steamOpenIdUrl =
                "https://steamcommunity.com/openid/login?" +
                new URLSearchParams({

                    "openid.ns":
                        "http://specs.openid.net/auth/2.0",

                    "openid.mode":
                        "checkid_setup",

                    "openid.return_to":
                        returnTo +
                        "?state=" +
                        encodeURIComponent(
                            state
                        ),

                    "openid.realm":
                        BACKEND_URL + "/",

                    "openid.identity":
                        "http://specs.openid.net/auth/2.0/identifier_select",

                    "openid.claimed_id":
                        "http://specs.openid.net/auth/2.0/identifier_select"

                }).toString();


            // --------------------------------------------------
            // URL visszaadása a frontendnek
            // --------------------------------------------------

            return res.json({

                success: true,

                url:
                    steamOpenIdUrl

            });

        }
        catch (error) {

            console.error(
                "STEAM LINK INDÍTÁSI HIBA:",
                error
            );


            return res.status(500).json({

                success: false,

                message:
                    "Nem sikerült elindítani a Steam összekapcsolását."

            });

        }

    }
);


// ======================================================
// STEAM LINK - CALLBACK
// ======================================================
//
// Steam OpenID után ide érkezünk vissza.
// A state alapján azonosítjuk a Project Hub usert.
// ======================================================

app.get(
    "/api/steam/callback",
    async function (req, res) {

        try {

            // --------------------------------------------------
            // 1. State kiolvasása
            // --------------------------------------------------

            const state =
                typeof req.query.state === "string"
                    ? req.query.state
                    : "";


            if (!state) {

                return res.redirect(
                    FRONTEND_URL +
                    "/?steam_link=error&reason=missing_state"
                );

            }


            // --------------------------------------------------
            // 2. State hash
            // --------------------------------------------------

            const stateHash =
                hashSteamLinkState(
                    state
                );


            // --------------------------------------------------
            // 3. State megkeresése
            // --------------------------------------------------

            const stateResult =
                await pool.query(
                    `
                    SELECT
                        id,
                        user_id,
                        state_hash,
                        expires_at

                    FROM steam_link_states

                    WHERE
                        state_hash = $1

                        AND expires_at >
                            CURRENT_TIMESTAMP

                    LIMIT 1
                    `,
                    [
                        stateHash
                    ]
                );


            if (
                stateResult.rows.length === 0
            ) {

                return res.redirect(
                    FRONTEND_URL +
                    "/?steam_link=error&reason=invalid_state"
                );

            }


            const linkState =
                stateResult.rows[0];


            const userId =
                linkState.user_id;


            // --------------------------------------------------
            // 4. Steam OpenID mód ellenőrzése
            // --------------------------------------------------

            if (
                req.query["openid.mode"] !==
                "id_res"
            ) {

                await pool.query(
                    `
                    DELETE FROM steam_link_states

                    WHERE id = $1
                    `,
                    [
                        linkState.id
                    ]
                );


                return res.redirect(
                    FRONTEND_URL +
                    "/?steam_link=error&reason=openid_failed"
                );

            }


            // --------------------------------------------------
            // 5. Steam claimed ID
            // --------------------------------------------------

            const claimedId =
                typeof req.query[
                    "openid.claimed_id"
                ] === "string"
                    ? req.query[
                        "openid.claimed_id"
                    ]
                    : "";


            if (!claimedId) {

                await pool.query(
                    `
                    DELETE FROM steam_link_states

                    WHERE id = $1
                    `,
                    [
                        linkState.id
                    ]
                );


                return res.redirect(
                    FRONTEND_URL +
                    "/?steam_link=error&reason=missing_steam_id"
                );

            }


            // --------------------------------------------------
            // 6. Steam OpenID válasz összegyűjtése
            // --------------------------------------------------

            const verifyParams =
                new URLSearchParams();


            for (
                const [key, value]
                of Object.entries(
                    req.query
                )
            ) {

                if (
                    key.startsWith(
                        "openid."
                    )
                ) {

                    const cleanValue =
                        Array.isArray(value)
                            ? value[0]
                            : value;


                    if (
                        cleanValue !==
                        undefined &&
                        cleanValue !==
                        null
                    ) {

                        verifyParams.set(
                            key,
                            String(
                                cleanValue
                            )
                        );

                    }

                }

            }


            // Steam szervernek ezt kell küldenünk
            verifyParams.set(
                "openid.mode",
                "check_authentication"
            );


            // --------------------------------------------------
            // 7. Steam OpenID ellenőrzése
            // --------------------------------------------------

            const verifyResponse =
                await fetch(
                    "https://steamcommunity.com/openid/login",
                    {
                        method: "POST",

                        headers: {

                            "Content-Type":
                                "application/x-www-form-urlencoded"

                        },

                        body:
                            verifyParams.toString()

                    }
                );


            if (
                !verifyResponse.ok
            ) {

                await pool.query(
                    `
                    DELETE FROM steam_link_states

                    WHERE id = $1
                    `,
                    [
                        linkState.id
                    ]
                );


                return res.redirect(
                    FRONTEND_URL +
                    "/?steam_link=error&reason=steam_verify_failed"
                );

            }


            const verifyText =
                await verifyResponse.text();


            if (
                !/is_valid\s*:\s*true/i.test(
                    verifyText
                )
            ) {

                await pool.query(
                    `
                    DELETE FROM steam_link_states

                    WHERE id = $1
                    `,
                    [
                        linkState.id
                    ]
                );


                return res.redirect(
                    FRONTEND_URL +
                    "/?steam_link=error&reason=invalid_steam_login"
                );

            }


            // --------------------------------------------------
            // 8. SteamID64 kinyerése
            // --------------------------------------------------

            const steamIdMatch =
                claimedId.match(
                    /^https:\/\/steamcommunity\.com\/openid\/id\/(\d+)$/
                );


            if (
                !steamIdMatch
            ) {

                await pool.query(
                    `
                    DELETE FROM steam_link_states

                    WHERE id = $1
                    `,
                    [
                        linkState.id
                    ]
                );


                return res.redirect(
                    FRONTEND_URL +
                    "/?steam_link=error&reason=invalid_steam_id"
                );

            }


            const steamId =
                steamIdMatch[1];


            // --------------------------------------------------
            // 9. Ellenőrizzük, hogy nincs-e más userhez kötve
            // --------------------------------------------------

            const existingSteamAccount =
                await pool.query(
                    `
                    SELECT
                        user_id

                    FROM steam_accounts

                    WHERE
                        steam_id = $1

                        AND user_id <> $2

                    LIMIT 1
                    `,
                    [
                        steamId,
                        userId
                    ]
                );


            if (
                existingSteamAccount.rows.length >
                0
            ) {

                await pool.query(
                    `
                    DELETE FROM steam_link_states

                    WHERE id = $1
                    `,
                    [
                        linkState.id
                    ]
                );


                return res.redirect(
                    FRONTEND_URL +
                    "/?steam_link=error&reason=steam_already_linked"
                );

            }


            // --------------------------------------------------
            // 10. Steam profil lekérése
            // --------------------------------------------------

            let steamProfile =
                null;


            try {

                steamProfile =
                    await getSteamPlayerSummary(
                        steamId
                    );

            }
            catch (
                profileError
            ) {

                console.error(
                    "STEAM PROFIL LEKÉRÉSI HIBA:",
                    profileError
                );

            }


            // --------------------------------------------------
            // 11. Steam profil adatok
            // --------------------------------------------------

            const steamName =
                steamProfile?.personaname ||
                null;


            const avatar =
                steamProfile?.avatarfull ||
                steamProfile?.avatarmedium ||
                steamProfile?.avatar ||
                null;


            const profileUrl =
                steamProfile?.profileurl ||
                (
                    "https://steamcommunity.com/profiles/" +
                    steamId
                );


            // --------------------------------------------------
            // 12. Steam account mentése
            // --------------------------------------------------

            await pool.query(
                `
                INSERT INTO steam_accounts (
                    user_id,
                    steam_id,
                    steam_name,
                    avatar,
                    profile_url,
                    created_at,
                    updated_at
                )

                VALUES (
                    $1,
                    $2,
                    $3,
                    $4,
                    $5,
                    CURRENT_TIMESTAMP,
                    CURRENT_TIMESTAMP
                )

                ON CONFLICT (user_id)

                DO UPDATE SET

                    steam_id =
                        EXCLUDED.steam_id,

                    steam_name =
                        EXCLUDED.steam_name,

                    avatar =
                        EXCLUDED.avatar,

                    profile_url =
                        EXCLUDED.profile_url,

                    updated_at =
                        CURRENT_TIMESTAMP
                `,
                [
                    userId,
                    steamId,
                    steamName,
                    avatar,
                    profileUrl
                ]
            );


            // --------------------------------------------------
            // 13. State törlése
            // --------------------------------------------------

            await pool.query(
                `
                DELETE FROM steam_link_states

                WHERE id = $1
                `,
                [
                    linkState.id
                ]
            );


            // --------------------------------------------------
            // 14. Vissza a Project Hub frontendhez
            // --------------------------------------------------

            return res.redirect(
                FRONTEND_URL +
                "/?steam_link=success"
            );

        }
        catch (error) {

            console.error(
                "STEAM CALLBACK HIBA:",
                error
            );


            return res.redirect(
                FRONTEND_URL +
                "/?steam_link=error&reason=server_error"
            );

        }

    }
);


// ======================================================
// STEAM ACCOUNT - INFO
// ======================================================

app.get(
    "/api/steam/account",
    async function (req, res) {

        try {

            const user =
                await getAuthenticatedSteamUser(
                    req
                );


            if (!user) {

                return res.status(401).json({

                    success: false,

                    message:
                        "Érvényes bejelentkezés szükséges."

                });

            }


            const account =
                await getSteamAccountForUser(
                    user.id
                );


            if (!account) {

                return res.json({

                    success: true,

                    connected: false,

                    account: null

                });

            }


            return res.json({

                success: true,

                connected: true,

                account: account

            });

        }
        catch (error) {

            console.error(
                "STEAM ACCOUNT HIBA:",
                error
            );


            return res.status(500).json({

                success: false,

                message:
                    "Nem sikerült lekérni a Steam kapcsolatot."

            });

        }

    }
);


// ======================================================
// STEAM ACCOUNT - LEVÁLASZTÁS
// ======================================================

app.delete(
    "/api/steam/account",
    async function (req, res) {

        try {

            const user =
                await getAuthenticatedSteamUser(
                    req
                );


            if (!user) {

                return res.status(401).json({

                    success: false,

                    message:
                        "Érvényes bejelentkezés szükséges."

                });

            }


            await pool.query(
                `
                DELETE FROM steam_accounts

                WHERE user_id = $1
                `,
                [
                    user.id
                ]
            );


            return res.json({

                success: true,

                connected: false,

                message:
                    "A Steam-fiók leválasztva."

            });

        }
        catch (error) {

            console.error(
                "STEAM ACCOUNT DELETE HIBA:",
                error
            );


            return res.status(500).json({

                success: false,

                message:
                    "Nem sikerült leválasztani a Steam-fiókot."

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

            const user =
                await getAuthenticatedSteamUser(
                    req
                );


            if (!user) {

                return res.status(401).json({

                    success: false,

                    message:
                        "Érvényes bejelentkezés szükséges."

                });

            }


            if (!STEAM_API_KEY) {

                return res.status(500).json({

                    success: false,

                    message:
                        "A STEAM_API_KEY nincs beállítva."

                });

            }


            const account =
                await getSteamAccountForUser(
                    user.id
                );


            if (!account) {

                return res.json({

                    success: true,

                    connected: false,

                    gameCount: 0,

                    games: []

                });

            }


            const data =
                await steamApiGet(
                    "IPlayerService",
                    "GetOwnedGames",
                    "v0001",
                    {

                        steamid:
                            account.steam_id,

                        include_appinfo:
                            1,

                        include_played_free_games:
                            1

                    }
                );


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


            const formattedGames =
                games.map(
                    function (game) {

                        const images =
                            getSteamImageUrls(
                                game.appid
                            );


                        return {

                            appid:
                                game.appid,

                            name:
                                game.name ||
                                "Ismeretlen játék",

                            playtimeForever:
                                game.playtime_forever ||
                                0,

                            playtimeForeverHours:
                                Math.round(
                                    (
                                        game.playtime_forever ||
                                        0
                                    ) /
                                    60 *
                                    10
                                ) / 10,

                            playtime2Weeks:
                                game.playtime_2weeks ||
                                0,

                            playtime2WeeksHours:
                                Math.round(
                                    (
                                        game.playtime_2weeks ||
                                        0
                                    ) /
                                    60 *
                                    10
                                ) / 10,

                            imgIconUrl:
                                game.img_icon_url ||
                                null,

                            imgLogoUrl:
                                game.img_logo_url ||
                                null,

                            images:
                                images

                        };

                    }
                );


            return res.json({

                success: true,

                connected: true,

                steamId:
                    account.steam_id,

                steamName:
                    account.steam_name,

                gameCount:
                    formattedGames.length,

                games:
                    formattedGames

            });

        }
        catch (error) {

            console.error(
                "STEAM GAMES HIBA:",
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
// STEAM GAME DETAILS + ACHIEVEMENTS
// ======================================================

app.get(
    "/api/steam/game/:appid",
    async function (req, res) {

        try {

            const user =
                await getAuthenticatedSteamUser(
                    req
                );


            if (!user) {

                return res.status(401).json({

                    success: false,

                    message:
                        "Érvényes bejelentkezés szükséges."

                });

            }


            if (!STEAM_API_KEY) {

                return res.status(500).json({

                    success: false,

                    message:
                        "A STEAM_API_KEY nincs beállítva."

                });

            }


            const appId =
                Number(
                    req.params.appid
                );


            if (
                !Number.isInteger(appId) ||
                appId <= 0
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Érvénytelen Steam AppID."

                });

            }


            const account =
                await getSteamAccountForUser(
                    user.id
                );


            if (!account) {

                return res.status(400).json({

                    success: false,

                    connected: false,

                    message:
                        "Nincs Steam-fiók összekötve."

                });

            }


            // --------------------------------------------------
            // Játék ellenőrzése a saját Steam könyvtárban
            // --------------------------------------------------

            const ownedGamesData =
                await steamApiGet(
                    "IPlayerService",
                    "GetOwnedGames",
                    "v0001",
                    {

                        steamid:
                            account.steam_id,

                        include_appinfo:
                            1,

                        include_played_free_games:
                            1

                    }
                );


            const games =
                ownedGamesData
                    ?.response
                    ?.games ||
                [];


            const game =
                games.find(
                    function (item) {

                        return (
                            Number(
                                item.appid
                            ) === appId
                        );

                    }
                );


            if (!game) {

                return res.status(404).json({

                    success: false,

                    message:
                        "Ez a játék nem található a Steam könyvtáradban."

                });

            }


            const images =
                getSteamImageUrls(
                    appId
                );


            // --------------------------------------------------
            // Achievementek
            // --------------------------------------------------

            let achievements = [];


            let achievementStats = {

                unlocked:
                    0,

                total:
                    0,

                percentage:
                    0

            };


            try {

                const achievementData =
                    await steamApiGet(
                        "ISteamUserStats",
                        "GetPlayerAchievements",
                        "v0001",
                        {

                            steamid:
                                account.steam_id,

                            appid:
                                appId,

                            l:
                                "english"

                        }
                    );


                const rawAchievements =
                    achievementData
                        ?.playerstats
                        ?.achievements ||
                    [];


                achievements =
                    rawAchievements.map(
                        function (
                            achievement
                        ) {

                            return {

                                apiname:
                                    achievement.apiname,

                                name:
                                    achievement.name ||
                                    achievement.apiname,

                                description:
                                    achievement.description ||
                                    "",

                                achieved:
                                    achievement.achieved === 1,

                                unlocktime:
                                    achievement.unlocktime ||
                                    0

                            };

                        }
                    );


                achievementStats.total =
                    achievements.length;


                achievementStats.unlocked =
                    achievements.filter(
                        function (
                            achievement
                        ) {

                            return achievement.achieved;

                        }
                    ).length;


                if (
                    achievementStats.total >
                    0
                ) {

                    achievementStats.percentage =
                        Math.round(
                            (
                                achievementStats.unlocked /
                                achievementStats.total
                            ) *
                            100
                        );

                }

            }
            catch (
                achievementError
            ) {

                console.error(
                    "STEAM ACHIEVEMENT HIBA:",
                    achievementError
                );

            }


            return res.json({

                success: true,

                connected: true,

                game: {

                    appid:
                        game.appid,

                    name:
                        game.name,

                    playtimeForever:
                        game.playtime_forever ||
                        0,

                    playtimeForeverHours:
                        Math.round(
                            (
                                game.playtime_forever ||
                                0
                            ) /
                            60 *
                            10
                        ) / 10,

                    playtime2Weeks:
                        game.playtime_2weeks ||
                        0,

                    playtime2WeeksHours:
                        Math.round(
                            (
                                game.playtime_2weeks ||
                                0
                            ) /
                            60 *
                            10
                        ) / 10,

                    images:
                        images

                },

                achievements:
                    achievements,

                achievementStats:
                    achievementStats

            });

        }
        catch (error) {

            console.error(
                "STEAM GAME DETAILS HIBA:",
                error
            );


            return res.status(500).json({

                success: false,

                message:
                    "Nem sikerült lekérni a játék adatait."

            });

        }

    }
);


// ======================================================
// STEAM PROFILE
// ======================================================

app.get(
    "/api/steam/profile",
    async function (req, res) {

        try {

            const user =
                await getAuthenticatedSteamUser(
                    req
                );


            if (!user) {

                return res.status(401).json({

                    success: false,

                    message:
                        "Érvényes bejelentkezés szükséges."

                });

            }


            const account =
                await getSteamAccountForUser(
                    user.id
                );


            if (!account) {

                return res.json({

                    success: true,

                    connected: false,

                    profile: null

                });

            }


            const data =
                await steamApiGet(
                    "ISteamUser",
                    "GetPlayerSummaries",
                    "v0002",
                    {

                        steamids:
                            account.steam_id

                    }
                );


            const profile =
                data
                    ?.response
                    ?.players
                    ?.[0] ||
                null;


            if (!profile) {

                return res.status(404).json({

                    success: false,

                    message:
                        "A Steam profil nem található."

                });

            }


            return res.json({

                success: true,

                connected: true,

                profile: {

                    steamId:
                        profile.steamid,

                    name:
                        profile.personaname,

                    profileUrl:
                        profile.profileurl,

                    avatar:
                        profile.avatarfull ||
                        profile.avatarmedium ||
                        profile.avatar,

                    personaState:
                        profile.personastate,

                    gameName:
                        profile.gameextrainfo ||
                        null,

                    gameId:
                        profile.gameid ||
                        null,

                    created:
                        profile.timecreated ||
                        null

                }

            });

        }
        catch (error) {

            console.error(
                "STEAM PROFILE HIBA:",
                error
            );


            return res.status(500).json({

                success: false,

                message:
                    "Nem sikerült lekérni a Steam profilt."

            });

        }

    }
);


// ======================================================
// STEAM RECENT GAMES
// ======================================================

app.get(
    "/api/steam/recent",
    async function (req, res) {

        try {

            const user =
                await getAuthenticatedSteamUser(
                    req
                );


            if (!user) {

                return res.status(401).json({

                    success: false,

                    message:
                        "Érvényes bejelentkezés szükséges."

                });

            }


            const account =
                await getSteamAccountForUser(
                    user.id
                );


            if (!account) {

                return res.json({

                    success: true,

                    connected: false,

                    games: []

                });

            }


            const data =
                await steamApiGet(
                    "IPlayerService",
                    "GetRecentlyPlayedGames",
                    "v0001",
                    {

                        steamid:
                            account.steam_id

                    }
                );


            const games =
                data
                    ?.response
                    ?.games ||
                [];


            const formattedGames =
                games.map(
                    function (game) {

                        return {

                            appid:
                                game.appid,

                            name:
                                game.name,

                            playtime2Weeks:
                                game.playtime_2weeks ||
                                0,

                            playtime2WeeksHours:
                                Math.round(
                                    (
                                        game.playtime_2weeks ||
                                        0
                                    ) /
                                    60 *
                                    10
                                ) / 10,

                            playtimeForever:
                                game.playtime_forever ||
                                0,

                            images:
                                getSteamImageUrls(
                                    game.appid
                                )

                        };

                    }
                );


            return res.json({

                success: true,

                connected: true,

                games:
                    formattedGames

            });

        }
        catch (error) {

            console.error(
                "STEAM RECENT HIBA:",
                error
            );


            return res.status(500).json({

                success: false,

                message:
                    "Nem sikerült lekérni a legutóbb játszott játékokat."

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
