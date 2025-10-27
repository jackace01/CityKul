import React from "react";
import { Link } from "react-router-dom";
import { Button } from "./ui";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, err: null };
  }

  static getDerivedStateFromError(err) {
    return { hasError: true, err };
  }

  componentDidCatch(error, info) {
    // eslint-disable-next-line no-console
    console.error("UI crashed:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[60vh] grid place-items-center">
          <div className="max-w-lg text-center space-y-3">
            <h1 className="text-2xl font-bold">Something went wrong</h1>
            <p className="text-[var(--color-muted)]">
              Don’t worry — try going back home or reloading.
            </p>
            <div className="flex items-center justify-center gap-3">
              <Link to="/home"><Button>Go Home</Button></Link>
              <Button onClick={() => location.reload()} className="bg-gray-700">Reload</Button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
