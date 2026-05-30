const Navbar = () => {
  return (
    <nav className="flex items-center justify-between px-8 py-4 bg-yellow-400 shadow">
      <h1 className="text-2xl font-bold text-blue-900">Minion Me</h1>
      <div className="space-x-6">
        <a href="/" className="font-medium hover:underline">Home</a>
        <a href="/tasks" className="font-medium hover:underline">Find Help</a>
        <a href="/become-minion" className="font-medium hover:underline">
          Become a Minion
        </a>
      </div>
    </nav>
  );
};

export default Navbar;
