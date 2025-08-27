import React, { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "react-bootstrap";
import { FaBell } from "react-icons/fa";
import {
  Drawer,
  List,
  ListItem,
  ListItemText,
  Divider,
  Box,
  Typography,
  Badge,
  Button as MuiButton,
} from "@mui/material";
import axios from "axios";
import io from "socket.io-client";

const Navbar = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(
    !!localStorage.getItem("token")
  );
  const [userName, setUserName] = useState("User");
  const [userRole, setUserRole] = useState("");
  const [isDropdownOpen, setDropdownOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [notificationDrawerOpen, setNotificationDrawerOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationPage, setNotificationPage] = useState(1);
  const [hasMoreNotifications, setHasMoreNotifications] = useState(true);
  const navigate = useNavigate();
  const [socket, setSocket] = useState(null);

  // Function to update auth state from localStorage
  const updateAuthState = useCallback(() => {
    const token = localStorage.getItem("token");
    const user = JSON.parse(localStorage.getItem("user") || "{}");

    console.log("Navbar: Retrieved user from localStorage:", user);

    setIsAuthenticated(!!token);
    setUserName(user.username || "User");
    setUserRole(user.role || "");
  }, []);

  // Replace the Socket.IO useEffect block with this
  useEffect(() => {
    if (isAuthenticated) {
      const token = localStorage.getItem("token");
      const socketInstance = io(`${process.env.REACT_APP_URL}`, {
        auth: { token: `Bearer ${token}` },
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
      });

      socketInstance.on("connect", () => {
        console.log("Socket connected:", socketInstance.id);
      });

      socketInstance.on("newNotification", (notification) => {
        console.log("New notification received:", notification);
        setNotifications((prev) => {
          if (prev.some((n) => n._id === notification._id)) {
            console.log("Duplicate notification ignored:", notification._id);
            return prev;
          }
          return [notification, ...prev];
        });
        if (!notification.read) {
          setUnreadCount((prev) => prev + 1);
        }
      });

      socketInstance.on("notificationsCleared", () => {
        console.log("Notifications cleared via socket");
        setNotifications([]);
        setUnreadCount(0);
        setNotificationPage(1);
        setHasMoreNotifications(false);
      });

      socketInstance.on("connect_error", (error) => {
        console.error("Socket connection error:", error.message);
        if (error.message.includes("Authentication error")) {
          console.warn("Attempting to reconnect with new token");
          socketInstance.auth.token = `Bearer ${localStorage.getItem("token")}`;
          socketInstance.connect();
        }
      });

      socketInstance.on("error", (error) => {
        console.error("Socket error:", error.message);
      });

      setSocket(socketInstance);

      return () => {
        socketInstance.disconnect();
        console.log("Socket disconnected");
      };
    }
  }, [isAuthenticated]);

  // Fetch initial notifications
  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) return;
        const response = await axios.get(
          `${process.env.REACT_APP_URL}/api/notifications`,
          {
            headers: { Authorization: `Bearer ${token}` },
            params: { page: notificationPage, limit: 10 },
          }
        );
        const { data, pagination } = response.data;
        setNotifications((prev) =>
          notificationPage === 1 ? data : [...prev, ...data]
        );
        setUnreadCount(data.filter((n) => !n.read).length);
        setHasMoreNotifications(pagination.currentPage < pagination.totalPages);
      } catch (error) {
        console.error("Error fetching notifications:", error);
      }
    };

    if (isAuthenticated) {
      fetchNotifications();
    }
  }, [isAuthenticated, notificationPage]);

  // Run on mount and listen for storage/auth changes
  useEffect(() => {
    updateAuthState();

    const handleStorageChange = () => {
      console.log("Navbar: Storage event triggered");
      updateAuthState();
    };
    window.addEventListener("storage", handleStorageChange);

    const handleAuthChange = () => {
      console.log("Navbar: Auth change event triggered");
      updateAuthState();
    };
    window.addEventListener("authChange", handleAuthChange);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("authChange", handleAuthChange);
    };
  }, [updateAuthState]);

  const handleMarkAsRead = async (notificationIds) => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;
      await axios.post(
        `${process.env.REACT_APP_URL}/api/notificationsread`,
        { notificationIds },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setNotifications((prev) =>
        prev.map((n) =>
          notificationIds.includes(n._id) ? { ...n, read: true } : n
        )
      );
      setUnreadCount((prev) => prev - notificationIds.length);
    } catch (error) {
      console.error("Error marking notifications as read:", error);
    }
  };

  const handleClearNotifications = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;
      await axios.delete(
        `${process.env.REACT_APP_URL}/api/notificationsdelete`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      // Socket event will handle state update
    } catch (error) {
      console.error("Error clearing notifications:", error);
    }
  };

  const handleLoadMoreNotifications = () => {
    if (hasMoreNotifications) {
      setNotificationPage((prev) => prev + 1);
    }
  };

  const toggleNotificationDrawer = () => {
    setNotificationDrawerOpen((prev) => !prev);
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("userId");
    localStorage.removeItem("role");
    setIsAuthenticated(false);
    setUserName("User");
    setUserRole("");
    setNotifications([]);
    setUnreadCount(0);
    if (socket) socket.disconnect();
    window.dispatchEvent(new Event("authChange"));
    navigate("/login");
  };

  const handleOutsideClick = useCallback(
    (e) => {
      if (isDropdownOpen && !e.target.closest(".user-profile")) {
        setDropdownOpen(false);
      }
    },
    [isDropdownOpen]
  );

  useEffect(() => {
    document.addEventListener("click", handleOutsideClick);
    return () => document.removeEventListener("click", handleOutsideClick);
  }, [handleOutsideClick]);

  const renderNavLinks = () => {
    if (!isAuthenticated) return null;

    switch (userRole.toLowerCase()) {
      case "admin":
      case "superadmin":
        return (
          <div
            style={{
              display: "flex",
              gap: "1rem",
              transition: "all 0.3s ease",
            }}
          ></div>
        );
      case "others":
        return (
          <div
            style={{
              display: "flex",
              gap: "1rem",
              transition: "all 0.3s ease",
            }}
          ></div>
        );
      default:
        return null;
    }
  };

  // Format timestamp
  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleString("en-US", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  return (
    <>
      <style>
        {`
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(-10px); }
            to { opacity: 1; transform: translateY(0); }
          }
          @keyframes slideInLeft {
            from { transform: translateX(-20px); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
          }
          @keyframes slideInRight {
            from { transform: translateX(20px); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
          }
          .navbar {
            animation: fadeIn 0.5s ease-out;
            background: linear-gradient(135deg, #2575fc, #6a11cb);
          }
          .menu-toggle {
            display: none;
            cursor: pointer;
            padding: 0.25rem;
          }
          .menu-toggle svg {
            width: 20px;
            height: 20px;
            fill: white;
          }
          .navbar-notification {
            position: relative;
            display: flex;
            align-items: center;
            justify-content: center;
            width: 38px;
            height: 38px;
            border-radius: 50%;
            background: linear-gradient(90deg, rgba(255,255,255,0.2), transparent);
            cursor: pointer;
            transition: transform 0.2s ease, background 0.3s ease;
          }
          .navbar-notification:hover {
            transform: scale(1.1);
            background: white;
          }
          .navbar-notification .badge {
            position: absolute;
            top: -5px;
            right: -5px;
            font-size: 0.6rem;
            min-width: 16px;
            height: 16px;
            padding: 0 4px;
          }
          @media (max-width: 767px) {
            .navbar {
              flex-direction: column;
              align-items: stretch;
              padding: 0.5rem;
            }
            .navbar-logo {
              display: flex;
              justify-content: center;
              align-items: center;
              margin-bottom: 0.25rem;
            }
            .navbar-logo img {
              width: 160px !important;
              height: 65px !important;
              margin-left: 0 !important;
              margin-right: 0 !important;
            }
            .menu-toggle {
              display: block;
              position: absolute;
              right: 0.5rem;
            }
            .navbar-links {
              flex-direction: column;
              width: 100%;
              padding: 0.5rem;
              margin-top: 0.25rem;
              gap: 0.5rem;
              display: ${isMenuOpen ? "flex" : "none"};
            }
            .navbar-user {
              flex-direction: row;
              justify-content: space-between;
              align-items: center;
              width: 100%;
              padding: 0.25rem 0.5rem;
              gap: 0.5rem;
              flex-wrap: nowrap;
              height: 32px;
            }
            .user-profile {
              animation: slideInLeft 0.3s ease-out;
              order: 1;
            }
            .user-avatar {
              width: 28px !important;
              height: 28px !important;
              border-width: 1px !important;
            }
            .logout-btn {
              animation: slideInRight 0.3s ease-out;
              order: 2;
              width: auto !important;
              padding: 0.25rem 0.5rem !important;
              font-size: 0.75rem !important;
              margin: 0 !important;
              gap: 0.25rem;
              min-width: 45px;
              height: 45px !important;
              line-height: 1;
            }
            .logout-btn svg {
              width: 12px !important;
              height: 12px !important;
            }
            .navbar-user.auth-buttons {
              justify-content: center;
              flex-wrap: wrap;
              gap: 0.5rem;
            }
            .navbar-user .btn {
              order: 3;
              width: auto !important;
              margin: 0 auto !important;
              padding: 0.25rem 0.5rem !important;
              font-size: 0.75rem !important;
              min-width: 80px !important;
              height: 28px !important;
              line-height: 1;
              display: inline-flex;
              justify-content: center;
              align-items: center;
            }
            .navbar-notification {
              width: 28px;
              height: 28px;
            }
            .navbar-notification .badge {
              font-size: 0.5rem;
              min-width: 14px;
              height: 14px;
              padding: 0 3px;
            }
          }
        `}
      </style>
      <nav
        className="navbar"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "1rem",
          width: "100%",
          boxSizing: "border-box",
          boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
          transition: "all 0.3s ease",
        }}
        aria-label="Main navigation"
      >
        <div
          className="navbar-logo"
          style={{ display: "flex", alignItems: "center" }}
        >
          <img
            src="logo.png"
            alt="Company Logo"
            className="logo-image"
            style={{
              width: "110px",
              height: "auto",
              marginLeft: "20px",
              transition: "transform 0.3s ease",
            }}
            onError={(e) =>
              (e.target.src = "https://via.placeholder.com/130x40?text=Logo")
            }
            onMouseOver={(e) =>
              (e.currentTarget.style.transform = "scale(1.05)")
            }
            onMouseOut={(e) => (e.currentTarget.style.transform = "scale(1)")}
          />
          <button
            className="menu-toggle"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            style={{ display: "none" }}
            aria-label={isMenuOpen ? "Close menu" : "Open menu"}
          >
            <svg viewBox="0 0 24 24">
              <path
                d={
                  isMenuOpen
                    ? "M6 18L18 6M6 6l12 12"
                    : "M4 6h16M4 12h16M4 18h16"
                }
              />
            </svg>
          </button>
        </div>

        <div
          className="navbar-links"
          style={{
            display: "flex",
            gap: "1rem",
            transition: "all 0.3s ease",
          }}
        >
          {renderNavLinks()}
        </div>

        <div
          className={`navbar-user ${isAuthenticated ? "" : "auth-buttons"}`}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
            paddingRight: "1rem",
          }}
        >
          {isAuthenticated && (
            <button
              className="navbar-notification"
              onClick={toggleNotificationDrawer}
              aria-label="View notifications"
            >
              <FaBell size={16} color="white" />
              {unreadCount > 0 && (
                <Badge
                  badgeContent={unreadCount}
                  color="error"
                  classes={{ badge: "badge" }}
                />
              )}
            </button>
          )}
          {isAuthenticated ? (
            <>
              <div
                className="user-profile"
                style={{
                  display: "flex",
                  alignItems: "center",
                  position: "relative",
                  gap: "0.5rem",
                }}
                role="button"
                aria-label={`User profile for ${userName}`}
              >
                <img
                  src="avtar.jpg"
                  alt={`Avatar for ${userName}`}
                  className="user-avatar"
                  style={{
                    width: "40px",
                    height: "40px",
                    borderRadius: "50%",
                    border: "2px solid #90cdf4",
                    transition: "transform 0.3s ease, border-color 0.3s ease",
                    cursor: "pointer",
                  }}
                  onError={(e) =>
                    (e.target.src = "https://via.placeholder.com/40?text=User")
                  }
                  onMouseOver={(e) => {
                    e.currentTarget.style.transform = "scale(1.1)";
                    e.currentTarget.style.borderColor = "#e2e8f0";
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.transform = "scale(1)";
                    e.currentTarget.style.borderColor = "#90cdf4";
                  }}
                  onClick={() => setDropdownOpen(!isDropdownOpen)}
                />
                <span
                  style={{
                    color: "white",
                    fontSize: "1rem",
                    fontWeight: "500",
                  }}
                >
                  Hello, {userName}
                </span>
                {isDropdownOpen && (
                  <div
                    style={{
                      position: "absolute",
                      top: "100%",
                      right: 0,
                      backgroundColor: "white",
                      border: "none",
                      borderRadius: "12px",
                      boxShadow: "0 10px 25px rgba(0, 0, 0, 0.15)",
                      zIndex: 1000,
                      minWidth: "220px",
                      marginTop: "8px",
                      overflow: "hidden",
                      animation: "fadeIn 0.2s ease-out",
                    }}
                  >
                    <div
                      style={{
                        padding: "16px 20px",
                        cursor: "pointer",
                        color: "#2d3748",
                        fontSize: "14px",
                        fontWeight: "500",
                        borderBottom: "1px solid #f1f5f9",
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                        transition: "all 0.2s ease",
                      }}
                      onClick={() => {
                        navigate("/change-password");
                        setDropdownOpen(false);
                      }}
                      onMouseOver={(e) => {
                        e.currentTarget.style.backgroundColor = "#f8fafc";
                        e.currentTarget.style.color = "#2563eb";
                        e.currentTarget.style.transform = "translateX(2px)";
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.backgroundColor = "white";
                        e.currentTarget.style.color = "#2d3748";
                        e.currentTarget.style.transform = "translateX(0)";
                      }}
                    >
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l2.5 2.5L15.5 7.5m0 0l2.5-2.5"></path>
                      </svg>
                      Change Password
                    </div>
                    <div
                      style={{
                        padding: "16px 20px",
                        cursor: "pointer",
                        color: "#2d3748",
                        fontSize: "14px",
                        fontWeight: "500",
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                        transition: "all 0.2s ease",
                      }}
                      onClick={() => {
                        handleLogout();
                        setDropdownOpen(false);
                      }}
                      onMouseOver={(e) => {
                        e.currentTarget.style.backgroundColor = "#fef2f2";
                        e.currentTarget.style.color = "#dc2626";
                        e.currentTarget.style.transform = "translateX(2px)";
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.backgroundColor = "white";
                        e.currentTarget.style.color = "#2d3748";
                        e.currentTarget.style.transform = "translateX(0)";
                      }}
                    >
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                        <polyline points="16 17 21 12 16 7"></polyline>
                        <line x1="21" y1="12" x2="9" y2="12"></line>
                      </svg>
                      Logout
                    </div>
                  </div>
                )}
              </div>
              <button className="Btn mx-3 logout-btn" onClick={handleLogout}>
                <div className="sign">
                  <svg viewBox="0 0 512 512">
                    <path d="M377.9 105.9L500.7 228.7c7.2 7.2 11.3 17.1 11.3 27.3s-4.1 20.1-11.3 27.3L377.9 406.1c-6.4 6.4-15 9.9-24 9.9c-18.7 0-33.9-15.2-33.9-33.9l0-62.1-128 0c-17.7 0-32-14.3-32-32l0-64c0-17.7 14.3-32 32-32l128 0 0-62.1c0-18.7 15.2-33.9 33.9-33.9c9 0 17.6 3.6 24 9.9zM160 96L96 96c-17.7 0-32 14.3-32 32l0 256c0 17.7 14.3 32 32 32l64 0c17.7 0 32 14.3 32 32s-14.3 32-32 32l-64 0c-53 0-96-43-96-96L0 128C0 75 43 32 96 32l64 0c17.7 0 32 14.3 32 32s-14.3 32-32 32z"></path>
                  </svg>
                </div>
                <div className="text">Logout</div>
              </button>
            </>
          ) : (
            <>
              <Button
                as={Link}
                to="/login"
                variant="outline-light"
                className="btn"
                style={{
                  borderRadius: "20px",
                  padding: "5px 15px",
                  fontWeight: "600",
                  minWidth: "100px",
                  height: "38px",
                  border: "1px solid white",
                  color: "white",
                  background:
                    "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.1) 100%)",
                  margin: "0 0.5rem",
                  cursor: "pointer",
                  transition:
                    "transform 0.2s ease, background 0.3s ease, box-shadow 0.2s ease",
                  boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
                  textAlign: "center",
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.transform = "scale(1.05)";
                  e.currentTarget.style.background = "white";
                  e.currentTarget.style.color = "#2b6cb0";
                  e.currentTarget.style.boxShadow = "0 4px 8px rgba(0,0,0,0.3)";
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.transform = "scale(1)";
                  e.currentTarget.style.background =
                    "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.1) 100%)";
                  e.currentTarget.style.color = "white";
                  e.currentTarget.style.boxShadow = "0 2px 4px rgba(0,0,0,0.2)";
                }}
                onFocus={(e) => {
                  e.currentTarget.style.outline = "2px solid #e2e8f0";
                  e.currentTarget.style.outlineOffset = "2px";
                }}
                onBlur={(e) => (e.currentTarget.style.outline = "none")}
                aria-label="Log in"
              >
                Login
              </Button>
              <Button
                as={Link}
                to="/signup"
                variant="outline-warning"
                className="btn"
                style={{
                  borderRadius: "20px",
                  padding: "5px 15px",
                  fontWeight: "600",
                  minWidth: "100px",
                  height: "38px",
                  border: "1px solid #ecc94b",
                  color: "#ecc94b",
                  background:
                    "linear-gradient(90deg, transparent 0%, rgba(236,201,75,0.2) 100%)",
                  margin: "0 0.5rem",
                  cursor: "pointer",
                  transition:
                    "transform 0.2s ease, background 0.3s ease, box-shadow 0.2s ease",
                  boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
                  textAlign: "center",
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.transform = "scale(1.05)";
                  e.currentTarget.style.background = "#ecc94b";
                  e.currentTarget.style.color = "#2b6cb0";
                  e.currentTarget.style.boxShadow = "0 4px 8px rgba(0,0,0,0.3)";
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.transform = "scale(1)";
                  e.currentTarget.style.background =
                    "linear-gradient(90deg, transparent 0%, rgba(236,201,75,0.2) 100%)";
                  e.currentTarget.style.color = "#ecc94b";
                  e.currentTarget.style.boxShadow = "0 2px 4px rgba(0,0,0,0.2)";
                }}
                onFocus={(e) => {
                  e.currentTarget.style.outline = "2px solid #ecc94b";
                  e.currentTarget.style.outlineOffset = "2px";
                }}
                onBlur={(e) => (e.currentTarget.style.outline = "none")}
                aria-label="Sign up"
              >
                Sign Up
              </Button>
            </>
          )}
        </div>
      </nav>
      <Drawer
        anchor="right"
        open={notificationDrawerOpen}
        onClose={toggleNotificationDrawer}
        sx={{
          "& .MuiDrawer-paper": {
            width: { xs: "80%", sm: "400px" },
            bgcolor: "#f5f7fa",
            borderLeft: "2px solid #2575fc",
            boxShadow: "0 6px 18px rgba(0, 0, 0, 0.1)",
          },
        }}
      >
        <Box
          sx={{
            p: 2,
            display: "flex",
            flexDirection: "column",
            height: "100%",
          }}
        >
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              mb: 2,
            }}
          >
            <Typography variant="h6" sx={{ fontWeight: "bold", color: "#333" }}>
              Notifications
            </Typography>
            <MuiButton
              variant="text"
              onClick={toggleNotificationDrawer}
              sx={{
                color: "#666",
                fontSize: "1.2rem",
                minWidth: "auto",
                "&:hover": { color: "#2575fc" },
              }}
            >
              ✕
            </MuiButton>
          </Box>
          <Box sx={{ display: "flex", gap: 1, mb: 2 }}>
            <MuiButton
              variant="contained"
              onClick={() =>
                handleMarkAsRead(
                  notifications.filter((n) => !n.read).map((n) => n._id)
                )
              }
              disabled={unreadCount === 0}
              sx={{
                flex: 1,
                background: "linear-gradient(135deg, #2575fc, #6a11cb)",
                color: "white",
                borderRadius: "12px",
                fontWeight: "bold",
                "&:hover": {
                  background: "linear-gradient(135deg, #6a11cb, #2575fc)",
                },
              }}
            >
              Mark All as Read
            </MuiButton>
            <MuiButton
              variant="contained"
              onClick={handleClearNotifications}
              disabled={notifications.length === 0}
              sx={{
                flex: 1,
                background: "linear-gradient(135deg, #ff4d4f, #cf1322)",
                color: "white",
                borderRadius: "12px",
                fontWeight: "bold",
                "&:hover": {
                  background: "linear-gradient(135deg, #cf1322, #ff4d4f)",
                },
              }}
            >
              Clear All
            </MuiButton>
          </Box>
          <Divider sx={{ mb: 2, bgcolor: "#ddd" }} />
          <Box sx={{ flex: 1, overflowY: "auto" }}>
            <List>
              {notifications.length === 0 ? (
                <ListItem>
                  <ListItemText
                    primary="No notifications"
                    primaryTypographyProps={{
                      color: "#666",
                      textAlign: "center",
                    }}
                  />
                </ListItem>
              ) : (
                notifications.map((notification) => (
                  <ListItem
                    key={notification._id}
                    button
                    onClick={() => {
                      if (notification.entryId) {
                        navigate(
                          `/dashboard?entryId=${notification.entryId._id}`
                        );
                        toggleNotificationDrawer();
                      }
                      if (!notification.read) {
                        handleMarkAsRead([notification._id]);
                      }
                    }}
                    sx={{
                      bgcolor: notification.read
                        ? "transparent"
                        : "rgba(37, 117, 252, 0.1)",
                      mb: 1,
                      borderRadius: "8px",
                      "&:hover": {
                        bgcolor: "rgba(37, 117, 252, 0.2)",
                      },
                      transition: "all 0.3s ease",
                    }}
                  >
                    <ListItemText
                      primary={notification.message}
                      secondary={formatTimestamp(notification.timestamp)}
                      primaryTypographyProps={{
                        fontWeight: notification.read ? "normal" : "bold",
                        fontSize: "0.9rem",
                        color: "#333",
                      }}
                      secondaryTypographyProps={{
                        fontSize: "0.8rem",
                        color: "#555",
                      }}
                    />
                  </ListItem>
                ))
              )}
            </List>
          </Box>
          {hasMoreNotifications && (
            <MuiButton
              fullWidth
              variant="outlined"
              onClick={handleLoadMoreNotifications}
              sx={{
                mt: 2,
                borderColor: "#2575fc",
                color: "#2575fc",
                borderRadius: "12px",
                "&:hover": {
                  bgcolor: "rgba(37, 117, 252, 0.1)",
                  borderColor: "#6a11cb",
                },
              }}
            >
              Load More
            </MuiButton>
          )}
        </Box>
      </Drawer>
    </>
  );
};

export default Navbar;
