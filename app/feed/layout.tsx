import FeedImmersiveChrome from "@/components/FeedImmersiveChrome";

export default function FeedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <FeedImmersiveChrome />
      {children}
    </>
  );
}
