const mongoose = require("mongoose")
require("dotenv").config()

const DB_URL = process.env.MONGO_URL;

const dbconnection = () => {

    mongoose.connect(DB_URL, {
        useNewUrlParser: true,
        useUnifiedTopology: true
    }).then((conn) => console.log(`successfully connected to db${conn.connection.host}`))
        .catch((err) => {
            console.log("issue with db connection");
            console.log(err);
        })
}
module.exports = dbconnection;