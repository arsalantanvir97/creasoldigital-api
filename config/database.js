const mongoose = require("mongoose");

const { MONGO_URI } = process.env;

console.log(MONGO_URI);

exports.connect = async () => {
    console.log('trying to connect db')
    // Connecting to the database
    mongoose.set('strictQuery', false)
    await mongoose
        .connect(MONGO_URI, {
            // useNewUrlParser: true,
            // useUnifiedTopology: true,
            // // useCreateIndex: true,
            // // useFindAndModify: false,
            // autoIndex: true,
            // // poolSize: 10,
            // serverSelectionTimeoutMS: 30000,
            // socketTimeoutMS: 75000,
            // family: 4,
            // keepAlive: true,
            // keepAliveInitialDelay: 300000,
        })
        .then(() => {
            console.log("Successfully connected to database");
        })
        .catch((error) => {
            console.log("database connection failed. exiting now...");
            console.error(error);
            process.exit(1);
        });
};