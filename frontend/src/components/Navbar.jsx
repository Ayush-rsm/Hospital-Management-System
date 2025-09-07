import React, { useContext, useEffect, useState } from "react";
import axios from "axios";
import { assets } from "../assets/assets";
import { NavLink, useNavigate } from "react-router-dom";
import { AppContext } from "../context/AppContext";
import { toast } from "react-toastify";

const Navbar = () => {
  const navigate = useNavigate();
  const { token, setToken, userData, setUserData } = useContext(AppContext);

  const [showMenu, setShowMenu] = useState(false);
  const [authMode, setAuthMode] = useState(null); // "register" or "login"
  const [formData, setFormData] = useState({ name: "", email: "", password: "" });

  const backendUrl = "http://localhost:4000";

  // ------------------- Logout -------------------
  const logout = () => {
    setToken(null);
    setUserData(null);
    localStorage.removeItem("token");
    navigate("/login");
  };

  // ------------------- Fetch profile -------------------
  const fetchProfile = async (loginToken) => {
    try {
      const res = await axios.get(`${backendUrl}/api/user/profile`, {
        headers: { Authorization: `Bearer ${loginToken}` },
      });
      if (res.data.success) setUserData(res.data.user);
    } catch (err) {
      console.error("Error fetching profile:", err.response?.data || err);
    }
  };

  // ------------------- Auto fetch profile if token exists -------------------
  useEffect(() => {
    const savedToken = localStorage.getItem("token");
    if (savedToken && !userData) {
      setToken(savedToken);
      fetchProfile(savedToken);
    }
  }, []);

  // ------------------- Handle input change -------------------
  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  // ------------------- Register -------------------
  const handleRegister = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.password) {
      return toast.error("Please fill all fields");
    }

    try {
      const res = await axios.post(`${backendUrl}/api/user/register`, formData);
      if (res.data.success) {
        toast.success("Account created!");
        // Auto login
        const loginRes = await axios.post(`${backendUrl}/api/user/login`, {
          email: formData.email,
          password: formData.password,
        });
        if (loginRes.data.success) {
          setToken(loginRes.data.token);
          localStorage.setItem("token", loginRes.data.token);
          await fetchProfile(loginRes.data.token);
          setAuthMode(null);
        }
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || "Registration failed");
    }
  };

  // ------------------- Login -------------------
  const handleLogin = async (e) => {
    e.preventDefault();
    if (!formData.email || !formData.password) {
      return toast.error("Please fill all fields");
    }

    try {
      const res = await axios.post(`${backendUrl}/api/user/login`, {
        email: formData.email,
        password: formData.password,
      });
      if (res.data.success) {
        setToken(res.data.token);
        localStorage.setItem("token", res.data.token);
        await fetchProfile(res.data.token);
        toast.success("Logged in successfully!");
        setAuthMode(null);
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || "Login failed");
    }
  };

  // ------------------- NavLink classes -------------------
  const linkClasses = ({ isActive }) =>
    `relative py-1 transition-colors duration-200 ${
      isActive ? "text-indigo-600 font-semibold" : "text-gray-700"
    } after:content-[''] after:absolute after:left-0 after:bottom-0 after:w-full after:h-[2px] after:bg-indigo-600 after:scale-x-0 after:origin-right after:transition-transform after:duration-300 hover:after:scale-x-100 hover:after:origin-left ${
      isActive ? "after:scale-x-100 after:origin-left" : ""
    }`;

  return (
    <div className="flex items-center justify-between text-sm py-4 mb-5 border-b border-gray-400">
      <img
        onClick={() => navigate("/")}
        className="w-44 cursor-pointer"
        src={assets.logo}
        alt="Logo"
      />

      {/* Desktop Menu */}
      <ul className="hidden md:flex items-start gap-5 font-medium">
        <NavLink to="/" className={linkClasses}>
          HOME
        </NavLink>
        <NavLink to="/doctors" className={linkClasses}>
          ALL DOCTORS
        </NavLink>
        <NavLink to="/about" className={linkClasses}>
          ABOUT
        </NavLink>
        <NavLink to="/contact" className={linkClasses}>
          CONTACT
        </NavLink>
      </ul>

      <div className="flex items-center gap-4">
        {token && userData ? (
          <div className="flex items-center gap-2 cursor-pointer group relative">
            <img
              className="w-8 h-8 rounded-full object-cover"
              src={userData.image || assets.default_user}
              alt=""
            />
            <img className="w-2.5" src={assets.dropdown_icon} alt="" />
            <div className="absolute top-0 right-0 pt-14 text-base font-medium text-gray-600 z-20 hidden group-hover:block">
              <div className="min-w-48 bg-stone-100 flex flex-col gap-4 p-4">
                <p
                  onClick={() => navigate("my-profile")}
                  className="hover:text-black cursor-pointer"
                >
                  My Profile
                </p>
                <p
                  onClick={() => navigate("my-appointments")}
                  className="hover:text-black cursor-pointer"
                >
                  My Appointments
                </p>
                <p onClick={logout} className="hover:text-black cursor-pointer">
                  Logout
                </p>
              </div>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setAuthMode("login")}
            className="bg-indigo-500 text-white px-8 py-3 rounded-full font-light"
          >
            Create Account
          </button>
        )}

        {/* Mobile Menu Button */}
        <img
          onClick={() => setShowMenu(true)}
          className="w-6 md:hidden cursor-pointer"
          src={assets.menu_icon}
          alt="Menu"
        />

        {/* Mobile Menu */}
        <div
          className={`${
            showMenu ? "fixed w-full" : "h-0 w-0"
          } md:hidden right-0 top-0 bottom-0 z-20 overflow-hidden bg-white transition-all`}
        >
          <div className="flex item-center justify-between px-5 py-6">
            <img className="w-36" src={assets.logo} alt="" />
            <img
              className="w-7 cursor-pointer"
              onClick={() => setShowMenu(false)}
              src={assets.cross_icon}
              alt="Close"
            />
          </div>
          <ul className="flex flex-col items-center gap-4 mt-5 px-5 text-lg font-medium">
            <NavLink onClick={() => setShowMenu(false)} to="/" className={linkClasses}>
              HOME
            </NavLink>
            <NavLink
              onClick={() => setShowMenu(false)}
              to="/doctors"
              className={linkClasses}
            >
              ALL DOCTORS
            </NavLink>
            <NavLink onClick={() => setShowMenu(false)} to="/about" className={linkClasses}>
              ABOUT
            </NavLink>
            <NavLink
              onClick={() => setShowMenu(false)}
              to="/contact"
              className={linkClasses}
            >
              CONTACT
            </NavLink>
          </ul>
        </div>
      </div>

      {/* Auth Modal */}
      {authMode && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-96">
            <h2 className="text-lg font-semibold mb-4">
              {authMode === "register" ? "Create Account" : "Login"}
            </h2>
            <form
              onSubmit={authMode === "register" ? handleRegister : handleLogin}
              className="flex flex-col gap-3"
            >
              {authMode === "register" && (
                <input
                  type="text"
                  name="name"
                  placeholder="Name"
                  value={formData.name}
                  onChange={handleChange}
                  className="border p-2 rounded"
                />
              )}
              <input
                type="email"
                name="email"
                placeholder="Email"
                value={formData.email}
                onChange={handleChange}
                className="border p-2 rounded"
              />
              <input
                type="password"
                name="password"
                placeholder="Password"
                value={formData.password}
                onChange={handleChange}
                className="border p-2 rounded"
              />
              <div className="flex gap-2 justify-end mt-4">
                <button
                  type="button"
                  onClick={() => setAuthMode(null)}
                  className="px-4 py-2 border rounded"
                >
                  Cancel
                </button>
                <button type="submit" className="bg-indigo-500 text-white px-4 py-2 rounded">
                  {authMode === "register" ? "Register" : "Login"}
                </button>
              </div>
            </form>
            <p className="text-sm text-gray-600 mt-3 text-center">
              {authMode === "register" ? (
                <>
                  Already have an account?{" "}
                  <span
                    onClick={() => setAuthMode("login")}
                    className="text-indigo-500 cursor-pointer"
                  >
                    Login
                  </span>
                </>
              ) : (
                <>
                  Don’t have an account?{" "}
                  <span
                    onClick={() => setAuthMode("register")}
                    className="text-indigo-500 cursor-pointer"
                  >
                    Create one
                  </span>
                </>
              )}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default Navbar;







