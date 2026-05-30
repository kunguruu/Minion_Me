import React from 'react'
import { Link } from "react-router-dom";

function Hero() {
  return (
    <section className="w-full bg-background min-h-[calc(100vh-80px)] flex items-center">
      <div className="mx-auto max-w-7xl px-6 grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
        
        {/* Left: Text */}
        <div>
          <h1 className="text-4xl md:text-5xl font-bold text-foreground leading-tight">
            Get help with everyday tasks,
            <span className="text-primary"> fast and hassle-free</span>
          </h1>

          <p className="mt-6 text-lg text-muted-foreground max-w-2xl">
            Minion Me connects you with trusted helpers for errands, home tasks,
            deliveries, and more. Post a task, pick a minion, and get it done.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row gap-4">
            <Link to="/sign-up">
              <button className="bg-primary text-primary-foreground px-6 py-3 rounded-xl font-medium hover:opacity-90 transition">
                Find a Minion
              </button>
            </Link>

            <Link to="/become-minion">
              <button className="border border-border px-6 py-3 rounded-xl font-medium hover:bg-muted transition">
                Become a Minion
              </button>
            </Link>
          </div>

          <p className="mt-4 text-sm text-muted-foreground">
            No commitment. Pay only when the task is done.
          </p>
        </div>

        {/* Right: Visual */}
        <div className="relative flex justify-center">
          <div className="absolute -inset-10 bg-primary/20 rounded-[2rem] blur-3xl"></div>

          <div className="relative w-85 md:w-105 lg:w-120 aspect-3/5 rounded-3xl lg:scale-105 overflow-hidden shadow-xl">
            <img
              src="/MinionMaid.jpg"
              alt="Working Minion"
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      </div>
    </section>
  );
}

export default Hero;