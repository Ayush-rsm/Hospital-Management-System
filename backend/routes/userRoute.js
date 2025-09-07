import express from 'express';
import {
  loginUser,
  registerUser,
  getProfile,
  updateProfile,
  bookAppointment,
  listAppointment,
  cancelAppointment,
  paymentRazorpay,
  verifyRazorpay,
  paymentStripe,
  verifyStripe
} from '../controllers/userController.js';
import upload from '../middleware/multer.js';
import authUser from '../middleware/authUser.js';

const userRouter = express.Router();

// Auth routes
userRouter.post("/register", registerUser);
userRouter.post("/login", loginUser);

// Profile routes
userRouter.get("/profile", authUser, getProfile);
userRouter.post("/update-profile", authUser, upload.single('image'), updateProfile);

// Appointments
userRouter.post("/book-appointment", authUser, bookAppointment);
userRouter.get("/appointments", authUser, listAppointment);
userRouter.post("/cancel-appointment", authUser, cancelAppointment);

// Payments
userRouter.post("/payment-razorpay", authUser, paymentRazorpay);
userRouter.post("/verifyRazorpay", authUser, verifyRazorpay);
userRouter.post("/payment-stripe", authUser, paymentStripe);
userRouter.post("/verifyStripe", authUser, verifyStripe);

export default userRouter;
