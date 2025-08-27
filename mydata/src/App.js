import React, { useState, useEffect } from "react";
import "./App.css";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useLocation,
  useNavigate,
} from "react-router-dom";
import DashBoard from "./components/DashBoard";
import ChangePassword from "./Auth/ChangePassword";
import Login from "./Auth/Login";
import SignUp from "./Auth/SignUp";
import Navbar from "./components/Navbar";
import axios from "axios";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "bootstrap/dist/css/bootstrap.min.css";

const ConditionalNavbar = ({ isAuthenticated, onLogout }) => {
  const location = useLocation();
  const isAuthPage =
    location.pathname === "/login" ||
    location.pathname === "/signup" ||
    location.pathname === "/change-password";

  return !isAuthPage && isAuthenticated ? <Navbar onLogout={onLogout} /> : null;
};

const PrivateRoute = ({ element, isAuthenticated }) => {
  const location = useLocation();
  const token = localStorage.getItem("token");
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const hasValidAuth = !!(token && user.email);

  console.log("PrivateRoute: Checking access", {
    path: location.pathname,
    hasToken: !!token,
    hasUserEmail: !!user.email,
    isAuthenticated: isAuthenticated,
    hasValidAuth: hasValidAuth,
  });

  // For all protected routes, check if we have valid authentication
  if (hasValidAuth) {
    console.log("PrivateRoute: Allowing access to", location.pathname);
    return element;
  } else {
    console.log("PrivateRoute: No valid auth, redirecting to login");
    return <Navigate to="/login" replace />;
  }
};

const AppContent = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(
    !!localStorage.getItem("token")
  );
  const navigate = useNavigate();

  const handleAuthSuccess = ({ token, user }) => {
    console.log(
      "handleAuthSuccess: User authenticated, setting token and user"
    );
    localStorage.setItem("token", token);
    localStorage.setItem("user", JSON.stringify(user));
    setIsAuthenticated(true);
    window.dispatchEvent(new Event("authChange"));
    navigate("/dashboard");
  };

  const handleLogout = () => {
    console.log(
      "handleLogout: Clearing localStorage and redirecting to /login"
    );
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setIsAuthenticated(false);
    navigate("/login");
  };

  useEffect(() => {
    const validateToken = async () => {
      const token = localStorage.getItem("token");
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      const role = user?.role;

      console.log("validateToken: Checking token and role", {
        hasToken: !!token,
        hasUser: !!user.email,
        role: role,
        currentPath: window.location.pathname,
      });

      // If we have token and user data, set authenticated immediately
      if (token && user.email) {
        console.log(
          "validateToken: Token and user data found, setting authenticated"
        );
        setIsAuthenticated(true);

        // Only validate with server for protected routes (not auth pages)
        if (
          !["/login", "/signup", "/change-password"].includes(
            window.location.pathname
          )
        ) {
          try {
            const response = await axios.get(
              `${process.env.REACT_APP_URL}/auth/verify-token`,
              {
                headers: { Authorization: `Bearer ${token}` },
              }
            );
            console.log("validateToken: Server validation successful");
          } catch (error) {
            console.error("validateToken: Server validation failed:", error);
            // Only clear data and redirect for non-auth pages
            if (
              !["/login", "/signup", "/change-password"].includes(
                window.location.pathname
              )
            ) {
              toast.error("Session expired. Please log in again.", {
                position: "top-right",
                autoClose: 3000,
                theme: "colored",
              });
              localStorage.removeItem("token");
              localStorage.removeItem("user");
              setIsAuthenticated(false);
              navigate("/login");
            }
          }
        }
        return;
      }

      // No token or user data
      console.log("validateToken: No token or user data found");
      setIsAuthenticated(false);

      // Only redirect if not on auth pages
      if (!["/login", "/signup"].includes(window.location.pathname)) {
        navigate("/login");
      }
    };

    validateToken();

    // Listen for authChange events
    const handleAuthChange = () => {
      const token = localStorage.getItem("token");
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      const isAuth = !!(token && user.email);
      setIsAuthenticated(isAuth);
      console.log("authChange: Updated isAuthenticated to", isAuth);
    };

    window.addEventListener("authChange", handleAuthChange);
    return () => window.removeEventListener("authChange", handleAuthChange);
  }, [navigate]);

  return (
    <>
      <ToastContainer />
      <ConditionalNavbar
        isAuthenticated={isAuthenticated}
        onLogout={handleLogout}
      />
      <Routes>
        <Route
          path="/login"
          element={<Login onAuthSuccess={handleAuthSuccess} />}
        />
        <Route
          path="/signup"
          element={<SignUp onAuthSuccess={handleAuthSuccess} />}
        />
        <Route
          path="/change-password"
          element={
            <PrivateRoute
              element={<ChangePassword />}
              isAuthenticated={isAuthenticated}
            />
          }
        />
        <Route
          path="/dashboard"
          element={
            <PrivateRoute
              element={<DashBoard />}
              isAuthenticated={isAuthenticated}
            />
          }
        />
        <Route
          path="/"
          element={
            isAuthenticated ? (
              <Navigate to="/dashboard" replace />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </>
  );
};

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

export default App;
