const app = require('./app');
const dbConnection = require('./Config/database');
require('dotenv').config();

const port = process.env.PORT || 4001;
app.listen(port, async()=>{

    //database connection
     await dbConnection();
    console.log(`server is running at port https://localhost/${port}`)
})