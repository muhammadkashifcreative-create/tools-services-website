import { createFileRoute, Outlet } from "@tanstack/react-router";

// The tools store was retired when the site pivoted to guide books.
// Child routes redirect old links (bookmarks, search results) to /books.
export const Route = createFileRoute("/tools")({
  component: () => <Outlet />,
});
