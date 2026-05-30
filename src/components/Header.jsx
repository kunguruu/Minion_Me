import React, { useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { Button } from "./ui/button";
import logo from "../assets/logo.svg";
import { useNotification } from "../context/useNotification";
import { useAuth } from "../context/useAuth";

function Header() {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const { unreadCount } = useNotification();
  const { user, isAuthenticated, authChecked, isLoadingAuth, logout } = useAuth();
  const role = user?.role;
  const isSignedIn = authChecked && isAuthenticated;
  const canRenderProtectedNav = authChecked && !isLoadingAuth;

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const navClass = ({ isActive }) =>
    `font-medium transition-all hover:text-primary ${
      isActive ? "text-primary underline" : ""
    }`;

  return (
    <header className="shadow-sm p-5">
      <div className="flex justify-between items-center">
        {/* Logo */}
        <Link to="/">
          <img
            src={logo}
            alt="Logo"
            width={150}
            className="cursor-pointer"
          />
        </Link>

        {/* Desktop Nav */}
        <ul className="hidden md:flex gap-12 items-center">
          <NavLink to="/" className={navClass}>Home</NavLink>
          <NavLink to="/about" className={navClass}>About</NavLink>
          <NavLink to="/contact" className={navClass}>Contact Us</NavLink>

          {canRenderProtectedNav && isSignedIn && role === "client" && (
            <NavLink to="/post-task" className={navClass}>
              Post a Task
            </NavLink>
          )}

          {canRenderProtectedNav && isSignedIn && role === "minion" && (
            <NavLink to="/find-gigs" className={navClass}>
              Find Gigs
            </NavLink>
          )}

          {canRenderProtectedNav && isSignedIn && (
            <NavLink to="/notifications" className={navClass}>
              Notifications {unreadCount > 0 ? `(${unreadCount})` : ""}
            </NavLink>
          )}
        </ul>

        {/* Auth + Mobile Toggle */}
        <div className="flex items-center gap-4">
          {canRenderProtectedNav && isSignedIn ? (
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium">
                Hi, {user.first_name}!
              </span>
              <Button onClick={handleLogout} variant="outline" size="sm">
                Sign Out
              </Button>
            </div>
          ) : (
            <Link to="/login">
              <Button>Sign In</Button>
            </Link>
          )}

          {/* Hamburger */}
          <button
            className="md:hidden text-2xl"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            ☰
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {menuOpen && (
        <div className="md:hidden mt-4 flex flex-col gap-4">
          <NavLink onClick={() => setMenuOpen(false)} to="/" className={navClass}>
            Home
          </NavLink>
          <NavLink onClick={() => setMenuOpen(false)} to="/about" className={navClass}>
            About
          </NavLink>
          <NavLink onClick={() => setMenuOpen(false)} to="/contact" className={navClass}>
            Contact
          </NavLink>

          {canRenderProtectedNav && isSignedIn && role === "client" && (
            <NavLink onClick={() => setMenuOpen(false)} to="/post-task" className={navClass}>
              Post a Task
            </NavLink>
          )}

          {canRenderProtectedNav && isSignedIn && role === "minion" && (
            <NavLink onClick={() => setMenuOpen(false)} to="/find-gigs" className={navClass}>
              Find Gigs
            </NavLink>
          )}

          {canRenderProtectedNav && isSignedIn && (
            <NavLink onClick={() => setMenuOpen(false)} to="/notifications" className={navClass}>
              Notifications {unreadCount > 0 ? `(${unreadCount})` : ""}
            </NavLink>
          )}

          {/* Mobile Auth Button */}
          {(!canRenderProtectedNav || !isSignedIn) && (
            <Link to="/login" onClick={() => setMenuOpen(false)}>
              <Button className="w-full">Sign In</Button>
            </Link>
          )}
          
          {canRenderProtectedNav && isSignedIn && (
            <Button 
              onClick={() => {
                setMenuOpen(false);
                handleLogout();
              }} 
              variant="outline" 
              className="w-full"
            >
              Sign Out
            </Button>
          )}
        </div>
      )}
    </header>
  );
}

export default Header;
