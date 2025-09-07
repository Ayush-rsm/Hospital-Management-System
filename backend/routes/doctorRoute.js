import express from 'express';
import {
  loginDoctor,
  appointmentsDoctor,
  appointmentCancel,
  doctorList,
  changeAvailablity,
  appointmentComplete,
  doctorDashboard,
  doctorProfile,
  updateDoctorProfile
} from '../controllers/doctorController.js';
import authDoctor from '../middleware/authDoctor.js';

const doctorRouter = express.Router();

doctorRouter.post("/login", loginDoctor);
doctorRouter.post("/dashboard", authDoctor, doctorDashboard);


// appointments & profile fetch
doctorRouter.get("/appointments", authDoctor, appointmentsDoctor);
doctorRouter.get("/profile", authDoctor, doctorProfile);

// appointment actions
doctorRouter.post("/cancel-appointment", authDoctor, appointmentCancel);
doctorRouter.post("/complete-appointment", authDoctor, appointmentComplete);

// list & availability
doctorRouter.get("/list", doctorList);
doctorRouter.post("/change-availability", authDoctor, changeAvailablity);

// ✅ update profile should be POST (not GET)
doctorRouter.post("/update-profile", authDoctor, updateDoctorProfile);

export default doctorRouter;

