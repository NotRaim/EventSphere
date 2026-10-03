const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { auth } = require('../middleware/auth');


/* =========================================================
   JWT
========================================================= */

const token = (u) =>
    jwt.sign(
        {
            id: u._id.toString(),
            role: u.role
        },
        process.env.JWT_SECRET,
        {
            expiresIn: process.env.JWT_EXPIRES_IN || '7d'
        }
    );


/* =========================================================
   CLEAN USER RESPONSE
========================================================= */

const clean = (u) => ({
    id: u._id.toString(),
    name: u.name,
    email: u.email,
    phone: u.phone || '',
    role: u.role,
    preferences: u.preferences || {}
});


/* =========================================================
   NORMALIZE REQUEST BODY
========================================================= */

function getBody(req) {
    let body = req.body;

    // Buffer → string
    if (Buffer.isBuffer(body)) {
        body = body.toString('utf8');
    }

    // JSON string → object
    if (typeof body === 'string') {
        try {
            body = JSON.parse(body);
        } catch (error) {
            return null;
        }
    }

    // Make sure we always return an object
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
        return null;
    }

    return body;
}


/* =========================================================
   REGISTER
========================================================= */

router.post('/register', async (req, res) => {
    try {
        const body = getBody(req);

        console.log('REGISTER BODY:', {
            type: typeof req.body,
            isBuffer: Buffer.isBuffer(req.body),
            keys: body ? Object.keys(body) : []
        });

        if (!body) {
            return res.status(400).json({
                message: 'Invalid request body'
            });
        }

        const {
            name,
            email,
            password,
            phone,
            role = 'user'
        } = body;


        /* Required fields */

        if (!name || !email || !password) {
            return res.status(400).json({
                message: 'Name, email and password are required'
            });
        }


        /* Password validation */

        if (String(password).length < 8) {
            return res.status(400).json({
                message: 'Password must be at least 8 characters'
            });
        }


        /* Role validation */

        if (!['user', 'organizer'].includes(role)) {
            return res.status(400).json({
                message: 'Invalid role'
            });
        }


        /* Normalize email */

        const normalizedEmail = String(email)
            .trim()
            .toLowerCase();


        /* Check existing account */

        if (await User.exists({
            email: normalizedEmail
        })) {
            return res.status(409).json({
                message: 'An account with this email already exists'
            });
        }


        /* Create user */

        const u = await User.create({
            name: String(name).trim(),

            email: normalizedEmail,

            phone: phone
                ? String(phone).trim()
                : '',

            passwordHash: await bcrypt.hash(
                String(password),
                12
            ),

            role
        });


        /* Return authentication */

        return res.status(201).json({
            token: token(u),
            user: clean(u)
        });

    } catch (error) {

        console.error(
            'Registration error:',
            error
        );

        return res.status(500).json({
            message: 'Registration failed'
        });
    }
});


/* =========================================================
   LOGIN
========================================================= */

router.post('/login', async (req, res) => {
    try {
        const body = getBody(req);

        console.log('LOGIN BODY:', {
            type: typeof req.body,
            isBuffer: Buffer.isBuffer(req.body),
            keys: body ? Object.keys(body) : []
        });

        if (!body) {
            return res.status(400).json({
                message: 'Invalid request body'
            });
        }


        const email = String(
            body.email || ''
        )
            .trim()
            .toLowerCase();

        const password = String(
            body.password || ''
        );


        if (!email || !password) {
            return res.status(400).json({
                message: 'Email and password are required'
            });
        }


        const u = await User.findOne({
            email
        });
        console.log('LOGIN USER CHECK:', {
    email,
    userFound: !!u,
    hasPasswordHash: !!u?.passwordHash,
    passwordHashLength: u?.passwordHash?.length || 0,
    role: u?.role || null
});


        if (
    !u ||
    !u.passwordHash ||
    !(await bcrypt.compare(
        password,
        u.passwordHash
    ))
) {
    return res.status(401).json({
        message: 'Invalid email or password'
    });
} {
            return res.status(401).json({
                message: 'Invalid email or password'
            });
        }


        if (u.status === 'suspended') {
            return res.status(403).json({
                message: 'This account is suspended'
            });
        }


        return res.json({
            token: token(u),
            user: clean(u)
        });

    } catch (error) {

        console.error(
            'Login error:',
            error
        );

        return res.status(500).json({
            message: 'Login failed'
        });
    }
});


/* =========================================================
   CURRENT USER
========================================================= */

router.get(
    '/me',
    auth,
    (req, res) => {
        res.json({
            user: clean(req.user)
        });
    }
);


module.exports = router;