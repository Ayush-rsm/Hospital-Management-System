import React, { useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppContext } from "../context/AppContext";
import { toast } from "react-toastify";
import { assets } from "../assets/assets";

const MyAppointments = () => {
  const { api, token } = useContext(AppContext);
  const navigate = useNavigate();

  const [appointments, setAppointments] = useState([]);
  const [payment, setPayment] = useState("");

  const months = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];

 const slotDateFormat = (slotDate) => {
  if (!slotDate) return "";
  const parts = slotDate.includes("_") ? slotDate.split("_") : slotDate.split("-");
  const [day, month, year] = parts;
  const months = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
  ];
  return `${day} ${months[Number(month) - 1]} ${year}`;
};


  // Fetch appointments
  const getUserAppointments = async () => {
    if (!token) return;
    try {
      const { data } = await api.get("/api/user/appointments");
      if (data.success) {
        setAppointments(data.appointments);
      } else {
        setAppointments([]);
        toast.error(data.message || "No appointments found.");
      }
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || error.message);
    }
  };

  // Cancel appointment
  const cancelAppointment = async (appointmentId) => {
    try {
      const { data } = await api.post("/api/user/cancel-appointment", { appointmentId });
      if (data.success) {
        toast.success(data.message);
        getUserAppointments();
      } else {
        toast.error(data.message || "Cancel failed.");
      }
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || error.message);
    }
  };

  // Razorpay payment
  const initRazorpayPay = (order) => {
    const options = {
      key: import.meta.env.VITE_RAZORPAY_KEY_ID,
      amount: order.amount,
      currency: order.currency,
      name: "Appointment Payment",
      description: "Appointment Payment",
      order_id: order.id,
      handler: async (response) => {
        try {
          const { data } = await api.post("/api/user/verify-razorpay", response);
          if (data.success) {
            toast.success("Payment successful!");
            getUserAppointments();
          }
        } catch (error) {
          console.error(error);
          toast.error(error.response?.data?.message || error.message);
        }
      },
    };
    const rzp = new window.Razorpay(options);
    rzp.open();
  };

  const payWithRazorpay = async (appointmentId) => {
    try {
      const { data } = await api.post("/api/user/payment-razorpay", { appointmentId });
      if (data.success) initRazorpayPay(data.order);
      else toast.error(data.message || "Payment failed");
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || error.message);
    }
  };

  const payWithStripe = async (appointmentId) => {
    try {
      const { data } = await api.post("/api/user/payment-stripe", { appointmentId });
      if (data.success) window.location.replace(data.session_url);
      else toast.error(data.message || "Payment failed");
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || error.message);
    }
  };

  useEffect(() => {
    if (token) getUserAppointments();
  }, [token]);

  return (
    <div className="mt-12">
      <p className="pb-3 text-lg font-medium text-gray-600 border-b">My Appointments</p>
      <div className="mt-4">
        {appointments.length === 0 ? (
          <p className="text-gray-500">No appointments found.</p>
        ) : (
          appointments.map((item) => (
            <div key={item._id} className="grid grid-cols-[1fr_2fr] gap-4 sm:flex sm:gap-6 py-4 border-b">
              {/* Doctor Image */}
              <div>
                <img
                  className="w-36 bg-[#EAEFFF]"
                  src={item.docData?.image || "/default.png"}
                  alt={item.docData?.name || "Doctor"}
                />
              </div>

              {/* Doctor & Appointment Details */}
              <div className="flex-1 text-sm text-[#5E5E5E]">
                <p className="text-[#262626] text-base font-semibold">{item.docData?.name || "Unknown Doctor"}</p>
                <p>{item.docData?.speciality || "N/A"}</p>
                <p className="text-[#464646] font-medium mt-1">Address:</p>
                <p>{item.docData?.address?.line1 || "N/A"}</p>
                <p>{item.docData?.address?.line2 || ""}</p>
                <p className="mt-1">
                  <span className="text-sm text-[#3C3C3C] font-medium">Date & Time:</span> {slotDateFormat(item.slotDate) || "N/A"} | {item.slotTime || "N/A"}
                </p>
              </div>

              {/* Payment / Cancel Buttons */}
              <div className="flex flex-col gap-2 justify-end text-sm text-center">
                {!item.cancelled && !item.payment && !item.isCompleted && payment !== item._id && (
                  <button
                    onClick={() => setPayment(item._id)}
                    className="text-[#696969] sm:min-w-48 py-2 border rounded hover:bg-green-500 hover:text-white transition-all duration-300"
                  >
                    Pay Online
                  </button>
                )}

                {!item.cancelled && !item.payment && !item.isCompleted && payment === item._id && (
                  <>
                    <button
                      onClick={() => payWithStripe(item._id)}
                      className="text-[#696969] sm:min-w-48 py-2 border rounded hover:bg-gray-100 hover:text-white transition-all duration-300 flex items-center justify-center"
                    >
                      <img className="max-w-20 max-h-5" src={assets.stripe_logo} alt="Stripe" />
                    </button>
                    <button
                      onClick={() => payWithRazorpay(item._id)}
                      className="text-[#696969] sm:min-w-48 py-2 border rounded hover:bg-gray-100 hover:text-white transition-all duration-300 flex items-center justify-center"
                    >
                      <img className="max-w-20 max-h-5" src={assets.razorpay_logo} alt="Razorpay" />
                    </button>
                  </>
                )}

                {!item.cancelled && item.payment && !item.isCompleted && (
                  <button className="sm:min-w-48 py-2 border rounded text-[#696969] bg-[#EAEFFF]">Paid</button>
                )}

                {item.isCompleted && (
                  <button className="sm:min-w-48 py-2 border border-green-500 rounded text-green-500">Completed</button>
                )}

                {!item.cancelled && !item.isCompleted && (
                  <button
                    onClick={() => cancelAppointment(item._id)}
                    className="text-[#696969] sm:min-w-48 py-2 border rounded hover:bg-red-600 hover:text-white transition-all duration-300"
                  >
                    Cancel Appointment
                  </button>
                )}

                {item.cancelled && !item.isCompleted && (
                  <button className="sm:min-w-48 py-2 border border-red-500 rounded text-red-500">Appointment Cancelled</button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default MyAppointments;





































