import React, { useContext, useEffect } from 'react';
import { DoctorContext } from '../../context/DoctorContext';
import { AppContext } from '../../context/AppContext';
import { assets } from '../../assets/assets';

const DoctorDashboard = () => {
  const { dToken, dashData, getDashData, cancelAppointment, completeAppointment } = useContext(DoctorContext);
  const { slotDateFormat, currency } = useContext(AppContext);

  useEffect(() => {
    if (dToken) {
      getDashData();
    }
  }, [dToken]);

  if (!dashData) return <p className="text-center mt-10">Loading...</p>;

  // 🔹 Helper to calculate age from dob
  const calculateAge = (dob) => {
    if (!dob) return null;
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  return (
    <div className='m-5'>
      {/* Summary Cards */}
      <div className='flex flex-wrap gap-3'>
        <div className='flex items-center gap-2 bg-white p-4 min-w-52 rounded border-2 border-gray-100 cursor-pointer hover:scale-105 transition-all'>
          <img className='w-14' src={assets.earning_icon} alt="Earnings" />
          <div>
            <p className='text-xl font-semibold text-gray-600'>{currency} {dashData.earnings}</p>
            <p className='text-gray-400'>Earnings</p>
          </div>
        </div>
        <div className='flex items-center gap-2 bg-white p-4 min-w-52 rounded border-2 border-gray-100 cursor-pointer hover:scale-105 transition-all'>
          <img className='w-14' src={assets.appointments_icon} alt="Appointments" />
          <div>
            <p className='text-xl font-semibold text-gray-600'>{dashData.appointments}</p>
            <p className='text-gray-400'>Appointments</p>
          </div>
        </div>
        <div className='flex items-center gap-2 bg-white p-4 min-w-52 rounded border-2 border-gray-100 cursor-pointer hover:scale-105 transition-all'>
          <img className='w-14' src={assets.patients_icon} alt="Patients" />
          <div>
            <p className='text-xl font-semibold text-gray-600'>{dashData.patients}</p>
            <p className='text-gray-400'>Patients</p>
          </div>
        </div>
      </div>

      {/* Latest Bookings */}
      <div className='bg-white mt-10 rounded shadow'>
        <div className='flex items-center gap-2.5 px-4 py-4 rounded-t border-b'>
          <img src={assets.list_icon} alt="List Icon" />
          <p className='font-semibold'>Latest Bookings</p>
        </div>

        <div className='pt-4'>
          {dashData.latestAppointments?.length > 0 ? (
            dashData.latestAppointments.map((item, index) => {
              const age = calculateAge(item.userId?.dob);
              return (
                <div key={index} className='flex items-center px-6 py-3 gap-3 hover:bg-gray-100'>
                  <img
                    className='rounded-full w-10 h-10 object-cover'
                    src={item.userData?.image || assets.default_avatar}
                    alt={item.userData?.name || "User"}
                  />
                  <div className='flex-1 text-sm'>
                    <p className='text-gray-800 font-medium'>
                      {item.userData?.name || 'Unknown'}
                      {age !== null && <span className="text-gray-500 text-xs ml-2">({age} yrs)</span>}
                    </p>
                    <p className='text-gray-600'>Booking on {slotDateFormat(item.slotDate)}</p>
                  </div>
                  {item.cancelled ? (
                    <p className='text-red-400 text-xs font-medium'>Cancelled</p>
                  ) : item.isCompleted ? (
                    <p className='text-green-500 text-xs font-medium'>Completed</p>
                  ) : (
                    <div className='flex gap-2'>
                      <img
                        onClick={() => cancelAppointment(item._id)}
                        className='w-10 cursor-pointer'
                        src={assets.cancel_icon}
                        alt="Cancel"
                      />
                      <img
                        onClick={() => completeAppointment(item._id)}
                        className='w-10 cursor-pointer'
                        src={assets.tick_icon}
                        alt="Complete"
                      />
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <p className='text-gray-400 text-center py-4'>No latest bookings</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default DoctorDashboard;

