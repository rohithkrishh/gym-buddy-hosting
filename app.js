
const express = require('express');
const app = express();
require('dotenv').config(); 
const path = require('node:path');
const session = require('express-session');
const passport = require('./config/passport');
const nocache = require('nocache');
const flash = require("connect-flash");
const MongoStore = require("connect-mongo");
const db = require("./config/db");
db();

const userRouter = require('./routes/userRouter');
const adminRouter = require('./routes/adminRouter');

app.use(nocache());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
        mongoUrl: "mongodb://localhost:27017/nodewebapp", 
    }),
    cookie: {
        secure: false,
        httpOnly: true,
        maxAge: 72* 60* 60 * 1000, 
    },
}));

app.use(passport.initialize());
app.use(passport.session());

app.use((req, res, next) => {
    res.locals.user = req.user || null;
    
    next();
});

app.use(flash());



app.set("views", [path.join(__dirname, "views/user"), path.join(__dirname, "views/admin")]);
app.set('view engine', 'ejs');
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', userRouter);
app.use('/admin', adminRouter);

app.listen(process.env.PORT, () => {
    console.log(`Server running at http://localhost:${process.env.PORT}/`);
    console.log(`Admin login: http://localhost:${process.env.PORT}/admin/login`);
});

