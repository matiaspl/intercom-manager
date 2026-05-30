import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router";
import { hasConfiguredBackend } from "../../config";
import { isMobileApp } from "../../platform";

export const MobileInit = () => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!isMobileApp()) return;
    if (!hasConfiguredBackend() && location.pathname !== "/settings") {
      navigate("/settings", { replace: true });
    }
  }, [navigate, location.pathname]);

  return null;
};
