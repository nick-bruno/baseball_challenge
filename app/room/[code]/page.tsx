import { RoomClient } from "./RoomClient";

export default async function RoomPage({ params }: PageProps<"/room/[code]">) {
  const { code } = await params;
  return <RoomClient code={code} />;
}
