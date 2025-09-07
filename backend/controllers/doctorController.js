// backend/controllers/doctorController.js
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import doctorModel from "../models/doctorModel.js";
import appointmentModel from "../models/appointmentModel.js";

/**
 * Doctor Login
 */
const loginDoctor = async (req, res) => {
  try {
    const { email, password } = req.body;

    const doctor = await doctorModel.findOne({ email });
    if (!doctor) {
      return res.status(400).json({ success: false, message: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, doctor.password);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: "Invalid credentials" });
    }

    const token = jwt.sign({ id: doctor._id }, process.env.JWT_SECRET, { expiresIn: "7d" });
    return res.json({ success: true, token, doctor: { ...doctor._doc, password: undefined } });
  } catch (error) {
    console.error("Login Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get Appointments for Doctor
 */
const appointmentsDoctor = async (req, res) => {
  try {
    if (!req.docId) {
      return res.status(400).json({ success: false, message: "No doctor ID provided" });
    }

    const appointments = await appointmentModel
      .find({ docId: req.docId })
      .populate("userId", "-password");

    const formatted = appointments.map(appt => ({
      ...appt._doc,
      userData: appt.userId, // 🔥 frontend expects this
    }));

    return res.json({ success: true, appointments: formatted });
  } catch (error) {
    console.error("Appointments Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Cancel Appointment
 */
const appointmentCancel = async (req, res) => {
  try {
    const { appointmentId } = req.body;

    const appt = await appointmentModel.findOne({ _id: appointmentId, docId: req.docId });
    if (!appt) return res.status(404).json({ success: false, message: "Appointment not found" });

    appt.cancelled = true;
    appt.isCompleted = false;
    appt.status = "Cancelled"; 
    await appt.save();

    return res.json({ success: true, message: "Appointment cancelled successfully" });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const appointmentComplete = async (req, res) => {
  try {
    const { appointmentId } = req.body;

    const appt = await appointmentModel.findOne({ _id: appointmentId, docId: req.docId });
    if (!appt) return res.status(404).json({ success: false, message: "Appointment not found" });

    appt.isCompleted = true;
    appt.cancelled = false;
    appt.status = "Completed"; 
    await appt.save();

    return res.json({ success: true, message: "Appointment marked as completed" });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};


/**
 * List All Doctors (Public)
 */
const doctorList = async (req, res) => {
  try {
    const doctors = await doctorModel.find({}).select("-password");
    return res.json({ success: true, doctors });
  } catch (error) {
    console.error("Doctor List Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Toggle Doctor Availability
 */
const changeAvailablity = async (req, res) => {
  try {
    const doctor = await doctorModel.findById(req.docId);
    if (!doctor) {
      return res.status(404).json({ success: false, message: "Doctor not found" });
    }

    doctor.available = !doctor.available;
    await doctor.save();

    return res.json({
      success: true,
      message: "Availability status updated",
      available: doctor.available,
    });
  } catch (error) {
    console.error("Availability Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Doctor Profile
 */
const doctorProfile = async (req, res) => {
  try {
    const profileData = await doctorModel.findById(req.docId).select("-password");

    if (!profileData) {
      return res.status(404).json({ success: false, message: "Doctor not found" });
    }

    return res.json({ success: true, profileData });
  } catch (error) {
    console.error("Profile Fetch Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Update Doctor Profile
 */
const updateDoctorProfile = async (req, res) => {
  try {
    const { fees, address, available } = req.body;

    const doctor = await doctorModel.findById(req.docId);
    if (!doctor) {
      return res.status(404).json({ success: false, message: "Doctor not found" });
    }

    if (typeof fees !== "undefined") doctor.fees = fees;
    if (typeof address !== "undefined") doctor.address = address;
    if (typeof available === "boolean") doctor.available = available;

    await doctor.save();

    return res.json({ success: true, message: "Profile updated successfully" });
  } catch (error) {
    console.error("Profile Update Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Doctor Dashboard Data
 */


/**
 * Doctor Dashboard Data
 */
const doctorDashboard = async (req, res) => {
  try {
    const docId = new mongoose.Types.ObjectId(req.docId);

    const doctor = await doctorModel.findById(docId);
    const appointments = await appointmentModel.find({ docId }).sort({ date: -1 });

    // calculate earnings based on doctor fees
    // calculate earnings based on doctor fees
const earnings = appointments
  .filter(a => a.isCompleted && !a.cancelled && a.payment) // ✅ only completed + paid
  .reduce((sum, a) => sum + (a.amount || doctor.fees || 0), 0);


    const patientsSet = new Set(appointments.map(a => String(a.userId)));
    const patients = patientsSet.size;

    // 🔹 Here is where you fetch latestAppointments
    const latestAppointments = await appointmentModel.find({ docId })
      .populate("userId", "name image dob")
      .sort({ date: -1 })   // ✅ instead of createdAt
      .limit(5);

    const dashData = {
      earnings,
      appointments: appointments.length,
      patients,
      latestAppointments: latestAppointments.map(appt => ({
        ...appt._doc,
        userData: appt.userId,
      })),
    };

    return res.json({ success: true, dashData });
  } catch (err) {
    console.error("Dashboard error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};


export {
  loginDoctor,
  appointmentsDoctor,
  appointmentCancel,
  appointmentComplete,
  doctorList,
  changeAvailablity,
  doctorProfile,
  updateDoctorProfile,
  doctorDashboard,
};




