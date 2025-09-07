import mongoose from "mongoose";

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);

    mongoose.connection.on("connected", () => console.log("Database Connected"));
    mongoose.connection.on("error", (err) => console.error("MongoDB connection error:", err));
  } catch (err) {
    console.error("MongoDB connection failed:", err);
  }
};

export default connectDB;

