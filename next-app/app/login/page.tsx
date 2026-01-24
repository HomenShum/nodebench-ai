import { Metadata } from "next";
import { LoginClient } from "./LoginClient";

export const metadata: Metadata = {
  title: "Sign In - NodeBench AI",
  description: "Sign in to your NodeBench AI account",
};

export default function LoginPage() {
  return <LoginClient />;
}
