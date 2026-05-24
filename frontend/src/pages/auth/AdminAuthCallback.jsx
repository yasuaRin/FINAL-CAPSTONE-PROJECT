import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../services/supabase";

const AdminAuthCallback = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const fullHash = window.location.hash;
        console.log("Full hash:", fullHash);

        const tokenPart = fullHash.includes("access_token=") ? fullHash.substring(fullHash.indexOf("access_token=") - 1) : null;

        if (!tokenPart) {
          console.log("No token in URL hash");
          navigate("/admin/login", { replace: true });
          return;
        }

        const params = new URLSearchParams(tokenPart.startsWith("#") ? tokenPart.slice(1) : tokenPart);
        const accessToken = params.get("access_token");
        const refreshToken = params.get("refresh_token");

        console.log("accessToken found:", !!accessToken);
        console.log("refreshToken found:", !!refreshToken);

        if (!accessToken) {
          console.log("No access token parsed");
          navigate("/admin/login", { replace: true });
          return;
        }

        // Decode user dari JWT
        const base64Url = accessToken.split(".")[1];
        const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
        const payload = JSON.parse(window.atob(base64));

        const sessionData = {
          access_token: accessToken,
          refresh_token: refreshToken,
          token_type: "bearer",
          expires_in: parseInt(params.get("expires_in") || "3600"),
          expires_at: Math.floor(Date.now() / 1000) + parseInt(params.get("expires_in") || "3600"),
          user: {
            id: payload.sub,
            email: payload.email,
            user_metadata: payload.user_metadata || {},
          },
        };

        localStorage.setItem("sb-auth-token", JSON.stringify(sessionData));
        console.log("Session saved, user:", sessionData.user.email);

        const domain = sessionData.user.email.split("@")[1];
        if (!["gmail.com", "vidhelp.com"].includes(domain)) {
          localStorage.removeItem("sb-auth-token");
          navigate("/admin/login", { replace: true, state: { message: "Email domain not allowed." } });
          return;
        }

        // Query langsung via REST API pakai Bearer token
        console.log("Querying team_members...");
        const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/team_members?auth_user_id=eq.${sessionData.user.id}&select=role,status&limit=1`, {
          headers: {
            apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        });

        const members = await response.json();
        console.log("memberData via fetch:", members);

        const memberData = members[0];

        if (!memberData) {
          localStorage.removeItem("sb-auth-token");
          navigate("/admin/login", { replace: true, state: { message: "Account not found. Please contact Super Admin." } });
          return;
        }

        if (memberData.status !== "active") {
          localStorage.removeItem("sb-auth-token");
          navigate("/admin/login", { replace: true, state: { message: "Your account has been deactivated." } });
          return;
        }

        if (memberData.role === "staff") {
          localStorage.removeItem("sb-auth-token");
          navigate("/admin/login", { replace: true, state: { message: "Staff accounts do not have access to the Admin Portal." } });
          return;
        }

        console.log("All validations passed! Navigating to /admin...");
        await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        await new Promise(resolve => setTimeout(resolve, 500));
        navigate("/admin", { replace: true });
      } catch (err) {
        console.error("Callback error:", err);
        navigate("/admin/login", { replace: true });
      }
    };

    handleCallback();
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-[#0A0A0A]">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-gray-200 border-t-[#DB1A1A] rounded-full animate-spin" />
        <p className="text-sm text-gray-500">Verifying your account...</p>
      </div>
    </div>
  );
};

export default AdminAuthCallback;
