import React, { useState, useEffect, useCallback, useMemo } from "react";
import PropTypes from "prop-types";
import { motion } from "framer-motion";
import { Drawer, Box, Typography, IconButton, TextField } from "@mui/material";
import { FaTimes, FaSearch } from "react-icons/fa";
import axios from "axios";
import { toast } from "react-toastify";
import * as XLSX from "xlsx";
import DOMPurify from "dompurify";

const AdminDrawer = ({ entries, isOpen, onClose, role, userId, dateRange }) => {
  const [userStats, setUserStats] = useState([]);
  const [loading, setLoading] = useState(false);
  const [debugInfo, setDebugInfo] = useState(null);
  const [cachedUsers, setCachedUsers] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");

  // Normalize ID from various formats
  const normalizeId = (idObj) => {
    if (!idObj) return null;
    return (
      idObj.$oid?.toString() || idObj.toString() || idObj.id?.toString() || null
    );
  };

  // Filter entries based on date range
  const filteredEntries = useMemo(() => {
    if (!dateRange?.[0]?.startDate || !dateRange?.[0]?.endDate) {
      console.warn("Invalid date range, using all entries");
      return entries;
    }

    const startDate = new Date(dateRange[0].startDate);
    const endDate = new Date(dateRange[0].endDate);
    if (isNaN(startDate) || isNaN(endDate)) {
      console.warn("Invalid date range values:", dateRange);
      return entries;
    }

    return entries.filter((entry) => {
      const createdAt = new Date(entry.createdAt);
      return (
        !isNaN(createdAt) && createdAt >= startDate && createdAt <= endDate
      );
    });
  }, [entries, dateRange]);

  // Fetch users with caching
  const fetchUsers = useCallback(async () => {
    if (cachedUsers) {
      console.log("Using cached users:", cachedUsers.length);
      return cachedUsers;
    }

    setLoading(true);
    setDebugInfo(null);
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        setDebugInfo("You are not logged in. Please log in to view users.");
        toast.error("Please log in to access user data.");
        return [];
      }

      let allUsers = [];
      const apiUrl =
        role === "superadmin"
          ? `${process.env.REACT_APP_URL}/api/allusers`
          : `${process.env.REACT_APP_URL}/api/users`;
      let page = 1;
      let hasMore = true;

      while (hasMore) {
        try {
          const response = await axios.get(apiUrl, {
            headers: { Authorization: `Bearer ${token}` },
            params: { limit: 100, page },
            timeout: 10000,
          });

          const normalizedPage = response.data.map((user) => ({
            _id: normalizeId(user._id) || normalizeId(user.id) || "",
            username: DOMPurify.sanitize(user.username || "Unknown"),
            role:
              typeof user.role === "string"
                ? user.role.toLowerCase()
                : "unknown",
            assignedAdmins: Array.isArray(user.assignedAdmins)
              ? user.assignedAdmins.map(normalizeId).filter(Boolean)
              : [],
          }));

          allUsers = [...allUsers, ...normalizedPage];
          hasMore = response.data.length === 100;
          page += 1;
        } catch (pageError) {
          console.error(`Error fetching page ${page}:`, pageError);
          setDebugInfo(
            `Problem loading user data (page ${page}). Please try again later.`
          );
          toast.error("Unable to load all users. Showing partial data.");
          break;
        }
      }

      if (!allUsers.length) {
        setDebugInfo("No users fetched from API");
        return [];
      }

      console.log("Normalized Users:", allUsers.length);

      // Filter relevant users
      let relevantUsers;
      if (role === "superadmin") {
        relevantUsers = allUsers.filter(
          (u) => u.role === "admin" || u.role === "others"
        );
      } else if (role === "admin") {
        relevantUsers = allUsers.filter(
          (user) =>
            user._id === userId ||
            (user.assignedAdmins?.includes(userId) && user.role === "others")
        );
      } else {
        relevantUsers = allUsers.filter((user) => user._id === userId);
      }

      if (!relevantUsers.length) {
        setDebugInfo(`No users matched your access level (${role}).`);
        toast.info("No users found for your access level.");
      }

      setCachedUsers(relevantUsers);
      return relevantUsers;
    } catch (error) {
      console.error("Error fetching users:", error);
      setDebugInfo(
        "There was a problem loading users. Please try again later."
      );
      toast.error("Could not load users right now. Please try again later.");
      return [];
    } finally {
      setLoading(false);
    }
  }, [role, userId, cachedUsers]);

  // Update the calculateStats function
  const calculateStats = useCallback(async () => {
    const users = await fetchUsers();
    if (!users.length) {
      setUserStats([]);
      setDebugInfo("No relevant users found");
      return;
    }

    if (!filteredEntries.length) {
      setUserStats([]);
      setDebugInfo("No entries found for the selected date range");
      return;
    }

    console.log("Filtered Entries Count:", filteredEntries.length);

    const statsMap = {};
    const processedEntryIds = new Set();

    filteredEntries.forEach((entry) => {
      if (!entry._id || processedEntryIds.has(entry._id)) return;
      processedEntryIds.add(entry._id);

      const creatorId = normalizeId(entry.createdBy?._id || entry.createdBy);
      if (!creatorId) {
        console.warn(`No valid creatorId for entry ${entry._id}`);
        return;
      }

      const user = users.find((u) => u._id === creatorId);
      if (!user) {
        console.warn(`User ${creatorId} not found for entry ${entry._id}`);
        return;
      }

      if (!statsMap[creatorId]) {
        let displayName = user.username;
        if (role === "superadmin" && user.role === "admin") {
          displayName = `${user.username} (Admin)`;
        } else if (role === "superadmin" && user.role === "others") {
          displayName = user.username;
        } else if (creatorId === userId && role === "admin") {
          displayName = `${user.username} (Admin)`;
        }
        statsMap[creatorId] = {
          _id: creatorId,
          username: displayName,
          allTimeEntries: 0,
          monthEntries: 0,
          totalVisits: 0,
          cold: 0,
          warm: 0,
          hot: 0,
          closedWon: 0,
          closedLost: 0,
        };
      }

      statsMap[creatorId].allTimeEntries += 1;
      statsMap[creatorId].totalVisits += entry.history?.length || 0;

      const createdAt = new Date(entry.createdAt);
      const updatedAt = new Date(entry.updatedAt || entry.createdAt);
      const createdMonth = createdAt.getMonth();
      const createdYear = createdAt.getFullYear();
      const updatedMonth = updatedAt.getMonth();
      const updatedYear = updatedAt.getFullYear();
      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();

      if (
        (createdMonth === currentMonth && createdYear === currentYear) ||
        (updatedMonth === currentMonth && updatedYear === currentYear)
      ) {
        statsMap[creatorId].monthEntries += entry.history?.length || 0; // Changed from += 1
      }

      const status = entry.status?.toLowerCase() || "";
      const closetype = entry.closetype?.toLowerCase() || "";

      switch (status) {
        case "not interested":
          statsMap[creatorId].cold += 1;
          break;
        case "maybe":
          statsMap[creatorId].warm += 1;
          break;
        case "interested":
          statsMap[creatorId].hot += 1;
          break;
        case "closed":
          if (closetype === "closed won") {
            statsMap[creatorId].closedWon += 1;
          } else if (closetype === "closed lost") {
            statsMap[creatorId].closedLost += 1;
          }
          break;
        default:
          console.warn(`Unknown status for entry ${entry._id}: ${status}`);
          break;
      }
    });

    const result = Object.values(statsMap);
    console.log("Calculated User Stats:", result);
    setUserStats(result);

    if (!result.length && filteredEntries.length) {
      setDebugInfo("No stats generated; check user IDs or entry data");
    }
  }, [filteredEntries, fetchUsers, role, userId]);

  useEffect(() => {
    if (isOpen) {
      calculateStats();
    } else {
      setCachedUsers(null); // Clear cache when drawer closes
      setSearchTerm(""); // Reset search term when drawer closes
    }
  }, [isOpen, calculateStats]);

  // Filter userStats based on search term
  const filteredUserStats = useMemo(() => {
    if (!searchTerm.trim()) return userStats;
    return userStats.filter((user) =>
      user.username.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [userStats, searchTerm]);

  // Calculate overall statistics
  const overallStats = useMemo(() => {
    return userStats.reduce(
      (acc, user) => ({
        total: acc.total + user.allTimeEntries,
        monthTotal: acc.monthTotal + user.monthEntries,
        cold: acc.cold + user.cold,
        warm: acc.warm + user.warm,
        hot: acc.hot + user.hot,
        closedWon: acc.closedWon + user.closedWon,
        closedLost: acc.closedLost + user.closedLost,
      }),
      {
        total: 0,
        monthTotal: 0,
        cold: 0,
        warm: 0,
        hot: 0,
        closedWon: 0,
        closedLost: 0,
      }
    );
  }, [userStats]);

  // Export to Excel
  const handleExport = useCallback(() => {
    try {
      const exportData = [
        {
          Section: "Overall Statistics",
          Username: "",
          "Total Entries": overallStats.total,
          "This Month": overallStats.monthTotal,
          Cold: overallStats.cold,
          Warm: overallStats.warm,
          Hot: overallStats.hot,
          Won: overallStats.closedWon,
          Lost: overallStats.closedLost,
        },
        {
          Section: "",
          Username: "",
          "Total Entries": "",
          "This Month": "",
          Cold: "",
          Warm: "",
          Hot: "",
          Won: "",
          Lost: "",
        },
        ...filteredUserStats.map((user) => ({
          Section: "User Statistics",
          Username: user.username,
          "Total Entries": user.allTimeEntries,
          "This Month": user.monthEntries,
          Cold: user.cold,
          Warm: user.warm,
          Hot: user.hot,
          Won: user.closedWon,
          Lost: user.closedLost,
        })),
      ];

      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Team Analytics");

      worksheet["!cols"] = Object.keys(exportData[0]).map((key) => ({
        wch: Math.min(Math.max(key.length, 15) + 2, 50),
      }));

      const dateStr = dateRange?.[0]?.startDate
        ? `${new Date(dateRange[0].startDate)
            .toISOString()
            .slice(0, 10)}_to_${new Date(dateRange[0].endDate)
            .toISOString()
            .slice(0, 10)}`
        : new Date().toISOString().slice(0, 10);
      XLSX.writeFile(workbook, `team_analytics_${dateStr}.xlsx`);
      toast.success("Analytics exported successfully!");
    } catch (error) {
      console.error("Error exporting analytics:", error);
      toast.error("Failed to export analytics!");
    }
  }, [overallStats, dateRange, filteredUserStats]);

  return (
    <Drawer
      anchor="left"
      open={isOpen}
      onClose={onClose}
      PaperProps={{
        sx: {
          width: "350px",
          background: "linear-gradient(135deg, #2575fc, #6a11cb)",
          color: "white",
          borderRadius: "0 20px 20px 0",
          boxShadow: "4px 0 30px rgba(0, 0, 0, 0.4)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        },
      }}
    >
      <Box
        sx={{
          padding: "24px",
          background: "rgba(255, 255, 255, 0.1)",
          borderBottom: "1px solid rgba(255, 255, 255, 0.2)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          boxShadow: "0 2px 8px rgba(0, 0, 0, 0.2)",
        }}
      >
        <Typography
          variant="h5"
          sx={{
            fontWeight: 700,
            fontSize: "1.6rem",
            letterSpacing: "1.2px",
            textTransform: "uppercase",
            textShadow: "0 2px 4px rgba(0, 0, 0, 0.3)",
          }}
        >
          Team Analytics
        </Typography>
        <IconButton
          onClick={onClose}
          sx={{
            color: "white",
            "&:hover": { background: "rgba(255, 255, 255, 0.2)" },
          }}
        >
          <FaTimes size={22} />
        </IconButton>
      </Box>

      {(role === "superadmin" || role === "admin") && (
        <Box sx={{ px: 3, py: 2 }}>
          <TextField
            fullWidth
            placeholder="Search by username..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: (
                <FaSearch
                  style={{
                    color: "rgba(255, 255, 255, 0.7)",
                    marginRight: "8px",
                  }}
                />
              ),
              sx: {
                background: "rgba(255, 255, 255, 0.1)",
                borderRadius: "12px",
                color: "white",
                "& .MuiInputBase-input::placeholder": {
                  color: "rgba(255, 255, 255, 0.6)",
                  opacity: 1,
                },
                "& .MuiOutlinedInput-notchedOutline": {
                  border: "1px solid rgba(255, 255, 255, 0.3)",
                },
                "&:hover .MuiOutlinedInput-notchedOutline": {
                  border: "1px solid rgba(255, 255, 255, 0.5)",
                },
                "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                  border: "1px solid #2575fc",
                },
              },
            }}
            sx={{
              "& .MuiInputBase-input": {
                padding: "10px 12px",
                fontSize: "0.9rem",
              },
            }}
          />
        </Box>
      )}
      <Box sx={{ flex: 1, overflowY: "auto", px: 3, py: 2 }}>
        {loading ? (
          <Box
            sx={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              height: "100%",
            }}
          >
            <Typography
              sx={{
                fontSize: "1.2rem",
                fontWeight: 400,
                fontStyle: "italic",
                textAlign: "center",
                borderRadius: "8px",
                padding: "16px",
              }}
            >
              Loading Analytics...
            </Typography>
          </Box>
        ) : debugInfo || !filteredUserStats.length ? (
          <Box
            sx={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              height: "100%",
            }}
          >
            <Typography
              sx={{
                color: "rgba(255, 255, 255, 0.7)",
                fontSize: "1.2rem",
                fontWeight: 400,
                fontStyle: "italic",
                textAlign: "center",
                background: "rgba(255, 255, 255, 0.05)",
                borderRadius: "8px",
                padding: "16px",
                boxShadow: "0 2px 8px rgba(0, 0, 0, 0.2)",
              }}
            >
              {debugInfo || "No Team Data Available"}
            </Typography>
          </Box>
        ) : (
          <>
            <Box sx={{ mb: 3 }}>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                sx={{
                  background:
                    "linear-gradient(135deg, rgba(37, 117, 252, 0.9), rgba(106, 17, 203, 0.9))",
                  borderRadius: "16px",
                  p: 3,
                  boxShadow: "0 8px 24px rgba(0, 0, 0, 0.3)",
                  backdropFilter: "blur(8px)",
                }}
              >
                <Typography
                  sx={{
                    fontSize: "1.6rem",
                    fontWeight: 700,
                    background: "linear-gradient(135deg, #ffffff, #e0e7ff)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    letterSpacing: "0.5px",
                    textShadow: "0 2px 4px rgba(0, 0, 0, 0.2)",
                    mb: 2.5,
                    textAlign: "center",
                  }}
                >
                  📊 Overall Statistics
                </Typography>
                <Box
                  sx={{
                    display: "flex",
                    gap: "12px",
                    mb: 2,
                    flexWrap: "wrap",
                    justifyContent: "center",
                  }}
                >
                  {[
                    {
                      label: "Total Entries",
                      value: overallStats.total,
                      color: "lightgreen",
                    },
                    {
                      label: "This Month",
                      value: overallStats.monthTotal,
                      color: "yellow",
                    },
                  ].map((stat, index) => (
                    <motion.div
                      key={stat.label}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: index * 0.1, duration: 0.3 }}
                      sx={{
                        flex: "1 0 120px",
                        background: "rgba(255, 255, 255, 0.1)",
                        borderRadius: "8px",
                        p: 1.5,
                        textAlign: "center",
                        boxShadow: "0 2px 6px rgba(0, 0, 0, 0.2)",
                        minHeight: "80px",
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "center",
                      }}
                    >
                      <Typography
                        sx={{
                          fontSize: "0.9rem",
                          fontWeight: 600,
                          color: "rgba(255, 255, 255, 0.9)",
                          textTransform: "uppercase",
                          letterSpacing: "0.6px",
                          mb: 0.5,
                        }}
                      >
                        {stat.label}
                      </Typography>
                      <Typography
                        sx={{
                          fontSize: "1.3rem",
                          fontWeight: 700,
                          color: stat.color,
                          textShadow: "0 1px 3px rgba(0, 0, 0, 0.2)",
                        }}
                      >
                        {stat.value}
                      </Typography>
                    </motion.div>
                  ))}
                </Box>
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: "repeat(2, 1fr)",
                    gap: "12px",
                    justifyItems: "center",
                    alignItems: "stretch",
                  }}
                >
                  {[
                    {
                      label: "Cold",
                      value: overallStats.cold,
                      color: "orange",
                    },
                    {
                      label: "Warm",
                      value: overallStats.warm,
                      color: "lightgreen",
                    },
                    { label: "Hot", value: overallStats.hot, color: "yellow" },
                    {
                      label: "Won",
                      value: overallStats.closedWon,
                      color: "lightgrey",
                    },
                    {
                      label: "Lost",
                      value: overallStats.closedLost,
                      color: "#e91e63",
                    },
                  ].map((stat, index) => (
                    <motion.div
                      key={stat.label}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: (index + 2) * 0.1, duration: 0.3 }}
                      sx={{
                        width: "100%",
                        background: "rgba(255, 255, 255, 0.1)",
                        borderRadius: "8px",
                        p: 1,
                        textAlign: "center",
                        boxShadow: "0 2px 6px rgba(0, 0, 0, 0.2)",
                        minHeight: "60px",
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "center",
                      }}
                    >
                      <Typography
                        sx={{
                          fontSize: "0.8rem",
                          fontWeight: 600,
                          color: "rgba(255, 255, 255, 0.9)",
                          textTransform: "uppercase",
                          letterSpacing: "0.6px",
                          mb: 0.5,
                        }}
                      >
                        {stat.label}
                      </Typography>
                      <Typography
                        sx={{
                          fontSize: "1rem",
                          fontWeight: 700,
                          color: stat.color,
                          textShadow: "0 1px 3px rgba(0, 0, 0, 0.2)",
                        }}
                      >
                        {stat.value}
                      </Typography>
                    </motion.div>
                  ))}
                </Box>
              </motion.div>
            </Box>

            {filteredUserStats.map((user, index) => (
              <Box key={user._id || user.username + index} sx={{ mb: 3 }}>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.15 }}
                  sx={{
                    background: "rgba(255, 255, 255, 0.1)",
                    borderRadius: "6px",
                    p: 2,
                    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
                    "&:hover": {
                      background: "rgba(255, 255, 255, 0.15)",
                      transform: "translateY(-2px)",
                      transition: "all 0.2s ease",
                    },
                  }}
                >
                  <Box sx={{ mb: 2 }}>
                    <Typography
                      sx={{
                        fontSize: "1.3rem",
                        fontWeight: 600,
                        letterSpacing: "0.4px",
                        textTransform: "capitalize",
                        textShadow: "0 1px 3px rgba(0, 0, 0, 0.2)",
                        mb: 1,
                      }}
                    >
                      {user.username}
                    </Typography>
                    <Box sx={{ display: "flex", gap: 3 }}>
                      <Typography
                        sx={{
                          fontSize: "1rem",
                          fontWeight: 600,
                          color: "lightgreen",
                          textShadow: "0 1px 2px rgba(0, 0, 0, 0.1)",
                        }}
                      >
                        Total: {user.allTimeEntries}
                      </Typography>
                      <Typography
                        sx={{
                          fontSize: "1rem",
                          fontWeight: 600,
                          color: "yellow",
                        }}
                      >
                        This Month: {user.monthEntries}
                      </Typography>
                      <Typography
                        sx={{
                          fontSize: "1rem",
                          fontWeight: 600,
                          color: "cyan",
                        }}
                      >
                        Total Visits: {user.totalVisits}
                      </Typography>
                    </Box>
                  </Box>
                  <Box
                    sx={{ display: "flex", flexDirection: "column", gap: 1 }}
                  >
                    {[
                      { label: "Cold", value: user.cold, color: "orange" },
                      { label: "Warm", value: user.warm, color: "lightgreen" },
                      { label: "Hot", value: user.hot, color: "yellow" },
                      {
                        label: "Won",
                        value: user.closedWon,
                        color: "lightgrey",
                      },
                      {
                        label: "Lost",
                        value: user.closedLost,
                        color: "#e91e63",
                      },
                    ].map((stat) => (
                      <Box
                        key={stat.label}
                        sx={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          background: "rgba(255, 255, 255, 0.05)",
                          borderRadius: "5px",
                          px: 2,
                          py: 0.5,
                        }}
                      >
                        <Typography
                          sx={{
                            fontSize: "0.8rem",
                            fontWeight: 500,
                            color: "rgba(255, 255, 255, 0.85)",
                            textTransform: "uppercase",
                            letterSpacing: "0.5px",
                          }}
                        >
                          {stat.label}
                        </Typography>
                        <Typography
                          sx={{
                            fontSize: "0.9rem",
                            fontWeight: 600,
                            color: stat.color,
                          }}
                        >
                          {stat.value}
                        </Typography>
                      </Box>
                    ))}
                  </Box>
                </motion.div>
              </Box>
            ))}
          </>
        )}
      </Box>

      <Box
        sx={{
          p: 3,
          borderTop: "1px solid rgba(255, 255, 255, 0.2)",
          background: "rgba(255, 255, 255, 0.05)",
        }}
      >
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleExport}
          style={{
            width: "100%",
            padding: "10px",
            background: "linear-gradient(90deg, #34d399, #10b981)",
            color: "white",
            borderRadius: 5,
            border: "none",
            fontSize: "1rem",
            fontWeight: 600,
            letterSpacing: "0.5",
            cursor: "pointer",
            textTransform: "uppercase",
            marginBottom: 5,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "10px",
          }}
        >
          <span style={{ fontSize: "1.2rem" }}>⬇</span> Export Analytics
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onClose}
          style={{
            width: "100%",
            padding: "10px",
            background: "linear-gradient(90deg, #ff6b6b, #ff8e53)",
            color: "white",
            borderRadius: 5,
            border: "none",
            fontSize: "1rem",
            fontWeight: 600,
            letterSpacing: "0.5",
            cursor: "pointer",
            textTransform: "uppercase",
          }}
        >
          Close
        </motion.button>
      </Box>
    </Drawer>
  );
};

AdminDrawer.propTypes = {
  entries: PropTypes.arrayOf(PropTypes.object).isRequired,
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  role: PropTypes.string.isRequired,
  userId: PropTypes.string.isRequired,
  dateRange: PropTypes.arrayOf(
    PropTypes.shape({
      startDate: PropTypes.instanceOf(Date),
      endDate: PropTypes.instanceOf(Date),
    })
  ),
};

export default AdminDrawer;
