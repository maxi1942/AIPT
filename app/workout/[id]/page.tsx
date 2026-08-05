import WorkoutLive from "@/components/WorkoutLive";

export default async function WorkoutPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <WorkoutLive sessionId={Number(id)} />;
}
