import Theme from "@/components/theme/Theme";


export default function Home() {
  return (
    <main className="min-h-screen bg-base-200 flex items-center justify-center p-6">
      <div className="card bg-base-100 w-96 shadow-xl">
        <div className="card-body gap-4">
          <div className="flex items-center justify-between">
            <h2 className="card-title">daisyUI Check</h2>
            <span className="badge badge-success">Active</span>
          </div>
          <Theme />
          <div role="alert" className="alert alert-info">
            <span>
              If this card, badge, and buttons are styled, daisyUI works!
            </span>
          </div>

          <div className="flex flex-wrap gap-2">
            <button className="btn btn-primary">Primary</button>
            <button className="btn btn-secondary">Secondary</button>
            <button className="btn btn-outline btn-accent">Accent</button>
          </div>

          <label className="label cursor-pointer justify-start gap-3">
            <input
              type="checkbox"
              value="dark"
              className="toggle theme-controller"
            />
            <span className="label-text">Toggle Dark Theme</span>
          </label>
        </div>
      </div>
    </main>
  );
}
