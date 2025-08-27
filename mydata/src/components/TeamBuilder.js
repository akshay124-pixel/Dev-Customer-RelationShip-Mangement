import React, { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { motion } from "framer-motion";
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
} from "@mui/material";
import { FaTimes } from "react-icons/fa";

function TeamBuilder({ isOpen, onClose, userRole, userId }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isAssigned, setIsAssigned] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error("No authentication token found. Please log in.");
      }

      const [usersResponse, userResponse] = await Promise.all([
        axios
          .get(`${process.env.REACT_APP_URL}/api/fetch-team`, {
            headers: { Authorization: `Bearer ${token}` },
          })
          .catch((err) => {
            throw new Error(
              `Failed to fetch team: ${
                err.response?.data?.message || err.message
              }`
            );
          }),
        axios
          .get(`${process.env.REACT_APP_URL}/api/current-user`, {
            headers: { Authorization: `Bearer ${token}` },
          })
          .catch((err) => {
            throw new Error(
              `Failed to fetch current user: ${
                err.response?.data?.message || err.message
              }`
            );
          }),
      ]);

      console.log("Fetched users:", usersResponse.data);
      console.log("Current user:", userResponse.data);
      setUsers(usersResponse.data || []);
      setIsAssigned(userResponse.data?.data?.assignedAdmins?.length > 0);
    } catch (error) {
      console.error("Error fetching users:", {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
      });

      const friendlyMessage =
        error.message ||
        "Oops! Something went wrong while loading users. Please try again.";

      toast.error(friendlyMessage);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    if (isOpen) {
      fetchUsers();
    }
  }, [isOpen]);

  const handleAssign = async (userIdToAssign) => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error("No authentication token found");
      }
      const response = await axios.post(
        `${process.env.REACT_APP_URL}/api/assign-user`,
        { userId: userIdToAssign },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success(response.data.message);
      await fetchUsers();
    } catch (error) {
      console.error("Error assigning user:", error);
      const message =
        error.response?.data?.message ||
        "Something went wrong while assigning the user. Please try again.";
      toast.error(message);
    }
  };

  const handleUnassign = async (userIdToUnassign) => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error("No authentication token found");
      }
      const response = await axios.post(
        `${process.env.REACT_APP_URL}/api/unassign-user`,
        { userId: userIdToUnassign },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success(response.data.message);
      await fetchUsers();
    } catch (error) {
      console.error("Error unassigning user:", error);
      const message =
        error.response?.data?.message ||
        "Something went wrong while unassigning the user. Please try again.";
      toast.error(message);
    }
  };

  const buttonStyles = {
    base: {
      padding: "8px 16px",
      color: "white",
      borderRadius: "12px",
      border: "none",
      fontSize: "0.9rem",
      fontWeight: "bold",
      boxShadow: "0 2px 6px rgba(0,0,0,0.2)",
      transition: "all 0.2s ease",
      cursor: "pointer",
    },
    assign: {
      background: "linear-gradient(135deg, #2575fc, #6a11cb)",
    },
    assigned: {
      background: "linear-gradient(90deg, #cccccc, #999999)",
      cursor: "not-allowed",
    },
    unassign: {
      background: "linear-gradient(90deg, #ff4444, #cc0000)",
    },
  };

  if (!isOpen) return null;

  return (
    <Box
      sx={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        bgcolor: "rgba(0,0,0,0.7)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 1300,
        p: 2,
      }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.3 }}
        style={{
          width: "100%",
          display: "flex",
          justifyContent: "center",
        }}
      >
        <Paper
          sx={{
            width: { xs: "100%", sm: "95%", md: "85%", lg: "70%" },
            maxWidth: "1000px",
            p: { xs: 2, sm: 3, md: 4 },
            borderRadius: "15px",
            background: "linear-gradient(135deg, #2575fc, #6a11cb)",
            color: "white",
            position: "relative",
            boxShadow: "0 8px 24px rgba(0, 0, 0, 0.3)",
            maxHeight: "90vh",
            overflow: "auto",
          }}
        >
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              mb: 3,
            }}
          >
            <Typography
              variant="h5"
              sx={{
                fontWeight: "bold",
                letterSpacing: "1px",
                textTransform: "uppercase",
                textShadow: "0 1px 3px rgba(0, 0, 0, 0.2)",
              }}
            >
              Team Builder
            </Typography>
            <IconButton
              onClick={onClose}
              sx={{
                color: "white",
                "&:hover": { color: "#ff8e53" },
              }}
              aria-label="Close Team Builder"
            >
              <FaTimes size={24} />
            </IconButton>
          </Box>

          {loading ? (
            <Box
              sx={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                minHeight: "200px",
              }}
            >
              <Typography
                sx={{
                  fontSize: "1.2rem",
                  opacity: 0.8,
                  fontStyle: "italic",
                }}
              >
                Loading...
              </Typography>
            </Box>
          ) : users.length === 0 ? (
            <Box
              sx={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                minHeight: "200px",
              }}
            >
              <Typography
                sx={{
                  fontSize: "1.2rem",
                  opacity: 0.8,
                  fontStyle: "italic",
                }}
              >
                {userRole === "others" && isAssigned
                  ? "You are assigned to an admin"
                  : userRole === "others"
                  ? "No assigned admins available"
                  : "No users available to assign"}
              </Typography>
            </Box>
          ) : (
            <TableContainer
              sx={{
                background: "rgba(255, 255, 255, 0.1)",
                borderRadius: "10px",
                boxShadow: "0 4px 12px rgba(0, 0, 0, 0.2)",
                maxHeight: "60vh",
                overflowY: "auto",
                "&::-webkit-scrollbar": {
                  width: "8px",
                },
                "&::-webkit-scrollbar-track": {
                  background: "rgba(255, 255, 255, 0.1)",
                  borderRadius: "4px",
                },
                "&::-webkit-scrollbar-thumb": {
                  background: "rgba(255, 255, 255, 0.3)",
                  borderRadius: "4px",
                },
                "&::-webkit-scrollbar-thumb:hover": {
                  background: "rgba(255, 255, 255, 0.5)",
                },
              }}
            >
              <Table>
                <TableHead>
                  <TableRow>
                    {[
                      "Username",
                      "Email",
                      "Role",
                      "Assigned Admin(s)",
                      ...(userRole === "admin" || userRole === "superadmin"
                        ? ["Actions"]
                        : []),
                    ].map((header) => (
                      <TableCell
                        key={header}
                        sx={{
                          color: "white",
                          fontWeight: "bold",
                          fontSize: "1.1rem",
                          background: "#1a3c7a",
                          borderBottom: "1px solid rgba(255, 255, 255, 0.2)",
                          textAlign: "center",
                          py: 2,
                          position: "sticky",
                          top: 0,
                          zIndex: 1,
                        }}
                      >
                        {header}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {users.map((user, index) => {
                    const isAssignedToCurrent =
                      user.assignedAdmins?.includes(userId);
                    const isAssignedToOthers =
                      user.assignedAdmins?.length > 0 && !isAssignedToCurrent;
                    const isSuperAdmin = user.role === "superadmin";
                    const isAssignedBySuperAdmin = user.assignedAdmins?.some(
                      (adminId) => {
                        const admin = users.find((u) => u._id === adminId);
                        return admin?.role === "superadmin";
                      }
                    );

                    return (
                      <TableRow
                        key={user._id}
                        component={motion.tr}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                      >
                        <TableCell
                          sx={{
                            color: "white",
                            borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
                            textAlign: "center",
                            py: 1.5,
                          }}
                        >
                          {user.username || "N/A"}
                        </TableCell>
                        <TableCell
                          sx={{
                            color: "white",
                            borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
                            textAlign: "center",
                            py: 1.5,
                          }}
                        >
                          {user.email || "N/A"}
                        </TableCell>
                        <TableCell
                          sx={{
                            color: "white",
                            borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
                            textAlign: "center",
                            py: 1.5,
                          }}
                        >
                          {user.role || "N/A"}
                        </TableCell>
                        <TableCell
                          sx={{
                            color: "white",
                            borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
                            textAlign: "center",
                            py: 1.5,
                          }}
                        >
                          {user.assignedAdminUsernames || "Unassigned"}
                        </TableCell>
                        {(userRole === "admin" ||
                          userRole === "superadmin") && (
                          <TableCell
                            sx={{
                              borderBottom:
                                "1px solid rgba(255, 255, 255, 0.1)",
                              textAlign: "center",
                              py: 1.5,
                            }}
                          >
                            {isSuperAdmin ? (
                              <Typography
                                sx={{
                                  color: "white",
                                  fontSize: "0.9rem",
                                  fontStyle: "italic",
                                }}
                              >
                                Superadmin (No Actions)
                              </Typography>
                            ) : isAssignedToCurrent ? (
                              <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => handleUnassign(user._id)}
                                style={{
                                  ...buttonStyles.base,
                                  ...buttonStyles.unassign,
                                }}
                                aria-label={`Unassign ${user.username}`}
                              >
                                Unassign
                              </motion.button>
                            ) : isAssignedToOthers ? (
                              userRole === "superadmin" ||
                              (!isAssignedBySuperAdmin &&
                                userRole === "admin") ? (
                                <motion.button
                                  whileHover={{ scale: 1.05 }}
                                  whileTap={{ scale: 0.95 }}
                                  onClick={() => handleUnassign(user._id)}
                                  style={{
                                    ...buttonStyles.base,
                                    ...buttonStyles.unassign,
                                  }}
                                  aria-label={`Unassign ${user.username}`}
                                >
                                  Unassign
                                </motion.button>
                              ) : (
                                <motion.button
                                  style={{
                                    ...buttonStyles.base,
                                    ...buttonStyles.assigned,
                                  }}
                                  disabled
                                  aria-label={`${user.username} is assigned`}
                                >
                                  Assigned
                                </motion.button>
                              )
                            ) : (
                              <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => handleAssign(user._id)}
                                style={{
                                  ...buttonStyles.base,
                                  ...buttonStyles.assign,
                                }}
                                aria-label={`Assign ${user.username} to me`}
                              >
                                Assign to Me
                              </motion.button>
                            )}
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Paper>
      </motion.div>
    </Box>
  );
}

export default TeamBuilder;
