import { auth } from "@clerk/nextjs/server";
import React from "react";

const HomePage = async () => {
  await auth.protect();

  return <div>HomePage</div>;
};

export default HomePage;
