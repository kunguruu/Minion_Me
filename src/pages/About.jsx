import React from "react";

function About() {
  return (
    <div className="max-w-6xl mx-auto px-6 py-16">
      
      {/* Hero */}
      <section className="text-center mb-16">
        <h1 className="text-4xl md:text-5xl font-bold mb-6">
          About Minion Me
        </h1>
        <p className="text-lg text-gray-600 max-w-3xl mx-auto">
          Minion Me connects people who need help with people who are ready to work.
          Simple tasks. Real people. Fair pay. No nonsense.
        </p>
      </section>

      {/* Mission */}
      <section className="grid md:grid-cols-2 gap-12 mb-20">
        <div>
          <h2 className="text-2xl font-semibold mb-4">Our Mission</h2>
          <p className="text-gray-600 leading-relaxed">
            We believe meaningful work doesn’t have to be complicated.
            Minion Me exists to make it easy for anyone to get help with everyday
            tasks — and just as easy for skilled, reliable people to earn from
            their time and talent.
          </p>
        </div>

        <div>
          <h2 className="text-2xl font-semibold mb-4">Why We Built This</h2>
          <p className="text-gray-600 leading-relaxed">
            Too often, small jobs fall through the cracks. They’re too big to ignore
            and too small for traditional services. Minion Me bridges that gap,
            turning “I wish someone could help” into “done.”
          </p>
        </div>
      </section>

      {/* How it works */}
      <section className="mb-20">
        <h2 className="text-2xl font-semibold text-center mb-10">
          How It Works
        </h2>

        <div className="grid md:grid-cols-3 gap-8">
          <div className="p-6 rounded-2xl shadow-sm border">
            <h3 className="font-semibold text-lg mb-2">Post a Task</h3>
            <p className="text-gray-600">
              Describe what you need done, set your budget, and publish your task
              in minutes.
            </p>
          </div>

          <div className="p-6 rounded-2xl shadow-sm border">
            <h3 className="font-semibold text-lg mb-2">Get Matched</h3>
            <p className="text-gray-600">
              Skilled minions nearby browse tasks and apply based on their expertise.
            </p>
          </div>

          <div className="p-6 rounded-2xl shadow-sm border">
            <h3 className="font-semibold text-lg mb-2">Get It Done</h3>
            <p className="text-gray-600">
              Choose the right person, get the task completed, and pay securely.
            </p>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="text-center">
        <h2 className="text-2xl font-semibold mb-6">Our Values</h2>
        <p className="text-gray-600 max-w-3xl mx-auto">
          Trust, fairness, and simplicity guide every decision we make.
          We’re building Minion Me to empower communities, not complicate them.
        </p>
      </section>

    </div>
  );
}

export default About;
