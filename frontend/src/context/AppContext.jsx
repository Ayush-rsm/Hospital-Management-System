import { createContext, useState, useEffect } from "react";
import axios from "axios";
import { toast } from "react-toastify";

export const AppContext = createContext();

const AppContextProvider = ({ children }) => {
  const backendUrl = import.meta.env.VITE_BACKEND_URL || "http://localhost:4000";
  const [token, setToken] = useState(localStorage.getItem("token") || "");
  const [userData, setUserData] = useState(null);
  const [doctors, setDoctors] = useState([]);

  // Axios instance
  const api = axios.create({ baseURL: backendUrl });

  // Request interceptor to add token
  api.interceptors.request.use(
    (config) => {
      if (token) config.headers.Authorization = `Bearer ${token}`;
      return config;
    },
    (error) => Promise.reject(error)
  );

  // Response interceptor for 401
  api.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error.response?.status === 401) {
        toast.error("Session expired. Please login again.");
        setToken("");
        setUserData(null);
        localStorage.removeItem("token");
      }
      return Promise.reject(error);
    }
  );

  // Fetch user profile
  const loadUserProfileData = async () => {
    if (!token) return;
    try {
      const { data } = await api.get("/api/user/profile");
      if (data.success) setUserData(data.user);
      else setUserData(null);
    } catch (err) {
      console.error("Error loading profile:", err);
      setUserData(null);
    }
  };

  // Fetch doctors
  const getDoctorsData = async () => {
    try {
      const { data } = await api.get("/api/doctor/list");
      if (data.success) setDoctors(data.doctors);
    } catch (err) {
      console.error(err);
    }
  };

  // Load doctors on mount
  useEffect(() => {
    getDoctorsData();
  }, []);

  // On token change, store & load profile
  useEffect(() => {
    if (token) {
      localStorage.setItem("token", token);
      loadUserProfileData();
    } else {
      localStorage.removeItem("token");
      setUserData(null);
    }
  }, [token]);

  return (
    <AppContext.Provider
      value={{
        backendUrl,
        token,
        setToken,
        userData,
        setUserData,
        doctors,
        getDoctorsData,
        api,
        loadUserProfileData, // ✅ Exposed here
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export default AppContextProvider;



