const express = require('express');
const app = express();

const cookieParser = require('cookie-parser');
const cors = require('cors');
const userRoutes = require('./Route/userRoute');

//middleware
app.use(express.json())
app.use(cookieParser())
app.use(express.urlencoded({ extended: true }));

app.use(
    cors({
        origin: process.env.FRONTEND_URL,
        credentials: true
    })
)

// Route
app.use('/api/v1/auth', userRoutes);


app.use('/',(req,res)=>{
    res.status(200).json("JWT auth")
})

module.exports = app;