export const metadata = {
  title: "NextJS Typed API",
  description: "Typesafe API Routes for NextJS App Directory",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
