import { useEffect, useMemo, useState } from "react";
import Layout from "../components/Layout";
import { INDIA_CITIES } from "../lib/indiaCities";
import { demoSignIn, setCityLocality, setUser } from "../lib/auth";
import { useNavigate, Link } from "react-router-dom";

export default function Signup() {
  const nav = useNavigate();

  const [type, setType] = useState("free"); // "free" | "member"
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  const [cityQuery, setCityQuery] = useState("");
  const [city, setCity] = useState("");
  const [localityQuery, setLocalityQuery] = useState("");
  const [locality, setLocality] = useState("");

  const [profession, setProfession] = useState("Other");
  const [customProfession, setCustomProfession] = useState("");

  const professions = [
    "Student", "Engineer", "Designer", "Doctor", "Teacher", "Self-employed", "Homemaker", "Other"
  ];

  const cityOptions = useMemo(() => {
    const base = INDIA_CITIES.map(c => c.city);
    const q = cityQuery.trim().toLowerCase();
    return q ? base.filter(x => x.toLowerCase().includes(q)) : base;
  }, [cityQuery]);

  const localityOptions = useMemo(() => {
    const match = INDIA_CITIES.find(c => c.city === city);
    const base = match?.localities || [];
    const q = localityQuery.trim().toLowerCase();
    return q ? base.filter(x => x.toLowerCase().includes(q)) : base;
  }, [city, localityQuery]);

  useEffect(() => {
    // when city changes, reset locality
    setLocality("");
    setLocalityQuery("");
  }, [city]);

  function onSubmit(e) {
    e.preventDefault();
    const prof = profession === "Other" ? customProfession : profession;

    // mock verification flags
    const user = {
      name: name || "New User",
      email: email || `user-${Date.now()}@demo.local`,
      phone,
      city: city || "Indore",
      locality,
      member: type === "member",
      gov: false,
      profession: prof || "",
      since: Date.now()
    };
    setUser(user);
    setCityLocality(user.city, user.locality);

    // to simulate “signed-in” after signup
    demoSignIn({
      name: user.name,
      email: user.email,
      city: user.city,
      locality: user.locality,
      member: user.member,
      profession: user.profession,
      phone: user.phone
    });

    // go to home
    nav("/home");
  }

  return (
    <Layout>
      <div className="min-h-[80vh] grid place-items-center">
        <form onSubmit={onSubmit} className="w-full max-w-2xl bg-white dark:bg-gray-900 text-black dark:text-white rounded-xl p-6 shadow">
          <h2 className="text-2xl font-bold text-center mb-6">Create your account</h2>

          {/* plan type */}
          <div className="mb-4 flex gap-3">
            <label className={`px-3 py-2 rounded ring-1 cursor-pointer ${type==="free" ? "bg-gray-100 dark:bg-gray-800 ring-gray-300 dark:ring-gray-700" : "ring-gray-300 dark:ring-gray-700"}`}>
              <input type="radio" className="mr-2" name="type" checked={type==="free"} onChange={()=>setType("free")} />
              Free (view + interact in Trending)
            </label>
            <label className={`px-3 py-2 rounded ring-1 cursor-pointer ${type==="member" ? "bg-gray-100 dark:bg-gray-800 ring-gray-300 dark:ring-gray-700" : "ring-gray-300 dark:ring-gray-700"}`}>
              <input type="radio" className="mr-2" name="type" checked={type==="member"} onChange={()=>setType("member")} />
              Member ₹100 (post everywhere + earn, blue tick)
            </label>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm mb-1">Username</label>
              <input value={name} onChange={e=>setName(e.target.value)} className="w-full border rounded px-3 py-2 dark:bg-gray-800" required />
            </div>
            <div>
              <label className="block text-sm mb-1">Password</label>
              <input type="password" value={password} onChange={e=>setPassword(e.target.value)} className="w-full border rounded px-3 py-2 dark:bg-gray-800" required />
            </div>

            <div>
              <label className="block text-sm mb-1">Email (to verify)</label>
              <input type="email" value={email} onChange={e=>setEmail(e.target.value)} className="w-full border rounded px-3 py-2 dark:bg-gray-800" required />
            </div>
            <div>
              <label className="block text-sm mb-1">Mobile (to verify)</label>
              <input type="tel" value={phone} onChange={e=>setPhone(e.target.value)} className="w-full border rounded px-3 py-2 dark:bg-gray-800" required />
            </div>

            {/* City & Locality with dropdowns + manual */}
            <div>
              <label className="block text-sm mb-1">City (India)</label>
              <input
                placeholder="Search city…"
                value={cityQuery}
                onChange={(e)=>setCityQuery(e.target.value)}
                className="w-full border rounded px-3 py-2 dark:bg-gray-800 mb-2"
              />
              <select
                value={city}
                onChange={(e)=>setCity(e.target.value)}
                className="w-full border rounded px-3 py-2 dark:bg-gray-800"
              >
                <option value="">Select a city</option>
                {cityOptions.map(c => <option key={c} value={c}>{c}</option>)}
                <option value="">Other (type below)</option>
              </select>
              <input
                placeholder="Or type city manually…"
                value={city}
                onChange={(e)=>setCity(e.target.value)}
                className="w-full border rounded px-3 py-2 dark:bg-gray-800 mt-2"
              />
            </div>

            <div>
              <label className="block text-sm mb-1">Locality / Neighbourhood</label>
              <input
                placeholder="Search locality…"
                value={localityQuery}
                onChange={(e)=>setLocalityQuery(e.target.value)}
                className="w-full border rounded px-3 py-2 dark:bg-gray-800 mb-2"
              />
              <select
                value={locality}
                onChange={(e)=>setLocality(e.target.value)}
                className="w-full border rounded px-3 py-2 dark:bg-gray-800"
              >
                <option value="">Select a locality</option>
                {localityOptions.map(l => <option key={l} value={l}>{l}</option>)}
                <option value="">Other (type below)</option>
              </select>
              <input
                placeholder="Or type locality manually…"
                value={locality}
                onChange={(e)=>setLocality(e.target.value)}
                className="w-full border rounded px-3 py-2 dark:bg-gray-800 mt-2"
              />
            </div>

            {/* Profession */}
            <div>
              <label className="block text-sm mb-1">Profession</label>
              <select value={profession} onChange={(e)=>setProfession(e.target.value)} className="w-full border rounded px-3 py-2 dark:bg-gray-800">
                {professions.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
              {profession === "Other" && (
                <input placeholder="Type your profession…" value={customProfession} onChange={e=>setCustomProfession(e.target.value)} className="w-full border rounded px-3 py-2 dark:bg-gray-800 mt-2" />
              )}
            </div>

            <div className="md:col-span-2">
              <button className="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700">Sign Up</button>
            </div>
          </div>

          <p className="text-center text-sm mt-4">
            Already have an account? <Link to="/login" className="text-blue-600">Login</Link>
          </p>
        </form>
      </div>
    </Layout>
  );
}
