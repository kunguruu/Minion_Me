import React from "react";
import { Button } from "../components/ui/button";

function Contact() {
  return (
    <div className="max-w-5xl mx-auto px-6 py-16">
      
      {/* Header */}
      <section className="text-center mb-14">
        <h1 className="text-4xl md:text-5xl font-bold mb-4">
          Contact Us
        </h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Questions, feedback, or need help getting started?  
          We’re here to make things easier.
        </p>
      </section>

      {/* Content */}
      <section className="grid md:grid-cols-2 gap-12">
        
        {/* Info */}
        <div>
          <h2 className="text-2xl font-semibold mb-4">Get in Touch</h2>
          <p className="text-gray-600 mb-6 leading-relaxed">
            Whether you’re posting your first task or signing up as a minion,
            our support team is ready to help. We aim to respond clearly, quickly,
            and like actual humans.
          </p>

          <div className="space-y-3 text-gray-700">
            <p><strong>Email:</strong> support@minionme.com</p>
            <p><strong>Hours:</strong> Monday – Friday, 9am – 6pm</p>
            <p><strong>Location:</strong> Remote-first</p>
          </div>
        </div>

        {/* Form */}
        <form className="space-y-6">
          <div>
            <label className="block mb-1 font-medium">Name</label>
            <input
              type="text"
              placeholder="Your name"
              className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block mb-1 font-medium">Email</label>
            <input
              type="email"
              placeholder="you@example.com"
              className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block mb-1 font-medium">Message</label>
            <textarea
              rows="5"
              placeholder="Tell us how we can help…"
              className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <Button type="submit" className="w-full">
            Send Message
          </Button>
        </form>

      </section>
    </div>
  );
}

export default Contact;
