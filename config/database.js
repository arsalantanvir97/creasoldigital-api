const mongoose = require("mongoose");

const { MONGO_URI } = process.env;

exports.connect = async () => {
    try {

    console.log('trying to connect db',MONGO_URI)
    // Connecting to the database
    // mongoose.set('strictQuery', false)
    await mongoose.connect(MONGO_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        useCreateIndex: true,
        useFindAndModify: false,
      });
      console.log("\u001b[" + 34 + "m" + `Connected to Database` + "\u001b[0m");
    } catch (error) {
      console.error(error.message);
      // exit process with failure
      process.exit(1);
    }
};