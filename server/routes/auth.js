const router = require('express').Router();

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const User = require('../models/User');
const { auth } = require('../middleware/auth');


/* =========================================================
   JWT
========================================================= */

const token = (u) => {
    return jwt.sign(
        {
            id: u._id.toString(),
            role: u.role
        },
        process.env.JWT_SECRET,
        {
            expiresIn: process.env.JWT_EXPIRES_IN || '7d'
        }
    );
};


/* =========================================================
   CLEAN USER
========================================================= */

const clean = (u) => {
    return {
        id: u._id.toString(),
        name: u.name,
        email: u.email,
        phone: u.phone || '',
        role: u.role,
        preferences: u.preferences || {}
    };
};


/* =========================================================
   NORMALIZE BODY
========================================================= */

function getBody(req) {
    let body = req.body;

    if (Buffer.isBuffer(body)) {
        body = body.toString('utf8');
    }

    if (typeof body === 'string') {
        try {
            body = JSON.parse(body);
        } catch {
            return null;
        }
    }

    if (
        !body ||
        typeof body !== 'object' ||
        Array.isArray(body)
    ) {
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

        if (!body) {
            return res.status(400).json({
                message: 'Invalid request body'
            });
        }

        const name = String(body.name || '').trim();
        const email = String(body.email || '')
            .trim()
            .toLowerCase();
        const password = String(body.password || '');
        const phone = String(body.phone || '').trim();
        const role = body.role || 'user';


        if (!name || !email || !password) {
            return res.status(400).json({
                message: 'Name, email and password are required'
            });
        }


        if (password.length < 8) {
            return res.status(400).json({
                message: 'Password must be at least 8 characters'
            });
        }


        if (!['user', 'organizer'].includes(role)) {
            return res.status(400).json({
                message: 'Invalid role'
            });
        }


        const existingUser = await User.findOne({
            email
        });

        if (existingUser) {
            return res.status(409).json({
                message: 'An account with this email already exists'
            });
        }


        const passwordHash = await bcrypt.hash(
            password,
            12
        );


        const user = await User.create({
            name,
            email,
            phone,
            passwordHash,
            role
        });


        const userToken = token(user);


        return res.status(201).json({
            token: userToken,
            user: clean(user)
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


        const email = String(body.email || '')
            .trim()
            .toLowerCase();

        const password = String(body.password || '');


        if (!email || !password) {
            return res.status(400).json({
                message: 'Email and password are required'
            });
        }


        const user = await User.findOne({
            email
        });


        console.log('LOGIN USER CHECK:', {
            email,
            userFound: !!user,
            hasPasswordHash: !!user?.passwordHash,
            passwordHashLength:
                user?.passwordHash?.length || 0,
            role: user?.role || null
        });


        if (!user) {
            return res.status(401).json({
                message: 'Invalid email or password'
            });
        }


        if (!user.passwordHash) {
            console.error(
                'LOGIN FAILED: passwordHash missing'
            );

            return res.status(401).json({
                message: 'Invalid email or password'
            });
        }


        const passwordMatches =
            await bcrypt.compare(
                password,
                user.passwordHash
            );


        console.log('PASSWORD CHECK:', {
            passwordMatches,
            hashPrefix:
                user.passwordHash.substring(0, 4),
            hashLength:
                user.passwordHash.length
        });


        if (!passwordMatches) {
            return res.status(401).json({
                message: 'Invalid email or password'
            });
        }


        /* =================================================
           PASSWORD IS CORRECT FROM THIS POINT
        ================================================= */


        if (user.status === 'suspended') {
            return res.status(403).json({
                message: 'This account is suspended'
            });
        }


        const userToken = token(user);


        console.log('LOGIN SUCCESS:', {
            email: user.email,
            role: user.role
        });


        return res.status(200).json({
            token: userToken,
            user: clean(user)
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
        return res.json({
            user: clean(req.user)
        });
    }
);


module.exports = router;