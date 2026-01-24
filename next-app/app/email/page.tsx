import { Metadata } from "next";
import { EmailClient } from "./EmailClient";

export const metadata: Metadata = {
  title: "Email Intelligence - NodeBench AI",
  description: "AI-powered email analysis and intelligence dashboard",
};

export default function EmailPage() {
  return <EmailClient />;
}
