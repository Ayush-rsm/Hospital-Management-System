import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import validator from "validator";
import crypto from "crypto";

import userModel from "../models/userModel.js";
import doctorModel from "../models/doctorModel.js";
import appointmentModel from "../models/appointmentModel.js";
import { v2 as cloudinary } from "cloudinary";
import Stripe from "stripe";
import Razorpay from "razorpay";

// -------------------------------
// Gateway Initialize
// -------------------------------
const stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY);
const razorpayInstance = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// -------------------------------
// Helpers
// -------------------------------
const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "7d" });

const jsonOk = (res, payload = {}) => res.json({ success: true, ...payload });
const jsonErr = (res, message = "Something went wrong", code = 400) =>
  res.status(code).json({ success: false, message });

// -------------------------------
// API: Register User
// -------------------------------
const registerUser = async (req, res) => {
  try {
    const { name = "", email = "", password = "" } = req.body;

    if (!name.trim() || !email.trim() || !password) {
      return jsonErr(res, "Missing details: name, email, password are required.");
    }

    if (!validator.isEmail(email)) {
      return jsonErr(res, "Please enter a valid email.");
    }

    if (password.length < 8) {
      return jsonErr(res, "Password must be at least 8 characters.");
    }

    const exists = await userModel.findOne({ email: email.toLowerCase() });
    if (exists) {
      return jsonErr(res, "Email already registered.", 409);
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const userDoc = await userModel.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password: hashedPassword,
    });

    const token = signToken(userDoc._id);

    return jsonOk(res, {
      token,
      user: {
        id: userDoc._id,
        name: userDoc.name,
        email: userDoc.email,
        image: userDoc.image || "",
      },
      message: "Account created successfully",
    });
  } catch (error) {
    if (error?.code === 11000 && error?.keyPattern?.email) {
      return jsonErr(res, "Email already registered.", 409);
    }
    console.error("registerUser:", error);
    return jsonErr(res, error.message || "Registration failed.", 500);
  }
};

// -------------------------------
// API: Login User
// -------------------------------
const loginUser = async (req, res) => {
  try {
    const { email = "", password = "" } = req.body;

    if (!email.trim() || !password) {
      return jsonErr(res, "Missing details: email and password are required.");
    }

    const user = await userModel.findOne({ email: email.toLowerCase() });
    if (!user) return jsonErr(res, "Invalid email or password.", 401);

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return jsonErr(res, "Invalid email or password.", 401);

    const token = signToken(user._id);

    return jsonOk(res, {
      token,
      user: { id: user._id, name: user.name, email: user.email, image: user.image || "" },
      message: "Login successful",
    });
  } catch (error) {
    console.error("loginUser:", error);
    return jsonErr(res, error.message || "Login failed.", 500);
  }
};

// -------------------------------
// API: Get User Profile
// -------------------------------
const getProfile = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return jsonErr(res, "Not Authorized", 401);

    const user = await userModel.findById(userId).select("-password");
    if (!user) return jsonErr(res, "User not found.", 404);

    return jsonOk(res, { user });
  } catch (error) {
    console.error("getProfile:", error);
    return jsonErr(res, error.message || "Failed to fetch profile.", 500);
  }
};

// -------------------------------
// API: Update User Profile
// -------------------------------
const updateProfile = async (req, res) => {
  try {
    const userId = req.user?.id || req.body?.userId;
    if (!userId) return jsonErr(res, "Not Authorized", 401);

    const { name, phone, address, dob, gender } = req.body;
    const update = {};

    if (name) update.name = name;
    if (phone) update.phone = phone;
    if (dob) update.dob = dob;
    if (gender) update.gender = gender;

    if (typeof address === "string") {
      try {
        update.address = JSON.parse(address);
      } catch {
        update.address = address;
      }
    } else if (address) {
      update.address = address;
    }

    if (req.file) {
      const uploaded = await cloudinary.uploader.upload(req.file.path, {
        resource_type: "image",
      });
      update.image = uploaded.secure_url;
    }

    const user = await userModel.findByIdAndUpdate(userId, update, {
      new: true,
    }).select("-password");

    return jsonOk(res, { user, message: "Profile updated successfully" });
  } catch (error) {
    console.error("updateProfile:", error);
    return jsonErr(res, error.message || "Failed to update profile.", 500);
  }
};

// -------------------------------
// API: Book Appointment
// -------------------------------
// -------------------------------
// API: Book Appointment
// -------------------------------
const bookAppointment = async (req, res) => {
  try {
    const userId = req.user?.id || req.body?.userId;
    if (!userId) return jsonErr(res, "Not Authorized", 401);

    const { docId, slotDate, slotTime } = req.body;
    if (!docId || !slotDate || !slotTime) {
      return jsonErr(res, "Missing details: docId, slotDate, slotTime are required.");
    }

    // Fetch doctor & user data
    const docData = await doctorModel.findById(docId).select("-password");
    if (!docData) return jsonErr(res, "Doctor not found.", 404);
    if (!docData.available) return jsonErr(res, "Doctor not available.");

    const userData = await userModel.findById(userId).select("-password");
    if (!userData) return jsonErr(res, "User not found.", 404);

    // Check & update booked slots
    const slots_booked = docData.slots_booked || {};
    const daySlots = slots_booked[slotDate] || [];
    if (daySlots.includes(slotTime)) return jsonErr(res, "Slot not available.");

    daySlots.push(slotTime);
    slots_booked[slotDate] = daySlots;
    await doctorModel.findByIdAndUpdate(docId, { slots_booked });

    // Prepare doctor data safely
    const docInfo = {
      _id: docData._id,
      name: docData.name || "Unknown Doctor",
      image: docData.image || "",
      speciality: docData.speciality || "N/A",
      year: docData.experience || "N/A",           // maps experience to year
      fees: docData.fees || 0,
      address: docData.address || { line1: "N/A", line2: "" },
    };

    // Prepare user data safely
    const userInfo = {
      _id: userData._id,
      name: userData.name || "Unknown User",
      email: userData.email || "N/A",
      image: userData.image || "",
    };

    // Create appointment
    const newAppointment = await appointmentModel.create({
      userId,
      docId,
      slotDate,
      slotTime,
      amount: docData.fees || 0,
      date: Date.now(),
      docData: docInfo,
      userData: userInfo,
      cancelled: false,
      payment: false,
      isCompleted: false,
    });

    return jsonOk(res, {
      message: "Appointment booked successfully",
      appointment: newAppointment,
    });
  } catch (error) {
    console.error("bookAppointment:", error);
    return jsonErr(res, error.message || "Failed to book appointment.", 500);
  }
};



// -------------------------------
// API: Cancel Appointment
// -------------------------------
const cancelAppointment = async (req, res) => {
  try {
    const userId = req.user?.id || req.body?.userId;
    if (!userId) return jsonErr(res, "Not Authorized", 401);

    const { appointmentId } = req.body;
    if (!appointmentId) return jsonErr(res, "appointmentId is required.");

    const appointment = await appointmentModel.findById(appointmentId);
    if (!appointment) return jsonErr(res, "Appointment not found.", 404);

    if (appointment.userId.toString() !== userId.toString()) {
      return jsonErr(res, "Unauthorized action.", 403);
    }

    if (appointment.cancelled) {
      return jsonOk(res, { message: "Appointment already cancelled" });
    }

    await appointmentModel.findByIdAndUpdate(appointmentId, { cancelled: true });

    // Release doctor's slot
    const { docId, slotDate, slotTime } = appointment;
    const doctor = await doctorModel.findById(docId);
    const slots_booked = doctor.slots_booked || {};
    if (slots_booked[slotDate]) {
      slots_booked[slotDate] = slots_booked[slotDate].filter((t) => t !== slotTime);
    }
    await doctorModel.findByIdAndUpdate(docId, { slots_booked });

    return jsonOk(res, { message: "Appointment cancelled" });
  } catch (error) {
    console.error("cancelAppointment:", error);
    return jsonErr(res, error.message || "Failed to cancel appointment.", 500);
  }
};

// -------------------------------
// API: List Appointments (User)
// -------------------------------
const listAppointment = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return jsonErr(res, "Not Authorized", 401);

    const appointments = await appointmentModel
      .find({ userId })
      .sort({ date: -1 });

    return res.json({ success: true, appointments });
  } catch (error) {
    console.error("listAppointment:", error);
    return res.status(500).json({ success: false, message: error.message || "Failed to fetch appointments." });
  }
};



// -------------------------------
// Razorpay / Stripe APIs
// -------------------------------
const paymentRazorpay = async (req, res) => {
  try {
    const userId = req.user?.id || req.body?.userId;
    if (!userId) return jsonErr(res, "Not Authorized", 401);

    const { appointmentId } = req.body;
    const appointment = await appointmentModel.findById(appointmentId);
    if (!appointment || appointment.cancelled) {
      return jsonErr(res, "Appointment cancelled or not found.");
    }

    const options = {
      amount: Math.round(appointment.amount * 100),
      currency: process.env.CURRENCY || "INR",
      receipt: String(appointment._id),
    };

    const order = await razorpayInstance.orders.create(options);
    return jsonOk(res, { order });
  } catch (error) {
    console.error("paymentRazorpay:", error);
    return jsonErr(res, error.message || "Failed to create Razorpay order.", 500);
  }
};

const verifyRazorpay = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return jsonErr(res, "Missing Razorpay verification details.");
    }

    const body = `${razorpay_order_id}|${razorpay_payment_id}`;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      return jsonErr(res, "Payment verification failed.", 400);
    }

    const orderInfo = await razorpayInstance.orders.fetch(razorpay_order_id);
    if (!orderInfo?.receipt) return jsonErr(res, "Order receipt not found.", 400);

    await appointmentModel.findByIdAndUpdate(orderInfo.receipt, { payment: true });

    return jsonOk(res, { message: "Payment successful" });
  } catch (error) {
    console.error("verifyRazorpay:", error);
    return jsonErr(res, error.message || "Failed to verify Razorpay payment.", 500);
  }
};

const paymentStripe = async (req, res) => {
  try {
    const userId = req.user?.id || req.body?.userId;
    if (!userId) return jsonErr(res, "Not Authorized", 401);

    const { appointmentId } = req.body;
    const { origin } = req.headers;

    const appointment = await appointmentModel.findById(appointmentId);
    if (!appointment || appointment.cancelled) {
      return jsonErr(res, "Appointment cancelled or not found.");
    }

    const currency = (process.env.CURRENCY || "INR").toLowerCase();

    const session = await stripeInstance.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency,
            product_data: { name: "Appointment Fees" },
            unit_amount: Math.round(appointment.amount * 100),
          },
          quantity: 1,
        },
      ],
      success_url: `${origin}/verify?success=true&appointmentId=${appointment._id}`,
      cancel_url: `${origin}/verify?success=false&appointmentId=${appointment._id}`,
    });

    return jsonOk(res, { session_url: session.url });
  } catch (error) {
    console.error("paymentStripe:", error);
    return jsonErr(res, error.message || "Failed to initiate Stripe payment.", 500);
  }
};

const verifyStripe = async (req, res) => {
  try {
    const { appointmentId, success } = req.body;
    if (!appointmentId) return jsonErr(res, "appointmentId is required.");

    if (String(success) === "true") {
      await appointmentModel.findByIdAndUpdate(appointmentId, { payment: true });
      return jsonOk(res, { message: "Payment successful" });
    }
    return jsonErr(res, "Payment failed.");
  } catch (error) {
    console.error("verifyStripe:", error);
    return jsonErr(res, error.message || "Failed to verify Stripe payment.", 500);
  }
};

// -------------------------------
// Exports
// -------------------------------
export {
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
  verifyStripe,
};

