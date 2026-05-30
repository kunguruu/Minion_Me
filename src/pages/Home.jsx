import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  BadgeCheck,
  Briefcase,
  ChevronDown,
  Clock3,
  Hammer,
  HeartHandshake,
  Home,
  MapPin,
  Package,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  Truck,
  Users,
  Wrench
} from 'lucide-react';

const quickCategories = ['Cleaning', 'Delivery', 'Errands', 'Moving', 'Handyman'];

const popularCategories = [
  {
    name: 'Home Cleaning',
    description: 'Book trusted help for deep cleaning, laundry, and same-day tidy-ups.',
    icon: Home,
    accent: 'from-minion-yellow to-minion-yellow-light'
  },
  {
    name: 'Delivery Runs',
    description: 'Fast pickups and drop-offs for groceries, parcels, and personal items.',
    icon: Truck,
    accent: 'from-minion-blue to-minion-blue-light'
  },
  {
    name: 'Errands',
    description: 'Get everyday to-dos handled while you stay focused on what matters.',
    icon: Package,
    accent: 'from-sky-400 to-minion-blue-light'
  },
  {
    name: 'Moving Help',
    description: 'Reliable hands for lifting, packing, loading, and short-distance moves.',
    icon: Briefcase,
    accent: 'from-amber-400 to-minion-yellow-dark'
  },
  {
    name: 'Handyman',
    description: 'Support for installations, repairs, assembly, and home fixes.',
    icon: Hammer,
    accent: 'from-minion-blue-dark to-minion-blue'
  },
  {
    name: 'Personal Support',
    description: 'Flexible helpers for event setup, queueing, errands, and assistant tasks.',
    icon: HeartHandshake,
    accent: 'from-emerald-400 to-teal-500'
  }
];

const processSteps = [
  {
    step: '01',
    title: 'Post a Task',
    description: 'Tell us what you need, your location, and when you need it done.',
    icon: Sparkles
  },
  {
    step: '02',
    title: 'Get Matched',
    description: 'Review skilled minions who fit your task, timeline, and budget.',
    icon: Users
  },
  {
    step: '03',
    title: 'Get it Done',
    description: 'Choose your helper, track progress, and pay securely after completion.',
    icon: ShieldCheck
  }
];

const featuredMinions = [
  {
    name: 'Amina W.',
    specialty: 'Home Cleaning Specialist',
    rating: 4.9,
    jobsCompleted: 148,
    location: 'Westlands, Nairobi',
    image: '/MinionMaid.jpg'
  },
  {
    name: 'Brian K.',
    specialty: 'Errands and Delivery Pro',
    rating: 4.8,
    jobsCompleted: 121,
    location: 'Kilimani, Nairobi',
    image: '/MinionMaid.jpg'
  },
  {
    name: 'Faith M.',
    specialty: 'Moving and Packing Help',
    rating: 4.9,
    jobsCompleted: 96,
    location: 'Karen, Nairobi',
    image: '/MinionMaid.jpg'
  }
];

const featureHighlights = [
  {
    title: 'Vetted helpers you can trust',
    description: 'Minions build profiles, ratings, and verified identities so you can hire with confidence.',
    icon: BadgeCheck
  },
  {
    title: 'Fast matches for urgent tasks',
    description: 'Designed for everyday jobs that cannot wait until next week or next month.',
    icon: Clock3
  },
  {
    title: 'Secure, transparent payments',
    description: 'Track tasks, agree on budgets, and keep payment conversations clear from the start.',
    icon: ShieldCheck
  },
  {
    title: 'Built for real-life services',
    description: 'From cleaning to handyman work, Minion Me is focused on practical, local help.',
    icon: Wrench
  }
];

const testimonials = [
  {
    quote: 'I posted a last-minute cleaning task and had responses in minutes. The whole flow felt effortless.',
    name: 'Janet N.',
    role: 'Client',
    rating: 5
  },
  {
    quote: 'Minion Me helps me find steady work nearby without wasting time chasing unreliable leads.',
    name: 'Kevin O.',
    role: 'Minion',
    rating: 5
  },
  {
    quote: 'The platform feels professional but simple. I can hire help, track progress, and pay without stress.',
    name: 'Mercy A.',
    role: 'Client',
    rating: 5
  }
];

const stats = [
  { label: 'Tasks completed', value: 1200, suffix: '+' },
  { label: 'Active minions', value: 350, suffix: '+' },
  { label: 'Average response time', value: 15, suffix: ' min' },
  { label: 'Client satisfaction', value: 96, suffix: '%' }
];

const faqs = [
  {
    question: 'How do I hire a minion?',
    answer:
      'Start by posting your task or creating a client account. Share what you need, review available helpers, and choose the minion that fits your budget and timing.'
  },
  {
    question: 'Are minions verified?',
    answer:
      'Minion Me is built around trust signals like verified profiles, ratings, completed jobs, and platform activity so clients can make informed choices.'
  },
  {
    question: 'What kind of tasks can I post?',
    answer:
      'You can post cleaning, delivery, moving help, errands, handyman work, event support, and other practical local tasks.'
  },
  {
    question: 'How do payments work?',
    answer:
      'Clients and minions agree on the budget up front, and payments are tracked on-platform so both sides have a clearer record of the job.'
  }
];

function CountUp({ value, suffix }) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    let frameId;
    const duration = 1200;
    const start = performance.now();

    const animate = (timestamp) => {
      const progress = Math.min((timestamp - start) / duration, 1);
      const eased = 1 - (1 - progress) * (1 - progress);
      setDisplayValue(Math.round(value * eased));

      if (progress < 1) {
        frameId = window.requestAnimationFrame(animate);
      }
    };

    frameId = window.requestAnimationFrame(animate);

    return () => window.cancelAnimationFrame(frameId);
  }, [value]);

  return (
    <span>
      {displayValue}
      {suffix}
    </span>
  );
}

function SectionHeading({ eyebrow, title, description, center = false }) {
  return (
    <div className={center ? 'mx-auto max-w-3xl text-center' : 'max-w-3xl'}>
      <p className="text-sm font-semibold uppercase tracking-[0.28em] text-minion-blue">{eyebrow}</p>
      <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">{title}</h2>
      {description && <p className="mt-4 text-base leading-7 text-slate-600 sm:text-lg">{description}</p>}
    </div>
  );
}

function CategoryCard({ category }) {
  const Icon = category.icon;

  return (
    <Link
      to="/sign-up"
      className="group rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm transition duration-300 hover:-translate-y-1 hover:border-minion-blue/30 hover:shadow-xl"
    >
      <div className={`inline-flex rounded-2xl bg-gradient-to-br ${category.accent} p-3 text-white shadow-md`}>
        <Icon className="h-6 w-6" />
      </div>
      <h3 className="mt-5 text-xl font-bold text-slate-900">{category.name}</h3>
      <p className="mt-3 text-sm leading-6 text-slate-600">{category.description}</p>
      <div className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-minion-blue">
        Explore category
        <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
      </div>
    </Link>
  );
}

function MinionCard({ minion }) {
  return (
    <article className="group overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-2xl">
      <div className="relative h-56 overflow-hidden">
        <img
          src={minion.image}
          alt={minion.name}
          className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-x-0 bottom-0 h-24 bg-linear-to-t from-slate-950/70 to-transparent" />
        <div className="absolute bottom-4 left-4 rounded-full bg-white/95 px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] text-minion-blue">
          Featured
        </div>
      </div>

      <div className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-xl font-bold text-slate-900">{minion.name}</h3>
            <p className="mt-1 text-sm font-medium text-minion-blue">{minion.specialty}</p>
          </div>
          <div className="rounded-full bg-yellow-100 px-3 py-1 text-sm font-bold text-amber-900">
            {minion.rating} <Star className="mb-0.5 ml-1 inline h-4 w-4 fill-current" />
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="text-slate-500">Jobs completed</p>
            <p className="mt-1 text-lg font-bold text-slate-900">{minion.jobsCompleted}</p>
          </div>
          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="text-slate-500">Location</p>
            <p className="mt-1 flex items-center gap-1 font-bold text-slate-900">
              <MapPin className="h-4 w-4 text-minion-blue" />
              {minion.location}
            </p>
          </div>
        </div>
      </div>
    </article>
  );
}

function FeatureCard({ feature }) {
  const Icon = feature.icon;

  return (
    <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl">
      <div className="inline-flex rounded-2xl bg-blue-50 p-3 text-minion-blue">
        <Icon className="h-6 w-6" />
      </div>
      <h3 className="mt-5 text-xl font-bold text-slate-900">{feature.title}</h3>
      <p className="mt-3 text-sm leading-6 text-slate-600">{feature.description}</p>
    </div>
  );
}

function TestimonialCard({ testimonial }) {
  return (
    <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center gap-1 text-minion-yellow">
        {Array.from({ length: testimonial.rating }).map((_, index) => (
          <Star key={`${testimonial.name}-${index}`} className="h-4 w-4 fill-current" />
        ))}
      </div>
      <p className="mt-4 text-base leading-7 text-slate-700">“{testimonial.quote}”</p>
      <div className="mt-6">
        <p className="font-bold text-slate-900">{testimonial.name}</p>
        <p className="text-sm text-slate-500">{testimonial.role}</p>
      </div>
    </div>
  );
}

function FaqItem({ faq, isOpen, onToggle }) {
  return (
    <div className="rounded-[24px] border border-slate-200 bg-white shadow-sm">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left"
      >
        <span className="text-base font-bold text-slate-900 sm:text-lg">{faq.question}</span>
        <ChevronDown
          className={`h-5 w-5 shrink-0 text-minion-blue transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>
      <div
        className={`grid overflow-hidden px-6 transition-all duration-300 ${isOpen ? 'grid-rows-[1fr] pb-5' : 'grid-rows-[0fr]'}`}
      >
        <div className="overflow-hidden">
          <p className="text-sm leading-6 text-slate-600 sm:text-base">{faq.answer}</p>
        </div>
      </div>
    </div>
  );
}

function HomePage() {
  const navigate = useNavigate();
  const [taskQuery, setTaskQuery] = useState('');
  const [openFaq, setOpenFaq] = useState(0);

  const handleTaskSearch = (event) => {
    event.preventDefault();
    navigate('/sign-up', { state: { taskQuery } });
  };

  return (
    <div className="overflow-hidden bg-[linear-gradient(180deg,#f8fbff_0%,#ffffff_22%,#fffdf4_100%)]">
      <section className="relative isolate">
        <div className="absolute inset-x-0 top-0 -z-10 h-[38rem] bg-[radial-gradient(circle_at_top_left,rgba(255,215,0,0.28),transparent_32%),radial-gradient(circle_at_top_right,rgba(0,87,183,0.18),transparent_30%),linear-gradient(180deg,#ffffff_0%,#f5faff_60%,transparent_100%)]" />
        <div className="mx-auto max-w-7xl px-4 pb-16 pt-10 sm:px-6 lg:px-8 lg:pb-24 lg:pt-16">
          <div className="grid items-center gap-12 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
              <div className="inline-flex items-center gap-2 rounded-full border border-minion-blue/15 bg-white/90 px-4 py-2 text-sm font-semibold text-minion-blue shadow-sm backdrop-blur">
                <Sparkles className="h-4 w-4 text-minion-yellow-dark" />
                Everyday help, delivered beautifully
              </div>

              <h1 className="mt-6 max-w-3xl text-5xl font-black leading-tight tracking-tight text-slate-950 sm:text-6xl">
                Find trusted local help for the tasks that keep life moving.
              </h1>

              <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">
                Minion Me connects busy people with reliable helpers for cleaning, deliveries, errands,
                moving, handyman work, and more, all in one polished service marketplace.
              </p>

              <form
                onSubmit={handleTaskSearch}
                className="mt-8 rounded-[30px] border border-white/70 bg-white/95 p-3 shadow-[0_20px_60px_rgba(0,87,183,0.12)] backdrop-blur"
              >
                <div className="flex flex-col gap-3 sm:flex-row">
                  <div className="relative flex-1">
                    <Search className="pointer-events-none absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={taskQuery}
                      onChange={(event) => setTaskQuery(event.target.value)}
                      placeholder="What do you need help with today?"
                      className="h-14 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-13 pr-4 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-minion-blue focus:bg-white"
                    />
                  </div>
                  <button
                    type="submit"
                    className="inline-flex h-14 items-center justify-center gap-2 rounded-2xl bg-minion-blue px-6 font-semibold text-white transition hover:bg-minion-blue-light"
                  >
                    Find help
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>

                <div className="mt-4 flex flex-wrap gap-3">
                  {quickCategories.map((category) => (
                    <button
                      key={category}
                      type="button"
                      onClick={() => setTaskQuery(category)}
                      className="rounded-full border border-minion-yellow/50 bg-minion-yellow/15 px-4 py-2 text-sm font-semibold text-slate-800 transition hover:border-minion-yellow hover:bg-minion-yellow/30"
                    >
                      {category}
                    </button>
                  ))}
                </div>
              </form>

              <div className="mt-8 flex flex-col gap-4 sm:flex-row">
                <Link
                  to="/sign-up"
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-minion-yellow px-6 py-4 font-bold text-slate-950 shadow-lg transition hover:-translate-y-0.5 hover:bg-minion-yellow-light"
                >
                  Find a Minion
                </Link>
                <Link
                  to="/become-minion"
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border-2 border-minion-blue px-6 py-4 font-bold text-minion-blue transition hover:-translate-y-0.5 hover:bg-blue-50"
                >
                  Become a Minion
                </Link>
                <Link
                  to="/login"
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-300 bg-white px-6 py-4 font-bold text-slate-800 transition hover:-translate-y-0.5 hover:border-slate-400 hover:bg-slate-50"
                >
                  Admin Login
                </Link>
              </div>

              <div className="mt-8 flex flex-wrap gap-3">
                {[
                  { label: 'Verified Helpers', icon: BadgeCheck },
                  { label: 'Secure Payments', icon: ShieldCheck },
                  { label: 'Fast Response', icon: Clock3 }
                ].map((badge) => {
                  const Icon = badge.icon;
                  return (
                    <div
                      key={badge.label}
                      className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm"
                    >
                      <Icon className="h-4 w-4 text-minion-blue" />
                      {badge.label}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="relative animate-in fade-in slide-in-from-right-6 duration-700">
              <div className="absolute -left-8 top-10 h-24 w-24 rounded-full bg-minion-yellow/40 blur-3xl" />
              <div className="absolute -right-8 bottom-8 h-28 w-28 rounded-full bg-minion-blue/25 blur-3xl" />

              <div className="relative rounded-[36px] border border-white/70 bg-white/90 p-4 shadow-[0_28px_90px_rgba(15,23,42,0.12)] backdrop-blur">
                <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
                  <div className="rounded-[28px] bg-linear-to-br from-minion-blue to-minion-blue-light p-6 text-white">
                    <p className="text-sm font-semibold uppercase tracking-[0.25em] text-blue-100">Live service board</p>
                    <h3 className="mt-4 text-3xl font-black">Book fast help in minutes</h3>
                    <p className="mt-4 text-sm leading-6 text-blue-50">
                      Browse skilled minions, review ratings, and match with someone nearby for the job.
                    </p>
                    <div className="mt-8 space-y-3">
                      {[
                        'Deep cleaning for a 2-bedroom apartment',
                        'Same-day delivery across town',
                        'Packing help for a weekend move'
                      ].map((task) => (
                        <div key={task} className="rounded-2xl bg-white/12 px-4 py-3 text-sm font-medium backdrop-blur">
                          {task}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="overflow-hidden rounded-[28px] bg-slate-100">
                      <img
                        src="/MinionMaid.jpg"
                        alt="Featured minion"
                        className="h-72 w-full object-cover"
                      />
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="rounded-[24px] bg-minion-yellow/20 p-5">
                        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-minion-blue">Top-rated help</p>
                        <p className="mt-3 text-2xl font-black text-slate-900">4.9 average</p>
                        <p className="mt-2 text-sm text-slate-600">Across cleaning, deliveries, handyman work, and errands.</p>
                      </div>
                      <div className="rounded-[24px] bg-slate-900 p-5 text-white">
                        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-minion-yellow">Flexible work</p>
                        <p className="mt-3 text-2xl font-black">Grow as a Minion</p>
                        <p className="mt-2 text-sm text-slate-300">Join a service network built around real local demand.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="Popular Categories"
          title="Tap into the most requested services on Minion Me"
          description="Designed for common, high-need tasks people actually need help with every week."
          center
        />

        <div className="mt-12 grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {popularCategories.map((category) => (
            <CategoryCard key={category.name} category={category} />
          ))}
        </div>
      </section>

      <section className="bg-white">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <SectionHeading
            eyebrow="How It Works"
            title="A simple flow for busy clients and hardworking minions"
            description="Clear, guided steps make it easy to request help, choose the right person, and move from posting to completion."
            center
          />

          <div className="mt-12 grid gap-6 lg:grid-cols-3">
            {processSteps.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.step}
                  className="rounded-[30px] border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] p-7 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl"
                >
                  <div className="flex items-center justify-between">
                    <div className="inline-flex rounded-2xl bg-minion-yellow/20 p-3 text-minion-blue">
                      <Icon className="h-6 w-6" />
                    </div>
                    <span className="text-sm font-black tracking-[0.3em] text-slate-300">{item.step}</span>
                  </div>
                  <h3 className="mt-6 text-2xl font-bold text-slate-900">{item.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-slate-600">{item.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <SectionHeading
            eyebrow="Featured Minions"
            title="Meet standout helpers clients love to book again"
            description="High-performing minions across cleaning, errands, and moving support."
          />
          <Link
            to="/become-minion"
            className="inline-flex items-center gap-2 text-sm font-semibold text-minion-blue transition hover:text-minion-blue-dark"
          >
            Join as a minion
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="mt-12 grid gap-6 lg:grid-cols-3">
          {featuredMinions.map((minion) => (
            <MinionCard key={minion.name} minion={minion} />
          ))}
        </div>
      </section>

      <section className="bg-[linear-gradient(180deg,#fffdf4_0%,#ffffff_100%)]">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <SectionHeading
            eyebrow="Why Choose Minion Me"
            title="Built to make local services feel dependable, fast, and easy"
            description="Everything about the experience is designed to reduce friction for both clients and minions."
            center
          />

          <div className="mt-12 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            {featureHighlights.map((feature) => (
              <FeatureCard key={feature.title} feature={feature} />
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="rounded-[36px] bg-linear-to-r from-minion-blue to-minion-blue-light px-6 py-12 text-white shadow-[0_24px_80px_rgba(0,87,183,0.18)] sm:px-10">
          <SectionHeading
            eyebrow="Platform Momentum"
            title="Growing quickly because the value is obvious"
            description="Reliable help for clients, meaningful opportunities for minions, and a smoother service experience for everyone."
            center
          />

          <div className="mt-12 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {stats.map((stat) => (
              <div key={stat.label} className="rounded-[24px] bg-white/12 p-6 text-center backdrop-blur">
                <p className="text-4xl font-black text-minion-yellow sm:text-5xl">
                  <CountUp value={stat.value} suffix={stat.suffix} />
                </p>
                <p className="mt-3 text-sm font-medium text-blue-50">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <SectionHeading
            eyebrow="Testimonials"
            title="What people are saying about Minion Me"
            description="Real confidence comes from consistent, practical service experiences."
            center
          />

          <div className="mt-12 grid gap-6 lg:grid-cols-3">
            {testimonials.map((testimonial) => (
              <TestimonialCard key={testimonial.name} testimonial={testimonial} />
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="FAQ"
          title="Questions clients and minions ask most"
          description="A few quick answers before you book help or create your profile."
          center
        />

        <div className="mt-12 space-y-4">
          {faqs.map((faq, index) => (
            <FaqItem
              key={faq.question}
              faq={faq}
              isOpen={openFaq === index}
              onToggle={() => setOpenFaq(openFaq === index ? -1 : index)}
            />
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-20 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-[36px] bg-[radial-gradient(circle_at_top_left,rgba(255,228,77,0.32),transparent_28%),linear-gradient(135deg,#003D82_0%,#0057B7_55%,#3380CC_100%)] px-6 py-12 text-white shadow-[0_28px_90px_rgba(0,61,130,0.2)] sm:px-10 lg:px-14">
          <div className="absolute -right-10 top-8 h-36 w-36 rounded-full bg-white/10 blur-2xl" />
          <div className="absolute -bottom-10 left-10 h-36 w-36 rounded-full bg-minion-yellow/20 blur-2xl" />

          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl">
              <p className="text-sm font-semibold uppercase tracking-[0.28em] text-minion-yellow">Ready to start?</p>
              <h2 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">
                Post your next task or start earning as a trusted Minion today.
              </h2>
              <p className="mt-4 text-base leading-7 text-blue-50">
                Whether you need help this week or want to offer services in your area, Minion Me gives you a polished place to begin.
              </p>
            </div>

            <div className="flex flex-col gap-4 sm:flex-row">
              <Link
                to="/sign-up"
                className="inline-flex items-center justify-center rounded-2xl bg-minion-yellow px-6 py-4 font-bold text-slate-950 transition hover:bg-minion-yellow-light"
              >
                Find a Minion
              </Link>
              <Link
                to="/become-minion"
                className="inline-flex items-center justify-center rounded-2xl border border-white/40 bg-white/10 px-6 py-4 font-bold text-white transition hover:bg-white/20"
              >
                Become a Minion
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

export default HomePage;
