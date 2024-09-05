import { useEffect, useState } from "preact/hooks";

export default function DarkModeToggle() {
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    const isDark = localStorage?.getItem("darkMode") === "true";
    setIsDarkMode(isDark);
    document.documentElement.classList.toggle("dark", isDark);
  }, []);

  const toggleDarkMode = () => {
    const newDarkMode = !isDarkMode;
    setIsDarkMode(newDarkMode);
    localStorage?.setItem("darkMode", newDarkMode.toString());
    document.documentElement.classList.toggle("dark", newDarkMode);
  };

  return (
    <button
      onClick={toggleDarkMode}
      class="p-2 rounded-full bg-gray-200 dark:bg-gray-700"
    >
      {!isDarkMode ? "🌙" : "☀️"}
      <span class="sr-only">Toggle Dark Mode</span>
    </button>
  );
}
