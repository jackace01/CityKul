import React from "react";
import Layout from "../components/Layout";
import { Link, useNavigate } from "react-router-dom";
import { demoSignIn } from "../lib/auth";

export default function Login() {
  const nav = useNavigate();

  function onSubmit(e) {
    e.preventDefault();
    // Mock sign-in
    demoSignIn({ name: "Citizen", city: "Indore", locality: "Vijay Nagar", member: false });
    nav("/home");
  }

  return (
    <Layout>
      <div className="max-w-xl mx-auto bg-white dark:bg-gray-900 p-6 rounded-xl shadow-md transition-colors">
        <div className="text-center mb-4">
          <div className="text-2xl font-bold">CityKul</div>
          <div className="text-[12px] text-gray-500 dark:text-gray-400 -mt-1">Your City, Your Vibe</div>
        </div>

        <p className="text-sm text-gray-700 dark:text-gray-300 mb-4">
          CityKul is your city’s living hub — discover events, find local jobs, buy & sell from neighbors, and work together to fix civic issues.
          Become a member to post and earn. Build a trusted local reputation with verified contributions.
        </p>

        <form onSubmit={onSubmit} className="flex flex-col gap-3">
          <input type="email" placeholder="Email" className="border rounded p-2 dark:bg-gray-800 dark:text-white" />
          <input type="password" placeholder="Password" className="border rounded p-2 dark:bg-gray-800 dark:text-white" />
          <button type="submit" className="bg-[var(--color-accent)] text-white p-2 rounded font-semibold">Sign In</button>
        </form>

        <div className="mt-3">
          <button className="w-full border rounded p-2 text-sm dark:border-gray-700">Continue with Google (placeholder)</button>
        </div>

        <p className="text-center text-sm mt-4 text-gray-700 dark:text-gray-300">
          New here? <Link to="/signup" className="text-blue-600">Create an account</Link>
        </p>
      </div>
    </Layout>
  );
}
