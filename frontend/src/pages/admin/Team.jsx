function Team() {
  return (
    <div className="space-y-8 pb-12">
      {/* Header Section */}
      <div>
        {/* Main Page Title - text-3xl font-bold tracking-tight */}
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Team Management</h1>
        <p className="text-muted-foreground mt-2 font-light text-xs">Manage your staff and team members.</p>
      </div>
      
      {/* Coming Soon / Under Construction */}
      <div className="flex flex-col items-center justify-center py-16 px-4">
        <div className="text-center space-y-6">
          {/* Icon placeholder */}
          <div className="w-20 h-20 mx-auto bg-muted/20 rounded-full flex items-center justify-center border border-border">
            <svg className="w-10 h-10 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-bold text-foreground">Team Module</h3>
            <p className="text-muted-foreground text-sm font-light mt-1">Coming soon</p>
          </div>
          <p className="text-muted-foreground text-xs font-light max-w-md">
            Team management features are currently under development. 
            Check back soon for staff assignments, role management, and team analytics.
          </p>
        </div>
      </div>
    </div>
  );
}

export default Team;