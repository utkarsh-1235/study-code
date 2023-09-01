const express = require('express');
const userRoute = express.Router();

const {signUp,
       login} = require('../Controllers/userAuth');

userRoute.post('/signup',signUp);
userRoute.post('/login',login);

module.exports = userRoute;
