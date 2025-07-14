const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const session = require("express-session");
const MongoStore = require("connect-mongo");
const path = require("path");
var nodemailer=require('nodemailer');


const app = express();

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/price');
const db = mongoose.connection;
db.on('error', () => console.log("Error connecting to database"));
db.once('open', () => console.log("Connected to database"));

// Configure sessions
app.use(session({
    secret: 'qwerty65489', // Change to a strong secret key
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
        mongoUrl: 'mongodb://localhost:27017/price',
        collectionName: 'sessions'
    }),
    cookie: { maxAge: 1000 * 60 * 60 * 24 } // 1 day
}));

// Signup Route
app.post("/signup", async (req, res) => {
    const { name, email, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = {
        "name": name,
        "email": email,
        "password": hashedPassword
    };

    db.collection('users').insertOne(newUser, (err) => {
        if (err) {
            return res.status(500).send("Error inserting record");
        }
        console.log("Record Inserted Successfully");
         // Redirect to home page

        req.session.user = newUser.email;
        console.log("Login Successful");
        return res.redirect('/');
    });
});

// Login Route
app.post("/login", async (req, res) => {
    const { email, password } = req.body;

    // Check if the user exists in the database
    const user = await db.collection('users').findOne({ email: email });
    if (user) {
        const isMatch = await bcrypt.compare(password, user.password);

        if (isMatch) {
            // Store user email in session
            req.session.user = user.email;
            console.log("Login Successful");
            return res.redirect('/'); // Redirect to homepage
        } else {
            console.log("Invalid Credentials");
            return res.status(400).send("Invalid Email or Password");
        }
    } else {
        console.log("User not found");
        return res.status(404).send("User not found");
    }
});



// Serve homepage with user email if logged in
app.get("/", (req, res) => {
    if (req.session.user) {
        res.sendFile(path.join(__dirname, 'public', 'pc.html'));
    } else {
        res.sendFile(path.join(__dirname, 'public', 'pc.html')); // Show login/signup if not logged in
    }
});


app.get("/check-session", (req, res) => {
    if (req.session.user) {
        res.json({ loggedIn: true, email: req.session.user });
    } else {
        res.json({ loggedIn: false });
    }
});


// Logout route
app.get("/logout", (req, res) => {
    req.session.destroy();
    res.redirect('/');
});
// Listen on port 3000
app.listen(3001, () => {
    console.log("Server running on port 3001");
});