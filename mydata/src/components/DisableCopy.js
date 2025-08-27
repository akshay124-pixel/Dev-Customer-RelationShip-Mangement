import React, { useEffect } from "react";

const DisableCopy = ({ role }) => {
  useEffect(() => {
    if (role !== "admin" && role !== "superadmin") {
      const disableCopy = (e) => e.preventDefault();
      document.addEventListener("copy", disableCopy);
      document.addEventListener("cut", disableCopy);
      document.addEventListener("paste", disableCopy);
      document.addEventListener("contextmenu", disableCopy);
      document.body.style.userSelect = "none";

      return () => {
        document.removeEventListener("copy", disableCopy);
        document.removeEventListener("cut", disableCopy);
        document.removeEventListener("paste", disableCopy);
        document.removeEventListener("contextmenu", disableCopy);
        document.body.style.userSelect = "auto";
      };
    }
  }, [role]);

  return null;
};

export default DisableCopy;
