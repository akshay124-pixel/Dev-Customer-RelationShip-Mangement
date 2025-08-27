import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Button } from "react-bootstrap";
import "bootstrap/dist/css/bootstrap.min.css";
import "../App.css";
import { statesAndCities } from "./Options.js";
import { DateRangePicker } from "react-date-range";
import "react-date-range/dist/styles.css";
import "react-date-range/dist/theme/default.css";
import TeamAnalyticsDrawer from "./TeamAnalyticsDrawer.js";
import { jwtDecode } from "jwt-decode";
import { useNavigate } from "react-router-dom";
import {
  Popover,
  Typography,
  Box,
  Grid,
  Divider,
  Chip,
  Card,
  CardContent,
} from "@mui/material";
import AttendanceTracker from "./AttendanceTracker";
import {
  FaClock,
  FaEye,
  FaPlus,
  FaFileExcel,
  FaUpload,
  FaUsers,
  FaChartBar,
  FaCheckCircle,
} from "react-icons/fa";
import axios from "axios";
import * as XLSX from "xlsx";
import { toast } from "react-toastify";
import { AutoSizer, List } from "react-virtualized";
import debounce from "lodash/debounce";
import { motion } from "framer-motion";
import AddEntry from "./AddEntry";
import EditEntry from "./EditEntry";
import DeleteModal from "./Delete";
import ViewEntry from "./ViewEntry";
import TeamBuilder from "./TeamBuilder";
import AdminDrawer from "./AdminDrawer";
import ValueAnalyticsDrawer from "./ValueAnalyticsDrawer.js";
import { FixedSizeList } from "react-window";

// Custom hook for mobile detection
const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return isMobile;
};

const CallTrackingDashboard = ({
  entries,
  role,
  onFilterChange,
  selectedCategory,
  userId,
  selectedUsername,
  dateRange,
}) => {
  const callStats = useMemo(() => {
    const stats = { cold: 0, warm: 0, hot: 0, closedWon: 0, closedLost: 0 };
    const filteredEntries = entries.filter((entry) => {
      const createdAt = new Date(entry.createdAt);
      return (
        (role === "superadmin" ||
          role === "admin" ||
          entry.createdBy?._id === userId ||
          entry.assignedTo?._id === userId) &&
        (!selectedUsername ||
          entry.createdBy?.username === selectedUsername ||
          entry.assignedTo?.username === selectedUsername) &&
        (!dateRange[0].startDate ||
          !dateRange[0].endDate ||
          (createdAt >= new Date(dateRange[0].startDate) &&
            createdAt <= new Date(dateRange[0].endDate)))
      );
    });

    filteredEntries.forEach((entry) => {
      switch (entry.status) {
        case "Not Interested":
          stats.cold += 1;
          break;
        case "Maybe":
          stats.warm += 1;
          break;
        case "Interested":
          stats.hot += 1;
          break;
        case "Closed":
          if (entry.closetype === "Closed Won") stats.closedWon += 1;
          else if (entry.closetype === "Closed Lost") stats.closedLost += 1;
          break;
        default:
          break;
      }
    });
    return stats;
  }, [entries, role, userId, selectedUsername, dateRange]);

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Box sx={{ mb: 4 }}>
        <Divider sx={{ mb: 3 }} />
        <Grid container spacing={2} justifyContent="center">
          {[
            {
              title: "Closed Won",
              value: callStats.closedWon,
              color: "#0288d1",
              chip: "Won",
              border: "Closed Won",
            },
            {
              title: "Closed Lost",
              value: callStats.closedLost,
              color: "#d32f2f",
              chip: "Lost",
              border: "Closed Lost",
            },
            {
              title: "Hot Calls",
              value: callStats.hot,
              color: "#d81b60",
              chip: "Interested",
              border: "Interested",
            },
            {
              title: "Warm Calls",
              value: callStats.warm,
              color: "#f57c00",
              chip: "Maybe",
              border: "Maybe",
            },
            {
              title: "Cold Calls",
              value: callStats.cold,
              color: "#388e3c",
              chip: "Not Interested",
              border: "Not Interested",
            },
          ].map((stat) => (
            <Grid item xs={12} sm={6} md={2.4} key={stat.title}>
              <motion.div
                whileHover={{ scale: 1.05 }}
                transition={{ duration: 0.3 }}
              >
                <Card
                  sx={{
                    backgroundColor: stat.title.includes("Closed Won")
                      ? "#e3f2fd"
                      : stat.title.includes("Closed Lost")
                      ? "#ffebee"
                      : stat.title.includes("Hot")
                      ? "#ffcdd2"
                      : stat.title.includes("Warm")
                      ? "#fff3e0"
                      : "#e8f5e9",
                    boxShadow: 3,
                    border:
                      selectedCategory === stat.border
                        ? `2px solid ${stat.color}`
                        : "none",
                    cursor: "pointer",
                    transition: "all 0.3s ease",
                  }}
                  onClick={() => onFilterChange(stat.border)}
                >
                  <CardContent>
                    <Typography
                      variant="h6"
                      color="textSecondary"
                      sx={{ fontSize: { xs: "0.9rem", sm: "1rem" } }}
                    >
                      {stat.title}
                    </Typography>
                    <Typography
                      variant="h4"
                      sx={{
                        fontWeight: "bold",
                        color: stat.color,
                        fontSize: { xs: "1.5rem", sm: "2rem" },
                      }}
                    >
                      {stat.value}
                    </Typography>
                    <Chip
                      label={stat.chip}
                      size="small"
                      color={
                        stat.title.includes("Closed Won")
                          ? "primary"
                          : stat.title.includes("Closed Lost")
                          ? "error"
                          : stat.title.includes("Hot")
                          ? "secondary"
                          : stat.title.includes("Warm")
                          ? "warning"
                          : "success"
                      }
                      sx={{ mt: 1 }}
                    />
                  </CardContent>
                </Card>
              </motion.div>
            </Grid>
          ))}
        </Grid>
      </Box>
    </motion.div>
  );
};
function DashBoard() {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const [entries, setEntries] = useState([]);
  const [role, setRole] = useState(localStorage.getItem("role") || "");
  const [userId, setUserId] = useState(localStorage.getItem("userId") || "");
  const [loading, setLoading] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isTeamBuilderOpen, setIsTeamBuilderOpen] = useState(false);
  const [isAnalyticsOpen, setIsAnalyticsOpen] = useState(false);
  const [isValueAnalyticsOpen, setIsValueAnalyticsOpen] = useState(false);
  const [isTeamAnalyticsOpen, setIsTeamAnalyticsOpen] = useState(false);
  const [isAnalyticsModalOpen, setIsAnalyticsModalOpen] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [entryToEdit, setEntryToEdit] = useState(null);
  const [entryToView, setEntryToView] = useState(null);
  const [itemIdToDelete, setItemIdToDelete] = useState(null);
  const [itemIdsToDelete, setItemIdsToDelete] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUsername, setSelectedUsername] = useState("");
  const [usernames, setUsernames] = useState([]);
  const [selectedState, setSelectedState] = useState("");
  const [selectedCity, setSelectedCity] = useState("");
  const [dashboardFilter, setDashboardFilter] = useState("total");
  const [dateRange, setDateRange] = useState([
    { startDate: null, endDate: null, key: "selection" },
  ]);
  const [selectedEntries, setSelectedEntries] = useState([]);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [doubleClickInitiated, setDoubleClickInitiated] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);
  const [totalVisits, setTotalVisits] = useState(0);
  const [monthlyVisits, setMonthlyVisits] = useState(0);

  const debouncedSearchChange = useMemo(
    () => debounce((value) => setSearchTerm(value), 300),
    []
  );

  const fetchUserDetails = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("No token found");
      const decoded = jwtDecode(token);
      const response = await axios.get(
        `${process.env.REACT_APP_URL}/api/user-role`,
        {
          headers: { Authorization: `Bearer ${token}` },
          timeout: 5000,
        }
      );
      const { role, userId } = response.data;
      if (!role || !userId) throw new Error("Invalid user details");
      setRole(role);
      setUserId(userId);
      localStorage.setItem("role", role);
      localStorage.setItem("userId", userId);
    } catch (error) {
      console.error("Fetch user details error:", error.message);
      const friendlyMessage =
        error.message === "You are not logged in. Please log in to continue."
          ? error.message
          : "Session expired or invalid. Please log in again.";
      setError(friendlyMessage);
      toast.error(friendlyMessage);
      localStorage.clear();
      navigate("/login");
    } finally {
      setAuthLoading(false);
    }
  }, [navigate]);

  const fetchEntries = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("No token found");
      const response = await axios.get(
        `${process.env.REACT_APP_URL}/api/fetch-entry`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const data = Array.isArray(response.data) ? response.data : [];
      setEntries(data);
      if (role === "superadmin" || role === "admin") {
        const usernamesSet = new Set();
        data.forEach((entry) => {
          if (entry.createdBy?.username)
            usernamesSet.add(entry.createdBy.username);
          if (entry.assignedTo?.username)
            usernamesSet.add(entry.assignedTo.username);
        });
        setUsernames([...usernamesSet]);
      }
    } catch (error) {
      console.error("Fetch entries error:", error.message);
      const message =
        error.message === "Network Error"
          ? "Network problem detected. Please check your internet connection."
          : "Sorry, we couldn't load the entries right now. Please try again later.";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [role]);

  useEffect(() => {
    fetchUserDetails();
  }, [fetchUserDetails]);

  useEffect(() => {
    if (!authLoading && role && userId) fetchEntries();
  }, [authLoading, role, userId, fetchEntries]);

  const filteredData = useMemo(() => {
    return entries
      .filter((row) => {
        const createdAt = new Date(row.createdAt);
        const productNameMatch = row.products?.some((product) =>
          product.name?.toLowerCase().includes(searchTerm.toLowerCase())
        );

        const startDate = dateRange[0].startDate
          ? new Date(dateRange[0].startDate.setHours(0, 0, 0, 0))
          : null;
        const endDate = dateRange[0].endDate
          ? new Date(dateRange[0].endDate.setHours(23, 59, 59, 999))
          : null;

        // Check if selectedUsername matches createdBy or any user in assignedTo array
        const usernameMatch =
          !selectedUsername ||
          row.createdBy?.username === selectedUsername ||
          (Array.isArray(row.assignedTo) &&
            row.assignedTo.some((user) => user.username === selectedUsername));

        return (
          (!searchTerm ||
            row.customerName
              ?.toLowerCase()
              .includes(searchTerm.toLowerCase()) ||
            row.address?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            row.mobileNumber?.includes(searchTerm) ||
            productNameMatch) &&
          usernameMatch &&
          (!selectedState || row.state === selectedState) &&
          (!selectedCity || row.city === selectedCity) &&
          (dashboardFilter === "total" ||
            (dashboardFilter === "Closed Won" &&
              row.status === "Closed" &&
              row.closetype === "Closed Won") ||
            (dashboardFilter === "Closed Lost" &&
              row.status === "Closed" &&
              row.closetype === "Closed Lost") ||
            row.status === dashboardFilter) &&
          (!startDate ||
            !endDate ||
            (createdAt >= startDate && createdAt <= endDate))
        );
      })
      .sort((a, b) => {
        const dateA = new Date(a.updatedAt || a.createdAt);
        const dateB = new Date(b.updatedAt || b.createdAt);
        return dateB - dateA;
      });
  }, [
    entries,
    searchTerm,
    selectedUsername,
    selectedState,
    selectedCity,
    dashboardFilter,
    dateRange,
  ]);

  // Naya handleEntryAdded function
  const handleEntryAdded = useCallback(
    (newEntry) => {
      // Fetch users to map assignedTo IDs to user objects with usernames
      const fetchUsers = async () => {
        try {
          const token = localStorage.getItem("token");
          const response = await axios.get(
            `${process.env.REACT_APP_URL}/api/users`,
            {
              headers: { Authorization: `Bearer ${token}` },
            }
          );
          const users = response.data;

          // Map assignedTo IDs to user objects
          const assignedToUsers = Array.isArray(newEntry.assignedTo)
            ? newEntry.assignedTo
                .map((id) => users.find((user) => user._id === id))
                .filter(Boolean)
                .map((user) => ({ _id: user._id, username: user.username }))
            : [];

          const completeEntry = {
            _id: newEntry._id || Date.now().toString(),
            customerName: newEntry.customerName || "",
            mobileNumber: newEntry.mobileNumber || "",
            contactperson: newEntry.contactperson || "",
            products: newEntry.products || [],
            type: newEntry.type || "",
            address: newEntry.address || "",
            state: newEntry.state || "",
            city: newEntry.city || "",
            organization: newEntry.organization || "",
            category: newEntry.category || "",
            createdAt: newEntry.createdAt || new Date().toISOString(),
            status: newEntry.status || "Not Found",
            expectedClosingDate: newEntry.expectedClosingDate || "",
            followUpDate: newEntry.followUpDate || "",
            remarks: newEntry.remarks || "",
            firstdate: newEntry.firstdate || "",
            estimatedValue: newEntry.estimatedValue || "",
            nextAction: newEntry.nextAction || "",
            closetype:
              newEntry.status === "Closed" &&
              ["Closed Won", "Closed Lost"].includes(newEntry.closetype)
                ? newEntry.closetype
                : "",
            priority: newEntry.priority || "",
            updatedAt: newEntry.updatedAt || new Date().toISOString(),
            createdBy: {
              _id: userId,
              username:
                newEntry.createdBy?.username ||
                localStorage.getItem("username") ||
                "",
            },
            assignedTo: assignedToUsers, // Use mapped user objects
            history: newEntry.history || [
              {
                timestamp: new Date().toISOString(),
                status: newEntry.status || "Not Found",
                remarks: newEntry.remarks || "",
                liveLocation: newEntry.liveLocation || "",
                products: newEntry.products || [],
                assignedTo: assignedToUsers, // Include in history
              },
            ],
          };

          setEntries((prev) => [completeEntry, ...prev]);

          // Update usernames for dropdown
          const newUsernames = new Set(usernames);
          if (newEntry.createdBy?.username) {
            newUsernames.add(newEntry.createdBy.username);
          }
          assignedToUsers.forEach((user) => {
            if (user.username) newUsernames.add(user.username);
          });
          setUsernames([...newUsernames]);

          // Fetch latest entries to sync with backend
          await fetchEntries();
        } catch (error) {
          console.error("Error fetching users for assignedTo:", error);
          toast.error("Failed to fetch user details for assignment.");
          setEntries((prev) => [
            {
              ...newEntry,
              _id: newEntry._id || Date.now().toString(),
              createdBy: {
                _id: userId,
                username: newEntry.createdBy?.username || "",
              },
              assignedTo: [], // Default to empty if error
              history: [
                {
                  timestamp: new Date().toISOString(),
                  status: newEntry.status || "Not Found",
                  remarks: newEntry.remarks || "",
                  liveLocation: newEntry.liveLocation || "",
                  products: newEntry.products || [],
                  assignedTo: [], // Default to empty
                },
              ],
            },
            ...prev,
          ]);
        }
      };

      if (
        role === "superadmin" ||
        role === "admin" ||
        newEntry.assignedTo?.length > 0
      ) {
        fetchUsers();
      } else {
        const completeEntry = {
          _id: newEntry._id || Date.now().toString(),
          customerName: newEntry.customerName || "",
          mobileNumber: newEntry.mobileNumber || "",
          contactperson: newEntry.contactperson || "",
          products: newEntry.products || [],
          type: newEntry.type || "",
          address: newEntry.address || "",
          state: newEntry.state || "",
          city: newEntry.city || "",
          organization: newEntry.organization || "",
          category: newEntry.category || "",
          createdAt: newEntry.createdAt || new Date().toISOString(),
          status: newEntry.status || "Not Found",
          expectedClosingDate: newEntry.expectedClosingDate || "",
          followUpDate: newEntry.followUpDate || "",
          remarks: newEntry.remarks || "",
          firstdate: newEntry.firstdate || "",
          estimatedValue: newEntry.estimatedValue || "",
          nextAction: newEntry.nextAction || "",
          closetype:
            newEntry.status === "Closed" &&
            ["Closed Won", "Closed Lost"].includes(newEntry.closetype)
              ? newEntry.closetype
              : "",
          priority: newEntry.priority || "",
          updatedAt: newEntry.updatedAt || new Date().toISOString(),
          createdBy: {
            _id: userId,
            username: newEntry.createdBy?.username || "",
          },
          assignedTo: [], // Default to empty
          history: newEntry.history || [
            {
              timestamp: new Date().toISOString(),
              status: newEntry.status || "Not Found",
              remarks: newEntry.remarks || "",
              liveLocation: newEntry.liveLocation || "",
              products: newEntry.products || [],
              assignedTo: [], // Default to empty
            },
          ],
        };
        setEntries((prev) => [completeEntry, ...prev]);

        if (
          (role === "superadmin" || role === "admin") &&
          newEntry.createdBy?.username &&
          !usernames.includes(newEntry.createdBy.username)
        ) {
          setUsernames((prev) => [...prev, newEntry.createdBy.username]);
        }
        // Fetch latest entries to sync with backend
        fetchEntries();
      }
    },
    [role, userId, usernames, fetchEntries] // Added fetchEntries to dependencies
  );

  // Naya handleEntryUpdated function
  const handleEntryUpdated = useCallback(
    (updatedEntry) => {
      setEntries((prev) =>
        prev.map((entry) =>
          entry._id === updatedEntry._id
            ? {
                ...updatedEntry,
                assignedTo: Array.isArray(updatedEntry.assignedTo)
                  ? updatedEntry.assignedTo.map((user) => ({
                      _id: user._id,
                      username: user.username || "",
                    }))
                  : updatedEntry.assignedTo
                  ? [
                      {
                        _id: updatedEntry.assignedTo._id,
                        username: updatedEntry.assignedTo.username || "",
                      },
                    ]
                  : [], // Handle single user or empty
              }
            : entry
        )
      );
      setIsEditModalOpen(false);
      toast.success("Entry updated successfully!");
      // Update usernames for dropdown
      const newUsernames = new Set(usernames);
      if (Array.isArray(updatedEntry.assignedTo)) {
        updatedEntry.assignedTo.forEach((user) => {
          if (user.username) newUsernames.add(user.username);
        });
      } else if (updatedEntry.assignedTo?.username) {
        newUsernames.add(updatedEntry.assignedTo.username);
      }
      setUsernames([...newUsernames]);
      // Fetch latest entries to sync with backend
      fetchEntries();
    },
    [usernames, fetchEntries] // Added fetchEntries to dependencies
  );

  const handleDelete = useCallback((deletedIds) => {
    setEntries((prev) =>
      prev.filter((entry) => !deletedIds.includes(entry._id))
    );
    setSelectedEntries((prev) => prev.filter((id) => !deletedIds.includes(id)));
    setIsDeleteModalOpen(false);
  }, []);

  const handleReset = () => {
    setSearchTerm("");
    setSelectedUsername("");
    setSelectedState("");
    setSelectedCity("");
    setSelectedEntries([]);
    setIsSelectionMode(false);
    setDoubleClickInitiated(false);
    setDashboardFilter("total");
    setDateRange([{ startDate: null, endDate: null, key: "selection" }]);
  };

  const handleExport = async () => {
    try {
      const exportData = filteredData.map((entry) => ({
        Customer_Name: entry.customerName || "",
        Mobile_Number: entry.mobileNumber || "",
        Contact_Person: entry.contactperson || "",
        Address: entry.address || "",
        State: entry.state || "",
        City: entry.city || "",
        Organization: entry.organization || "",
        Category: entry.category || "",
        createdBy: entry.createdBy?.username || "",
        Created_At: entry.createdAt
          ? new Date(entry.createdAt).toLocaleDateString()
          : "",
        Expected_Closing_Date: entry.expectedClosingDate
          ? new Date(entry.expectedClosingDate).toLocaleDateString()
          : "",
        Follow_Up_Date: entry.followUpDate
          ? new Date(entry.followUpDate).toLocaleDateString()
          : "",
        Remarks: entry.remarks || "",
        Products:
          entry.products
            ?.map(
              (p) =>
                `${p.name} (${p.specification}, ${p.size}, Qty: ${p.quantity})`
            )
            .join("; ") || "",
        Type: entry.type || "",
        Status: entry.status || "",
        Close_Type: entry.closetype || "",
        Assigned_To: entry.assignedTo?.username || "",
        Assigned_To: entry.assignedTo?.username || "",
        Estimated_Value: entry.estimatedValue || "",
        Close_Amount: entry.closeamount || "",
        Next_Action: entry.nextAction || "",
        Live_Location: entry.liveLocation || "",
        First_Person_Met: entry.firstPersonMeet || "",
        Second_Person_Met: entry.secondPersonMeet || "",
        Third_Person_Met: entry.thirdPersonMeet || "",
        Fourth_Person_Met: entry.fourthPersonMeet || "",
      }));

      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Filtered Entries");

      const excelBuffer = XLSX.write(workbook, {
        bookType: "xlsx",
        type: "array",
      });

      const blob = new Blob([excelBuffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = "Filtered_Entries.xlsx";
      link.click();
      URL.revokeObjectURL(link.href);
      toast.success("Filtered entries exported successfully!");
    } catch (error) {
      console.error("Export error:", error.message);
      toast.error("Failed to export filtered entries!");
    }
  };
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) {
      toast.error("No file selected!");
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) {
      toast.error("Please log in to upload entries!");
      return;
    }

    console.log("Token:", token);

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        console.log("Parsing file...");
        const data = new Uint8Array(event.target.result);
        const workbook = XLSX.read(data, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const parsedData = XLSX.utils.sheet_to_json(worksheet, {
          defval: "",
          blankrows: false,
        });
        console.log("Parsed data:", JSON.stringify(parsedData, null, 2));

        if (!parsedData.length) {
          toast.error("No data found in file!");
          return;
        }

        // Parse Products string into structured object
        const parseProducts = (productsStr) => {
          if (!productsStr || productsStr.trim() === "") return [];
          try {
            // Example: "IFPD (Android 9, 4GB RAM, 32GB ROM, 65 inch, Qty: 5)"
            const productMatch = productsStr.match(
              /^(.+?)\s*\((.+?),\s*(.+?),\s*(.+?),\s*Qty:\s*(\d+)\)$/
            );
            if (productMatch) {
              const [, name, spec1, spec2, size, quantity] = productMatch;
              return [
                {
                  name: name.trim(),
                  specification: `${spec1.trim()}, ${spec2.trim()}`,
                  size: size.trim(),
                  quantity: parseInt(quantity),
                },
              ];
            }
            return [];
          } catch {
            console.warn(`Failed to parse products: ${productsStr}`);
            return [];
          }
        };

        const newEntries = parsedData.map((item) => {
          const parseArrayField = (value) => {
            if (Array.isArray(value)) return value;
            if (value == null || value === "") return [];
            const strValue = String(value).trim();
            if (!strValue) return [];
            try {
              const parsed = JSON.parse(strValue);
              if (Array.isArray(parsed)) return parsed;
            } catch {
              // Not a valid JSON array, treat as single item
            }
            return [strValue];
          };

          // Parse dates safely
          const parseDate = (dateStr) => {
            if (!dateStr) return null;
            const date = new Date(dateStr);
            return isNaN(date.getTime()) ? null : date.toISOString();
          };

          return {
            customerName: item.Customer_Name || "",
            mobileNumber: item.Mobile_Number ? String(item.Mobile_Number) : "",
            contactperson: item.Contact_Person || "",
            address: item.Address || "",
            state: item.State || "",
            city: item.City || "",
            organization: item.Organization || "",
            category: item.Category || "",
            type: item.Type || "",
            status: item.Status || "Not Found",
            closetype: item.Close_Type || "",
            estimatedValue: item.Estimated_Value
              ? Number(item.Estimated_Value)
              : 0,
            closeamount: item.Close_Amount ? Number(item.Close_Amount) : 0,
            remarks: item.Remarks || "",
            liveLocation: item.Live_Location || "",
            nextAction: item.Next_Action || "",
            firstPersonMeet: item.First_Person_Met || "",
            secondPersonMeet: item.Second_Person_Met || "",
            thirdPersonMeet: item.Third_Person_Met || "",
            fourthPersonMeet: item.Fourth_Person_Met || "",
            expectedClosingDate: parseDate(item.Expected_Closing_Date),
            followUpDate: parseDate(item.Follow_Up_Date),
            products: parseProducts(item.Products),
            assignedTo: parseArrayField(item.Assigned_To),
          };
        });

        console.log("Mapped entries:", JSON.stringify(newEntries, null, 2));
        console.log(`Sending ${newEntries.length} entries to API`);
        const response = await axios.post(
          `${process.env.REACT_APP_URL}/api/entries`,
          newEntries,
          {
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
          }
        );

        console.log("API response:", response.data);
        toast.success(`Uploaded ${response.data.count} entries!`);
        setEntries((prev) => [...newEntries, ...prev]);
        fetchEntries();
      } catch (error) {
        console.error("Upload error:", error.message, error.response?.data);
        if (error.response?.status === 401) {
          toast.error("Authentication failed. Please log in again.");
        } else if (error.response?.data?.message) {
          toast.error(`Upload failed: ${error.response.data.message}`);
        } else if (error.message === "Network Error") {
          toast.error(
            "Network issue detected. Please check your internet connection and try again."
          );
        } else {
          toast.error(`Upload failed: ${error.message}`);
        }
      }
    };
    reader.onerror = () => {
      console.error("File read error");
      toast.error(
        "Error reading the file. Please try again with a valid file."
      );
    };

    reader.readAsArrayBuffer(file);
  };

  const handleDoubleClick = (id) => {
    if (!doubleClickInitiated && (role === "superadmin" || role === "admin")) {
      setIsSelectionMode(true);
      setDoubleClickInitiated(true);
      setSelectedEntries([id]);
    }
  };

  const handleSingleClick = (id) => {
    if (isSelectionMode && (role === "superadmin" || role === "admin")) {
      setSelectedEntries((prev) =>
        prev.includes(id)
          ? prev.filter((entryId) => entryId !== id)
          : [...prev, id]
      );
    }
  };

  const handleSelectAll = () => {
    if (isSelectionMode && (role === "superadmin" || role === "admin")) {
      const allFilteredIds = filteredData.map((entry) => entry._id);
      setSelectedEntries(allFilteredIds);
    }
  };

  const handleCopySelected = () => {
    const selectedData = entries.filter((entry) =>
      selectedEntries.includes(entry._id)
    );
    const textToCopy = selectedData
      .map((entry) =>
        [
          entry.customerName,
          entry.mobileNumber,
          entry.contactperson,
          entry.products
            ?.map(
              (p) =>
                `${p.name} (${p.specification}, ${p.size}, Qty: ${p.quantity})`
            )
            .join("; "),
          entry.type,
          entry.address,
          entry.state,
          entry.city,
          entry.organization,
          entry.category,
          new Date(entry.createdAt).toLocaleDateString(),
          entry.closetype || "",
          entry.assignedTo?.username || "",
        ].join("\t")
      )
      .join("\n");
    navigator.clipboard
      .writeText(textToCopy)
      .then(() => toast.success("Selected entries copied to clipboard!"))
      .catch((err) => toast.error("Failed to copy: " + err.message));
  };

  const handleDeleteSelected = useCallback(() => {
    if (selectedEntries.length === 0) {
      toast.error("No entries selected!");
      return;
    }
    setItemIdsToDelete(selectedEntries);
    setItemIdToDelete(null);
    setIsDeleteModalOpen(true);
  }, [selectedEntries]);
  const { total, monthly } = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const filteredEntries = entries.filter((entry) => {
      const createdAt = new Date(entry.createdAt);
      return (
        (role === "superadmin" ||
          role === "admin" ||
          entry.createdBy?._id === userId ||
          entry.assignedTo?._id === userId) &&
        (!selectedUsername ||
          entry.createdBy?.username === selectedUsername ||
          (Array.isArray(entry.assignedTo) &&
            entry.assignedTo.some(
              (user) => user.username === selectedUsername
            ))) &&
        (!dateRange[0].startDate ||
          !dateRange[0].endDate ||
          (createdAt >= new Date(dateRange[0].startDate) &&
            createdAt <= new Date(dateRange[0].endDate)))
      );
    });

    const total = filteredEntries.reduce((sum, entry) => {
      return sum + (entry.history?.length || 0);
    }, 0);

    const monthly = filteredEntries.reduce((sum, entry) => {
      const createdAt = new Date(entry.createdAt);
      const updatedAt = new Date(entry.updatedAt || entry.createdAt);
      const createdMonth = createdAt.getMonth();
      const createdYear = createdAt.getFullYear();
      const updatedMonth = updatedAt.getMonth();
      const updatedYear = updatedAt.getFullYear();

      if (
        (createdMonth === currentMonth && createdYear === currentYear) ||
        (updatedMonth === currentMonth && updatedYear === currentYear)
      ) {
        return sum + (entry.history?.length || 0); // Use history.length instead of 1
      }
      return sum;
    }, 0);

    return { total, monthly };
  }, [entries, role, userId, selectedUsername, dateRange]);
  useEffect(() => {
    setTotalVisits(total);
    setMonthlyVisits(monthly);
  });

  useEffect(() => {
    const checkMonthChange = () => {
      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();

      const monthly = entries.reduce((sum, entry) => {
        const entryDate = new Date(entry.createdAt);
        const entryMonth = entryDate.getMonth();
        const entryYear = entryDate.getFullYear();

        if (entryMonth === currentMonth && entryYear === currentYear) {
          return sum + (entry.history?.length || 0);
        }
        return sum;
      }, 0);

      setMonthlyVisits(monthly);
    };

    const interval = setInterval(checkMonthChange, 60000);
    return () => clearInterval(interval);
  }, [entries]);

  const rowRenderer = ({ index, key, style }) => {
    const row = filteredData[index];
    const isSelected = selectedEntries.includes(row._id);

    const isAssigned = Array.isArray(row.assignedTo)
      ? row.assignedTo.length > 0
      : !!row.assignedTo;
    return (
      <div
        key={key}
        style={{
          ...style,
          cursor: "pointer",
          backgroundColor: isSelected
            ? "rgba(37, 117, 252, 0.1)"
            : isAssigned
            ? "rgba(200, 230, 255, 0.3)" // Light blue for assigned entries
            : "#fff",
          border: isSelected ? "2px solid #2575fc" : "none",
        }}
        className={`virtual-row ${isSelected ? "selected" : ""}`}
        onDoubleClick={() => handleDoubleClick(row._id)}
        onClick={() => handleSingleClick(row._id)}
      >
        <div className="virtual-cell">{index + 1}</div>
        <div className="virtual-cell">
          {row.updatedAt
            ? new Date(row.updatedAt).toLocaleDateString("en-GB")
            : "N/A"}
        </div>
        <div className="virtual-cell">{row.customerName}</div>
        <div className="virtual-cell">{row.mobileNumber}</div>
        <div className="virtual-cell">{row.address}</div>
        <div className="virtual-cell">{row.city}</div>
        <div className="virtual-cell">{row.state}</div>
        <div className="virtual-cell">{row.organization}</div>
        <div className="virtual-cell">{row.createdBy?.username}</div>
        <div
          className="virtual-cell actions-cell"
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            width: "150px",
            padding: "0 5px",
          }}
        >
          <Button
            variant="primary"
            onClick={() => {
              setEntryToView(row);
              setIsViewModalOpen(true);
            }}
            style={{
              width: "40px",
              height: "40px",
              borderRadius: "50%",
              padding: "0",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <FaEye />
          </Button>
          <button
            onClick={() => {
              setEntryToEdit(row);
              setIsEditModalOpen(true);
            }}
            className="editBtn"
            style={{
              width: "40px",
              height: "40px",
              borderRadius: "50%",
              padding: "0",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg height="1em" viewBox="0 0 512 512">
              <path d="M410.3 231l11.3-11.3-33.9-33.9-62.1-62.1L291.7 89.8l-11.3 11.3-22.6 22.6L58.6 322.9c-10.4 10.4-18 23.3-22.2 37.4L1 480.7c-2.5 8.4-.2 17.5 6.1 23.7s15.3 8.5 23.7 6.1l120.3-35.4c14.1-4.2 27-11.8 37.4-22.2L387.7 253.7 410.3 231zM160 399.4l-9.1 22.7c-4 3.1-8.5 5.4-13.3 6.9L59.4 452l23-78.1c1.4-4.9 3.8-9.4 6.9-13.3l22.7-9.1v32c0 8.8 7.2 16 16 16h32zM362.7 18.7L348.3 33.2 325.7 55.8 314.3 67.1l33.9 33.9 62.1 62.1 33.9 33.9 11.3-11.3 22.6-22.6 14.5-14.5c25-25 25-65.5 0-90.5L453.3 18.7c-25-25-65.5-25-90.5 0zm-47.4 168l-144 144c-6.2 6.2-16.4-6.2-22.6 0s-6.2 16.4 0 22.6l144-144c6.2-6.2 16.4-6.2 22.6 0s6.2 16.4 0 22.6z"></path>
            </svg>
          </button>
          <button
            className="bin-button"
            onClick={() => {
              setItemIdToDelete(row._id);
              setIsDeleteModalOpen(true);
            }}
            style={{
              width: "40px",
              height: "40px",
              borderRadius: "50%",
              padding: "0",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg
              className="bin-top"
              viewBox="0 0 39 7"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <line y1="5" x2="39" y2="5" stroke="white" strokeWidth="4"></line>
              <line
                x1="12"
                y1="1.5"
                x2="26.0357"
                y2="1.5"
                stroke="white"
                strokeWidth="3"
              ></line>
            </svg>
            <svg
              className="bin-bottom"
              viewBox="0 0 33 39"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <mask id="path-1-inside-1_8_19" fill="white">
                <path d="M0 0H33V35C33 37.2091 31.2091 39 29 39H4C1.79086 39 0 37.2091 0 35V0Z"></path>
              </mask>
              <path
                d="M0 0H33H0ZM37 35C37 39.4183 33.4183 43 29 43H4C-0.418278 43 -4 39.4183 -4 35H4H29H37ZM4 43C-0.418278 43 -4 39.4183 -4 35V0H4V35V43ZM37 0V35C37 39.4183 33.4183 43 29 43V35V0H37Z"
                fill="white"
                mask="url(#path-1-inside-1_8_19)"
              ></path>
              <path d="M12 6L12 29" stroke="white" strokeWidth="4"></path>
              <path d="M21 6V29" stroke="white" strokeWidth="4"></path>
            </svg>
          </button>
        </div>
      </div>
    );
  };

  const renderMobileCard = ({ index, style }) => {
    const row = filteredData[index];
    const isSelected = selectedEntries.includes(row._id);

    const isAssigned = Array.isArray(row.assignedTo)
      ? row.assignedTo.length > 0
      : !!row.assignedTo;
    return (
      <motion.div
        key={row._id}
        className={`mobile-card ${isSelected ? "selected" : ""}`}
        onClick={() => handleSingleClick(row._id)}
        onDoubleClick={() => handleDoubleClick(row._id)}
        style={{
          ...style,
          padding: "0 10px 24px 10px",
          boxSizing: "border-box",
        }}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3, delay: index * 0.05 }}
      >
        <Box
          sx={{
            p: 2,
            borderRadius: "12px",
            boxShadow: "0 4px 8px rgba(0, 0, 0, 0.1)",
            backgroundColor: isSelected
              ? "rgba(37, 117, 252, 0.1)"
              : isAssigned
              ? "rgba(200, 230, 255, 0.3)" // Light blue for assigned entries
              : "#fff",
            border: isSelected ? "2px solid #2575fc" : "1px solid #ddd",
            cursor: "pointer",
            transition: "all 0.3s ease",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              background: "linear-gradient(135deg, #f5f7fa, #e4e7eb)",
              borderRadius: "8px 8px 0 0",
              padding: "8px 12px",
              margin: "-16px -16px 12px -16px",
            }}
          >
            <Typography
              variant="body2"
              sx={{ fontWeight: "bold", fontSize: "0.85rem", color: "#333" }}
            >
              Entry #{index + 1}
            </Typography>
            <Typography
              variant="body2"
              sx={{ fontSize: "0.8rem", color: "#555" }}
            >
              {row.updatedAt
                ? new Date(row.updatedAt).toLocaleDateString()
                : "N/A"}
            </Typography>
          </Box>

          {isSelected && (
            <motion.div
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.2 }}
              style={{
                position: "absolute",
                top: "12px",
                right: "12px",
                color: "#2575fc",
              }}
            >
              <FaCheckCircle size={20} />
            </motion.div>
          )}

          <Typography
            variant="h6"
            sx={{
              fontWeight: "bold",
              mb: 1,
              fontSize: "1.1rem",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              maxWidth: "100%",
            }}
          >
            {row.customerName}
          </Typography>
          <Typography
            variant="body2"
            sx={{ mb: 0.5, fontSize: "0.9rem", color: "#555" }}
          >
            <strong>Mobile:</strong> {row.mobileNumber}
          </Typography>
          <Typography
            variant="body2"
            sx={{ mb: 0.5, fontSize: "0.9rem", color: "#555" }}
          >
            <strong>Address:</strong> {row.address}
          </Typography>
          <Typography
            variant="body2"
            sx={{ mb: 0.5, fontSize: "0.9rem", color: "#555" }}
          >
            <strong>City:</strong> {row.city}
          </Typography>
          <Typography
            variant="body2"
            sx={{ mb: 0.5, fontSize: "0.9rem", color: "#555" }}
          >
            <strong>State:</strong> {row.state}
          </Typography>
          <Typography
            variant="body2"
            sx={{ mb: 0.5, fontSize: "0.9rem", color: "#555" }}
          >
            <strong>Organization:</strong> {row.organization}
          </Typography>
          <Typography
            variant="body2"
            sx={{ mb: 1, fontSize: "0.9rem", color: "#555" }}
          >
            <strong>Category:</strong> {row.category}
          </Typography>

          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 1,
              marginTop: "12px",
            }}
          >
            <Button
              variant="primary"
              className="viewBtn"
              onClick={() => {
                setEntryToView(row);
                setIsViewModalOpen(true);
              }}
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "50%",
                padding: "0",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
              role="button"
              tabIndex={0}
              aria-label={`View entry for ${row.customerName}`}
            >
              <FaEye />
            </Button>
            <button
              className="editBtn"
              onClick={() => {
                setEntryToEdit(row);
                setIsEditModalOpen(true);
              }}
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "50%",
                padding: "0",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
              role="button"
              tabIndex={0}
              aria-label={`Edit entry for ${row.customerName}`}
            >
              <svg height="1em" viewBox="0 0 512 512">
                <path d="M410.3 231l11.3-11.3-33.9-33.9-62.1-62.1L291.7 89.8l-11.3 11.3-22.6 22.6L58.6 322.9c-10.4 10.4-18 23.3-22.2 37.4L1 480.7c-2.5 8.4-.2 17.5 6.1 23.7s15.3 8.5 23.7 6.1l120.3-35.4c14.1-4.2 27-11.8 37.4-22.2L387.7 253.7 410.3 231zM160 399.4l-9.1 22.7c-4 3.1-8.5 5.4-13.3 6.9L59.4 452l23-78.1c1.4-4.9 3.8-9.4 6.9-13.3l22.7-9.1v32c0 8.8 7.2 16 16 16h32zM362.7 18.7L348.3 33.2 325.7 55.8 314.3 67.1l33.9 33.9 62.1 62.1 33.9 33.9 11.3-11.3 22.6-22.6 14.5-14.5c25-25 25-65.5 0-90.5L453.3 18.7c-25-25-65.5-25-90.5 0zm-47.4 168l-144 144c-6.2 6.2-16.4-6.2-22.6 0s-6.2 16.4 0 22.6l144-144c6.2-6.2 16.4-6.2 22.6 0s6.2 16.4 0 22.6z"></path>
              </svg>
            </button>
            <button
              className="bin-button"
              onClick={() => {
                setItemIdToDelete(row._id);
                setIsDeleteModalOpen(true);
              }}
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "50%",
                padding: "0",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
              role="button"
              tabIndex={0}
              aria-label={`Delete entry for ${row.customerName}`}
            >
              <svg
                className="bin-top"
                viewBox="0 0 39 7"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <line
                  y1="5"
                  x2="39"
                  y2="5"
                  stroke="white"
                  strokeWidth="4"
                ></line>
                <line
                  x1="12"
                  y1="1.5"
                  x2="26.0357"
                  y2="1.5"
                  stroke="white"
                  strokeWidth="3"
                ></line>
              </svg>
              <svg
                className="bin-bottom"
                viewBox="0 0 33 39"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <mask id="path-1-inside-1_8_19" fill="white">
                  <path d="M0 0H33V35C33 37.2091 31.2091 39 29 39H4C1.79086 39 0 37.2091 0 35V0Z"></path>
                </mask>
                <path
                  d="M0 0H33H0ZM37 35C37 39.4183 33.4183 43 29 43H4C-0.418278 43 -4 39.4183 -4 35H4H29H37ZM4 43C-0.418278 43 -4 39.4183 -4 35V0H4V35V43ZM37 0V35C37 39.4183 33.4183 43 29 43V35V0H37Z"
                  fill="white"
                  mask="url(#path-1-inside-1_8_19)"
                ></path>
                <path d="M12 6L12 29" stroke="white" strokeWidth="4"></path>
                <path d="M21 6V29" stroke="white" strokeWidth="4"></path>
              </svg>
            </button>
          </Box>
        </Box>
      </motion.div>
    );
  };

  const actionButtonStyle = {
    padding: isMobile ? "8px 15px" : "10px 20px",
    background: "linear-gradient(135deg, #2575fc, #6a11cb)",
    color: "white",
    borderRadius: "12px",
    cursor: "pointer",
    fontWeight: "bold",
    border: "none",
    fontSize: isMobile ? "0.9rem" : "1rem",
    boxShadow: "0px 4px 6px rgba(0, 0, 0, 0.1)",
    transition: "transform 0.2s ease, box-shadow 0.2s ease",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
  };

  if (authLoading) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
          backgroundColor: "#f5f7fa",
        }}
      >
        <div className="loading-wave">
          <div className="loading-bar"></div>
          <div className="loading-bar"></div>
          <div className="loading-bar"></div>
          <div className="loading-bar"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
        }}
      >
        <Typography color="error" variant="h6">
          {error}
        </Typography>
      </Box>
    );
  }

  return (
    <>
      <div className="enhanced-search-bar-container">
        <input
          type="text"
          className="enhanced-search-bar"
          placeholder="🔍 Search..."
          onChange={(e) => debouncedSearchChange(e.target.value)}
        />
        {(role === "superadmin" || role === "admin") && (
          <select
            className="enhanced-filter-dropdown"
            value={selectedUsername}
            onChange={(e) => setSelectedUsername(e.target.value)}
          >
            <option value="">-- Select User --</option>
            {usernames
              .slice() // create a shallow copy to avoid mutating the original array
              .sort((a, b) => a.localeCompare(b))
              .map((username) => (
                <option key={username} value={username}>
                  {username}
                </option>
              ))}
          </select>
        )}

        <div>
          <input
            type="text"
            style={{ borderRadius: "9999px" }}
            onClick={(e) => setAnchorEl(e.currentTarget)}
            value={
              dateRange[0]?.startDate && dateRange[0]?.endDate
                ? `${dateRange[0].startDate.toLocaleDateString()} - ${dateRange[0].endDate.toLocaleDateString()}`
                : ""
            }
            placeholder="-- Select date range --"
            readOnly
            className="cursor-pointer border p-2"
            aria-label="Select date range"
          />
          <Popover
            open={Boolean(anchorEl)}
            anchorEl={anchorEl}
            onClose={() => setAnchorEl(null)}
            anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
            transformOrigin={{ vertical: "top", horizontal: "left" }}
            PaperProps={{
              sx: {
                maxWidth: isMobile ? "95vw" : "600px",
                maxHeight: isMobile ? "80vh" : "auto",
                overflowY: isMobile ? "auto" : "visible",
                overflowX: "visible",
                padding: isMobile ? "10px" : "0",
                boxSizing: "border-box",
              },
            }}
          >
            <DateRangePicker
              ranges={dateRange}
              onChange={(item) => setDateRange([item.selection])}
              moveRangeOnFirstSelection={false}
              showSelectionPreview={true}
              rangeColors={["#2575fc"]}
              editableDateInputs={true}
              months={1}
              direction="vertical"
              className={isMobile ? "mobile-date-picker" : ""}
              calendarFocus="forwards"
            />
          </Popover>
        </div>
        <select
          className="enhanced-filter-dropdown"
          value={selectedState}
          onChange={(e) => {
            setSelectedState(e.target.value);
            setSelectedCity("");
          }}
        >
          <option value="">-- Select State --</option>
          {Object.keys(statesAndCities).map((state) => (
            <option key={state} value={state}>
              {state}
            </option>
          ))}
        </select>
        <select
          className="enhanced-filter-dropdown"
          value={selectedCity}
          onChange={(e) => setSelectedCity(e.target.value)}
          disabled={!selectedState}
        >
          <option value="">-- Select City --</option>
          {selectedState &&
            statesAndCities[selectedState].map((city) => (
              <option key={city} value={city}>
                {city}
              </option>
            ))}
        </select>
        <button
          className="reset adapts-button"
          onClick={handleReset}
          style={{
            display: "flex",
            alignItems: "center",
            padding: "8px 16px",
            borderRadius: "20px",
            backgroundColor: "#007bff",
            color: "#fff",
            border: "none",
            cursor: "pointer",
            fontSize: "16px",
            transition: "all 0.3s ease",
          }}
        >
          <span style={{ fontWeight: "bold" }}>Reset</span>
          <span
            className="rounded-arrow"
            style={{
              marginLeft: "8px",
              display: "inline-flex",
              alignItems: "center",
              transition: "transform 0.3s ease",
            }}
          >
            →
          </span>
        </button>
      </div>

      <Box sx={{ minHeight: "100vh", pb: 10 }}>
        {/* Dashboard Content */}
        <Box
          sx={{
            maxWidth: isMobile ? "100%" : "90%",
            mx: "auto",
            p: isMobile ? 2 : 3,
          }}
        >
          <CallTrackingDashboard
            entries={entries}
            role={role}
            onFilterChange={setDashboardFilter}
            selectedCategory={dashboardFilter}
            userId={userId}
            selectedUsername={selectedUsername}
            dateRange={dateRange}
          />

          {/* Action Buttons */}
          <Box
            sx={{
              textAlign: "center",
              my: 3,
              display: "flex",
              flexWrap: "wrap",
              gap: 2,
              justifyContent: "center",
            }}
          >
            {" "}
            <motion.button
              onClick={() => setIsDrawerOpen(true)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              style={actionButtonStyle}
            >
              <FaClock size={16} />
              Attendance
            </motion.button>
            <motion.label
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              style={actionButtonStyle}
            >
              <FaUpload size={16} />
              Bulk Upload
              <input
                type="file"
                onChange={handleFileUpload}
                accept=".xlsx, .xls"
                style={{ display: "none" }}
              />
            </motion.label>
            <motion.button
              onClick={() => setIsAddModalOpen(true)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              style={actionButtonStyle}
            >
              <FaPlus size={16} />
              Add New Entry
            </motion.button>
            <motion.button
              onClick={() => setIsAnalyticsModalOpen(true)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              style={actionButtonStyle}
            >
              <FaChartBar size={16} />
              Analytics
            </motion.button>
            {(role === "superadmin" || role === "admin") && (
              <>
                <motion.button
                  onClick={() => setIsTeamBuilderOpen(true)}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  style={actionButtonStyle}
                >
                  <FaUsers size={16} />
                  Team Builder
                </motion.button>

                <motion.button
                  onClick={handleExport}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  style={actionButtonStyle}
                >
                  <FaFileExcel size={16} />
                  Export to Excel
                </motion.button>
              </>
            )}
          </Box>

          {/* Selection Controls */}
          {(role === "superadmin" || role === "admin") &&
            filteredData.length > 0 && (
              <Box
                sx={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 2,
                  justifyContent: "center",
                  my: 2,
                }}
              >
                {isSelectionMode && (
                  <motion.button
                    onClick={handleSelectAll}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    style={actionButtonStyle}
                  >
                    Select All
                  </motion.button>
                )}
                {selectedEntries.length > 0 && (
                  <>
                    <motion.button
                      onClick={handleCopySelected}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      style={actionButtonStyle}
                    >
                      Copy Selected ({selectedEntries.length})
                    </motion.button>
                    <motion.button
                      onClick={handleDeleteSelected}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      style={{
                        ...actionButtonStyle,
                        background: "linear-gradient(90deg, #ff4444, #cc0000)",
                      }}
                    >
                      Delete Selected ({selectedEntries.length})
                    </motion.button>
                  </>
                )}
              </Box>
            )}

          {/* Instructions */}

          <p
            style={{
              fontSize: isMobile ? "0.8rem" : "0.9rem",
              color: "#6c757d",

              textAlign: isMobile ? "center" : "center",
            }}
          >
            Upload a valid Excel file with columns:{" "}
            <strong>
              Customer Name, Mobile Number, Address, State, City, Organization,
              Category, Created At, Expected Closing Date, Follow-Up Date,
              Remarks, Products Description, Type, Close Type, Assigned To.
            </strong>
          </p>
          {/* Stats */}
          <Box
            sx={{
              display: "flex",
              flexWrap: "wrap",
              gap: 2,

              mb: 3,
            }}
          >
            {[
              { label: "Total Results", value: filteredData.length },
              { label: "Total Visits", value: totalVisits },
              { label: "Monthly Visits", value: monthlyVisits },
            ].map((stat) => (
              <Box
                key={stat.label}
                sx={{
                  background: "linear-gradient(135deg, #2575fc, #6a11cb)",
                  color: "white",
                  padding: isMobile ? "8px 12px" : "10px 15px",
                  borderRadius: "20px",
                  boxShadow: "0 2px 5px rgba(0, 0, 0, 0.2)",
                  fontWeight: "600",
                  fontSize: isMobile ? "0.9rem" : "1rem",
                  textTransform: "capitalize",
                }}
              >
                {stat.label}: {stat.value}
              </Box>
            ))}
          </Box>

          {/* Data Table/Cards */}
          <Box
            sx={{
              backgroundColor: "#fff",
              borderRadius: "15px",
              boxShadow: "0 6px 18px rgba(0, 0, 0, 0.1)",
              overflow: "hidden",
              height: isMobile ? "auto" : "75vh",
            }}
          >
            {isMobile ? (
              <Box
                sx={{
                  maxHeight: "75vh",
                  overflowY: "auto",
                  overflowX: "hidden",
                  p: 2,
                  scrollBehavior: "smooth",
                  WebkitOverflowScrolling: "touch",
                }}
              >
                {filteredData.length === 0 ? (
                  <Box
                    sx={{
                      height: "100%",
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                      fontSize: "1.2rem",
                      color: "#666",
                      fontWeight: "bold",
                      textAlign: "center",
                      p: 4,
                    }}
                  >
                    No Entries Available
                  </Box>
                ) : (
                  <FixedSizeList
                    height={window.innerHeight * 0.75}
                    width="100%"
                    itemCount={filteredData.length}
                    itemSize={280}
                    overscanCount={5}
                  >
                    {renderMobileCard}
                  </FixedSizeList>
                )}
                <Box
                  sx={{
                    position: "sticky",
                    bottom: 0,
                    background: "rgba(255, 255, 255, 0.9)",
                    backdropFilter: "blur(8px)",
                    p: 2,
                    boxShadow: "0 -2px 4px rgba(0, 0, 0, 0.1)",
                    display: "flex",
                    flexWrap: "wrap",
                    justifyContent: "center",
                    gap: 2,
                    zIndex: 10,
                  }}
                >
                  {" "}
                  <motion.button
                    onClick={() => setIsDrawerOpen(true)}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    style={actionButtonStyle}
                  >
                    <FaClock size={16} />
                    Attendance
                  </motion.button>
                  <motion.button
                    onClick={() => setIsAddModalOpen(true)}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    style={actionButtonStyle}
                  >
                    <FaPlus size={16} />
                    Add New
                  </motion.button>
                  <motion.label
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    style={actionButtonStyle}
                  >
                    <FaUpload size={16} />
                    Bulk Upload
                    <input
                      type="file"
                      onChange={handleFileUpload}
                      accept=".xlsx, .xls"
                      style={{ display: "none" }}
                    />
                  </motion.label>
                </Box>
              </Box>
            ) : (
              <>
                <Box
                  sx={{
                    background: "linear-gradient(135deg, #2575fc, #6a11cb)",
                    color: "white",
                    fontSize: "1.1rem",
                    p: "15px 20px",
                    position: "sticky",
                    top: 0,
                    zIndex: 2,
                    display: "grid",
                    gridTemplateColumns: "115px repeat(8, 1fr) 150px",
                    fontWeight: "bold",
                    borderBottom: "2px solid #ddd",
                    alignItems: "center",
                    textAlign: "center",
                  }}
                >
                  <div>SNo.</div>
                  <div>Date</div>
                  <div>Customer</div>
                  <div>Mobile</div>
                  <div>Address</div>
                  <div>City</div>
                  <div>State</div>
                  <div>Organization</div>
                  <div>Users</div>
                  <div>Actions</div>
                </Box>
                {filteredData.length === 0 ? (
                  <Box
                    sx={{
                      height: "calc(100% - 60px)",
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                      fontSize: "1.2rem",
                      color: "#666",
                      fontWeight: "bold",
                    }}
                  >
                    No Entries Available
                  </Box>
                ) : (
                  <AutoSizer>
                    {({ height, width }) => (
                      <List
                        height={height - 60}
                        rowCount={filteredData.length}
                        rowHeight={60}
                        rowRenderer={rowRenderer}
                        width={width}
                        overscanRowCount={10}
                      />
                    )}
                  </AutoSizer>
                )}
              </>
            )}
          </Box>
        </Box>
        {/* Modals and Drawers */}
        <AddEntry
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          onEntryAdded={handleEntryAdded}
        />
        <EditEntry
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          entry={entryToEdit}
          onEntryUpdated={handleEntryUpdated}
        />
        <DeleteModal
          isOpen={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
          itemId={itemIdToDelete}
          itemIds={itemIdsToDelete}
          onDelete={handleDelete}
        />
        <ViewEntry
          isOpen={isViewModalOpen}
          onClose={() => setIsViewModalOpen(false)}
          entry={entryToView}
          role={role}
        />{" "}
        <AttendanceTracker
          open={isDrawerOpen}
          onClose={() => setIsDrawerOpen(false)}
          userId={userId}
          role={role}
        />{" "}
        <AdminDrawer
          entries={entries}
          isOpen={isAnalyticsOpen}
          onClose={() => setIsAnalyticsOpen(false)}
          role={role}
          userId={userId}
          dateRange={dateRange}
        />
        <ValueAnalyticsDrawer
          entries={entries}
          isOpen={isValueAnalyticsOpen}
          onClose={() => setIsValueAnalyticsOpen(false)}
          role={role}
          userId={userId}
          dateRange={dateRange}
        />
        {(role === "superadmin" || role === "admin") && (
          <>
            <TeamBuilder
              isOpen={isTeamBuilderOpen}
              onClose={() => setIsTeamBuilderOpen(false)}
              userRole={role}
              userId={userId}
            />

            {role === "superadmin" && (
              <TeamAnalyticsDrawer
                entries={entries}
                isOpen={isTeamAnalyticsOpen}
                onClose={() => setIsTeamAnalyticsOpen(false)}
                role={role}
                userId={userId}
                dateRange={dateRange}
              />
            )}
          </>
        )}
        {/* Analytics Modal */}
        {isAnalyticsModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: "rgba(0, 0, 0, 0.6)",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              zIndex: 1000,
            }}
            onClick={() => setIsAnalyticsModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ duration: 0.3 }}
              style={{
                background: "white",
                borderRadius: "16px",
                width: isMobile ? "90%" : "400px",
                maxWidth: "400px",
                boxShadow: "0px 8px 24px rgba(0, 0, 0, 0.2)",
                position: "relative",
                overflow: "hidden",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <Box
                sx={{
                  p: isMobile ? 2 : 3,
                  borderBottom: "1px solid #e0e0e0",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <Typography
                  variant="h6"
                  sx={{ fontWeight: "600", color: "#333" }}
                >
                  Analytics Options
                </Typography>
                <button
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    fontSize: "1.2rem",
                    color: "#666",
                    transition: "color 0.2s ease",
                  }}
                  onClick={() => setIsAnalyticsModalOpen(false)}
                  onMouseEnter={(e) => (e.target.style.color = "#2575fc")}
                  onMouseLeave={(e) => (e.target.style.color = "#666")}
                >
                  ✕
                </button>
              </Box>
              <Box
                sx={{
                  p: isMobile ? 2 : 3,
                  display: "flex",
                  flexDirection: "column",
                  gap: 2,
                }}
              >
                <motion.button
                  onClick={() => {
                    setIsAnalyticsOpen(true);
                    setIsAnalyticsModalOpen(false);
                  }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  style={actionButtonStyle}
                >
                  <FaChartBar size={16} />
                  Team Analytics
                </motion.button>
                <motion.button
                  onClick={() => {
                    setIsValueAnalyticsOpen(true);
                    setIsAnalyticsModalOpen(false);
                  }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  style={actionButtonStyle}
                >
                  <FaChartBar size={16} />
                  Value Analytics
                </motion.button>
                {role === "superadmin" && (
                  <motion.button
                    onClick={() => {
                      setIsTeamAnalyticsOpen(true);
                      setIsAnalyticsModalOpen(false);
                    }}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    style={actionButtonStyle}
                  >
                    <FaChartBar size={16} />
                    Team-Wise Analytics
                  </motion.button>
                )}
              </Box>
            </motion.div>
          </motion.div>
        )}
      </Box>
      {/* Footer */}
      <footer className="footer-container">
        <p style={{ marginTop: "10px", color: "white", height: "10px" }}>
          © 2025 CRM. All rights reserved.
        </p>
      </footer>
    </>
  );
}

export default DashBoard;
