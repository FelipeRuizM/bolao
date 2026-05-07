function Placeholder({ title }: { title: string }) {
  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold">{title}</h1>
      <p className="text-slate-400 mt-2">Coming in a later phase.</p>
    </div>
  )
}

export const Matches = () => <Placeholder title="Matches" />
export const MatchDetail = () => <Placeholder title="Match" />
export const Me = () => <Placeholder title="My Picks" />
export const Bonus = () => <Placeholder title="Bonus Picks" />
export const Admin = () => <Placeholder title="Admin" />
