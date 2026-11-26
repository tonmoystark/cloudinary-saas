import { auth } from "@clerk/nextjs/server";
import React from "react";

const SocialSharePage = async () => {
  await auth.protect();

  return <div>SocialSharePage</div>;
};

export default SocialSharePage;
