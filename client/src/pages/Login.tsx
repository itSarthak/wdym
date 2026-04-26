import { useState } from "react";
import { useNavigate, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { api } from "../lib/api";
import { useAuthStore } from "../store/auth";
import { Input } from "../components/ui/Input";
import { Button } from "../components/ui/Button";
import { ThemeToggle } from "../components/ui/ThemeToggle";

export default function Login() {
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { data } = await api.post("/auth/login", { email, password });
      setAuth(data.user, data.accessToken, data.refreshToken);
      navigate({ to: "/dashboard" });
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })
        ?.response?.data?.error;
      setError(msg || "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-white dark:bg-black px-4">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>

      <motion.div
        className="w-full max-w-sm"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
      >
        <div className="mb-8">
          <h1 className="text-xl font-semibold tracking-tight text-[#09090b] dark:text-white">
            wdym
          </h1>
          <p className="text-sm text-[#71717a] dark:text-[#555] mt-1">
            Sign in to your account
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input
            id="email"
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
            required
          />
          <Input
            id="password"
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            autoComplete="current-password"
            required
          />

          {error && <p className="text-xs text-red-500">{error}</p>}

          <Button type="submit" disabled={loading} className="mt-2">
            {loading ? "Signing in…" : "Sign in →"}
          </Button>
        </form>

        <p className="text-xs text-[#a1a1aa] dark:text-[#555] mt-6 text-center">
          No account?{" "}
          <Link
            to="/register"
            className="text-[#09090b] dark:text-white hover:underline"
          >
            Register
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
