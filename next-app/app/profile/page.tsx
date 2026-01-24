import { Metadata } from "next";
import { ProfileClient } from "./ProfileClient";

export const metadata: Metadata = {
  title: "Profile - NodeBench AI",
  description: "Manage your NodeBench AI profile and account settings",
};

export default function ProfilePage() {
  return <ProfileClient />;
}
